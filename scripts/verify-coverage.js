#!/usr/bin/env node

/**
 * verify-coverage.js
 * 
 * Verifies that all words used in lessons and readings exist in WORD_MAP.
 * This script ensures 100% word coverage before deploying renderer changes.
 * 
 * This script:
 * 1. Extracts all unique tokens from all 12 lesson files (sentences + dialogues)
 * 2. Extracts all unique tokens from data/readings.js (all reading lines)
 * 3. Compares extracted tokens against WORD_MAP keys
 * 4. Generates report listing any tokens not found in WORD_MAP
 * 5. Exits with error code if coverage < 100%
 * 
 * Usage:
 *   node scripts/verify-coverage.js
 * 
 * Exit codes:
 *   0 - Success: 100% coverage
 *   1 - Failure: Missing words found
 * 
 * Requirements validation for: Requirement 6 (Verify Complete Word Coverage)
 */

const fs = require('fs');
const path = require('path');

/**
 * Extract all unique tokens from a words array in a line object
 */
function extractTokensFromLines(lines) {
  const tokens = new Set();
  
  for (const line of lines) {
    if (line.words && Array.isArray(line.words)) {
      for (const word of line.words) {
        tokens.add(word);
      }
    }
  }
  
  return tokens;
}

/**
 * Load and parse a JavaScript data file that assigns to window.*
 */
function loadDataFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Create a mock window object to capture the data
    const mockWindow = {};
    
    // Evaluate the file content in a context with our mock window
    const func = new Function('window', content);
    func(mockWindow);
    
    return mockWindow;
  } catch (error) {
    console.error(`❌ Error loading ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Extract all unique tokens from all lesson files
 */
function extractTokensFromLessons(lessonsDir) {
  const tokens = new Set();
  const lessonFiles = [];
  
  // Get all lesson files (lesson-1.js through lesson-12.js)
  for (let i = 1; i <= 12; i++) {
    lessonFiles.push(path.join(lessonsDir, `lesson-${i}.js`));
  }
  
  console.log('📖 Extracting tokens from lesson files...');
  
  for (const lessonFile of lessonFiles) {
    if (!fs.existsSync(lessonFile)) {
      console.warn(`⚠️  Warning: ${path.basename(lessonFile)} not found`);
      continue;
    }
    
    const mockWindow = loadDataFile(lessonFile);
    if (!mockWindow) continue;
    
    // Find the lesson data in the window object
    const lessonData = mockWindow.HSK_LESSONS_BY_SLUG 
      ? Object.values(mockWindow.HSK_LESSONS_BY_SLUG)[0]
      : null;
    
    if (!lessonData) {
      console.warn(`⚠️  Warning: Could not parse ${path.basename(lessonFile)}`);
      continue;
    }
    
    // Extract tokens from sentences
    if (lessonData.sentences && Array.isArray(lessonData.sentences)) {
      const sentenceTokens = extractTokensFromLines(lessonData.sentences);
      sentenceTokens.forEach(token => tokens.add(token));
    }
    
    // Extract tokens from dialogue
    if (lessonData.dialogue && Array.isArray(lessonData.dialogue)) {
      const dialogueTokens = extractTokensFromLines(lessonData.dialogue);
      dialogueTokens.forEach(token => tokens.add(token));
    }
    
    console.log(`  ✓ ${path.basename(lessonFile)}: ${tokens.size} unique tokens so far`);
  }
  
  return tokens;
}

/**
 * Extract all unique tokens from readings file
 */
function extractTokensFromReadings(readingsFile) {
  const tokens = new Set();
  
  console.log('\n📚 Extracting tokens from readings file...');
  
  if (!fs.existsSync(readingsFile)) {
    console.error(`❌ Error: Readings file not found at ${readingsFile}`);
    return tokens;
  }
  
  const mockWindow = loadDataFile(readingsFile);
  if (!mockWindow || !mockWindow.HSK_READINGS) {
    console.error('❌ Error: Could not parse readings.js');
    return tokens;
  }
  
  const readings = mockWindow.HSK_READINGS;
  
  for (const reading of readings) {
    if (reading.lines && Array.isArray(reading.lines)) {
      const readingTokens = extractTokensFromLines(reading.lines);
      readingTokens.forEach(token => tokens.add(token));
    }
  }
  
  console.log(`  ✓ readings.js: ${tokens.size} unique tokens total`);
  
  return tokens;
}

/**
 * Load WORD_MAP from word-map.js
 */
function loadWordMap(wordMapFile) {
  console.log('\n📖 Loading WORD_MAP...');
  
  if (!fs.existsSync(wordMapFile)) {
    console.error(`❌ Error: WORD_MAP file not found at ${wordMapFile}`);
    return null;
  }
  
  try {
    const content = fs.readFileSync(wordMapFile, 'utf8');
    
    // Extract the WORD_MAP object using regex
    const match = content.match(/const\s+WORD_MAP\s*=\s*({[\s\S]*?});/);
    if (!match) {
      console.error('❌ Error: Could not find WORD_MAP definition in word-map.js');
      return null;
    }
    
    // Parse the object
    const wordMapStr = match[1];
    const wordMap = eval(`(${wordMapStr})`);
    
    console.log(`  ✓ Loaded WORD_MAP with ${Object.keys(wordMap).length} entries`);
    
    return wordMap;
  } catch (error) {
    console.error('❌ Error parsing WORD_MAP:', error.message);
    return null;
  }
}

/**
 * Compare tokens against WORD_MAP and generate report
 */
function verifyWordCoverage(allTokens, wordMap) {
  console.log('\n🔍 Verifying word coverage...\n');
  
  const missingWords = [];
  const wordMapKeys = new Set(Object.keys(wordMap));
  
  for (const token of allTokens) {
    if (!wordMapKeys.has(token)) {
      missingWords.push(token);
    }
  }
  
  // Generate report
  const totalTokens = allTokens.size;
  const coveredTokens = totalTokens - missingWords.length;
  const coveragePercent = ((coveredTokens / totalTokens) * 100).toFixed(2);
  
  console.log('═══════════════════════════════════════════════════');
  console.log('           WORD COVERAGE REPORT');
  console.log('═══════════════════════════════════════════════════');
  console.log(`Total unique tokens:    ${totalTokens}`);
  console.log(`Tokens in WORD_MAP:     ${coveredTokens}`);
  console.log(`Missing from WORD_MAP:  ${missingWords.length}`);
  console.log(`Coverage:               ${coveragePercent}%`);
  console.log('═══════════════════════════════════════════════════');
  
  if (missingWords.length > 0) {
    console.log('\n❌ MISSING WORDS:\n');
    
    // Sort missing words for better readability
    missingWords.sort();
    
    // Group by type (punctuation vs words)
    const punctuation = missingWords.filter(w => /^[^\u4e00-\u9fa5a-zA-Z0-9]+$/.test(w));
    const chineseWords = missingWords.filter(w => /[\u4e00-\u9fa5]/.test(w));
    const other = missingWords.filter(w => !punctuation.includes(w) && !chineseWords.includes(w));
    
    if (punctuation.length > 0) {
      console.log('Punctuation marks:');
      punctuation.forEach(p => console.log(`  - "${p}"`));
      console.log('  → Add these to PUNCTUATION object in build-word-map.js with empty string value');
      console.log();
    }
    
    if (chineseWords.length > 0) {
      console.log('Chinese words/characters:');
      chineseWords.forEach(w => console.log(`  - ${w}`));
      console.log('  → Add these to data/dictionary.js or PROPER_NOUNS in build-word-map.js');
      console.log();
    }
    
    if (other.length > 0) {
      console.log('Other tokens:');
      other.forEach(w => console.log(`  - ${w}`));
      console.log();
    }
    
    console.log('═══════════════════════════════════════════════════\n');
    console.log('❌ VERIFICATION FAILED: Coverage < 100%');
    console.log('   Please add missing words to WORD_MAP and re-run this script.\n');
    
    return false;
  } else {
    console.log('\n✅ SUCCESS: All words have 100% coverage in WORD_MAP!\n');
    return true;
  }
}

/**
 * Main execution
 */
function main() {
  console.log('\n🚀 Word Coverage Verification\n');
  
  // Define paths
  const rootDir = path.join(__dirname, '..');
  const lessonsDir = path.join(rootDir, 'data', 'lessons');
  const readingsFile = path.join(rootDir, 'data', 'readings.js');
  const wordMapFile = path.join(rootDir, 'js', 'word-map.js');
  
  // Extract all tokens from lessons
  const lessonTokens = extractTokensFromLessons(lessonsDir);
  
  // Extract all tokens from readings
  const readingTokens = extractTokensFromReadings(readingsFile);
  
  // Combine all tokens
  const allTokens = new Set([...lessonTokens, ...readingTokens]);
  
  console.log(`\n📊 Total unique tokens across all content: ${allTokens.size}`);
  
  // Load WORD_MAP
  const wordMap = loadWordMap(wordMapFile);
  if (!wordMap) {
    process.exit(1);
  }
  
  // Verify coverage
  const isComplete = verifyWordCoverage(allTokens, wordMap);
  
  // Exit with appropriate code
  process.exit(isComplete ? 0 : 1);
}

// Run the script
main();
