# Learn pages: canvas parity

Each PNG puts a "1 · Learn" design-canvas board (left) next to the app (right), full page, at 390 and 1200 px, light and dark: `<page>-<width>-<theme>.png`.

| Key | Canvas board | App |
|---|---|---|
| home | Main | `/home` (and `/`) |
| lesson | Lesson | `/lessons/lesson-5` |
| reading | Reading | `/lessons/lesson-5/reading/1` |
| guides / guides-tones | Guides (strokes / tones state) | `/guides`, `/guides/tones-sandhi` |
| courses / courses-hsk / courses-textbooks | Courses (each tab) | `/courses`, `?tab=hsk`, `?tab=textbooks` |

To regenerate them, serve the board `.dc.html` files and the component boards they `<dc-import>` with the local renderer (`support.js` with dc-import support, kept in the session notes), then run `node scripts/parity-learn.mjs <canvasBase> <appBase>`. The app shots use an empty store, so progress shows 0 where the canvas shows sample progress.

All colours are tokens from `tokens.css`. Shared Blade components (header, LessonCard, ActionRow, CharTile, Chip, DialogueBubble, QuizOption) are reused unchanged.

## Deliberate differences
| Page | Canvas | App | Why |
|---|---|---|---|
| All | Sample data (lesson 5 of 12, 18 cards due, 138 known…) | Real data: 24 published lessons, store-based progress, live HSK word counts | Real data over samples |
| All | Grey text `#776e63` (`--c6b6156`) | `--muted` | No token for that grey. `--muted` is the closest and is darker, so contrast is higher. |
| Home | Continue steps carry ✓ per section | Plain section list. The bar shows the share of the lesson's words you know. | The app doesn't record per-section completion. |
| Home | "Characters written · 6/10 — from Lesson 5" | "… · n/goal — today" | Writes are counted per day, not per lesson. |
| Home | Lesson tiles in 12 tints, some with no token | Cycles 8 tint tokens | Tokens only, so theme presets still apply |
| Home | Your course shows 12 lessons (HSK 1) | All lessons for the chosen HSK version (24 for 2.0) | Real course |
| Home | Day streak not shown | Removed, matching the canvas | — |
| Home / Explore | Character parts → Components page | → `/browse` | Owned by the Characters & Browse session |
| Lesson | Section dots ✓ / • / empty | • marks the section in view (scroll-spy), others empty | No per-section completion data |
| Lesson | "Sentences" links to the grammar block | A real Sentences section with Play all | The lesson has sentence data |
| Lesson | No "Mark all known" | Kept as a link button under the vocab legend | Existing feature |
| Lesson | Legend: "green = written correctly, gold = due" | "green = known, gold = learning, none = new" | Matches what the dots actually mean in the app. The blue "new" dot is hidden on this page only (scoped in `learn.css`), as on the canvas. |
| Lesson | Grammar pattern as plain text | Ruby pinyin and an audio button inside the same gold box | R1 ruby setting and audio |
| Lesson | Back link 13 px text | Same look, 44 px hit area | Touch target |
| Lesson | Lesson notes not on the board | Shown after Reading when a lesson has notes | Existing content |
| Reading | Pinyin as a separate line, Pinyin toggle off by default | Ruby pinyin above words, on by default | R1 ruby and the global pinyin setting |
| Reading | "96% known words" chip | Computed from the store; shows "Reading n of m" without JS | Real data |
| Reading | — | "Next reading" row under the text | Existing navigation |
| Guides | Topics: strokes, tones, stroke rules, 在/再, 那/哪 … | The 6 real Markdown guides: "Start here" for the basics, "Easy to confuse" for the "A vs B" titles | No content exists yet for 8 basic strokes, stroke-order rules, 那 vs 哪 or 了/过/着. The article card renders the guide's Markdown. |
| Guides | No level/tag filter chips | Chips removed; `?level=` / `?tag=` still filter the list server-side | Canvas has none |
| Courses | Our course HSK 3.0 shows sample planned lessons | Planned levels with an honest empty state | No HSK 3.0 lessons yet |
| Courses | Textbook cards for named publisher series | One "Your own textbook" card, plus the import form and your saved lists | `ContentRulesTest` forbids publisher names in the repo. Saved lists show below the cards. |
| Courses | Book covers in custom colours | `--muted` cover | Tokens only |
| Courses | `'What's the Weather Like?'` breaks the board script | Patched locally to `’` for rendering only | Board bug; please fix on the canvas |
| Courses | Flashcard / print icons per level | Link to Review / Worksheet (HSK tabs pass version/level) | Those pages don't take a lesson range yet |

## Fixes found while matching
- `GuideService`: the `\R` regexes lacked `/u`, so byte `0x85` inside hanzi such as 慢 (E6 85 A2) was treated as a line break and the 地 examples rendered as `�`. Added `/u` and a regression assertion in `GuidesTest`.
- The Reading quiz shows one question at a time (canvas). `.question[hidden]` needs `display:none` because the fieldset is a flex box.

## Scoped overrides (no shared files changed)
- `.page:has(>.lp)` padding (40/72 desktop, 24/40 phone) and `.page:has(>.lesson-hero)` top padding 0: the board's `main.wrap` padding.
- `#vocab .dot-new{background:transparent}`: CharTile "new" dot hidden on the lesson page.
- `body:has(.lesson-hero){overflow-x:clip}`: lets the full-bleed hero use `calc(50% - 50vw)` margins.
