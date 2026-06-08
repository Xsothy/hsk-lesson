const fs = require('fs');
const path = require('path');

const dictionaryPath = path.join(__dirname, '../data/dictionary.js');

// Read and parse the dictionary file
const content = fs.readFileSync(dictionaryPath, 'utf-8');

// Count total entries
const entryPattern = /\{\s*"c":\s*"([^"]+)"[\s\S]*?\}/g;
let totalEntries = 0;
let entriesWithLevel = 0;
let hsk1Count = 0;
let hsk2Count = 0;
let invalidLevels = [];
let entriesWithoutLevel = [];

let match;
while ((match = entryPattern.exec(content)) !== null) {
  const entry = match[0];
  const word = match[1];
  totalEntries++;
  
  const levelMatch = entry.match(/"hsk_level":\s*(\d+)/);
  if (levelMatch) {
    entriesWithLevel++;
    const level = parseInt(levelMatch[1]);
    
    if (level < 1 || level > 6) {
      invalidLevels.push({ word, level });
    } else if (level === 1) {
      hsk1Count++;
    } else if (level === 2) {
      hsk2Count++;
    }
  } else {
    entriesWithoutLevel.push(word);
  }
}

console.log('\n=== HSK Level Validation Report ===\n');
console.log(`Total dictionary entries: ${totalEntries}`);
console.log(`Entries with hsk_level field: ${entriesWithLevel}`);
console.log(`HSK Level 1 words: ${hsk1Count}`);
console.log(`HSK Level 2 words: ${hsk2Count}`);

if (entriesWithoutLevel.length > 0) {
  console.log(`\n⚠️  Entries WITHOUT hsk_level: ${entriesWithoutLevel.length}`);
  console.log('Words:', entriesWithoutLevel.join(', '));
}

if (invalidLevels.length > 0) {
  console.log(`\n❌ Entries with INVALID levels (not 1-6): ${invalidLevels.length}`);
  invalidLevels.forEach(({ word, level }) => {
    console.log(`  ${word}: ${level}`);
  });
}

if (entriesWithoutLevel.length === 0 && invalidLevels.length === 0) {
  console.log('\n✅ All validation checks passed!');
  console.log('✅ All entries have valid hsk_level field (1-6)');
  process.exit(0);
} else {
  console.log('\n❌ Validation failed!');
  process.exit(1);
}
