#!/usr/bin/env node

/**
 * tokenize-lessons.js
 * 
 * Migrates lesson files from v2 to v3 architecture:
 * - Removes `py` field from sentences and dialogues
 * - Adds `words[]` array by tokenizing `zh` string using WORD_MAP
 * - Uses greedy longest-match algorithm for tokenization
 * - Preserves all other fields unchanged
 * 
 * Run: node scripts/tokenize-lessons.js
 */

const fs = require('fs');
const path = require('path');

// Load WORD_MAP for tokenization
function loadWordMap() {
  const wordMapPath = path.join(__dirname, '..', 'js', 'word-map.js');
  
  if (!fs.existsSync(wordMapPath)) {
    console.error('❌ Error: word-map.js not found. Run build-word-map.js first.');
    process.exit(1);
  }

  const wordMapContent = fs.readFileSync(wordMapPath, 'utf8');
  
  // Extract WORD_MAP object from the file
  const wordMapMatch = wordMapContent.match(/const WORD_MAP\s*=\s*({[\s\S]+?})\s*;/);
  
  if (!wordMapMatch) {
    console.error('❌ Error: Could not parse WORD_MAP structure');
    process.exit(1);
  }

  try {
    return eval(`(${wordMapMatch[1]})`);
  } catch (error) {
    console.error('❌ Error parsing WORD_MAP:', error.message);
    process.exit(1);
  }
}

/**
 * Tokenize Chinese text using greedy longest-match algorithm
 * @param {string} text - Chinese text to tokenize
 * @param {Object} wordMap - WORD_MAP object for word boundary detection
 * @returns {string[]} - Array of tokens (words and punctuation)
 */
function tokenize(text, wordMap) {
  const tokens = [];
  let position = 0;
  
  // Get sorted keys by length (longest first) for greedy matching
  const wordMapKeys = Object.keys(wordMap).sort((a, b) => b.length - a.length);
  const maxWordLength = Math.max(...wordMapKeys.map(k => k.length));
  
  while (position < text.length) {
    let matched = false;
    
    // Try to match longest possible word first (greedy)
    for (let length = Math.min(maxWordLength, text.length - position); length >= 1; length--) {
      const substring = text.substring(position, position + length);
      
      if (wordMap.hasOwnProperty(substring)) {
        tokens.push(substring);
        position += length;
        matched = true;
        break;
      }
    }
    
    // If no match found, take single character (fallback)
    if (!matched) {
      const char = text.charAt(position);
      tokens.push(char);
      console.warn(`⚠️  Character "${char}" not found in WORD_MAP (fallback to single char)`);
      position++;
    }
  }
  
  return tokens;
}

/**
 * Process a line object by removing py and adding words[]
 * @param {Object} line - Line object with zh and py fields
 * @param {Object} wordMap - WORD_MAP for tokenization
 * @returns {Object} - Updated line object with words[] instead of py
 */
function processLine(line, wordMap) {
  const updatedLine = { ...line };
  
  // Remove py field if present
  if (updatedLine.hasOwnProperty('py')) {
    delete updatedLine.py;
  }
  
  // Add words[] array by tokenizing zh
  if (updatedLine.zh) {
    updatedLine.words = tokenize(updatedLine.zh, wordMap);
  }
  
  return updatedLine;
}

/**
 * Process a lesson object and transform sentences and dialogue arrays
 * @param {Object} lesson - Lesson data object
 * @param {Object} wordMap - WORD_MAP for tokenization
 * @returns {Object} - Updated lesson object
 */
function processLesson(lesson, wordMap) {
  const updatedLesson = { ...lesson };
  
  // Process sentences array
  if (Array.isArray(updatedLesson.sentences)) {
    updatedLesson.sentences = updatedLesson.sentences.map(sentence => 
      processLine(sentence, wordMap)
    );
  }
  
  // Process dialogue array
  if (Array.isArray(updatedLesson.dialogue)) {
    updatedLesson.dialogue = updatedLesson.dialogue.map(line => 
      processLine(line, wordMap)
    );
  }
  
  return updatedLesson;
}

/**
 * Read lesson file and extract lesson data object
 * @param {string} filePath - Path to lesson file
 * @returns {Object} - Parsed lesson object and slug
 */
function readLessonFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Extract the lesson slug and data
  const slugMatch = content.match(/window\.HSK_LESSONS_BY_SLUG\["([^"]+)"\]\s*=\s*({[\s\S]+})\s*;?\s*$/);
  
  if (!slugMatch) {
    throw new Error(`Could not parse lesson structure in ${filePath}`);
  }
  
  const slug = slugMatch[1];
  const lessonData = eval(`(${slugMatch[2]})`);
  
  return { slug, lessonData };
}

/**
 * Write updated lesson data back to file
 * @param {string} filePath - Path to lesson file
 * @param {string} slug - Lesson slug
 * @param {Object} lessonData - Updated lesson data
 */
function writeLessonFile(filePath, slug, lessonData) {
  // Generate formatted JavaScript file
  const output = `window.HSK_LESSONS_BY_SLUG = window.HSK_LESSONS_BY_SLUG || {};
window.HSK_LESSONS_BY_SLUG["${slug}"] = ${JSON.stringify(lessonData, null, 2)};
`;
  
  fs.writeFileSync(filePath, output, 'utf8');
}

/**
 * Main function
 */
function main() {
  console.log('🔄 Starting lesson tokenization (v2 → v3 migration)...\n');
  
  // Load WORD_MAP
  console.log('📖 Loading WORD_MAP...');
  const wordMap = loadWordMap();
  console.log(`✅ Loaded ${Object.keys(wordMap).length} entries\n`);
  
  // Find all lesson files
  const lessonsDir = path.join(__dirname, '..', 'data', 'lessons');
  const lessonFiles = fs.readdirSync(lessonsDir)
    .filter(file => file.startsWith('lesson-') && file.endsWith('.js'))
    .sort(); // Process in order
  
  console.log(`📚 Found ${lessonFiles.length} lesson files to process\n`);
  
  let totalSentences = 0;
  let totalDialogueLines = 0;
  
  // Process each lesson file
  for (const filename of lessonFiles) {
    const filePath = path.join(lessonsDir, filename);
    console.log(`📝 Processing ${filename}...`);
    
    try {
      // Read lesson data
      const { slug, lessonData } = readLessonFile(filePath);
      
      // Count items
      const sentenceCount = lessonData.sentences ? lessonData.sentences.length : 0;
      const dialogueCount = lessonData.dialogue ? lessonData.dialogue.length : 0;
      
      // Process lesson
      const updatedLesson = processLesson(lessonData, wordMap);
      
      // Write back to file
      writeLessonFile(filePath, slug, updatedLesson);
      
      console.log(`   ✅ ${sentenceCount} sentences, ${dialogueCount} dialogue lines`);
      
      totalSentences += sentenceCount;
      totalDialogueLines += dialogueCount;
      
    } catch (error) {
      console.error(`   ❌ Error processing ${filename}:`, error.message);
      process.exit(1);
    }
  }
  
  console.log(`\n✨ Migration complete!`);
  console.log(`📊 Summary:`);
  console.log(`   - Lesson files processed: ${lessonFiles.length}`);
  console.log(`   - Total sentences: ${totalSentences}`);
  console.log(`   - Total dialogue lines: ${totalDialogueLines}`);
  console.log(`   - Total lines migrated: ${totalSentences + totalDialogueLines}`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Review changes with git diff`);
  console.log(`   2. Run verification script (if available)`);
  console.log(`   3. Test in browser`);
}

// Run the script
main();
