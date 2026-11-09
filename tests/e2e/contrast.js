// Shared WCAG text-contrast audit (runs inside the page via page.evaluate).
/** Lowest contrast among visible text-bearing elements (runs in the page). */
function auditContrast() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgba = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (el) => {
    let layers = [];
    for (let e = el; e; e = e.parentElement) {
      const c = rgba(getComputedStyle(e).backgroundColor);
      if (c[3] > 0) layers.push(c);
      if (c[3] === 1) break;
    }
    let base = [20, 17, 13];
    for (const c of layers.reverse()) base = base.map((v, i) => i < 3 ? c[i] * c[3] + v * (1 - c[3]) : v);
    return base;
  };
  const bad = [];
  for (const el of document.body.querySelectorAll('*:not(script):not(style)')) {
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    const cs = getComputedStyle(el), r = el.getBoundingClientRect();
    if (!r.width || !r.height || cs.visibility === 'hidden' || +cs.opacity === 0 || el.closest('[hidden],[aria-hidden=true],dialog:not([open])')) continue;
    if (cs.clip !== 'auto' && r.width <= 1) continue;
    const fg = rgba(cs.color), bg = bgOf(el);
    const f = fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]));
    const [a, b] = [lum(f), lum(bg)];
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    if (ratio < 4.5) bad.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} "${el.textContent.trim().slice(0, 20)}" ${ratio.toFixed(2)}`);
  }
  return bad;
}

module.exports = { auditContrast };
