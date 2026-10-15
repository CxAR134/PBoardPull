const BASE = 'https://api.pinterest.com/v5';

async function pinterest(path, params = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  }
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + process.env.PINTEREST_TOKEN } });
  let data = {};
  try { data = await r.json(); } catch (_) { /* non-JSON error body */ }
  if (!r.ok) {
    const err = new Error(data.message || 'Pinterest error ' + r.status);
    err.status = r.status;
    throw err;
  }
  return data;
}

// Pinterest 401/403 must not look like a bad app key to the front end (which treats 401 that way).
function fail(res, e) {
  const pinterestAuth = e.status === 401 || e.status === 403;
  const status = pinterestAuth ? 502 : e.status || 500;
  const error = pinterestAuth
    ? 'Pinterest rejected the token (' + e.status + '). It may have expired or lack scopes. Generate a new one and update PINTEREST_TOKEN in Vercel.'
    : e.message;
  res.status(status).json({ error });
}

const SIZE_ORDER = ['600x', '400x300', '1200x', 'originals', '150x150'];

function simplify(p) {
  const m = p.media || {};
  let imgs = m.images;
  if (!imgs && Array.isArray(m.items) && m.items[0]) imgs = m.items[0].images; // carousel pins
  let pick = null;
  if (imgs) {
    for (const k of SIZE_ORDER) {
      if (imgs[k] && imgs[k].url) { pick = imgs[k]; break; }
    }
    if (!pick) pick = Object.values(imgs).find((v) => v && v.url) || null;
  }
  return {
    id: p.id,
    title: p.title || '',
    description: p.description || '',
    alt: p.alt_text || '',
    link: p.link || '',
    type: m.media_type || 'image',
    img: pick ? pick.url : m.cover_image_url || null, // video pins fall back to their cover
    url: 'https://www.pinterest.com/pin/' + p.id + '/',
  };
}

module.exports = { pinterest, fail, simplify };
