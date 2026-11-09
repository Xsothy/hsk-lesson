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
  return page.$$eval('.tl-panel:not([hidden]) :is(.tl-btn, .tl-pill, .tl-input, .tl-select, .tl-w:not(.p), .tl-nm, .tl-link), .tl-tab', (els) =>
    els.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.height < 44 || r.width < 44); }).map((e) => e.className));
}

for (const vp of VIEWPORTS) {
  test.describe(`tools @ ${vp.width}`, () => {
    test.use({ viewport: vp });

    test('index shows four tabs that deep-link', async ({ page }) => {
      const errors = [];
      await open(page, '/tools', errors);
      await expect(page.locator('.tl-tab')).toHaveCount(4);
      await expect(page.locator('#tl-tab-pinyin')).toHaveAttribute('aria-selected', 'true');
      await page.click('#tl-tab-zodiac');
      await expect(page).toHaveURL(/\/tools\/zodiac$/);
      await expect(page.locator('#tl-p-zodiac')).toBeVisible();
      await expect(page.locator('#tl-p-pinyin')).toBeHidden();
      expect(await smallTargets(page)).toEqual([]);
      expect(errors).toEqual([]);
    });

    test('pinyin converter', async ({ page }) => {
      const errors = [];
      await open(page, '/tools/pinyin', errors);
      await page.fill('#pin-in', 'xue2xi2');
      await expect(page.locator('[data-out]')).toHaveText('xuéxí');
      await page.selectOption('#pin-mode', 'numbers');
      await page.fill('#pin-in', 'nǐ hǎo');
      await expect(page.locator('[data-out]')).toHaveText('ni3 hao3');
      expect(await smallTargets(page)).toEqual([]);
      expect(errors).toEqual([]);
    });

    test('hsk checker', async ({ page }) => {
      const errors = [];
      await open(page, '/tools/hsk-check', errors);
      await page.fill('#hsk-in', '我今天学习汉语。');
      await expect(page.locator('.tl-w.hsk-w').first()).toBeVisible();
      await expect(page.locator('.tl-bar')).toHaveCount(4);
      expect(await smallTargets(page)).toEqual([]);
      expect(errors).toEqual([]);
    });

    test('name helper', async ({ page }) => {
      const errors = [];
      await open(page, '/tools/name', errors);
      await page.fill('#nm-in', 'Emma');
      await page.click('#nm-in + [data-run]');
      await expect(page.locator('[data-name]')).not.toBeEmpty();
      await page.click('[data-theme="Beautiful"]');
      await page.click('[data-theme="Wise"]');
      await page.click('[data-ideas]');
      await expect(page.locator('.tl-nm').first()).toBeVisible();
      expect(await smallTargets(page)).toEqual([]);
      expect(errors).toEqual([]);
    });

    test('zodiac respects new year boundary', async ({ page }) => {
      const errors = [];
      await open(page, '/tools/zodiac', errors);
      await page.fill('#zd-in', '2024-02-09');
      await expect(page.locator('[data-title]')).toContainText('Rabbit');
      await page.fill('#zd-in', '2024-02-10');
      await expect(page.locator('[data-title]')).toContainText('Dragon');
      expect(await smallTargets(page)).toEqual([]);
      expect(errors).toEqual([]);
    });
  });
}
