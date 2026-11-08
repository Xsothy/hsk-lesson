# 汉字课堂 — Beta plan

**Audience:** agents (and people) picking up implementation work. Same conventions as `docs/alpha-plan.md` §3 and §7 (Blade + vanilla JS, one Blade component per canvas component, `localStorage` store, open data only, branch per ticket, tests at 390 px and 1200 px).
**Starting point:** alpha is merged on `main` and deployed at http://43.156.63.70:8169 (server `gsap`, `/var/www/hsk-lesson`, nginx site `hsk-8169`).
**Target:** **Beta**, for outside testers. Parity with the old site so it can be retired, accounts with cross-device sync, and the features deferred from alpha.

---

## 1. Scope

| In beta | Deferred to GA |
|---|---|
| Interlinear pinyin (regression fix), legacy retirement, accounts + sync, Textbooks tab + import of your own lists, worksheet PDF, Tools (pinyin converter, HSK checker, Chinese name, zodiac), pinyin match game, character parts, guides & compare articles, sentence practice mode, dark theme polish, My words PDF export, CI, deploy script, HTTPS on a domain | i18n, offline/PWA, analytics, performance budget, full a11y audit sign-off, public launch |

## 2. Regression found after alpha

The old site (`public/lesson.html`, `public/js/render.js`, hsk-lesson.vercel.app) rendered each sentence as **interlinear pinyin**: one `<ruby>` per word, pinyin aligned over its hanzi, **tone-coloured** (`HSK_UTILS.colorizePinyin`), and the word clickable for details. The alpha Blade pages (`lesson`, `reading`, `x-dialogue-bubble`) show one plain pinyin line under the sentence instead. As a result the Settings toggles "pinyin above/below" and "tone colours", which target `ruby rt` in `public/css/tokens.css`, have no effect on those pages. Ticket **R1** restores it.

## 3. Work breakdown

**Model tags.** 🔴 **OPUS NEEDED** = design-heavy, cross-cutting or tricky logic. 🟢 Sonnet-OK = well specified, mostly mechanical. Every ticket: feature tests, works at 390 px and 1200 px, touch targets ≥ 44 px, contrast ≥ 4.5:1, no console errors, the Playwright alpha suite stays green.

### Track R — Parity & ops (start first)

**R1 · Interlinear pinyin** 🔴 OPUS NEEDED — Deps: none
- New component `<x-ruby-line :tokens audio>`: one `<ruby>` per word with tone-coloured `<rt>` per syllable, punctuation unwrapped, words clickable (open the word sheet / link to `/char/{c}`). Tokens are built server-side from lesson/reading `words` arrays and the word map (`ContentService::wordMap`), reusing the old `render.js` tokenisation rules.
- Use it for lesson sentences, dialogue (`x-dialogue-bubble` gains a `tokens` prop, backward compatible) and reading lines.
- Honour settings live: pinyin show/hide, position above/below (`ruby-position`), tone colours on/off, char size.
- ✅ Lesson 1 dialogue matches the old site's alignment and colours; toggling each setting changes the page without reload; Playwright spec covers it.

**R2 · Legacy parity + retire** 🟢 Sonnet-OK — Deps: R1
- Audit `public/index.html`, `lesson.html`, `char.html` and `export-lessons.html` against the Blade pages; port anything missing (word modal details, quiz score display, etc.).
- `/` serves Home; `lesson.html?…`, `char.html?c=` and `index.html` 301 to the Blade routes; then delete the static pages and the `LegacyDataController` routes no longer used.
- ✅ No feature of the old site is lost (checklist in the PR); old URLs redirect.

**R3 · CI + deploy** 🟢 Sonnet-OK — Deps: none
- GitHub Actions: `php artisan test`, `node tests/Unit/store.test.js`, `npx playwright test`.
- `scripts/deploy.sh` (or `php artisan` command) for `gsap`: pull, `composer install --no-dev`, migrate, caches, permission fix, nginx untouched.
- HTTPS on a domain via certbot once a subdomain points at the server (**needs a domain from the owner**).
- ✅ CI green on `main`; one command deploys.

**R4 · UI polish & consistency pass** 🔴 OPUS NEEDED — Deps: R1 merged (it edits the same lesson/reading pages)
Found in a screenshot audit of the deployed alpha at 390 px and 1200 px (2026-11-08). Fix every item, then re-audit every page at both widths with screenshots in the PR.
- **Chinese display everywhere (not only sentences):** tone-coloured pinyin is missing on lesson vocab tiles (`x-char-tile`), `x-word-row` (Character page "Words with 学", My words), Character of the day and the Character page hero; Browse colours it but uses tiny text. Grammar examples (`我叫 [name]。`) show no pinyin at all; render them with `x-ruby-line`. One rule for every hanzi + pinyin pair: same component, same tone colours, settings (pinyin show/position, tone colours, char size) apply everywhere.
- **Card alignment:** Home "Today" stat cards have unequal heights (Day streak stretches to match Character of the day while Cards due / Characters written don't); give the grid equal rows or let Character of the day span two rows. Lesson vocab tiles break multi-character words across lines (对不/起, 没关/系) at both widths; tiles must size to the word (`white-space: nowrap`, font scales down for 3+ characters) and keep a consistent grid. Practice lesson chips are ragged; use an even grid. Courses tabs wrap ("Textbooks" alone on a second line) and so do Browse level chips; use one horizontally scrolling row on phones.
- **Page headers:** one header pattern on every page (eyebrow + h1 + optional subtitle); Practice uses an eyebrow, the others don't; Home shows "Today" twice (h1 and section title). Lesson and reading titles wrap awkwardly ("Teacher and / Student", English + Chinese title on one line); put the Chinese title on its own line.
- **Home consistency:** the Continue card says "Greetings & Introductions · Start here" on phone but "Lesson 1 · Next: vocab" on desktop; use one source. HSK path mixes HSK 2.0 and 3.0 tiles in one unlabelled grid with an orphan "Level 7–9" tile; split them into two labelled rows.
- **Lists:** Browse meanings truncate to one line with "…", too aggressive on phones; allow 2 lines. Character page word rows wrap the meaning into a narrow column next to the HSK badge on phones; stack the badge.
- **Icons:** tab bar and action rows mix emoji (📖 ✍️ 🔁 🔤 ⏰ ⭐) that render differently per OS; replace them with one inline SVG icon set (stroke icons, `currentColor`).
- **Loading states:** the Character page writing grid is empty for 1–2 s while Hanzi Writer loads stroke data; show the static character (ghost) or a skeleton until ready. Check the long Character page on phones for blank areas while scrolling.
- **Console noise:** `audio-service.js` logs "[audio] Service ready" on every page; remove the production logs.
- ✅ Every page at 390 px and 1200 px matches the rules above; screenshots attached; Playwright suite green.

### Track S — Accounts & sync

**S1 · Accounts** 🔴 OPUS NEEDED — Deps: none
- Sign in, sign out, delete account. **Owner decision needed:** email magic link (no passwords) vs Google sign-in vs both.
- Sessions for the web app; the agent Sanctum tokens stay separate.
- ✅ Sign-in works on phone and desktop; "Sign in to sync" in Settings is enabled.

**S2 · Cross-device sync** 🔴 OPUS NEEDED — Deps: S1
- Server tables for progress, saved words, SRS, streak and settings; `/sync` endpoints (authenticated, throttled).
- Client: `store.js` keeps working offline; on sign-in, merge local and server state (per-item last-write-wins with timestamps; SRS keeps the later review), then sync on change and on focus.
- ✅ Two browsers signed in to one account converge; signing out keeps local data; corrupt or old payloads never break the store.

### Track F — Features deferred from alpha

| Ticket | Model | Deps | Notes |
|---|---|---|---|
| **F1 · Textbooks tab + import** | 🟢 Sonnet | none | Courses tab "Textbooks": user imports their **own** word list (CSV/paste); never bundle publisher lists. Lists become Practice/Review sources. |
| **F2 · Worksheet PDF** | 🔴 Opus | none | Stroke-order practice sheets (grid type, tracing count, pinyin/English on/off) from any source; server-side PDF from Make Me a Hanzi strokes. |
| **F3 · Tools** | 🟢 Sonnet | none | Pinyin converter (numbers ↔ marks, using `App\Support\Pinyin`), HSK level checker for pasted text, Chinese name helper, zodiac. One page each under a Tools menu. |
| **F4 · Pinyin match game** | 🟢 Sonnet | R1 | Match hanzi ↔ pinyin ↔ meaning; score in the store. |
| **F5 · Character parts** | 🟢 Sonnet | none | Component breakdown from Make Me a Hanzi `decomposition` on the Character page, plus "characters sharing this part". |
| **F6 · Guides & compare articles** | 🟢 Sonnet | none | Markdown articles we write ourselves (e.g. 的/得/地, 再/又); index page. No copied text. |
| **F7 · Sentence practice** | 🔴 Opus | R1 | Build and translate sentences from lesson content; reuses the D1 session engine. |
| **F8 · Dark theme polish** | 🟢 Sonnet | R1 | Every page and component in dark mode, contrast checked. |
| **F9 · My words PDF export** | 🟢 Sonnet | F2 | Reuse the F2 PDF pipeline. |

## 4. Parallel schedule

```
Wave 1:  R1 (Opus) · S1 (Opus) · R3 (Sonnet) · F3 (Sonnet)
Wave 2:  R4 UI polish (after R1, first) · R2 (after R1) · S2 (after S1) · F2 (Opus)
         F5 moves to wave 3 to keep 4 sessions max
Wave 3:  F4, F7, F8 (after R1) · F1 · F6 · F9 (after F2)
Final:   B-QA: extend the Playwright suite to the new pages, deploy to gsap, tester checklist
```
Max 4 sessions at once. Only R1 changes shared components (`x-dialogue-bubble`, new `x-ruby-line`); other tickets use them and don't edit them. `store.js` changes are additive (S2 owns sync).

## 5. Decisions needed from the owner

1. ~~Sign-in method~~ **Decided:** standard Laravel email + password (register, login, change password, delete account). No email password reset: the login page points users to Telegram @sothy_l, and the owner resets with `php artisan hsk:reset-password {email}`.
2. ~~Domain~~ **Decided:** no HTTPS or domain for beta; stays on http://43.156.63.70:8169.
3. **Textbooks import format** (F1): CSV only, or also paste or Anki export.

## 6. Beta exit checklist

B-QA run 2026-11-09 (branch `claude/beta-qa-a2eddd`). The new `tests/e2e/alpha-beta-qa.spec.js` covers:
- all 24 beta routes at 390 and 1200 px: status 200, no JS errors, no horizontal scroll
- worksheet PDF response
- textbook paste → practice → match on the list
- old-URL redirects

The live read-only smoke ran against gsap: 34 GETs returned the expected status and type, and a throwaway account went register → sign out → sign in → delete with no page errors. Tester checklist: `docs/beta-testers.md`.

- [x] Interlinear tone-coloured pinyin on every lesson, dialogue and reading line; settings apply live (`alpha-ruby`).
- [x] R4 polish list done: consistent cards, headers, icons and Chinese display on every page at both widths. Automated checks cover no h-scroll, 44 px targets and dark contrast; a visual sign-off still needs the phone pass.
- [x] Old static pages retired; old URLs redirect with 301, locally and live.
- [x] Sign-in + sync works across two devices (`alpha-sync` uses two contexts at 390 and 1200; live account flow verified).
- [x] All Track F features shipped with tests (F1–F9 specs, plus `alpha-beta-qa`).
- [ ] CI green; one-command deploy; HTTPS on a domain. CI and deploy are done. **HTTPS stays open:** the owner deferred a domain for beta (§5.2).
- [ ] Manual pass on a physical phone (carried over from alpha). **Open.**
