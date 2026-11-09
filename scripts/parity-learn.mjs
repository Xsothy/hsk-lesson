// Side-by-side parity shots for the Learn pages: design-canvas page board (left) vs the app (right), full page,
// at 390 and 1200 px, light and dark.
// Usage: node scripts/parity-learn.mjs <canvasBase e.g. http://localhost:8834> <appBase e.g. http://localhost:8833> [outDir] [onlyKey]
// The canvas base serves the "1 · Learn" .dc.html boards plus the component boards they <dc-import>, with a local
// x-dc renderer (support.js with dc-import support, kept in the session notes folder).
import { chromium } from 'playwright';
import fs from 'node:fs';

const [canvas = 'http://localhost:8834', app = 'http://localhost:8833', out = 'docs/parity/learn', only] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const J = (o) => encodeURIComponent(JSON.stringify(o));

// key, board, canvas query, app path
const P = [
  ['home', 'Main', '', '/home'],
  ['lesson', 'Lesson', '', '/lessons/lesson-5'],
  ['reading', 'Reading', '', '/lessons/lesson-5/reading/1'],
  ['guides', 'Guides', '', '/guides'],
  ['guides-tones', 'Guides', `state=${J({ g: 'tones' })}`, '/guides/tones-sandhi'],
  ['courses', 'Courses', '', '/courses'],
  ['courses-hsk', 'Courses', `state=${J({ tab: 'hsk' })}`, '/courses?tab=hsk'],
  ['courses-textbooks', 'Courses', `state=${J({ tab: 'books' })}`, '/courses?tab=textbooks'],
].filter((p) => !only || p[0] === only);

const browser = await chromium.launch();
async function shot(url, width, theme, isCanvas) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, colorScheme: theme });
  const page = await ctx.newPage();
  if (!isCanvas) await page.addInitScript((t) => { try { const s = JSON.parse(localStorage.getItem('hsk.v1.settings') || '{}'); s.theme = t; localStorage.setItem('hsk.v1.settings', JSON.stringify(s)); } catch (e) {} }, theme);
  await page.goto(url, { waitUntil: 'networkidle' });
  if (isCanvas) await page.waitForFunction(() => window.__ready);
  else await page.addStyleTag({ content: '.hdr{position:static!important}' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const buf = await page.screenshot({ fullPage: true });
  await ctx.close();
  return buf;
}

for (const [key, board, cq, path] of P) {
  for (const width of [390, 1200]) {
    for (const theme of ['light', 'dark']) {
      const a = await shot(`${canvas}/${board}.dc.html?theme=${theme}&${cq}`, width, theme, true);
      const b = await shot(`${app}${path}`, width, theme, false);
      const bg = theme === 'dark' ? '#14110d' : '#fbf9f5', fg = theme === 'dark' ? '#f4efe7' : '#2e2a25';
      const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: 2 * width + 80, height: 900 } });
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
