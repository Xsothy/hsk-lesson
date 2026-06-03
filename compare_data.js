const fs = require('fs');

const allLessonWords = JSON.parse(fs.readFileSync('all_lesson_words.json', 'utf8'));

// Load dictionary
const dictionaryContent = fs.readFileSync('/home/sothylor/Documents/Workspace/hsk-lesson/data/dictionary.js', 'utf8');
const dictionaryMatch = dictionaryContent.match(/window\.HSK_DICTIONARY\s*=\s*(\{[\s\S]*?\});/);
const dictionary = eval('(' + dictionaryMatch[1] + ')');

// Load vocabulary
const vocabularyContent = fs.readFileSync('/home/sothylor/Documents/Workspace/hsk-lesson/data/vocabulary.js', 'utf8');
const vocabularyMatch = vocabularyContent.match(/window\.HSK_VOCABULARY\s*=\s*(\{[\s\S]*?\});/);
const vocabulary = eval('(' + vocabularyMatch[1] + ')');

const missingInDict = [];
const missingInVocab = [];

const dictWordsMap = new Map();
dictionary.words.forEach(w => dictWordsMap.set(w.c, w));

allLessonWords.forEach(wordObj => {
    const c = wordObj.c;
    if (!dictWordsMap.has(c)) {
        missingInDict.push(wordObj);
    }
    
    // Check for multi-character words missing in vocabulary
    if (c.length > 1 && !vocabulary[c]) {
        missingInVocab.push(c);
    }
});

console.log('--- MISSING IN DICTIONARY ---');
console.log(JSON.stringify(missingInDict, null, 2));
console.log('\n--- MISSING IN VOCABULARY BREAKDOWN ---');
console.log(JSON.stringify(missingInVocab, null, 2));
