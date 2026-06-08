// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Task 6.2 Validation Test Suite
 * Validates all requirements from Task 6.2:
 * - Sentence rendering uses renderLine with sentence.words[]
 * - Dialogue rendering uses renderLine with line.words[]  
 * - Speaker labels (A/B) preserved in dialogue
 * - Click-to-speak functionality on Chinese text maintained
 * - Blur-reveal functionality for English translations maintained
 */

test.describe('Task 6.2: Update sentence and dialogue rendering to use renderLine', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to a lesson page before each test
    await page.goto('http://localhost:8080/lesson.html?slug=lesson-1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
  });
  
  test('Requirement: Sentence rendering uses renderLine with sentence.words[]', async ({ page }) => {
    // Verify sentences section exists
    const sentencesSection = page.locator('.sentences-list');
    await expect(sentencesSection).toBeVisible();
    
    // Count ruby elements (should be > 0 if renderLine is being used)
    const rubyCount = await page.locator('.sentences-list ruby').count();
    console.log(`✓ Found ${rubyCount} ruby elements in sentences section`);
    expect(rubyCount).toBeGreaterThan(0);
    
    // Verify rt (pinyin) elements exist
    const rtCount = await page.locator('.sentences-list rt').count();
    console.log(`✓ Found ${rtCount} rt (pinyin) elements in sentences section`);
    expect(rtCount).toBeGreaterThan(0);
    
    // Verify no old v2 rendering artifacts (no .sentence-py class)
    const oldPyCount = await page.locator('.sentences-list .sentence-py').count();
    expect(oldPyCount).toBe(0);
    console.log('✓ No v2 rendering artifacts found');
  });
  
  test('Requirement: Dialogue rendering uses renderLine with line.words[]', async ({ page }) => {
    // Verify dialogue section exists
    const dialogueBox = page.locator('.dialogue-box');
    await expect(dialogueBox).toBeVisible();
    
    // Count ruby elements
    const rubyCount = await page.locator('.dialogue-box ruby').count();
    console.log(`✓ Found ${rubyCount} ruby elements in dialogue section`);
    expect(rubyCount).toBeGreaterThan(0);
    
    // Verify rt (pinyin) elements exist
    const rtCount = await page.locator('.dialogue-box rt').count();
    console.log(`✓ Found ${rtCount} rt (pinyin) elements in dialogue section`);
    expect(rtCount).toBeGreaterThan(0);
    
    // Verify no old v2 rendering artifacts (no .dialogue-py class)
    const oldPyCount = await page.locator('.dialogue-box .dialogue-py').count();
    expect(oldPyCount).toBe(0);
    console.log('✓ No v2 rendering artifacts found');
  });
  
  test('Requirement: Speaker labels (A/B) preserved in dialogue rendering', async ({ page }) => {
    // Check for speaker A label
    const speakerACount = await page.locator('.dialogue-box .speaker-a').count();
    expect(speakerACount).toBeGreaterThan(0);
    console.log(`✓ Found ${speakerACount} speaker A label(s)`);
    
    // Check for speaker B label
    const speakerBCount = await page.locator('.dialogue-box .speaker-b').count();
    expect(speakerBCount).toBeGreaterThan(0);
    console.log(`✓ Found ${speakerBCount} speaker B label(s)`);
    
    // Verify speaker labels contain correct text
    const speakerAText = await page.locator('.dialogue-box .speaker-a').first().textContent();
    expect(speakerAText).toBe('A');
    
    const speakerBText = await page.locator('.dialogue-box .speaker-b').first().textContent();
    expect(speakerBText).toBe('B');
    
    console.log('✓ Speaker labels contain correct text (A and B)');
  });
  
  test('Requirement: Click-to-speak functionality maintained on Chinese text (sentences)', async ({ page }) => {
    // Find sentence Chinese text element
    const sentenceZh = page.locator('.sentences-list .sentence-zh').first();
    await expect(sentenceZh).toBeVisible();
    
    // Verify cursor indicates clickable
    const cursorStyle = await sentenceZh.evaluate(el => window.getComputedStyle(el).cursor);
    expect(cursorStyle).toBe('pointer');
    console.log('✓ Sentence Chinese text has pointer cursor');
    
    // Verify title attribute for accessibility
    const title = await sentenceZh.getAttribute('title');
    expect(title).toContain('pronunciation');
    console.log('✓ Sentence Chinese text has title attribute');
    
    // Verify click handler exists (we can't easily test TTS without mocking)
    // But we can verify the element is clickable
    const isClickable = await sentenceZh.evaluate(el => {
      return el.style.cursor === 'pointer';
    });
    expect(isClickable).toBe(true);
    console.log('✓ Sentence Chinese text is clickable');
  });
  
  test('Requirement: Click-to-speak functionality maintained on Chinese text (dialogue)', async ({ page }) => {
    // Find dialogue Chinese text element
    const dialogueContent = page.locator('.dialogue-box .dialogue-content').first();
    await expect(dialogueContent).toBeVisible();
    
    // Verify title attribute
    const title = await dialogueContent.getAttribute('title');
    expect(title).toContain('pronunciation');
    console.log('✓ Dialogue content has title attribute for pronunciation');
    
    // Verify dialogue-zh element exists
    const dialogueZh = page.locator('.dialogue-box .dialogue-zh').first();
    await expect(dialogueZh).toBeVisible();
    console.log('✓ Dialogue Chinese text element exists');
  });
  
  test('Requirement: Blur-reveal functionality maintained for English translations (sentences)', async ({ page }) => {
    // Find sentence English translation
    const sentenceEn = page.locator('.sentences-list .sentence-en').first();
    await expect(sentenceEn).toBeVisible();
    
    // Verify it has blur-reveal class
    const hasBlurReveal = await sentenceEn.evaluate(el => el.classList.contains('blur-reveal'));
    expect(hasBlurReveal).toBe(true);
    console.log('✓ Sentence English has blur-reveal class');
    
    // Verify it has title attribute
    const title = await sentenceEn.getAttribute('title');
    expect(title).toContain('reveal');
    console.log('✓ Sentence English has title attribute');
    
    // Click to reveal
    await sentenceEn.click();
    await page.waitForTimeout(200);
    
    // Verify revealed class is added
    const hasRevealed = await sentenceEn.evaluate(el => el.classList.contains('revealed'));
    expect(hasRevealed).toBe(true);
    console.log('✓ Sentence English toggles revealed class on click');
  });
  
  test('Requirement: Blur-reveal functionality maintained for English translations (dialogue)', async ({ page }) => {
    // Find dialogue English translation
    const dialogueEn = page.locator('.dialogue-box .dialogue-en').first();
    await expect(dialogueEn).toBeVisible();
    
    // Verify it has blur-reveal class
    const hasBlurReveal = await dialogueEn.evaluate(el => el.classList.contains('blur-reveal'));
    expect(hasBlurReveal).toBe(true);
    console.log('✓ Dialogue English has blur-reveal class');
    
    // Verify it has title attribute
    const title = await dialogueEn.getAttribute('title');
    expect(title).toContain('reveal');
    console.log('✓ Dialogue English has title attribute');
    
    // Click to reveal
    await dialogueEn.click();
    await page.waitForTimeout(200);
    
    // Verify revealed class is added
    const hasRevealed = await dialogueEn.evaluate(el => el.classList.contains('revealed'));
    expect(hasRevealed).toBe(true);
    console.log('✓ Dialogue English toggles revealed class on click');
  });
  
  test('Validation: No WORD_MAP lookup errors in console', async ({ page }) => {
    const consoleErrors = [];
    const consoleWarnings = [];
    
    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
      if (msg.type() === 'warning' && text.includes('WORD_MAP')) {
        consoleWarnings.push(text);
      }
    });
    
    // Reload page to capture all console messages
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Check for errors
    expect(consoleErrors.length).toBe(0);
    console.log('✓ No console errors');
    
    // Check for WORD_MAP warnings (words not found)
    expect(consoleWarnings.length).toBe(0);
    console.log('✓ No WORD_MAP lookup warnings (all words found)');
  });
  
  test('Integration: Complete lesson rendering works end-to-end', async ({ page }) => {
    // Verify page loaded successfully
    const pageTitle = await page.title();
    expect(pageTitle).toContain('Lesson');
    console.log(`✓ Page loaded: ${pageTitle}`);
    
    // Verify all major sections are present
    const hasVocab = await page.locator('.vocab-list').count() > 0;
    const hasGrammar = await page.locator('.grammar-box').count() > 0;
    const hasSentences = await page.locator('.sentences-list').count() > 0;
    const hasDialogue = await page.locator('.dialogue-box').count() > 0;
    
    expect(hasVocab).toBe(true);
    expect(hasGrammar).toBe(true);
    expect(hasSentences).toBe(true);
    expect(hasDialogue).toBe(true);
    console.log('✓ All major sections present (vocab, grammar, sentences, dialogue)');
    
    // Count total ruby elements on page
    const totalRubyCount = await page.locator('ruby').count();
    console.log(`✓ Total ruby elements on page: ${totalRubyCount}`);
    expect(totalRubyCount).toBeGreaterThan(30);
    
    console.log('✓ End-to-end lesson rendering works correctly');
  });
  
  test('Validation: Reading section uses renderLine (if present)', async ({ page }) => {
    // Check if reading section exists
    const readingSection = page.locator('.readings-container');
    const hasReading = await readingSection.count() > 0;
    
    if (hasReading) {
      console.log('✓ Reading section found on page');
      
      // Verify reading section has ruby elements
      const rubyCount = await page.locator('.readings-container ruby').count();
      console.log(`✓ Found ${rubyCount} ruby elements in reading section`);
      expect(rubyCount).toBeGreaterThan(0);
      
      // Verify no old v2 .reading-py class
      const oldPyCount = await page.locator('.readings-container .reading-py').count();
      expect(oldPyCount).toBe(0);
      console.log('✓ No v2 .reading-py elements found');
    } else {
      console.log('ℹ Reading section not present on this lesson (OK)');
    }
  });
  
});
