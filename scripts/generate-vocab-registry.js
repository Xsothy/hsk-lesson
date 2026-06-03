const fs = require('fs');
const path = require('path');

const lessonsDir = path.join(__dirname, '../data/lessons');
const dictionaryPath = path.join(__dirname, '../data/dictionary.js');
const outputPath = path.join(__dirname, '../data/vocabulary.js');

const masterVocab = {};

function processContent(content) {
  // Find all objects in arrays that look like vocabulary items
  // They usually have "c": "...", "p": "...", "e": "..."
  const entryRegex = /\{\s*"c":\s*"([^"]+)"[\s\S]*?\}/g;
  let match;
  while ((match = entryRegex.exec(content)) !== null) {
    const entryStr = match[0];
    const c = match[1];
    
    if (!masterVocab[c]) masterVocab[c] = { c };
    
    const p = entryStr.match(/"p":\s*"([^"]+)"/)?.[1];
    const e = entryStr.match(/"e":\s*"([^"]+)"/)?.[1];
    const cat = entryStr.match(/"cat":\s*"([^"]+)"/)?.[1];
    const parts = entryStr.match(/"parts":\s*(\[[^\]]*\])/)?.[1];
    const literal = entryStr.match(/"literal":\s*"([^"]+)"/)?.[1];
    
    if (p) masterVocab[c].p = p;
    if (e) masterVocab[c].e = e;
    if (cat) masterVocab[c].cat = cat;
    if (parts) {
      try {
        masterVocab[c].parts = JSON.parse(parts.replace(/'/g, '"'));
      } catch (err) {}
    }
    if (literal) masterVocab[c].literal = literal;
  }
}

// 1. Process Dictionary
const dictContent = fs.readFileSync(dictionaryPath, 'utf-8');
processContent(dictContent);

// 2. Process Lessons
const lessonFiles = fs.readdirSync(lessonsDir).filter(f => f.endsWith('.js'));
lessonFiles.forEach(file => {
  const content = fs.readFileSync(path.join(lessonsDir, file), 'utf-8');
  processContent(content);
});

// 3. Generate vocabulary.js
const output = `// Central Vocabulary Registry
// This file stores the source of truth for all HSK words and their fusions.
// Lessons and Dictionary views pull data from here.

window.HSK_VOCABULARY = ${JSON.stringify(masterVocab, null, 2)};
`;

fs.writeFileSync(outputPath, output, 'utf-8');
console.log(`✓ Generated data/vocabulary.js with ${Object.keys(masterVocab).length} words`);
