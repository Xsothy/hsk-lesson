/**
 * Audio Service for Chinese Text-to-Speech
 * Uses Web Speech API with Google TTS as fallback
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

  function isChineseVoice(voice) {
    const lang = voice.lang.toLowerCase();
    const name = voice.name.toLowerCase();
    return ZH_LANGS.some(l => lang.includes(l.toLowerCase())) || 
           name.includes('chinese') || 
           name.includes('mandarin') || 
           name.includes('cantonese');
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

    // 2. Try preferred Chinese voices (zh-CN)
    const zhCN = voices.find(v => v.lang === 'zh-CN' || v.lang === 'zh_CN');
    if (zhCN) return zhCN;

    // 3. Any Chinese voice
    return voices.find(isChineseVoice) || null;
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
      console.log(`[audio] Speaking with: ${voice.name}`);
    } else {
      console.warn('[audio] No Chinese voice found for utterance');
    }

    u.onend = () => {
      isSpeaking = false;
      resolve();
      processQueue();
    };

    u.onerror = e => {
      isSpeaking = false;
      if (e.error !== 'interrupted') {
        console.error('[audio] Speech error:', e.error);
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

  async function speakWithFallbackTTS(text) {
    return new Promise((resolve, reject) => {
      if (!config.fallbackTTS.enabled) {
        reject(new Error('Fallback TTS disabled'));
        return;
      }
      const audio        = new Audio(config.fallbackTTS.url(text));
      audio.playbackRate = config.playbackRate;
      currentAudio       = audio;
      audio.onended      = () => { currentAudio = null; resolve(); };
      audio.onerror      = e  => { currentAudio = null; reject(new Error(`Fallback failed: ${e.type}`)); };
      audio.play().catch(e => reject(new Error(`Play failed: ${e.message}`)));
    });
  }

  async function speak(text, options = {}) {
    if (!text?.trim()) { console.warn('[audio] No text to speak'); return; }
    
    // Make sure voices are loaded
    if (synth && synth.getVoices().length === 0) {
      await new Promise(resolve => {
        const handler = () => {
          synth.removeEventListener('voiceschanged', handler);
          resolve();
        };
        synth.addEventListener('voiceschanged', handler);
        // Timeout just in case
        setTimeout(resolve, 1000);
      });
    }

    try {
      const voice = getChineseVoice();
      if (voice) {
        await speakWithWebSpeech(text);
      } else {
        console.warn('[audio] No Chinese voice — using fallback TTS');
        await speakWithFallbackTTS(text);
      }
    } catch (err) {
      console.error('[audio] Playback error:', err);
      if (options.onError) options.onError(err);
    }
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
    getVoices: () => synth?.getVoices().filter(isChineseVoice) ?? [],
    config
  };

  console.log('[audio] Service ready');
})();
