// @ts-check
// F7 Sentence practice: build-the-sentence and pick-the-meaning sessions at phone and desktop widths.
const { test, expect } = require('@playwright/test');

for (const vp of [{ width: 390, height: 844 }, { width: 1200, height: 900 }]) {
  test.describe(`sentence practice @ ${vp.width}px`, () => {
    test.use({ viewport: vp });

    test('build every sentence in order, then record the score', async ({ page, request }) => {
      const errors = [];
      page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errors.push(m.text()); });
      page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
      const q = await (await request.get('/data/practice-queue?kind=sentences&lesson=lesson-1')).json();
      const byEn = Object.fromEntries(q.items.map((i) => [i.en, i]));

      await page.goto('/practice/sentences?lesson=lesson-1&mode=build');
      await expect(page.locator('[data-session]')).toBeVisible();
      await expect(page.locator('[data-title]')).toHaveText('Sentences');

      for (let n = 0; n < q.items.length; n++) {
        await expect(page.locator('[data-count]')).toHaveText(`${n + 1} / ${q.items.length}`);
        const it = byEn[(await page.locator('[data-en]').textContent()) || ''];
        expect(it).toBeTruthy();
        if (n === 0) {
          // Touch targets: tiles, actions, mode pills are at least 44px.
          for (const loc of [page.locator('[data-tiles] .sp-tile').first(), page.locator('[data-action=clear]'), page.locator('[data-action=check]'), page.locator('[data-set-mode=build]')]) {
            const b = await loc.boundingBox();
            expect(b && b.height).toBeGreaterThanOrEqual(44);
            expect(b && b.width).toBeGreaterThanOrEqual(44);
          }
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        }
        const used = new Set();
        for (const w of it.tiles) {
          const tiles = page.locator('[data-tiles] .sp-tile:not([disabled])');
          const cnt = await tiles.count();
          for (let k = 0; k < cnt; k++) {
            const t = tiles.nth(k);
            const key = await t.getAttribute('data-k');
            if ((await t.textContent()) === w && !used.has(key)) { used.add(key); await t.click(); break; }
          }
        }
        await page.locator('[data-action=check]').click();
        await expect(page.locator('[data-feedback]')).toHaveText('Correct!');
        await expect(page.locator('[data-reveal] .ruby-line rt').first()).toBeVisible();
        await expect(page.locator('[data-reveal] .ruby-line [class^=tone-]').first()).toBeVisible();
        await page.locator('[data-action=next]').click();
      }

      await expect(page.locator('[data-summary]')).toBeVisible();
      await expect(page.locator('[data-stat=correct] .stat-value')).toHaveText(`${q.items.length}/${q.items.length}`);
      const quiz = await page.evaluate(() => JSON.parse(localStorage.getItem('hsk.v1.quiz') || '{}'));
      expect(quiz['sentences/lesson-1']).toMatchObject({ score: q.items.length, total: q.items.length });
      expect(errors).toEqual([]);
    });

    test('meaning choice marks right and wrong answers; clear and tile removal work', async ({ page }) => {
      await page.goto('/practice/sentences?lesson=lesson-1&mode=meaning');
      await expect(page.locator('[data-line] .ruby-line rt').first()).toBeVisible();
      const choices = page.locator('[data-choices] .sp-choice');
      await expect(choices).toHaveCount(4);
      const b = await choices.first().boundingBox();
      expect(b && b.height).toBeGreaterThanOrEqual(44);
      const zh = await page.locator('[data-line] .rl-audio').getAttribute('data-say');
      const q = await (await page.request.get('/data/practice-queue?kind=sentences&lesson=lesson-1')).json();
      const it = q.items.find((i) => i.zh === (zh || '').trim());
      await page.locator('[data-choices] .sp-choice', { hasNotText: it.en }).first().click();
      await expect(page.locator('[data-feedback]')).toContainText('Not quite');
      await expect(page.locator('.sp-choice.is-ok')).toHaveText(it.en);
      await expect(page.locator('.sp-choice.is-bad')).toHaveCount(1);

      // Switch to Build on the next item: tap, un-tap, clear.
      await page.locator('[data-set-mode=build]').click();
      await page.locator('[data-action=next]').click();
      await expect(page.locator('[data-build]')).toBeVisible();
      await page.locator('[data-tiles] .sp-tile').first().click();
      await expect(page.locator('[data-answer] .sp-tile')).toHaveCount(1);
      await page.locator('[data-answer] .sp-tile').first().click();
      await expect(page.locator('[data-answer] .sp-tile')).toHaveCount(0);
      await page.locator('[data-tiles] .sp-tile').first().click();
      await page.locator('[data-action=clear]').click();
      await expect(page.locator('[data-answer] .sp-tile')).toHaveCount(0);
      await expect(page.locator('[data-action=check]')).toBeDisabled();
    });
  });
}
