/**
 * Audio Service for Chinese Text-to-Speech
 * Uses Web Speech API (browser built-in) with Google TTS as fallback
 *
 * FIX: onvoiceschanged fired 1000+ times in Chrome causing 140,000+ dropdown options.
 *   — Added `voicesPopulated` flag so dropdown is populated exactly once
 *   — Added `select.innerHTML = ''` to clear before populating
 *   — `onvoiceschanged` unregisters itself after first successful population
 */

(function () {
  'use strict';

  // Audio cache to avoid repeated requests
  const audioCache = new Map();

  // Current playing audio element
  let currentAudio = null;

  // Web Speech API synthesis
  const synth = window.speechSynthesis;
  let chineseVoice = null;

  // Speech queue to prevent interruptions
  let isSpeaking = false;
  let speechQueue = [];

  // FIX: Guard flag — ensures populateVoiceDropdown runs exactly once.
  // onvoiceschanged can fire hundreds of times in Chrome. Without this flag
  // every firing appends ~140 options, causing 140,000+ entries.
  let voicesPopulated = false;

  const CHINESE_SIMPLIFIED_LANGS = ['cmn', 'zh', 'zh-CN', 'zh-SG'];

  // Load available voices and populate dropdown once
  function loadVoices() {
    const voices = synth.getVoices();

    // Not ready yet — voices array is empty on first call in some browsers
    if (!voices.length) return;

    // Pick the best available Chinese voice
    chineseVoice = voices.find(v =>
      CHINESE_SIMPLIFIED_LANGS.some(lang =>
        v.lang === lang || v.lang.startsWith(lang + '-')
      )
    );

    if (chineseVoice) {
      console.log('✓ Chinese voice loaded:', chineseVoice.name, chineseVoice.lang);
    }

    // FIX: Only populate dropdown once, then unregister handler
    if (!voicesPopulated) {
      voicesPopulated = true;
      populateVoiceDropdown(voices);
      speechSynthesis.onvoiceschanged = null; // Stop listening — no more re-fires
    }
  }

  // Filter to Chinese voices only and populate the <select id="tts-voice"> element
  function populateVoiceDropdown(voices) {
    const select = document.getElementById('tts-voice');
    if (!select) return;

    // FIX: Clear existing options before adding — prevents stacking on repeated calls
    const defaultOption = select.querySelector('option[value=""]');
    select.innerHTML = '';
    if (defaultOption) select.appendChild(defaultOption);

    // Filter to Chinese voices only
    const zhVoices = voices.filter(v =>
      CHINESE_SIMPLIFIED_LANGS.some(lang =>
        v.lang === lang || v.lang.startsWith(lang + '-')
      )
    );

    if (zhVoices.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No Chinese voices found (using fallback TTS)';
      opt.disabled = true;
      select.appendChild(opt);
      console.warn('⚠ No Chinese voices found. Fallback TTS will be used.');
      return;
    }

    zhVoices.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} (${v.lang})`;
      select.appendChild(opt);
    });

    // Restore saved voice preference
    const saved = (typeof pendingSettings !== 'undefined') ? pendingSettings.ttsVoiceURI : '';
    const savedExists = saved && select.querySelector(`option[value="${CSS.escape(saved)}"]`);
    if (savedExists) {
      select.value = saved;
    } else if (chineseVoice) {
      select.value = chineseVoice.voiceURI; // Default to first Chinese voice found
    }

    console.log(`✓ Voice dropdown populated: ${zhVoices.length} Chinese voice(s)`);
  }

  // Initialise — attempt immediately, then listen for async load
  if (synth) {
    loadVoices(); // Voices may already be available (e.g. page reload)
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices; // Fires once, then self-unregisters
    }
  }

  /**
   * Configuration
   */
  const config = {
    playbackRate: 0.7,
    webSpeech: {
      enabled: true,
      lang: 'zh-CN',
      pitch: 1.0
    },
    fallbackTTS: {
      enabled: true,
      url: (text) =>
        `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=zh-CN&client=gtx`
    }
  };

  /**
   * Stop any currently playing audio
   */
  function stopCurrentAudio() {
    speechQueue = [];
    isSpeaking = false;
    if (synth && synth.speaking) synth.cancel();
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
  }

  /**
   * Process the speech queue
   */
  function processQueue() {
    if (isSpeaking || speechQueue.length === 0) return;
    const nextItem = speechQueue.shift();
    speakImmediately(nextItem.text, nextItem.resolve, nextItem.reject);
  }

  /**
   * Speak immediately using Web Speech API
   */
  function speakImmediately(text, resolve, reject) {
    if (!synth) {
      reject(new Error('Web Speech API not available'));
      isSpeaking = false;
      processQueue();
      return;
    }

    isSpeaking = true;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang  = config.webSpeech.lang;
    utterance.rate  = config.playbackRate;
    utterance.pitch = config.webSpeech.pitch;

    if (chineseVoice) utterance.voice = chineseVoice;

    utterance.onend = () => {
      isSpeaking = false;
      resolve();
      processQueue();
    };

    utterance.onerror = (event) => {
      // 'interrupted' fires when synth.cancel() is called — not a real error
      if (event.error !== 'interrupted') {
        console.error('Web Speech error:', event.error);
        reject(new Error(`Web Speech error: ${event.error}`));
      } else {
        resolve();
      }
      isSpeaking = false;
      processQueue();
    };

    synth.speak(utterance);
  }

  /**
   * Speak using Web Speech API with queue
   */
  async function speakWithWebSpeech(text) {
    return new Promise((resolve, reject) => {
      if (isSpeaking || synth.speaking) {
        synth.cancel();
        speechQueue = [];
        isSpeaking = false;
      }
      speechQueue.push({ text, resolve, reject });
      processQueue();
    });
  }

  /**
   * Fallback TTS (when no Chinese voice available)
   */
  async function speakWithFallbackTTS(text) {
    return new Promise((resolve, reject) => {
      if (!config.fallbackTTS.enabled) {
        reject(new Error('Fallback TTS is disabled'));
        return;
      }
      const url   = config.fallbackTTS.url(text);
      const audio = new Audio(url);
      audio.playbackRate = config.playbackRate;
      currentAudio = audio;
      audio.onended = () => { currentAudio = null; resolve(); };
      audio.onerror = (e) => { currentAudio = null; reject(new Error(`Fallback TTS failed: ${e.type}`)); };
      audio.play().catch(err => reject(new Error(`Audio play failed: ${err.message}`)));
    });
  }

  /**
   * Main speak function
   */
  async function speak(text, options = {}) {
    if (!text) { console.warn('No text to speak'); return; }
    try {
      if (config.webSpeech.enabled && chineseVoice) {
        await speakWithWebSpeech(text);
        console.log(`✓ Web Speech API (${config.playbackRate}x)`);
      } else {
        console.warn('No Chinese voice — using fallback TTS');
        await speakWithFallbackTTS(text);
        console.log(`✓ Fallback TTS (${config.playbackRate}x)`);
      }
    } catch (error) {
      console.error('Audio playback error:', error);
      if (options.onError) options.onError(error);
    }
  }

  async function preloadAudio(text) {
    console.log('Preload not needed for Web Speech API');
  }

  function clearCache() {
    audioCache.clear();
    console.log('Audio cache cleared');
  }

  function isPlaying() {
    return isSpeaking || (synth && synth.speaking) || currentAudio !== null;
  }

  function getCacheStats() {
    return { size: 0, items: [], provider: 'Web Speech API (no caching needed)' };
  }

  function getAvailableProviders() {
    const providers = [];
    if (synth && chineseVoice) {
      providers.push({
        name: 'Web Speech API',
        type: 'built-in',
        quality: 'good',
        speed: `${config.playbackRate}x`,
        voice: chineseVoice.name,
        status: 'active'
      });
    }
    if (!chineseVoice && config.fallbackTTS.enabled) {
      providers.push({
        name: 'Fallback Online TTS',
        type: 'online',
        quality: 'good',
        speed: `${config.playbackRate}x`,
        voice: 'Google TTS',
        status: 'active (no local Chinese voice found)'
      });
    }
    return providers;
  }

  // Public API
  window.HSK_AUDIO = {
    speak,
    stop: stopCurrentAudio,
    preload: preloadAudio,
    clearCache,
    isPlaying,
    getCacheStats,
    getAvailableProviders,
    config,
    getVoices: () => synth ? synth.getVoices() : [],
    setVoice: (voice) => { chineseVoice = voice; }
  };

  console.log('✓ Audio Service initialized');
  if (chineseVoice) {
    console.log(`  Provider: Web Speech API — ${chineseVoice.name}`);
  } else {
    console.log('  Provider: Fallback Online TTS (no local Chinese voice found)');
    console.log('  💡 Tip: Install a Chinese language pack for offline audio');
  }
  console.log(`  Speed: ${config.playbackRate}x`);

})();
