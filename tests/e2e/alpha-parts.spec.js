// @ts-check
// F5 Character parts: breakdown + sharing section at phone and desktop width.
const { test, expect } = require('@playwright/test');

for (const vp of [{ width: 390, height: 844 }, { width: 1200, height: 900 }]) {
  test.describe(`character parts @ ${vp.width}`, () => {
    test.use({ viewport: vp });

    test('明 shows parts, radical highlight, links and sharing list', async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto('/char/' + encodeURIComponent('明'));
      const parts = page.locator('[data-parts]');
      await expect(parts).toBeVisible();
      await expect(parts.locator('[data-part]')).toHaveCount(2);
      await expect(parts.locator('[data-radical]')).toHaveCount(1);
      const link = parts.locator('[data-part] a').first();
      await expect(link).toBeVisible();
      const box = await link.boundingBox();
      expect(box && box.height).toBeGreaterThanOrEqual(44);
      const shared = parts.locator('[data-shared] a');
      expect(await shared.count()).toBeGreaterThan(0);
      expect(await shared.count()).toBeLessThanOrEqual(36);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      expect(overflow).toBe(false);
      const emoji = /\p{Extended_Pictographic}/u.test(await parts.innerText());
      expect(emoji).toBe(false);
      await link.click();
      await expect(page).toHaveURL(/\/char\//);
      expect(errors).toEqual([]);
    });

    test('JSON exposes decomposition and parts', async ({ request }) => {
      const j = await (await request.get('/data/char/' + encodeURIComponent('明') + '.json')).json();
      expect(j.data.decomposition).toContain('日');
      expect(j.data.parts.components.map((p) => p.char)).toEqual(['日', '月']);
    });
  });
}
