const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://api.piped.private.coffee',
  'https://pipedapi.reallyaweso.me',
  'https://pipedapi.leptons.xyz'
];

async function searchYouTube(q) {
  for (const inst of PIPED_INSTANCES) {
    try {
      const url = inst + '/search?q=' + encodeURIComponent(q) + '&filter=music_songs';
      const r = await fetchWithTimeout(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!r.ok) continue;
      const d = await r.json();
      if (!d.items) continue;
      const items = d.items.filter(x => x.url && x.url.includes('watch')).slice(0, 20).map(x => {
        const vid = x.url.replace('/watch?v=', '');
        return {
          id: vid, videoId: vid, title: x.title,
          artist: x.uploaderName || 'Unknown',
          thumbnail: x.thumbnail || `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`,
          duration: x.duration || 0, source: 'youtube', stream_url: ''
        };
      });
      if (items.length) return items;
    } catch(e) { continue; }
  }
  return null;
}

async function getPipedStreamUrl(videoId) {
  for (const inst of PIPED_INSTANCES) {
    try {
      const r = await fetchWithTimeout(inst + '/streams/' + videoId, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!r.ok) continue;
      const d = await r.json();
      if (!d.audioStreams || !d.audioStreams.length) continue;
      let best = d.audioStreams.find(s => s.mimeType && s.mimeType.includes('audio/mp4') && s.url);
      if (!best) best = d.audioStreams.find(s => s.url);
      if (best && best.url) return best.url;
    } catch(e) { continue; }
  }
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET' && req.query.q) {
    const items = await searchYouTube(req.query.q);
    if (items && items.length) return res.status(200).json({ status: true, data: items });
    return res.status(404).json({ status: false, message: 'Tidak ada hasil' });
  }

  if (req.method === 'GET' && req.query.stream) {
    const streamUrl = await getPipedStreamUrl(req.query.stream);
    if (!streamUrl) return res.status(404).json({ status: false, message: 'Stream tidak ditemukan' });
    try {
      const headers = { 'User-Agent': 'Mozilla/5.0' };
      if (req.headers.range) headers['Range'] = req.headers.range;
      const audioRes = await fetch(streamUrl, { headers });
      if (!audioRes.ok) return res.status(500).json({ status: false, message: 'Gagal proxy' });
      res.setHeader('Content-Type', audioRes.headers.get('content-type') || 'audio/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
      if (audioRes.headers.get('content-length')) res.setHeader('Content-Length', audioRes.headers.get('content-length'));
      if (audioRes.headers.get('content-range')) { res.setHeader('Content-Range', audioRes.headers.get('content-range')); res.status(206); } else { res.status(200); }
      const reader = audioRes.body.getReader();
      while (true) { const { done, value } = await reader.read(); if (done) break; res.write(Buffer.from(value)); }
      res.end();
    } catch(e) { return res.status(500).json({ status: false, message: e.message }); }
    return;
  }

  if (req.method === 'POST') {
    const { videoId } = req.body || {};
    if (!videoId) return res.status(400).json({ status: false, message: 'videoId required' });
    return res.status(200).json({ status: true, data: { stream_url: '/api/spotify?stream=' + videoId } });
  }

  return res.status(405).json({ status: false, message: 'Method not allowed' });
};
