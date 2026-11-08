// @ts-check
// S2 · Cross-device sync: two browser contexts (two "devices") on one account converge.
const { test, expect } = require('@playwright/test');

const store = (page, fn, arg) => page.evaluate(([f, a]) => new Function('S', 'a', 'return (' + f + ')(S, a)')(window.HSK_STORE, a), [fn.toString(), arg]);
const syncNow = (page) => page.evaluate(() => window.HSK_SYNC.now());

async function register(page, email) {
  await page.goto('/register');
  await page.getByLabel('Name').fill('Sync Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('sync-password');
  await page.getByLabel('Confirm password').fill('sync-password');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/account$/);
}
async function signIn(page, email) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('sync-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/account$/);
}

test('two devices on one account converge; sign-out keeps local data', async ({ browser }) => {
  const email = `sync-${Date.now()}@example.com`;
  const phone = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const desk = await (await browser.newContext({ viewport: { width: 1200, height: 900 } })).newPage();

  // Each device has offline progress before signing in (plus a corrupt key that must not break anything).
  await phone.goto('/settings');
  await store(phone, (S) => { S.saveWord('学习'); S.markKnown('你好'); S.setSettings({ theme: 'dark' }); localStorage.setItem('hsk.v1.quiz', '{bad'); });
  await desk.goto('/settings');
  await store(desk, (S) => { S.saveWord('朋友'); S.srsRate('我', 3); S.setSettings({ dailyGoal: 30 }); });

  // Guests never call /sync.
  await expect(phone.locator('#st-signin')).toBeVisible();
  expect(await phone.evaluate(() => typeof window.HSK_SYNC)).toBe('undefined');

  await register(phone, email);                       // first sign-in: phone's data goes up
  await expect.poll(() => phone.evaluate(() => window.HSK_SYNC && window.HSK_SYNC.status().state)).toBe('synced');

  await signIn(desk, email);                          // second device: merge both ways
  await expect.poll(() => desk.evaluate(() => window.HSK_SYNC && window.HSK_SYNC.status().state)).toBe('synced');
  await desk.goto('/settings');
  await expect(desk.locator('#st-sync-status')).toHaveText(/Synced/);
  expect((await store(desk, (S) => S.getSaved())).sort()).toEqual(['学习', '朋友'].sort());
  expect(await store(desk, (S) => S.isKnown('你好'))).toBe(true);
  expect(await store(desk, (S) => S.getSettings().theme)).toBe('dark');
  await expect(desk.locator('html')).toHaveAttribute('data-theme', 'dark');

  // Phone picks up the desktop's data when it syncs again (on focus / reload).
  await phone.goto('/settings');
  await expect(phone.locator('#st-sync-status')).toHaveText(/Synced/);
  expect((await store(phone, (S) => S.getSaved())).sort()).toEqual(['学习', '朋友'].sort());
  expect(await store(phone, (S) => S.srsGet('我') && S.srsGet('我').reps)).toBe(1);
  expect(await store(phone, (S) => S.getSettings().dailyGoal)).toBe(30);

  // A change on one device reaches the other: debounced push, then pull on focus.
  const before = await desk.evaluate(() => window.HSK_SYNC.status().at);
  await store(desk, (S) => { S.unsaveWord('学习'); S.markWritten('好'); });
  await expect.poll(() => desk.evaluate((t) => { const s = window.HSK_SYNC.status(); return s.state === 'synced' && s.at > t; }, before), { timeout: 10_000 }).toBe(true);
  await phone.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect.poll(() => store(phone, (S) => S.getSaved()), { timeout: 10_000 }).toEqual(['朋友']);
  expect(await store(phone, (S) => S.getProgress().chars['好'].written)).toBe(1);

  // Concurrent edits on both devices both survive.
  await store(phone, (S) => S.saveWord('老师'));
  await store(desk, (S) => S.saveWord('学生'));
  await Promise.all([syncNow(phone), syncNow(desk)]);
  await syncNow(phone); await syncNow(desk);
  const a = (await store(phone, (S) => S.getSaved())).sort(), b = (await store(desk, (S) => S.getSaved())).sort();
  expect(a).toEqual(['学生', '朋友', '老师'].sort());
  expect(b).toEqual(a);

  // /sync rejects pushes without a CSRF token.
  const res = await desk.request.post('/sync', { data: { rev: 0, state: { v: 1, data: {} } }, headers: { Accept: 'application/json' } });
  expect(res.status()).toBe(419);

  // Signing out keeps this device's data and stops syncing.
  await phone.goto('/account');
  await phone.getByRole('button', { name: 'Sign out' }).click();
  await phone.goto('/settings');
  expect(await phone.evaluate(() => typeof window.HSK_SYNC)).toBe('undefined');
  expect((await store(phone, (S) => S.getSaved())).sort()).toEqual(['学生', '朋友', '老师'].sort());
  await expect(phone.locator('#st-signin')).toBeVisible();

  await phone.context().close(); await desk.context().close();
});
