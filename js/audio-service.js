/**
 * Audio Service for Chinese Text-to-Speech
 * Uses Web Speech API (browser built-in) with Google TTS as fallback
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
  
  // Load available voices
  function loadVoices() {
    const voices = synth.getVoices();
    
    // Explicit list matching the exact variants present in your custom voice result list
    const CHINESE_SIMPLIFIED_LANGS = [
        'cmn',
        'zh',
        'zh-CN',
        'zh-SG',
        'hak', // Hakka Chinese variant fallback
        'yue'  // Cantonese variant fallback
    ];
    
    // Check voice objects against explicit string parameters present in your option elements
    chineseVoice = voices.find(v => {
        const lowerLang = v.lang.toLowerCase();
        const lowerName = v.name.toLowerCase();
        
        // Match standard language tags
        const matchLang = CHINESE_SIMPLIFIED_LANGS.some(lang =>
            lowerLang === lang || lowerLang.startsWith(lang + '-')
        );
        
        // Match custom eSpeak format strings present in your select list items
        const matchStringName = lowerName.includes('chinese') || lowerName.includes('mandarin') || lowerLang.includes('cmn');

        return matchLang || matchStringName;
    });
    
    if (chineseVoice) {
      console.log('✓ Chinese voice loaded:', chineseVoice.name, chineseVoice.lang);
      
      // Auto-sync select element if it exists in the DOM
      const selectEl = document.getElementById('tts-voice-select');
      if (selectEl) {
         selectEl.value = chineseVoice.name;
      }
    }
  }
  
  // Load voices on page load and when they change
  if (synth) {
    loadVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  /**
   * Configuration
   */
  const config = {
    playbackRate: 0.7, // Playback speed: 0.7 = slower for learning
    webSpeech: {
      enabled: true,
      lang: 'zh-CN',
      pitch: 1.0
    },
    fallbackTTS: {
      enabled: true,
      url: (text) => `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=zh-CN&client=gtx`
    }
  };

  /**
   * Stop any currently playing audio
   */
  function stopCurrentAudio() {
    speechQueue = [];
    isSpeaking = false;
    
    if (synth && synth.speaking) {
      synth.cancel();
    }
    
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
    if (isSpeaking || speechQueue.length === 0) {
      return;
    }
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
    utterance.lang = chineseVoice ? chineseVoice.lang : config.webSpeech.lang;
    utterance.rate = config.playbackRate;
    utterance.pitch = config.webSpeech.pitch;
    
    if (chineseVoice) {
      utterance.voice = chineseVoice;
    }
    
    utterance.onend = () => {
      isSpeaking = false;
      resolve();
      processQueue();
    };
    
    utterance.onerror = (event) => {
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
   * Speak using fallback online TTS
   */
  async function speakWithFallbackTTS(text) {
    return new Promise((resolve, reject) => {
      if (!config.fallbackTTS.enabled) {
        reject(new Error('Fallback TTS is disabled'));
        return;
      }
      
      const url = config.fallbackTTS.url(text);
      const audio = new Audio(url);
      audio.playbackRate = config.playbackRate;
      currentAudio = audio;
      
      audio.onended = () => {
        currentAudio = null;
        resolve();
      };
      
      audio.onerror = (e) => {
        currentAudio = null;
        reject(new Error(`Fallback TTS failed: ${e.type}`));
      };
      
      audio.play().catch(err => {
        reject(new Error(`Audio play failed: ${err.message}`));
      });
    });
  }

  /**
   * Main speak function
   */
  async function speak(text, options = {}) {
    if (!text) {
      console.warn('No text to speak');
      return;
    }
    
    try {
      const hasChineseVoice = !!chineseVoice;
      
      if (config.webSpeech.enabled && hasChineseVoice) {
        await speakWithWebSpeech(text);
        console.log(`✓ Audio played via Web Speech API (${config.playbackRate}x speed)`);
      } else {
        console.warn('No Chinese voice available, using fallback TTS');
        await speakWithFallbackTTS(text);
        console.log(`✓ Audio played via Fallback TTS (${config.playbackRate}x speed)`);
      }
    } catch (error) {
      console.error('Audio playback error:', error);
      if (options.onError) {
        options.onError(error);
      } else {
        console.warn('Audio unavailable:', error.message);
      }
    }
  }

  function preloadAudio(text) {
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
    return { size: 0, items: [], provider: 'Web Speech API' };
  }

  function getAvailableProviders() {
    const providers = [];
    const hasChineseVoice = !!chineseVoice;
    
    if (synth && hasChineseVoice) {
      providers.push({ 
        name: 'Web Speech API', 
        type: 'built-in', 
        quality: 'good', 
        speed: `${config.playbackRate}x`,
        voice: chineseVoice.name,
        status: 'active'
      });
    }
    
    if (!hasChineseVoice && config.fallbackTTS.enabled) {
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

  // Public API Window Binding
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

  // Setup Event Listener interface connection for your specific DOM element structure
  document.addEventListener('DOMContentLoaded', () => {
    const selectEl = document.getElementById('tts-voice-select');
    if (selectEl) {
      selectEl.addEventListener('change', (e) => {
        const selectedValue = e.target.value;
        const voices = window.HSK_AUDIO.getVoices();
        const foundVoice = voices.find(v => v.name === selectedValue);
        if (foundVoice) {
          window.HSK_AUDIO.setVoice(foundVoice);
          console.log(`Voice updated manually to: ${foundVoice.name}`);
        }
      });
    }
  });

  console.log('✓ Audio Service initialized');
})();
