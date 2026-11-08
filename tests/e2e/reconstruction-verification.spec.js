// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Test suite for reconstruction verification
 * 
 * **Validates: Requirement 10**
 * 
 * These tests verify that the tokenization is reversible and maintains data integrity.
 * Task 3.4: Write reconstruction verification tests
 * - Test concatenating `words[]` array reconstructs original `zh` string
 * - Test no extra spaces or missing characters
 * - Test punctuation preserved in correct positions
 */

test.describe('Reconstruction Verification Tests', () => {
  let readingsData;
  let lessonsData;

  test.beforeEach(async ({ page }) => {
    // Load the readings data
    await page.goto('about:blank');
    await page.addScriptTag({ path: './data/readings.js' });
    
    // Load lesson data files
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
  });

  test('should reconstruct original zh string from words array in readings', async () => {
    // Verify all readings data
    expect(readingsData).toBeDefined();
    expect(Array.isArray(readingsData)).toBe(true);
    expect(readingsData.length).toBeGreaterThan(0);
    
    let totalLines = 0;
    let successfulReconstructions = 0;
    
    // Test each reading
    for (const reading of readingsData) {
      expect(reading.lines).toBeDefined();
      expect(Array.isArray(reading.lines)).toBe(true);
      
      // Test each line in the reading
      for (const line of reading.lines) {
        totalLines++;
        
        // Verify line has required fields
        expect(line.zh).toBeDefined();
        expect(line.words).toBeDefined();
        expect(Array.isArray(line.words)).toBe(true);
        
        // Reconstruct the original string from words array
        const reconstructed = line.words.join('');
        
        // Verify reconstruction matches original
        if (reconstructed === line.zh) {
          successfulReconstructions++;
        } else {
          console.error(`Mismatch in reading ${reading.id}, line: "${line.zh}"`);
          console.error(`  Original:       "${line.zh}"`);
          console.error(`  Reconstructed:  "${reconstructed}"`);
          console.error(`  Words array:    [${line.words.map(w => `"${w}"`).join(', ')}]`);
        }
        
        expect(reconstructed).toBe(line.zh);
      }
    }
    
    console.log(`✓ Successfully reconstructed ${successfulReconstructions}/${totalLines} reading lines`);
  });

  test('should have no extra spaces in reconstructed text', async () => {
    // Test that concatenating words doesn't introduce spaces
    for (const reading of readingsData) {
      for (const line of reading.lines) {
        const reconstructed = line.words.join('');
        
        // Check for extra spaces that weren't in original
        const originalSpaces = (line.zh.match(/ /g) || []).length;
        const reconstructedSpaces = (reconstructed.match(/ /g) || []).length;
        
        expect(reconstructedSpaces).toBe(originalSpaces);
        
        // Verify no trailing or leading spaces were added
        if (line.zh.trim() === line.zh) {
          expect(reconstructed.trim()).toBe(reconstructed);
        }
      }
    }
    
    console.log('✓ No extra spaces found in reconstructed text');
  });

  test('should have no missing characters in reconstructed text', async () => {
    // Test that all characters from original are present in reconstruction
    for (const reading of readingsData) {
      for (const line of reading.lines) {
        const reconstructed = line.words.join('');
        
        // Check length matches
        expect(reconstructed.length).toBe(line.zh.length);
        
        // Check each character is present
        for (let i = 0; i < line.zh.length; i++) {
          const originalChar = line.zh.charAt(i);
          const reconstructedChar = reconstructed.charAt(i);
          
          if (originalChar !== reconstructedChar) {
            console.error(`Character mismatch at position ${i}:`);
            console.error(`  Original:      "${line.zh}"`);
            console.error(`  Reconstructed: "${reconstructed}"`);
            console.error(`  Expected:      "${originalChar}"`);
            console.error(`  Got:           "${reconstructedChar}"`);
          }
          
          expect(reconstructedChar).toBe(originalChar);
        }
      }
    }
    
    console.log('✓ No missing characters in reconstructed text');
  });

  test('should preserve punctuation in correct positions', async () => {
    // Common Chinese punctuation marks
    const punctuationMarks = ['。', '，', '！', '？', '、', '：', '；', '…', '"', '"', '\'', '\''];
    
    for (const reading of readingsData) {
      for (const line of reading.lines) {
        // Find all punctuation marks in original text
        const originalPunctuation = [];
        for (let i = 0; i < line.zh.length; i++) {
          const char = line.zh.charAt(i);
          if (punctuationMarks.includes(char)) {
            originalPunctuation.push({ char, position: i });
          }
        }
        
        // Find all punctuation marks in reconstructed text
        const reconstructed = line.words.join('');
        const reconstructedPunctuation = [];
        for (let i = 0; i < reconstructed.length; i++) {
          const char = reconstructed.charAt(i);
          if (punctuationMarks.includes(char)) {
            reconstructedPunctuation.push({ char, position: i });
          }
        }
        
        // Verify same number of punctuation marks
        expect(reconstructedPunctuation.length).toBe(originalPunctuation.length);
        
        // Verify each punctuation mark is in the same position
        for (let i = 0; i < originalPunctuation.length; i++) {
          const original = originalPunctuation[i];
          const reconstructedItem = reconstructedPunctuation[i];
          
          expect(reconstructedItem.char).toBe(original.char);
          expect(reconstructedItem.position).toBe(original.position);
        }
      }
    }
    
    console.log('✓ All punctuation preserved in correct positions');
  });

  test('should reconstruct original zh string from words array in lesson sentences', async () => {
    expect(lessonsData).toBeDefined();
    
    let totalSentences = 0;
    let successfulReconstructions = 0;
    
    // Test each lesson
    for (const lessonSlug in lessonsData) {
      const lesson = lessonsData[lessonSlug];
      
      // Test sentences section if it exists
      if (lesson.sentences && Array.isArray(lesson.sentences)) {
        for (const sentence of lesson.sentences) {
          if (sentence.zh && sentence.words) {
            totalSentences++;
            
            const reconstructed = sentence.words.join('');
            
            if (reconstructed === sentence.zh) {
              successfulReconstructions++;
            } else {
              console.error(`Mismatch in lesson ${lesson.slug}, sentence: "${sentence.zh}"`);
              console.error(`  Original:       "${sentence.zh}"`);
              console.error(`  Reconstructed:  "${reconstructed}"`);
            }
            
            expect(reconstructed).toBe(sentence.zh);
          }
        }
      }
      
      // Test dialogue section if it exists
      if (lesson.dialogue && Array.isArray(lesson.dialogue)) {
        for (const line of lesson.dialogue) {
          if (line.zh && line.words) {
            totalSentences++;
            
            const reconstructed = line.words.join('');
            
            if (reconstructed === line.zh) {
              successfulReconstructions++;
            } else {
              console.error(`Mismatch in lesson ${lesson.slug}, dialogue: "${line.zh}"`);
              console.error(`  Original:       "${line.zh}"`);
              console.error(`  Reconstructed:  "${reconstructed}"`);
            }
            
            expect(reconstructed).toBe(line.zh);
          }
        }
      }
    }
    
    console.log(`✓ Successfully reconstructed ${successfulReconstructions}/${totalSentences} lesson sentences`);
  });

  test('should preserve punctuation in lesson dialogues and sentences', async () => {
    const punctuationMarks = ['。', '，', '！', '？', '、', '：', '；', '…', '"', '"', '\'', '\''];
    
    for (const lessonSlug in lessonsData) {
      const lesson = lessonsData[lessonSlug];
      
      // Check sentences
      if (lesson.sentences && Array.isArray(lesson.sentences)) {
        for (const sentence of lesson.sentences) {
          if (sentence.zh && sentence.words) {
            const reconstructed = sentence.words.join('');
            
            // Count punctuation in original and reconstructed
            const originalPunctCount = sentence.zh.split('').filter(c => punctuationMarks.includes(c)).length;
            const reconstructedPunctCount = reconstructed.split('').filter(c => punctuationMarks.includes(c)).length;
            
            expect(reconstructedPunctCount).toBe(originalPunctCount);
          }
        }
      }
      
      // Check dialogue
      if (lesson.dialogue && Array.isArray(lesson.dialogue)) {
        for (const line of lesson.dialogue) {
          if (line.zh && line.words) {
            const reconstructed = line.words.join('');
            
            // Count punctuation in original and reconstructed
            const originalPunctCount = line.zh.split('').filter(c => punctuationMarks.includes(c)).length;
            const reconstructedPunctCount = reconstructed.split('').filter(c => punctuationMarks.includes(c)).length;
            
            expect(reconstructedPunctCount).toBe(originalPunctCount);
          }
        }
      }
    }
    
    console.log('✓ All lesson punctuation preserved correctly');
  });

  test('should handle edge case: lines with only punctuation', async () => {
    // Test that lines with only punctuation (if any exist) reconstruct correctly
    for (const reading of readingsData) {
      for (const line of reading.lines) {
        const reconstructed = line.words.join('');
        
        // If original is only punctuation, reconstruction should match
        const isPunctuationOnly = line.zh.split('').every(c => 
          ['。', '，', '！', '？', '、', '：', '；', '…', '"', '"', '\'', '\''].includes(c)
        );
        
        if (isPunctuationOnly) {
          expect(reconstructed).toBe(line.zh);
          console.log(`  Found punctuation-only line: "${line.zh}"`);
        }
      }
    }
    
    console.log('✓ Punctuation-only lines handled correctly');
  });

  test('should handle edge case: lines with no punctuation', async () => {
    // Test that lines without punctuation (if any exist) reconstruct correctly
    const punctuationMarks = ['。', '，', '！', '？', '、', '：', '；', '…', '"', '"', '\'', '\''];
    
    let noPunctuationCount = 0;
    
    for (const reading of readingsData) {
      for (const line of reading.lines) {
        const hasPunctuation = line.zh.split('').some(c => punctuationMarks.includes(c));
        
        if (!hasPunctuation) {
          noPunctuationCount++;
          const reconstructed = line.words.join('');
          expect(reconstructed).toBe(line.zh);
        }
      }
    }
    
    console.log(`✓ Lines without punctuation handled correctly (found ${noPunctuationCount} lines)`);
  });

  test('should verify words array is non-empty for all lines', async () => {
    // Ensure no line has an empty words array
    for (const reading of readingsData) {
      for (const line of reading.lines) {
        expect(line.words).toBeDefined();
        expect(Array.isArray(line.words)).toBe(true);
        
        // Words array should not be empty unless zh is also empty
        if (line.zh.length > 0) {
          expect(line.words.length).toBeGreaterThan(0);
        }
      }
    }
    
    // Check lessons too
    for (const lessonSlug in lessonsData) {
      const lesson = lessonsData[lessonSlug];
      
      if (lesson.sentences) {
        for (const sentence of lesson.sentences) {
          if (sentence.zh && sentence.zh.length > 0) {
            expect(sentence.words).toBeDefined();
            expect(Array.isArray(sentence.words)).toBe(true);
            expect(sentence.words.length).toBeGreaterThan(0);
          }
        }
      }
      
      if (lesson.dialogue) {
        for (const line of lesson.dialogue) {
          if (line.zh && line.zh.length > 0) {
            expect(line.words).toBeDefined();
            expect(Array.isArray(line.words)).toBe(true);
            expect(line.words.length).toBeGreaterThan(0);
          }
        }
      }
    }
    
    console.log('✓ All non-empty lines have non-empty words arrays');
  });
});
