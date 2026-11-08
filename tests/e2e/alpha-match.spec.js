// @ts-check
// F4 Pinyin match: play a lesson through, wrong taps count as misses, best score is stored.
const { test, expect } = require('@playwright/test');

for (const vp of [{ width: 390, height: 844 }, { width: 1200, height: 900 }]) {
  test.describe(`pinyin match @ ${vp.width}px`, () => {
    test.use({ viewport: vp });

    test('play every round, then the best score is saved', async ({ page, request }) => {
      const errors = [];
      page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errors.push(m.text()); });
      page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
      const deck = (await (await request.get('/data/review-deck?lesson=lesson-1')).json()).cards;
      const py = Object.fromEntries(deck.map((c) => [c.hanzi, c.pinyin]));

      await page.goto('/practice/match?lesson=lesson-1');
      await expect(page.locator('[data-session]')).toBeVisible();
      await expect(page.locator('.page-head h1')).toHaveText('Pinyin match');
      await expect(page.locator('[data-left] .mt-tile').first()).toBeVisible();

      for (const loc of [page.locator('[data-left] .mt-tile').first(), page.locator('[data-right] .mt-tile').first(), page.locator('[data-set-mode=pinyin]'), page.locator('[data-set-mode=meaning]')]) {
        const b = await loc.boundingBox();
        expect(b && b.height).toBeGreaterThanOrEqual(44);
        expect(b && b.width).toBeGreaterThanOrEqual(44);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(page.locator('[data-right] .mt-tile [class^=tone-]').first()).toBeVisible(); // tone-coloured pinyin

      // One deliberate miss: a character with a different answer's tile.
      const firstHanzi = await page.locator('[data-left] .mt-tile').first().textContent();
      const wrong = page.locator('[data-right] .mt-tile', { hasNotText: py[firstHanzi || ''] }).first();
      await page.locator('[data-left] .mt-tile').first().click();
      await wrong.click();
      await expect(page.locator('[data-misses]')).toHaveText('1');

      // Clear every round by matching each character to its pinyin (answer first, to prove either order works).
      for (let guard = 0; guard < 10 && !(await page.locator('[data-summary]').isVisible()); guard++) {
        const left = page.locator('[data-left] .mt-tile:not(.is-done)');
        while (await left.count()) {
          const h = (await left.first().textContent()) || '';
          const ans = py[h];
          const target = page.locator('[data-right] .mt-tile:not(.is-done)').filter({ hasText: new RegExp('^' + ans.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }).first();
          await target.click();
          await left.first().click();
          if (await page.locator('[data-summary]').isVisible()) break;
        }
        if (!(await page.locator('[data-summary]').isVisible())) await page.waitForTimeout(600);
      }
      await expect(page.locator('[data-summary]')).toBeVisible();
      await expect(page.locator('[data-stat=misses] .stat-value')).toHaveText('1');
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('hsk.v1.match') || '{}'));
      expect(saved['lesson-1']).toMatchObject({ misses: 1 });
      expect(saved['lesson-1'].score).toBe(saved['lesson-1'].pairs * 10 - 2);
      await expect(page.locator('[data-best-note]')).toHaveText('New best!');
      await expect(page.locator('[data-action=again]')).toBeVisible();
      expect(errors).toEqual([]);
    });

    test('meaning mode, saved-words source and Practice link', async ({ page }) => {
      await page.goto('/practice');
      await page.getByRole('link', { name: /Pinyin match/ }).click();
      await expect(page).toHaveURL(/\/practice\/match$/);
      await page.locator('a[href$="lesson=lesson-1"]').click();
      await expect(page.locator('[data-session]')).toBeVisible();
      await page.locator('[data-set-mode=meaning]').click();
      await expect(page.locator('[data-set-mode=meaning]')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('[data-right] .mt-tile [class^=tone-]')).toHaveCount(0);
      // Empty saved list explains itself.
      await page.goto('/practice/match?source=saved');
      await expect(page.locator('[data-msg]')).toContainText('no saved words');
    });
  });
}
