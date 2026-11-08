// @ts-check
// R1 interlinear pinyin: alignment over hanzi, tone colours, live settings, reading toggle, word sheet.
const { test, expect } = require('@playwright/test');

async function lessonSlug(request) {
  const html = await (await request.get('/courses')).text();
  const m = html.match(/href="[^"]*\/lessons\/([A-Za-z0-9_-]+)"/);
  if (!m) throw new Error('No lesson link found on /courses');
  return m[1];
}

/** Geometry of the first dialogue word: is the pinyin centred over / under its hanzi? */
function geometry() {
  const ruby = document.querySelector('#dialogue ruby');
  const rb = ruby.querySelector('rb').getBoundingClientRect();
  const rt = ruby.querySelector('rt');
  const r = rt.getBoundingClientRect();
  return {
    word: ruby.querySelector('rb').textContent,
    // rb boxes include half-leading, so compare vertical centres.
    rtAbove: (r.top + r.bottom) / 2 < (rb.top + rb.bottom) / 2 - 4,
    rtBelow: (r.top + r.bottom) / 2 > (rb.top + rb.bottom) / 2 + 4,
    centreDelta: Math.abs((r.left + r.right) / 2 - (rb.left + rb.right) / 2),
    rtShown: getComputedStyle(rt).display !== 'none' && r.height > 0,
    colour: getComputedStyle(rt.querySelector('span')).color,
    rbSize: parseFloat(getComputedStyle(ruby.querySelector('rb')).fontSize),
  };
}

/** Save settings like the Settings page does, then fire the live-apply event (no reload). */
async function setSettings(page, s) {
  await page.evaluate((s) => {
    localStorage.setItem('hsk.v1.settings', JSON.stringify(s));
    window.dispatchEvent(new CustomEvent('hsk:settings', { detail: s }));
  }, s);
}

test.describe('interlinear pinyin', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('lesson dialogue: one ruby per word, aligned and tone-coloured', async ({ page, request }) => {
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errors.push(m.text()); });
    await page.goto(`/lessons/${await lessonSlug(request)}`);

    const first = page.locator('#dialogue .bubble').first();
    // Words, not characters: 你好 is one ruby with two tone-3 syllables; punctuation is unwrapped.
    await expect(first.locator('rb').first()).toHaveText('你好');
    await expect(first.locator('rt').first().locator('span')).toHaveText(['nǐ', 'hǎo']);
    await expect(first.locator('rt').first().locator('span.tone-3')).toHaveCount(2);
    await expect(first.locator('rb', { hasText: '！' })).toHaveCount(0);
    expect(await first.locator('.rl-text').evaluate((el) => {
      const c = el.cloneNode(true); c.querySelectorAll('rt').forEach((rt) => rt.remove()); return c.textContent;
    })).toBe('你好！你叫什么名字？');

    const g = await page.evaluate(geometry);
    expect(g.rtAbove).toBe(true);
    expect(g.centreDelta).toBeLessThan(3);
    expect(g.colour).not.toBe('rgb(15, 12, 8)'); // coloured, not ink
    expect(errors).toEqual([]);
  });

  test('settings apply live without reload', async ({ page, request }) => {
    await page.goto(`/lessons/${await lessonSlug(request)}`);
    const base = await page.evaluate(geometry);
    const marker = await page.evaluate(() => (window.__noReload = 1));

    await setSettings(page, { pinyinPos: 'below' });
    let g = await page.evaluate(geometry);
    expect(g.rtBelow).toBe(true);

    await setSettings(page, { toneColors: false });
    g = await page.evaluate(geometry);
    expect(g.rtAbove).toBe(true);
    expect(g.colour).not.toBe(base.colour);

    await setSettings(page, { charSize: 'lg' });
    g = await page.evaluate(geometry);
    expect(g.rbSize).toBeGreaterThan(base.rbSize);

    await setSettings(page, { pinyin: 'hide' });
    g = await page.evaluate(geometry);
    expect(g.rtShown).toBe(false);

    await setSettings(page, {});
    g = await page.evaluate(geometry);
    expect(g).toEqual(base);
    expect(await page.evaluate(() => window.__noReload)).toBe(marker);
  });

  test('reading: pinyin toggle hides ruby text; word opens the word sheet', async ({ page, request }) => {
    await page.goto(`/lessons/${await lessonSlug(request)}/reading/1`);
    const rt = page.locator('#reading-lines rt').first();
    await expect(rt).toBeVisible();
    await page.locator('#tg-pinyin').click();
    await expect(rt).toBeHidden();
    await page.locator('#tg-pinyin').click();
    await expect(rt).toBeVisible();

    const word = page.locator('#reading-lines .rl-word').first();
    const zh = await word.getAttribute('data-word');
    await word.click();
    const sheet = page.locator('dialog.word-sheet');
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('.ws-zh')).toHaveText(zh || '');
    await expect(sheet.locator('.ws-chars a').first()).toHaveAttribute('href', /\/char\//);
    await sheet.locator('.ws-close').click();
    await expect(sheet).toBeHidden();
  });
});
