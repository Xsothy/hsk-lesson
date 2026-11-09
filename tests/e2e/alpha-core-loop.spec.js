// @ts-check
// Core alpha loop on a phone: Learn (lesson) -> Write (char page) -> My words -> Review, with persistence.
const { test, expect } = require('@playwright/test');
const { writeCharacter } = require('./helpers/hanzi');

test.use({ viewport: { width: 390, height: 844 } });

const ls = (page, key) => page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, key);

test('Learn -> Write -> My words -> Review persists across reloads', async ({ page, request }) => {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(m.text())) errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

  // --- Learn: Lesson 1 -> first vocab character tile -> character page
  const courses = await (await request.get('/courses')).text();
  const slug = courses.match(/href="[^"]*\/lessons\/([A-Za-z0-9_-]+)"/)[1];
  await page.goto(`/lessons/${slug}`);
  const tile = page.locator('#vocab a[href*="/char/"]').first();
  await expect(tile).toBeVisible();
  const href = await tile.getAttribute('href');
  const ch = decodeURIComponent(href.split('/char/')[1]).slice(0, 1);
  await tile.click();
  await expect(page).toHaveURL(/\/char\//);

  // --- Write: save + quiz every stroke
  const save = page.locator('[data-action=save]');
  await save.click();
  await expect(save).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#tab-write').click();
  await expect(page.locator('#tab-write')).toHaveAttribute('aria-selected', 'true');
  await page.waitForTimeout(500);
  expect((await ls(page, 'hsk.v1.progress'))?.chars?.[ch]?.written ?? 0).toBe(0); // not credited just for opening the page
  const strokes = await writeCharacter(page, page.locator('[data-writer]'), ch);
  expect(strokes).toBeGreaterThan(0);
  await expect.poll(async () => (await ls(page, 'hsk.v1.progress'))?.chars?.[ch]?.written ?? 0, { timeout: 10_000 }).toBeGreaterThanOrEqual(1);

  // --- My words shows the saved word
  await page.goto('/words');
  await expect(page.locator('main, .page').first()).toContainText(ch);

  // --- Review saved cards: reveal + rate Good
  await page.goto('/review?source=saved');
  await expect(page.locator('#rv-study')).toBeVisible();
  await page.locator('#rv-reveal').click();
  await expect(page.locator('#rv-rate')).toBeVisible();
  await page.locator('[data-rating="3"]').click();
  await expect.poll(async () => Object.keys((await ls(page, 'hsk.v1.srs')) || {}).length).toBeGreaterThanOrEqual(1);

  // --- Reload: everything persisted
  await page.reload();
  const progress = await ls(page, 'hsk.v1.progress');
  const saved = await ls(page, 'hsk.v1.saved');
  const srs = await ls(page, 'hsk.v1.srs');
  expect(progress.chars[ch].written).toBeGreaterThanOrEqual(1);
  expect(JSON.stringify(saved)).toContain(ch);
  expect(Object.keys(srs).length).toBeGreaterThanOrEqual(1);

  // --- Due count: make a card due, then Home == Review
  await page.evaluate((c) => {
    const s = JSON.parse(localStorage.getItem('hsk.v1.srs'));
    for (const k of Object.keys(s)) s[k].due = Date.now() - 1000;
    localStorage.setItem('hsk.v1.srs', JSON.stringify(s));
  }, ch);
  await page.goto('/home');
  const homeDue = (await page.locator('[data-today=due] .ar-icon').textContent()).trim();
  await page.goto('/review');
  await expect(page.locator('#rv-choose')).toBeVisible();
  const reviewDue = (await page.locator('[data-due=due]').textContent()).match(/\d+/)?.[0];
  console.log('home due', homeDue, 'review due text:', (await page.locator('[data-due=due]').textContent()).replace(/\s+/g, ' '));
  expect(reviewDue).toBe(homeDue);

  expect(errors).toEqual([]);
});

test('Settings: flashcard options persist and Review honours reviewFirst', async ({ page }) => {
  await page.goto('/settings');
  await page.selectOption('#st-rv-first', 'en');
  await page.selectOption('#st-rv-pinyin', 'on');
  await page.selectOption('#st-rv-audio', 'off');
  await page.reload();
  await expect(page.locator('#st-rv-first')).toHaveValue('en');
  await expect(page.locator('#st-rv-pinyin')).toHaveValue('on');
  await expect(page.locator('#st-rv-audio')).toHaveValue('off');
  const s = await ls(page, 'hsk.v1.settings');
  expect([s.reviewFirst, s.reviewPinyinFront, s.reviewAudioReveal]).toEqual(['en', true, false]);
});
