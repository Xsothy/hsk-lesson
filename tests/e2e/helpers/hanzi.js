// @ts-check
// Drive a mounted Hanzi Writer quiz with real mouse strokes along the character's medians.
// Stroke data comes from the same CDN package the app uses (hanzi-writer-data@2.0.1).

const DATA = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/';

/** @returns {Promise<number[][][]>} medians per stroke, in Hanzi Writer data space. */
async function medians(page, ch) {
  return page.evaluate(async ({ url }) => (await (await fetch(url)).json()).medians, { url: DATA + encodeURIComponent(ch) + '.json' });
}

/**
 * Draw one stroke. `scope` is a locator for the element that contains the Hanzi Writer <svg>.
 * Median points are mapped to screen pixels with the SVG's own CTM so any scale/padding is handled.
 */
async function drawStroke(page, scope, median) {
  const pts = await scope.evaluate((root, m) => {
    const svg = root.querySelector('svg');
    const ref = svg.querySelector('g path') || svg.querySelector('path'); // inside the scaled <g>
    const ctm = ref.getScreenCTM();
    return m.map(([x, y]) => ({ x: ctm.a * x + ctm.c * y + ctm.e, y: ctm.b * x + ctm.d * y + ctm.f }));
  }, median);
  await page.mouse.move(pts[0].x, pts[0].y);
  await page.mouse.down();
  for (let i = 1; i < pts.length; i++) {
    await page.mouse.move(pts[i].x, pts[i].y, { steps: 4 });
  }
  await page.mouse.up();
  await page.waitForTimeout(120);
}

/** Write every stroke of `ch` in order. */
async function writeCharacter(page, scope, ch) {
  const ms = await medians(page, ch);
  for (const m of ms) await drawStroke(page, scope, m);
  return ms.length;
}

module.exports = { medians, drawStroke, writeCharacter };
