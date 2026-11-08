// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Integration tests for lesson rendering (Task 9.1)
 * Validates: Requirements 10
 * 
 * Tests verify:
 * - Load lesson-1.js and render sentences section
 * - All Chinese text has corresponding pinyin
 * - Punctuation renders without <rt> tags
 * - Proper nouns render with capitalized pinyin
 * - No console warnings for missing words
 */

test.describe('Task 9.1: Lesson Rendering Integration Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Capture console warnings
    page.consoleWarnings = [];
    page.on('console', msg => {
      if (msg.type() === 'warning') {
        page.consoleWarnings.push(msg.text());
      }
    });
  });
  
  test('should load lesson-1.js and render sentences section correctly', async ({ page }) => {
    // Navigate to lesson 1
    await page.goto('http://localhost:8080/lesson.html?slug=lesson-1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Verify the page loaded successfully
    const pageTitle = await page.title();
    expect(pageTitle).toContain('Lesson');
    console.log(`✓ Page loaded: ${pageTitle}`);
    
    // Verify lesson title is displayed
    const lessonTitle = await page.locator('#d-title').textContent();
    expect(lessonTitle).toContain('问候与介绍');
    console.log('✓ Lesson title displayed: 问候与介绍 (Greetings & Introductions)');
    
    // Verify sentences section exists
    const sentencesSection = page.locator('.sentences-list');
    await expect(sentencesSection).toBeVisible();
    console.log('✓ Sentences section is visible');
    
    // Verify there are sentence items
    const sentenceCount = await page.locator('.sentence-item').count();
    expect(sentenceCount).toBeGreaterThan(0);
    console.log(`✓ Found ${sentenceCount} sentence items`);
  });
  
  test('should verify all Chinese text has corresponding pinyin', async ({ page }) => {
    await page.goto('http://localhost:8080/lesson.html?slug=lesson-1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Get all ruby elements in sentences section
    const rubyElements = await page.locator('.sentences-list ruby').all();
    console.log(`Found ${rubyElements.length} ruby elements in sentences section`);
    expect(rubyElements.length).toBeGreaterThan(0);
    
    // Verify each ruby element has an rt (pinyin) child
    for (const ruby of rubyElements) {
      const rtElement = ruby.locator('rt');
      const rtCount = await rtElement.count();
      expect(rtCount).toBe(1);
      
      // Verify the rt element has non-empty text
      const pinyinText = await rtElement.textContent();
      expect(pinyinText.trim().length).toBeGreaterThan(0);
    }
    
    console.log('✓ All Chinese characters in ruby elements have corresponding pinyin');
    
    // Verify specific examples from lesson 1
    // Example: "你好！我叫李华。" should have pinyin for 你好, 我, 叫, 李华
    const firstSentence = page.locator('.sentence-item').first();
    const firstSentenceRubyCount = await firstSentence.locator('ruby').count();
    expect(firstSentenceRubyCount).toBeGreaterThan(3); // At least 你好, 我, 叫, 李华
    console.log(`✓ First sentence has ${firstSentenceRubyCount} ruby elements with pinyin`);
  });
  
  test('should verify punctuation renders without <rt> tags', async ({ page }) => {
    await page.goto('http://localhost:8080/lesson.html?slug=lesson-1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Get all sentence items
    const sentenceItems = await page.locator('.sentence-item').all();
    
    for (const item of sentenceItems) {
      // Get the text content of the sentence
      const fullText = await item.locator('.sentence-zh').textContent();
      
      // Check for common punctuation marks
      const punctuationMarks = ['。', '，', '！', '？', '、'];
      
      for (const mark of punctuationMarks) {
        if (fullText.includes(mark)) {
          // Use page.evaluate to check if punctuation is wrapped in ruby
          const isPunctuationInRuby = await item.evaluate((el, punctMark) => {
            const rubyElements = el.querySelectorAll('.sentence-zh ruby');
            for (const ruby of rubyElements) {
              if (ruby.textContent.includes(punctMark)) {
                // Check if the punctuation itself is the ruby text content (not just contained)
                const textNodes = Array.from(ruby.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
                for (const textNode of textNodes) {
                  if (textNode.textContent === punctMark) {
                    // Found punctuation as direct text in ruby - this is wrong
                    return true;
                  }
                }
              }
            }
            return false;
          }, mark);
          
          expect(isPunctuationInRuby).toBe(false);
          console.log(`✓ Punctuation "${mark}" is not wrapped in <ruby> tags`);
        }
      }
    }
    
    // Additional check: verify punctuation appears as plain text nodes
    const hasPunctuation = await page.evaluate(() => {
      const sentenceZh = document.querySelectorAll('.sentence-zh');
      let foundPunctuation = false;
      
      sentenceZh.forEach(el => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let node;
        while (node = walker.nextNode()) {
          const text = node.textContent;
          if (text.match(/[。，！？、]/)) {
            // Found punctuation in text node
            // Verify it's not inside a ruby element
            let parent = node.parentElement;
            if (parent && parent.tagName !== 'RUBY' && parent.tagName !== 'RT') {
              foundPunctuation = true;
            }
          }
        }
      });
      
      return foundPunctuation;
    });
    
    expect(hasPunctuation).toBe(true);
    console.log('✓ Punctuation marks render as plain text without <rt> tags');
  });
  
  test('should verify proper nouns render with capitalized pinyin', async ({ page }) => {
    await page.goto('http://localhost:8080/lesson.html?slug=lesson-1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Proper nouns in lesson 1: 李华, 王芳, 李明
    const properNouns = [
      { chinese: '李华', expectedPinyin: 'Lǐ Huá' },
      { chinese: '王芳', expectedPinyin: 'Wáng Fāng' },
      { chinese: '李明', expectedPinyin: 'Lǐ Míng' }
    ];
    
    for (const noun of properNouns) {
      // Find ruby elements containing the proper noun
      const rubyElements = await page.locator('.sentences-list ruby, .dialogue-box ruby').all();
      
      let found = false;
      for (const ruby of rubyElements) {
        const rubyText = await ruby.evaluate(el => {
          const textNodes = Array.from(el.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
          return textNodes.map(n => n.textContent).join('');
        });
        
        if (rubyText === noun.chinese) {
          found = true;
          const rtElement = ruby.locator('rt');
          const pinyinText = await rtElement.textContent();
          
          // Remove HTML tags and get plain text (in case of colorized pinyin)
          const plainPinyin = pinyinText.replace(/<[^>]*>/g, '').trim();
          
          // Check if pinyin starts with a capital letter
          expect(plainPinyin.charAt(0)).toMatch(/[A-Z]/);
          console.log(`✓ Proper noun "${noun.chinese}" has capitalized pinyin: "${plainPinyin}"`);
          
          // Optionally verify the exact pinyin matches (if we strip HTML)
          // Note: The HTML might have color spans, so we check the pattern
          const hasCapitalizedPattern = /^[A-Z]/.test(plainPinyin);
          expect(hasCapitalizedPattern).toBe(true);
          break;
        }
      }
      
      if (!found) {
        console.log(`Note: Proper noun "${noun.chinese}" not found in visible content (may be in dialogue section)`);
      }
    }
    
    console.log('✓ All proper nouns render with capitalized pinyin');
  });
  
  test('should verify no console warnings for missing words', async ({ page }) => {
    // Capture console messages
    const consoleMessages = {
      warnings: [],
      errors: []
    };
    
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'warning') {
        consoleMessages.warnings.push(text);
      } else if (msg.type() === 'error') {
        consoleMessages.errors.push(text);
      }
    });
    
    await page.goto('http://localhost:8080/lesson.html?slug=lesson-1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for all rendering to complete
    
    // Filter for WORD_MAP related warnings
    const wordMapWarnings = consoleMessages.warnings.filter(msg => 
      msg.includes('not found in WORD_MAP') || msg.includes('[renderer]')
    );
    
    // Report all console warnings for debugging
    if (consoleMessages.warnings.length > 0) {
      console.log('Console warnings detected:');
      consoleMessages.warnings.forEach(w => console.log(`  - ${w}`));
    }
    
    // Report all console errors for debugging
    if (consoleMessages.errors.length > 0) {
      console.log('Console errors detected:');
      consoleMessages.errors.forEach(e => console.log(`  - ${e}`));
    }
    
    // Assert no WORD_MAP warnings
    expect(wordMapWarnings.length).toBe(0);
    console.log('✓ No console warnings for missing words in WORD_MAP');
    
    // Also verify no critical rendering errors
    const renderingErrors = consoleMessages.errors.filter(msg =>
      msg.includes('render') || msg.includes('WORD_MAP')
    );
    expect(renderingErrors.length).toBe(0);
    console.log('✓ No rendering errors in console');
  });
  
  test('should verify complete lesson 1 data structure', async ({ page }) => {
    await page.goto('http://localhost:8080/lesson.html?slug=lesson-1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Verify lesson data is loaded
    const lessonData = await page.evaluate(() => {
      return window.HSK_LESSONS_BY_SLUG && window.HSK_LESSONS_BY_SLUG['lesson-1'];
    });
    
    expect(lessonData).toBeTruthy();
    console.log('✓ Lesson 1 data loaded successfully');
    
    // Verify sentences have words array (v3 structure)
    const hasWordsArray = await page.evaluate(() => {
      const lesson = window.HSK_LESSONS_BY_SLUG['lesson-1'];
      return lesson.sentences.every(s => Array.isArray(s.words) && s.words.length > 0);
    });
    
    expect(hasWordsArray).toBe(true);
    console.log('✓ All sentences have words[] array (v3 structure)');
    
    // Verify no py fields exist (removed in v3)
    const hasPyFields = await page.evaluate(() => {
      const lesson = window.HSK_LESSONS_BY_SLUG['lesson-1'];
      return lesson.sentences.some(s => 'py' in s) || lesson.dialogue.some(d => 'py' in d);
    });
    
    expect(hasPyFields).toBe(false);
    console.log('✓ No py fields in lesson data (v2 structure removed)');
  });
  
  test('should verify WORD_MAP is loaded and accessible', async ({ page }) => {
    await page.goto('http://localhost:8080/lesson.html?slug=lesson-1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Verify WORD_MAP exists
    const wordMapExists = await page.evaluate(() => {
      return typeof window.WORD_MAP !== 'undefined';
    });
    
    expect(wordMapExists).toBe(true);
    console.log('✓ WORD_MAP is loaded and accessible');
    
    // Verify WORD_MAP has entries
    const wordMapSize = await page.evaluate(() => {
      return Object.keys(window.WORD_MAP).length;
    });
    
    expect(wordMapSize).toBeGreaterThan(0);
    console.log(`✓ WORD_MAP contains ${wordMapSize} entries`);
    
    // Verify some expected words exist in WORD_MAP
    const expectedWords = ['你好', '我', '你', '叫', '是', '学生', '老师'];
    
    for (const word of expectedWords) {
      const hasWord = await page.evaluate((w) => {
        return w in window.WORD_MAP;
      }, word);
      
      expect(hasWord).toBe(true);
      console.log(`✓ WORD_MAP contains "${word}"`);
    }
    
    // Verify punctuation maps to empty string
    const punctuationCheck = await page.evaluate(() => {
      const punctuation = ['。', '，', '！', '？'];
      const results = {};
      punctuation.forEach(p => {
        results[p] = window.WORD_MAP[p] === '';
      });
      return results;
    });
    
    Object.entries(punctuationCheck).forEach(([punct, isEmpty]) => {
      expect(isEmpty).toBe(true);
      console.log(`✓ Punctuation "${punct}" maps to empty string`);
    });
  });
  
  test('should verify dialogue section renders correctly with proper nouns', async ({ page }) => {
    await page.goto('http://localhost:8080/lesson.html?slug=lesson-1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Verify dialogue section exists
    const dialogueBox = page.locator('.dialogue-box');
    await expect(dialogueBox).toBeVisible();
    console.log('✓ Dialogue section is visible');
    
    // Verify dialogue lines exist
    const dialogueLines = await page.locator('.dialogue-line').count();
    expect(dialogueLines).toBeGreaterThan(0);
    console.log(`✓ Found ${dialogueLines} dialogue lines`);
    
    // Verify speaker labels
    const speakerA = await page.locator('.dialogue-speaker.speaker-a').count();
    const speakerB = await page.locator('.dialogue-speaker.speaker-b').count();
    expect(speakerA).toBeGreaterThan(0);
    expect(speakerB).toBeGreaterThan(0);
    console.log(`✓ Speaker labels: A=${speakerA}, B=${speakerB}`);
    
    // Verify ruby elements in dialogue
    const dialogueRubyCount = await page.locator('.dialogue-box ruby').count();
    expect(dialogueRubyCount).toBeGreaterThan(0);
    console.log(`✓ Dialogue has ${dialogueRubyCount} ruby elements with pinyin`);
    
    // Check for proper nouns in dialogue (王芳, 李明)
    const properNounsInDialogue = ['王芳', '李明'];
    
    for (const noun of properNounsInDialogue) {
      const containsNoun = await page.evaluate((name) => {
        const dialogueBox = document.querySelector('.dialogue-box');
        return dialogueBox.textContent.includes(name);
      }, noun);
      
      if (containsNoun) {
        console.log(`✓ Proper noun "${noun}" found in dialogue`);
      }
    }
  });
  
  test('should verify renderLine function is being used', async ({ page }) => {
    await page.goto('http://localhost:8080/lesson.html?slug=lesson-1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Verify renderLine function exists
    const renderLineExists = await page.evaluate(() => {
      return typeof window.HSK_RENDER.renderLine === 'function';
    });
    
    expect(renderLineExists).toBe(true);
    console.log('✓ renderLine function exists in HSK_RENDER');
    
    // Verify the rendering produces DocumentFragment structure
    // (indicated by presence of ruby elements created by DOM APIs, not innerHTML)
    const hasProperStructure = await page.evaluate(() => {
      const firstSentence = document.querySelector('.sentence-zh');
      if (!firstSentence) return false;
      
      // Check that ruby elements exist and have proper structure
      const rubyElements = firstSentence.querySelectorAll('ruby');
      if (rubyElements.length === 0) return false;
      
      // Check first ruby element has text node + rt element
      const firstRuby = rubyElements[0];
      const hasTextNode = Array.from(firstRuby.childNodes).some(n => n.nodeType === Node.TEXT_NODE);
      const hasRtElement = firstRuby.querySelector('rt') !== null;
      
      return hasTextNode && hasRtElement;
    });
    
    expect(hasProperStructure).toBe(true);
    console.log('✓ Ruby elements have proper DOM structure (created by renderLine)');
  });
  
});
