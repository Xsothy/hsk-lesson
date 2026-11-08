// @ts-check
// F1 Textbooks: import pasted + CSV words, lookup fills gaps, practice/review sources, rename/delete.
const { test, expect } = require('@playwright/test');

for (const vp of [{ width: 390, height: 844 }, { width: 1200, height: 900 }]) {
  test.describe(`textbooks @ ${vp.width}`, () => {
    test.use({ viewport: vp });

    test('import, review, rename, delete', async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto('/courses?tab=textbooks');
      await page.fill('#tb-name', 'Book 1');
      await page.fill('#tb-text', 'hanzi,pinyin,meaning\n你好,nǐ hǎo,hello there\n朋友\n谢谢');
      await page.click('#tb-import');
      await expect(page.locator('.tb-list')).toHaveCount(1);
      await expect(page.locator('.tb-head')).toContainText('3 words');
      await page.locator('.tb-words summary').click();
      await expect(page.locator('.tb-words .word-row').first()).toBeVisible();
      await expect(page.locator('.tb-words .wr-en').first()).toHaveText('hello there');
      const small = await page.$$eval('.tb .btn, .tb-input, .tb-words summary', (els) => els.filter((e) => e.getBoundingClientRect().height < 44 && e.getBoundingClientRect().width > 0).length);
      expect(small).toBe(0);
      await page.reload();
      await expect(page.locator('.tb-list h2')).toHaveText('Book 1');
      await page.click('.tb-review');
      await expect(page.locator('#rv-study')).toBeVisible();
      await expect(page.locator('#rv-title')).toHaveText('Book 1');
      await page.goto('/courses?tab=textbooks');
      await page.click('.tb-practice');
      await expect(page).toHaveURL(/source=list/);
      await expect(page.locator('[data-practice]')).toBeVisible();
      await page.goto('/courses?tab=textbooks');
      page.once('dialog', (d) => d.accept('Renamed'));
      await page.click('.tb-rename');
      await expect(page.locator('.tb-list h2')).toHaveText('Renamed');
      page.once('dialog', (d) => d.accept());
      await page.click('.tb-delete');
      await expect(page.locator('.tb-list')).toHaveCount(0);
      await expect(page.locator('#tb-empty')).toBeVisible();
      expect(errors).toEqual([]);
    });

    test('CSV upload loads into the box', async ({ page }) => {
      await page.goto('/courses?tab=textbooks');
      await page.setInputFiles('#tb-file', { name: 'unit2.csv', mimeType: 'text/csv', buffer: Buffer.from('老师,lǎoshī,teacher\n学生\n') });
      await expect(page.locator('#tb-name')).toHaveValue('unit2');
      await page.click('#tb-import');
      await expect(page.locator('.tb-head')).toContainText('2 words');
    });
  });
}
