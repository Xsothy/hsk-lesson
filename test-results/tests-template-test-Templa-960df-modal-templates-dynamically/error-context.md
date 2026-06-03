# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\template-test.spec.js >> Template Loader >> should load modal templates dynamically
- Location: tests\template-test.spec.js:9:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8080/index.html
Call log:
  - navigating to "http://localhost:8080/index.html", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e6]:
    - heading "This site can’t be reached" [level=1] [ref=e7]
    - paragraph [ref=e8]:
      - strong [ref=e9]: localhost
      - text: refused to connect.
    - generic [ref=e10]:
      - paragraph [ref=e11]: "Try:"
      - list [ref=e12]:
        - listitem [ref=e13]: Checking the connection
        - listitem [ref=e14]:
          - link "Checking the proxy and the firewall" [ref=e15] [cursor=pointer]:
            - /url: "#buttons"
    - generic [ref=e16]: ERR_CONNECTION_REFUSED
  - generic [ref=e17]:
    - button "Reload" [ref=e19] [cursor=pointer]
    - button "Details" [ref=e20] [cursor=pointer]
```

# Test source

```ts
  1   | // @ts-check
  2   | const { test, expect } = require('@playwright/test');
  3   | 
  4   | /**
  5   |  * Test suite for template loader functionality
  6   |  */
  7   | 
  8   | test.describe('Template Loader', () => {
  9   |   test('should load modal templates dynamically', async ({ page }) => {
  10  |     // Start server and navigate to page
> 11  |     await page.goto('http://localhost:8080/index.html');
      |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:8080/index.html
  12  |     
  13  |     // Wait for page to load completely
  14  |     await page.waitForLoadState('networkidle');
  15  |     
  16  |     // Wait for templates to load
  17  |     await page.waitForTimeout(1000);
  18  |     
  19  |     // Check if template loader is available
  20  |     const hasTemplateLoader = await page.evaluate(() => {
  21  |       return typeof window.HSK_TEMPLATES !== 'undefined';
  22  |     });
  23  |     
  24  |     console.log('Template loader available:', hasTemplateLoader);
  25  |     expect(hasTemplateLoader).toBe(true);
  26  |     
  27  |     // Check if templates are loaded in DOM
  28  |     const templates = await page.evaluate(() => {
  29  |       return {
  30  |         modal: document.getElementById('vocab-modal-template') !== null,
  31  |         breakdown: document.getElementById('breakdown-section-template') !== null,
  32  |         breakdownItem: document.getElementById('breakdown-item-template') !== null,
  33  |         stroke: document.getElementById('stroke-section-template') !== null,
  34  |         example: document.getElementById('example-item-template') !== null
  35  |       };
  36  |     });
  37  |     
  38  |     console.log('Templates loaded:', templates);
  39  |     
  40  |     expect(templates.modal).toBe(true);
  41  |     expect(templates.breakdown).toBe(true);
  42  |     expect(templates.breakdownItem).toBe(true);
  43  |     expect(templates.stroke).toBe(true);
  44  |     expect(templates.example).toBe(true);
  45  |   });
  46  | 
  47  |   test('should load templates from includes folder', async ({ page }) => {
  48  |     // Test that the template file can be accessed
  49  |     const response = await page.goto('http://localhost:8080/includes/modal-templates.html');
  50  |     expect(response.status()).toBe(200);
  51  |     
  52  |     const content = await response.text();
  53  |     expect(content).toContain('vocab-modal-template');
  54  |     expect(content).toContain('breakdown-section-template');
  55  |     expect(content).toContain('breakdown-item-template');
  56  |     expect(content).toContain('stroke-section-template');
  57  |     expect(content).toContain('example-item-template');
  58  |     
  59  |     console.log('Template file accessible and contains all required templates');
  60  |   });
  61  | 
  62  |   test('should work on both index.html and lesson.html', async ({ page }) => {
  63  |     // Test index.html
  64  |     await page.goto('http://localhost:8080/index.html');
  65  |     await page.waitForLoadState('networkidle');
  66  |     await page.waitForTimeout(1000);
  67  |     
  68  |     let templatesLoaded = await page.evaluate(() => {
  69  |       return document.getElementById('vocab-modal-template') !== null;
  70  |     });
  71  |     
  72  |     expect(templatesLoaded).toBe(true);
  73  |     console.log('✓ Templates loaded on index.html');
  74  |     
  75  |     // Test lesson.html
  76  |     await page.goto('http://localhost:8080/lesson.html');
  77  |     await page.waitForLoadState('networkidle');
  78  |     await page.waitForTimeout(1000);
  79  |     
  80  |     templatesLoaded = await page.evaluate(() => {
  81  |       return document.getElementById('vocab-modal-template') !== null;
  82  |     });
  83  |     
  84  |     expect(templatesLoaded).toBe(true);
  85  |     console.log('✓ Templates loaded on lesson.html');
  86  |   });
  87  | 
  88  |   test('should have modal functionality available', async ({ page }) => {
  89  |     await page.goto('http://localhost:8080/index.html');
  90  |     await page.waitForLoadState('networkidle');
  91  |     await page.waitForTimeout(1500);
  92  |     
  93  |     // Check if modal API is available
  94  |     const hasModalAPI = await page.evaluate(() => {
  95  |       return typeof window.HSK_MODAL !== 'undefined' &&
  96  |              typeof window.HSK_MODAL.open === 'function' &&
  97  |              typeof window.HSK_MODAL.close === 'function';
  98  |     });
  99  |     
  100 |     expect(hasModalAPI).toBe(true);
  101 |     console.log('✓ Modal API available');
  102 |     
  103 |     // Check if templates are ready
  104 |     const templatesReady = await page.evaluate(() => {
  105 |       return document.getElementById('vocab-modal-template') !== null;
  106 |     });
  107 |     
  108 |     expect(templatesReady).toBe(true);
  109 |     console.log('✓ Templates ready for modal creation');
  110 |   });
  111 | });
```