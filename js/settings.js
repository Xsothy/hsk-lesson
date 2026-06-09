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
  let cachedVoices = [];

  function debugLog(msg) {
    console.log(`[settings] ${msg}`);
    const consoleEl = document.getElementById('debug-console');
    if (consoleEl) {
      const entry = document.createElement('div');
      entry.textContent = `> ${msg}`;
      consoleEl.prepend(entry);
      // Keep only last 20 entries
      while (consoleEl.children.length > 20) consoleEl.lastChild.remove();
    }
  }

  /**
   * Proactively load and cache voices
   */
  function refreshVoices() {
    if (!window.speechSynthesis) return;
    
    // Get voices from service if available, otherwise filter manually
    if (window.HSK_AUDIO && window.HSK_AUDIO.getVoices) {
      cachedVoices = window.HSK_AUDIO.getVoices();
    } else {
      const allVoices = window.speechSynthesis.getVoices();
      cachedVoices = allVoices.filter(voice => 
        voice.lang.startsWith('zh') || 
        voice.lang.includes('CN') ||
        voice.lang.includes('TW') ||
        voice.lang.includes('HK')
      );
    }

    if (cachedVoices.length > 0) {
      debugLog(`Cached ${cachedVoices.length} Chinese voices`);
      const ttsVoiceSelect = document.getElementById('tts-voice-select');
      if (ttsVoiceSelect) populateVoices(ttsVoiceSelect);
    }
  }

  // Initialize on page load
  function init() {
    debugLog('Init settings...');
    loadSettings();
    applySettings();
    
    // Sync initially with audio service
    if (window.HSK_AUDIO && currentSettings.tts.voice) {
      window.HSK_AUDIO.saveSelectedVoice(currentSettings.tts.voice);
    }

    syncModalWithSettings();

    // Proactively "poke" the speech engine to wake it up (common mobile fix)
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      debugLog('Speech engine poked');
    }

    refreshVoices();
    debugLog('Init complete');
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
      // Always try to populate from cache when opening
      if (ttsVoiceSelect) populateVoices(ttsVoiceSelect);
      syncModalWithSettings();
      debugLog('Modal opened');
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

    // Refresh voices button
    const refreshBtn = document.getElementById('refresh-voices-btn');
    refreshBtn?.addEventListener('click', () => {
      debugLog('Manual refresh...');
      if (window.speechSynthesis) window.speechSynthesis.getVoices();
      populateVoices(ttsVoiceSelect);
    });

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
    if (!selectElement) return;
    
    if (!window.speechSynthesis) {
      debugLog('Error: speechSynthesis missing');
      return;
    }
    
    debugLog(`Populating UI with ${cachedVoices.length} cached voices`);
    
    selectElement.innerHTML = '';
    
    // Add default option (Always available)
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '🌐 System Default / Browser Auto';
    selectElement.appendChild(defaultOption);
    
    if (cachedVoices.length === 0) {
      debugLog('No cached voices - only System Default available');
      return;
    }

    // Filter for "Popular/High Quality" voices
    const popularVoices = cachedVoices.filter(v => {
      const name = v.name.toLowerCase();
      const isGoogle = name.includes('google');
      const isMicrosoftHighQual = name.includes('microsoft') && (name.includes('natural') || name.includes('neural'));
      const isApplePremium = name.includes('premium') || name.includes('siri');
      return isGoogle || isMicrosoftHighQual || isApplePremium;
    });

    // If we have popular voices, use only those. Otherwise use all Chinese voices.
    const voicesToDisplay = popularVoices.length > 0 ? popularVoices : cachedVoices;

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
      debugLog('onvoiceschanged event');
      refreshVoices();
    };
    
    // Fallback: try populating several times for mobile browsers
    [100, 500, 1000, 2000, 5000].forEach(delay => {
      setTimeout(() => {
        if (cachedVoices.length === 0) {
          debugLog(`Retry loading (${delay}ms)...`);
          refreshVoices();
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
