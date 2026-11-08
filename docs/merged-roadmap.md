# Merged roadmap — HSK Lesson + writing toolkit

> **Current target: Alpha.** The executable plan with tickets is in [`docs/alpha-plan.md`](alpha-plan.md).

Principle: **lessons stay the spine** (grammar, dialogues, readings, quizzes, agent API, free, no account).
Writing / review features from the HanziStroke audit (`docs/hanzistroke-feature-audit.md`) are added *around* lessons,
always rebuilt from open data — never copied content.

| Phase | Delivers | Ties back to lessons |
|---|---|---|
| **1. Character foundation** | `characters` table (Make Me a Hanzi: definition, pinyin, radical, decomposition, etymology), `hsk_words` table (HSK 2.0 1–6 + 3.0 1–9), `/api/v1/characters`, public character page `/char.html?c=学` with stroke animation, stroke-by-stroke diagrams, **writing quiz** (hint / outline / retry), facts, words containing it, related characters, and **"appears in lesson N"** | Word sheet → "Open character page"; each character links back to the lessons that teach it |
| 2. Practice | Writing practice queue + dictation (Hanzi Writer quiz) with sources: *a lesson*, HSK level, saved words | "Practice this lesson's characters" button on every lesson |
| 3. Progress & review | Device-local progress first (no account), optional Laravel accounts later; saved words; SRS flashcards (FSRS) | Lesson cards show % learned; lesson vocab auto-added to review |
| 4. Browse | Dictionary search (hanzi / pinyin / English), pinyin index with tone filter, radical index, HSK 2.0/3.0 level lists | HSK list rows show which lesson teaches a word |
| 5. Print | Worksheet generator (Tian/Mi/Square grid, tracing/progressive) | "Print this lesson" |
| 6. Text tools | Pinyin converter + HSK level checker on top of `/api/v1/tokenize` | Agents use the same endpoints to grade new readings |

Open data used:
- Make Me a Hanzi `dictionary.txt` (LGPL-3.0 / Arphic) — character facts
- complete-hsk-vocabulary (MIT) — HSK 2.0 & 3.0 word lists
- Hanzi Writer + hanzi-writer-data (MIT / Arphic) — strokes, animation, quiz (loaded from CDN)
