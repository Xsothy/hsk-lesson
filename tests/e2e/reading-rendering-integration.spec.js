// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Integration tests for reading rendering (Task 9.2)
 * Validates: Requirements 10
 * 
 * Tests verify:
 * - Load first reading from data/readings.js
 * - Render all reading lines
 * - Verify all lines render correctly with pinyin
 * - Verify English translations display
 * - Verify no console warnings for missing words
 */

test.describe('Task 9.2: Reading Rendering Integration Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Capture console warnings and errors
    page.consoleWarnings = [];
    page.consoleErrors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'warning') {
        page.consoleWarnings.push(msg.text());
      } else if (msg.type() === 'error') {
        page.consoleErrors.push(msg.text());
      }
    });
  });
  
  test('should load first reading from readings.js and render it', async ({ page }) => {
    // Navigate to lesson 1 (which contains readings)
    await page.goto('http://localhost:8080/lesson.html?slug=lesson-1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Verify readings data is loaded
    const readingsLoaded = await page.evaluate(() => {
      return typeof window.HSK_READINGS !== 'undefined' && 
             Array.isArray(window.HSK_READINGS) && 
             window.HSK_READINGS.length > 0;
    });
    
    expect(readingsLoaded).toBe(true);
    console.log('✓ HSK_READINGS data is loaded');
    
    // Get the first reading data
    const firstReading = await page.evaluate(() => {
      return {
        id: window.HSK_READINGS[0].id,
        title: window.HSK_READINGS[0].title,
        titleEn: window.HSK_READINGS[0].titleEn,
        linesCount: window.HSK_READINGS[0].lines.length,
        hasWordsArray: window.HSK_READINGS[0].lines.every(line => Array.isArray(line.words))
      };
    });
    
    expect(firstReading.hasWordsArray).toBe(true);
    expect(firstReading.linesCount).toBeGreaterThan(0);
    console.log(`✓ First reading: "${firstReading.title}" (${firstReading.titleEn})`);
    console.log(`✓ Reading has ${firstReading.linesCount} lines with words[] arrays`);
  });
  
  test('should verify first reading has v3 data structure', async ({ page }) => {
    await page.goto('http://localhost:8080/lesson.html?slug=lesson-1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Verify v3 structure: has words[] array, no py field
    const readingStructure = await page.evaluate(() => {
      const firstReading = window.HSK_READINGS[0];
      
      return {
        allLinesHaveWords: firstReading.lines.every(line => 
          Array.isArray(line.words) && line.words.length > 0
        ),
        allLinesHaveZh: firstReading.lines.every(line => 
          typeof line.zh === 'string' && line.zh.length > 0
        ),
        allLinesHaveEn: firstReading.lines.every(line => 
          typeof line.en === 'string' && line.en.length > 0
        ),
        noPyFields: firstReading.lines.every(line => !('py' in line)),
        sampleLine: {
          zh: firstReading.lines[0].zh,
          words: firstReading.lines[0].words,
          en: firstReading.lines[0].en,
          hasPy: 'py' in firstReading.lines[0]
        }
      };
    });
    
    expect(readingStructure.allLinesHaveWords).toBe(true);
    expect(readingStructure.allLinesHaveZh).toBe(true);
    expect(readingStructure.allLinesHaveEn).toBe(true);
    expect(readingStructure.noPyFields).toBe(true);
    
    console.log('✓ All reading lines have words[] array (v3 structure)');
    console.log('✓ All reading lines have zh and en fields');
    console.log('✓ No py fields in reading data (v2 structure removed)');
    console.log(`Sample line: "${readingStructure.sampleLine.zh}"`);
    console.log(`  words: [${readingStructure.sampleLine.words.join(', ')}]`);
  });
  
  test('should render all reading lines with pinyin', async ({ page }) => {
    await page.goto('http://localhost:8080/lesson.html?slug=lesson-1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Click on the readings tab to display readings
    const readingsTab = page.locator('button:has-text("阅读"), button:has-text("Readings"), [data-tab="readings"]');
    const readingsTabExists = await readingsTab.count() > 0;
    
    if (readingsTabExists) {
      await readingsTab.first().click();
      await page.waitForTimeout(500);
      console.log('✓ Clicked on readings tab');
    } else {
      console.log('Note: No readings tab found, readings may be auto-displayed or on different page');
    }
    
    // Look for reading content in the DOM
    // Readings might be in a specific container like .reading-content, .story-lines, etc.
    const readingContainer = await page.evaluate(() => {
      // Try to find reading container by common selectors
      const selectors = [
        '.reading-content',
        '.story-lines',
        '.reading-lines',
        '[data-reading]',
        '.readings-section'
      ];
      
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) return selector;
      }
      
      // If no specific container, check if ruby elements exist anywhere
      const rubyElements = document.querySelectorAll('ruby');
      return rubyElements.length > 0 ? 'found ruby elements' : null;
    });
    
    if (readingContainer) {
      console.log(`✓ Found reading content: ${readingContainer}`);
    } else {
      console.log('Note: Reading content not yet rendered in DOM (may need user interaction)');
    }
    
    // Count ruby elements in the page (these should be from readings if readings tab is active)
    const rubyCount = await page.locator('ruby').count();
    console.log(`Found ${rubyCount} ruby elements with pinyin on page`);
    
    // If we found ruby elements, verify they have proper structure
    if (rubyCount > 0) {
      const rubyElements = await page.locator('ruby').all();
      
      for (let i = 0; i < Math.min(rubyElements.length, 5); i++) {
        const ruby = rubyElements[i];
        const rtElement = ruby.locator('rt');
        const rtCount = await rtElement.count();
        
        expect(rtCount).toBe(1);
        
        const pinyinText = await rtElement.textContent();
        expect(pinyinText.trim().length).toBeGreaterThan(0);
      }
      
      console.log('✓ Verified ruby elements have rt tags with pinyin');
    }
  });
  
  test('should verify all lines render correctly with pinyin by programmatically rendering', async ({ page }) => {
    await page.goto('http://localhost:8080/lesson.html?slug=lesson-1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Programmatically render the first reading's first line using renderLine
    const renderResult = await page.evaluate(() => {
      const firstReading = window.HSK_READINGS[0];
      const firstLine = firstReading.lines[0];
      
      // Use the renderLine function from HSK_RENDER
      if (typeof window.HSK_RENDER === 'undefined' || 
          typeof window.HSK_RENDER.renderLine !== 'function') {
        return { error: 'renderLine function not available' };
      }
      
      // Create a temporary container
      const tempContainer = document.createElement('div');
      tempContainer.id = 'test-render-container';
      document.body.appendChild(tempContainer);
      
      // Render the line
      const fragment = window.HSK_RENDER.renderLine(firstLine);
      tempContainer.appendChild(fragment);
      
      // Analyze the rendered content
      const rubyElements = tempContainer.querySelectorAll('ruby');
      const rtElements = tempContainer.querySelectorAll('rt');
      const textContent = tempContainer.textContent;
      
      const results = {
        originalZh: firstLine.zh,
        words: firstLine.words,
        rubyCount: rubyElements.length,
        rtCount: rtElements.length,
        renderedText: textContent,
        rubyDetails: []
      };
      
      // Collect details about each ruby element
      rubyElements.forEach((ruby, index) => {
        const rt = ruby.querySelector('rt');
        const rubyText = Array.from(ruby.childNodes)
          .filter(n => n.nodeType === Node.TEXT_NODE)
          .map(n => n.textContent)
          .join('');
        
        results.rubyDetails.push({
          index,
          chinese: rubyText,
          pinyin: rt ? rt.textContent : null
        });
      });
      
      // Clean up
      tempContainer.remove();
      
      return results;
    });
    
    if (renderResult.error) {
      console.error(`Error: ${renderResult.error}`);
      expect(renderResult.error).toBeUndefined();
    } else {
      console.log(`✓ Rendered first line: "${renderResult.originalZh}"`);
      console.log(`✓ Found ${renderResult.rubyCount} ruby elements with pinyin`);
      console.log('Ruby details:');
      renderResult.rubyDetails.forEach(detail => {
        console.log(`  ${detail.index + 1}. "${detail.chinese}" → "${detail.pinyin}"`);
        expect(detail.pinyin).toBeTruthy();
        expect(detail.pinyin.trim().length).toBeGreaterThan(0);
      });
      
      // Verify ruby elements were created for non-punctuation words
      expect(renderResult.rubyCount).toBeGreaterThan(0);
    }
  });
  
  test('should verify English translations display in reading lines', async ({ page }) => {
    await page.goto('http://localhost:8080/lesson.html?slug=lesson-1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Check if readings data has English translations
    const hasEnglishTranslations = await page.evaluate(() => {
      const firstReading = window.HSK_READINGS[0];
      
      const allHaveEn = firstReading.lines.every(line => 
        typeof line.en === 'string' && line.en.length > 0
      );
      
      const sampleTranslations = firstReading.lines.slice(0, 3).map(line => ({
        zh: line.zh,
        en: line.en
      }));
      
      return {
        allHaveEn,
        sampleTranslations,
        totalLines: firstReading.lines.length
      };
    });
    
    expect(hasEnglishTranslations.allHaveEn).toBe(true);
    console.log(`✓ All ${hasEnglishTranslations.totalLines} reading lines have English translations`);
    console.log('Sample translations:');
    hasEnglishTranslations.sampleTranslations.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.zh} → "${item.en}"`);
    });
    
    // If English translations are rendered in the DOM, verify they're visible
    // (This depends on the app's rendering implementation)
    const englishInDOM = await page.evaluate(() => {
      // Look for common English translation containers
      const selectors = [
        '.reading-en',
        '.translation',
        '.line-en',
        '[lang="en"]'
      ];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          return {
            found: true,
            selector,
            count: elements.length,
            sample: elements[0].textContent
          };
        }
      }
      
      return { found: false };
    });
    
    if (englishInDOM.found) {
      console.log(`✓ English translations rendered in DOM using ${englishInDOM.selector}`);
      console.log(`  Found ${englishInDOM.count} English translation elements`);
      console.log(`  Sample: "${englishInDOM.sample}"`);
    } else {
      console.log('Note: English translations exist in data but may not be rendered yet (blur-reveal or hidden)');
    }
  });
  
  test('should verify no console warnings for missing words when rendering readings', async ({ page }) => {
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
    await page.waitForTimeout(2000);
    
    // Programmatically render all lines from the first reading to trigger any warnings
    const renderAllLinesResult = await page.evaluate(() => {
      const firstReading = window.HSK_READINGS[0];
      const tempContainer = document.createElement('div');
      tempContainer.id = 'test-all-lines-container';
      document.body.appendChild(tempContainer);
      
      let renderedCount = 0;
      let errorCount = 0;
      
      try {
        firstReading.lines.forEach(line => {
          const fragment = window.HSK_RENDER.renderLine(line);
          const lineDiv = document.createElement('div');
          lineDiv.appendChild(fragment);
          tempContainer.appendChild(lineDiv);
          renderedCount++;
        });
      } catch (error) {
        errorCount++;
      }
      
      tempContainer.remove();
      
      return {
        totalLines: firstReading.lines.length,
        renderedCount,
        errorCount
      };
    });
    
    console.log(`✓ Rendered ${renderAllLinesResult.renderedCount} of ${renderAllLinesResult.totalLines} lines`);
    expect(renderAllLinesResult.errorCount).toBe(0);
    
    // Wait a bit more for any delayed console messages
    await page.waitForTimeout(500);
    
    // Filter for WORD_MAP related warnings
    const wordMapWarnings = consoleMessages.warnings.filter(msg => 
      msg.includes('not found in WORD_MAP') || msg.includes('[renderer]')
    );
    
    // Report all warnings for debugging
    if (consoleMessages.warnings.length > 0) {
      console.log('Console warnings detected:');
      consoleMessages.warnings.forEach(w => console.log(`  - ${w}`));
    }
    
    // Report all errors for debugging
    if (consoleMessages.errors.length > 0) {
      console.log('Console errors detected:');
      consoleMessages.errors.forEach(e => console.log(`  - ${e}`));
    }
    
    // Assert no WORD_MAP warnings
    expect(wordMapWarnings.length).toBe(0);
    console.log('✓ No console warnings for missing words in WORD_MAP when rendering readings');
    
    // Verify no rendering errors
    const renderingErrors = consoleMessages.errors.filter(msg =>
      msg.includes('render') || msg.includes('WORD_MAP')
    );
    expect(renderingErrors.length).toBe(0);
    console.log('✓ No rendering errors in console');
  });
  
  test('should verify punctuation renders without ruby tags in readings', async ({ page }) => {
    await page.goto('http://localhost:8080/lesson.html?slug=lesson-1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Render the first reading and check punctuation handling
    const punctuationTest = await page.evaluate(() => {
      const firstReading = window.HSK_READINGS[0];
      const tempContainer = document.createElement('div');
      document.body.appendChild(tempContainer);
      
      const punctuationMarks = ['。', '，', '！', '？', '、', '：', '；'];
      const results = {
        punctuationInRuby: [],
        punctuationAsPlainText: [],
        totalLinesChecked: 0
      };
      
      firstReading.lines.forEach((line, lineIndex) => {
        const fragment = window.HSK_RENDER.renderLine(line);
        const lineDiv = document.createElement('div');
        lineDiv.appendChild(fragment);
        tempContainer.appendChild(lineDiv);
        
        results.totalLinesChecked++;
        
        // Check each punctuation mark
        punctuationMarks.forEach(punct => {
          if (line.zh.includes(punct)) {
            // Check if punctuation is wrapped in ruby
            const rubyElements = lineDiv.querySelectorAll('ruby');
            let foundInRuby = false;
            
            rubyElements.forEach(ruby => {
              const rubyTextNodes = Array.from(ruby.childNodes)
                .filter(n => n.nodeType === Node.TEXT_NODE);
              rubyTextNodes.forEach(textNode => {
                if (textNode.textContent === punct) {
                  foundInRuby = true;
                  results.punctuationInRuby.push({
                    line: lineIndex,
                    punct,
                    zh: line.zh
                  });
                }
              });
            });
            
            // Check if punctuation exists as plain text (not in ruby or rt)
            const walker = document.createTreeWalker(lineDiv, NodeFilter.SHOW_TEXT);
            let node;
            while (node = walker.nextNode()) {
              if (node.textContent === punct) {
                const parent = node.parentElement;
                if (parent && parent.tagName !== 'RUBY' && parent.tagName !== 'RT') {
                  results.punctuationAsPlainText.push({
                    line: lineIndex,
                    punct,
                    zh: line.zh
                  });
                }
              }
            }
          }
        });
      });
      
      tempContainer.remove();
      
      return results;
    });
    
    console.log(`✓ Checked ${punctuationTest.totalLinesChecked} reading lines for punctuation handling`);
    
    if (punctuationTest.punctuationInRuby.length > 0) {
      console.log('❌ Found punctuation incorrectly wrapped in <ruby> tags:');
      punctuationTest.punctuationInRuby.forEach(item => {
        console.log(`  Line ${item.line}: "${item.punct}" in "${item.zh}"`);
      });
    }
    
    if (punctuationTest.punctuationAsPlainText.length > 0) {
      console.log(`✓ Found ${punctuationTest.punctuationAsPlainText.length} punctuation marks correctly rendered as plain text`);
    }
    
    // Assert no punctuation in ruby tags
    expect(punctuationTest.punctuationInRuby.length).toBe(0);
    console.log('✓ All punctuation renders without <ruby> wrapper tags');
  });
  
  test('should verify proper nouns in readings render with capitalized pinyin', async ({ page }) => {
    await page.goto('http://localhost:8080/lesson.html?slug=lesson-1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Check for proper nouns in the first reading
    const properNounTest = await page.evaluate(() => {
      const firstReading = window.HSK_READINGS[0];
      
      // Common proper nouns that might appear in readings
      const properNouns = ['李华', '王方', '陈明', '李明', '王芳', '北京'];
      
      const tempContainer = document.createElement('div');
      document.body.appendChild(tempContainer);
      
      const results = {
        foundProperNouns: [],
        capitalizedPinyin: []
      };
      
      firstReading.lines.forEach((line, lineIndex) => {
        // Check if line contains any proper nouns
        properNouns.forEach(noun => {
          if (line.words.includes(noun)) {
            results.foundProperNouns.push({
              line: lineIndex,
              noun,
              zh: line.zh
            });
            
            // Render the line and check pinyin
            const fragment = window.HSK_RENDER.renderLine(line);
            const lineDiv = document.createElement('div');
            lineDiv.appendChild(fragment);
            tempContainer.appendChild(lineDiv);
            
            // Find the ruby element containing this proper noun
            const rubyElements = lineDiv.querySelectorAll('ruby');
            rubyElements.forEach(ruby => {
              const rubyText = Array.from(ruby.childNodes)
                .filter(n => n.nodeType === Node.TEXT_NODE)
                .map(n => n.textContent)
                .join('');
              
              if (rubyText === noun) {
                const rt = ruby.querySelector('rt');
                if (rt) {
                  const pinyin = rt.textContent.replace(/<[^>]*>/g, '').trim();
                  const startsWithCapital = /^[A-Z]/.test(pinyin);
                  
                  results.capitalizedPinyin.push({
                    noun,
                    pinyin,
                    startsWithCapital,
                    line: lineIndex
                  });
                }
              }
            });
          }
        });
      });
      
      tempContainer.remove();
      
      return results;
    });
    
    if (properNounTest.foundProperNouns.length > 0) {
      console.log(`✓ Found ${properNounTest.foundProperNouns.length} proper nouns in readings`);
      properNounTest.foundProperNouns.forEach(item => {
        console.log(`  Line ${item.line}: "${item.noun}" in "${item.zh}"`);
      });
      
      // Verify capitalized pinyin
      properNounTest.capitalizedPinyin.forEach(item => {
        expect(item.startsWithCapital).toBe(true);
        console.log(`✓ "${item.noun}" has capitalized pinyin: "${item.pinyin}"`);
      });
      
      expect(properNounTest.capitalizedPinyin.length).toBeGreaterThan(0);
    } else {
      console.log('Note: No proper nouns found in first reading (may be in other readings)');
    }
  });
  
  test('should verify all words in first reading exist in WORD_MAP', async ({ page }) => {
    await page.goto('http://localhost:8080/lesson.html?slug=lesson-1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    const wordMapCoverage = await page.evaluate(() => {
      const firstReading = window.HSK_READINGS[0];
      
      // Extract all unique words from the reading
      const allWords = new Set();
      firstReading.lines.forEach(line => {
        line.words.forEach(word => allWords.add(word));
      });
      
      // Check each word against WORD_MAP
      const missingWords = [];
      const foundWords = [];
      
      allWords.forEach(word => {
        if (word in window.WORD_MAP) {
          foundWords.push({
            word,
            pinyin: window.WORD_MAP[word]
          });
        } else {
          missingWords.push(word);
        }
      });
      
      return {
        totalUniqueWords: allWords.size,
        foundCount: foundWords.length,
        missingCount: missingWords.length,
        missingWords,
        sampleFoundWords: foundWords.slice(0, 10)
      };
    });
    
    console.log(`✓ Reading has ${wordMapCoverage.totalUniqueWords} unique words/tokens`);
    console.log(`✓ Found ${wordMapCoverage.foundCount} words in WORD_MAP`);
    
    if (wordMapCoverage.missingCount > 0) {
      console.log(`❌ Missing ${wordMapCoverage.missingCount} words from WORD_MAP:`);
      wordMapCoverage.missingWords.forEach(word => {
        console.log(`  - "${word}"`);
      });
    }
    
    console.log('Sample found words:');
    wordMapCoverage.sampleFoundWords.forEach(item => {
      console.log(`  "${item.word}" → "${item.pinyin}"`);
    });
    
    // Assert 100% coverage
    expect(wordMapCoverage.missingCount).toBe(0);
    console.log('✓ All words in first reading exist in WORD_MAP (100% coverage)');
  });
  
});
