# hsk-lesson (汉字课堂)

HSK lesson site on Laravel (Blade + vanilla JS, SQLite). The core loop is *Learn → Write → Review*, built for a 390 px phone and a 1200 px desktop. No account is needed: progress lives in the browser's `localStorage`, and an optional account syncs it between devices. A token-protected REST API lets AI agents read and manage the content. Plans: [`docs/beta-plan.md`](docs/beta-plan.md), [`docs/merged-roadmap.md`](docs/merged-roadmap.md).

## How it fits together

- **Pages**: server-rendered Blade (`resources/views`), shared components in `resources/views/components`, CSS in `public/css` (tokens in `tokens.css`), JS in `public/js`. There is no build step. Layout breakpoint is 760 px.
- **Client state**: `public/js/store.js` wraps `localStorage` (`hsk.v1.*`: progress, SRS, saved words, lists, streak, settings, quiz and match scores). Export/import/reset live on `/settings`; `public/js/sync.js` syncs it for signed-in users.
- **Content**: lessons, readings, words and categories are in the database, seeded from `database/content/` (HSK 2.0 course, HSK 3.0 Level 1 course) and `database/legacy/content.json`. Reference data (9,565 characters from Make Me a Hanzi; 11,470 HSK words with 2.0/3.0 levels) comes from `php artisan hsk:import-reference` (open data only).

## Pages

| Page | Route | Notes |
|---|---|---|
| Home (Today) | `/` , `/home` | continue card, due count, streak, HSK path |
| Courses | `/courses` | Our courses · HSK 2.0 · HSK 3.0 · your own textbook lists |
| Lesson / Reading | `/lessons/{slug}`, `/lessons/{slug}/reading/{n}` | grammar, dialogue, readings with quiz |
| Guides | `/guides` | grammar and pronunciation guides (`resources/guides/*.md`) |
| Character | `/char/{c}` | Watch / Write (Hanzi Writer), stroke order, details, save word |
| Character parts | `/parts` | meaning and sound components |
| Dictionary & Search | `/browse`, `/search?q=` | HSK lists, by pinyin, by radical; `xue` / `xué` / `xue2` / `学` / `study` |
| Flashcards | `/review` | flip cards, swipe or tap Know / Still learning, spaced repetition (SM-2) |
| Write & dictation | `/practice` | stroke-by-stroke from a lesson, HSK level/set, saved or due words |
| Sentences · Pinyin match | `/practice/sentences`, `/practice/match` | sentence quiz, matching game |
| Worksheets | `/worksheet` | printable PDF practice sheets |
| My words | `/words` | stats, week chart, list, CSV / PDF export |
| Tools | `/tools` | pinyin converter, HSK level checker, Chinese name, zodiac |
| Settings · Account | `/settings`, `/account` | display, audio, study, data export/import/reset, sign-in and sync |

Not done yet: HSK 3.0 Level 2+ lessons, offline/PWA, i18n, full accessibility sign-off, HTTPS on a domain.

## Setup

Requires PHP 8.4 (the locked dependencies need it; Laravel Herd works, the CLI path is `~/.config/herd/bin/php84/php.exe` on Windows), Composer and Node 20+ (Node is only for tests).

```bash
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate --seed         # creates the SQLite DB and seeds the lesson content
php artisan hsk:import-reference   # 9.5k characters, stroke data, HSK 2.0/3.0 words (downloads open data to database/sources/)
php artisan serve                  # http://127.0.0.1:8000
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
npm run test:unit                 # client store unit tests
npm install && npx playwright install chromium   # once, dev tooling only (not part of the Laravel runtime)
npx playwright test               # end-to-end specs; starts `php artisan serve` on :8765
```

`playwright.config.js` starts the server itself (override with `PHP_BIN=<php 8.4>` and `E2E_PORT=<port>`). The specs are `tests/e2e/alpha-*.spec.js`.

**Content rule:** only our lessons, official HSK lists and open datasets (Make Me a Hanzi, CC-CEDICT, Unihan, Tatoeba). Never copy content from the reference sites audited in `docs/`, and never bundle publisher textbook word lists. `tests/Feature/ContentRulesTest.php` fails if the repo (outside `docs/`) names them.
