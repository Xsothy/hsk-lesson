// @ts-check
// D1 Practice: a full 5-character Write session on real strokes, then the summary.
const { test, expect } = require('@playwright/test');
const { writeCharacter } = require('./helpers/hanzi');

test.use({ viewport: { width: 390, height: 844 } });

test('5-character practice session records results and shows a summary', async ({ page, request }) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

  const words = ['学', '你', '好', '我', '是'];
  const q = await (await request.get('/data/practice-queue?words=' + encodeURIComponent(words.join(',')))).json();
  const order = q.items.map((i) => i.char);
  expect(order).toHaveLength(5);

  await page.goto('/practice?words=' + encodeURIComponent(words.join(',')));
  await expect(page.locator('[data-session]')).toBeVisible();
  await page.waitForTimeout(600);

  for (let i = 0; i < order.length; i++) {
    await expect(page.locator('[data-count]')).toContainText(`${i + 1}`);
    await writeCharacter(page, page.locator('[data-writer]'), order[i]);
    await expect(page.locator('[data-feedback]')).toContainText(/Perfect|Done with/, { timeout: 10_000 });
    await page.locator('[data-action=next]').click();
    await page.waitForTimeout(500);
  }

  await expect(page.locator('[data-summary]')).toBeVisible();
  await expect(page.locator('[data-stat=done] .stat-value')).toHaveText('5/5');
  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('hsk.v1.progress') || '{}'));
  for (const c of order) expect(progress.chars?.[c]?.written ?? 0).toBeGreaterThanOrEqual(1);
  expect(errors).toEqual([]);
});
