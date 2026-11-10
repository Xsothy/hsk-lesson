// @ts-check
// Theme feature: Appearance page presets/controls apply app-wide, persist, and keep text contrast >= 4.5:1.
const { test, expect } = require('@playwright/test');
const { auditContrast } = require('./contrast');

const VIEWPORTS = [{ width: 390, height: 844 }, { width: 1200, height: 900 }];
const PRESETS = ['Paper', 'Ink wash', 'Jade', 'Plum', 'Sakura', 'Sunrise', 'Aurora', 'Midnight'];
const rootVar = (page, v) => page.evaluate((n) => document.documentElement.style.getPropertyValue(n), v);
const settings = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('hsk.v1.settings') || '{}'));

for (const vp of VIEWPORTS) {
  test.describe(`appearance @ ${vp.width}`, () => {
    test.use({ viewport: vp });

    test('presets apply everywhere, persist and stay readable', async ({ page }) => {
      const errors = [];
      page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errors.push(m.text()); });
      page.on('pageerror', (e) => errors.push(e.message));

      await page.goto('/settings');
      await page.click('[data-appearance-link]');
      await expect(page).toHaveURL(/\/settings\/appearance$/);
      // Paper (default) sets no overrides: the stock tokens.css look.
      expect(await rootVar(page, '--paper')).toBe('');
      await expect(page.locator('.ap-preset')).toHaveCount(8);

      // Touch targets
      const small = await page.$$eval('.ap-controls button', (els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 44 || r.width < 44); }).length);
      expect(small).toBe(0);

      const problems = [];
      for (const scheme of ['dark', 'light']) { // system-mode presets follow the OS, so check both
        await page.emulateMedia({ colorScheme: scheme });
        for (const name of PRESETS) {
          await page.locator('.ap-preset', { hasText: name }).click();
          await expect(page.locator('.ap-preset', { hasText: name })).toHaveAttribute('aria-pressed', 'true');
          await page.waitForTimeout(150);
          (await page.evaluate(auditContrast)).forEach((b) => problems.push(`${scheme} ${name} /settings/appearance: ${b}`));
          await page.goto('/home');
          (await page.evaluate(auditContrast)).forEach((b) => problems.push(`${scheme} ${name} /home: ${b}`));
          await page.goBack();
        }
      }
      expect(problems).toEqual([]);

      // Midnight (last) persisted across navigation: dark slate + amber, brush Chinese font
      await page.goto('/lessons/lesson-1');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      expect(await rootVar(page, '--paper')).toBe('#121821');
      expect(await rootVar(page, '--font-zh')).toContain('Ma Shan Zheng');
      expect((await settings(page)).themePreset).toBe('midnight');

      // Custom tweak clears the preset; reset returns to stock
      await page.goto('/settings/appearance');
      await page.getByRole('button', { name: 'Teal' }).click();
      await page.locator('.ap-radius', { hasText: 'XL' }).click();
      const s = await settings(page);
      expect([s.themeAccent, s.themeRadius, s.themePreset]).toEqual(['teal', 28, '']);
      expect(await rootVar(page, '--r-m')).toBe('28px');
      await page.getByRole('button', { name: 'Reset to Paper' }).click();
      expect(await rootVar(page, '--paper')).toBe('');
      expect(await rootVar(page, '--red')).toBe('');
      await page.getByRole('button', { name: 'Show theme CSS' }).click();
      await expect(page.locator('#ap-css')).toContainText('stock tokens.css');
      expect(errors).toEqual([]);
    });
  });
}
