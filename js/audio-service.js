/**
 * Audio Service for Chinese Text-to-Speech
 * Provides multiple fallback methods for reliable audio playback
 */
(function () {
  'use strict';

  // Audio cache to avoid repeated requests
  const audioCache = new Map();
  
  // Current playing audio element
  let currentAudio = null;

  /**
   * Configuration - Google TTS only
   */
  const config = {
    // Google Translate TTS
    apis: [
      {
        name: 'Google Translate TTS',
        url: (text) => {
          const truncated = text.substring(0, 200);
          return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(truncated)}&tl=zh-CN&client=tw-ob`;
        },
        type: 'audio/mpeg',
        enabled: true,
        requiresKey: false
      }
    ],
    // Playback speed: 0.5 = slow (50% speed for learning)
    playbackRate: 0.5
  };

  /**
   * Stop any currently playing audio
   */
  function stopCurrentAudio() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
  }

  /**
   * Play audio using HTML5 Audio element with slow playback
   */
  async function playAudioUrl(url, text) {
    return new Promise((resolve, reject) => {
      stopCurrentAudio();
      
      // Check cache first
      if (audioCache.has(text)) {
        const cachedUrl = audioCache.get(text);
        console.log(`  Using cached audio for: "${text}"`);
        
        const audio = new Audio(cachedUrl);
        audio.playbackRate = config.playbackRate; // Slow down playback
        currentAudio = audio;
        
        audio.onended = () => {
          currentAudio = null;
          resolve();
        };
        
        audio.onerror = (e) => {
          currentAudio = null;
          console.warn('Cached audio playback failed, will retry without cache');
          audioCache.delete(text);
          reject(new Error('Cached audio playback failed'));
        };
        
        audio.play().catch(reject);
        return;
      }
      
      // Create new audio element
      const audio = new Audio(url);
      audio.playbackRate = config.playbackRate; // Slow down playback (0.5 = 50% speed)
      currentAudio = audio;
      
      audio.onended = () => {
        currentAudio = null;
        resolve();
      };
      
      audio.onerror = (e) => {
        currentAudio = null;
        reject(new Error(`Audio playback failed: ${e.type}`));
      };
      
      audio.oncanplaythrough = () => {
        // Cache the audio URL for future use
        audioCache.set(text, url);
        console.log(`  Cached audio for: "${text}" (cache size: ${audioCache.size})`);
      };
      
      // Play audio
      audio.play().catch(err => {
        reject(new Error(`Audio play failed: ${err.message}`));
      });
    });
  }

  /**
   * Try Google TTS API
   */
  async function tryGoogleTTS(text) {
    const api = config.apis[0]; // Google TTS
    
    try {
      const url = api.url(text);
      await playAudioUrl(url, text);
      console.log(`✓ Audio played via ${api.name} (slow speed for learning)`);
      return true;
    } catch (error) {
      console.error(`Google TTS failed:`, error.message);
      return false;
    }
  }

  /**
   * Main speak function - Google TTS only (no fallback)
   */
  async function speak(text, options = {}) {
    if (!text) {
      console.warn('No text to speak');
      return;
    }
    
    try {
      const success = await tryGoogleTTS(text);
      
      if (!success) {
        throw new Error('Google TTS failed - please check internet connection');
      }
    } catch (error) {
      console.error('Audio playback error:', error);
      if (options.onError) {
        options.onError(error);
      } else {
        console.warn('Audio unavailable. Please check your internet connection.');
      }
    }
  }

  /**
   * Preload audio for faster playback
   */
  async function preloadAudio(text) {
    if (audioCache.has(text)) {
      return; // Already cached
    }
    
    try {
      // Preload using first available API
      const api = config.apis[0];
      const url = api.url(text);
      
      // Create audio element but don't play
      const audio = new Audio(url);
      audio.preload = 'auto';
      
      audio.onloadedmetadata = () => {
        audioCache.set(text, url);
        console.log(`✓ Preloaded audio for: ${text}`);
      };
    } catch (error) {
      console.warn('Audio preload failed:', error);
    }
  }

  /**
   * Clear audio cache
   */
  function clearCache() {
    audioCache.clear();
    console.log('Audio cache cleared');
  }

  /**
   * Check if audio is currently playing
   */
  function isPlaying() {
    return currentAudio !== null;
  }

  /**
   * Get cache statistics
   */
  function getCacheStats() {
    return {
      size: audioCache.size,
      items: Array.from(audioCache.keys())
    };
  }

  /**
   * Get available TTS providers
   */
  function getAvailableProviders() {
    return [
      { 
        name: 'Google Translate TTS', 
        type: 'free', 
        quality: 'good', 
        speed: `${config.playbackRate}x (slow for learning)` 
      }
    ];
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
    config
  };

  console.log('✓ Audio Service initialized');
  console.log(`  Provider: Google Translate TTS only`);
  console.log(`  Speed: ${config.playbackRate}x (slow for pronunciation learning)`);
  console.log(`  Caching: Enabled`);

})();