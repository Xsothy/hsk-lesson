// @ts-check
// Character parts: /parts explorer (meaning clues + sound families) and the Character facts links into it.
const { test, expect } = require('@playwright/test');

for (const vp of [{ width: 390, height: 844 }, { width: 1200, height: 900 }]) {
  test.describe(`character parts @ ${vp.width}`, () => {
    test.use({ viewport: vp });

    test('/parts shows a clue, filters, examples and 44px targets', async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto('/parts?c=' + encodeURIComponent('氵'));
      const detail = page.locator('[data-part-detail]');
      await expect(detail).toBeVisible();
      await expect(detail).toContainText('Meaning clue');
      expect(await page.locator('[data-part]').count()).toBeGreaterThan(4);
      const ex = detail.locator('[data-example]');
      expect(await ex.count()).toBeGreaterThan(0);
      for (const el of [ex.first(), page.locator('[data-part]').first(), page.locator('.pt-filters .chip').first()]) {
        const box = await el.boundingBox();
        expect(box && box.height).toBeGreaterThanOrEqual(44);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
      expect(/\p{Extended_Pictographic}/u.test(await page.locator('.pt').innerText())).toBe(false);

      await page.locator('.pt-filters .chip', { hasText: 'Sound families' }).click();
      await expect(page).toHaveURL(/kind=sound/);
      await expect(page.locator('[data-part-detail]')).toContainText('Sound clue');

      await page.locator('[data-add-cards]').click();
      await expect(page.locator('[data-add-cards]')).toHaveAttribute('aria-pressed', 'true');

      await page.locator('[data-example]').first().click();
      await expect(page).toHaveURL(/\/char\//);
      expect(errors).toEqual([]);
    });

    test('character facts link parts to /parts', async ({ page }) => {
      await page.goto('/char/' + encodeURIComponent('明'));
      const link = page.locator('.cp-facts a[href*="/parts?c="]').first();
      await expect(link).toBeVisible();
      await link.click();
      await expect(page).toHaveURL(/\/parts\?c=/);
      await expect(page.locator('[data-part-detail]')).toBeVisible();
    });

    test('JSON exposes decomposition and parts', async ({ request }) => {
      const j = await (await request.get('/data/char/' + encodeURIComponent('明') + '.json')).json();
      expect(j.data.decomposition).toContain('日');
      expect(j.data.parts.components.map((p) => p.char)).toEqual(['日', '月']);
    });
  });
}
