#!/usr/bin/env node

/**
 * verify-lesson-migration.js
 * 
 * Verifies that lesson files have been correctly migrated to v3 format:
 * - No py fields in sentences or dialogues
 * - All sentences and dialogues have words[] arrays
 * - words[] arrays reconstruct to original zh strings
 */

const fs = require('fs');
const path = require('path');

function readLessonFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const slugMatch = content.match(/window\.HSK_LESSONS_BY_SLUG\["([^"]+)"\]\s*=\s*({[\s\S]+})\s*;?\s*$/);
  
  if (!slugMatch) {
    throw new Error(`Could not parse lesson structure in ${filePath}`);
  }
  
  const slug = slugMatch[1];
  const lessonData = eval(`(${slugMatch[2]})`);
  
  return { slug, lessonData };
}

function verifyLine(line, lineType, lessonFile, index) {
  const errors = [];
  
  // Check that py field is removed
  if (line.hasOwnProperty('py')) {
    errors.push(`  ❌ ${lineType} ${index}: Still has 'py' field`);
  }
  
  // Check that words[] array exists
  if (!line.hasOwnProperty('words')) {
    errors.push(`  ❌ ${lineType} ${index}: Missing 'words' array`);
  } else if (!Array.isArray(line.words)) {
    errors.push(`  ❌ ${lineType} ${index}: 'words' is not an array`);
  } else {
    // Verify reconstruction
    const reconstructed = line.words.join('');
    if (reconstructed !== line.zh) {
      errors.push(`  ❌ ${lineType} ${index}: Reconstruction mismatch`);
      errors.push(`     Original:      "${line.zh}"`);
      errors.push(`     Reconstructed: "${reconstructed}"`);
    }
  }
  
  return errors;
}

function verifyLesson(lessonFile) {
  const filePath = path.join(__dirname, '..', 'data', 'lessons', lessonFile);
  const { slug, lessonData } = readLessonFile(filePath);
  
  const errors = [];
  
  // Verify sentences
  if (Array.isArray(lessonData.sentences)) {
    lessonData.sentences.forEach((sentence, index) => {
      errors.push(...verifyLine(sentence, 'Sentence', lessonFile, index + 1));
    });
  }
  
  // Verify dialogue
  if (Array.isArray(lessonData.dialogue)) {
    lessonData.dialogue.forEach((line, index) => {
      errors.push(...verifyLine(line, 'Dialogue', lessonFile, index + 1));
    });
  }
  
  return { lessonFile, slug, errors };
}

function main() {
  console.log('🔍 Verifying lesson migration to v3 format...\n');
  
  const lessonsDir = path.join(__dirname, '..', 'data', 'lessons');
  const lessonFiles = fs.readdirSync(lessonsDir)
    .filter(file => file.startsWith('lesson-') && file.endsWith('.js'))
    .sort();
  
  console.log(`📚 Checking ${lessonFiles.length} lesson files\n`);
  
  let totalErrors = 0;
  const results = [];
  
  for (const lessonFile of lessonFiles) {
    try {
      const result = verifyLesson(lessonFile);
      results.push(result);
      
      if (result.errors.length === 0) {
        console.log(`✅ ${lessonFile} - OK`);
      } else {
        console.log(`❌ ${lessonFile} - ${result.errors.length} errors:`);
        result.errors.forEach(error => console.log(error));
        totalErrors += result.errors.length;
      }
    } catch (error) {
      console.error(`❌ ${lessonFile} - Error reading file:`, error.message);
      totalErrors++;
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  if (totalErrors === 0) {
    console.log('✨ All lessons verified successfully!');
    console.log(`📊 ${lessonFiles.length} lesson files migrated to v3 format`);
    process.exit(0);
  } else {
    console.log(`❌ Migration verification failed with ${totalErrors} errors`);
    process.exit(1);
  }
}

main();
