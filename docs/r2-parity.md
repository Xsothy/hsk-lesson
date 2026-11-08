# R2 · Legacy parity checklist

Old static site (`public/index.html`, `lesson.html`, `char.html`, `export-lessons.html`) vs. the Blade pages.

| Legacy feature | Blade equivalent | Status |
|---|---|---|
| Lesson list with emoji, grammar badge, word count | Home "Your course" + `/courses` lesson cards | ✅ existing |
| Dictionary tab: search + filters | `/browse` (HSK lists, search) and `/search` | ✅ existing |
| Settings modal: pinyin on/off, position, char size | `/settings` (live via `apply-settings.js`, R1) | ✅ existing |
| Settings: TTS rate, voice, test voice | `/settings` (rate + voice select) | ✅ existing |
| Lesson vocabulary list | Lesson page vocabulary tiles → `/char/{c}` | ✅ existing |
| Word modal: character breakdown, stroke order, examples | `/char/{c}` page (strokes, words, lesson examples, related) | ✅ existing (C1) |
| Word modal: audio button | Tile/char page audio, bubble 🔊 | ✅ existing |
| Word modal: external dictionary link (MDBG) | Link in the character page breadcrumb row | ➕ ported |
| Grammar patterns | Lesson page Grammar section | ✅ existing |
| Example sentences + dialogue with interlinear pinyin | `x-ruby-line` in bubbles (R1) | ✅ existing |
| Tap-to-reveal English (blur) | English line always visible; reading page has English toggle | ➖ intentionally dropped (toggle on reading page) |
| Reading practice list | Lesson Reading section → `/lessons/{slug}/reading/{n}` | ✅ existing |
| Reading quiz + score | Reading page quiz, "Last score: x/y" via `store.js` (legacy quiz UI was commented out) | ✅ existing, improved |
| Lesson notes (`lesson.content` HTML) | "Lesson notes" section on lesson page | ➕ ported |
| "HSK 2 preview" badge | Chip next to the lesson title | ➕ ported |
| "Finish Lesson" + confetti | "Mark all known" button (progress stored in `store.js`) | ➖ replaced (confetti not carried over) |
| Export lessons JSON page | Redirects to `/courses`; data stays available via the token API `/api/v1/lessons` | ➖ retired |

## URL redirects (301)

- `/index.html` → `/`
- `/lesson.html?slug=lesson-1` or `?lesson=1` → `/lessons/lesson-1` (no/invalid slug → `/courses`)
- `/char.html?c=学` → `/char/学` (no `c` → `/browse`)
- `/export-lessons.html` → `/courses`
- `/` serves Home (`LearnController@home`).

## Removed

- `public/{index,lesson,char,export-lessons}.html`, `public/includes/modal-templates.html`
- `LegacyDataController` and its `/data/lessons*.js`, `/data/dictionary.js`, `/data/vocabulary.js`, `/data/readings.js`, `/js/word-map.js` routes
- Legacy-only JS: `api, app, char-page, export-lessons, lesson, modal, render, template-loader, utils, settings.js`; CSS `style.css`, `char.css`
- Legacy Playwright specs that targeted the static pages on :8080 (not part of the default run).
