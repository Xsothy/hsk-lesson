// @ts-check
// Alpha QA config. Starts `php artisan serve` on a free port (override PHP_BIN / E2E_PORT if needed).
// PHP lookup: PHP_BIN, else Herd's php84 (Windows dev), else `php` on PATH (Linux CI).
const { defineConfig } = require('@playwright/test');
const fs = require('fs');
const os = require('os');
const path = require('path');

const port = Number(process.env.E2E_PORT || 8765);
const herdPhp = path.join(os.homedir(), '.config', 'herd', 'bin', 'php84', 'php.exe');
const php = process.env.PHP_BIN || (fs.existsSync(herdPhp) ? herdPhp : 'php');

module.exports = defineConfig({
  // Only the alpha specs run by default; the older legacy-page specs expect a static server on :8080.
  testDir: './tests/e2e',
  testMatch: /alpha-.*\.spec\.js/,
  timeout: 90_000,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `"${php}" artisan serve --host=127.0.0.1 --port=${port}`,
    url: `http://127.0.0.1:${port}/home`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { PHP_CLI_SERVER_WORKERS: '4' },
  },
});
