# Deploy

One command from a dev machine with the `gsap` SSH host configured:

```bash
scripts/deploy.sh --dry-run          # print the plan (only read-only checks run on the server)
scripts/deploy.sh                    # deploy origin/main
scripts/deploy.sh --ref <ref>        # deploy a specific branch, tag or commit (rollback)
```

Push to `main` first; the server resets to `origin/main`, so unpushed work is not deployed. CI (`.github/workflows/ci.yml`) should be green before deploying.

## Server layout (`gsap`)

- App: `/var/www/hsk-lesson` (git checkout of `Xsothy/hsk-lesson`, branch `main`).
- Database: `database/database.sqlite` — untracked, **never overwritten** by deploys. Backups: `storage/backups/database-<timestamp>.sqlite` (newest 10 kept), taken before every migration.
- nginx site: `/etc/nginx/sites-available/hsk-8169` (listens on 8169, PHP-FPM 8.4). The script does not touch nginx; the server also hosts unrelated apps, so leave their files alone.
- Public URL: http://43.156.63.70:8169

## What the script does

1. Preflight: aborts if `.env` is missing or the SQLite file is tracked by git.
2. `git fetch --prune` + `git reset --hard <ref>`.
3. Back up the SQLite file.
4. `composer install --no-dev --optimize-autoloader`, `php artisan migrate --force`.
5. `config:cache`, `route:cache`, `view:cache`.
6. `chgrp -R www-data` and `chmod -R g+rwX` on `storage bootstrap/cache database`.
7. `sudo systemctl reload php8.4-fpm`.
8. Smoke check of `/home /courses /browse /practice /review /words /settings /char/学` on `127.0.0.1:8169`; exits non-zero on any non-200.

It prints the previous and new commit, so note the previous one before a risky deploy.

**F2 worksheets (one-off on the server):** after the deploy that adds `character_strokes`, run `php artisan hsk:import-reference` once so stroke outlines are loaded (it downloads Make Me a Hanzi `graphics.txt`, ~30 MB, into `database/sources`). Until then `/worksheet.pdf` answers 422 "No characters with stroke data".

## Rollback

```bash
scripts/deploy.sh --ref <previous-commit-or-tag>
```

Code rolls back this way. Migrations do not roll back automatically; if a bad migration ran, restore the backup on the server:

```bash
ssh gsap
cd /var/www/hsk-lesson
ls -t storage/backups | head
cp -p storage/backups/database-<stamp>.sqlite database/database.sqlite
sudo chgrp www-data database/database.sqlite && sudo chmod g+rw database/database.sqlite
```

then deploy the previous ref. (Backup restores lose data written after the backup.)

## HTTPS

HTTPS: not configured, served on IP:8169 (http://43.156.63.70:8169).

## CI

`.github/workflows/ci.yml` runs on push and PRs to `main`: `php artisan test`, `node tests/Unit/store.test.js`, and the Playwright alpha suite. Playwright needs a seeded database with reference data, so CI runs `migrate --seed` and `hsk:import-reference` (downloads open data once; `database/sources` is cached). The HTML report is uploaded as an artifact on failure.
