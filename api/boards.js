const authorized = require('./_auth');
const { pinterest, fail } = require('./_pinterest');

module.exports = async (req, res) => {
  if (!authorized(req, res)) return;
  try {
    const boards = [];
    let bookmark;
    for (let i = 0; i < 10; i++) {
      const d = await pinterest('/boards', { page_size: 250, bookmark });
      for (const b of d.items || []) {
        boards.push({ id: b.id, name: b.name, pins: b.pin_count || 0, privacy: b.privacy || 'PUBLIC' });
      }
      bookmark = d.bookmark;
      if (!bookmark) break;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ boards });
  } catch (e) {
    fail(res, e);
  }
};
