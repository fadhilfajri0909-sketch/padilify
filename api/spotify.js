const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });

async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
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
      timeout: 20000
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
      const r = await fetchWithTimeout(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }, 12000);
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
            source: 'youtube',
            stream_url: ''
          };
        });
      if (items.length) return items;
    } catch(e) { continue; }
  }
  return null;
}

async function downloadYouTube(videoId) {
  try {
    const res = await fetchInsecure('https://api.alwayscodex.eu.cc/api/downloader/youtubev2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=' + videoId })
    });
    const data = JSON.parse(res.body);
    if (data.status && data.result && data.result.downloads) {
      const audioFormats = data.result.downloads.filter(d => d.type === 'audio');
      let best = audioFormats.find(f => f.quality === '128KBPS' && f.format === 'M4A');
      if (!best) best = audioFormats.find(f => f.format === 'M4A');
      if (!best) best = audioFormats.find(f => f.format === 'MP4');
      if (!best) best = audioFormats[0];
      if (best && best.download_url) {
        return {
          stream_url: best.download_url,
          title: data.result.title,
          thumbnail: data.result.thumbnail,
          duration: data.result.duration
        };
      }
    }
    return null;
  } catch(e) {
    console.error('YT download error:', e.message);
    return null;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const q = req.query.q;
    if (!q) return res.status(400).json({ status: false, message: 'Query required' });
    const items = await searchYouTube(q);
    if (items && items.length) {
      return res.status(200).json({ status: true, data: items });
    }
    return res.status(404).json({ status: false, message: 'Tidak ada hasil' });
  }

  if (req.method === 'POST') {
    const { url, videoId } = req.body || {};
    if (videoId) {
      const result = await downloadYouTube(videoId);
      if (result) return res.status(200).json({ status: true, data: result });
      return res.status(500).json({ status: false, message: 'Gagal download YouTube' });
    }
    if (url && url.includes('spotify.com')) {
      try {
        const apiRes = await fetchInsecure('https://api.alwayscodex.eu.cc/api/downloader/spotify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
          body: JSON.stringify({ url })
        });
        let data;
        try { data = JSON.parse(apiRes.body); } catch(e) { data = { raw: apiRes.body }; }
        return res.status(200).json(data);
      } catch (err) {
        return res.status(500).json({ status: false, message: err.message });
      }
    }
    return res.status(400).json({ status: false, message: 'URL atau videoId required' });
  }

  return res.status(405).json({ status: false, message: 'Method not allowed' });
};
