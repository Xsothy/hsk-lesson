/**
 * Audio Service for Chinese Text-to-Speech
 * Uses the device's Chinese voice (Web Speech API) first; an online voice only when the device has none
 */
(function () {
  'use strict';

  const synth = window.speechSynthesis;
  let isSpeaking   = false;
  let speechQueue  = [];
  let currentAudio = null;

  // ─────────────────────────────────────────────────────────────
  // VOICE HELPERS
  // ─────────────────────────────────────────────────────────────
  const ZH_LANGS = ['zh-CN', 'zh-TW', 'zh-HK', 'zh-SG', 'zh', 'cmn', 'chi', 'zho'];

  /**
   * Identifies if a voice is Chinese
   */
  function isChineseVoice(voice) {
    const lang = voice.lang.toLowerCase();
    const name = voice.name.toLowerCase();
    return ZH_LANGS.some(l => lang.includes(l.toLowerCase())) || 
           name.includes('chinese') || 
           name.includes('mandarin') || 
           name.includes('cantonese');
  }

  /**
   * Scores a voice based on "popularity" and quality
   * Higher score = better voice
   */
  function getVoiceScore(voice) {
    const name = voice.name.toLowerCase();
    const lang = voice.lang.toLowerCase();
    let score = 0;

    // Preferred Region: Mainland China (Mandarin)
    if (lang === 'zh-cn' || lang === 'zh_cn') score += 10;

    // High Quality Engines (Popular)
    const isGoogle = name.includes('google');
    const isMicrosoftHighQual = name.includes('microsoft') && (name.includes('natural') || name.includes('neural'));
    const isApplePremium = name.includes('premium') || name.includes('siri');

    if (isGoogle) score += 50;
    if (isMicrosoftHighQual) score += 40;
    if (isApplePremium) score += 30;

    // Bonus for local service (more reliable, no internet needed)
    if (voice.localService) score += 20;
    
    // Bonus for explicitly neural/natural if not already caught
    if (name.includes('neural') || name.includes('natural')) score += 10;

    // Penalize low quality/generic system voices
    if (name.includes('desktop')) score -= 20;
    
    return score;
  }

  function getSortedChineseVoices() {
    if (!synth) return [];
    return synth.getVoices()
      .filter(isChineseVoice)
      .sort((a, b) => getVoiceScore(b) - getVoiceScore(a));
  }

  // ─────────────────────────────────────────────────────────────
  // CONFIG
  // ─────────────────────────────────────────────────────────────
  const config = {
    playbackRate: 0.7,
    pitch:        1.0,
    lang:         'zh-CN',
    selectedVoiceURI: localStorage.getItem('hsk1_tts_voice') || '',
    fallbackTTS: {
      enabled: true,
      timeoutMs: 4000,
      url: text =>
        `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=zh-CN&client=gtx`
    }
  };

  function getChineseVoice() {
    if (!synth) return null;
    const voices = synth.getVoices();
    if (!voices.length) return null;

    // 1. Try saved URI
    if (config.selectedVoiceURI) {
      const saved = voices.find(v => v.voiceURI === config.selectedVoiceURI);
      if (saved) return saved;
    }

    // 2. Use the highest-scored Chinese voice
    const sorted = getSortedChineseVoices();
    return sorted[0] || null;
  }

  // ─────────────────────────────────────────────────────────────
  // STOP
  // ─────────────────────────────────────────────────────────────
  function stopCurrentAudio() {
    speechQueue = [];
    isSpeaking  = false;
    if (synth?.speaking) synth.cancel();
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SPEECH QUEUE
  // ─────────────────────────────────────────────────────────────
  function processQueue() {
    if (isSpeaking || !speechQueue.length) return;
    const { text, resolve, reject } = speechQueue.shift();
    speakImmediately(text, resolve, reject);
  }

  function speakImmediately(text, resolve, reject) {
    if (!synth) {
      reject(new Error('Web Speech API not available'));
      isSpeaking = false;
      processQueue();
      return;
    }

    isSpeaking = true;

    const u   = new SpeechSynthesisUtterance(text);
    u.lang    = config.lang;
    u.rate    = config.playbackRate;
    u.pitch   = config.pitch;
    
    // Get volume from local storage or default to 1
    const storedVolume = localStorage.getItem('hsk-app-settings');
    let volume = 1.0;
    try {
      if (storedVolume) {
        const settings = JSON.parse(storedVolume);
        volume = settings.tts?.volume ?? 1.0;
      }
    } catch(e) {}
    u.volume = volume;

    const voice = getChineseVoice();
    if (voice) {
      u.voice = voice;
      if (window.HSK_DEBUG) console.log(`[audio] Speaking with: ${voice.name}`);
    } else {
    }

    u.onend = () => {
      isSpeaking = false;
      resolve();
      processQueue();
    };

    u.onerror = e => {
      isSpeaking = false;
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        reject(new Error(e.error));
      } else {
        resolve(); 
      }
      processQueue();
    };

    synth.speak(u);
  }

  async function speakWithWebSpeech(text) {
    return new Promise((resolve, reject) => {
      if (isSpeaking || synth.speaking) {
        synth.cancel();
        speechQueue = [];
        isSpeaking  = false;
      }
      speechQueue.push({ text, resolve, reject });
      processQueue();
    });
  }

  // Online voice, used only when the device has no Chinese voice (or its voice fails).
  // The endpoint is unofficial and can stop working, so it is never the first choice and always has a time limit.
  async function speakWithFallbackTTS(text) {
    return new Promise((resolve, reject) => {
      if (!config.fallbackTTS.enabled) {
        reject(new Error('Fallback TTS disabled'));
        return;
      }
      if (navigator.onLine === false) { reject(new Error('Offline')); return; }
      const audio        = new Audio(config.fallbackTTS.url(text));
      audio.playbackRate = config.playbackRate;
      currentAudio       = audio;
      let settled = false;
      const finish = (err) => {
        if (settled) return;
        settled = true; clearTimeout(timer);
        if (currentAudio === audio) currentAudio = null;
        if (err) { try { audio.pause(); } catch (e) {} reject(err); } else resolve();
      };
      // No sound started within the limit: give up so the caller can try something else.
      const timer = setTimeout(() => { if (audio.currentTime === 0) finish(new Error('Fallback timed out')); }, config.fallbackTTS.timeoutMs);
      audio.onplaying    = () => clearTimeout(timer);
      audio.onended      = () => finish();
      audio.onerror      = e  => finish(new Error(`Fallback failed: ${e.type}`));
      audio.play().catch(e => finish(new Error(`Play failed: ${e.message}`)));
    });
  }

  // Tell the user once per page when nothing can play, instead of failing silently.
  let noticeShown = false;
  function notifyUnavailable() {
    try { window.dispatchEvent(new CustomEvent('hsk:audio-unavailable')); } catch (e) {}
    if (noticeShown || !document.body) return;
    noticeShown = true;
    const n = document.createElement('div');
    n.setAttribute('role', 'status');
    n.textContent = 'Audio is not available: this device has no Chinese voice. Add one in your system text-to-speech settings.';
    n.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(var(--tab-h,0px) + 16px);z-index:120;max-width:min(420px,calc(100vw - 32px));padding:12px 16px;border-radius:12px;background:var(--ink,#2e2a25);color:var(--on-ink,#fff);font-size:14px;line-height:1.4;box-shadow:0 8px 24px rgba(0,0,0,.2)';
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 7000);
  }

  /**
   * Order: 1. the device's own Chinese voice (works offline, no third party);
   * 2. the online voice; 3. the device's default voice asked to speak zh-CN (some phones list no voices but still honour the language).
   * If all fail the user is told once.
   */
  async function speak(text, options = {}) {
    if (!text?.trim()) { console.warn('[audio] No text to speak'); return; }

    // Attempt to load voices if list is empty
    if (synth && synth.getVoices().length === 0) {
      await new Promise(resolve => {
        const handler = () => {
          synth.removeEventListener('voiceschanged', handler);
          resolve();
        };
        synth.addEventListener('voiceschanged', handler);
        setTimeout(resolve, 1000);
      });
    }

    const hasChineseVoice = !!getChineseVoice();
    const attempts = hasChineseVoice
      ? [speakWithWebSpeech, speakWithFallbackTTS]
      : [speakWithFallbackTTS, ...(synth ? [speakWithWebSpeech] : [])];
    let lastError = null;
    for (const attempt of attempts) {
      try { await attempt(text); return; } catch (err) { lastError = err; console.warn('[audio] ' + err.message + ' — trying the next option'); }
    }
    console.warn('[audio] No way to play audio:', lastError && lastError.message);
    notifyUnavailable();
    if (options.onError) options.onError(lastError);
  }

  function saveSelectedVoice(voiceURI) {
    config.selectedVoiceURI = voiceURI;
    localStorage.setItem('hsk1_tts_voice', voiceURI);
  }

  // ─────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────
  window.HSK_AUDIO = {
    speak,
    stop:     stopCurrentAudio,
    isPlaying: () => isSpeaking || !!synth?.speaking || !!currentAudio,
    saveSelectedVoice,
    getVoices: getSortedChineseVoices,
    config
  };

  if (window.HSK_DEBUG) console.log('[audio] Service ready');
})();
