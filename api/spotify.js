import https from 'https';

const agent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });

// Helper: fetch dengan timeout
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

// Fetch HTTPS insecure (untuk alwayscodex yang SSL-nya broken)
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

// ============ JIOSAAVN SEARCH ============
const SAAVN_APIS = [
  'https://saavn.dev/api',
  'https://jiosavan-api-with-playlist.vercel.app/api'
];

async function searchSaavn(q) {
  for (const api of SAAVN_APIS) {
    try {
      console.log('Trying Saavn:', api);
      const url = api + '/search/songs?query=' + encodeURIComponent(q) + '&limit=20';
      const r = await fetchWithTimeout(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }, 12000);
      if (!r.ok) { console.log('  HTTP', r.status); continue; }
      const d = await r.json();
      if (d && d.success && d.data && d.data.results) {
        console.log('  OK:', d.data.results.length, 'songs');
        return d.data.results.map(song => {
          const urls = song.downloadUrl || [];
          const best = urls[urls.length - 1] || urls[0] || {};
          const img = song.image || [];
          const cover = (img[img.length - 1] && img[img.length - 1].url) || (img[0] && img[0].url) || '';
          return {
            id: song.id,
            title: song.name || 'Unknown',
            artist: (song.artists && song.artists.primary && song.artists.primary[0] && song.artists.primary[0].name) || 'Unknown',
            thumbnail: cover,
            duration: parseInt(song.duration) || 0,
            stream_url: best.url || best.link || ''
          };
        }).filter(s => s.stream_url);
      }
    } catch(e) {
      console.log('  Fail:', e.message);
    }
  }
  return null;
}

// ============ YOUTUBE SEARCH (Piped) ============
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
      console.log('Trying Piped:', inst);
      const url = inst + '/search?q=' + encodeURIComponent(q) + '&filter=music_songs';
      const r = await fetchWithTimeout(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }, 12000);
      if (!r.ok) { console.log('  HTTP', r.status); continue; }
      const d = await r.json();
      if (!d.items) { console.log('  No items'); continue; }
      console.log('  OK:', d.items.length, 'items');
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
    } catch(e) {
      console.log('  Fail:', e.message);
    }
  }
  return null;
}

// ============ YOUTUBE DOWNLOAD (alwayscodex) ============
async function downloadYouTube(videoId) {
  try {
    console.log('Downloading YT:', videoId);
    const res = await fetchInsecure('https://api.alwayscodex.eu.cc/api/downloader/youtubev2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=' + videoId })
    });
    console.log('  Response status:', res.status);
    const data = JSON.parse(res.body);
    console.log('  Data status:', data.status);
    
    if (data.status && data.result && data.result.downloads) {
      const audioFormats = data.result.downloads.filter(d => d.type === 'audio');
      console.log('  Audio formats:', audioFormats.length);
      
      // Pilih M4A 128kbps (paling kompatibel)
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
    console.error('  YT download error:', e.message);
    return null;
  }
}

// ============ HANDLER ============
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ============ GET: SEARCH ============
  if (req.method === 'GET') {
    const q = req.query.q;
    if (!q) return res.status(400).json({ status: false, message: 'Query required' });

    console.log('=== Search:', q);

    // Coba JioSaavn dulu
    let items = await searchSaavn(q);

    // Kalau gagal, coba YouTube
    if (!items || !items.length) {
      console.log('Saavn failed, trying YouTube...');
      items = await searchYouTube(q);
    }

    if (items && items.length) {
      console.log('=== Returning', items.length, 'items');
      return res.status(200).json({ status: true, data: items });
    }
    console.log('=== All failed');
    return res.status(404).json({ status: false, message: 'Tidak ada hasil dari semua sumber' });
  }

  // ============ POST: DOWNLOAD ============
  if (req.method === 'POST') {
    const { url, videoId } = req.body || {};

    // YouTube download
    if (videoId) {
      const result = await downloadYouTube(videoId);
      if (result) {
        return res.status(200).json({ status: true, data: result });
      }
      return res.status(500).json({ status: false, message: 'Gagal download YouTube' });
    }

    // Spotify download
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
                                  }
