// @ts-check
// B-QA: every beta route renders cleanly at 390/1200, worksheet PDF response, textbook paste → practice + match, old-URL redirects.
const { test, expect } = require('@playwright/test');
const { writeCharacter } = require('./helpers/hanzi');

const ROUTES = ['/home', '/courses', '/courses?tab=textbooks', '/lessons/lesson-1', '/lessons/lesson-1/reading/1', '/char/' + encodeURIComponent('明'),
  '/browse', '/search?q=' + encodeURIComponent('学'), '/practice', '/practice/sentences?lesson=lesson-1', '/practice/match?lesson=lesson-1', '/review', '/words',
  '/settings', '/login', '/register', '/guides', '/guides/de-particles', '/tools', '/tools/pinyin', '/tools/hsk-check', '/tools/name', '/tools/zodiac', '/worksheet'];

const ignorable = (t) => /fonts\.(googleapis|gstatic)/.test(t);

for (const vp of [{ width: 390, height: 844 }, { width: 1200, height: 900 }]) {
  test.describe(`beta QA @ ${vp.width}`, () => {
    test.use({ viewport: vp });

    test('every beta route: 200, no JS errors, no horizontal scroll', async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
      page.on('console', (m) => { if (m.type() === 'error' && !ignorable(m.text())) errors.push(page.url() + ' ' + m.text()); });
      for (const r of ROUTES) {
        const resp = await page.goto(r, { waitUntil: 'networkidle' });
        expect(resp && resp.status(), r).toBe(200);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'h-scroll ' + r).toBe(true);
      }
      expect(errors).toEqual([]);
    });

    test('worksheet form returns a PDF', async ({ page }) => {
      await page.goto('/worksheet');
      await page.locator('input[name=source][value=text]').check({ force: true });
      await page.fill('#ws-chars', '你好');
      const popup = page.context().waitForEvent('response', { predicate: (r) => r.url().includes('/worksheet.pdf') });
      await page.click('[data-worksheet-form] button[type=submit]');
      const r = await popup;
      expect(r.status()).toBe(200);
      expect(r.headers()['content-type']).toContain('application/pdf');
    });

    test('textbook paste → practice writes a word → match game on the list', async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto('/courses?tab=textbooks');
      await page.fill('#tb-name', 'QA list');
      await page.fill('#tb-text', '学\n你\n好\n我\n是\n大');
      await page.click('#tb-import');
      await expect(page.locator('.tb-head')).toContainText('6 words');
      const qResp = page.waitForResponse((r) => r.url().includes('/data/practice-queue'));
      await page.click('.tb-practice');
      await expect(page).toHaveURL(/source=list/);
      const first = (await (await qResp).json()).items[0].char;
      await expect(page.locator('[data-session]')).toBeVisible();
      await page.waitForTimeout(600);
      await writeCharacter(page, page.locator('[data-writer]'), first);
      await expect(page.locator('[data-feedback]')).toContainText(/Perfect|Done with/, { timeout: 10_000 });
      const id = new URL(page.url()).searchParams.get('id');
      await page.goto('/practice/match?source=list&id=' + encodeURIComponent(id || ''));
      await expect(page.locator('[data-session]')).toBeVisible();
      await expect(page.locator('[data-left] .mt-tile').first()).toBeVisible();
      expect(errors).toEqual([]);
    });
  });
}

test('old static URLs redirect to the Laravel pages', async ({ request }) => {
  const cases = [
    ['/index.html', /^https?:\/\/[^/]+\/?$/],
    ['/lesson.html?lesson=1', /\/lessons\/lesson-1$/],
    ['/lesson.html', /\/courses$/],
    ['/export-lessons.html', /\/courses$/],
    ['/char.html?c=' + encodeURIComponent('明'), /\/char\//],
  ];
  for (const [from, to] of cases) {
    const r = await request.get(from, { maxRedirects: 0 });
    expect([301, 302], from).toContain(r.status());
    expect(r.headers()['location'], from).toMatch(to);
  }
});
