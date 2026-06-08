#!/usr/bin/env node

/**
 * tokenize-readings.js
 * 
 * Migrates readings file from v2 to v3 architecture:
 * - Removes `py` field from reading lines
 * - Adds `words[]` array by tokenizing `zh` string using WORD_MAP
 * - Uses greedy longest-match algorithm for tokenization
 * - Preserves all other fields unchanged (metadata, questions, focusWords, etc.)
 * 
 * Run: node scripts/tokenize-readings.js
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
 * Process a reading object and transform lines array
 * @param {Object} reading - Reading data object
 * @param {Object} wordMap - WORD_MAP for tokenization
 * @returns {Object} - Updated reading object
 */
function processReading(reading, wordMap) {
  const updatedReading = { ...reading };
  
  // Process lines array
  if (Array.isArray(updatedReading.lines)) {
    updatedReading.lines = updatedReading.lines.map(line => 
      processLine(line, wordMap)
    );
  }
  
  return updatedReading;
}

/**
 * Read readings file and extract readings array
 * @param {string} filePath - Path to readings file
 * @returns {Array} - Parsed readings array
 */
function readReadingsFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Extract the readings array
  const match = content.match(/window\.HSK_READINGS\s*=\s*(\[[\s\S]+\])\s*;?\s*$/);
  
  if (!match) {
    throw new Error(`Could not parse readings structure in ${filePath}`);
  }
  
  const readingsData = eval(`(${match[1]})`);
  
  return readingsData;
}

/**
 * Write updated readings data back to file
 * @param {string} filePath - Path to readings file
 * @param {Array} readingsData - Updated readings array
 */
function writeReadingsFile(filePath, readingsData) {
  // Generate formatted JavaScript file
  const output = `window.HSK_READINGS = ${JSON.stringify(readingsData, null, 4)};\n`;
  
  fs.writeFileSync(filePath, output, 'utf8');
}

/**
 * Main function
 */
function main() {
  console.log('🔄 Starting readings tokenization (v2 → v3 migration)...\n');
  
  // Load WORD_MAP
  console.log('📖 Loading WORD_MAP...');
  const wordMap = loadWordMap();
  console.log(`✅ Loaded ${Object.keys(wordMap).length} entries\n`);
  
  // Find readings file
  const readingsPath = path.join(__dirname, '..', 'data', 'readings.js');
  
  if (!fs.existsSync(readingsPath)) {
    console.error('❌ Error: readings.js not found');
    process.exit(1);
  }
  
  console.log('📚 Processing readings.js...\n');
  
  try {
    // Read readings data
    const readingsData = readReadingsFile(readingsPath);
    
    console.log(`Found ${readingsData.length} reading stories\n`);
    
    let totalLines = 0;
    
    // Process each reading
    const updatedReadings = readingsData.map(reading => {
      const lineCount = reading.lines ? reading.lines.length : 0;
      totalLines += lineCount;
      
      console.log(`📝 Processing reading #${reading.id}: "${reading.title}" (${lineCount} lines)`);
      
      return processReading(reading, wordMap);
    });
    
    // Write back to file
    writeReadingsFile(readingsPath, updatedReadings);
    
    console.log(`\n✨ Migration complete!`);
    console.log(`📊 Summary:`);
    console.log(`   - Reading stories processed: ${updatedReadings.length}`);
    console.log(`   - Total lines migrated: ${totalLines}`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Review changes with git diff`);
    console.log(`   2. Run verification script (if available)`);
    console.log(`   3. Test in browser`);
    
  } catch (error) {
    console.error(`❌ Error processing readings.js:`, error.message);
    process.exit(1);
  }
}

// Run the script
main();
