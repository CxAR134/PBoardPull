/* Board Pack core: pins -> one PDF of numbered contact sheets + a text manifest.
   Dependencies (jsPDF, canvas factory, image loader) are injected, so the same
   code runs in the browser and in Node tests. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BoardPack = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const LAYOUTS = { 6: { cols: 3, rows: 2 }, 12: { cols: 4, rows: 3 }, 20: { cols: 5, rows: 4 } };
  const W = 1600, PAD = 24, GAP = 16, HEAD = 72;
  const FONT = 'Helvetica, Arial, sans-serif';

  // jsPDF's built-in fonts only cover Latin-1. Normalise punctuation, drop the rest.
  function clean(s) {
    return String(s == null ? '' : s)
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/…/g, '...')
      .replace(/[^\x20-\x7E\xA0-\xFF\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Long URLs have no spaces, so the PDF text wrapper can't break them. Add break points.
  function breakLong(s) {
    return s.replace(/(\S{90})/g, '$1 ');
  }

  async function mapLimit(items, limit, fn) {
    const out = new Array(items.length);
    let next = 0;
    async function worker() {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return out;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawSheet(canvas, g, o) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, W, g.H);

    // Header: board name, sheet number, pin range
    let name = clean(o.boardName).toUpperCase() || 'BOARD';
    const tail = '   |   SHEET ' + (o.sheet + 1) + '/' + o.sheets + '   |   PINS ' + o.first + '-' + o.last;
    ctx.font = '600 30px ' + FONT;
    ctx.textBaseline = 'middle';
    while (name.length > 6 && ctx.measureText(name + tail).width > W - 2 * PAD) {
      name = name.slice(0, -2).trimEnd() + '.';
    }
    ctx.fillStyle = '#f2efe9';
    ctx.fillText(name + tail, PAD, HEAD / 2);

    o.pins.forEach((pin, i) => {
      const x = PAD + (i % g.cols) * (g.cellW + GAP);
      const y = HEAD + Math.floor(i / g.cols) * (g.cellH + GAP);
      ctx.fillStyle = '#1c1c1c';
      ctx.fillRect(x, y, g.cellW, g.cellH);

      const img = o.imgs[i];
      if (img) {
        const s = Math.min(g.cellW / img.width, g.cellH / img.height);
        const dw = img.width * s, dh = img.height * s;
        ctx.drawImage(img, x + (g.cellW - dw) / 2, y + (g.cellH - dh) / 2, dw, dh);
      } else {
        ctx.fillStyle = '#777';
        ctx.font = '24px ' + FONT;
        ctx.textAlign = 'center';
        ctx.fillText('no image', x + g.cellW / 2, y + g.cellH / 2);
        ctx.textAlign = 'left';
      }

      // Number badge. These numbers are how the manifest text maps to the picture.
      const label = String(o.first + i);
      ctx.font = '700 30px ' + FONT;
      const bw = ctx.measureText(label).width + 28;
      ctx.fillStyle = '#000';
      roundRect(ctx, x + 8, y + 8, bw, 46, 9);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x + 22, y + 32);
    });
  }

  function addManifest(pdf, pins, boardName, perSheet, sheets) {
    const M = 40, LH = 12;
    pdf.addPage('a4', 'portrait'); // page size must be read after this, not before
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const maxW = pw - 2 * M;
    let y = M;
    const room = (h) => {
      if (y + h > ph - M) { pdf.addPage('a4', 'portrait'); y = M; }
    };

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text(pdf.splitTextToSize(clean(boardName) || 'Board', maxW), M, y + 12);
    y += 30;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    const intro = pdf.splitTextToSize(
      pins.length + ' pins. The contact sheets before this page show the pins in order, ' + perSheet +
      ' per sheet (' + sheets + ' sheets). The number on each image matches the numbers below.', maxW);
    pdf.text(intro, M, y);
    y += intro.length * LH + 14;

    pins.forEach((p, i) => {
      const alt = clean(p.alt);
      const desc = clean(p.description);
      const blocks = [{ font: 'bold', size: 10, text: '#' + (i + 1) + '  ' + (clean(p.title) || '(untitled)') }];
      if (desc) blocks.push({ font: 'normal', size: 9, text: desc.slice(0, 500) });
      if (alt && alt !== desc) blocks.push({ font: 'normal', size: 9, text: 'Image description: ' + alt.slice(0, 300) });
      if (p.link) blocks.push({ font: 'normal', size: 9, text: 'Source: ' + breakLong(clean(p.link)) });
      blocks.push({ font: 'normal', size: 9, text: 'Pin: ' + p.url });

      let total = 10;
      for (const b of blocks) {
        pdf.setFont('helvetica', b.font);
        pdf.setFontSize(b.size);
        b.lines = pdf.splitTextToSize(b.text, maxW);
        total += b.lines.length * LH;
      }
      room(Math.min(total, ph - 2 * M));
      for (const b of blocks) {
        pdf.setFont('helvetica', b.font);
        pdf.setFontSize(b.size);
        for (const line of b.lines) {
          room(LH);
          pdf.text(line, M, y);
          y += LH;
        }
      }
      y += 10;
    });
  }

  /**
   * opts: { pins, boardName, perSheet, jsPDF, createCanvas(w,h), loadImage(url)->image,
   *         onProgress({phase, done, total}), output: 'blob' | 'arraybuffer' }
   */
  async function buildPack(opts) {
    const { pins, boardName, jsPDF, createCanvas, loadImage } = opts;
    const onProgress = opts.onProgress || function () {};
    const perSheet = LAYOUTS[opts.perSheet] ? opts.perSheet : 12;
    const L = LAYOUTS[perSheet];
    const cellW = Math.floor((W - 2 * PAD - (L.cols - 1) * GAP) / L.cols);
    const cellH = Math.round(cellW * 1.35);
    const H = HEAD + L.rows * cellH + (L.rows - 1) * GAP + PAD;
    const g = { cols: L.cols, cellW, cellH, H };
    const sheets = Math.ceil(pins.length / perSheet);

    let pdf = null;
    for (let s = 0; s < sheets; s++) {
      const chunk = pins.slice(s * perSheet, (s + 1) * perSheet);
      const imgs = await mapLimit(chunk, 6, (p) =>
        p.img ? Promise.resolve().then(() => loadImage(p.img)).catch(() => null) : null);

      const canvas = createCanvas(W, H);
      drawSheet(canvas, g, {
        boardName, sheet: s, sheets, pins: chunk, imgs,
        first: s * perSheet + 1, last: s * perSheet + chunk.length,
      });
      imgs.forEach((im) => { if (im && im.close) im.close(); });

      const jpeg = canvas.toDataURL('image/jpeg', 0.82);
      canvas.width = canvas.height = 1; // release the big bitmap (matters on iPhone)
      if (!pdf) pdf = new jsPDF({ unit: 'pt', format: [W, H], orientation: 'portrait', compress: true });
      else pdf.addPage([W, H], 'portrait');
      pdf.addImage(jpeg, 'JPEG', 0, 0, W, H, undefined, 'FAST');
      onProgress({ phase: 'sheets', done: s + 1, total: sheets });
    }

    onProgress({ phase: 'manifest', done: sheets, total: sheets });
    addManifest(pdf, pins, boardName, perSheet, sheets);
    return pdf.output(opts.output || 'blob');
  }

  return { buildPack, clean, LAYOUTS };
});
