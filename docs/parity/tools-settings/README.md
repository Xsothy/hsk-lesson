# Tools & Settings: canvas parity

Each PNG puts the design-canvas board ("4 · Tools & Settings") on the left and the app's `<main>` on the right, at 390 and 1200 px, in light and dark: `<page>-<width>-<theme>.png`.
Pages: `tools-pinyin`, `tools-hsk`, `tools-name`, `tools-zodiac` (one board, four tabs), `settings`, `appearance`. The header is covered by `docs/parity/components`.
To regenerate them, serve the boards with the local renderer (see `docs/parity/components/README.md`), then run `node scripts/parity-tools-settings.mjs <canvasBase> <appBase>`. The app side is filled with the same sample input the canvas shows.

## Structure
- `/tools` is the canvas's single "Text tools" page with four tabs. Each tab is a link: `/tools/pinyin`, `/tools/hsk-check`, `/tools/name`, `/tools/zodiac` all render it with that tab open; switching tabs updates the URL (history), and arrow keys move between tabs.
- Login, register and account have no board. They use the Settings patterns: borderless 22 px cards, 26 px title, 13 px labels, 48 px fields and buttons.

## Deliberate differences
| Where | Canvas | App | Why |
|---|---|---|---|
| Page width / top padding | 1200 max, 40 px padding | Shared layout `.page` | Layout is shared (`app.css`), not this session's file |
| Tools · pinyin | "Characters with more than one reading are underlined — tap to choose." | Line omitted | No polyphone picker yet |
| Tools · pinyin output menu | 3 options | Adds "No tones" | Keeps the existing no-tones mode |
| Tools · pinyin input | Accepts Chinese | Also accepts tone numbers / marks (`xue2xi2`) | Existing behaviour |
| Tools · stats | Sample numbers | Real counts; "new to you" = words not marked known | Real data |
| Tools · textarea in dark | White (no background on the board) | Card colour | Canvas bug; contrast |
| Tools · HSK checker | No run button | Runs as you type and on version switch | Same as canvas (no button) |
| Tools · HSK 3.0 | Bars 1–2 / 3–4 / 5–6 / Beyond | 5–9 bucket label for 3.0, "HSK 7–9" chip | 3.0 has levels 7–9 |
| Tools · HSK chips | Static | Links to the character page | Replaces the old "not in list" links |
| Tools · name meanings | Wisdom, Calm, Bright, Strength | The app's real themes (Beautiful, Bright, Wise, Happy, Lucky, Peace, Kind, Strong, Nature), max 3 | Backed by real character data (`/tools/name/ideas`) |
| Tools · name styles | Balanced / Modern / Easy to write | Same; "Easy to write" sorts by lowest HSK level, "Modern" varies picks | No stroke counts in the DB |
| Tools · name | — | Second card "From your English name" (sound-alike, with the "for fun only" note) | Keeps the existing feature |
| Tools · zodiac | Result only | Adds the Chinese New Year note under the card | Keeps the existing boundary explanation |
| Tools · worksheet | Not a tab | Reached via "Make a worksheet from this text" (pre-fills `?chars=`) and the header menu | Canvas has four tabs |
| Settings · theme | Not on Settings | Light/Dark/System lives on Appearance (Mode) | Follows the canvas |
| Settings · character size | 0.8–1.6× slider | 3-step slider: 0.85× / 1.0× / 1.25× | Stored values are sm/md/lg (`store.js` unchanged) |
| Settings · checkboxes | 22 px box | 22 px box; whole 60 px row is the label | 44 px touch target |
| Settings · daily goal / hint | 5/10/20 and 2/3/Never | 5–50 and 1–5/Never | Keeps existing values |
| Settings · Study | 3 rows | Adds the three flashcard rows | Existing settings |
| Settings · sync | — | `beta` chip; signed in shows email, sync status and "Manage account" | S2 sync status + account |
| Settings · theme dots | `#3b5b7a`, `#2f6b47` | `--blue`, `--green` | Tokens only |
| Appearance · mode buttons | 40 px | 44 px | Touch target |
| Appearance · check mark | "✓" text | SVG | SVG icons only |
| Appearance · preview pinyin/accent text | `--red` | `--red-d` | Contrast 4.5:1 |
