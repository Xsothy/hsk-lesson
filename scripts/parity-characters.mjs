// Side-by-side parity shots for the "2 · Characters & Browse" canvas pages: canvas board (left) vs the app (right),
// full page at 390 and 1200 px, light and dark.
// Usage: node scripts/parity-characters.mjs <canvasBase e.g. http://localhost:8838> <appBase e.g. http://localhost:8837> [outDir] [only]
// The canvas base serves the page boards (.dc.html) with the small local x-dc renderer (support.js) — see docs/parity/components/README.md.
import { chromium } from 'playwright';
import fs from 'node:fs';

const [canvas = 'http://localhost:8838', app = 'http://localhost:8837', out = 'docs/parity/characters', only = ''] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const J = (o) => encodeURIComponent(JSON.stringify(o));

// key, board, canvas query, app path, app setup
const P = [
  ['character', 'Character', 'pad=0&gap=0', '/char/' + encodeURIComponent('学')],
  ['parts', 'Components', 'pad=0&gap=0', '/parts?c=' + encodeURIComponent('氵')],
  ['browse', 'Browse', 'pad=0&gap=0', '/browse?tab=hsk2&level=1'],
  ['browse-pinyin', 'Browse', `pad=0&gap=0&state=${J({ tab: 'pinyin' })}`, '/browse?tab=pinyin&syl=xue'],
  ['browse-radical', 'Browse', `pad=0&gap=0&state=${J({ tab: 'radical' })}`, '/browse?tab=radical'],
  ['search', 'Search', 'pad=0&gap=0', '/search?q=xue'],
].filter(([k]) => !only || only.split(',').includes(k));

const browser = await chromium.launch();
async function shot(url, width, theme, isCanvas) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, colorScheme: theme });
  const page = await ctx.newPage();
  if (!isCanvas) {
    await page.addInitScript((t) => { try { const s = JSON.parse(localStorage.getItem('hsk.v1.settings') || '{}'); s.theme = t; localStorage.setItem('hsk.v1.settings', JSON.stringify(s)); } catch (e) {} }, theme);
  }
  await page.goto(url, { waitUntil: 'networkidle' });
  if (isCanvas) await page.waitForFunction(() => window.__ready);
  else await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(isCanvas ? 300 : 1500); // let hanzi-writer draw
  if (!isCanvas) await page.addStyleTag({ content: '.hdr{position:static!important}' });
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
      const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { width: 400, height: 400 } });
      const scale = width > 600 ? 0.6 : 1;
      await page.setContent(`<body style="margin:0;background:${bg};color:${fg};font:600 14px system-ui">
        <div style="display:flex;gap:24px;padding:16px;align-items:flex-start;width:max-content">
          <figure style="margin:0"><figcaption style="margin-bottom:6px">Canvas · ${board} · ${width}px · ${theme}</figcaption><img data-s="${scale}" style="display:block;outline:1px dashed #9998" src="data:image/png;base64,${a.toString('base64')}"></figure>
          <figure style="margin:0"><figcaption style="margin-bottom:6px">App · ${path} · ${width}px · ${theme}</figcaption><img data-s="${scale}" style="display:block;outline:1px dashed #9998" src="data:image/png;base64,${b.toString('base64')}"></figure>
        </div></body>`);
      await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().then(() => { i.width = i.naturalWidth * Number(i.dataset.s); }))));
      await page.locator('body > div').screenshot({ path: `${out}/${key}-${width}-${theme}.png` });
      await page.close();
      console.log('saved', key, width, theme);
    }
  }
}
await browser.close();
