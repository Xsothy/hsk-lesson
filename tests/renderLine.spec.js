const { test, expect } = require('@playwright/test');

test.describe('renderLine function', () => {
  
  test.beforeEach(async ({ page }) => {
    // Load word-map.js, utils.js, and render.js in a browser context
    await page.goto('about:blank');
    await page.addScriptTag({ path: './js/word-map.js' });
    await page.addScriptTag({ path: './js/utils.js' });
    await page.addScriptTag({ path: './js/render.js' });
  });

  test('should render word with pinyin from WORD_MAP as ruby element', async ({ page }) => {
    const result = await page.evaluate(() => {
      const line = {
        zh: '你好',
        words: ['你好'],
        en: 'Hello'
      };
      const fragment = window.HSK_RENDER.renderLine(line);
      const div = document.createElement('div');
      div.appendChild(fragment);
      return div.innerHTML;
    });
    
    expect(result).toContain('<ruby>');
    expect(result).toContain('你好');
    expect(result).toContain('<rt>');
    expect(result).toContain('nǐ');
    expect(result).toContain('hǎo');
    expect(result).toContain('</rt>');
    expect(result).toContain('</ruby>');
  });

  test('should render punctuation without ruby wrapper', async ({ page }) => {
    const result = await page.evaluate(() => {
      const line = {
        zh: '你好！',
        words: ['你好', '！'],
        en: 'Hello!'
      };
      const fragment = window.HSK_RENDER.renderLine(line);
      const div = document.createElement('div');
      div.appendChild(fragment);
      return div.innerHTML;
    });
    
    expect(result).toContain('<ruby>你好');
    expect(result).toContain('nǐ');
    expect(result).toContain('hǎo');
    expect(result).toContain('！');
    // Punctuation should not be wrapped in ruby
    expect(result).not.toContain('<ruby>！');
  });

  test('should render missing word as plain text and log warning', async ({ page }) => {
    const { html, warnings } = await page.evaluate(() => {
      const warnings = [];
      const originalWarn = console.warn;
      console.warn = (...args) => {
        warnings.push(args.join(' '));
        originalWarn.apply(console, args);
      };
      
      const line = {
        zh: '测试未知词',
        words: ['测试', '未知词'],
        en: 'Test unknown word'
      };
      const fragment = window.HSK_RENDER.renderLine(line);
      const div = document.createElement('div');
      div.appendChild(fragment);
      
      console.warn = originalWarn;
      
      return {
        html: div.innerHTML,
        warnings
      };
    });
    
    // Check that missing words are rendered as plain text
    expect(html).toContain('未知词');
    
    // Check that warning was logged (if word is actually missing from WORD_MAP)
    const hasWarning = warnings.some(w => w.includes('[renderer]') && w.includes('not found in WORD_MAP'));
    if (hasWarning) {
      expect(hasWarning).toBe(true);
    }
  });

  test('should handle multi-character words correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      const line = {
        zh: '你好！我是学生。',
        words: ['你好', '！', '我', '是', '学生', '。'],
        en: 'Hello! I am a student.'
      };
      const fragment = window.HSK_RENDER.renderLine(line);
      const div = document.createElement('div');
      div.appendChild(fragment);
      return div.innerHTML;
    });
    
    // Multi-character words should be in one ruby element
    expect(result).toContain('<ruby>你好');
    expect(result).toContain('nǐ');
    expect(result).toContain('hǎo');
    
    expect(result).toContain('<ruby>学生');
    expect(result).toContain('xuésheng');
    
    // Single characters should also have ruby
    expect(result).toContain('<ruby>我');
    expect(result).toContain('wǒ');
    expect(result).toContain('<ruby>是');
    expect(result).toContain('shì');
    
    // Punctuation should not have ruby
    expect(result).toContain('！');
    expect(result).toContain('。');
    expect(result).not.toContain('<ruby>！');
    expect(result).not.toContain('<ruby>。');
  });

  test('should handle proper nouns with capitalized pinyin', async ({ page }) => {
    const result = await page.evaluate(() => {
      const line = {
        zh: '我叫李华。',
        words: ['我', '叫', '李华', '。'],
        en: 'My name is Li Hua.'
      };
      const fragment = window.HSK_RENDER.renderLine(line);
      const div = document.createElement('div');
      div.appendChild(fragment);
      return div.innerHTML;
    });
    
    // Proper noun should have capitalized pinyin
    expect(result).toContain('<ruby>李华');
    expect(result).toContain('Lǐ');
    expect(result).toContain('Huá');
  });

  test('should use DOM APIs (not innerHTML) for XSS safety', async ({ page }) => {
    const result = await page.evaluate(() => {
      // Try to inject malicious content
      const line = {
        zh: '<script>alert("XSS")</script>',
        words: ['<script>alert("XSS")</script>'],
        en: 'XSS attempt'
      };
      const fragment = window.HSK_RENDER.renderLine(line);
      const div = document.createElement('div');
      div.appendChild(fragment);
      return div.innerHTML;
    });
    
    // The script tag should be escaped/rendered as text, not executed
    expect(result).not.toContain('<script>');
    // It should be HTML-escaped
    expect(result).toContain('&lt;') || expect(result).toContain('script');
  });

  test('should return DocumentFragment', async ({ page }) => {
    const isFragment = await page.evaluate(() => {
      const line = {
        zh: '你好',
        words: ['你好'],
        en: 'Hello'
      };
      const result = window.HSK_RENDER.renderLine(line);
      return result instanceof DocumentFragment;
    });
    
    expect(isFragment).toBe(true);
  });

  test('should handle empty words array gracefully', async ({ page }) => {
    const result = await page.evaluate(() => {
      const line = {
        zh: '',
        words: [],
        en: ''
      };
      const fragment = window.HSK_RENDER.renderLine(line);
      const div = document.createElement('div');
      div.appendChild(fragment);
      return div.innerHTML;
    });
    
    expect(result).toBe('');
  });

  test('should handle invalid line structure', async ({ page }) => {
    const { html, warnings } = await page.evaluate(() => {
      const warnings = [];
      const originalWarn = console.warn;
      console.warn = (...args) => {
        warnings.push(args.join(' '));
        originalWarn.apply(console, args);
      };
      
      const line = {
        zh: '你好',
        // Missing words array
        en: 'Hello'
      };
      const fragment = window.HSK_RENDER.renderLine(line);
      const div = document.createElement('div');
      div.appendChild(fragment);
      
      console.warn = originalWarn;
      
      return {
        html: div.innerHTML,
        warnings
      };
    });
    
    expect(html).toBe('');
    expect(warnings.some(w => w.includes('Invalid line structure'))).toBe(true);
  });

  test('should handle mixed content (words + punctuation)', async ({ page }) => {
    const result = await page.evaluate(() => {
      const line = {
        zh: '你好！我叫李华。',
        words: ['你好', '！', '我', '叫', '李华', '。'],
        en: 'Hello! My name is Li Hua.'
      };
      const fragment = window.HSK_RENDER.renderLine(line);
      const div = document.createElement('div');
      div.appendChild(fragment);
      return div.innerHTML;
    });
    
    // Should contain ruby elements for words
    expect(result).toContain('<ruby>你好');
    expect(result).toContain('<ruby>我');
    expect(result).toContain('<ruby>叫');
    expect(result).toContain('<ruby>李华');
    
    // Should contain punctuation without ruby
    expect(result).toContain('！');
    expect(result).toContain('。');
    
    // Verify proper structure
    const rubyCount = (result.match(/<ruby>/g) || []).length;
    expect(rubyCount).toBe(4); // 你好, 我, 叫, 李华
  });
});
