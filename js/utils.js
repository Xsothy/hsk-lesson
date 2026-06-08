(function () {
  const TONE_COLORS = {
    1: '#ef4444', // Red
    2: '#22c55e', // Green
    3: '#3b82f6', // Blue
    4: '#a855f7', // Purple
    0: '#94a3b8'  // Gray (Neutral)
  };

  function getUrlParam(name, fallback = '') {
    return new URLSearchParams(window.location.search).get(name) || fallback;
  }

  function dictLink(char) {
    return `https://www.mdbg.net/chinese/dictionary?page=worddict&wdrst=0&wdqb=${encodeURIComponent(char)}`;
  }

  function setupPinyinToggle(buttonId = 'pinyin-toggle') {
    // Note: Pinyin toggle is now managed by settings.js
    // This function is kept for backward compatibility but does nothing
    console.log('[utils] setupPinyinToggle called - now managed by settings.js');
  }

  function speakChinese(text, options = {}) {
    // Use new audio service if available, otherwise fallback to old method
    if (window.HSK_AUDIO) {
      window.HSK_AUDIO.speak(text, options);
      return;
    }
    
    // Fallback to old Web Speech API method
    if (!window.speechSynthesis) {
      console.warn('Speech synthesis not supported');
      return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang || 'zh-CN';
    utterance.rate = options.rate || 0.85;
    
    if (options.onEnd) utterance.onend = options.onEnd;
    if (options.onError) utterance.onerror = options.onError;
    
    window.speechSynthesis.speak(utterance);
  }

  function createAudioButton(text, size = 'md') {
    const btn = document.createElement('button');
    btn.className = `audio-btn audio-btn-${size}`;
    btn.type = 'button';
    btn.setAttribute('aria-label', `Pronounce: ${text}`);
    btn.innerHTML = '🔊';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      speakChinese(text);
    });
    return btn;
  }

  /**
   * Helper to parse tone from a pinyin syllable
   */
  function getTone(pinyin) {
    if (!pinyin) return 0;
    // Pinyin tone marks mapping
    const tones = {
      'āēīōūǖ': 1,
      'áéíóúǘ': 2,
      'ǎěǐǒǔǚ': 3,
      'àèìòùǜ': 4
    };
    
    for (let char of pinyin) {
      for (let [marks, tone] of Object.entries(tones)) {
        if (marks.includes(char)) return tone;
      }
    }
    return 0; // Neutral
  }

  /**
   * Wraps pinyin syllables in colored spans
   */
  function colorizePinyin(pinyinStr) {
    if (!pinyinStr) return '';
    // Handle complex strings with punctuation, but keep it simple for now
    return pinyinStr.split(/(\s+|[,.!?;:])/).map(part => {
      if (/^\s+$/.test(part) || /^[,.!?;:]$/.test(part)) return part;
      const tone = getTone(part);
      const color = TONE_COLORS[tone];
      return `<span class="tone-${tone}" style="color: ${color}">${part}</span>`;
    }).join('');
  }

  function triggerConfetti() {
    if (window.confetti) {
      window.confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#e8c96a']
      });
    }
  }

  window.HSK_UTILS = {
    dictLink,
    getUrlParam,
    setupPinyinToggle,
    speakChinese,
    createAudioButton,
    getTone,
    colorizePinyin,
    triggerConfetti
  };
})();
