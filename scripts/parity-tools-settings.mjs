// Side-by-side parity shots for the "4 · Tools & Settings" boards: canvas (left) vs app (right), 390 + 1200 px, light + dark.
// Usage: node scripts/parity-tools-settings.mjs <canvasBase> <appBase> [outDir] [onlyKey]
// The canvas base serves Tools/Settings/Appearance .dc.html with the local x-dc renderer (support.js, see docs/parity/components).
import { chromium } from 'playwright';
import fs from 'node:fs';

const [canvas = 'http://localhost:8851', app = 'http://localhost:8847', out = 'docs/parity/tools-settings', only] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const J = (o) => encodeURIComponent(JSON.stringify(o));

// Fill the app with the same sample input the canvas shows.
const fillPinyin = async (p) => { await p.fill('#pin-in', '你好！今天天气怎么样？我想去公园散步。'); await p.click('[data-run]'); await p.waitForSelector('[data-ruby] .tl-rb'); };
const fillHsk = async (p) => { await p.fill('#hsk-in', '我们公司专注于技术创新和客户服务。'); await p.waitForSelector('.tl-bar'); };
const fillName = async (p) => { await p.click('[data-theme="Wise"]'); await p.click('[data-theme="Peace"]'); await p.click('[data-ideas]'); await p.waitForSelector('.tl-nm'); };
const fillZodiac = async (p) => { await p.fill('#zd-in', '1998-03-14'); await p.waitForFunction(() => document.querySelector('[data-big]').textContent !== '？'); };

const C = [
  ['tools-pinyin', 'Tools', '', '/tools/pinyin', fillPinyin],
  ['tools-hsk', 'Tools', `state=${J({ tab: 'level' })}`, '/tools/hsk-check', fillHsk],
  ['tools-name', 'Tools', `state=${J({ tab: 'name' })}`, '/tools/name', fillName],
  ['tools-zodiac', 'Tools', `state=${J({ tab: 'zodiac' })}`, '/tools/zodiac', fillZodiac],
  ['settings', 'Settings', '', '/settings'],
  ['appearance', 'Appearance', '', '/settings/appearance'],
].filter((c) => !only || c[0] === only);

const browser = await chromium.launch();
async function shot(url, width, theme, isCanvas, fill) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2, colorScheme: theme });
  const page = await ctx.newPage();
  if (!isCanvas) await page.addInitScript((t) => { try { localStorage.setItem('hsk.v1.settings', JSON.stringify({ theme: t })); } catch (e) {} }, theme);
  await page.goto(url, { waitUntil: 'networkidle' });
  if (isCanvas) await page.waitForFunction(() => window.__ready);
  else if (fill) await fill(page);
  await page.evaluate(() => document.fonts.ready);
  if (!isCanvas) await page.addStyleTag({ content: '.hdr{position:static!important}' });
  await page.waitForTimeout(200);
  // Page body only (header and tab bar are covered by docs/parity/components).
  const buf = await page.locator(isCanvas ? 'main' : 'main').first().screenshot();
  await ctx.close();
  return buf;
}

for (const [key, board, cq, path, fill] of C) {
  for (const width of [390, 1200]) {
    for (const theme of ['light', 'dark']) {
      const a = await shot(`${canvas}/${board}.dc.html?theme=${theme}&w=${width}&${cq}`, width, theme, true);
      const b = await shot(`${app}${path}`, width, theme, false, fill);
      const bg = theme === 'dark' ? '#14110d' : '#fbf9f5', fg = theme === 'dark' ? '#f4efe7' : '#2e2a25';
      const page = await browser.newPage({ deviceScaleFactor: 1 });
      await page.setContent(`<body style="margin:0;background:${bg};color:${fg};font:600 14px system-ui">
        <div style="display:flex;gap:24px;padding:16px;align-items:flex-start;width:max-content">
          <figure style="margin:0"><figcaption style="margin-bottom:6px">Canvas · ${board} · ${width}px · ${theme}</figcaption><img style="display:block;outline:1px dashed #9998" src="data:image/png;base64,${a.toString('base64')}"></figure>
          <figure style="margin:0"><figcaption style="margin-bottom:6px">App · ${path} · ${width}px · ${theme}</figcaption><img style="display:block;outline:1px dashed #9998" src="data:image/png;base64,${b.toString('base64')}"></figure>
        </div></body>`);
      await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().then(() => { i.width = i.naturalWidth / 2; }))));
      await page.locator('body > div').screenshot({ path: `${out}/${key}-${width}-${theme}.png` });
      await page.close();
      console.log('saved', key, width, theme);
    }
  }
}
await browser.close();
