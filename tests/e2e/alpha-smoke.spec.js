// @ts-check
// Alpha QA smoke: every alpha route at phone + desktop width.
// Run: npx playwright test   (config starts `php artisan serve`)
const { test, expect } = require('@playwright/test');

const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1200, height: 900 },
];

// Third-party hosts we tolerate failing (offline CI): fonts only.
const IGNORED_HOSTS = /fonts\.(googleapis|gstatic)\.com/;

/** Pull a real lesson slug from the Courses page so the spec follows the DB. */
async function lessonSlug(request) {
  const html = await (await request.get('/courses')).text();
  const m = html.match(/href="[^"]*\/lessons\/([A-Za-z0-9_-]+)"/);
  if (!m) throw new Error('No lesson link found on /courses');
  return m[1];
}

function routes(slug) {
  return [
    '/home', '/courses', `/lessons/${slug}`, `/lessons/${slug}/reading/1`,
    '/char/' + encodeURIComponent('学'), '/browse', '/browse?q=xue2',
    '/search?q=' + encodeURIComponent('学'), '/practice', '/review', '/words', '/settings',
  ];
}

/** Interactive elements smaller than 44 px (either side) that are visible. Inline prose links are exempt. */
function smallTargets() {
  const sel = 'a[href], button, input:not([type=hidden]), select, textarea, [role=tab], [role=button], summary';
  const out = [];
  for (const el of document.querySelectorAll(sel)) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (r.width === 0 || r.height === 0 || cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (el.closest('[hidden], [aria-hidden=true]')) continue;
    // Skip screen-reader-only / visually hidden skip links.
    if (r.right < 0 || r.bottom < 0) continue;
    // Inline link inside running text: exempt (WCAG 2.5.8 inline exception).
    if (el.tagName === 'A' && cs.display === 'inline' && el.closest('p, li, dd, td')) continue;
    // Clickable words inside an interlinear ruby sentence: same inline exception.
    if (el.classList.contains('rl-word')) continue;
    if (r.width < 43.5 || r.height < 43.5) {
      out.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${(el.className || '').toString().split(' ')[0]} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
  }
  return out;
}

for (const vp of VIEWPORTS) {
  test.describe(`alpha smoke @ ${vp.width}x${vp.height}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });

    test('every alpha route is healthy', async ({ page, request }) => {
      const slug = await lessonSlug(request);
      const problems = [];
      const touch = {};

      const errors = [];
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
      const failed = [];
      page.on('requestfailed', (r) => { if (!IGNORED_HOSTS.test(r.url()) && r.failure()?.errorText !== 'net::ERR_ABORTED') failed.push(`${r.url()} ${r.failure()?.errorText}`); });
      page.on('response', (r) => { if (r.status() >= 400 && !IGNORED_HOSTS.test(r.url())) failed.push(`${r.status()} ${r.url()}`); });

      for (const url of routes(slug)) {
        errors.length = 0; failed.length = 0;
        const res = await page.goto(url, { waitUntil: 'networkidle' });
        if (res.status() !== 200) problems.push(`${url}: HTTP ${res.status()}`);
        await page.waitForTimeout(300);

        const m = await page.evaluate(() => ({
          sw: document.documentElement.scrollWidth, iw: window.innerWidth,
          hdr: !!document.querySelector('header.hdr') && getComputedStyle(document.querySelector('header.hdr')).display !== 'none',
          tab: !!document.querySelector('nav.tabbar') && getComputedStyle(document.querySelector('nav.tabbar')).display !== 'none',
          h1: document.querySelectorAll('h1').length,
        }));
        if (m.sw > m.iw) problems.push(`${url}: horizontal scroll (${m.sw} > ${m.iw})`);
        // Design canvas: the header (menus on a second row below 761px) is the only nav; the tab bar is hidden at every width.
        if (!m.hdr) problems.push(`${url}: header not visible`);
        if (m.tab) problems.push(`${url}: tab bar visible (canvas hides it)`);
        if (errors.length) problems.push(`${url}: console/page errors: ${errors.join(' | ')}`);
        if (failed.length) problems.push(`${url}: failed requests: ${failed.join(' | ')}`);

        if (vp.width <= 760) {
          const small = await page.evaluate(smallTargets);
          if (small.length) touch[url] = small;
        }
      }

      if (Object.keys(touch).length) {
        test.info().annotations.push({ type: 'touch-targets', description: JSON.stringify(touch, null, 1) });
        console.log('TOUCH TARGET OFFENDERS\n' + JSON.stringify(touch, null, 1));
        for (const [u, l] of Object.entries(touch)) problems.push(`${u}: ${l.length} touch target(s) < 44px: ${l.slice(0, 6).join('; ')}`);
      }
      expect(problems, problems.join('\n')).toEqual([]);
    });
  });
}

test.describe('header menus (desktop)', () => {
  test.use({ viewport: { width: 1200, height: 900 } });

  test('open with Enter/Space, close with Esc', async ({ page }) => {
    await page.goto('/home');
    const btns = page.locator('header.hdr .menu-btn');
    expect(await btns.count()).toBe(4);
    for (let i = 0; i < 4; i++) {
      for (const key of ['Enter', 'Space']) {
        const b = btns.nth(i);
        await b.focus();
        await page.keyboard.press(key);
        await expect(b).toHaveAttribute('aria-expanded', 'true');
        await expect(page.locator('header.hdr .menu').nth(i).locator('.menu-list a').first()).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(b).toHaveAttribute('aria-expanded', 'false');
        await expect(page.locator('header.hdr .menu').nth(i).locator('.menu-list a').first()).toBeHidden();
      }
    }
  });
});

test.describe('interaction sweep (phone)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('reading quiz, toggles, dark theme, browse filters and view toggle raise no errors', async ({ page }) => {
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error' && !IGNORED_HOSTS.test(m.text())) errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));

    // Reading: answer every question correctly, expect full score recorded in the store.
    await page.goto('/lessons/lesson-1/reading/1', { waitUntil: 'networkidle' });
    await page.click('#tg-pinyin');
    await expect(page.locator('#tg-pinyin')).toHaveAttribute('aria-pressed', 'false');
    await page.click('#tg-en');
    const qs = page.locator('#quiz .question');
    const n = await qs.count();
    for (let i = 0; i < n; i++) {
      const q = qs.nth(i);
      const ans = await q.getAttribute('data-answer');
      await q.locator(`.quiz-option[data-i="${ans}"]`).click();
    }
    const quiz = await page.evaluate(() => JSON.parse(localStorage.getItem('hsk.v1.quiz') || '{}'));
    expect(quiz['lesson-1/1']).toMatchObject({ score: n, total: n });

    // Settings: dark theme applies live and survives a reload.
    await page.goto('/settings/appearance', { waitUntil: 'networkidle' });
    await page.locator('.ap-mode-btn', { hasText: 'Dark' }).click();
    await expect.poll(() => page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('dark');
    await page.reload();
    expect(await page.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('dark');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.locator('.ap-mode-btn', { hasText: 'Light' }).click();

    // Browse: filters and List/Grid.
    await page.goto('/browse?version=2&level=1', { waitUntil: 'networkidle' });
    for (const f of ['learn', 'known', 'all']) await page.click(`[data-filter="${f}"]`);
    await page.click('[data-view="grid"]');
    await page.click('[data-view="list"]');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    expect(errors).toEqual([]);
  });
});
