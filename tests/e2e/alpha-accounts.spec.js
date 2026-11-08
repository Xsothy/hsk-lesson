// @ts-check
// S1 accounts: register → sign out → sign in (remember me) → change password → delete, at phone and desktop widths.
const { test, expect } = require('@playwright/test');

async function noHScroll(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

async function signIn(page, email, password) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

for (const width of [390, 1200]) {
  test(`register, sign out, sign in, change password, delete @${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 900 });
    const email = `e2e-${width}-${Date.now()}@example.com`;

    await page.goto('/settings');
    await page.getByRole('link', { name: 'Sign in to sync' }).click();
    await expect(page).toHaveURL(/\/login$/);
    const tg = page.locator('#au-forgot a');
    await expect(tg).toHaveAttribute('href', 'https://t.me/sothy_l');
    await expect(tg).toHaveAttribute('target', '_blank');
    await noHScroll(page);

    await page.getByRole('link', { name: 'Create one' }).click();
    await page.getByLabel('Name').fill('E2E Learner');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('first-password');
    await page.getByLabel('Confirm password').fill('first-password');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.locator('#au-user-email')).toHaveText(email);
    await expect(page.locator('.au-dl')).toContainText('Sync on');
    await expect(page.getByRole('link', { name: 'Account (signed in)' })).toBeVisible();
    await noHScroll(page);

    await page.goto('/settings');
    await expect(page.locator('#st-sync-status')).toHaveText(/Synced/);

    await page.goto('/account');
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByText('You are signed out')).toBeVisible();

    await signIn(page, email, 'wrong-password');
    await expect(page.getByText('don’t match an account')).toBeVisible();
    await signIn(page, email, 'first-password');
    await expect(page).toHaveURL(/\/account$/);
    const cookies = await context.cookies();
    expect(cookies.some((c) => c.name.startsWith('remember_web_'))).toBe(true);

    await page.getByLabel('Current password').fill('first-password');
    await page.getByLabel('New password', { exact: true }).fill('second-password');
    await page.getByLabel('Confirm new password').fill('second-password');
    await page.getByRole('button', { name: 'Change password' }).click();
    await expect(page.getByText('Password changed')).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await signIn(page, email, 'second-password');
    await expect(page).toHaveURL(/\/account$/);

    await page.getByRole('button', { name: 'Delete account…' }).click();
    await page.locator('#au-del-pw').fill('second-password');
    await page.locator('#au-del-dlg').getByRole('button', { name: 'Delete account' }).click();
    await expect(page.getByText('Your account has been deleted')).toBeVisible();
    await signIn(page, email, 'second-password');
    await expect(page.getByText('don’t match an account')).toBeVisible();
  });
}
