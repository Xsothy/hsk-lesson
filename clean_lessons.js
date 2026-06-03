const fs = require('fs');
const path = require('path');

const lessonsDir = '/home/sothylor/Documents/Workspace/hsk-lesson/data/lessons';
const files = fs.readdirSync(lessonsDir).filter(f => f.startsWith('lesson-') && f.endsWith('.js'));

files.forEach(file => {
    const filePath = path.join(lessonsDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Find "vocab": [ ... ]
    const vocabMatch = content.match(/"vocab":\s*\[([\s\S]*?)\]/);
    if (vocabMatch) {
        const vocabStr = vocabMatch[1];
        const words = [];
        
        // Match both objects and strings
        // Objects: { "c": "..." }
        const objRegex = /\{\s*"c":\s*"([^"]+)"[\s\S]*?\}/g;
        let match;
        let tempVocabStr = vocabStr;
        while ((match = objRegex.exec(vocabStr)) !== null) {
            words.push(match[1]);
        }
        
        // Strings: "..." (after removing objects to avoid double counting)
        const stringsOnly = vocabStr.replace(/\{[\s\S]*?\}/g, '');
        const strRegex = /"([^"]+)"/g;
        while ((match = strRegex.exec(stringsOnly)) !== null) {
            words.push(match[1]);
        }
        
        // Reconstruct the vocab array
        // We want to keep the order if possible, but extracting them separately might lose order.
        // Let's try a better way to keep order.
        
        const orderedWords = [];
        const itemRegex = /(\{[^}]+\}|"[^"]+")/g;
        while ((match = itemRegex.exec(vocabStr)) !== null) {
            const item = match[1];
            if (item.startsWith('{')) {
                const cMatch = item.match(/"c":\s*"([^"]+)"/);
                if (cMatch) orderedWords.push(cMatch[1]);
            } else {
                orderedWords.push(item.replace(/"/g, ''));
            }
        }
        
        const newVocab = JSON.stringify(orderedWords, null, 2).replace(/\n/g, '\n    ').replace(/\]$/, '  ]');
        const newContent = content.replace(vocabMatch[0], `"vocab": ${newVocab}`);
        
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`Cleaned ${file}`);
        }
    }
});
