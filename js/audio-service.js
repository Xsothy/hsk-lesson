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
    // Try to find a Chinese voice
    const CHINESE_SIMPLIFIED_LANGS = [
        'cmn',
        'zh',
        'zh-CN',
        'zh-SG'
    ];
    
    chineseVoice = voices.find(v =>
        CHINESE_SIMPLIFIED_LANGS.some(lang =>
            v.lang === lang || v.lang.startsWith(lang + '-')
        )
    );
    
    if (chineseVoice) {
      console.log('✓ Chinese voice loaded:', chineseVoice.name, chineseVoice.lang);
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
    // Playback speed: 0.7 = slower (70% speed for learning)
    playbackRate: 0.7,
    // Web Speech API settings
    webSpeech: {
      enabled: true,
      lang: 'zh-CN',
      pitch: 1.0
    },
    // Fallback TTS URL when no Chinese voice available
    fallbackTTS: {
      enabled: true,
      // Using a more reliable alternative endpoint
      url: (text) => `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=zh-CN&client=gtx`
    }
  };

  /**
   * Stop any currently playing audio
   */
  function stopCurrentAudio() {
    // Clear speech queue
    speechQueue = [];
    isSpeaking = false;
    
    // Stop Web Speech API
    if (synth && synth.speaking) {
      synth.cancel();
    }
    
    // Stop HTML5 audio
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
    utterance.lang = config.webSpeech.lang;
    utterance.rate = config.playbackRate;
    utterance.pitch = config.webSpeech.pitch;
    
    if (chineseVoice) {
      utterance.voice = chineseVoice;
    }
    
    utterance.onend = () => {
      isSpeaking = false;
      resolve();
      processQueue(); // Process next item in queue
    };
    
    utterance.onerror = (event) => {
      // Ignore 'interrupted' errors as they're expected when we cancel
      if (event.error !== 'interrupted') {
        console.error('Web Speech error:', event.error);
        reject(new Error(`Web Speech error: ${event.error}`));
      } else {
        resolve(); // Treat interrupted as success (user cancelled)
      }
      isSpeaking = false;
      processQueue(); // Process next item in queue
    };
    
    synth.speak(utterance);
  }

  /**
   * Speak using Web Speech API (browser built-in) with queue
   */
  async function speakWithWebSpeech(text) {
    return new Promise((resolve, reject) => {
      // If already speaking, cancel current and clear queue for immediate playback
      if (isSpeaking || synth.speaking) {
        synth.cancel();
        speechQueue = [];
        isSpeaking = false;
      }
      
      // Add to queue
      speechQueue.push({ text, resolve, reject });
      processQueue();
    });
  }

  /**
   * Speak using fallback online TTS (when no Chinese voice available)
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
   * Main speak function - uses Web Speech API (browser built-in)
   */
  async function speak(text, options = {}) {
    if (!text) {
      console.warn('No text to speak');
      return;
    }
    
    try {
      // Check if Chinese voice is available
      const hasChineseVoice = chineseVoice && (
        chineseVoice.lang.startsWith('zh') || 
        chineseVoice.lang.includes('CN')
      );
      
      if (config.webSpeech.enabled && hasChineseVoice) {
        // Use Web Speech API if Chinese voice is available
        await speakWithWebSpeech(text);
        console.log(`✓ Audio played via Web Speech API (${config.playbackRate}x speed)`);
      } else {
        // Fall back to online TTS if no Chinese voice
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

  /**
   * Preload audio - not applicable for Web Speech API
   */
  async function preloadAudio(text) {
    // Web Speech API doesn't need preloading
    console.log('Preload not needed for Web Speech API');
  }

  /**
   * Clear audio cache - not applicable for Web Speech API
   */
  function clearCache() {
    audioCache.clear();
    console.log('Audio cache cleared');
  }

  /**
   * Check if audio is currently playing
   */
  function isPlaying() {
    return isSpeaking || (synth && synth.speaking) || currentAudio !== null;
  }

  /**
   * Get cache statistics
   */
  function getCacheStats() {
    return {
      size: 0,
      items: [],
      provider: 'Web Speech API (no caching needed)'
    };
  }

  /**
   * Get available TTS providers
   */
  function getAvailableProviders() {
    const providers = [];
    
    const hasChineseVoice = chineseVoice && (
      chineseVoice.lang.startsWith('zh') || 
      chineseVoice.lang.includes('CN')
    );
    
    if (synth && hasChineseVoice) {
      providers.push({ 
        name: 'Web Speech API', 
        type: 'built-in', 
        quality: 'good', 
        speed: `${config.playbackRate}x (slower for learning)`,
        voice: chineseVoice.name,
        status: 'active'
      });
    }
    
    if (!hasChineseVoice && config.fallbackTTS.enabled) {
      providers.push({ 
        name: 'Fallback Online TTS', 
        type: 'online', 
        quality: 'good', 
        speed: `${config.playbackRate}x (slower for learning)`,
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
    // New methods
    getVoices: () => synth ? synth.getVoices() : [],
    setVoice: (voice) => { chineseVoice = voice; }
  };

  console.log('✓ Audio Service initialized');
  
  const hasChineseVoice = chineseVoice && (
    chineseVoice.lang.startsWith('zh') || 
    chineseVoice.lang.includes('CN')
  );
  
  if (hasChineseVoice) {
    console.log(`  Provider: Web Speech API (browser built-in)`);
    console.log(`  Voice: ${chineseVoice.name}`);
  } else {
    console.log(`  Provider: Fallback Online TTS (no local Chinese voice found)`);
    console.log(`  Voice: Google TTS (requires internet)`);
    console.log(`  💡 Tip: Install Chinese language pack for offline audio`);
  }
  
  console.log(`  Speed: ${config.playbackRate}x (slower for pronunciation learning)`);

})();
