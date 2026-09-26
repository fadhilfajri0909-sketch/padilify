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

async function fetchInsecure(url, options) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      agent: agent,
      timeout: 15000
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    if (options.body) req.write(options.body);
    req.end();
  });
}

// ============ SEARCH ============
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
      const items = d.items
        .filter(x => x.url && x.url.includes('watch'))
        .slice(0, 20)
        .map(x => {
          const vid = x.url.replace('/watch?v=', '');
          return {
            id: vid,
            videoId: vid,
            title: x.title,
            artist: x.uploaderName || 'Unknown',
            thumbnail: x.thumbnail || `https://i.ytimg.com/vi/${vid}/mqdefault.jpg`,
            duration: x.duration || 0,
            source: 'youtube'
          };
        });
      if (items.length) return items;
    } catch(e) { continue; }
  }
  return null;
}

// ============ GET STREAM URL ============
// Fallback 1: Piped
async function getStreamFromPiped(videoId) {
  for (const inst of PIPED_INSTANCES) {
    try {
      const r = await fetchWithTimeout(inst + '/streams/' + videoId, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (!r.ok) continue;
      const d = await r.json();
      if (!d.audioStreams || !d.audioStreams.length) continue;
      
      // Prioritas: M4A (audio/mp4)
      let best = d.audioStreams.find(s => s.mimeType && s.mimeType.includes('audio/mp4') && s.url);
      if (!best) best = d.audioStreams.find(s => s.url);
      if (best && best.url) return best.url;
    } catch(e) { continue; }
  }
  return null;
}

// Fallback 2: alwayscodex (SSL broken, bypass)
async function getStreamFromAlwayscodex(videoId) {
  try {
    const res = await fetchInsecure('https://api.alwayscodex.eu.cc/api/downloader/youtubev2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=' + videoId })
    });
    const data = JSON.parse(res.body);
    if (!data.status || !data.result || !data.result.downloads) return null;
    
    const audioFormats = data.result.downloads.filter(d => d.type === 'audio');
    // Prioritas M4A 128KBPS
    let best = audioFormats.find(f => f.format === 'M4A' && f.quality === '128KBPS');
    if (!best) best = audioFormats.find(f => f.format === 'M4A');
    if (!best) best = audioFormats.find(f => f.format === 'MP4');
    if (!best) best = audioFormats.find(f => f.format === 'OPUS' && f.quality === '256KBPS');
    if (!best) best = audioFormats[0];
    
    if (best && best.download_url) return best.download_url;
    return null;
  } catch(e) {
    console.error('alwayscodex error:', e.message);
    return null;
  }
}

// ============ HANDLER ============
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ============ SEARCH ============
  if (req.method === 'GET' && req.query.q) {
    const items = await searchYouTube(req.query.q);
    if (items && items.length) {
      return res.status(200).json({ status: true, data: items });
    }
    return res.status(404).json({ status: false, message: 'Tidak ada hasil' });
  }

  // ============ STREAM PROXY (Vercel -> YouTube -> Browser) ============
  if (req.method === 'GET' && req.query.stream) {
    const videoId = req.query.stream;
    console.log('Stream request for:', videoId);
    
    // Coba Piped dulu
    let streamUrl = await getStreamFromPiped(videoId);
    console.log('Piped result:', streamUrl ? 'OK' : 'FAIL');
    
    // Fallback alwayscodex
    if (!streamUrl) {
      console.log('Trying alwayscodex...');
      streamUrl = await getStreamFromAlwayscodex(videoId);
      console.log('Alwayscodex result:', streamUrl ? 'OK' : 'FAIL');
    }
    
    if (!streamUrl) {
      return res.status(404).json({ status: false, message: 'Stream tidak ditemukan (semua sumber gagal)' });
    }
    
    // Proxy audio ke browser
    try {
      const headers = { 'User-Agent': 'Mozilla/5.0' };
      if (req.headers.range) headers['Range'] = req.headers.range;
      
      const audioRes = await fetch(streamUrl, { headers });
      if (!audioRes.ok) {
        return res.status(500).json({ status: false, message: 'Gagal fetch audio' });
      }
      
      res.setHeader('Content-Type', audioRes.headers.get('content-type') || 'audio/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
      if (audioRes.headers.get('content-length')) {
        res.setHeader('Content-Length', audioRes.headers.get('content-length'));
      }
      if (audioRes.headers.get('content-range')) {
        res.setHeader('Content-Range', audioRes.headers.get('content-range'));
        res.status(206);
      } else {
        res.status(200);
      }
      
      const reader = audioRes.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    } catch(e) {
      console.error('Proxy error:', e);
      if (!res.headersSent) {
        return res.status(500).json({ status: false, message: e.message });
      }
    }
    return;
  }

  // ============ POST ============
  if (req.method === 'POST') {
    const { videoId } = req.body || {};
    if (!videoId) return res.status(400).json({ status: false, message: 'videoId required' });
    return res.status(200).json({
      status: true,
      data: { stream_url: '/api/spotify?stream=' + videoId }
    });
  }

  return res.status(405).json({ status: false, message: 'Method not allowed' });
};
