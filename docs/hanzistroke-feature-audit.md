# HanziStroke.com — feature audit vs. HSK Lesson

Inspected 2026-11-07 (desktop + 375px mobile). Goal: match the *feature set and structure* for free internal use.
Do **not** copy their text, curated groupings, example sentences, PDFs, branding or visual design — rebuild from open data (see §6).

Legend: ✅ we have it · 🟡 partial · ❌ missing

---

## 1. Site map (every section found)

| Area | URL pattern | What it is |
|---|---|---|
| Home | `/` | Hero + big search; 3 columns **Learn / Practice / Review**; app promo; "why stroke order"; FAQ |
| Dictionary | `/dictionary` | Search (hanzi, pinyin, English), quick chips, **Top 100 characters** grid, browse-by links, FAQ |
| Character page | `/order/{char}` | Main page type (details in §2) |
| Pinyin index | `/pinyin` | Live search by syllable (`mei`, `měi`, `mei3`, `lv`=`lü`), tone filter tabs (all/1–4), per-reading audio, A–Z syllable browser (400+ syllables) |
| Radical index | `/radical` | 233 radicals + variants grouped by stroke count 1–14, jump bar |
| Components | `/components`, `/component/{c}` | 120 curated components (60 meaning clues, 60 sound families), filter All/Meaning/Sound/Beginner, search; detail page explains the clue, shows example characters as “part + clue”, more characters, words to read next, FAQ |
| HSK overview | `/hsk`, `/hsk/2.0` | HSK 2.0 (6 levels, 5,000 words) vs 3.0 (9 levels, 11,000 words) comparison table |
| HSK level list | `/hsk/level-N`, `/hsk/3.0/level-N`, `/hsk/3.0/level-7-9` | Full word list: filter **All / Not practiced / Practiced**, **List / Grid** view, search, **Practice** button, **PDF** download, “show more” paging |
| Courses | `/course` → `/course/series/{s}` → `/course/{book}` → `/course/{book}/lesson-N` | 7 textbook series, 32 books, 577 lessons. Lesson page: core vocab table (status, no., item, pinyin, POS, definition) in textbook order, separate **proper nouns** (not counted in progress), tabs **Vocabulary / Practice**, Vocab list / **Worksheet** download, prev/next lesson |
| Tools hub | `/tools` | Grid of all tools |
| Worksheet library | `/worksheets` | Ready-made PDFs: beginner theme packs (first 20 chars, numbers, family), HSK 3.0 per-level resources |
| Compare | `/compare` | Confusable characters/particles articles (了/过/着, 那/哪, 做/作, 在/再 …) |
| Learn | `/learn` | Beginner path: pinyin intro, 8 basic strokes, handwriting guide, tones guide, HSK 3.0 path |
| Blog | `/blog/*` | SEO guides (basic strokes, top 100, tones, numbers, new HSK 3, zodiac), `/learn/poetry` |
| My Vocabulary | `/dashboard/vocabulary` | Personal word book (sign-in required); groups + export (Pro) |
| App | `/app` | iOS app (write / review / listen), Android waitlist |
| Pro | `/pro` | Paid tier (§5) |
| Misc | `/about`, `/updates`, `/privacy`, `/terms`, feedback widget, announcement bar |

## 2. Character page (`/order/学`) — every element

1. **Header**: `学 (xué): To study`, **audio** button, **Save to My Vocabulary** (bookmark + toast), badges: HSK 2.0 level, HSK 3.0 vocab / **recognition** / **writing** levels.
2. **Animated stroke order**: Pause, Replay, **speed (1×)**, numbered stroke start marker; **Try Writing It** → modal with stroke-number pills (1…8), Mi-grid canvas, **Hint**, **Outline** toggle, **Retry**, fullscreen, Exit; “N learners practiced this” counter.
3. **Stroke order diagrams**: one frame per stroke, new stroke highlighted in red.
4. **Printable worksheet**: Download PDF + “full HSK level pack”.
5. **How to use**: words containing the character, grouped by meaning sense, each with pinyin over characters, meaning, HSK badge.
6. **HSK vocabulary**: words containing it, with HSK 2.0/3.0 level badges and per-word audio.
7. **Example sentences**: ruby pinyin, translation, audio, **“Practice sentence”** button.
8. **Information panel**: pinyin, meaning, strokes, radical, traditional, structure (Top-Bottom…), frequency rank, zhuyin, Unicode, Cangjie.
9. **Related characters**: same HSK level / same sound / same radical, each with “view all”.
10. Breadcrumbs, FAQ, footer.

Mobile: same order stacked; header has search icon + hamburger; menu is a full sheet with sections Practice & Review / Courses / HSK (level button grids 2.0 & 3.0) / Sign In.

## 3. Tools — behaviour and options

| Tool | Account? | Behaviour / options |
|---|---|---|
| **Writing practice** | Yes (save sessions) | Choose source (HSK level, course lesson, My Vocabulary, deck, recommended) → range & order (all / to learn / mastered / random) → continuous queue with stroke feedback; Written / Not written status |
| **Flashcards (SRS)** | Yes | Tabs HSK / Course / Custom; HSK 2.0 vs 3.0 toggle; decks per level. Settings: show first Chinese/English, cards per batch 10/20/30, order (deck / shuffle in batch / shuffle deck), pinyin on front, auto-play audio. Ratings **Again / Hard / Good / Easy**; due cards first |
| **Dictation** | Yes | Pick HSK version + level or textbook lesson → hear audio + English hint (homophones) → write from memory on canvas; each stroke checked, hint after repeated misses; scoring |
| **Worksheet generator** | No | Up to 10 chars free; type: characters (/words); title; grid **Tian Zi Ge / Mi Zi Ge / Square**; size large/medium/compact; mode **Tracing / Writing / Progressive (1 demo + 4 gray + blank)**; show English toggle; pinyin + stroke diagrams; live preview; PDF |
| **Sentence practice** | Optional | Paste ≤30-char sentence or pick an example linked to a word → write every character in order (repeats kept), punctuation shown; history when signed in |
| **Hanzi sticker match** | No | Board of 10 characters (random HSK level, vocabulary, deck, or own pick); drag/tap hanzi onto pinyin slots; replay |
| **HSK level checker** | No (3/day, 15 chars free) | Segments text; per word HSK 2.0 level and HSK 3.0 vocab / recognition / writing levels; tabs 2.0 vs 3.0; hover detail |
| **Pinyin converter** | No | ≤2000 chars; output modes (Ruby 汉字+pinyin, …); click polyphonic syllable to correct; Copy; **text analysis** (total, unique, avg HSK level, beyond-list count, level distribution); “generate worksheet from text”; examples incl. multi-tone challenge |
| Name generator | No | Style, tone (masc/fem/neutral), 2–3 meaning traits, surname → names with pinyin + stroke links |
| Zodiac calculator | No | Birth date → animal, element, traits, character stroke guides |

## 4. Accounts & data model they imply

- Sign in with Google / Apple / Email (modal on any gated action).
- Per-user: saved vocabulary (+ groups), practice status per word (written / not written), SRS state per card (due date, interval, ease), saved writing sessions, sentence history, custom decks/cards, daily usage counters.

## 5. Monetisation (for reference only — skip internally)

Free daily caps: writing 10, dictation 10, flashcards 20 reviews, 2 custom decks × 100 cards, 3 saved sessions, 1 worksheet/day (10 chars), level checker 3/day; HSK PDFs level 1 only. Pro removes caps, adds CSV/PDF vocab export. For an internal tool, **no caps, no paywall**.

---

## 6. Gap analysis against our app

| # | Feature | Us | Notes / how to build | Open data source |
|---|---|---|---|---|
| 1 | Character page | 🟡 word modal only | New `/char/{c}` page + `characters` table; facts panel | Make Me a Hanzi (strokes, radical, decomposition), Unihan (Unicode, radical, stroke count, Cangjie, zhuyin via kMandarin), SUBTLEX/Jun Da frequency |
| 2 | Stroke animation controls | 🟡 replay/slow | Add pause, speed, stroke-number marker | Hanzi Writer (already used) |
| 3 | Stroke-by-stroke diagrams | ❌ | Render with Hanzi Writer per-stroke SVG | Hanzi Writer |
| 4 | Writing quiz (hint/outline/retry) | ❌ | `HanziWriter.quiz()` gives stroke checking + hint after misses | Hanzi Writer |
| 5 | Words containing char / related chars | ❌ | DB queries on `words` + `characters` (same radical/sound/level) | our DB + CC-CEDICT |
| 6 | Example sentences w/ ruby pinyin + audio | 🟡 lessons only | Reuse SentenceLine + TTS; add `sentences` table | Tatoeba (CC-BY) |
| 7 | Dictionary search hanzi/pinyin/English | 🟡 client filter | API `/words?q=` exists → wire UI; tone-insensitive pinyin, `v`=`ü` | — |
| 8 | Pinyin index + tone filter | ❌ | Group words by toneless syllable | CC-CEDICT |
| 9 | Radical index | ❌ | 214 Kangxi + variants by stroke count | Unihan / Make Me a Hanzi |
| 10 | Components (meaning/sound clues) | ❌ | Write our **own** curated list (theirs is editorial content) | Make Me a Hanzi decomposition |
| 11 | HSK 2.0 levels 1–6, HSK 3.0 levels 1–9 | 🟡 HSK1 partial | Import official lists; add `hsk3_level`, recognition/writing levels | Official HSK lists (public) |
| 12 | Level list: list/grid, practiced filter, PDF | ❌ | Needs progress tracking (#18) | — |
| 13 | Textbook course lessons | ❌ | Only if you own the books; vocab lists per lesson are publisher content — use **our own 12 lessons** instead | — |
| 14 | Worksheet generator (grid/mode/size → PDF) | ❌ | Client-side SVG → print CSS or jsPDF; Tian/Mi/Square grids, tracing/progressive | Hanzi Writer stroke data |
| 15 | Flashcards with SRS (Again/Hard/Good/Easy) | ❌ | SM-2 or FSRS; settings as listed in §3 | ts-fsrs (MIT) |
| 16 | Dictation | ❌ | TTS (we have) + Hanzi Writer quiz with hidden outline | — |
| 17 | Sentence practice | ❌ | Queue of chars from a sentence into quiz | — |
| 18 | Progress / My Vocabulary / decks | ❌ | Users table exists (Laravel); add `user_words`, `review_states`, `practice_sessions` | — |
| 19 | Sticker match game | ❌ | Small drag/tap game | — |
| 20 | HSK level checker / text analyser | 🟡 API `/tokenize` | Add level lookup + distribution; UI | our DB |
| 21 | Pinyin converter (ruby, polyphone fix) | 🟡 API `/tokenize` + word map | UI + per-char polyphone choices | CC-CEDICT / pinyin-pro (MIT) |
| 22 | Confusables “compare” articles | ❌ | Our own write-ups | — |
| 23 | Learn path (strokes, tones, pinyin) | ❌ | Our own guides | — |
| 24 | Lessons with grammar/dialogue/readings/quizzes | ✅ | **Our differentiator** — they have none of this | — |
| 25 | Agent content API | ✅ | Ours only | — |
| 26 | Mobile nav | 🟡 designed | They use hamburger sheet; our design uses bottom nav (keep) | — |
| 27 | Name generator / zodiac | ❌ | Low value internally — skip | — |

## 7. Recommended build order

1. **Data foundation** — `characters` table + import Make Me a Hanzi/Unihan; HSK 2.0 1–6 & 3.0 1–9 lists; API endpoints for agents.
2. **Character page** (#1–6) — biggest single gap, reuses our components.
3. **Writing practice + dictation** (#4, #16, #17) — all Hanzi Writer quiz.
4. **Progress + My Vocabulary + SRS flashcards** (#15, #18) — needs auth.
5. **Browse**: dictionary search, pinyin, radical, HSK lists (#7–12).
6. **Worksheet generator** (#14).
7. Text tools (#20–21), sticker match (#19), learn/compare content (#22–23).

## 8. Not verified

- Gated flows (flashcard session, dictation session, saved vocabulary, writing queue) need sign-in; behaviour above comes from their visible settings, FAQ and app page, not from a live session.
- Simulated mouse drags did not register on the writing canvas, so stroke-feedback visuals were not observed.
