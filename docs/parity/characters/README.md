# Characters & Browse: canvas parity

Each PNG puts the design-canvas board ("2 · Characters & Browse") on the left and the app on the right, full page, at 390 and 1200 px, in light and dark: `<page>-<width>-<theme>.png`.

| Key | Canvas board | App |
|---|---|---|
| `character` | Character | `/char/学` |
| `parts` | Components ("Character parts") | `/parts?c=氵` (new page) |
| `browse` | Browse (HSK 2.0 tab) | `/browse?tab=hsk2&level=1` |
| `browse-pinyin` | Browse (By pinyin) | `/browse?tab=pinyin&syl=xue` |
| `browse-radical` | Browse (By radical) | `/browse?tab=radical` |
| `search` | Search | `/search?q=xue` |

To regenerate the shots, serve the board `.dc.html` files with the local renderer (`support.js`, kept in the session notes), then run `node scripts/parity-characters.mjs <canvasBase> <appBase>`.
The renderer doesn't expand `dc-import`, so the canvas side shows no header, writing grid, word rows or tiles. Those components are matched separately in `docs/parity/components/`.

## What changed
- **Character:**
  - "Print a practice sheet" is now a full-width link at the bottom of the Stroke order card.
  - Character facts now show Radical, Parts, Structure, Traditional and Unicode. Each part links to `/parts`.
  - Only the Write card has a shadow; the right column has 28 px gaps.
  - Related tiles use the soft variant.
  - Page padding is 40/72 px on desktop and 24/40 px on phones.
- **Character parts (`/parts`, new):**
  - Real data: a part's role comes from the Make Me a Hanzi etymology (`semantic` = meaning clue, `phonetic` = sound clue) across HSK characters. 159 parts are used as a clue in 3 or more characters.
  - The detail panel has the clue tag, name, pinyin and hint, a sentence computed from the data (e.g. "A sound clue in 6 HSK characters. 4 of them are read qing in some tone…"), and six HSK examples.
  - "Practise these characters" and "Add to flashcards" (saves the example characters to My words).
  - Filters for All, Meaning clues and Sound families, plus search by English, hanzi or pinyin.
  - A part that only appears in `character_parts` (e.g. ⺍) gets an honest "Part" panel.
  - The header's Character parts link now goes here.
- **Browse:**
  - Canvas title, search box and tab chips.
  - Level cards with real word counts.
  - Status filters (All / To learn / Known) with live counts.
  - List, Grid, Practise and PDF buttons; the PDF button opens the worksheet with the same set.
  - The list sits in one card with a status tag on each row.
  - The pinyin tab is one card with tone buttons in tone colours and a grid of characters.
  - The radical tab is one card with tiles grouped by stroke count, each showing the radical's pinyin.
- **Search:**
  - Canvas search box with a 2 px ink border.
  - A line saying how the query was read, built from the top hit.
  - Characters (soft, large tiles) and Words (6 rows with an HSK tag, then "Show all N words →").
  - A side column with "In your lessons" (lessons and readings) and "Guides & parts" (links to the first character's radical on `/parts` and to the tones guide).

## Deliberate differences
| Where | Canvas | App | Why |
|---|---|---|---|
| Browse, Search buttons | 40 px tall | 44 px | Touch target |
| Character Watch/Write pill | 38 px buttons | 44 px | Touch target |
| Character breadcrumb | No external link | "MDBG dictionary ↗" kept | Existing feature with its own test |
| Character | No Parts section | The old F5 Parts section is removed; parts are linked from Character facts to `/parts` | Follows the canvas, which has a standalone parts page |
| Character "Examples from your lessons" | Source "Lesson 1 · Sentences" | "Lesson 1" | No section data per example |
| Browse list rows | "Lesson 3" meta on each row | Not shown | No word → lesson mapping in the data |
| Browse status tag | Known / Due / New | Known / Due / Learning / New | "Learning" covers saved words that aren't due yet |
| Browse, pinyin tab | "Syllables A–Z: a · ba · …" text | Same text as a `<details>` that opens to all syllable links | The canvas line is not interactive; the app needs a real picker |
| Browse, pinyin tab with no syllable | Always shows xue | "Pick a syllable…" with the A–Z list open | No invented default |
| Browse level cards | Show counts from the canvas | Real counts (HSK 2.0 level 1 = 150, HSK 3.0 levels from the data) | Real data |
| `/parts` grid | 8 sample parts | The 24 most-used parts, then "Show all N parts" | 159 real parts would make the phone page very long |
| `/parts` examples pinyin | Always tone-3 blue | Same (canvas copied) | — |
| Search "In your lessons" sub-line | "Lesson 5 · in vocabulary" | "Lesson 5 · School & Work" / "Reading · Lesson 5" | Where the match occurs isn't tracked |
| Search with no lesson match | — | "Not in any lesson or reading yet." | Honest empty state |
| Page padding | `.wrap` 40/40/72 | Scoped override `main.page:has(.cp/.bw/.pt)` in each page's CSS | No change to the shared `app.css` |

## Shared files touched
- `resources/views/components/app-header.blade.php`: the Character parts item now points to `route('parts')`, and `parts` was added to the Characters menu's active routes (two lines).

## Known unrelated failure
- `tests/e2e/alpha-coverage.spec.js` expects 12 lessons, but the database now has 24 (HSK 2 course, commit 5e9e6c6). That test isn't in this group's files.
