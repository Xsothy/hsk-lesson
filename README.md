# hsk-lesson (汉字课堂)

HSK lesson site on Laravel 12 (Blade + vanilla JS, SQLite). **Alpha:** the core loop *Learn → Write → Review* works on a 390 px phone and a 1200 px desktop with no accounts; progress lives in the browser's `localStorage`. A token-protected REST API lets AI agents read and manage the content. Plan and exit checklist: [`docs/alpha-plan.md`](docs/alpha-plan.md).

## How it fits together

- **Pages**: server-rendered Blade (`resources/views`), shared components in `resources/views/components`, CSS in `public/css` (tokens in `tokens.css`), JS in `public/js`. Layout breakpoint is 760 px: header with dropdown menus above, 4-tab bar below.
- **Client state**: `public/js/store.js` wraps `localStorage` (`hsk.v1.progress|srs|saved|streak|settings|quiz`). Export/import/reset live on `/settings`.
- **Content**: lessons, readings, words and categories are in the database (`database/legacy/content.json` is the seed). Reference data (9,565 characters from Make Me a Hanzi; 11,470 HSK words with 2.0/3.0 levels) comes from `php artisan hsk:import-reference` (open data only).
- **Legacy pages**: `public/index.html`, `lesson.html`, `char.html`, `export-lessons.html` still exist, and `/` still serves the legacy home. Their data scripts (`/data/lessons.js` …) are generated from the DB by `LegacyDataController`.

## Alpha scope

| Page | Route | Notes |
|---|---|---|
| Home (Today) | `/home` | continue card, due count, streak, hubs, HSK path |
| Courses | `/courses` | Our course · HSK 2.0 (levels 1–6) · HSK 3.0 (levels 1–6, 7–9 grouped) · Textbooks = "coming in beta" |
| Lesson / Reading | `/lessons/{slug}`, `/lessons/{slug}/reading/{n}` | 12 lessons, 24 readings, reading quiz scores in store |
| Character | `/char/{c}` | Watch / Write (Hanzi Writer), stroke order, details, save word |
| Browse & Search | `/browse`, `/search?q=` | HSK lists, by pinyin, by radical; `xue` / `xué` / `xue2` / `学` / `study` |
| Practice | `/practice` | Write + Dictation from a lesson, HSK level/set, saved or due words |
| Review | `/review` | SM-2 flashcards, Again/Hard/Good/Easy |
| My words | `/words` | stats, week chart, list, CSV export |
| Settings | `/settings` | display, audio, study, flashcards, data export/import/reset |

Deferred to beta: Textbooks content, worksheet PDFs, tools (converter, checker, name, zodiac), pinyin match game, character parts, guides, sentence practice, accounts/sync, dark-theme polish. Deferred to GA: i18n, offline/PWA, analytics, performance budget, full a11y sign-off.

## Setup

Requires PHP 8.4 (Laravel Herd works; the CLI path is `~/.config/herd/bin/php84/php.exe` on Windows), Composer and Node 20+ (Node is only for tests).

```bash
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate --seed         # creates the SQLite DB, imports database/legacy/content.json
php artisan hsk:import-reference   # 9.5k characters + HSK 2.0/3.0 words (downloads open data to database/sources/)
php artisan serve                  # http://127.0.0.1:8000  (open /home)
```

With Laravel Herd, just link the folder; the web root is `public/`.

## Deploy

```bash
scripts/deploy.sh --dry-run   # show the plan
scripts/deploy.sh             # deploy origin/main to the `gsap` server
scripts/deploy.sh --ref <ref> # deploy/rollback to a specific ref
```

Backs up the SQLite DB, migrates, rebuilds caches, fixes permissions, reloads PHP-FPM and smoke-checks the site. Server layout, rollback and HTTPS (certbot) steps: [docs/deploy.md](docs/deploy.md). CI runs on every push/PR to `main`.

## API for AI agents

Create a token:

```bash
php artisan hsk:agent-token "my-agent"              # read + write
php artisan hsk:agent-token "my-reader" --read-only # read only
```

Call the API with `Authorization: Bearer <token>` and `Accept: application/json`.
Start with `GET /api/v1`. It returns a machine-readable list of every endpoint and the API's conventions.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/lessons` · `/lessons/{slug}?enrich=1` | List lessons / get one (`enrich=1` adds pinyin and meaning for each vocab word) |
| POST · PATCH · DELETE | `/api/v1/lessons[/{slug}]` | Create / partially update / delete a lesson |
| GET | `/api/v1/words?q=&hanzi=&category=&hsk_level=` | Search the dictionary |
| GET | `/api/v1/words/lookup/{hanzi}` | Full info for one word |
| POST | `/api/v1/words` · `/words/bulk` | Create one word / upsert many |
| PATCH · DELETE | `/api/v1/words/{id}` | Update / delete a word |
| GET · POST · PATCH · DELETE | `/api/v1/categories[/{key}]` | Word categories |
| GET · POST · PATCH · DELETE | `/api/v1/readings[/{id}]` | Reading passages and their questions |
| POST | `/api/v1/tokenize` | Split Chinese text into dictionary words |
| GET | `/api/v1/validate` | Integrity report (unknown words, token mismatches, bad answers) |
| GET | `/api/v1/export` | All content as JSON |

Conventions:

- `PATCH` changes only the fields you send. Array fields (`vocab`, `grammar`, `sentences`, `dialogue`, `lines`, `questions`) are replaced in full.
- A line looks like `{zh, en, words?}`. If you leave out `words`, the server fills it in by tokenizing `zh`.
- Run `GET /validate` after edits to catch problems.

## Tests

```bash
php artisan test                  # feature tests (incl. the content-rules grep check)
node tests/Unit/store.test.js     # client store unit test
npm install && npx playwright install chromium   # once, dev tooling only (not part of the Laravel runtime)
npx playwright test               # alpha smoke + core loop + coverage; starts `php artisan serve` on :8765
```

`playwright.config.js` starts the server itself (override with `PHP_BIN=<php 8.4>` and `E2E_PORT=<port>`). The alpha specs are `tests/e2e/alpha-*.spec.js`; the older specs in `tests/e2e` target the legacy pages and a static server on :8080 and are not part of the default run (they need `python -m http.server 8080` style hosting of `public/`).

**Content rule:** only our lessons, official HSK lists and open datasets (Make Me a Hanzi, CC-CEDICT, Unihan, Tatoeba). Never copy content from the reference sites audited in `docs/`, and never bundle publisher textbook word lists. `tests/Feature/ContentRulesTest.php` fails if the repo (outside `docs/`) names them.
