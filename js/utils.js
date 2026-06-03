(function () {
  function getUrlParam(name, fallback = '') {
    return new URLSearchParams(window.location.search).get(name) || fallback;
  }

  function dictLink(char) {
    return `https://www.mdbg.net/chinese/dictionary?page=worddict&wdrst=0&wdqb=${encodeURIComponent(char)}`;
  }

  function setupPinyinToggle(buttonId = 'pinyin-toggle') {
    const button = document.getElementById(buttonId);

    if (!button) return;

    button.addEventListener('click', () => {
      const nextVisible = document.body.classList.toggle('hide-pinyin') === false;
      button.classList.toggle('active', nextVisible);
      button.setAttribute('aria-pressed', String(nextVisible));
      button.title = nextVisible ? 'Hide pinyin' : 'Show pinyin';
    });
  }

  function speakChinese(text, options = {}) {
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

  window.HSK_UTILS = {
    dictLink,
    getUrlParam,
    setupPinyinToggle,
    speakChinese,
    createAudioButton
  };
})();
