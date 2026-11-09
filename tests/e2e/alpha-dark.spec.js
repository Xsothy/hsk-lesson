// @ts-check
// F8 dark theme: every route in dark (data-theme=dark and system+prefers-color-scheme) keeps text >= 4.5:1.
// Screenshots land in test-results/dark-audit/ for the manual audit.
const { test, expect } = require('@playwright/test');
const fs = require('fs');

const VIEWPORTS = [{ name: 'phone', width: 390, height: 844 }, { name: 'desktop', width: 1200, height: 900 }];

async function lessonSlug(request) {
  const html = await (await request.get('/courses')).text();
  const m = html.match(/href="[^"]*\/lessons\/([A-Za-z0-9_-]+)"/);
  if (!m) throw new Error('No lesson link found on /courses');
  return m[1];
}

function routes(slug) {
  return ['/home', '/courses', `/lessons/${slug}`, `/lessons/${slug}/reading/1`, '/char/' + encodeURIComponent('学'),
    '/browse', '/search?q=' + encodeURIComponent('学'), '/practice', '/practice/sentences', '/review', '/words',
    '/settings', '/tools', '/tools/pinyin', '/tools/hsk-check', '/tools/name', '/tools/zodiac', '/worksheet', '/login', '/register', '/practice/match', '/guides', '/guides/de-particles'];
}

const { auditContrast } = require('./contrast');

for (const vp of VIEWPORTS) {
  for (const mode of ['dark', 'system']) {
    test.describe(`dark ${mode} @ ${vp.width}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height }, colorScheme: 'dark' });

      test('text contrast >= 4.5:1 on every route', async ({ page, request }) => {
        const slug = await lessonSlug(request);
        await page.addInitScript((m) => { try { localStorage.setItem('hsk.v1.settings', JSON.stringify({ theme: m })); } catch (e) {} }, mode);
        fs.mkdirSync('test-results/dark-audit', { recursive: true });
        const problems = [];
        for (const url of routes(slug)) {
          const resp = await page.goto(url, { waitUntil: 'load' });
          if (!resp || resp.status() >= 400) continue; // routes owned by sibling tickets may not exist yet
          await page.waitForTimeout(400);
          expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), url).not.toBe('rgb(251, 249, 245)');
          const bad = await page.evaluate(auditContrast);
          bad.forEach((b) => problems.push(`${url}: ${b}`));
          if (mode === 'dark') await page.screenshot({ path: `test-results/dark-audit/${vp.name}${url.replace(/[^a-z0-9]+/gi, '_')}.png`, fullPage: true });
        }
        expect(problems).toEqual([]);
      });
    });
  }
}
