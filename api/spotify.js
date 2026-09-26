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

// ========== SEARCH via Piped ==========
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
      const r = await fetchWithTimeout(inst + '/search?q=' + encodeURIComponent(q) + '&filter=music_songs', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (!r.ok) continue;
      const d = await r.json();
      if (!d.items) continue;
      const items = d.items.filter(x => x.url && x.url.includes('watch')).slice(0, 20).map(x => {
        const vid = x.url.replace('/watch?v=', '');
        return {
          id: vid, videoId: vid, title: x.title,
          artist: x.uploaderName || 'Unknown',
          thumbnail: x.thumbnail || 'https://i.ytimg.com/vi/' + vid + '/mqdefault.jpg',
          duration: x.duration || 0, source: 'youtube'
        };
      });
      if (items.length) return items;
    } catch(e) { continue; }
  }
  return null;
}

// ========== YTMP3 via convert1s.com ==========
async function getYtmp3(videoId) {
  const ytUrl = 'https://www.youtube.com/watch?v=' + videoId;
  const headers = {
    'accept': 'application/json',
    'content-type': 'application/json',
    'origin': 'https://ssvid.cc',
    'referer': 'https://ssvid.cc/',
    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'
  };

  try {
    // Step 1: Init — POST ke convert1s
    console.log('Init ytmp3:', videoId);
    const initRes = await fetchWithTimeout('https://hub.convert1s.com/api/download', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        url: ytUrl,
        audio: { bitrate: '128k' },
        output: { type: 'audio', format: 'mp3' }
      })
    }, 20000);

    if (!initRes.ok) {
      console.log('Init HTTP:', initRes.status);
      return null;
    }

    const initData = await initRes.json();
    console.log('Init data:', JSON.stringify(initData).slice(0, 200));
    
    const statusUrl = initData.statusUrl;
    if (!statusUrl) {
      console.log('No statusUrl');
      return null;
    }

    // Step 2: Poll statusUrl
    let attempts = 0;
    while (attempts < 20) {
      await new Promise(r => setTimeout(r, 1500));
      try {
        const statusRes = await fetchWithTimeout(statusUrl, {
          headers: headers
        }, 15000);
        if (!statusRes.ok) { attempts++; continue; }
        
        const statusData = await statusRes.json();
        console.log('Poll', attempts, ':', statusData.status);
        
        if (statusData.status === 'completed') {
          return {
            stream_url: statusData.downloadUrl,
            title: statusData.title || initData.title,
            duration: statusData.duration || initData.duration
          };
        }
        if (statusData.status === 'error' || statusData.status === 'failed') {
          return null;
        }
      } catch(e) {
        console.log('Poll err:', e.message);
      }
      attempts++;
    }
    return null;
  } catch(e) {
    console.error('ytmp3 error:', e.message);
    return null;
  }
}

// ========== HANDLER ==========
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ===== SEARCH =====
  if (req.method === 'GET' && req.query.q) {
    const items = await searchYouTube(req.query.q);
    if (items && items.length) {
      return res.status(200).json({ status: true, data: items });
    }
    return res.status(404).json({ status: false, message: 'Tidak ada hasil' });
  }

  // ===== GET STREAM URL (return JSON, bukan proxy) =====
  if (req.method === 'GET' && req.query.stream) {
    const videoId = req.query.stream;
    const result = await getYtmp3(videoId);
    
    if (!result || !result.stream_url) {
      return res.status(404).json({ status: false, message: 'Stream tidak ditemukan' });
    }
    
    return res.status(200).json({
      status: true,
      data: {
        stream_url: result.stream_url,
        title: result.title,
        duration: result.duration
      }
    });
  }

  // ===== POST — return URL proxy =====
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
