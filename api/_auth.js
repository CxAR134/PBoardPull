// Gate for every endpoint. Without this, anyone who finds your URL could read
// your Pinterest boards through your token. Set both vars in Vercel.
const crypto = require('crypto');

module.exports = function authorized(req, res) {
  const key = process.env.APP_KEY;
  if (!key || !process.env.PINTEREST_TOKEN) {
    res.status(500).json({ error: 'Server not configured: set APP_KEY and PINTEREST_TOKEN in Vercel.' });
    return false;
  }
  const given = Buffer.from(String(req.headers['x-app-key'] || ''));
  const want = Buffer.from(key);
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) {
    res.status(401).json({ error: 'Wrong access key.' });
    return false;
  }
  return true;
};
