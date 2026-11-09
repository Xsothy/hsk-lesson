// @ts-check
const { test, expect } = require('@playwright/test');

for (const vp of [{ name: 'phone', width: 390, height: 844 }, { name: 'desktop', width: 1200, height: 900 }]) {
  test(`guides index + article @ ${vp.name}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto('/guides');
    await expect(page.locator('h1')).toContainText('Guides');
    await expect(page.locator('.guide-card')).toHaveCount(6);
    await expect(page.locator('.gd-article > h2')).toBeVisible();
    await page.locator('.guide-card', { hasText: '不 vs 没' }).click();
    await expect(page.locator('.guide-card.is-on')).toContainText('不 vs 没');
    await expect(page).toHaveURL(/\/guides\/bu-mei/);
    await expect(page.locator('.guide-body ruby').first()).toBeVisible();
    await expect(page.locator('.guide-body [class^="tone-"]').first()).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow).toBe(false);
  });
}
