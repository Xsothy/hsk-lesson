# Requirements Document

## Introduction

This document specifies requirements for migrating the HSK 1 Learning App from the current v2 architecture to the v3 architecture. The migration centralizes pinyin lookup through a single `WORD_MAP` object, eliminating duplicate pinyin arrays in lesson files and reducing data maintenance burden.

## Glossary

- **WORD_MAP**: A flat JavaScript object mapping Chinese characters/words to their pinyin pronunciation (e.g., `{"你": "nǐ", "好": "hǎo"}`)
- **Dictionary_File**: The existing `data/dictionary.js` file containing ~380 words (HSK1-2 and beyond) with character (`c`), pinyin (`p`), English (`e`), and category (`cat`) fields
- **Lesson_File**: Any of the 12 files in `data/lessons/` containing lesson data with sentences and dialogues
- **Readings_File**: The `data/readings.js` file containing additional reading practice stories for each lesson
- **Reading_Line**: An object within lesson data or readings data representing a single sentence, currently containing `zh`, `py`, and `en` fields
- **Renderer**: The `js/render.js` module responsible for converting data structures into DOM elements
- **Pinyin**: Romanized pronunciation of Chinese characters using tone marks (e.g., "nǐ hǎo")
- **Token**: A single Chinese character, multi-character word, or punctuation mark that appears in the `words[]` array
- **HSK_Level**: The HSK (Hanyu Shuiping Kaoshi) proficiency level, ranging from 1 (beginner with ~150 words) to 6 (advanced)

## Requirements

### Requirement 1: Create Central Word Map

**User Story:** As a developer, I want a single source of truth for pinyin, so that I can fix pronunciation errors once and have them apply everywhere.

#### Acceptance Criteria

1. THE System SHALL create a new file `js/word-map.js` that exports a `WORD_MAP` constant
2. THE WORD_MAP SHALL be a flat JavaScript object with Chinese words as keys and pinyin strings as values
3. THE System SHALL populate WORD_MAP with all entries from Dictionary_File
4. WHEN a Dictionary_File entry has multi-character Chinese (`c` field), THE System SHALL use the full string as the key
5. WHEN a punctuation character is encountered (。，！？、：；…), THE System SHALL map it to an empty string `""`
6. THE WORD_MAP SHALL include all proper nouns used in lesson files and readings files (e.g., "李华", "王芳", "陈明", "北京")
7. THE System SHALL use capital first letters for proper noun pinyin (e.g., "Lǐ Huá", "Chén Míng", "Běijīng")

### Requirement 1.1: Add HSK Level Metadata to Dictionary

**User Story:** As a content author, I want to identify which words belong to HSK1 vs HSK2+, so that I can filter vocabulary by proficiency level.

#### Acceptance Criteria

1. THE System SHALL add an `hsk_level` field to each word entry in Dictionary_File
2. THE `hsk_level` field SHALL be a number (1, 2, 3, etc.) indicating the HSK proficiency level
3. THE System SHALL identify and tag approximately 150 core HSK1 words with `hsk_level: 1`
4. THE System SHALL tag remaining words with appropriate HSK levels (2, 3, etc.)
5. THE System SHALL maintain backward compatibility by keeping existing fields (`c`, `p`, `e`, `cat`) unchanged
6. WHEN building WORD_MAP, THE System SHALL include all words regardless of HSK level (WORD_MAP is level-agnostic for rendering purposes)

### Requirement 2: Transform Lesson Data Structure

**User Story:** As a developer, I want to remove duplicate pinyin arrays from lesson files and readings file, so that the codebase is smaller and easier to maintain.

#### Acceptance Criteria

1. WHEN a Reading_Line currently has `py` array, THE System SHALL remove the `py` field
2. WHEN a Reading_Line currently has `zh` string, THE System SHALL create a `words[]` array by tokenizing the Chinese text
3. THE System SHALL tokenize Chinese text into individual characters, multi-character words, and punctuation marks
4. WHEN tokenizing, THE System SHALL preserve word boundaries that match multi-character entries in WORD_MAP (e.g., "你好" as one token, not ["你", "好"])
5. THE System SHALL preserve punctuation as separate tokens in the `words[]` array
6. THE System SHALL update all 12 Lesson_Files to use the v3 structure
7. THE System SHALL update the Readings_File (`data/readings.js`) to use the v3 structure
8. THE System SHALL maintain the existing `en` (English translation) field unchanged

### Requirement 2.1: Handle Readings File Migration

**User Story:** As a user, I want reading practice stories to continue working with the new v3 architecture, so that I can practice reading comprehension.

#### Acceptance Criteria

1. THE System SHALL migrate all reading stories in `data/readings.js` from v2 to v3 format
2. WHEN a reading line has `py` string, THE System SHALL remove it and create `words[]` array
3. THE System SHALL preserve all reading metadata (id, lesson, type, difficulty, title, titleEn, emoji)
4. THE System SHALL preserve questions and focusWords arrays unchanged
5. THE System SHALL maintain the association between readings and their parent lessons (via `lesson` field)

### Requirement 3: Update Renderer for Word Map Lookup

**User Story:** As a user, I want to see pinyin above Chinese characters when viewing lessons, so that I can learn pronunciation.

#### Acceptance Criteria

1. WHEN the Renderer processes a Reading_Line, THE System SHALL look up each token in WORD_MAP
2. WHEN a token maps to non-empty pinyin, THE Renderer SHALL wrap it in `<ruby>` tags with pinyin in `<rt>` tags
3. WHEN a token maps to empty string pinyin, THE Renderer SHALL render it as plain text without `<ruby>` wrapper
4. WHEN a token is not found in WORD_MAP, THE Renderer SHALL render the character without pinyin and log a console warning
5. THE Renderer SHALL use `document.createDocumentFragment()` and DOM APIs instead of `innerHTML` for XSS safety
6. THE Renderer SHALL apply existing CSS classes for styling ruby elements
7. THE Renderer SHALL maintain the existing click-to-speak functionality for Chinese text

### Requirement 4: Handle Missing Words Gracefully

**User Story:** As a developer, I want clear feedback when words are missing from WORD_MAP, so that I can identify and fix gaps.

#### Acceptance Criteria

1. WHEN the Renderer encounters a word not in WORD_MAP, THE System SHALL render the Chinese character as plain text
2. WHEN a word is missing from WORD_MAP, THE System SHALL log a console warning with format `[renderer] "新词" not found in WORD_MAP`
3. THE System SHALL continue rendering remaining words in the line even when one word is missing
4. THE System SHALL NOT throw errors or halt execution when words are missing

### Requirement 5: Preserve Existing Lesson Structure

**User Story:** As a content author, I want existing lesson metadata and vocabulary lists to remain unchanged, so that migration doesn't break other features.

#### Acceptance Criteria

1. THE System SHALL preserve all fields in Lesson_Files except Reading_Line `py` arrays
2. THE System SHALL maintain vocabulary lists (`vocab` field) unchanged
3. THE System SHALL maintain grammar sections (`grammar` field) unchanged
4. THE System SHALL maintain lesson metadata (title, emoji, color, etc.) unchanged
5. THE System SHALL maintain dialogue speaker labels unchanged
6. THE System SHALL maintain reading comprehension questions unchanged

### Requirement 6: Verify Complete Word Coverage

**User Story:** As a developer, I want to verify that all words used in lessons and readings exist in WORD_MAP, so that no pinyin is missing when students view content.

#### Acceptance Criteria

1. THE System SHALL extract all unique tokens from all 12 Lesson_Files
2. THE System SHALL extract all unique tokens from the Readings_File
3. THE System SHALL compare extracted tokens against WORD_MAP keys
4. THE System SHALL generate a report listing any tokens not found in WORD_MAP
5. THE System SHALL identify multi-character words that may need to be added to WORD_MAP
6. THE System SHALL identify punctuation marks that need empty string mappings
7. THE System SHALL report proper nouns (names, places) that need capital-first-letter pinyin

### Requirement 7: Update Script Load Order

**User Story:** As a developer, I want scripts to load in the correct order, so that WORD_MAP is available before the Renderer tries to use it.

#### Acceptance Criteria

1. THE System SHALL load `js/word-map.js` before `js/render.js` in HTML files
2. THE System SHALL verify `word-map.js` is loaded before all lesson files
3. THE System SHALL verify `word-map.js` is loaded before `js/app.js`
4. WHEN `index.html` or `lesson.html` is parsed, THE System SHALL have WORD_MAP available in global scope as `window.WORD_MAP`

### Requirement 8: Maintain Audio Service Integration

**User Story:** As a user, I want text-to-speech to continue working after migration, so that I can hear pronunciation.

#### Acceptance Criteria

1. THE Audio_Service SHALL continue to receive full Chinese sentences from click handlers
2. THE Audio_Service SHALL NOT require changes to its internal implementation
3. THE System SHALL preserve all existing audio button placements and functionality
4. THE System SHALL maintain playback rate and voice settings

### Requirement 9: Preserve Vocabulary Modal Integration

**User Story:** As a user, I want to click vocabulary words to see detailed breakdowns, so that I can understand word composition.

#### Acceptance Criteria

1. THE Vocabulary_Modal SHALL continue to receive word objects from click handlers
2. THE System SHALL preserve the `data-vocab-word` attributes on clickable elements
3. THE System SHALL maintain integration with `data/vocabulary.js` for word breakdowns
4. THE System SHALL preserve the existing modal open/close behavior

### Requirement 10: Create Migration Verification Tests

**User Story:** As a developer, I want automated tests to verify the migration was successful, so that I can catch regressions.

#### Acceptance Criteria

1. THE System SHALL verify that all 12 Lesson_Files contain no `py` arrays
2. THE System SHALL verify that the Readings_File contains no `py` strings
3. THE System SHALL verify that all Reading_Lines contain a `words[]` array
4. THE System SHALL verify that rendering a sample lesson produces correct HTML structure
5. THE System SHALL verify that rendering a sample reading produces correct HTML structure
6. THE System SHALL verify that WORD_MAP contains entries for all tokens used in lessons and readings
7. THE System SHALL verify that punctuation renders without `<rt>` tags

### Requirement 11: Handle Vocabulary Section Rendering

**User Story:** As a user, I want to continue seeing vocabulary lists with pinyin at the top of each lesson, so that I can review words before reading.

#### Acceptance Criteria

1. THE Vocabulary_Section_Renderer SHALL continue to use word objects from `lesson.vocab` array
2. THE Vocabulary_Section_Renderer SHALL use the `p` field from word objects for pinyin display
3. THE Vocabulary_Section_Renderer SHALL NOT use WORD_MAP for vocabulary section (uses direct `p` field)
4. THE System SHALL maintain colorized pinyin display using existing `colorizePinyin()` utility

### Requirement 12: Handle Sentence and Dialogue Section Rendering

**User Story:** As a user, I want to continue seeing example sentences and dialogues with pinyin, so that I can practice reading.

#### Acceptance Criteria

1. WHEN rendering the sentence section, THE Renderer SHALL use the `words[]` array and WORD_MAP for pinyin lookup
2. WHEN rendering the dialogue section, THE Renderer SHALL use the `words[]` array and WORD_MAP for pinyin lookup
3. THE System SHALL preserve blur-reveal functionality for English translations
4. THE System SHALL preserve speaker labels (A/B) in dialogue rendering
5. THE System SHALL maintain click-to-speak functionality on Chinese text

### Requirement 13: Generate Word Tokenization Script

**User Story:** As a developer, I want a script to automatically tokenize existing sentences, so that I don't have to manually create `words[]` arrays.

#### Acceptance Criteria

1. THE System SHALL create a Node.js script that reads existing Lesson_Files and Readings_File
2. THE Script SHALL tokenize each `zh` string into a `words[]` array
3. THE Script SHALL use WORD_MAP to identify multi-character word boundaries
4. THE Script SHALL preserve punctuation as separate tokens
5. THE Script SHALL output updated lesson files with `words[]` and without `py[]`
6. THE Script SHALL output updated readings file with `words[]` and without `py` strings
7. THE Script SHALL create backups of original files before modification

### Requirement 14: Optional - Separate HSK1 Words File

**User Story:** As a content author, I may want a focused list of just HSK1 words, so that I can quickly reference core vocabulary.

#### Acceptance Criteria

1. THE System MAY create an optional `data/words-hsk1.js` file containing only HSK1 words
2. IF created, THE HSK1 words file SHALL export `window.HSK1_WORDS` array
3. IF created, THE HSK1 words file SHALL contain words where `hsk_level === 1`
4. THE main Dictionary_File SHALL remain the authoritative source for WORD_MAP generation
5. THE HSK1 words file SHALL be used only for UI features like "show HSK1 only" filters
6. THE System SHALL NOT break if the HSK1 words file does not exist (optional feature)

