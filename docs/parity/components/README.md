# Shared components: canvas parity

Each PNG puts the design-canvas board ("5 · Component library") on the left and the app on the right, at 390 and 1200 px, in light and dark: `<component>-<width>-<theme>.png`.
The app side comes from `/dev/components` (each `#b-*` board uses the same sample content as its canvas board) and, for the header, from `/home`.
To regenerate them, serve the board `.dc.html` files with the small renderer used here (`support.js`, kept in session notes), then run `node scripts/parity-components.mjs <canvasBase> <appBase>`.

Sizes were checked by measuring element boxes in both renders. The canvas has no global `box-sizing` reset, so some boxes are bigger than their declared size. The app copies the size the canvas actually renders: menu items are 68 px tall, the search pill is 288 px wide, and the writing-grid frame is content-box.

## Deliberate differences
| Component | Canvas | App | Why |
|---|---|---|---|
| Header menu buttons | 40 px tall | 44 px | Keeps the 44 px touch target. The phone header is 8 px taller as a result. |
| Header | — | Account / sign-in icon after Settings | Keeps the account feature, which the canvas doesn't show. |
| Header | `position: relative` | Sticky | Existing behaviour |
| Tab bar | Hidden at every width | Hidden as well. The markup stays, and its icons and pill now match the board. | — |
| ActionRow `dark` | Board still shows `#35302a` | Accent tint (`--red-t`) | Follows the latest canvas change ("dark blocks become accent tint"). |
| ActionRow icon | Hanzi glyph | `glyph` prop renders a hanzi. Existing callers pass `icon` and keep their SVG in the canvas's 36 px square. | No glyphs are invented for pages; page sessions can switch to `glyph`. |
| WordRow pinyin | One colour (tone 3 blue) | Each syllable in its own tone colour | The R1/R4 tone-colour setting |
| WordRow hanzi link | 30 px tall | 44 px tall (inline-flex). The visual is unchanged. | Touch target |
| QuizOption ✓/✕ | Text characters | SVG marks | R4 rule: SVG icons only |
| DialogueBubble | No audio button | Play button kept | Existing feature |
| Chip / stat / wg badge text on red | `#fff` | `--on-red` (dark text in dark mode) | Contrast in dark mode |
| Ink colour | `#2e2a25` on the canvas | `--ink` | The brief maps `--c0f0c08` to `--ink`. |

New tokens (light/dark): `--orange`/`--orange-t` (Learn menu tint), `--sel` (selected quiz option), `--gold-s`, `--green-s`, `--brown` (lesson glyph), `--wg-frame`, `--wg-cross`, `--wg-diag`.
