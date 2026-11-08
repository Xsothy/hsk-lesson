# hsk-lesson

HSK lesson site on Laravel 12. Lesson content is stored in a database. A token-protected REST API lets AI agents read and manage it.

## How it fits together

- **Frontend**: the original framework-free pages are in `public/` (`index.html`, `lesson.html`, `js/`, `css/`) and are unchanged.
- **Content**: categories, words, lessons and readings are stored in the database (SQLite by default).
- **Data scripts**: the scripts the frontend loads (`/data/lessons.js`, `/data/lessons/{slug}.js`, `/data/dictionary.js`, `/data/vocabulary.js`, `/data/readings.js`, `/js/word-map.js`) are now built from the database by `App\Http\Controllers\LegacyDataController`. Edits made through the API show up on the site right away.
- **Original files**: the old `data/*.js` files are kept in `database/legacy/data/`. `database/legacy/content.json` holds the converted content that the seeder imports.

## Setup

```bash
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate --seed      # imports database/legacy/content.json
php artisan hsk:import-reference  # 9.5k characters + HSK 2.0/3.0 words (downloads open data to database/sources/)
php artisan serve               # http://localhost:8000
```

With Laravel Herd, just link the folder. The web root is `public/`.

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
php artisan test           # API + data-script feature tests
npx playwright test        # legacy browser specs in tests/e2e (may need path updates)
```
