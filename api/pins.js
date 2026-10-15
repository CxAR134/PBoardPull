const authorized = require('./_auth');
const { pinterest, fail, simplify } = require('./_pinterest');

// One page per call; the app loops on `bookmark`, so big boards never hit a function timeout.
module.exports = async (req, res) => {
  if (!authorized(req, res)) return;
  const board = String(req.query.board || '');
  if (!/^\d+$/.test(board)) return res.status(400).json({ error: 'Bad board id.' });
  try {
    const d = await pinterest('/boards/' + board + '/pins', {
      page_size: 250,
      bookmark: req.query.bookmark,
    });
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ pins: (d.items || []).map(simplify), bookmark: d.bookmark || null });
  } catch (e) {
    fail(res, e);
  }
};
