// @ts-check
// F9 My words: Export PDF + Worksheet buttons at phone and desktop width, 44px targets, PDF comes back.
const { test, expect } = require('@playwright/test');

for (const vp of [{ width: 390, height: 844 }, { width: 1200, height: 900 }]) {
  test.describe(`my words pdf @ ${vp.width}`, () => {
    test.use({ viewport: vp });

    test('buttons are 44px and export works', async ({ page }) => {
      await page.addInitScript(() => { try { if (!localStorage.getItem('hsk.v1.saved')) localStorage.setItem('hsk.v1.saved', JSON.stringify(['你好', '学'])); } catch (e) {} });
      await page.goto('/words');
      const pdf = page.locator('[data-act=pdf]');
      const sheet = page.locator('[data-act=sheet]');
      await expect(pdf).toBeVisible();
      for (const el of [pdf, sheet]) {
        const b = await el.boundingBox();
        expect(b && b.height).toBeGreaterThanOrEqual(44);
        expect(b && b.width).toBeGreaterThanOrEqual(44);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await expect(sheet).toHaveAttribute('href', /chars=%E4%BD%A0%E5%A5%BD%E5%AD%A6/);

      const resp = page.context().waitForEvent('response', { predicate: (r) => r.url().endsWith('/words/pdf') });
      await pdf.click();
      const r = await resp;
      expect(r.status()).toBe(200);
      expect(r.headers()['content-type']).toContain('application/pdf');
    });
  });
}
