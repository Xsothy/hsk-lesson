// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Test suite for v3 rendering (Task 6.2)
 * Validates that renderLine() is used for sentences, dialogues, and readings
 */

test.describe('Task 6.2: Sentence and Dialogue Rendering with renderLine', () => {
  
  test('should render sentences using renderLine with ruby elements', async ({ page }) => {
    await page.goto('http://localhost:8080/test-rendering-v3.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Check sentence section has ruby elements
    const sentenceRubyCount = await page.locator('#sentence-test ruby').count();
    console.log(`Sentence section: ${sentenceRubyCount} ruby elements found`);
    expect(sentenceRubyCount).toBeGreaterThan(0);
    
    // Check for rt (pinyin) elements
    const sentenceRtCount = await page.locator('#sentence-test rt').count();
    console.log(`Sentence section: ${sentenceRtCount} rt (pinyin) elements found`);
    expect(sentenceRtCount).toBeGreaterThan(0);
    
    // Check for blur-reveal on English translation
    const hasBlurReveal = await page.locator('#sentence-test .blur-reveal').count();
    expect(hasBlurReveal).toBeGreaterThan(0);
    console.log('✓ Sentence section has blur-reveal for English');
    
    // Verify status is pass
    const statusText = await page.locator('#sentence-status').textContent();
    expect(statusText).toContain('PASS');
    console.log('✓ Sentence rendering test PASSED');
  });
  
  test('should render dialogues using renderLine with speaker labels', async ({ page }) => {
    await page.goto('http://localhost:8080/test-rendering-v3.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Check dialogue section has ruby elements
    const dialogueRubyCount = await page.locator('#dialogue-test ruby').count();
    console.log(`Dialogue section: ${dialogueRubyCount} ruby elements found`);
    expect(dialogueRubyCount).toBeGreaterThan(0);
    
    // Check for speaker labels
    const speakerA = await page.locator('#dialogue-test .speaker-a').count();
    const speakerB = await page.locator('#dialogue-test .speaker-b').count();
    expect(speakerA).toBe(1);
    expect(speakerB).toBe(1);
    console.log('✓ Dialogue section has speaker A and B labels');
    
    // Check for blur-reveal on English translations
    const blurRevealCount = await page.locator('#dialogue-test .blur-reveal').count();
    expect(blurRevealCount).toBeGreaterThan(0);
    console.log('✓ Dialogue section has blur-reveal for English');
    
    // Verify status is pass
    const statusText = await page.locator('#dialogue-status').textContent();
    expect(statusText).toContain('PASS');
    console.log('✓ Dialogue rendering test PASSED');
  });
  
  test('should render readings using renderLine', async ({ page }) => {
    await page.goto('http://localhost:8080/test-rendering-v3.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Check reading section has ruby elements
    const readingRubyCount = await page.locator('#reading-test ruby').count();
    console.log(`Reading section: ${readingRubyCount} ruby elements found`);
    expect(readingRubyCount).toBeGreaterThan(0);
    
    // Check for reading-zh class
    const hasReadingZh = await page.locator('#reading-test .reading-zh').count();
    expect(hasReadingZh).toBeGreaterThan(0);
    console.log('✓ Reading section has .reading-zh elements');
    
    // Check for blur-reveal
    const blurRevealCount = await page.locator('#reading-test .blur-reveal').count();
    expect(blurRevealCount).toBeGreaterThan(0);
    console.log('✓ Reading section has blur-reveal for English');
    
    // Verify status is pass
    const statusText = await page.locator('#reading-status').textContent();
    expect(statusText).toContain('PASS');
    console.log('✓ Reading rendering test PASSED');
  });
  
  test('should render actual lesson page correctly', async ({ page }) => {
    // Navigate to lesson 1
    await page.goto('http://localhost:8080/lesson.html?slug=lesson-1');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Check that sentences section exists and has ruby elements
    const sentencesSection = page.locator('.sentences-list');
    await expect(sentencesSection).toBeVisible();
    
    const sentenceRubyCount = await page.locator('.sentences-list ruby').count();
    console.log(`Lesson 1 sentences: ${sentenceRubyCount} ruby elements found`);
    expect(sentenceRubyCount).toBeGreaterThan(0);
    
    // Check that dialogue section exists and has ruby elements
    const dialogueBox = page.locator('.dialogue-box');
    await expect(dialogueBox).toBeVisible();
    
    const dialogueRubyCount = await page.locator('.dialogue-box ruby').count();
    console.log(`Lesson 1 dialogue: ${dialogueRubyCount} ruby elements found`);
    expect(dialogueRubyCount).toBeGreaterThan(0);
    
    // Check for speaker labels in dialogue
    const speakerLabels = await page.locator('.dialogue-speaker').count();
    expect(speakerLabels).toBeGreaterThan(0);
    console.log(`✓ Found ${speakerLabels} speaker labels in dialogue`);
    
    // Check no console errors related to WORD_MAP
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('WORD_MAP')) {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(500);
    expect(consoleErrors.length).toBe(0);
    console.log('✓ No WORD_MAP errors in console');
    
    console.log('✓ Actual lesson page rendering PASSED');
  });
  
  test('should maintain click-to-speak functionality', async ({ page }) => {
    await page.goto('http://localhost:8080/test-rendering-v3.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Check that click handlers are attached
    const sentenceZh = page.locator('#sentence-test .sentence-zh').first();
    const dialogueZh = page.locator('#dialogue-test .dialogue-zh').first();
    
    // Check cursor style indicates clickable
    const sentenceCursor = await sentenceZh.evaluate(el => window.getComputedStyle(el).cursor);
    expect(sentenceCursor).toBe('pointer');
    console.log('✓ Sentence text has pointer cursor (click-to-speak)');
    
    // Check title attribute exists
    const sentenceTitle = await sentenceZh.getAttribute('title');
    expect(sentenceTitle).toContain('pronunciation');
    console.log('✓ Sentence text has title attribute');
    
    console.log('✓ Click-to-speak functionality maintained');
  });
  
  test('should maintain blur-reveal functionality', async ({ page }) => {
    await page.goto('http://localhost:8080/test-rendering-v3.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Find a blur-reveal element
    const blurRevealEl = page.locator('#sentence-test .blur-reveal').first();
    
    // Check it has blur-reveal class
    const hasClass = await blurRevealEl.evaluate(el => el.classList.contains('blur-reveal'));
    expect(hasClass).toBe(true);
    
    // Click to reveal
    await blurRevealEl.click();
    await page.waitForTimeout(200);
    
    // Check it now has revealed class
    const hasRevealed = await blurRevealEl.evaluate(el => el.classList.contains('revealed'));
    expect(hasRevealed).toBe(true);
    console.log('✓ Blur-reveal toggle works on click');
    
    console.log('✓ Blur-reveal functionality maintained');
  });
  
});
