/**
 * Audio Service for Chinese Text-to-Speech
 * Uses Web Speech API with Google TTS as fallback
 */
(function () {
  'use strict';

  const synth = window.speechSynthesis;
  let chineseVoice = null;
  let isSpeaking   = false;
  let speechQueue  = [];
  let currentAudio = null;

  // ─────────────────────────────────────────────────────────────
  // VOICE LOADING
  // Only valid Chinese language codes — nothing else
  // ─────────────────────────────────────────────────────────────
  const ZH_LANGS = ['zh-CN', 'zh-TW', 'zh-HK', 'zh-SG', 'zh', 'cmn'];

  function isChineseVoice(voice) {
    return ZH_LANGS.some(lang =>
      voice.lang === lang || voice.lang.startsWith(lang + '-')
    );
  }

  function loadAndPopulate() {
    const voices = synth.getVoices();
    if (!voices.length) return; // Still loading — event will re-fire

    const zhVoices = voices.filter(isChineseVoice);
    console.log(`[audio] All voices: ${voices.length} | Chinese only: ${zhVoices.length}`);

    // Pick preferred voice — prefer zh-CN, fall back to any Chinese
    chineseVoice =
      zhVoices.find(v => v.lang === 'zh-CN') ||
      zhVoices.find(v => v.lang.startsWith('zh')) ||
      zhVoices[0] ||
      null;

    populateDropdown(zhVoices);
  }

  function populateDropdown(zhVoices) {
    const select = document.getElementById('tts-voice');
    if (!select) return;

    // Clear completely — remove all children including any leftovers
    while (select.firstChild) select.removeChild(select.firstChild);

    // Default option
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = 'System Default';
    select.appendChild(defaultOpt);

    if (!zhVoices.length) {
      const noOpt = document.createElement('option');
      noOpt.value    = '';
      noOpt.disabled = true;
      noOpt.textContent = 'No Chinese voices — using online fallback';
      select.appendChild(noOpt);
      console.warn('[audio] No Chinese voices found. Will use fallback TTS.');
      return;
    }

    zhVoices.forEach(v => {
      const opt = document.createElement('option');
      opt.value       = v.voiceURI;
      opt.textContent = `${v.name} (${v.lang})`;
      select.appendChild(opt);
    });

    // Restore saved preference
    const savedURI = localStorage.getItem('hsk1_tts_voice') || '';
    const savedExists = savedURI &&
      Array.from(select.options).some(o => o.value === savedURI);

    select.value = savedExists
      ? savedURI
      : (chineseVoice ? chineseVoice.voiceURI : '');

    console.log(`[audio] Dropdown populated: ${zhVoices.length} voice(s). Selected: "${select.options[select.selectedIndex]?.textContent}"`);
  }

  // ── Trigger loading ──────────────────────────────────────────
  // { once: true } guarantees the handler fires exactly once and
  // auto-removes — no flag needed, no null-assignment race condition
  if (synth) {
    const voices = synth.getVoices();
    if (voices.length) {
      // Voices already available (e.g. cached from previous page)
      loadAndPopulate();
    } else {
      // Chrome/Edge: voices load async — wait for the event, once only
      speechSynthesis.addEventListener('voiceschanged', loadAndPopulate, { once: true });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SAVE VOICE SELECTION
  // Call this from your settings dropdown onChange handler
  // ─────────────────────────────────────────────────────────────
  function saveSelectedVoice(voiceURI) {
    localStorage.setItem('hsk1_tts_voice', voiceURI);

    if (!voiceURI) {
      chineseVoice = null;
      return;
    }
    const found = synth.getVoices().find(v => v.voiceURI === voiceURI);
    if (found) chineseVoice = found;
  }

  // ─────────────────────────────────────────────────────────────
  // CONFIG
  // ─────────────────────────────────────────────────────────────
  const config = {
    playbackRate: 0.7,
    pitch:        1.0,
    lang:         'zh-CN',
    fallbackTTS: {
      enabled: true,
      url: text =>
        `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=zh-CN&client=gtx`
    }
  };

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
    u.volume  = parseFloat(localStorage.getItem('hsk1_tts_volume') || '1');
    if (chineseVoice) u.voice = chineseVoice;

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
        resolve(); // interrupted = user stopped, not an error
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

  // ─────────────────────────────────────────────────────────────
  // FALLBACK TTS
  // ─────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────
  // MAIN speak()
  // ─────────────────────────────────────────────────────────────
  async function speak(text, options = {}) {
    if (!text?.trim()) { console.warn('[audio] No text to speak'); return; }
    try {
      if (chineseVoice) {
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
