// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Test suite for migration verification
 * 
 * **Validates: Requirement 10**
 * 
 * Task 5.3: Write migration verification tests
 * These tests validate that the v2 to v3 migration was successful by verifying:
 * - All 12 lesson files contain no `py` arrays in sentences
 * - All 12 lesson files contain no `py` strings in dialogues
 * - `data/readings.js` contains no `py` strings
 * - All reading lines have `words[]` array
 * - All sentence objects have `words[]` array
 * - All dialogue objects have `words[]` array
 * - All dictionary entries have `hsk_level` field
 * - `hsk_level` values are integers between 1-6
 */

test.describe('Migration Verification Tests', () => {
  let readingsData;
  let lessonsData;
  let dictionaryData;

  test.beforeEach(async ({ page }) => {
    // Load all data files in browser context
    await page.goto('about:blank');
    
    // Load readings data
    await page.addScriptTag({ path: './data/readings.js' });
    
    // Load dictionary data
    await page.addScriptTag({ path: './data/dictionary.js' });
    
    // Load all 12 lesson files
    const lessonFiles = [
      './data/lessons/lesson-1.js',
      './data/lessons/lesson-2.js',
      './data/lessons/lesson-3.js',
      './data/lessons/lesson-4.js',
      './data/lessons/lesson-5.js',
      './data/lessons/lesson-6.js',
      './data/lessons/lesson-7.js',
      './data/lessons/lesson-8.js',
      './data/lessons/lesson-9.js',
      './data/lessons/lesson-10.js',
      './data/lessons/lesson-11.js',
      './data/lessons/lesson-12.js'
    ];
    
    for (const lessonFile of lessonFiles) {
      await page.addScriptTag({ path: lessonFile });
    }
    
    // Extract data from the page
    readingsData = await page.evaluate(() => window.HSK_READINGS);
    lessonsData = await page.evaluate(() => window.HSK_LESSONS_BY_SLUG);
    dictionaryData = await page.evaluate(() => window.HSK_DICTIONARY);
  });

  test('all 12 lesson files should contain no py arrays in sentences', async () => {
    expect(lessonsData).toBeDefined();
    
    const lessonSlugs = Object.keys(lessonsData);
    expect(lessonSlugs.length).toBe(12);
    
    let totalSentencesChecked = 0;
    const lessonsWithPyArrays = [];
    
    for (const lessonSlug in lessonsData) {
      const lesson = lessonsData[lessonSlug];
      
      // Check sentences section
      if (lesson.sentences && Array.isArray(lesson.sentences)) {
        for (let i = 0; i < lesson.sentences.length; i++) {
          const sentence = lesson.sentences[i];
          totalSentencesChecked++;
          
          // Verify no 'py' field exists
          if (sentence.hasOwnProperty('py')) {
            lessonsWithPyArrays.push({
              lesson: lesson.slug,
              sentenceIndex: i,
              sentence: sentence.zh,
              pyValue: sentence.py
            });
          }
          
          expect(sentence.hasOwnProperty('py')).toBe(false);
        }
      }
    }
    
    if (lessonsWithPyArrays.length > 0) {
      console.error('Found sentences with py arrays:', lessonsWithPyArrays);
    }
    
    console.log(`✓ Verified ${totalSentencesChecked} sentences across 12 lessons have no py arrays`);
    expect(lessonsWithPyArrays).toHaveLength(0);
  });

  test('all 12 lesson files should contain no py strings in dialogues', async () => {
    expect(lessonsData).toBeDefined();
    
    let totalDialoguesChecked = 0;
    const dialoguesWithPyStrings = [];
    
    for (const lessonSlug in lessonsData) {
      const lesson = lessonsData[lessonSlug];
      
      // Check dialogue section
      if (lesson.dialogue && Array.isArray(lesson.dialogue)) {
        for (let i = 0; i < lesson.dialogue.length; i++) {
          const line = lesson.dialogue[i];
          totalDialoguesChecked++;
          
          // Verify no 'py' field exists
          if (line.hasOwnProperty('py')) {
            dialoguesWithPyStrings.push({
              lesson: lesson.slug,
              dialogueIndex: i,
              line: line.zh,
              pyValue: line.py
            });
          }
          
          expect(line.hasOwnProperty('py')).toBe(false);
        }
      }
    }
    
    if (dialoguesWithPyStrings.length > 0) {
      console.error('Found dialogue lines with py strings:', dialoguesWithPyStrings);
    }
    
    console.log(`✓ Verified ${totalDialoguesChecked} dialogue lines across 12 lessons have no py strings`);
    expect(dialoguesWithPyStrings).toHaveLength(0);
  });

  test('data/readings.js should contain no py strings', async () => {
    expect(readingsData).toBeDefined();
    expect(Array.isArray(readingsData)).toBe(true);
    expect(readingsData.length).toBeGreaterThan(0);
    
    let totalLinesChecked = 0;
    const linesWithPyStrings = [];
    
    for (const reading of readingsData) {
      expect(reading.lines).toBeDefined();
      expect(Array.isArray(reading.lines)).toBe(true);
      
      for (let i = 0; i < reading.lines.length; i++) {
        const line = reading.lines[i];
        totalLinesChecked++;
        
        // Verify no 'py' field exists
        if (line.hasOwnProperty('py')) {
          linesWithPyStrings.push({
            readingId: reading.id,
            readingTitle: reading.title,
            lineIndex: i,
            line: line.zh,
            pyValue: line.py
          });
        }
        
        expect(line.hasOwnProperty('py')).toBe(false);
      }
    }
    
    if (linesWithPyStrings.length > 0) {
      console.error('Found reading lines with py strings:', linesWithPyStrings);
    }
    
    console.log(`✓ Verified ${totalLinesChecked} reading lines have no py strings`);
    expect(linesWithPyStrings).toHaveLength(0);
  });

  test('all reading lines should have words[] array', async () => {
    expect(readingsData).toBeDefined();
    
    let totalLinesChecked = 0;
    const linesWithoutWordsArray = [];
    
    for (const reading of readingsData) {
      for (let i = 0; i < reading.lines.length; i++) {
        const line = reading.lines[i];
        totalLinesChecked++;
        
        // Verify 'words' field exists and is an array
        if (!line.hasOwnProperty('words')) {
          linesWithoutWordsArray.push({
            readingId: reading.id,
            readingTitle: reading.title,
            lineIndex: i,
            line: line.zh
          });
        } else if (!Array.isArray(line.words)) {
          linesWithoutWordsArray.push({
            readingId: reading.id,
            readingTitle: reading.title,
            lineIndex: i,
            line: line.zh,
            wordsType: typeof line.words
          });
        }
        
        expect(line.hasOwnProperty('words')).toBe(true);
        expect(Array.isArray(line.words)).toBe(true);
      }
    }
    
    if (linesWithoutWordsArray.length > 0) {
      console.error('Found reading lines without words[] array:', linesWithoutWordsArray);
    }
    
    console.log(`✓ Verified ${totalLinesChecked} reading lines have words[] array`);
    expect(linesWithoutWordsArray).toHaveLength(0);
  });

  test('all sentence objects should have words[] array', async () => {
    expect(lessonsData).toBeDefined();
    
    let totalSentencesChecked = 0;
    const sentencesWithoutWordsArray = [];
    
    for (const lessonSlug in lessonsData) {
      const lesson = lessonsData[lessonSlug];
      
      if (lesson.sentences && Array.isArray(lesson.sentences)) {
        for (let i = 0; i < lesson.sentences.length; i++) {
          const sentence = lesson.sentences[i];
          totalSentencesChecked++;
          
          // Verify 'words' field exists and is an array
          if (!sentence.hasOwnProperty('words')) {
            sentencesWithoutWordsArray.push({
              lesson: lesson.slug,
              sentenceIndex: i,
              sentence: sentence.zh
            });
          } else if (!Array.isArray(sentence.words)) {
            sentencesWithoutWordsArray.push({
              lesson: lesson.slug,
              sentenceIndex: i,
              sentence: sentence.zh,
              wordsType: typeof sentence.words
            });
          }
          
          expect(sentence.hasOwnProperty('words')).toBe(true);
          expect(Array.isArray(sentence.words)).toBe(true);
        }
      }
    }
    
    if (sentencesWithoutWordsArray.length > 0) {
      console.error('Found sentences without words[] array:', sentencesWithoutWordsArray);
    }
    
    console.log(`✓ Verified ${totalSentencesChecked} sentences have words[] array`);
    expect(sentencesWithoutWordsArray).toHaveLength(0);
  });

  test('all dialogue objects should have words[] array', async () => {
    expect(lessonsData).toBeDefined();
    
    let totalDialoguesChecked = 0;
    const dialoguesWithoutWordsArray = [];
    
    for (const lessonSlug in lessonsData) {
      const lesson = lessonsData[lessonSlug];
      
      if (lesson.dialogue && Array.isArray(lesson.dialogue)) {
        for (let i = 0; i < lesson.dialogue.length; i++) {
          const line = lesson.dialogue[i];
          totalDialoguesChecked++;
          
          // Verify 'words' field exists and is an array
          if (!line.hasOwnProperty('words')) {
            dialoguesWithoutWordsArray.push({
              lesson: lesson.slug,
              dialogueIndex: i,
              line: line.zh
            });
          } else if (!Array.isArray(line.words)) {
            dialoguesWithoutWordsArray.push({
              lesson: lesson.slug,
              dialogueIndex: i,
              line: line.zh,
              wordsType: typeof line.words
            });
          }
          
          expect(line.hasOwnProperty('words')).toBe(true);
          expect(Array.isArray(line.words)).toBe(true);
        }
      }
    }
    
    if (dialoguesWithoutWordsArray.length > 0) {
      console.error('Found dialogue lines without words[] array:', dialoguesWithoutWordsArray);
    }
    
    console.log(`✓ Verified ${totalDialoguesChecked} dialogue lines have words[] array`);
    expect(dialoguesWithoutWordsArray).toHaveLength(0);
  });

  test('all dictionary entries should have hsk_level field', async () => {
    expect(dictionaryData).toBeDefined();
    expect(dictionaryData.words).toBeDefined();
    expect(Array.isArray(dictionaryData.words)).toBe(true);
    
    const totalWords = dictionaryData.words.length;
    const wordsWithoutHskLevel = [];
    
    for (let i = 0; i < dictionaryData.words.length; i++) {
      const word = dictionaryData.words[i];
      
      // Verify 'hsk_level' field exists
      if (!word.hasOwnProperty('hsk_level')) {
        wordsWithoutHskLevel.push({
          index: i,
          word: word.c,
          pinyin: word.p,
          english: word.e
        });
      }
      
      expect(word.hasOwnProperty('hsk_level')).toBe(true);
    }
    
    if (wordsWithoutHskLevel.length > 0) {
      console.error('Found dictionary entries without hsk_level field:', wordsWithoutHskLevel);
    }
    
    console.log(`✓ Verified all ${totalWords} dictionary entries have hsk_level field`);
    expect(wordsWithoutHskLevel).toHaveLength(0);
  });

  test('hsk_level values should be integers between 1-6', async () => {
    expect(dictionaryData).toBeDefined();
    expect(dictionaryData.words).toBeDefined();
    
    const totalWords = dictionaryData.words.length;
    const invalidHskLevels = [];
    
    for (let i = 0; i < dictionaryData.words.length; i++) {
      const word = dictionaryData.words[i];
      
      if (word.hasOwnProperty('hsk_level')) {
        const hskLevel = word.hsk_level;
        
        // Check if it's an integer
        if (!Number.isInteger(hskLevel)) {
          invalidHskLevels.push({
            index: i,
            word: word.c,
            hsk_level: hskLevel,
            type: typeof hskLevel,
            issue: 'Not an integer'
          });
        }
        // Check if it's between 1-6
        else if (hskLevel < 1 || hskLevel > 6) {
          invalidHskLevels.push({
            index: i,
            word: word.c,
            hsk_level: hskLevel,
            issue: 'Not in range 1-6'
          });
        }
        
        expect(Number.isInteger(hskLevel)).toBe(true);
        expect(hskLevel).toBeGreaterThanOrEqual(1);
        expect(hskLevel).toBeLessThanOrEqual(6);
      }
    }
    
    if (invalidHskLevels.length > 0) {
      console.error('Found dictionary entries with invalid hsk_level values:', invalidHskLevels);
    }
    
    console.log(`✓ Verified all ${totalWords} dictionary entries have valid hsk_level (1-6)`);
    expect(invalidHskLevels).toHaveLength(0);
  });

  test('comprehensive migration check: all 12 lessons migrated correctly', async () => {
    expect(lessonsData).toBeDefined();
    
    const lessonSlugs = Object.keys(lessonsData);
    expect(lessonSlugs.length).toBe(12);
    
    const migrationSummary = {
      totalLessons: 0,
      sentencesChecked: 0,
      dialoguesChecked: 0,
      allValid: true,
      issues: []
    };
    
    for (const lessonSlug in lessonsData) {
      const lesson = lessonsData[lessonSlug];
      migrationSummary.totalLessons++;
      
      // Check sentences
      if (lesson.sentences && Array.isArray(lesson.sentences)) {
        for (const sentence of lesson.sentences) {
          migrationSummary.sentencesChecked++;
          
          // Should have words[], not py
          if (sentence.hasOwnProperty('py')) {
            migrationSummary.allValid = false;
            migrationSummary.issues.push(`${lesson.slug}: sentence has py field`);
          }
          if (!sentence.hasOwnProperty('words')) {
            migrationSummary.allValid = false;
            migrationSummary.issues.push(`${lesson.slug}: sentence missing words array`);
          }
        }
      }
      
      // Check dialogues
      if (lesson.dialogue && Array.isArray(lesson.dialogue)) {
        for (const line of lesson.dialogue) {
          migrationSummary.dialoguesChecked++;
          
          // Should have words[], not py
          if (line.hasOwnProperty('py')) {
            migrationSummary.allValid = false;
            migrationSummary.issues.push(`${lesson.slug}: dialogue has py field`);
          }
          if (!line.hasOwnProperty('words')) {
            migrationSummary.allValid = false;
            migrationSummary.issues.push(`${lesson.slug}: dialogue missing words array`);
          }
        }
      }
    }
    
    console.log('Migration Summary:');
    console.log(`  Total lessons checked: ${migrationSummary.totalLessons}`);
    console.log(`  Total sentences checked: ${migrationSummary.sentencesChecked}`);
    console.log(`  Total dialogues checked: ${migrationSummary.dialoguesChecked}`);
    console.log(`  All valid: ${migrationSummary.allValid}`);
    
    if (!migrationSummary.allValid) {
      console.error('Migration issues:', migrationSummary.issues);
    }
    
    expect(migrationSummary.allValid).toBe(true);
    expect(migrationSummary.issues).toHaveLength(0);
  });

  test('comprehensive readings migration check', async () => {
    expect(readingsData).toBeDefined();
    expect(Array.isArray(readingsData)).toBe(true);
    
    const readingsSummary = {
      totalReadings: readingsData.length,
      totalLinesChecked: 0,
      allValid: true,
      issues: []
    };
    
    for (const reading of readingsData) {
      for (const line of reading.lines) {
        readingsSummary.totalLinesChecked++;
        
        // Should have words[], not py
        if (line.hasOwnProperty('py')) {
          readingsSummary.allValid = false;
          readingsSummary.issues.push(`Reading ${reading.id}: line has py field`);
        }
        if (!line.hasOwnProperty('words')) {
          readingsSummary.allValid = false;
          readingsSummary.issues.push(`Reading ${reading.id}: line missing words array`);
        }
        if (!Array.isArray(line.words)) {
          readingsSummary.allValid = false;
          readingsSummary.issues.push(`Reading ${reading.id}: words is not an array`);
        }
      }
    }
    
    console.log('Readings Migration Summary:');
    console.log(`  Total readings checked: ${readingsSummary.totalReadings}`);
    console.log(`  Total lines checked: ${readingsSummary.totalLinesChecked}`);
    console.log(`  All valid: ${readingsSummary.allValid}`);
    
    if (!readingsSummary.allValid) {
      console.error('Readings migration issues:', readingsSummary.issues);
    }
    
    expect(readingsSummary.allValid).toBe(true);
    expect(readingsSummary.issues).toHaveLength(0);
  });

  test('verify dictionary has expected HSK1 coverage', async () => {
    expect(dictionaryData).toBeDefined();
    expect(dictionaryData.words).toBeDefined();
    
    // Count words by HSK level
    const hskLevelCounts = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0
    };
    
    for (const word of dictionaryData.words) {
      if (word.hsk_level && hskLevelCounts.hasOwnProperty(word.hsk_level)) {
        hskLevelCounts[word.hsk_level]++;
      }
    }
    
    console.log('HSK Level Distribution:');
    console.log(`  HSK 1: ${hskLevelCounts[1]} words`);
    console.log(`  HSK 2: ${hskLevelCounts[2]} words`);
    console.log(`  HSK 3: ${hskLevelCounts[3]} words`);
    console.log(`  HSK 4: ${hskLevelCounts[4]} words`);
    console.log(`  HSK 5: ${hskLevelCounts[5]} words`);
    console.log(`  HSK 6: ${hskLevelCounts[6]} words`);
    console.log(`  Total: ${dictionaryData.words.length} words`);
    
    // According to design document, approximately 150 words should be HSK1
    // We'll check that it's within a reasonable range (150-350 to account for actual data)
    expect(hskLevelCounts[1]).toBeGreaterThanOrEqual(150);
    expect(hskLevelCounts[1]).toBeLessThanOrEqual(350);
    
    console.log(`✓ HSK1 word count (${hskLevelCounts[1]}) is within expected range (150-350)`);
  });
});
