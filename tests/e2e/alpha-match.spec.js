// @ts-check
// F4 Pinyin match (canvas "Match"): place every sticker on its pinyin slot, a wrong slot counts as a miss, best score is stored.
const { test, expect } = require('@playwright/test');

for (const vp of [{ width: 390, height: 844 }, { width: 1200, height: 900 }]) {
  test.describe(`pinyin match @ ${vp.width}px`, () => {
    test.use({ viewport: vp });

    test('play every board, then the best score is saved', async ({ page, request }) => {
      const errors = [];
      page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errors.push(m.text()); });
      page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
      const deck = (await (await request.get('/data/review-deck?lesson=lesson-1')).json()).cards;
      const py = Object.fromEntries(deck.map((c) => [c.hanzi, c.pinyin]));

      await page.goto('/practice/match?lesson=lesson-1');
      await expect(page.locator('h1')).toContainText('Pinyin match');
      await expect(page.locator('.mt-sticker').first()).toBeVisible();

      for (const loc of [page.locator('.mt-sticker').first(), page.locator('.mt-slot').first(), page.locator('[data-action=new]')]) {
        const b = await loc.boundingBox();
        expect(b && b.height).toBeGreaterThanOrEqual(44);
        expect(b && b.width).toBeGreaterThanOrEqual(44);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(page.locator('.mt-slot [class^=tone-]').first()).toBeVisible(); // tone-coloured pinyin

      // One deliberate miss: a sticker on a slot with a different pinyin.
      const first = (await page.locator('.mt-sticker').first().textContent()) || '';
      await page.locator('.mt-sticker').first().click();
      await page.locator('.mt-slot', { hasNotText: py[first] }).first().click();
      await expect(page.locator('[data-feedback]')).toContainText('Not that one');
      await expect(page.locator('.mt-slot.is-bad')).toHaveCount(1);

      for (let guard = 0; guard < 12; guard++) {
        while (await page.locator('.mt-sticker').count()) {
          const s = page.locator('.mt-sticker').first();
          const h = (await s.textContent()) || '';
          await s.click();
          await page.locator('.mt-slot:not(.is-done)').filter({ hasText: new RegExp('^' + py[h].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }).first().click();
        }
        if (/All \d+ words/.test((await page.locator('[data-feedback]').textContent()) || '')) break;
        await page.locator('[data-action=new]').click();
      }
      await expect(page.locator('[data-feedback]')).toContainText('New best!');
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('hsk.v1.match') || '{}'));
      expect(saved['lesson-1']).toMatchObject({ misses: 1 });
      expect(saved['lesson-1'].score).toBe(saved['lesson-1'].pairs * 10 - 2);
      expect(errors).toEqual([]);
    });

    test('header link, source buttons and empty saved words', async ({ page }) => {
      await page.goto('/practice/match');
      await expect(page.locator('.mt-sticker').first()).toBeVisible(); // no source: board from the first lesson
      await expect(page.locator('.mt-src[aria-pressed=true]')).toHaveText(/Lesson/);
      await page.goto('/practice/match?source=saved');
      await expect(page.locator('[data-msg]')).toContainText('no saved words');
    });
  });
}
