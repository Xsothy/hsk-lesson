#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Paths
const lessonsDir = path.join(__dirname, '../data/lessons');
const constructsPath = path.join(__dirname, '../data/constructs.js');

// 1. Load existing constructs to preserve data
const existingConstructs = {};
if (fs.existsSync(constructsPath)) {
  const content = fs.readFileSync(constructsPath, 'utf-8');
  // Simple regex to extract existing data
  // Matches: window.HSK_CONSTRUCTS["char"] = { c: "char", p: "pinyin", e: "meaning" };
  const entryRegex = /window\.HSK_CONSTRUCTS\["([^"]+)"\]\s*=\s*\{[\s\S]*?c:\s*"([^"]+)"[\s\S]*?p:\s*"([^"]*)"[\s\S]*?e:\s*"([^"]*)"[\s\S]*?\};/g;
  
  let match;
  while ((match = entryRegex.exec(content)) !== null) {
    const char = match[1];
    existingConstructs[char] = {
      c: match[2],
      p: match[3],
      e: match[4]
    };
  }
}

// 2. Read all lesson files and master vocabulary to find unique characters
const files = fs.readdirSync(lessonsDir).filter(f => f.endsWith('.js'));
const uniqueChars = new Set();

function extractChars(content) {
  const vocabMatches = content.matchAll(/"c":\s*"([^"]+)"/g);
  for (const match of vocabMatches) {
    const word = match[1];
    for (const char of word) {
      if (/[\u4e00-\u9fff]/.test(char)) {
        uniqueChars.add(char);
      }
    }
  }
}

// Scan master vocab
const vocabRegistryPath = path.join(__dirname, '../data/vocabulary.js');
if (fs.existsSync(vocabRegistryPath)) {
  extractChars(fs.readFileSync(vocabRegistryPath, 'utf-8'));
}

// Scan lessons
files.forEach(file => {
  extractChars(fs.readFileSync(path.join(lessonsDir, file), 'utf-8'));
});

// 3. Sort characters
const sortedChars = Array.from(uniqueChars).sort();

// 4. Generate constructs.js
const entries = sortedChars.map(char => {
  const existing = existingConstructs[char] || {};
  const p = existing.p || "";
  const e = existing.e || "";
  const todo = (!p || !e) ? " // TODO: Add pinyin/meaning" : "";

  return `window.HSK_CONSTRUCTS["${char}"] = {
  c: "${char}",
  p: "${p}",${!p ? ' // TODO: Add pinyin' : ''}
  e: "${e}"${!e ? '  // TODO: Add English meaning' : ''}
};`;
});

const output = `// Auto-generated character constructs registry
// Characters extracted from all lesson vocabulary
// Stroke data loaded dynamically via Hanzi Writer API

window.HSK_CONSTRUCTS = window.HSK_CONSTRUCTS || {};

${entries.join('\n\n')}
`;

fs.writeFileSync(constructsPath, output, 'utf-8');

console.log(`✓ Scanned ${files.length} lessons`);
console.log(`✓ Extracted ${sortedChars.length} unique characters`);
console.log(`✓ Preserved ${Object.keys(existingConstructs).length} existing entries`);
console.log(`✓ Updated data/constructs.js`);
