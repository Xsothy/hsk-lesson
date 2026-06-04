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
  
  // Load available voices
  function loadVoices() {
    const voices = synth.getVoices();
    // Try to find a Chinese voice
    chineseVoice = voices.find(v => v.lang.startsWith('zh')) || 
                   voices.find(v => v.lang.includes('CN')) ||
                   voices[0]; // Fallback to first available
    
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
    }
  };

  /**
   * Stop any currently playing audio
   */
  function stopCurrentAudio() {
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
   * Speak using Web Speech API (browser built-in)
   */
  async function speakWithWebSpeech(text) {
    return new Promise((resolve, reject) => {
      if (!synth) {
        reject(new Error('Web Speech API not available'));
        return;
      }
      
      stopCurrentAudio();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = config.webSpeech.lang;
      utterance.rate = config.playbackRate;
      utterance.pitch = config.webSpeech.pitch;
      
      if (chineseVoice) {
        utterance.voice = chineseVoice;
      }
      
      utterance.onend = () => {
        resolve();
      };
      
      utterance.onerror = (event) => {
        reject(new Error(`Web Speech error: ${event.error}`));
      };
      
      synth.speak(utterance);
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
      if (config.webSpeech.enabled) {
        await speakWithWebSpeech(text);
        console.log(`✓ Audio played via Web Speech API (${config.playbackRate}x speed)`);
      } else {
        throw new Error('Web Speech API is disabled');
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
    return (synth && synth.speaking) || currentAudio !== null;
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
    
    if (synth) {
      providers.push({ 
        name: 'Web Speech API', 
        type: 'built-in', 
        quality: 'good', 
        speed: `${config.playbackRate}x (slower for learning)`,
        voice: chineseVoice ? chineseVoice.name : 'default'
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
  console.log(`  Provider: Web Speech API (browser built-in)`);
  console.log(`  Speed: ${config.playbackRate}x (slower for pronunciation learning)`);
  console.log(`  Voice: ${chineseVoice ? chineseVoice.name : 'loading...'}`);

})();