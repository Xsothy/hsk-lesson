# Implementation Plan: HSK App v3 Migration

## Overview

This implementation plan migrates the HSK 1 Learning App from v2 to v3 architecture by:
- Creating a central `WORD_MAP` for pinyin lookup (single source of truth)
- Removing duplicate pinyin arrays from 12 lesson files and readings file
- Adding HSK level metadata to dictionary entries
- Updating the renderer to perform runtime pinyin lookup
- Ensuring 100% word coverage through verification scripts

**Technology**: JavaScript (Node.js for migration scripts, browser JavaScript for rendering)

**Migration Sequence**: Preparation → WORD_MAP Generation → Data Migration → Coverage Verification → Renderer Update → Testing → Deployment

## Tasks

- [ ] 1. Phase 1: Preparation and Backups
  - [x] 1.1 Create backup directory and backup all data files
    - Create `data/backups/` directory
    - Copy all 12 lesson files to `data/backups/lesson-*.js.backup`
    - Copy `data/readings.js` to `data/backups/readings.js.backup`
    - Copy `data/dictionary.js` to `data/backups/dictionary.js.backup`
    - Create git tag `pre-v3-migration` for rollback point
    - _Requirements: 2, 13_

- [ ] 2. Phase 2: HSK Level Metadata and WORD_MAP Generation
  - [x] 2.1 Add HSK level field to dictionary entries
    - Create `scripts/add-hsk-levels.js` Node.js script
    - Identify ~150 core HSK1 words (manually or via external HSK1 word list)
    - Add `hsk_level: 1` field to HSK1 words in dictionary
    - Tag remaining words with appropriate HSK levels (2, 3, etc.)
    - Validate all entries have `hsk_level` between 1-6
    - Write updated dictionary back to `data/dictionary.js`
    - _Requirements: 1.1_
  
  - [x] 2.2 Create WORD_MAP generation script
    - Create `scripts/build-word-map.js` Node.js script
    - Read `data/dictionary.js` and extract all (c, p) pairs
    - Add proper nouns with capitalized pinyin: "李华" → "Lǐ Huá", "王芳" → "Wáng Fāng", "陈明" → "Chén Míng", "李明" → "Lǐ Míng", "北京" → "Běijīng"
    - Add punctuation mappings to empty string: "。" → "", "，" → "", "！" → "", "？" → "", "、" → "", "：" → "", "；" → "", "…" → ""
    - Generate flat JavaScript object: `const WORD_MAP = { "你": "nǐ", ... }`
    - Write to `js/word-map.js` with `window.WORD_MAP = {...};` export
    - _Requirements: 1_
  
  - [x] 2.3 Write unit tests for WORD_MAP integrity
    - Test all values are strings (no undefined, null, or objects)
    - Test punctuation entries map to empty string
    - Test no duplicate keys exist
    - Test proper noun pinyin uses capital first letter
    - _Requirements: 10_

- [x] 3. Phase 3: Data Migration (Tokenization)
  - [x] 3.1 Create lesson tokenization script
    - Create `scripts/tokenize-lessons.js` Node.js script
    - Implement greedy longest-match tokenization algorithm using WORD_MAP
    - Read all 12 lesson files from `data/lessons/`
    - For each lesson, process `sentences` array and `dialogue` array
    - For each line with `py` field, remove `py` and generate `words[]` array by tokenizing `zh` string
    - Preserve punctuation as separate tokens
    - Maintain all other fields unchanged (speaker, en, etc.)
    - Write updated lesson files back to `data/lessons/`
    - _Requirements: 2, 13_
  
  - [x] 3.2 Tokenize readings file
    - Extend `scripts/tokenize-lessons.js` to handle `data/readings.js`
    - Process all reading stories in `window.HSK_READINGS` array
    - For each reading line with `py` field, remove `py` and generate `words[]` array
    - Preserve all reading metadata (id, lesson, type, difficulty, title, emoji, questions, focusWords)
    - Write updated readings file back to `data/readings.js`
    - _Requirements: 2.1, 13_
  
  - [x] 3.3 Write tokenization unit tests
    - Test tokenization splits text into correct word boundaries using WORD_MAP
    - Test prioritizes longer multi-character words over single characters (e.g., "你好" as one token, not ["你", "好"])
    - Test preserves punctuation as separate tokens
    - Test handles edge cases (empty string, whitespace, mixed content)
    - _Requirements: 10_
  
  - [x] 3.4 Write reconstruction verification tests
    - Test concatenating `words[]` array reconstructs original `zh` string
    - Test no extra spaces or missing characters
    - Test punctuation preserved in correct positions
    - _Requirements: 10_

- [x] 4. Checkpoint - Verify data migration completed
  - Ensure tokenization scripts executed successfully
  - Manually inspect 2-3 lesson files to verify `words[]` arrays created and `py` fields removed
  - Ensure all tests pass, ask the user if questions arise

- [x] 5. Phase 4: Coverage Verification
  - [x] 5.1 Create word coverage verification script
    - Create `scripts/verify-coverage.js` Node.js script
    - Extract all unique tokens from all 12 lesson files (sentences + dialogues)
    - Extract all unique tokens from `data/readings.js` (all reading lines)
    - Compare extracted tokens against `WORD_MAP` keys
    - Generate report listing any tokens not found in WORD_MAP
    - Exit with error code if coverage < 100%
    - _Requirements: 6_
  
  - [x] 5.2 Run coverage verification and fix gaps
    - Execute `verify-coverage.js` script
    - Review report for missing words
    - Add missing words to `data/dictionary.js`
    - Regenerate `js/word-map.js` using `build-word-map.js`
    - Re-run `verify-coverage.js` until 100% coverage achieved
    - _Requirements: 6_
  
  - [x] 5.3 Write migration verification tests
    - Test all 12 lesson files contain no `py` arrays in sentences
    - Test all 12 lesson files contain no `py` strings in dialogues
    - Test `data/readings.js` contains no `py` strings
    - Test all reading lines have `words[]` array
    - Test all sentence objects have `words[]` array
    - Test all dialogue objects have `words[]` array
    - Test all dictionary entries have `hsk_level` field
    - Test `hsk_level` values are integers between 1-6
    - _Requirements: 10_

- [x] 6. Phase 5: Renderer Update
  - [x] 6.1 Implement renderLine function with WORD_MAP lookup
    - Update `js/render.js` to add `renderLine(line)` function
    - Implement algorithm: for each word in `line.words[]`, look up `pinyin = WORD_MAP[word]`
    - If pinyin is undefined, render word as plain text and log warning: `[renderer] "word" not found in WORD_MAP`
    - If pinyin is empty string (punctuation), render word as plain text without ruby wrapper
    - If pinyin is non-empty string, create `<ruby>` element with `<rt>` tag containing pinyin
    - Use DOM APIs (`createElement`, `createTextNode`, `createDocumentFragment`) instead of `innerHTML` for XSS safety
    - Return document fragment with all rendered elements
    - _Requirements: 3_
  
  - [x] 6.2 Update sentence and dialogue rendering to use renderLine
    - Locate existing sentence rendering code in `js/render.js` or `js/lesson.js`
    - Replace v2 rendering logic with calls to `renderLine(line)`
    - Locate existing dialogue rendering code
    - Replace v2 rendering logic with calls to `renderLine(line)`
    - Preserve speaker labels (A/B) in dialogue rendering
    - Maintain click-to-speak functionality on Chinese text
    - _Requirements: 12_
  
  - [x] 6.3 Update reading rendering to use renderLine
    - Locate existing reading rendering code (likely in `js/app.js` or separate reading module)
    - Replace v2 rendering logic with calls to `renderLine(line)`
    - Maintain blur-reveal functionality for English translations
    - Maintain click-to-speak functionality on Chinese text
    - _Requirements: 2.1, 3_
  
  - [x] 6.4 Write unit tests for renderLine function
    - Test renders word with pinyin from WORD_MAP as `<ruby>` element
    - Test renders punctuation without `<ruby>` wrapper
    - Test renders missing word as plain text and logs warning
    - Test handles multi-character words correctly
    - Test handles proper nouns with capitalized pinyin
    - Test returns DocumentFragment (not HTML string)
    - _Requirements: 10_

- [x] 7. Phase 6: Script Load Order and HTML Updates
  - [x] 7.1 Update script load order in index.html
    - Open `index.html`
    - Add `<script src="js/word-map.js"></script>` before `<script src="js/render.js"></script>`
    - Ensure `js/word-map.js` loads before `js/app.js`
    - Verify `window.WORD_MAP` is available in global scope
    - _Requirements: 7_
  
  - [x] 7.2 Update script load order in lesson.html
    - Open `lesson.html`
    - Add `<script src="js/word-map.js"></script>` before `<script src="js/render.js"></script>`
    - Ensure `js/word-map.js` loads before `js/lesson.js`
    - Verify `window.WORD_MAP` is available in global scope
    - _Requirements: 7_

- [x] 8. Checkpoint - Verify rendering works in browser
  - Open `index.html` in browser
  - Navigate to a lesson page
  - Verify Chinese text renders with pinyin above characters
  - Verify punctuation renders without pinyin
  - Check browser console for any warnings about missing words
  - Ensure all tests pass, ask the user if questions arise

- [x] 9. Phase 7: Integration Testing
  - [x] 9.1 Write integration tests for lesson rendering
    - Load `lesson-1.js` and render sentences section
    - Verify all Chinese text has corresponding pinyin
    - Verify punctuation renders without `<rt>` tags
    - Verify proper nouns render with capitalized pinyin
    - Verify no console warnings for missing words
    - _Requirements: 10_
  
  - [x] 9.2 Write integration tests for reading rendering
    - Load first reading from `data/readings.js`
    - Render all reading lines
    - Verify all lines render correctly with pinyin
    - Verify English translations display
    - Verify no console warnings for missing words
    - _Requirements: 10_
  
  - [x] 9.3 Write integration tests for settings and TTS
    - Test pinyin visibility toggle updates CSS variable `--pinyin-visible`
    - Test character size slider updates CSS variable `--char-size`
    - Test pinyin size slider updates CSS variable `--pinyin-size`
    - Test settings persist after page reload (localStorage)
    - Test dark mode toggle updates body class
    - Test audio service receives full Chinese text (not individual words)
    - Test TTS rate and volume settings apply to utterance
    - _Requirements: 8, 9, 10_
  
  - [x] 9.4 Browser compatibility testing
    - Test rendering in Chrome (verify ruby text displays correctly)
    - Test rendering in Firefox (verify ruby text displays correctly)
    - Test rendering in Safari (verify ruby text displays correctly)
    - Test rendering in Edge (verify ruby text displays correctly)
    - Test CSS variables apply correctly across browsers
    - Test TTS voices load (with timeout fallback for Firefox)
    - Test localStorage works across browsers
    - _Requirements: 10_

- [ ] 10. Phase 8: Error Handling and Edge Cases
  - [x] 10.1 Implement graceful degradation for missing words
    - Verify `renderLine` renders missing words as plain text
    - Verify console warning logged for missing words
    - Verify app continues rendering remaining words in line
    - Verify no errors thrown or execution halted
    - _Requirements: 4_
  
  - [x] 10.2 Test and verify unchanged components
    - Verify audio service functionality unchanged (click-to-speak works)
    - Verify vocabulary modal opens and displays word breakdowns
    - Verify `data-vocab-word` attributes still present on clickable elements
    - Verify vocabulary section uses word objects from `lesson.vocab` array (not WORD_MAP)
    - Verify colorized pinyin display in vocabulary section unchanged
    - _Requirements: 8, 9, 11_

- [ ] 11. Final checkpoint - End-to-end verification
  - Open each of the 12 lessons in browser and spot-check rendering
  - Open 3-5 reading stories and verify rendering
  - Test settings modal (pinyin toggle, size sliders, TTS controls)
  - Test dark mode toggle
  - Test click-to-speak on sentences and dialogues
  - Test vocabulary modal on clickable words
  - Check browser console for any errors or warnings
  - Ensure all tests pass, ask the user if questions arise

- [ ] 12. Phase 9: Documentation and Deployment
  - [~] 12.1 Update project documentation
    - Update `README.md` to reflect v3 architecture
    - Document WORD_MAP generation process (`npm run build:word-map`)
    - Document migration scripts usage
    - Add troubleshooting section for common issues (missing words, tokenization errors)
    - _Requirements: All_
  
  - [~] 12.2 Clean up temporary files and create deployment checklist
    - Remove backup files from `data/backups/` (keep in git history via tag)
    - Verify all migration scripts in `scripts/` directory
    - Create deployment checklist: run coverage verification, run tests, manual browser check
    - Commit all changes to feature branch
    - Create pull request with migration summary
    - _Requirements: All_

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP deployment
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation of migration progress
- Migration scripts create backups automatically before modifying files
- Rollback plan available via git tag `pre-v3-migration` if critical issues arise
- 100% word coverage required before deploying renderer changes
- Browser compatibility tested across Chrome, Firefox, Safari, and Edge

## Property-Based Testing

No property-based tests are included in this plan because:
- The design document does not include a "Correctness Properties" section
- This migration is primarily a data transformation and refactoring task
- Unit tests and integration tests provide sufficient coverage for verification
- Key correctness concerns (tokenization reconstruction, WORD_MAP coverage) are verified through deterministic tests

## Migration Verification Strategy

The migration's success is verified through:
1. **Coverage verification**: 100% of tokens in lessons/readings must exist in WORD_MAP
2. **Reconstruction tests**: Concatenating `words[]` must reconstruct original `zh` string
3. **Structure validation**: All v2 fields (`py` arrays) removed, all v3 fields (`words[]` arrays) present
4. **Browser testing**: Manual verification of rendering in multiple browsers
5. **Integration tests**: Automated end-to-end rendering tests for lessons and readings
