// @ts-check
// S1 accounts: magic link sign-in → sign-out → sign-in again → delete, reading the link from the `log` mailer.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const LOG = path.join(__dirname, '..', '..', 'storage', 'logs', 'laravel.log');
const readLog = () => (fs.existsSync(LOG) ? fs.readFileSync(LOG, 'utf8') : '');

async function requestLink(page, email) {
  const before = readLog().length;
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  let link = null;
  await expect.poll(() => {
    const chunk = readLog().slice(before);
    const m = chunk.match(/https?:\/\/\S+\/login\/verify\/[^\s"<]+/);
    link = m && m[0].replace(/=\r?\n/g, '').replace(/=3D/g, '=');
    return !!link;
  }).toBe(true);
  return /** @type {string} */ (link);
}

async function openLink(page, link) {
  const u = new URL(link);
  await page.goto(u.pathname + u.search);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/account$/);
}

for (const width of [390, 1200]) {
  test(`magic link sign-in, sign-out, sign-in again, delete @${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const email = `e2e-${width}-${Date.now()}@example.com`;

    await page.goto('/settings');
    await page.getByRole('link', { name: 'Sign in to sync' }).click();
    await expect(page).toHaveURL(/\/login$/);

    await openLink(page, await requestLink(page, email));
    await expect(page.locator('#au-user-email')).toHaveText(email);
    await expect(page.getByText('Sync coming soon')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Account (signed in)' })).toBeVisible();
    const noHScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(noHScroll).toBe(true);

    await page.goto('/settings');
    await expect(page.locator('#st-account')).toContainText('Sync coming soon');

    await page.goto('/account');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('You are signed out')).toBeVisible();

    const link = await requestLink(page, email);
    await openLink(page, link);
    await expect(page.locator('#au-user-email')).toHaveText(email);

    // The used link can't be replayed.
    await page.getByRole('button', { name: 'Sign out' }).click();
    const u = new URL(link);
    await page.goto(u.pathname + u.search);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('invalid, expired or already used')).toBeVisible();

    // Delete account.
    await openLink(page, await requestLink(page, email));
    await page.getByRole('button', { name: 'Delete account…' }).click();
    await page.locator('#au-confirm-email').fill(email);
    await page.locator('#au-del-dlg').getByRole('button', { name: 'Delete account' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Your account has been deleted')).toBeVisible();
    await page.goto('/account');
    await expect(page).toHaveURL(/\/login$/);
  });
}
