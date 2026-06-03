const fs = require('fs');
const path = require('path');

const dictionaryPath = path.join(__dirname, '../data/dictionary.js');
const constructsPath = path.join(__dirname, '../data/constructs.js');

const dictContent = fs.readFileSync(dictionaryPath, 'utf-8');
const wordsMatch = dictContent.match(/"words":\s*\[([\s\S]*?)\]/);
const wordsStr = wordsMatch[1];
const wordEntries = wordsStr.match(/\{[\s\S]*?\}/g);

const singleCharMap = {};
wordEntries.forEach(entry => {
  const c = entry.match(/"c":\s*"([^"]+)"/)?.[1];
  const p = entry.match(/"p":\s*"([^"]+)"/)?.[1];
  const e = entry.match(/"e":\s*"([^"]+)"/)?.[1];
  if (c && c.length === 1 && p && e) {
    singleCharMap[c] = { p, e };
  }
});

let constructsContent = fs.readFileSync(constructsPath, 'utf-8');
const entryRegex = /window\.HSK_CONSTRUCTS\["([^"]+)"\]\s*=\s*\{[\s\S]*?c:\s*"([^"]+)"[\s\S]*?p:\s*"([^"]*)"[\s\S]*?e:\s*"([^"]*)"[\s\S]*?\};/g;

let updatedCount = 0;
const newContent = constructsContent.replace(entryRegex, (match, char, c, p, e) => {
  if (!p || !e) {
    const dictEntry = singleCharMap[char];
    if (dictEntry) {
      updatedCount++;
      return `window.HSK_CONSTRUCTS["${char}"] = {
  c: "${char}",
  p: "${dictEntry.p}",
  e: "${dictEntry.e}"
};`;
    }
  }
  return match;
});

fs.writeFileSync(constructsPath, newContent, 'utf-8');
console.log('Done');
