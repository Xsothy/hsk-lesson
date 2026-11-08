// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Test suite for template loader functionality
 */

test.describe('Template Loader', () => {
  test('should load modal templates dynamically', async ({ page }) => {
    // Start server and navigate to page
    await page.goto('http://localhost:8080/index.html');
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // Wait for templates to load
    await page.waitForTimeout(1000);
    
    // Check if template loader is available
    const hasTemplateLoader = await page.evaluate(() => {
      return typeof window.HSK_TEMPLATES !== 'undefined';
    });
    
    console.log('Template loader available:', hasTemplateLoader);
    expect(hasTemplateLoader).toBe(true);
    
    // Check if templates are loaded in DOM
    const templates = await page.evaluate(() => {
      return {
        modal: document.getElementById('vocab-modal-template') !== null,
        breakdown: document.getElementById('breakdown-section-template') !== null,
        breakdownItem: document.getElementById('breakdown-item-template') !== null,
        stroke: document.getElementById('stroke-section-template') !== null,
        example: document.getElementById('example-item-template') !== null
      };
    });
    
    console.log('Templates loaded:', templates);
    
    expect(templates.modal).toBe(true);
    expect(templates.breakdown).toBe(true);
    expect(templates.breakdownItem).toBe(true);
    expect(templates.stroke).toBe(true);
    expect(templates.example).toBe(true);
  });

  test('should load templates from includes folder', async ({ page }) => {
    // Test that the template file can be accessed
    const response = await page.goto('http://localhost:8080/includes/modal-templates.html');
    expect(response.status()).toBe(200);
    
    const content = await response.text();
    expect(content).toContain('vocab-modal-template');
    expect(content).toContain('breakdown-section-template');
    expect(content).toContain('breakdown-item-template');
    expect(content).toContain('stroke-section-template');
    expect(content).toContain('example-item-template');
    
    console.log('Template file accessible and contains all required templates');
  });

  test('should work on both index.html and lesson.html', async ({ page }) => {
    // Test index.html
    await page.goto('http://localhost:8080/index.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    let templatesLoaded = await page.evaluate(() => {
      return document.getElementById('vocab-modal-template') !== null;
    });
    
    expect(templatesLoaded).toBe(true);
    console.log('✓ Templates loaded on index.html');
    
    // Test lesson.html
    await page.goto('http://localhost:8080/lesson.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    templatesLoaded = await page.evaluate(() => {
      return document.getElementById('vocab-modal-template') !== null;
    });
    
    expect(templatesLoaded).toBe(true);
    console.log('✓ Templates loaded on lesson.html');
  });

  test('should have modal functionality available', async ({ page }) => {
    await page.goto('http://localhost:8080/index.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    
    // Check if modal API is available
    const hasModalAPI = await page.evaluate(() => {
      return typeof window.HSK_MODAL !== 'undefined' &&
             typeof window.HSK_MODAL.open === 'function' &&
             typeof window.HSK_MODAL.close === 'function';
    });
    
    expect(hasModalAPI).toBe(true);
    console.log('✓ Modal API available');
    
    // Check if templates are ready
    const templatesReady = await page.evaluate(() => {
      return document.getElementById('vocab-modal-template') !== null;
    });
    
    expect(templatesReady).toBe(true);
    console.log('✓ Templates ready for modal creation');
  });
});
