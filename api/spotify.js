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

// JioSaavn search
async function searchSaavn(q) {
  const apis = [
    'https://saavn.dev/api',
    'https://jiosavan-api-with-playlist.vercel.app/api'
  ];
  for (const api of apis) {
    try {
      const r = await fetchWithTimeout(api + '/search/songs?query=' + encodeURIComponent(q) + '&limit=20');
      if (!r.ok) continue;
      const d = await r.json();
      if (d && d.success && d.data && d.data.results) {
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
    } catch(e) { continue; }
  }
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // SEARCH
  if (req.method === 'GET' && req.query.q) {
    const items = await searchSaavn(req.query.q);
    if (items && items.length) {
      return res.status(200).json({ status: true, data: items });
    }
    return res.status(404).json({ status: false, message: 'Tidak ada hasil' });
  }

  // POST download — return URL langsung
  if (req.method === 'POST') {
    const { videoId, url } = req.body || {};
    
    // Kalau dari search Saavn, videoId itu ID Saavn, bukan YT
    if (videoId) {
      // Ambil stream URL dari Saavn
      try {
        const apis = ['https://saavn.dev/api', 'https://jiosavan-api-with-playlist.vercel.app/api'];
        for (const api of apis) {
          const r = await fetchWithTimeout(api + '/songs/' + videoId);
          if (!r.ok) continue;
          const d = await r.json();
          if (d && d.success && d.data && d.data[0]) {
            const song = d.data[0];
            const urls = song.downloadUrl || [];
            const best = urls[urls.length - 1] || urls[0] || {};
            if (best.url) {
              return res.status(200).json({
                status: true,
                data: {
                  stream_url: best.url,
                  title: song.name,
                  thumbnail: (song.image && song.image[song.image.length-1] && song.image[song.image.length-1].url) || '',
                  duration: parseInt(song.duration) || 0
                }
              });
            }
          }
        }
      } catch(e) {
        return res.status(500).json({ status: false, message: e.message });
      }
    }
    
    return res.status(400).json({ status: false, message: 'videoId atau url required' });
  }

  return res.status(405).json({ status: false, message: 'Method not allowed' });
};
