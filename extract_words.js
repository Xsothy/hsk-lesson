const fs = require('fs');
const path = require('path');

const lessonsDir = '/home/sothylor/Documents/Workspace/hsk-lesson/data/lessons';
const files = fs.readdirSync(lessonsDir).filter(f => f.startsWith('lesson-') && f.endsWith('.js'));

const allWords = new Map();

files.forEach(file => {
    const content = fs.readFileSync(path.join(lessonsDir, file), 'utf8');
    // Simple regex to extract vocab array content
    const vocabMatch = content.match(/"vocab":\s*\[([\s\S]*?)\]/);
    if (vocabMatch) {
        const vocabStr = vocabMatch[1];
        // This is a bit tricky to parse manually if it's mixed. 
        // Let's try to evaluate it in a safe-ish way or just parse it.
        try {
            // We can wrap it in [] and parse as JSON if it's well-formatted, 
            // but it might have single quotes or no quotes on keys.
            // Since it's JS, we can use eval-like approach or just more regex.
            
            // Try to extract objects: { "c": "...", "p": "...", "e": "..." }
            const objRegex = /\{\s*"c":\s*"([^"]+)",\s*"p":\s*"([^"]+)",\s*"e":\s*"([^"]+)"\s*\}/g;
            let match;
            while ((match = objRegex.exec(vocabStr)) !== null) {
                const [_, c, p, e] = match;
                if (!allWords.has(c)) {
                    allWords.set(c, { c, p, e });
                }
            }
            
            // Try to extract strings: "..."
            // We need to exclude the ones inside objects. 
            // Easiest is to replace objects with something else first.
            const stringsOnly = vocabStr.replace(/\{[\s\S]*?\}/g, '');
            const strRegex = /"([^"]+)"/g;
            while ((match = strRegex.exec(stringsOnly)) !== null) {
                const c = match[1];
                if (!allWords.has(c)) {
                    allWords.set(c, { c });
                }
            }
        } catch (e) {
            console.error(`Error parsing ${file}:`, e);
        }
    }
});

console.log(JSON.stringify(Array.from(allWords.values()), null, 2));
