#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Read all lesson files
const lessonsDir = path.join(__dirname, '../data/lessons');
const files = fs.readdirSync(lessonsDir).filter(f => f.endsWith('.js'));

const uniqueChars = new Set();

files.forEach(file => {
  const content = fs.readFileSync(path.join(lessonsDir, file), 'utf-8');
  
  // Extract vocab items - look for "c": "..." pattern
  const vocabMatches = content.matchAll(/"c":\s*"([^"]+)"/g);
  
  for (const match of vocabMatches) {
    const word = match[1];
    // Split into individual characters
    for (const char of word) {
      // Only Chinese characters (Unicode range for CJK)
      if (/[\u4e00-\u9fff]/.test(char)) {
        uniqueChars.add(char);
      }
    }
  }
});

// Sort characters
const sortedChars = Array.from(uniqueChars).sort();

// Generate constructs.js
const output = `// Auto-generated character constructs registry
// Characters extracted from all lesson vocabulary
// Stroke data loaded dynamically via Hanzi Writer API

window.HSK_CONSTRUCTS = window.HSK_CONSTRUCTS || {};

${sortedChars.map(char => {
  return `window.HSK_CONSTRUCTS["${char}"] = {
  c: "${char}",
  p: "", // TODO: Add pinyin
  e: ""  // TODO: Add English meaning
};`;
}).join('\n\n')}
`;

const outputPath = path.join(__dirname, '../data/constructs.js');
fs.writeFileSync(outputPath, output, 'utf-8');

console.log(`✓ Extracted ${sortedChars.length} unique characters`);
console.log(`✓ Generated data/constructs.js`);
console.log(`\nSample characters: ${sortedChars.slice(0, 10).join(', ')}...`);
