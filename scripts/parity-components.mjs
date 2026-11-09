// Side-by-side parity shots: design canvas board (left) vs the app (right), at 390 and 1200 px, light and dark.
// Usage: node scripts/parity-components.mjs <canvasBase e.g. http://localhost:8814> <appBase e.g. http://localhost:8813> [outDir]
// The canvas base serves the "5 · Component library" .dc.html boards with a small local x-dc renderer (support.js).
import { chromium } from 'playwright';
import fs from 'node:fs';

const [canvas = 'http://localhost:8814', app = 'http://localhost:8813', out = 'docs/parity/components'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const J = (o) => encodeURIComponent(JSON.stringify(o));
const L = (zh, en, glyph, p, n) => ({ lesson: { n, zh, en, glyph, bg: 'var(--ce8f5e9)', p } });
const AR = { glyph: '写', title: 'Write the characters', sub: '19 characters · stroke feedback', href: '#' };

// key, board, canvas query, app path, app selector ('header' = clip of the top bar), extra
const C = [
  ['header', 'AppHeader', `pad=0&gap=0&props=${J({ active: 'learn' })}`, '/home', 'header'],
  ['header-open', 'AppHeader', `pad=0&gap=0&props=${J({ active: 'learn' })}&state=${J({ open: 'learn' })}`, '/home', 'header', { open: true }],
  ['tabbar', 'TabBar', `pad=0&gap=0&props=${J({ active: 'learn' })}`, '/home', 'nav.tabbar', { force: true }],
  ['chip', 'Chip', `row=1&stack=${J([{ label: 'HSK 2.0', active: true }, { label: 'HSK 3.0', active: false }])}`, '/dev/components', '#b-chip'],
  ['stat-card', 'StatCard', `bw=200&stack=${J([{}, { value: '12', label: 'cards due', color: 'var(--c8f241f)' }, { value: '7', label: 'day streak', color: 'var(--c6e5112)' }, { value: '5/10', label: 'characters today', color: 'var(--c1f4a31)', soft: true }])}`, '/dev/components', '#b-stat'],
  ['char-tile', 'CharTile', `row=1&bw=120&stack=${J([{ c: '学', p: 'xué', m: 'to study', tone: 'var(--c15803d)' }, { c: '你', p: 'nǐ', m: 'you', tone: 'var(--c1d4ed8)', dot: 'var(--cgold)' }, { c: '妈', p: 'mā', m: 'mom', tone: 'var(--cc2281f)', dot: 'var(--cblue)', variant: 'soft' }, { c: '是', p: 'shì', m: 'to be', tone: 'var(--c7e22ce)', dot: 'var(--cgreen)' }, { c: '好', p: 'hǎo', m: 'good', tone: 'var(--c1d4ed8)', large: true }])}`, '/dev/components', '#b-tile'],
  ['word-row', 'WordRow', `gap=0&bw=560&stack=${J([{ word: { zh: '学生', py: 'xuésheng', en: 'student', tag: 'HSK 1' } }, { word: { zh: '学习', py: 'xuéxí', en: 'to study', meta: 'verb', tag: 'HSK 1' }, audio: true }, { word: { zh: '老师', py: 'lǎoshī', en: 'teacher' }, audio: true }])}`, '/dev/components', '#b-word'],
  ['quiz-option', 'QuizOption', `gap=10&bw=360&stack=${J([{ state: 'default' }, { state: 'selected' }, { state: 'correct' }, { state: 'wrong' }])}`, '/dev/components', '#b-quiz'],
  ['dialogue-bubble', 'DialogueBubble', `gap=10&bw=480&stack=${J([{ turn: { s: 'A', zh: '你在哪儿工作？', en: 'Where do you work?' } }, { turn: { s: 'B', zh: '我在医院工作。', en: 'I work at a hospital.' } }])}`, '/dev/components', '#b-bubble'],
  ['action-row', 'ActionRow', `gap=10&bw=360&stack=${J([{ ...AR, variant: 'dark' }, { ...AR, variant: 'light' }, { ...AR, variant: 'red', cta: 'Start' }, { ...AR, variant: 'gold' }])}`, '/dev/components', '#b-action'],
  ['lesson-card', 'LessonCard', `gap=10&bw=300&stack=${J([L('学校与工作', 'School & Work', '学', 60, 5), L('你好', 'Greetings', '你', 100, 1), L('家人', 'Family', '家', 0, 2)])}`, '/dev/components', '#b-lesson'],
  ['writing-grid', 'WritingGrid', `row=1&bw=360&stack=${J([{ char: '学', mode: 'show', grid: 'mi', stroke: 3 }, { char: '学', mode: 'outline', grid: 'tian' }, { char: '学', mode: 'blank', grid: 'mi' }])}`, '/dev/components', '#b-grid'],
];

const DOT = { light: { gold: '#6e5112', blue: '#1d3f8a', green: '#2f6b47' }, dark: { gold: '#e6bd5c', blue: '#93b4ff', green: '#6fcf97' } };

const browser = await chromium.launch();
async function shot(url, width, theme, sel, extra = {}, isCanvas = false) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2, colorScheme: theme });
  const page = await ctx.newPage();
  if (!isCanvas) await page.addInitScript((t) => { try { const s = JSON.parse(localStorage.getItem('hsk.v1.settings') || '{}'); s.theme = t; localStorage.setItem('hsk.v1.settings', JSON.stringify(s)); } catch (e) {} }, theme);
  await page.goto(url, { waitUntil: 'networkidle' });
  if (isCanvas) {
    await page.waitForFunction(() => window.__ready);
    await page.addStyleTag({ content: `:root{--cgold:${DOT[theme].gold};--cblue:${DOT[theme].blue};--cgreen:${DOT[theme].green}}` });
  } else {
    await page.evaluate((t) => document.documentElement.setAttribute('data-theme', t), theme);
  }
  await page.evaluate(() => document.fonts.ready);
  if (!isCanvas && sel !== 'header') await page.addStyleTag({ content: '.hdr{position:static!important}' });
  if (extra.force) await page.addStyleTag({ content: '.tb-nav,.tabbar{display:grid!important;position:static!important}' });
  let buf;
  if (sel === 'header') {
    if (extra.open && !isCanvas) { await page.locator('header.hdr .menu-btn').first().click(); await page.waitForTimeout(400); }
    await page.mouse.move(width - 1, 899);
    const h = await page.evaluate((o) => { const hd = document.querySelector(o ? '.hdr' : '.hdr'); return Math.ceil(hd.getBoundingClientRect().height); }, isCanvas);
    buf = await page.screenshot({ clip: { x: 0, y: 0, width, height: extra.open ? h + 330 : h } });
  } else if (sel === 'nav.tabbar' && isCanvas) {
    buf = await page.locator('.tb-nav').screenshot();
  } else {
    buf = await page.locator(isCanvas ? '#root' : sel).screenshot();
  }
  await ctx.close();
  return buf;
}

for (const [key, board, cq, path, sel, extra] of C) {
  for (const width of [390, 1200]) {
    for (const theme of ['light', 'dark']) {
      const a = await shot(`${canvas}/${board}.dc.html?theme=${theme}&${cq}`, width, theme, sel, extra, true);
      const b = await shot(`${app}${path}`, width, theme, sel, extra, false);
      const bg = theme === 'dark' ? '#14110d' : '#fbf9f5', fg = theme === 'dark' ? '#f4efe7' : '#2e2a25';
      const page = await browser.newPage({ deviceScaleFactor: 1 });
      const html = `<body style="margin:0;background:${bg};color:${fg};font:600 14px system-ui">
        <div style="display:flex;gap:24px;padding:16px;align-items:flex-start;width:max-content">
          <figure style="margin:0"><figcaption style="margin-bottom:6px">Canvas · ${board} · ${width}px · ${theme}</figcaption><img style="display:block;outline:1px dashed #9998" width="${'W'}" src="data:image/png;base64,${a.toString('base64')}"></figure>
          <figure style="margin:0"><figcaption style="margin-bottom:6px">App · ${path} · ${width}px · ${theme}</figcaption><img style="display:block;outline:1px dashed #9998" src="data:image/png;base64,${b.toString('base64')}"></figure>
        </div></body>`.replace(/width="W"/, '');
      await page.setContent(html);
      await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().then(() => { i.width = i.naturalWidth / 2; }))));
      const el = page.locator('body > div');
      await el.screenshot({ path: `${out}/${key}-${width}-${theme}.png` });
      await page.close();
      console.log('saved', key, width, theme);
    }
  }
}
await browser.close();
