// @ts-check
// F3 Tools smoke: each page loads at phone + desktop width, works, no console errors, touch targets >= 44px.
const { test, expect } = require('@playwright/test');

const VIEWPORTS = [{ width: 390, height: 844 }, { width: 1200, height: 900 }];
const IGNORED = /fonts\.(googleapis|gstatic)\.com/;

async function open(page, url, errors) {
  page.on('console', (m) => { if (m.type() === 'error' && !IGNORED.test(m.text()) && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url);
}

async function smallTargets(page) {
  return page.$$eval('.tool .btn, .tool-field, .chip-btn, .tool-seg span, .tools-grid a', (els) =>
    els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 44 || r.width < 44); }).map((e) => e.className));
}

for (const vp of VIEWPORTS) {
  test.describe(`tools @ ${vp.width}`, () => {
    test.use({ viewport: vp });

    test('index lists four tools', async ({ page }) => {
      const errors = [];
      await open(page, '/tools', errors);
      await expect(page.locator('.tools-grid a')).toHaveCount(4);
      expect(await smallTargets(page)).toEqual([]);
      expect(errors).toEqual([]);
    });

    test('pinyin converter', async ({ page }) => {
      const errors = [];
      await open(page, '/tools/pinyin', errors);
      await page.fill('#pin-in', 'xue2xi2');
      await expect(page.locator('[data-out]')).toHaveText('xuéxí');
      await page.getByText('Tone numbers', { exact: true }).click();
      await page.fill('#pin-in', 'nǐ hǎo');
      await expect(page.locator('[data-out]')).toHaveText('ni3 hao3');
      expect(await smallTargets(page)).toEqual([]);
      expect(errors).toEqual([]);
    });

    test('hsk checker', async ({ page }) => {
      const errors = [];
      await open(page, '/tools/hsk-check', errors);
      await page.fill('#hsk-in', '我今天学习汉语。');
      await page.click('[data-run]');
      await expect(page.locator('[data-result]')).toBeVisible();
      await expect(page.locator('.hsk-w').first()).toBeVisible();
      expect(await smallTargets(page)).toEqual([]);
      expect(errors).toEqual([]);
    });

    test('name helper', async ({ page }) => {
      const errors = [];
      await open(page, '/tools/name', errors);
      await page.fill('#nm-in', 'Emma');
      await page.click('[data-run]');
      await expect(page.locator('[data-name]')).not.toBeEmpty();
      await page.click('[data-theme="Beautiful"]');
      await expect(page.locator('[data-chars] button').first()).toBeVisible();
      await page.locator('[data-chars] button').first().click();
      await expect(page.locator('[data-picks]')).not.toHaveText('—');
      expect(await smallTargets(page)).toEqual([]);
      expect(errors).toEqual([]);
    });

    test('zodiac respects new year boundary', async ({ page }) => {
      const errors = [];
      await open(page, '/tools/zodiac', errors);
      await page.fill('#zd-in', '2024-02-09');
      await page.click('[data-run]');
      await expect(page.locator('[data-text]')).toContainText('Rabbit');
      await page.fill('#zd-in', '2024-02-10');
      await page.click('[data-run]');
      await expect(page.locator('[data-text]')).toContainText('Dragon');
      expect(await smallTargets(page)).toEqual([]);
      expect(errors).toEqual([]);
    });
  });
}
