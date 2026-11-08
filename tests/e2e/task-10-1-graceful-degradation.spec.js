const { test, expect } = require('@playwright/test');

/**
 * Task 10.1: Implement graceful degradation for missing words
 * 
 * Acceptance Criteria:
 * - Verify renderLine renders missing words as plain text
 * - Verify console warning logged for missing words
 * - Verify app continues rendering remaining words in line
 * - Verify no errors thrown or execution halted
 * 
 * Requirements: 4
 */

test.describe('Task 10.1: Graceful Degradation for Missing Words', () => {
  
  test.beforeEach(async ({ page }) => {
    // Load necessary scripts in browser context
    await page.goto('about:blank');
    await page.addScriptTag({ path: './js/word-map.js' });
    
    // Add utils.js for colorizePinyin function
    await page.addScriptTag({ path: './js/utils.js' });
    
    // Load render.js
    await page.addScriptTag({ path: './js/render.js' });
  });

  test('should render missing words as plain text', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Create a word that definitely doesn't exist in WORD_MAP
      const missingWord = '🚀测试缺失词🚀';
      
      const line = {
        zh: '你好' + missingWord + '再见',
        words: ['你好', missingWord, '再见'],
        en: 'Test with missing word'
      };
      
      const fragment = window.HSK_RENDER.renderLine(line);
      const div = document.createElement('div');
      div.appendChild(fragment);
      
      return {
        html: div.innerHTML,
        textContent: div.textContent
      };
    });
    
    // Missing word should appear in the output as plain text
    expect(result.textContent).toContain('🚀测试缺失词🚀');
    
    // Should NOT be wrapped in ruby tags
    expect(result.html).not.toContain('<ruby>🚀测试缺失词🚀');
  });

  test('should log console warning for missing words', async ({ page }) => {
    const consoleMessages = [];
    
    // Capture console.warn messages
    page.on('console', msg => {
      if (msg.type() === 'warning') {
        consoleMessages.push(msg.text());
      }
    });
    
    await page.evaluate(() => {
      const missingWord = '缺失词汇';
      
      const line = {
        zh: '你好缺失词汇',
        words: ['你好', missingWord],
        en: 'Hello missing word'
      };
      
      window.HSK_RENDER.renderLine(line);
    });
    
    // Wait a bit for console messages to be captured
    await page.waitForTimeout(100);
    
    // Should have logged a warning
    const hasWarning = consoleMessages.some(msg => 
      msg.includes('[renderer]') && 
      msg.includes('缺失词汇') && 
      msg.includes('not found in WORD_MAP')
    );
    
    expect(hasWarning).toBe(true);
  });

  test('should continue rendering remaining words in line after missing word', async ({ page }) => {
    const result = await page.evaluate(() => {
      const missingWord = '未知词';
      
      const line = {
        zh: '你好未知词再见',
        words: ['你好', missingWord, '再见'],
        en: 'Hello unknown goodbye'
      };
      
      const fragment = window.HSK_RENDER.renderLine(line);
      const div = document.createElement('div');
      div.appendChild(fragment);
      
      return {
        html: div.innerHTML,
        textContent: div.textContent,
        childNodes: Array.from(div.childNodes).map(node => ({
          type: node.nodeName,
          text: node.textContent
        }))
      };
    });
    
    // All words should be present in the output
    expect(result.textContent).toContain('你好');
    expect(result.textContent).toContain('未知词');
    expect(result.textContent).toContain('再见');
    
    // First word should be wrapped in ruby (it exists in WORD_MAP)
    expect(result.html).toContain('<ruby>你好');
    
    // Last word should be wrapped in ruby (it exists in WORD_MAP)
    expect(result.html).toContain('<ruby>再见');
    
    // Should have at least 3 child nodes (ruby, text, ruby)
    expect(result.childNodes.length).toBeGreaterThanOrEqual(3);
  });

  test('should not throw errors or halt execution when word is missing', async ({ page }) => {
    let errorThrown = false;
    
    page.on('pageerror', err => {
      errorThrown = true;
    });
    
    const result = await page.evaluate(() => {
      try {
        const missingWord = '完全不存在的词';
        
        const line = {
          zh: '你好完全不存在的词再见',
          words: ['你好', missingWord, '再见'],
          en: 'Test error handling'
        };
        
        const fragment = window.HSK_RENDER.renderLine(line);
        const div = document.createElement('div');
        div.appendChild(fragment);
        
        return {
          success: true,
          html: div.innerHTML,
          error: null
        };
      } catch (error) {
        return {
          success: false,
          html: null,
          error: error.message
        };
      }
    });
    
    // Should complete successfully without throwing
    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(errorThrown).toBe(false);
    
    // Should still produce output
    expect(result.html).toBeTruthy();
  });

  test('should handle multiple missing words in a single line', async ({ page }) => {
    const consoleMessages = [];
    
    page.on('console', msg => {
      if (msg.type() === 'warning') {
        consoleMessages.push(msg.text());
      }
    });
    
    const result = await page.evaluate(() => {
      const line = {
        zh: '你好缺失词1测试缺失词2再见',
        words: ['你好', '缺失词1', '测试', '缺失词2', '再见'],
        en: 'Multiple missing words'
      };
      
      const fragment = window.HSK_RENDER.renderLine(line);
      const div = document.createElement('div');
      div.appendChild(fragment);
      
      return {
        html: div.innerHTML,
        textContent: div.textContent
      };
    });
    
    await page.waitForTimeout(100);
    
    // All words should be present
    expect(result.textContent).toContain('你好');
    expect(result.textContent).toContain('缺失词1');
    expect(result.textContent).toContain('测试');
    expect(result.textContent).toContain('缺失词2');
    expect(result.textContent).toContain('再见');
    
    // Should log multiple warnings (one for each missing word)
    const warningCount = consoleMessages.filter(msg => 
      msg.includes('[renderer]') && msg.includes('not found in WORD_MAP')
    ).length;
    
    // Should have warnings for missing words (at least 1, possibly 2)
    expect(warningCount).toBeGreaterThanOrEqual(1);
  });

  test('should gracefully handle line with all missing words', async ({ page }) => {
    const result = await page.evaluate(() => {
      const line = {
        zh: '缺失词1缺失词2缺失词3',
        words: ['缺失词1', '缺失词2', '缺失词3'],
        en: 'All words missing'
      };
      
      try {
        const fragment = window.HSK_RENDER.renderLine(line);
        const div = document.createElement('div');
        div.appendChild(fragment);
        
        return {
          success: true,
          textContent: div.textContent,
          html: div.innerHTML
        };
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });
    
    // Should not throw error
    expect(result.success).toBe(true);
    
    // Should still render all words as plain text
    expect(result.textContent).toContain('缺失词1');
    expect(result.textContent).toContain('缺失词2');
    expect(result.textContent).toContain('缺失词3');
  });

  test('should correctly format warning message', async ({ page }) => {
    const consoleMessages = [];
    
    page.on('console', msg => {
      if (msg.type() === 'warning') {
        consoleMessages.push(msg.text());
      }
    });
    
    await page.evaluate(() => {
      const missingWord = '特殊词';
      
      const line = {
        zh: '你好特殊词',
        words: ['你好', missingWord],
        en: 'Special word test'
      };
      
      window.HSK_RENDER.renderLine(line);
    });
    
    await page.waitForTimeout(100);
    
    // Find the warning message
    const warning = consoleMessages.find(msg => 
      msg.includes('[renderer]') && msg.includes('特殊词')
    );
    
    expect(warning).toBeTruthy();
    
    // Warning should follow the format: [renderer] "word" not found in WORD_MAP
    expect(warning).toMatch(/\[renderer\].*"特殊词".*not found in WORD_MAP/);
  });

  test('should handle missing word followed by punctuation', async ({ page }) => {
    const result = await page.evaluate(() => {
      const missingWord = '缺失';
      
      const line = {
        zh: '你好缺失！',
        words: ['你好', missingWord, '！'],
        en: 'Hello missing!'
      };
      
      const fragment = window.HSK_RENDER.renderLine(line);
      const div = document.createElement('div');
      div.appendChild(fragment);
      
      return {
        html: div.innerHTML,
        textContent: div.textContent
      };
    });
    
    // All elements should be present
    expect(result.textContent).toContain('你好');
    expect(result.textContent).toContain('缺失');
    expect(result.textContent).toContain('！');
    
    // First word should have ruby
    expect(result.html).toContain('<ruby>你好');
    
    // Punctuation should not have ruby
    expect(result.html).not.toContain('<ruby>！');
  });

  test('should maintain correct order when rendering mixed present and missing words', async ({ page }) => {
    const result = await page.evaluate(() => {
      const line = {
        zh: '我是学生缺失词老师',
        words: ['我', '是', '学生', '缺失词', '老师'],
        en: 'Order test'
      };
      
      const fragment = window.HSK_RENDER.renderLine(line);
      const div = document.createElement('div');
      div.appendChild(fragment);
      
      return {
        html: div.innerHTML,
        childElements: Array.from(div.childNodes).map(node => {
          if (node.nodeName === 'RUBY') {
            // For ruby elements, get the Chinese text (first child text node)
            return {
              tag: node.nodeName,
              text: node.firstChild.textContent
            };
          } else {
            // For text nodes, get the text content
            return {
              tag: node.nodeName,
              text: node.textContent
            };
          }
        })
      };
    });
    
    // Should have 5 child nodes (one for each word)
    expect(result.childElements.length).toBe(5);
    
    // Verify order - check the Chinese characters are in correct order
    expect(result.childElements[0].text).toBe('我');
    expect(result.childElements[1].text).toBe('是');
    expect(result.childElements[2].text).toBe('学生');
    expect(result.childElements[3].text).toBe('缺失词'); // Missing word as plain text
    expect(result.childElements[4].text).toBe('老师');
    
    // Verify HTML contains all Chinese characters in order
    expect(result.html).toContain('我');
    expect(result.html).toContain('是');
    expect(result.html).toContain('学生');
    expect(result.html).toContain('缺失词');
    expect(result.html).toContain('老师');
  });
});
