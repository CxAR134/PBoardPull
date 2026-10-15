const authorized = require('./_auth');

// Image proxy: pinimg.com images only, so the browser can draw them to a canvas without CORS taint.
module.exports = async (req, res) => {
  if (!authorized(req, res)) return;
  let u;
  try { u = new URL(String(req.query.u || '')); } catch (_) {
    return res.status(400).json({ error: 'Bad url.' });
  }
  const host = u.hostname.toLowerCase();
  if (u.protocol !== 'https:' || !(host === 'pinimg.com' || host.endsWith('.pinimg.com'))) {
    return res.status(400).json({ error: 'Host not allowed.' });
  }
  try {
    const r = await fetch(u, { redirect: 'error' });
    const type = r.headers.get('content-type') || '';
    if (!r.ok || !type.startsWith('image/')) {
      return res.status(502).json({ error: 'Image fetch failed (' + r.status + ').' });
    }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.status(200).send(buf);
  } catch (_) {
    res.status(502).json({ error: 'Image fetch failed.' });
  }
};
