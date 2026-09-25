import https from 'https';

const agent = new https.Agent({ rejectUnauthorized: false });

async function fetchInsecure(url, options) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      agent: agent
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const q = req.query.q;
    if (!q) return res.status(400).json({ status: false, message: 'Query required' });

    try {
      const saavnUrl = 'https://saavn.dev/api/search/songs?query=' + encodeURIComponent(q) + '&limit=20';
      const r = await fetch(saavnUrl);
      const d = await r.json();

      if (d && d.success && d.data && d.data.results) {
        const items = d.data.results.map(song => {
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
        });
        return res.status(200).json({ status: true, data: items });
      }
      return res.status(404).json({ status: false, message: 'Not found' });
    } catch (err) {
      return res.status(500).json({ status: false, message: err.message });
    }
  }

  if (req.method === 'POST') {
    const { url } = req.body;
    if (!url) return res.status(400).json({ status: false, message: 'URL required' });

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

  return res.status(405).json({ status: false, message: 'Method not allowed' });
    }
