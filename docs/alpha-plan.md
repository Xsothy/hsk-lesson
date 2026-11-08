# 汉字课堂 — Alpha plan

**Audience:** agents (and people) picking up implementation work.
**Target:** **Alpha** — the core loop works end to end on a phone for internal users. Not beta (no accounts/sync, no polish pass), not GA.
**Design source of truth:** Claude Design canvas *“汉字课堂 Full App — Desktop & Mobile”* — https://claude.ai/artifact/RK1VuSPmBfvKCLkuAgHdPM (private; ask the owner for access). Pages are grouped: 1 Learn · 2 Characters & Browse · 3 Practice & Review · 4 Tools & Settings · 5 Component library.
**Background:** `docs/hanzistroke-feature-audit.md` (what we matched), `docs/merged-roadmap.md` (long-term phases).

---

## 1. What “alpha” means here

The core loop **Learn → Write → Review** works on a 390 px phone and a 1200 px desktop, with real data, no dead ends.

| In alpha | Deferred to beta | Deferred to GA |
|---|---|---|
| Home (Today), Courses (Our course · HSK 2.0 · HSK 3.0), Lesson, Reading + quiz, Character page, Browse/HSK lists, Search, Practice (Write + Dictation), Review (flashcards), My words (basic), Settings | Textbooks tab content + import UI, Worksheet PDF generator, Tools (pinyin converter, HSK checker, name, zodiac), Pinyin match game, Character parts, Guides & compare articles, Sentence practice mode, accounts + cross-device sync, dark theme polish | i18n, offline/PWA, analytics, performance budget, full a11y audit sign-off, public launch |

Progress (known words, SRS state, saved words, streak) lives in **`localStorage`** in alpha — no login.

## 2. What already exists (do not rebuild)

| Area | Where | Notes |
|---|---|---|
| Laravel 12 app, SQLite | repo root | `php artisan serve`; Herd PHP 8.4 at `~/.config/herd/bin` |
| Lesson content in DB | `lessons`, `readings`, `words`, `categories` tables; `database/seeders/LegacyContentSeeder.php` | 12 lessons, 24 readings, 398 words |
| Reference data | `characters` (9,565, Make Me a Hanzi), `hsk_words` (11,470; `hsk2_level`, `hsk3_level`) — `php artisan hsk:import-reference` | open data only |
| Agent content API | `routes/api.php`, `app/Http/Controllers/Api/*` — `GET /api/v1` manifest | Sanctum tokens: `php artisan hsk:agent-token` |
| Character API | `GET /api/v1/characters/{c}`, public `GET /data/char/{c}.json` (`CharacterService`) | lessons-that-teach-it, words, examples, related |
| Legacy frontend | `public/index.html`, `lesson.html`, `char.html`, `public/js/*` | data scripts generated from DB by `LegacyDataController`; Hanzi Writer quiz already works in `char-page.js` |
| Tests | `tests/Feature/*` (9 passing) | `php artisan test` |

## 3. Architecture decisions for alpha

1. **Blade + vanilla JS**, server-rendered, mobile-first. No SPA framework. Reuse `public/js/audio-service.js`, `utils.js` (`colorizePinyin`), `settings.js`, and Hanzi Writer (CDN, MIT).
2. **One Blade component per canvas component** (`resources/views/components/`): `app-header`, `tab-bar`, `lesson-card`, `action-row`, `stat-card`, `chip`, `char-tile`, `word-row`, `quiz-option`, `dialogue-bubble`, `writing-grid`. Pages compose these — never re-inline their markup.
3. **Design tokens** in `public/css/tokens.css` (copy values from the canvas): paper `#fbf9f5`, card `#ffffff`/`#fffefb`, ink `#0f0c08`, text-2 `#3d362e`, muted `#5c5348`, line `#ece7df`, soft `#f3efe8`, red `#b5302a`/`#8f241f`/tint `#fdf0ee`, green `#2f6b47`/`#1f4a31`/tint `#ebf4ee`, gold `#6e5112`/tint `#faf2df`, blue `#1d3f8a`/tint `#eef4fe`; tones 1–4 `#c2281f #15803d #1d4ed8 #7e22ce`. Radius 12/16/22/24, page padding 40 (desktop) / 20 (phone), section gap 44. Fonts: Outfit + Noto Serif SC.
4. **Responsive rule:** layout breakpoint at **760 px** (container or media query). Header = 4 dropdown menus (Learn · Characters · Practice · More) on desktop; phone = logo + search + settings icons and a **4-tab bottom bar** (Learn · Practice · Review · Browse). Mobile order puts the primary action first (see canvas).
5. **Client state:** one module `public/js/store.js` wrapping `localStorage` (`hsk.progress`, `hsk.srs`, `hsk.saved`, `hsk.streak`, `hsk.settings`), JSON, versioned key `hsk.v1.*`, all reads in try/catch.
6. **Data for pages** comes from Blade controllers (server side) or the existing public JSON endpoints. New read-only JSON endpoints go under `routes/web.php` `/data/...` (no token) — the token API stays for agents.
7. **Content rules:** only our lessons, official HSK lists, and open datasets (Make Me a Hanzi, Unihan, CC-CEDICT, Tatoeba). Never copy hanzistroke.com text, groupings, sentences or PDFs. Never bundle publisher textbook word lists.

## 4. Work breakdown

Tickets are sized for one agent each. **Deps** must be merged first. Every ticket: feature test(s) in `tests/Feature`, works at 390 px and 1200 px, touch targets ≥ 44 px, text contrast ≥ 4.5:1, no console errors.

**Model tags.** 🔴 **OPUS NEEDED** = design-heavy, cross-cutting or tricky logic; give it to the strongest agent. 🟢 Sonnet-OK = well-specified, mostly mechanical. Ticket headings below carry the tag.

| Tag | Tickets | Why |
|---|---|---|
| 🔴 OPUS NEEDED | **A3** Shared components | Sets the contract every page depends on; needs faithful visual parity with the canvas |
| 🔴 OPUS NEEDED | **C1** Character page | Hanzi Writer integration, Watch/Write state machine, stroke diagrams, store sync |
| 🔴 OPUS NEEDED | **C2** Browse / search | Matching `xue`/`xué`/`xue2`/`学`/`study` to one result; pinyin normalisation, ranking, pagination |
| 🔴 OPUS NEEDED | **D1** Practice session | Queue building from multiple sources, quiz lifecycle, result recording |
| 🔴 OPUS NEEDED | **D2** Review (SRS) | Scheduling correctness (SM-2/FSRS), due-count consistency with Home |
| 🟢 Sonnet-OK | A1, A2, A4, B1, B2, B3, B4, C3, D3, E1, E2 | Clear specs and mechanical porting; A2 and A4 should still be reviewed by Opus before merge since everything depends on them |

### Track A — Foundation (do first, serial)

**A1 · Commit baseline + tooling** — Deps: none
- Commit the current working tree on a branch `alpha/foundation` (Laravel conversion, reference data, char page, docs).
- Add `.claude/launch.json` (or README) entry for `php artisan serve`.
- ✅ `php artisan test` green; app boots; `/` still serves the legacy home.

**A2 · Tokens, layout, chrome** — Deps: A1
- `public/css/tokens.css`, `resources/views/layouts/app.blade.php` (fonts, tokens, header, tab bar, `@yield`).
- Blade components `app-header` (4 dropdown menus, keyboard: Enter/Space opens, Esc closes, `aria-expanded`), `tab-bar` (4 tabs, active pill, `aria-current="page"`).
- Route skeleton for every alpha page returning the layout with a placeholder.
- ✅ Every alpha route renders header + tab bar; dropdowns work by mouse and keyboard; tab bar hidden ≥ 761 px.

**A3 · Shared components** 🔴 OPUS NEEDED — Deps: A2
- Remaining Blade components from §3.2 with props matching the canvas (e.g. `<x-char-tile c p m tone dot variant large href/>`, `<x-word-row :word audio/>`, `<x-quiz-option label state/>`, `<x-writing-grid char mode grid stroke max/>`).
- A `/dev/components` page (local only) rendering each in all states, like canvas page 5.
- ✅ Visual parity with canvas page 5 at both widths.

**A4 · Client store** — Deps: A1
- `public/js/store.js` (§3.5) with `getProgress/markWritten/markKnown`, `saveWord/unsaveWord`, `srsGet/srsRate`, `streakTouch`. Unit-test with a small Node script or Playwright.
- ✅ Survives reload; corrupt/missing storage never throws.

### Track B — Learn (parallel after A3)

**B1 · Home (Today)** — Deps: A3, A4
- Continue card (last lesson + next section from store), Today rows (cards due, characters written/goal, character of the day), 4 hubs, Explore links, Your course grid (`lesson-card` with progress), HSK path (two-up on phone).
- ✅ Matches canvas `Main`; no blank states break layout when store is empty.

**B2 · Courses** — Deps: A3, A4
- Tabs Our course · HSK 2.0 · HSK 3.0 (Textbooks tab shows “coming in beta” card only).
- Levels from `hsk_words` counts; study sets = 15 words ordered by `frequency`; set rows link to Browse filtered to that set; progress from store.
- New endpoint: `GET /data/hsk/{version}/{level}/sets` (version `2`|`3`).
- ✅ Level 1 HSK 2.0 shows 150 words / 10 sets; HSK 3.0 levels 7–9 grouped.

**B3 · Lesson** — Deps: A3
- Port `lesson.html` to Blade with the canvas layout: section nav (desktop) / pinned chips (phone), vocab `char-tile` grid with status dots, grammar, dialogue bubbles, reading card, practice panel (`action-row` dark) linking to Practice/Review filtered to the lesson.
- Keep the legacy word modal’s “Open 你 — strokes…” link behaviour (now → Character page).
- ✅ All 12 lessons render from DB; practice links carry `?lesson=slug`.

**B4 · Reading + quiz** — Deps: A3, A4
- Pinyin/English toggles, line audio, quiz with `quiz-option` states and feedback; record score in store.
- ✅ All 24 readings render; answers check against `questions[].answer` (index or boolean).

### Track C — Characters (parallel after A3)

**C1 · Character page (redesign)** 🔴 OPUS NEEDED — Deps: A3, A4
- Replace `public/char.html` with Blade page at `/char/{c}` (keep `/char.html?c=` redirect).
- Sections: **01 Write** (Watch/Write pill toggle, `writing-grid` with Hanzi Writer mounted inside, round icon controls: Replay · Play/Pause · Speed | Hint · Outline · Retry), **02 Stroke order** (prev/next, progress bar, 4×2 cells, per-stroke tip), **03 Details** (taught in lessons, words with audio, examples from our lessons, facts, related).
- Reuse logic from `public/js/char-page.js` (quiz, diagrams) — move to `public/js/character.js`.
- ✅ 学 shows 8 strokes; writing all strokes completes the quiz; `markWritten` updates store.

**C2 · Browse / HSK & Dictionary** 🔴 OPUS NEEDED — Deps: A3
- Tabs HSK 2.0 · HSK 3.0 · By pinyin · By radical (pinyin = toneless syllable groups + tone filter; radical = by stroke count from `characters.radical`).
- List/Grid toggle, filters All / To learn / Known (store), Practise button.
- Uses `GET /api/v1/hsk-words` logic via a new public `/data/hsk-words?q&level&version&page`.
- ✅ Search “xue”, “xué”, “xue2”, “学”, “study” all return 学.

**C3 · Search results** — Deps: C2
- `/search?q=` grouped: characters, words, lessons/readings that contain it.
- ✅ Header search (desktop) and phone search icon both land here.

### Track D — Practice & Review (parallel after A4 + C1)

**D1 · Practice session (Write + Dictation)** 🔴 OPUS NEEDED — Deps: C1
- Sources: a lesson (`?lesson=`), an HSK level/set, saved words, due cards. Queue = unique characters.
- Write mode: outline shown; Dictation: audio + English hint, `mode=blank`. Hanzi Writer `quiz({showHintAfterMisses:3})`. Icon controls Hint · Outline · Retry · Next; session progress; done chips.
- ✅ Completing a 5-character queue records results and returns a summary.

**D2 · Review (flashcards)** 🔴 OPUS NEEDED — Deps: A4
- Deck = lesson words + saved words + HSK level (choose). SRS: SM-2 or `ts-fsrs` (MIT) via CDN; ratings Again/Hard/Good/Easy with next-due label. Settings: show first Chinese/English/Audio, pinyin on front, audio on reveal, new/day.
- ✅ Rating updates due date; due count on Home matches.

**D3 · My words** — Deps: A4
- Stats (`stat-card`), week bar chart (from store activity log), groups (`chip`), list (`word-row`), actions Write/Flashcards; Export CSV (client-side). PDF export → beta.
- ✅ Saving a word on Character page shows it here.

### Track E — Settings & QA

**E1 · Settings** — Deps: A2, A4
- Display (pinyin show/position, tone colours, char size, theme light/dark/system), Audio (rate, voice via `speechSynthesis.getVoices()`), Study (HSK version, daily goal, hint after misses), Data (export/import JSON, reset with confirm). “Sign in to sync” shown disabled with “beta”.
- ✅ Settings apply live across pages.

**E2 · Alpha QA pass** — Deps: all above
- Playwright smoke: each page at 390×844 and 1200×900, no console errors, no horizontal scroll, tab/keyboard reachability of header menus and controls.
- Update `tests/e2e` paths for the Blade routes; remove dead legacy pages only after parity.
- ✅ Checklist in §6 all ticked.

## 5. Suggested parallel schedule

```
A1 → A2 → A3 ─┬─ B1, B2, B3, B4        (Learn)
              ├─ C1 → C2 → C3         (Characters)
A4 ───────────┴─ D2, D3 ; C1 → D1     (Practice & Review)
A2+A4 → E1 ; everything → E2
```
Max 3–4 agents at once; avoid two agents editing the same Blade component — component changes go through the A3 owner or a short follow-up PR.

## 6. Alpha exit checklist

- [x] Every alpha page reachable from header (desktop) and tab bar/links (phone); no dead links.
- [ ] Learn → Write → Review loop completes for Lesson 1 on a real phone. *(Automated at 390×844 in Chromium by `alpha-core-loop.spec.js`; still needs a manual pass on a physical phone — touch, speech voices, soft keyboard.)*
- [x] Progress, saved words, SRS persist across reloads.
- [x] All 12 lessons, 24 readings, HSK 2.0 levels 1–6, HSK 3.0 levels 1–9 load. *(HSK 3.0 levels 7–9 are one grouped level "7–9" in the open data; `level=8|9` alone returns an empty list.)*
- [x] `php artisan test` + Playwright smoke green. *(`npx playwright test`, see README.)*
- [x] No hanzistroke.com or publisher content in the repo (`grep` check in CI). *(`tests/Feature/ContentRulesTest.php`, runs with `php artisan test`; no CI pipeline exists yet.)*
- [x] README updated with run steps and the alpha scope.

## 7. Conventions for agents

- Branch per ticket: `alpha/<ticket-id>-<slug>`; small PRs; reference the ticket id.
- Match the canvas; if the design is ambiguous, follow the phone layout first and note the decision in the PR.
- Don’t change the agent API contract (`/api/v1`) without updating `ToolsController::manifest`.
- Keep legacy `public/*.html` working until its Blade replacement passes QA.
- Data sources and licences go in `docs/merged-roadmap.md` § Open data.
