# Practice & Review: canvas parity

Each PNG puts the design-canvas board ("3 · Practice & Review") on the left and the app on the right, full page, at 390 and 1200 px in light and dark: `<page>-<width>-<theme>.png`.

| Key | Board | App URL |
|---|---|---|
| practice | Practice | `/practice?lesson=lesson-5` |
| review | Review | `/review?lesson=lesson-5` (card flipped) |
| match | Match | `/practice/match?lesson=lesson-5` |
| worksheet | Worksheet | `/worksheet?lesson=lesson-5` |
| words | MyWords | `/words` (store seeded with 8 saved words, 3 SRS cards, a week of activity) |

To regenerate them, serve the board `.dc.html` files and the component boards they import with the local renderer (`support.js` in the session notes, which now resolves `<dc-import>`), start the app, then run `node scripts/parity-practice.mjs <canvasBase> <appBase>`.
The canvas shows sample states (e.g. stroke 2 of 5, two stickers placed). The app shows the real start of a session, so counts and characters differ by design.

`/practice/sentences` has no board. It uses the Practice layout: mode tabs with **Sentence** active, the progress row, the card, and a **Session** aside with "Practise from" and an **Exercise** control (Mixed / Build / Meaning).

## Behaviour now matching the canvas
- **Practice:** a two-column layout, with the Session aside on the left on desktop and below the session on phones.
  - "Practise from" offers radio sources: lesson, HSK 1 list for the current HSK version, saved words, and due cards.
  - "Which items" offers To learn, All and Random. Random now shuffles the queue.
  - The Write / Dictation / Sentence tabs, the dictation prompt (64 px play button, "Listen and write"), and the "Done:" row of 44 px chips (green = written, red = skipped, linked to the character page) all match the board.
- **Review:**
  - The card shows the tag, the hanzi, the tone-coloured pinyin and the meaning.
  - Rating buttons show the next interval.
  - "Strokes for …" and "Write it now" links sit under the card.
  - **Decks** shows due counts per deck.
  - **New deck from saved words** creates a list deck and opens it.
  - **Review settings** (Show first, Pinyin on front, Play audio on reveal, New cards per day) read and write the store and redraw the current card.
- **Match:** rebuilt as the board's game, with pinyin slots and a tray of character stickers.
  - Tap a sticker, then its slot. A wrong slot turns red and counts as a miss.
  - The header shows the "n / 8" score and a **New board** button.
  - "New board from:" offers Lesson / Random HSK 1 / My words.
  - The best score per source is still recorded and synced.
- **Worksheet:**
  - "Start from" fills the Characters box.
  - Grid offers Tian / Mi / Square; Practice mode offers Tracing / Progressive / Writing (11 / 4 / 0 tracing copies).
  - "Show pinyin & meaning" and "Stroke-order strip" toggles. The strip toggle is new and real: the PDF gained a `strip` option.
  - A live A4 preview with a page count.
- **My words:** title row with the "Saved on this device · sync in Settings" link, and four stat cards (words known, characters written, due today, day streak).
  - A "This week" bar chart with today in red.
  - Filter chips with counts, then the actions row (Write these, Flashcards, Worksheet, Export CSV, Export PDF).
  - A word list card with Due / Learning / Known / New tags.

## Deliberate differences
| Page | Canvas | App | Why |
|---|---|---|---|
| All | Segmented buttons, "Which items" and Match source buttons 40 px tall | 44 px | Touch targets |
| All | Native 18 px radios / 22 px checkboxes | Same-size drawn marks; the whole row is the hit area | 44 px touch targets (the smoke test checks inputs) |
| Practice, Match, Sentences | Four fixed sources | Extra "Another lesson or level" select | Keeps every lesson and HSK level reachable |
| Practice | No empty state | "Choose what to practise" card when no source is set | The page opens without a source |
| Practice | "Which items" defaults to To learn | Defaults to All | Existing behaviour and links; To learn is one tap |
| Practice / Review | — | Session-complete summary (stats + next actions) | Existing feature the board doesn't show |
| Practice | Pinyin in one blue | Tone colours per syllable | R1/R4 tone-colour setting (also in shared WordRow notes) |
| Review | Tag "LESSON 5 · NOUN" and an example sentence | Tag "NEW CARD / REVIEW · deck"; no example | No part of speech or example data per card |
| Review | Four decks | The same four (Cards due, Saved words, HSK 1 per version) + a collapsible "More decks" with lessons, levels and lists | Keeps every deck reachable; opens when the current deck is inside |
| Review | Dashed border colour `#c9bfb1` | `--stroke-out` | Nearest token with no new token needed |
| Match | Single-character stickers | Stickers widen to fit multi-character words | Lesson decks contain words |
| Match | — | Meaning mode and timer/summary removed; the result (time, misses, score, best) is shown in the status line | The board has neither; score logic and the store are unchanged |
| Match | — | No source opens the first lesson | Matches the board, which always shows a board |
| Worksheet | 10 cells per row, "page 1 of 1" | 12 cells (what the PDF prints) and a real page count | The preview mirrors the PDF |
| Worksheet | Cell size select | Not built | The PDF cell size is fixed; listed for later |
| Worksheet | — | Grey tracing copies are drawn with CSS `content`, not text | They are decorative and would fail the 4.5:1 text contrast check |
| My words | "+ New group" button and custom groups | Not built; chips filter All / Known / To learn / HSK n with counts | The store has no word groups, and `store.js` is off-limits here |
| My words | — | Remove (×) button on each row | Existing feature |

## Scoped changes outside the page files
- `WorksheetOptions` / `WorksheetPdf` / `WorksheetController`: new `strip` boolean, default on, which switches the stroke-order strip off.
- `tests/e2e/alpha-coverage.spec.js`: now expects 24 lessons and 48 readings, after the HSK 2 course on main (lessons 13–24). This was failing before this branch.
- Shared CSS was not changed. The Practice-family pages override `.page` padding to the canvas's 20/40 px (phone) and 40/72 px (desktop) from their own stylesheets.
