/**
 * Settings Manager
 * Manages user preferences: pinyin visibility, character size, pinyin size, dark mode, TTS settings
 * Uses localStorage for persistence
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'hsk-app-settings';

  // Default settings
  const DEFAULT_SETTINGS = {
    pinyinVisible: true,
    pinyinPosition: 'top',  // 'top' or 'bottom'
    charSize: 1.0,      // Multiplier for character size (0.8 - 1.5)
    tts: {
      rate: 0.7,        // Speech rate (0.5 - 2.0)
      volume: 1.0,      // Speech volume (0.0 - 1.0)
      voice: ''         // Selected voice name (empty = default)
    }
  };

  let currentSettings = { ...DEFAULT_SETTINGS };

  /**
   * Load settings from localStorage
   */
  function loadSettings() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        currentSettings = { 
          ...DEFAULT_SETTINGS, 
          ...parsed,
          tts: { ...DEFAULT_SETTINGS.tts, ...parsed.tts }
        };
        console.log('✓ Settings loaded from localStorage');
      }
    } catch (e) {
      console.warn('[settings] Failed to load settings, using defaults:', e);
      currentSettings = { ...DEFAULT_SETTINGS };
    }
    return currentSettings;
  }

  /**
   * Save settings to localStorage
   */
  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
      console.log('✓ Settings saved to localStorage');
    } catch (e) {
      console.error('[settings] Failed to save settings:', e);
    }
  }

  /**
   * Apply settings to the DOM
   */
  function applySettings() {
    const root = document.documentElement;
    const body = document.body;

    // Pinyin visibility
    if (currentSettings.pinyinVisible) {
      body.classList.remove('hide-pinyin');
    } else {
      body.classList.add('hide-pinyin');
    }

    // Pinyin position
    if (currentSettings.pinyinPosition === 'bottom') {
      body.classList.add('pinyin-bottom');
    } else {
      body.classList.remove('pinyin-bottom');
    }

    // Character size (CSS variable)
    root.style.setProperty('--char-size', currentSettings.charSize.toFixed(2));

    // Update audio service TTS settings if available
    if (window.HSK_AUDIO && window.HSK_AUDIO.config) {
      window.HSK_AUDIO.config.playbackRate = currentSettings.tts.rate;
      // Apply selected voice if set
      if (currentSettings.tts.voice) {
        window.HSK_AUDIO.config.selectedVoice = currentSettings.tts.voice;
      }
    }

    console.log('✓ Settings applied to DOM');
  }

  /**
   * Get current settings
   */
  function getSettings() {
    return { ...currentSettings };
  }

  /**
   * Update a setting
   */
  function updateSetting(key, value) {
    if (key === 'tts.rate' || key === 'tts.volume') {
      const [parent, child] = key.split('.');
      currentSettings[parent][child] = value;
    } else {
      currentSettings[key] = value;
    }
    saveSettings();
    applySettings();
  }

  /**
   * Reset to default settings
   */
  function resetSettings() {
    currentSettings = { ...DEFAULT_SETTINGS };
    saveSettings();
    applySettings();
    console.log('✓ Settings reset to defaults');
  }

  /**
   * Toggle pinyin visibility
   */
  function togglePinyin() {
    currentSettings.pinyinVisible = !currentSettings.pinyinVisible;
    saveSettings();
    applySettings();
    return currentSettings.pinyinVisible;
  }

  /**
   * Toggle dark mode
   */
  function toggleDarkMode() {
    // Dark mode temporarily disabled
    return false;
  }

  /**
   * Set character size
   */
  function setCharSize(size) {
    currentSettings.charSize = Math.max(0.8, Math.min(1.5, size));
    saveSettings();
    applySettings();
    return currentSettings.charSize;
  }

  /**
   * Set pinyin size
   */
  function setPinyinSize(size) {
    // Deprecated - pinyin size now scales with char size
    return 1.0;
  }

  /**
   * Toggle pinyin position (top/bottom)
   */
  function togglePinyinPosition() {
    currentSettings.pinyinPosition = currentSettings.pinyinPosition === 'top' ? 'bottom' : 'top';
    saveSettings();
    applySettings();
    return currentSettings.pinyinPosition;
  }

  /**
   * Set TTS rate
   */
  function setTTSRate(rate) {
    currentSettings.tts.rate = Math.max(0.5, Math.min(2.0, rate));
    saveSettings();
    applySettings();
    return currentSettings.tts.rate;
  }

  /**
   * Set TTS voice
   */
  function setTTSVoice(voiceURI) {
    currentSettings.tts.voice = voiceURI;
    saveSettings();
    applySettings();
    
    // Sync with audio service
    if (window.HSK_AUDIO && window.HSK_AUDIO.saveSelectedVoice) {
      window.HSK_AUDIO.saveSelectedVoice(voiceURI);
    }
    
    return currentSettings.tts.voice;
  }

  // Initialize on page load
  function init() {
    loadSettings();
    applySettings();
    
    // Sync initially with audio service
    if (window.HSK_AUDIO && currentSettings.tts.voice) {
      window.HSK_AUDIO.saveSelectedVoice(currentSettings.tts.voice);
    }

    syncModalWithSettings();
  }

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ═══════════════════════════════════════════════════════════════
  // SETTINGS MODAL UI
  // ═══════════════════════════════════════════════════════════════

  function initSettingsModal() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const settingsClose = document.querySelector('.settings-close');
    const settingsBackdrop = document.querySelector('.settings-backdrop');
    const settingsSave = document.getElementById('settings-save');
    const settingsReset = document.getElementById('settings-reset');

    if (!settingsBtn || !settingsModal) return;

    // Open modal
    settingsBtn.addEventListener('click', () => {
      settingsModal.classList.add('active');
      const ttsVoiceSelect = document.getElementById('tts-voice-select');
      if (ttsVoiceSelect) populateVoices(ttsVoiceSelect);
      syncModalWithSettings();
    });

    // Close modal handlers
    const closeModal = () => settingsModal.classList.remove('active');
    settingsClose?.addEventListener('click', closeModal);
    settingsBackdrop?.addEventListener('click', closeModal);

    // Escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && settingsModal.classList.contains('active')) {
        closeModal();
      }
    });

    // Settings pinyin toggle
    const settingsPinyinToggle = document.getElementById('settings-pinyin-toggle');
    settingsPinyinToggle?.addEventListener('click', () => {
      const newState = togglePinyin();
      settingsPinyinToggle.classList.toggle('active', newState);
      settingsPinyinToggle.setAttribute('aria-checked', String(newState));
    });

    // Character size slider
    const charSizeSlider = document.getElementById('char-size-slider');
    const charSizeValue = document.getElementById('char-size-value');
    charSizeSlider?.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      setCharSize(value);
      charSizeValue.textContent = value.toFixed(1) + 'x';
    });

    // TTS rate slider
    const ttsRateSlider = document.getElementById('tts-rate-slider');
    const ttsRateValue = document.getElementById('tts-rate-value');
    ttsRateSlider?.addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      setTTSRate(value);
      ttsRateValue.textContent = value.toFixed(1) + 'x';
    });

    // TTS voice selection
    const ttsVoiceSelect = document.getElementById('tts-voice-select');
    if (ttsVoiceSelect) {
      ttsVoiceSelect.addEventListener('change', (e) => {
        setTTSVoice(e.target.value);
      });
    }

    // Test voice button
    const testVoiceBtn = document.getElementById('test-voice-btn');
    testVoiceBtn?.addEventListener('click', () => {
      testVoice();
    });

    // Pinyin position toggle
    const pinyinPositionToggle = document.getElementById('settings-pinyin-position');
    const pinyinPositionLabel = document.getElementById('pinyin-position-label');
    pinyinPositionToggle?.addEventListener('click', () => {
      const newPosition = togglePinyinPosition();
      pinyinPositionToggle.classList.toggle('active', newPosition === 'bottom');
      pinyinPositionToggle.setAttribute('aria-checked', String(newPosition === 'bottom'));
      if (pinyinPositionLabel) {
        pinyinPositionLabel.textContent = newPosition === 'bottom' 
          ? 'Below characters' 
          : 'Above characters (default)';
      }
    });

    // Save button (just closes modal)
    settingsSave?.addEventListener('click', closeModal);

    // Reset button
    settingsReset?.addEventListener('click', () => {
      if (confirm('This will reset all your preferences (character size, voice, pinyin toggle) to defaults. Continue?')) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('hsk1_tts_voice');
        window.location.reload();
      }
    });
  }

  /**
   * Sync modal controls with current settings
   */
  function syncModalWithSettings() {
    const settings = currentSettings;

    // Update sliders
    const charSizeSlider = document.getElementById('char-size-slider');
    const ttsRateSlider = document.getElementById('tts-rate-slider');

    if (charSizeSlider) {
      charSizeSlider.value = settings.charSize;
      document.getElementById('char-size-value').textContent = settings.charSize.toFixed(1) + 'x';
    }

    if (ttsRateSlider) {
      ttsRateSlider.value = settings.tts.rate;
      document.getElementById('tts-rate-value').textContent = settings.tts.rate.toFixed(1) + 'x';
    }

    // Update toggles
    const settingsPinyinToggle = document.getElementById('settings-pinyin-toggle');
    const pinyinPositionToggle = document.getElementById('settings-pinyin-position');
    const pinyinPositionLabel = document.getElementById('pinyin-position-label');

    if (settingsPinyinToggle) {
      settingsPinyinToggle.classList.toggle('active', settings.pinyinVisible);
      settingsPinyinToggle.setAttribute('aria-checked', String(settings.pinyinVisible));
    }

    if (pinyinPositionToggle) {
      const isBottom = settings.pinyinPosition === 'bottom';
      pinyinPositionToggle.classList.toggle('active', isBottom);
      pinyinPositionToggle.setAttribute('aria-checked', String(isBottom));
      if (pinyinPositionLabel) {
        pinyinPositionLabel.textContent = isBottom ? 'Below characters' : 'Above characters (default)';
      }
    }

    // Update voice selection
    const ttsVoiceSelect = document.getElementById('tts-voice-select');
    if (ttsVoiceSelect && settings.tts.voice) {
      ttsVoiceSelect.value = settings.tts.voice;
    }
  }

  /**
   * Test the selected voice with a sample sentence
   */
  function testVoice() {
    if (window.HSK_AUDIO && window.HSK_AUDIO.speak) {
      const testSentences = [
        '你好！我叫李华。',
        '今天天气很好。',
        '我喜欢学习中文。',
        '谢谢你的帮助。'
      ];
      const randomSentence = testSentences[Math.floor(Math.random() * testSentences.length)];
      window.HSK_AUDIO.speak(randomSentence);
    }
  }

  function populateVoices(selectElement) {
    if (!selectElement || !window.speechSynthesis) return;
    
    const voices = window.speechSynthesis.getVoices();
    
    selectElement.innerHTML = '';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'System Default';
    selectElement.appendChild(defaultOption);
    
    if (voices.length === 0) {
      const loadingOption = document.createElement('option');
      loadingOption.value = '';
      loadingOption.textContent = 'Loading voices...';
      loadingOption.disabled = true;
      selectElement.appendChild(loadingOption);
      return;
    }
    
    // Use HSK_AUDIO filter if available
    let chineseVoices = [];
    if (window.HSK_AUDIO && window.HSK_AUDIO.getVoices) {
      chineseVoices = window.HSK_AUDIO.getVoices();
    } else {
      chineseVoices = voices.filter(voice => 
        voice.lang.startsWith('zh') || 
        voice.lang.includes('CN') ||
        voice.lang.includes('TW') ||
        voice.lang.includes('HK')
      );
    }

    // Filter for "Popular/High Quality" voices
    const popularVoices = chineseVoices.filter(v => {
      const name = v.name.toLowerCase();
      const isGoogle = name.includes('google');
      const isMicrosoftHighQual = name.includes('microsoft') && (name.includes('natural') || name.includes('neural'));
      const isApplePremium = name.includes('premium') || name.includes('siri');
      return isGoogle || isMicrosoftHighQual || isApplePremium;
    });

    // If we have popular voices, use only those. Otherwise use all Chinese voices.
    const voicesToDisplay = popularVoices.length > 0 ? popularVoices : chineseVoices;

    voicesToDisplay.forEach(voice => {
      const name = voice.name.toLowerCase();
      const isPopular = name.includes('google') || 
                       (name.includes('microsoft') && (name.includes('natural') || name.includes('neural'))) ||
                       (name.includes('premium') || name.includes('siri'));
      
      const isLocal = voice.localService;
      
      const option = document.createElement('option');
      option.value = voice.voiceURI;
      
      // Build label with icons
      // ⭐ = Popular/Recommended
      // 📵 = Local (No internet needed)
      // ☁️ = Online (Requires internet)
      let prefix = '';
      if (isPopular) prefix += '⭐ ';
      prefix += isLocal ? '📵 ' : '☁️ ';
      
      const connectivity = isLocal ? '[Offline]' : '[Online]';
      option.textContent = `${prefix}${voice.name} ${connectivity}`;
      
      selectElement.appendChild(option);
    });
    
    // Select current voice if set
    if (currentSettings.tts.voice) {
      selectElement.value = currentSettings.tts.voice;
    }
  }

  // Handle voice list changes
  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.onvoiceschanged = () => {
      const ttsVoiceSelect = document.getElementById('tts-voice-select');
      if (ttsVoiceSelect) {
        populateVoices(ttsVoiceSelect);
      }
    };
    
    // Fallback: try populating several times for mobile browsers
    [100, 500, 1000, 2000, 5000].forEach(delay => {
      setTimeout(() => {
        const ttsVoiceSelect = document.getElementById('tts-voice-select');
        if (ttsVoiceSelect && window.speechSynthesis.getVoices().length > 0) {
          populateVoices(ttsVoiceSelect);
        }
      }, delay);
    });
  }

  // Initialize modal UI when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSettingsModal);
  } else {
    initSettingsModal();
  }

  // Public API
  window.HSK_SETTINGS = {
    get: getSettings,
    update: updateSetting,
    reset: resetSettings,
    togglePinyin,
    togglePinyinPosition,
    toggleDarkMode,
    setCharSize,
    setPinyinSize,
    setTTSRate,
    setTTSVoice,
    testVoice,
    apply: applySettings,
    load: loadSettings,
    save: saveSettings
  };

  console.log('✓ Settings Manager initialized');
})();
