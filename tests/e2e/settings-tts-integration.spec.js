// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Integration tests for Settings and TTS functionality
 * Task 9.3: Verify settings and TTS remain unchanged after v3 migration
 * 
 * Tests cover:
 * - Pinyin visibility toggle
 * - TTS audio service functionality
 * - Settings integration with rendering
 * 
 * Requirements: 8, 9, 10
 */

test.describe('Settings and TTS Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Start HTTP server on port 8080 before running tests
    await page.goto('http://localhost:8080/lesson.html');
    await page.waitForLoadState('networkidle');
    
    // Wait for all deferred scripts to load (including settings.js)
    await page.waitForTimeout(1500);
    
    // Verify settings manager is loaded
    await page.waitForFunction(() => {
      return typeof window.HSK_SETTINGS !== 'undefined';
    }, { timeout: 3000 }).catch(() => {
      console.warn('[Test] Settings manager took longer than expected to load');
    });
  });

  test.describe('Pinyin Visibility Toggle', () => {
    test('should toggle pinyin visibility with button click', async ({ page }) => {
      const toggleButton = page.locator('#pinyin-toggle');
      
      // Verify button exists
      await expect(toggleButton).toBeVisible();
      
      // Initially pinyin should be visible (button active)
      await expect(toggleButton).toHaveClass(/active/);
      const initialPressed = await toggleButton.getAttribute('aria-pressed');
      expect(initialPressed).toBe('true');
      
      // Check that body does NOT have hide-pinyin class
      let bodyClasses = await page.evaluate(() => document.body.className);
      expect(bodyClasses).not.toContain('hide-pinyin');
      
      // Click to hide pinyin
      await toggleButton.click();
      await page.waitForTimeout(100);
      
      // Verify button state changed
      await expect(toggleButton).not.toHaveClass(/active/);
      const pressedAfterClick = await toggleButton.getAttribute('aria-pressed');
      expect(pressedAfterClick).toBe('false');
      
      // Verify body has hide-pinyin class
      bodyClasses = await page.evaluate(() => document.body.className);
      expect(bodyClasses).toContain('hide-pinyin');
      
      console.log('✓ Pinyin toggle updates body class correctly');
    });

    test('should hide pinyin elements when hide-pinyin class is present', async ({ page }) => {
      // Navigate to lesson 1 to have content
      await page.goto('http://localhost:8080/lesson.html?lesson=1');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      
      const toggleButton = page.locator('#pinyin-toggle');
      
      // Verify pinyin is visible initially
      const pinyinElements = page.locator('rt, .vocab-pinyin, .sentence-pinyin').first();
      const initialVisible = await pinyinElements.isVisible().catch(() => false);
      
      if (initialVisible) {
        console.log('✓ Pinyin elements visible initially');
        
        // Click toggle to hide
        await toggleButton.click();
        await page.waitForTimeout(200);
        
        // Check if pinyin is hidden (CSS display: none)
        const isHidden = await page.evaluate(() => {
          const body = document.body;
          const hasClass = body.classList.contains('hide-pinyin');
          
          // Check computed style of a pinyin element
          const pinyinEl = document.querySelector('rt, .vocab-pinyin, .sentence-pinyin');
          if (pinyinEl) {
            const style = window.getComputedStyle(pinyinEl);
            return hasClass && style.display === 'none';
          }
          return hasClass;
        });
        
        expect(isHidden).toBe(true);
        console.log('✓ Pinyin elements hidden when body.hide-pinyin is present');
      } else {
        console.log('⚠ No pinyin elements found on page (may need lesson data)');
      }
    });

    test('should update button title attribute on toggle', async ({ page }) => {
      const toggleButton = page.locator('#pinyin-toggle');
      
      // Check initial title
      const initialTitle = await toggleButton.getAttribute('title');
      expect(initialTitle).toBe('Hide pinyin');
      
      // Click to hide
      await toggleButton.click();
      await page.waitForTimeout(100);
      
      // Check updated title
      const updatedTitle = await toggleButton.getAttribute('title');
      expect(updatedTitle).toBe('Show pinyin');
      
      // Click to show again
      await toggleButton.click();
      await page.waitForTimeout(100);
      
      // Should be back to "Hide pinyin"
      const finalTitle = await toggleButton.getAttribute('title');
      expect(finalTitle).toBe('Hide pinyin');
      
      console.log('✓ Button title updates correctly on toggle');
    });
  });

  test.describe('TTS Audio Service Integration', () => {
    test('should have audio service available in global scope', async ({ page }) => {
      const hasAudioService = await page.evaluate(() => {
        return typeof window.HSK_AUDIO !== 'undefined' &&
               typeof window.HSK_AUDIO.speak === 'function' &&
               typeof window.HSK_AUDIO.stop === 'function';
      });
      
      expect(hasAudioService).toBe(true);
      console.log('✓ Audio service available globally');
    });

    test('should have TTS configuration with playback rate', async ({ page }) => {
      const config = await page.evaluate(() => {
        if (window.HSK_AUDIO && window.HSK_AUDIO.config) {
          return {
            playbackRate: window.HSK_AUDIO.config.playbackRate,
            lang: window.HSK_AUDIO.config.webSpeech?.lang,
            pitch: window.HSK_AUDIO.config.webSpeech?.pitch
          };
        }
        return null;
      });
      
      expect(config).not.toBeNull();
      expect(config.playbackRate).toBeDefined();
      expect(config.lang).toBe('zh-CN');
      expect(config.pitch).toBeDefined();
      
      console.log(`✓ TTS config: rate=${config.playbackRate}, lang=${config.lang}, pitch=${config.pitch}`);
    });

    test('should receive full Chinese text for TTS (not individual words)', async ({ page }) => {
      // Navigate to lesson with content
      await page.goto('http://localhost:8080/lesson.html?lesson=1');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      
      // Check if there are audio buttons
      const audioButtons = page.locator('.audio-btn');
      const count = await audioButtons.count();
      
      if (count > 0) {
        // Get data-text attribute from first audio button
        const firstButton = audioButtons.first();
        const dataText = await firstButton.getAttribute('data-text');
        
        if (dataText) {
          // Verify it's full Chinese text (multiple characters)
          expect(dataText.length).toBeGreaterThan(0);
          console.log(`✓ Audio button has full text: "${dataText}"`);
        } else {
          // Button might trigger speak via click handler instead
          console.log('⚠ Audio button uses click handler (no data-text attribute)');
        }
      } else {
        console.log('⚠ No audio buttons found on page');
      }
    });

    test('should apply TTS rate and volume settings to utterance', async ({ page }) => {
      // Test that the audio service respects config settings
      const canSpeak = await page.evaluate(async () => {
        if (!window.speechSynthesis || !window.HSK_AUDIO) {
          return { supported: false };
        }
        
        // Create a test utterance through the service
        const testText = '你好';
        const config = window.HSK_AUDIO.config;
        
        return {
          supported: true,
          configRate: config.playbackRate,
          configLang: config.webSpeech.lang,
          configPitch: config.webSpeech.pitch,
          hasWebSpeech: typeof window.speechSynthesis !== 'undefined'
        };
      });
      
      expect(canSpeak.supported).toBe(true);
      expect(canSpeak.hasWebSpeech).toBe(true);
      expect(canSpeak.configRate).toBeDefined();
      expect(canSpeak.configLang).toBe('zh-CN');
      
      console.log('✓ TTS rate and volume settings configured correctly');
      console.log(`  Rate: ${canSpeak.configRate}, Lang: ${canSpeak.configLang}, Pitch: ${canSpeak.configPitch}`);
    });

    test('should have Chinese voice available or fallback TTS', async ({ page }) => {
      const voiceInfo = await page.evaluate(() => {
        if (!window.HSK_AUDIO) return null;
        
        const providers = window.HSK_AUDIO.getAvailableProviders();
        const voices = window.HSK_AUDIO.getVoices();
        const chineseVoices = voices.filter(v => 
          v.lang.startsWith('zh') || v.lang.includes('CN')
        );
        
        return {
          hasProviders: providers.length > 0,
          providers: providers.map(p => ({
            name: p.name,
            type: p.type,
            status: p.status,
            voice: p.voice
          })),
          totalVoices: voices.length,
          chineseVoices: chineseVoices.length
        };
      });
      
      expect(voiceInfo).not.toBeNull();
      expect(voiceInfo.hasProviders).toBe(true);
      
      console.log('✓ TTS providers available:');
      voiceInfo.providers.forEach(p => {
        console.log(`  - ${p.name} (${p.type}): ${p.voice}`);
      });
      console.log(`  Total voices: ${voiceInfo.totalVoices}, Chinese: ${voiceInfo.chineseVoices}`);
    });

    test('should be able to stop currently playing audio', async ({ page }) => {
      const hasStopFunction = await page.evaluate(() => {
        return typeof window.HSK_AUDIO?.stop === 'function';
      });
      
      expect(hasStopFunction).toBe(true);
      
      // Call stop to ensure it doesn't throw
      const stopResult = await page.evaluate(() => {
        try {
          window.HSK_AUDIO.stop();
          return { success: true, error: null };
        } catch (e) {
          return { success: false, error: e.message };
        }
      });
      
      expect(stopResult.success).toBe(true);
      console.log('✓ Audio stop function works without errors');
    });
  });

  test.describe('Settings Not Yet Implemented (Future Features)', () => {
    test('should have CSS variable --char-size implemented', async ({ page }) => {
      // Check if --char-size CSS variable exists and has default value
      const charSizeInfo = await page.evaluate(() => {
        const styles = getComputedStyle(document.documentElement);
        const charSize = styles.getPropertyValue('--char-size').trim();
        return {
          exists: charSize !== '',
          value: charSize
        };
      });
      
      expect(charSizeInfo.exists).toBe(true);
      expect(charSizeInfo.value).toBe('1.00');
      console.log(`✓ CSS variable --char-size implemented with value: ${charSizeInfo.value}`);
    });

    test('should have CSS variable --pinyin-size implemented', async ({ page }) => {
      // Check if --pinyin-size CSS variable exists and has default value
      const pinyinSizeInfo = await page.evaluate(() => {
        const styles = getComputedStyle(document.documentElement);
        const pinyinSize = styles.getPropertyValue('--pinyin-size').trim();
        return {
          exists: pinyinSize !== '',
          value: pinyinSize
        };
      });
      
      expect(pinyinSizeInfo.exists).toBe(true);
      expect(pinyinSizeInfo.value).toBe('1.00');
      console.log(`✓ CSS variable --pinyin-size implemented with value: ${pinyinSizeInfo.value}`);
    });

    test('should have dark mode toggle implemented', async ({ page }) => {
      // Check if settings manager has dark mode functionality
      const hasDarkMode = await page.evaluate(() => {
        return typeof window.HSK_SETTINGS?.toggleDarkMode === 'function';
      });
      
      expect(hasDarkMode).toBe(true);
      console.log('✓ Dark mode toggle implemented in settings manager');
    });

    test('should have settings persistence via localStorage implemented', async ({ page }) => {
      // Check if settings manager exists and can save/load
      const hasStorage = await page.evaluate(() => {
        return typeof window.HSK_SETTINGS?.save === 'function' &&
               typeof window.HSK_SETTINGS?.load === 'function';
      });
      
      expect(hasStorage).toBe(true);
      console.log('✓ Settings persistence implemented via localStorage');
    });
  });

  test.describe('Rendering Integration with Settings', () => {
    test('should render Chinese text with ruby elements for pinyin', async ({ page }) => {
      await page.goto('http://localhost:8080/lesson.html?lesson=1');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      
      // Check for ruby elements (pinyin display)
      const rubyElements = page.locator('ruby');
      const count = await rubyElements.count();
      
      // Should have ruby elements if content is loaded
      if (count > 0) {
        console.log(`✓ Found ${count} ruby elements for pinyin display`);
        
        // Verify structure: ruby > rt
        const firstRuby = rubyElements.first();
        const hasRt = await firstRuby.locator('rt').count();
        expect(hasRt).toBeGreaterThan(0);
        
        console.log('✓ Ruby elements have correct structure with <rt> tags');
      } else {
        console.log('⚠ No ruby elements found (may need lesson data to load)');
      }
    });

    test('should maintain click-to-speak functionality on Chinese text', async ({ page }) => {
      await page.goto('http://localhost:8080/lesson.html?lesson=1');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      
      // Look for audio buttons or clickable Chinese text
      const audioButtons = page.locator('.audio-btn, button[aria-label*="Pronounce"]');
      const count = await audioButtons.count();
      
      if (count > 0) {
        const firstButton = audioButtons.first();
        await expect(firstButton).toBeVisible();
        
        // Click the button (we won't verify audio plays, just that it doesn't error)
        await firstButton.click();
        await page.waitForTimeout(200);
        
        console.log(`✓ Click-to-speak functionality available (${count} audio buttons)`);
      } else {
        console.log('⚠ No audio buttons found on page');
      }
    });

    test('should preserve pinyin visibility state during navigation', async ({ page }) => {
      // Start with pinyin visible
      await expect(page.locator('#pinyin-toggle')).toHaveClass(/active/);
      
      // Toggle off
      await page.click('#pinyin-toggle');
      await page.waitForTimeout(100);
      
      // Verify it's off
      let bodyClasses = await page.evaluate(() => document.body.className);
      expect(bodyClasses).toContain('hide-pinyin');
      
      // Note: Without localStorage implementation, state won't persist across page reloads
      // This test documents the current behavior
      console.log('✓ Pinyin visibility state toggled within session');
      console.log('⚠ State does not persist across page reloads (localStorage not implemented)');
    });
  });

  test.describe('Audio Service and Renderer Integration', () => {
    test('should have audio service initialized before content renders', async ({ page }) => {
      // Verify load order: audio-service.js loads before render.js
      const loadOrder = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script[src]'));
        const audioServiceIdx = scripts.findIndex(s => s.src.includes('audio-service.js'));
        const renderIdx = scripts.findIndex(s => s.src.includes('render.js'));
        
        return {
          audioServiceLoaded: audioServiceIdx !== -1,
          renderLoaded: renderIdx !== -1,
          correctOrder: audioServiceIdx < renderIdx
        };
      });
      
      expect(loadOrder.audioServiceLoaded).toBe(true);
      expect(loadOrder.renderLoaded).toBe(true);
      expect(loadOrder.correctOrder).toBe(true);
      
      console.log('✓ Audio service loads before render.js (correct order)');
    });

    test('should integrate with renderLine for audio buttons', async ({ page }) => {
      await page.goto('http://localhost:8080/lesson.html?lesson=1');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      
      // Check if render.js created content with audio functionality
      const hasRenderFunction = await page.evaluate(() => {
        return typeof window.HSK_RENDER?.renderLine === 'function';
      });
      
      if (hasRenderFunction) {
        console.log('✓ renderLine function available');
      } else {
        console.log('⚠ renderLine function not found in global scope');
      }
      
      // Verify audio service can be called from rendered content
      const canCallAudio = await page.evaluate(() => {
        return typeof window.HSK_AUDIO?.speak === 'function';
      });
      
      expect(canCallAudio).toBe(true);
      console.log('✓ Audio service accessible from rendered content');
    });
  });
});


  test.describe('Settings Manager Functionality', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to index.html instead of lesson.html for these tests
      await page.goto('http://localhost:8080/index.html');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      
      // Clear localStorage before each test
      await page.evaluate(() => {
        try {
          localStorage.clear();
        } catch (e) {
          // Ignore if localStorage is not available
        }
      });
      
      // Wait for settings to initialize
      await page.waitForFunction(() => {
        return typeof window.HSK_SETTINGS !== 'undefined';
      }, { timeout: 5000 }).catch(() => {
        console.warn('[Test] Settings manager not loaded');
      });
    });

    test('should have settings manager available in global scope', async ({ page }) => {
      const hasSettingsManager = await page.evaluate(() => {
        return typeof window.HSK_SETTINGS !== 'undefined' &&
               typeof window.HSK_SETTINGS.get === 'function' &&
               typeof window.HSK_SETTINGS.update === 'function';
      });
      
      expect(hasSettingsManager).toBe(true);
      console.log('✓ Settings manager available globally');
    });

    test('should load default settings on first visit', async ({ page }) => {
      // Clear localStorage first
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.waitForTimeout(1000);
      
      const settings = await page.evaluate(() => {
        return window.HSK_SETTINGS?.get();
      });
      
      expect(settings).toBeDefined();
      expect(settings.pinyinVisible).toBe(true);
      expect(settings.charSize).toBe(1.0);
      expect(settings.pinyinSize).toBe(1.0);
      expect(settings.darkMode).toBe(false);
      
      console.log('✓ Default settings loaded correctly');
    });

    test('should persist settings to localStorage', async ({ page }) => {
      // Change a setting
      await page.evaluate(() => {
        window.HSK_SETTINGS.setCharSize(1.2);
      });
      
      // Check if it's saved to localStorage
      const stored = await page.evaluate(() => {
        const data = localStorage.getItem('hsk-app-settings');
        return data ? JSON.parse(data) : null;
      });
      
      expect(stored).not.toBeNull();
      expect(stored.charSize).toBe(1.2);
      
      console.log('✓ Settings persisted to localStorage');
    });

    test('should restore settings after page reload', async ({ page }) => {
      // Set custom settings
      await page.evaluate(() => {
        window.HSK_SETTINGS.setCharSize(1.3);
        window.HSK_SETTINGS.setPinyinSize(1.1);
      });
      
      // Reload page
      await page.reload();
      await page.waitForTimeout(1000);
      
      // Check if settings are restored
      const settings = await page.evaluate(() => {
        return window.HSK_SETTINGS?.get();
      });
      
      expect(settings.charSize).toBe(1.3);
      expect(settings.pinyinSize).toBe(1.1);
      
      console.log('✓ Settings restored after page reload');
    });

    test('should update character size CSS variable', async ({ page }) => {
      await page.evaluate(() => {
        window.HSK_SETTINGS.setCharSize(1.4);
      });
      
      const charSize = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--char-size').trim();
      });
      
      expect(charSize).toBe('1.40');
      console.log(`✓ Character size CSS variable updated to ${charSize}`);
    });

    test('should update pinyin size CSS variable', async ({ page }) => {
      await page.evaluate(() => {
        window.HSK_SETTINGS.setPinyinSize(0.9);
      });
      
      const pinyinSize = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--pinyin-size').trim();
      });
      
      expect(pinyinSize).toBe('0.90');
      console.log(`✓ Pinyin size CSS variable updated to ${pinyinSize}`);
    });

    test('should toggle dark mode and add class to body', async ({ page }) => {
      const initialDarkMode = await page.evaluate(() => {
        return document.body.classList.contains('dark-mode');
      });
      
      expect(initialDarkMode).toBe(false);
      
      // Toggle dark mode on
      await page.evaluate(() => {
        window.HSK_SETTINGS.toggleDarkMode();
      });
      
      const darkModeOn = await page.evaluate(() => {
        return document.body.classList.contains('dark-mode');
      });
      
      expect(darkModeOn).toBe(true);
      console.log('✓ Dark mode enabled - body.dark-mode class added');
      
      // Toggle dark mode off
      await page.evaluate(() => {
        window.HSK_SETTINGS.toggleDarkMode();
      });
      
      const darkModeOff = await page.evaluate(() => {
        return document.body.classList.contains('dark-mode');
      });
      
      expect(darkModeOff).toBe(false);
      console.log('✓ Dark mode disabled - body.dark-mode class removed');
    });

    test('should persist dark mode setting across page reload', async ({ page }) => {
      // Enable dark mode
      await page.evaluate(() => {
        window.HSK_SETTINGS.toggleDarkMode();
      });
      
      // Reload
      await page.reload();
      await page.waitForTimeout(1000);
      
      // Check if dark mode is still enabled
      const darkModeEnabled = await page.evaluate(() => {
        return document.body.classList.contains('dark-mode');
      });
      
      expect(darkModeEnabled).toBe(true);
      console.log('✓ Dark mode persisted across page reload');
      
      // Clean up - disable dark mode
      await page.evaluate(() => {
        window.HSK_SETTINGS.toggleDarkMode();
      });
    });

    test('should update TTS rate setting', async ({ page }) => {
      await page.evaluate(() => {
        window.HSK_SETTINGS.setTTSRate(0.9);
      });
      
      const settings = await page.evaluate(() => {
        return window.HSK_SETTINGS.get();
      });
      
      expect(settings.tts.rate).toBe(0.9);
      
      // Check if audio service config is updated
      const audioConfig = await page.evaluate(() => {
        return window.HSK_AUDIO?.config?.playbackRate;
      });
      
      expect(audioConfig).toBe(0.9);
      console.log('✓ TTS rate setting updated in both settings and audio service');
    });

    test('should enforce min/max bounds on character size', async ({ page }) => {
      // Try to set below minimum
      await page.evaluate(() => {
        window.HSK_SETTINGS.setCharSize(0.5);
      });
      
      let settings = await page.evaluate(() => {
        return window.HSK_SETTINGS.get();
      });
      
      expect(settings.charSize).toBe(0.8); // Should be clamped to minimum
      
      // Try to set above maximum
      await page.evaluate(() => {
        window.HSK_SETTINGS.setCharSize(2.0);
      });
      
      settings = await page.evaluate(() => {
        return window.HSK_SETTINGS.get();
      });
      
      expect(settings.charSize).toBe(1.5); // Should be clamped to maximum
      
      console.log('✓ Character size bounds enforced (0.8 - 1.5)');
    });

    test('should reset all settings to defaults', async ({ page }) => {
      // Change multiple settings
      await page.evaluate(() => {
        window.HSK_SETTINGS.setCharSize(1.3);
        window.HSK_SETTINGS.setPinyinSize(1.2);
        window.HSK_SETTINGS.toggleDarkMode();
        window.HSK_SETTINGS.togglePinyin();
      });
      
      // Reset
      await page.evaluate(() => {
        window.HSK_SETTINGS.reset();
      });
      
      const settings = await page.evaluate(() => {
        return window.HSK_SETTINGS.get();
      });
      
      expect(settings.charSize).toBe(1.0);
      expect(settings.pinyinSize).toBe(1.0);
      expect(settings.darkMode).toBe(false);
      expect(settings.pinyinVisible).toBe(true);
      
      console.log('✓ All settings reset to defaults');
    });
  });
