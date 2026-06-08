// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Test suite for WORD_MAP integrity
 * 
 * These tests verify that the generated WORD_MAP has the correct structure
 * and data types as specified in Requirement 10.
 */

test.describe('WORD_MAP Integrity Tests', () => {
  let WORD_MAP;

  test.beforeEach(async ({ page }) => {
    // Load word-map.js in a browser context
    await page.goto('about:blank');
    await page.addScriptTag({ path: './js/word-map.js' });
    
    // Extract WORD_MAP from the page
    WORD_MAP = await page.evaluate(() => window.WORD_MAP);
  });

  test('all values should be strings (no undefined, null, or objects)', async () => {
    const entries = Object.entries(WORD_MAP);
    const invalidEntries = [];

    for (const [key, value] of entries) {
      if (typeof value !== 'string') {
        invalidEntries.push({
          key,
          value,
          type: typeof value,
          isNull: value === null,
          isUndefined: value === undefined
        });
      }
    }

    // Report all invalid entries if any
    if (invalidEntries.length > 0) {
      console.log('Invalid entries found:', invalidEntries);
    }

    expect(invalidEntries).toHaveLength(0);
  });

  test('punctuation entries should map to empty string', async () => {
    // List of punctuation marks that should be in WORD_MAP
    const punctuationMarks = ['。', '，', '！', '？', '、', '：', '；', '…'];
    const invalidPunctuation = [];

    for (const punct of punctuationMarks) {
      if (punct in WORD_MAP) {
        if (WORD_MAP[punct] !== '') {
          invalidPunctuation.push({
            punctuation: punct,
            actualValue: WORD_MAP[punct]
          });
        }
      }
    }

    // Report all invalid punctuation mappings if any
    if (invalidPunctuation.length > 0) {
      console.log('Punctuation with non-empty mappings:', invalidPunctuation);
    }

    expect(invalidPunctuation).toHaveLength(0);
  });

  test('no duplicate keys should exist', async () => {
    const keys = Object.keys(WORD_MAP);
    const uniqueKeys = new Set(keys);

    // In JavaScript objects, keys are automatically unique by definition
    // This test verifies that the key count matches unique key count
    // (which should always be true for objects, but good to validate)
    expect(keys.length).toBe(uniqueKeys.size);
  });

  test('proper noun pinyin should use capital first letter', async () => {
    // Known proper nouns from the design document:
    // - Names: 李华 (Lǐ Huá), 王芳 (Wáng Fāng), 陈明 (Chén Míng), 李明 (Lǐ Míng)
    // - Places: 北京 (Běijīng), 中国 (Zhōngguó)
    // - Languages: 汉语 (Hànyǔ)
    
    const properNouns = {
      '李华': 'Lǐ Huá',
      '王芳': 'Wáng Fāng',
      '陈明': 'Chén Míng',
      '李明': 'Lǐ Míng',
      '北京': 'Běijīng',
      '中国': 'Zhōngguó',
      '汉语': 'Hànyǔ'
    };

    const incorrectCapitalization = [];

    for (const [noun, expectedPinyin] of Object.entries(properNouns)) {
      if (noun in WORD_MAP) {
        const actualPinyin = WORD_MAP[noun];
        
        // Check if first letter is capitalized
        const firstLetter = actualPinyin.charAt(0);
        if (firstLetter !== firstLetter.toUpperCase()) {
          incorrectCapitalization.push({
            noun,
            expected: expectedPinyin,
            actual: actualPinyin,
            issue: 'First letter not capitalized'
          });
        }
        
        // For multi-part names (with space), check each part
        if (actualPinyin.includes(' ')) {
          const parts = actualPinyin.split(' ');
          parts.forEach((part, index) => {
            const partFirstLetter = part.charAt(0);
            if (partFirstLetter !== partFirstLetter.toUpperCase()) {
              incorrectCapitalization.push({
                noun,
                expected: expectedPinyin,
                actual: actualPinyin,
                issue: `Part ${index + 1} ("${part}") not capitalized`
              });
            }
          });
        }
      } else {
        incorrectCapitalization.push({
          noun,
          expected: expectedPinyin,
          actual: 'MISSING',
          issue: 'Proper noun not found in WORD_MAP'
        });
      }
    }

    // Report all capitalization issues if any
    if (incorrectCapitalization.length > 0) {
      console.log('Proper nouns with incorrect capitalization:', incorrectCapitalization);
    }

    expect(incorrectCapitalization).toHaveLength(0);
  });

  test('WORD_MAP should be a flat object (not nested)', async () => {
    const entries = Object.entries(WORD_MAP);
    const nestedEntries = [];

    for (const [key, value] of entries) {
      if (typeof value === 'object' && value !== null) {
        nestedEntries.push({ key, value });
      }
    }

    expect(nestedEntries).toHaveLength(0);
  });

  test('WORD_MAP should contain expected vocabulary size', async () => {
    const entryCount = Object.keys(WORD_MAP).length;
    
    // According to design document:
    // ~380 words from dictionary + ~20 proper nouns + ~10 punctuation marks = ~410 entries
    // We'll check that it's within a reasonable range (380-450)
    console.log(`WORD_MAP contains ${entryCount} entries`);
    
    expect(entryCount).toBeGreaterThanOrEqual(380);
    expect(entryCount).toBeLessThanOrEqual(450);
  });

  test('all keys should be non-empty strings', async () => {
    const keys = Object.keys(WORD_MAP);
    const invalidKeys = keys.filter(key => key === '' || typeof key !== 'string');

    if (invalidKeys.length > 0) {
      console.log('Invalid keys found:', invalidKeys);
    }

    expect(invalidKeys).toHaveLength(0);
  });

  test('pinyin values should not contain invalid characters', async () => {
    const entries = Object.entries(WORD_MAP);
    const invalidPinyinEntries = [];

    for (const [key, value] of entries) {
      // Skip punctuation (empty strings are valid)
      if (value === '') continue;

      // Pinyin should only contain:
      // - Latin letters (a-z, A-Z)
      // - Tone marks (ā á ǎ à ē é ě è ī í ǐ ì ō ó ǒ ò ū ú ǔ ù ǖ ǘ ǚ ǜ ü)
      // - Spaces (for multi-character words)
      // - Apostrophes (for separating syllables like nǚ'ér)
      const validPinyinPattern = /^[a-zA-ZāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüÜ ']+$/;

      if (!validPinyinPattern.test(value)) {
        invalidPinyinEntries.push({
          key,
          pinyin: value
        });
      }
    }

    if (invalidPinyinEntries.length > 0) {
      console.log('Entries with invalid pinyin characters:', invalidPinyinEntries);
    }

    expect(invalidPinyinEntries).toHaveLength(0);
  });
});
