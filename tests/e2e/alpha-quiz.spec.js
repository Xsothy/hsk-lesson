// @ts-check
// Lesson quiz (beta): play a whole session at phone and desktop width, answering from the DOM's own data,
// skip listening, write a character with real strokes, and check what is saved.
const { test, expect } = require('@playwright/test');
const { writeCharacter } = require('./helpers/hanzi');

const ls = (page, k) => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || 'null'), k);

for (const vp of [{ width: 390, height: 844 }, { width: 1200, height: 900 }]) {
  test.describe(`lesson quiz @ ${vp.width}px`, () => {
    test.use({ viewport: vp });

    test('play a session: choose, match, build, skip listening, write; results are saved', async ({ page }) => {
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      // No microphone in CI: leave speaking out, as a browser without speech recognition would.
      await page.addInitScript(() => { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; });

      await page.goto('/lessons/lesson-1');
      await page.locator('a[href$="/lessons/lesson-1/quiz"]').click();
      await expect(page.locator('#qz-note')).toContainText('writing');
      await expect(page.locator('#qz-note')).toContainText('left out: speaking');
      await page.click('#qz-go');
      await expect(page.locator('#qz-play')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

      const seen = new Set();
      let missedOnce = false;
      for (let n = 0; n < 40 && (await page.locator('#qz-done').isHidden()); n++) {
        const type = await page.locator('.qz-q').getAttribute('data-type');
        seen.add(type);
        if (type === 'listen') { // "Can't listen now" drops listening without costing a heart
          await page.click('[data-skip="listen"]');
          await expect(page.locator('#qz-hearts-n')).toHaveText(missedOnce ? '4' : '5');
          continue;
        }
        if (type === 'match') {
          for (const z of await page.locator('.qz-pair[data-side="zh"]').all()) {
            await z.click();
            await page.locator(`.qz-pair[data-side="en"][data-pair="${await z.getAttribute('data-pair')}"]`).click();
          }
        } else if (type === 'build') {
          const target = await page.evaluate(() => JSON.parse(document.getElementById('qz-data').textContent).sentences);
          const en = await page.locator('.qz-prompt .qz-en').textContent();
          for (const t of target.find((s) => s.en === en).tiles) await page.locator(`.qz-bank .qz-tile[data-word="${t}"]:not(.is-used)`).first().click();
          await page.click('#qz-check');
        } else if (type === 'write') {
          const ch = await page.locator('.qz-grid').getAttribute('data-char');
          await expect(page.locator('.qz-grid svg')).toBeVisible();
          await page.waitForTimeout(400);
          expect(await writeCharacter(page, page.locator('.qz-grid'), ch)).toBeGreaterThan(0);
        } else if (!missedOnce && type === 'meaning') { // one deliberate mistake: costs a heart and comes back
          missedOnce = true;
          await page.locator('.qz-choice:not([data-right])').first().click();
          await page.click('#qz-check');
          await expect(page.locator('#qz-foot')).toHaveClass(/is-no/);
          await expect(page.locator('#qz-hearts-n')).toHaveText('4');
        } else {
          await page.locator('.qz-choice[data-right]').click();
          await page.click('#qz-check');
        }
        await expect(page.locator('#qz-check')).toHaveText('Continue', { timeout: 15_000 });
        await page.click('#qz-check');
      }

      await expect(page.locator('#qz-done')).toBeVisible();
      await expect(page.locator('#qz-done-eyebrow')).toHaveText('Quiz complete');
      await expect(page.locator('#qz-missed')).toContainText('Words to review');
      for (const t of ['meaning', 'hanzi', 'match', 'build', 'write']) expect(seen.has(t), `question type ${t}`).toBe(true);
      expect(seen.has('speak')).toBe(false);

      const quiz = await ls(page, 'hsk.v1.quiz');
      expect(quiz['quiz/lesson-1'].total).toBeGreaterThanOrEqual(8);
      expect(quiz['quiz/lesson-1'].score).toBe(quiz['quiz/lesson-1'].total - 1); // the one deliberate mistake
      expect(Object.keys((await ls(page, 'hsk.v1.srs')) || {}).length).toBe(1);   // the missed word is now a due flashcard
      expect(errors).toEqual([]);
    });
  });
}

test('speaking is scored by sound, with retry', async ({ page }) => {
  // A stand-in recogniser: first hears something else, then sound-alike characters for the sentence.
  await page.addInitScript(() => {
    window.__heard = [];
    window.SpeechRecognition = window.webkitSpeechRecognition = class {
      start() { setTimeout(() => { this.onresult({ results: [[{ transcript: window.__heard.shift() || '' }]] }); this.onend(); }, 50); }
      stop() {} abort() {}
    };
  });
  await page.goto('/lessons/lesson-1/quiz');
  await page.uncheck('#qz-o-hearts');
  await page.click('#qz-go');
  for (let n = 0; n < 30; n++) {
    const type = await page.locator('.qz-q').getAttribute('data-type');
    if (type === 'speak') break;
    if (type === 'match') {
      for (const z of await page.locator('.qz-pair[data-side="zh"]').all()) { await z.click(); await page.locator(`.qz-pair[data-side="en"][data-pair="${await z.getAttribute('data-pair')}"]`).click(); }
    } else if (type === 'listen' || type === 'write') { await page.click('.qz-skip'); continue; }
    else if (type === 'build') { await page.locator('.qz-bank .qz-tile').first().click(); await page.click('#qz-check'); }
    else { await page.locator('.qz-choice[data-right]').click(); await page.click('#qz-check'); }
    await page.click('#qz-check');
  }
  await expect(page.locator('.qz-q')).toHaveAttribute('data-type', 'speak');
  const target = await page.locator('.qz-prompt .zh').textContent();
  const alike = { 你: '尼', 好: '郝', 我: '窝', 是: '事', 叫: '教', 谢: '写', 生: '声', 学: '穴', 老: '姥', 师: '诗', 吗: '妈', 没: '梅', 关: '官', 系: '西', 华: '花', 李: '里' };
  await page.evaluate(([t, a]) => { window.__heard = ['天气很热', Array.from(t).map((c) => a[c] || c).join('')]; }, [target, alike]);

  await page.click('.qz-mic');
  await expect(page.locator('.qz-status')).toContainText('try again');
  await expect(page.locator('.qz-score')).toHaveClass(/is-bad/);
  await page.click('.qz-mic');
  await expect(page.locator('#qz-foot')).toHaveClass(/is-ok/);
  await expect(page.locator('#qz-fb-text')).toContainText('sounds 100% right');
  // every character with a known reading turns green, in its own position
  const scorable = await page.evaluate((t) => JSON.parse(document.getElementById('qz-data').textContent).sentences.find((s) => s.tiles.join('') === t).sounds.filter((r) => r.length).length, target);
  await expect(page.locator('.qz-syl.is-2')).toHaveCount(scorable);
  await expect(page.locator('.qz-syl.is-0, .qz-syl.is-1')).toHaveCount(0);
});
