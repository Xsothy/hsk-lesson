# HSK Lesson Site - Clean Data Structure

## ✅ Fully Normalized Data Architecture (ZERO Duplication)

### Single Source of Truth

**1. Master Word Database** → `data/dictionary.js`
- Contains: ALL vocabulary with pinyin, English, category
- Used by: Everything - the ONLY source for p/e data
- Example: `{ c: "你好", p: "nǐ hǎo", e: "hello", cat: "greeting" }`

**2. Word Breakdown Data** → `data/vocabulary.js`
- Contains: ONLY parts array + literal meaning
- Does NOT duplicate: p/e (fetched from dictionary)
- Example: `"你好": { parts: ["你", "好"], literal: "you + good = hello" }`

**3. Lesson Content** → `data/lessons/*.js`
- Contains: Array of character strings ONLY
- Does NOT contain: p/e data (fetched from dictionary at runtime)
- Example: `vocab: ["你好", "再见", "我", "你"]`

**4. Backwards Compatibility** → `data/constructs.js.deprecated`
- Status: DEPRECATED - no longer used
- Replaced by: Dictionary lookups via `HSK_API.enrichVocabWord()`

**5. Character Data** → `data/characters.js.deprecated`
- Status: DEPRECATED - no longer used
- Replaced by: Dictionary contains all character/word data

---

## Data Flow (Runtime Enrichment)

```
Lesson loads: vocab: ["你好", "我"]
    ↓
API enriches: HSK_API.enrichVocabWord("你好")
    ↓
Dictionary lookup: { c: "你好", p: "nǐ hǎo", e: "hello", cat: "greeting" }
    ↓
Vocabulary lookup: { parts: ["你", "好"], literal: "you + good" }
    ↓
Merged result: { c, p, e, cat, parts, literal }
    ↓
Rendered in UI
```

---

## File Load Order (Minimal)

```
index.html / lesson.html
├── lessons.js       (lesson metadata)
├── dictionary.js    (MASTER word database)
└── vocabulary.js    (breakdown data only)
```

**Removed:**
- ❌ constructs.js (deprecated)
- ❌ characters.js (deprecated)

---

## Benefits

✅ **Zero Duplication**: Each piece of data stored exactly once  
✅ **Easy Updates**: Change word meaning in ONE place (dictionary.js)  
✅ **Smaller Files**: Lessons are tiny arrays of strings  
✅ **Consistency**: Impossible to have conflicting data  
✅ **Scalable**: Add 100 lessons without duplicating word data  

---

## Adding New Content

### Add a new word:
1. Add to `data/dictionary.js`: `{ c: "新词", p: "xīncí", e: "new word", cat: "noun" }`
2. If multi-character, add to `vocabulary.js`: `"新词": { parts: ["新", "词"], literal: "..." }`
3. Use in lessons: Just add string `"新词"` to vocab array

### Add a new lesson:
1. Create `data/lessons/lesson-X.js`
2. Set `vocab: ["word1", "word2", "word3"]` (just strings!)
3. Words automatically enriched from dictionary at runtime

---

## Current Status

✅ **Lessons 1-3:** Cleaned - now simple string arrays  
✅ **dictionary.js:** Complete HSK 1 word database (~150 words)  
✅ **vocabulary.js:** 22 word breakdowns (parts + literal only)  
✅ **api.js:** `enrichVocabWord()` merges data at runtime  
✅ **modal.js:** Uses dictionary lookups, no hardcoded data  
✅ **Deprecated files:** Moved to .deprecated, removed from HTML  

---

## Migration Complete

The data structure is now **fully normalized** with zero duplication.  
All word data lives in `dictionary.js` - the single source of truth.
