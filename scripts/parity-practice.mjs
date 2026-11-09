// Side-by-side parity shots for the "3 · Practice & Review" canvas page: board (left) vs app (right), at 390 and 1200 px, light and dark.
// Usage: node scripts/parity-practice.mjs <canvasBase e.g. http://localhost:8824> <appBase e.g. http://127.0.0.1:8823> [outDir]
// The canvas base serves the page boards (.dc.html) plus the component boards they import, with the local x-dc renderer (support.js,
// kept in the session notes; it resolves <dc-import>). The app gets a small seeded store so My words and Review show real rows.
import { chromium } from 'playwright';
import fs from 'node:fs';

const [canvas = 'http://localhost:8824', app = 'http://127.0.0.1:8823', out = 'docs/parity/practice'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });

const P = [
  ['practice', 'Practice', '/practice?lesson=lesson-5', 1200],
  ['review', 'Review', '/review?lesson=lesson-5', 800, true],
  ['match', 'Match', '/practice/match?lesson=lesson-5', 1000],
  ['worksheet', 'Worksheet', '/worksheet?lesson=lesson-5', 1200],
  ['words', 'MyWords', '/words', 1200],
];

const seed = () => {
  const day = (t) => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const act = {}; [19, 8, 28, 40, 12, 31, 24].forEach((n, i) => { act[day(Date.now() - i * 864e5)] = n; });
  localStorage.setItem('hsk.v1.saved', JSON.stringify(['医院', '认识', '菜', '茶', '饭店', '以前', '教', '喜欢']));
  localStorage.setItem('hsk.v1.activity', JSON.stringify(act));
  localStorage.setItem('hsk.v1.srs', JSON.stringify({ 医院: { due: 1, interval: 1, ease: 2.5, reps: 1 }, 茶: { due: 1, interval: 1, ease: 2.5, reps: 1 }, 认识: { due: Date.now() + 9e8, interval: 3, ease: 2.5, reps: 2 } }));
};

const browser = await chromium.launch();
async function shot(url, width, theme, isCanvas, flip) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, colorScheme: theme });
  const page = await ctx.newPage();
  if (!isCanvas) {
    await page.addInitScript(seed);
    await page.addInitScript((t) => { const s = JSON.parse(localStorage.getItem('hsk.v1.settings') || '{}'); s.theme = t; localStorage.setItem('hsk.v1.settings', JSON.stringify(s)); }, theme);
  }
  await page.goto(url, { waitUntil: 'networkidle' });
  if (isCanvas) await page.waitForFunction(() => window.__ready);
  else {
    await page.addStyleTag({ content: '.hdr{position:static!important}' });
    if (flip) { await page.locator('#rv-reveal').click(); }
    await page.waitForTimeout(1200);
  }
  await page.evaluate(() => document.fonts.ready);
  const buf = await page.screenshot({ fullPage: true });
  await ctx.close();
  return buf;
}

for (const [key, board, path, , flip] of P) {
  for (const width of [390, 1200]) {
    for (const theme of ['light', 'dark']) {
      const a = await shot(`${canvas}/${board}.dc.html?theme=${theme}&pad=0&gap=0`, width, theme, true);
      const b = await shot(`${app}${path}`, width, theme, false, flip);
      const bg = theme === 'dark' ? '#14110d' : '#fbf9f5', fg = theme === 'dark' ? '#f4efe7' : '#2e2a25';
      const page = await browser.newPage({ deviceScaleFactor: 1 });
      await page.setContent(`<body style="margin:0;background:${bg};color:${fg};font:600 14px system-ui">
        <div style="display:flex;gap:24px;padding:16px;align-items:flex-start;width:max-content">
          <figure style="margin:0"><figcaption style="margin-bottom:6px">Canvas · ${board} · ${width}px · ${theme}</figcaption><img style="display:block;outline:1px dashed #9998" src="data:image/png;base64,${a.toString('base64')}"></figure>
          <figure style="margin:0"><figcaption style="margin-bottom:6px">App · ${path} · ${width}px · ${theme}</figcaption><img style="display:block;outline:1px dashed #9998" src="data:image/png;base64,${b.toString('base64')}"></figure>
        </div></body>`);
      await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
      await page.locator('body > div').screenshot({ path: `${out}/${key}-${width}-${theme}.png` });
      await page.close();
      console.log('saved', key, width, theme);
    }
  }
}
await browser.close();
