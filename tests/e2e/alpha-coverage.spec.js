// @ts-check
// Alpha exit checklist: content coverage + dead-link crawl.
const { test, expect } = require('@playwright/test');

test('24 lessons and 48 readings load (HSK 2 course)', async ({ request }) => {
  const html = await (await request.get('/courses')).text();
  const slugs = [...new Set([...html.matchAll(/\/lessons\/([A-Za-z0-9_-]+)"/g)].map((m) => m[1]))];
  expect(slugs).toHaveLength(24);
  let readings = 0;
  for (const s of slugs) {
    expect((await request.get(`/lessons/${s}`)).status(), s).toBe(200);
    for (const n of [1, 2]) {
      const r = await request.get(`/lessons/${s}/reading/${n}`);
      expect(r.status(), `${s} reading ${n}`).toBe(200);
      readings++;
    }
  }
  expect(readings).toBe(48);
});

test('HSK 2.0 levels 1-6 and HSK 3.0 levels 1-6 + grouped 7-9 load (sets endpoint + browse page)', async ({ request }) => {
  const levels = [[2, [1, 2, 3, 4, 5, 6]], [3, [1, 2, 3, 4, 5, 6, 7]]];
  for (const [v, ls] of levels) {
    for (const l of ls) {
      const r = await request.get(`/data/hsk/${v}/${l}/sets`);
      expect(r.status(), `sets ${v}/${l}`).toBe(200);
      const j = await r.json();
      expect(j.total, `words in HSK ${v}.0 level ${l}`).toBeGreaterThan(0);
      expect((await request.get(`/browse?version=${v}&level=${l}`)).status(), `browse ${v}/${l}`).toBe(200);
      const w = await request.get(`/data/hsk-words?version=${v}&level=${l}`);
      expect(w.status(), `hsk-words ${v}/${l}`).toBe(200);
    }
  }
  // HSK 3.0 "7-9" is a single grouped level in the data (level 7).
  const g = await (await request.get('/data/hsk/3/7/sets')).json();
  expect(g.label).toBe('7–9');
  const l1 = await (await request.get('/data/hsk/2/1/sets')).json();
  expect([l1.total, l1.sets.length]).toEqual([150, 10]);
});

test('no dead internal links from header, tab bar and in-page links', async ({ page, request }) => {
  test.setTimeout(600_000);
  const seeds = ['/home', '/courses', '/courses?tab=hsk2', '/courses?tab=hsk3', '/lessons/lesson-1', '/lessons/lesson-1/reading/1',
    '/char/' + encodeURIComponent('学'), '/browse', '/browse?q=xue2', '/search?q=' + encodeURIComponent('学'),
    '/practice', '/review', '/words', '/settings'];
  const seen = new Set();
  const dead = [];
  for (const vp of [{ width: 390, height: 844 }, { width: 1200, height: 900 }]) {
    await page.setViewportSize(vp);
    for (const s of seeds) {
      await page.goto(s, { waitUntil: 'networkidle' });
      const origin = new URL(page.url()).origin;
      const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.href));
      for (const h of hrefs) {
        const u = new URL(h);
        if (u.origin !== origin || u.protocol.startsWith('javascript')) continue;
        u.hash = '';
        if (/^\/(css|js|images|assets)\//.test(u.pathname)) continue;
        const key = u.pathname + u.search;
        // /char/<x> pages are one template: sample a few instead of every character.
        const tpl = u.pathname.startsWith('/char/') ? '/char/*' : key;
        if (seen.has(key) || (tpl === '/char/*' && [...seen].filter((k) => k.startsWith('/char/')).length >= 6)) continue;
        seen.add(key);
        const r = await request.get(u.toString());
        if (r.status() >= 400) dead.push(`${r.status()} ${key} (linked from ${s})`);
      }
    }
  }
  console.log(`checked ${seen.size} unique internal links`);
  expect(dead).toEqual([]);
});
