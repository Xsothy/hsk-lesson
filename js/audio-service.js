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
   * Configuration
   */
  const config = {
    // Prefer online services for iOS Safari where Web Speech API is unreliable
    preferOnline: /iPhone|iPad|iPod/.test(navigator.userAgent),
    
    // API endpoints that work WITHOUT API keys (in order of preference)
    apis: [
      // Google Translate TTS (Free, no key needed, works reliably)
      {
        name: 'Google Translate TTS',
        url: (text) => {
          // Limit text length to avoid issues
          const truncated = text.substring(0, 200);
          return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(truncated)}&tl=zh-CN&client=tw-ob`;
        },
        type: 'audio/mpeg',
        enabled: true,
        requiresKey: false
      }
    ],
    
    // APIs that REQUIRE keys (disabled by default)
    // Users can enable these by providing API keys
    premiumApis: {
      // ElevenLabs - Best quality but requires paid account
      elevenlabs: {
        name: 'ElevenLabs',
        apiKey: null,
        voiceId: null,
        enabled: false,
        requiresKey: true
      },
      
      // Azure AI Speech - Free tier available (500K chars/month)
      azure: {
        name: 'Azure AI Speech',
        apiKey: null,
        region: 'eastus',
        enabled: false,
        requiresKey: true
      },
      
      // VoiceRSS - Free tier: 350 requests/day
      voicerss: {
        name: 'VoiceRSS',
        apiKey: null,
        enabled: false,
        requiresKey: true
      }
    },
    
    // Web Speech API settings (native browser, always available)
    speechSynthesis: {
      lang: 'zh-CN',
      rate: 0.85,
      pitch: 1.0,
      volume: 1.0
    }
  };

  /**
   * Stop any currently playing audio
   */
  function stopCurrentAudio() {
    // Stop HTML5 audio
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      currentAudio = null;
    }
    
    // Stop speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Play audio using HTML5 Audio element
   */
  async function playAudioUrl(url, text) {
    return new Promise((resolve, reject) => {
      stopCurrentAudio();
      
      // Check cache first
      if (audioCache.has(text)) {
        const cachedUrl = audioCache.get(text);
        console.log(`  Using cached audio for: "${text}"`);
        
        const audio = new Audio(cachedUrl);
        currentAudio = audio;
        
        audio.onended = () => {
          currentAudio = null;
          resolve();
        };
        
        audio.onerror = (e) => {
          currentAudio = null;
          console.warn('Cached audio playback failed, will retry without cache');
          // Remove from cache and reject to try fresh
          audioCache.delete(text);
          reject(new Error('Cached audio playback failed'));
        };
        
        audio.play().catch(reject);
        return;
      }
      
      // Create new audio element
      const audio = new Audio(url);
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
   * Use Web Speech API (fallback for offline or when online fails)
   */
  async function speakWithSynthesis(text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        reject(new Error('Speech Synthesis not supported'));
        return;
      }
      
      stopCurrentAudio();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options.lang || config.speechSynthesis.lang;
      utterance.rate = options.rate || config.speechSynthesis.rate;
      utterance.pitch = options.pitch || config.speechSynthesis.pitch;
      utterance.volume = options.volume || config.speechSynthesis.volume;
      
      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(new Error(`Speech synthesis error: ${e.error}`));
      
      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Try online TTS APIs (only those that don't require keys)
   */
  async function tryOnlineApis(text) {
    // Try premium APIs first if configured
    if (config.premiumApis.elevenlabs.enabled && config.premiumApis.elevenlabs.apiKey) {
      try {
        await playElevenLabsAudio(text);
        console.log('✓ Audio played via ElevenLabs (Premium)');
        return true;
      } catch (error) {
        console.warn('ElevenLabs failed:', error.message);
      }
    }
    
    if (config.premiumApis.azure.enabled && config.premiumApis.azure.apiKey) {
      try {
        await playAzureAudio(text);
        console.log('✓ Audio played via Azure AI Speech (Premium)');
        return true;
      } catch (error) {
        console.warn('Azure AI Speech failed:', error.message);
      }
    }
    
    if (config.premiumApis.voicerss.enabled && config.premiumApis.voicerss.apiKey) {
      try {
        await playVoiceRSSAudio(text);
        console.log('✓ Audio played via VoiceRSS');
        return true;
      } catch (error) {
        console.warn('VoiceRSS failed:', error.message);
      }
    }
    
    // Try free APIs that don't require keys
    for (const api of config.apis) {
      if (!api.enabled) continue;
      if (api.requiresKey) continue; // Skip APIs that need keys
      
      try {
        const url = api.url(text);
        if (!url) continue;
        
        await playAudioUrl(url, text);
        console.log(`✓ Audio played via ${api.name}`);
        return true;
      } catch (error) {
        console.warn(`${api.name} failed:`, error.message);
        // Continue to next API
      }
    }
    
    return false;
  }

  /**
   * Play audio using ElevenLabs API
   */
  async function playElevenLabsAudio(text) {
    // Check cache first
    if (audioCache.has(text)) {
      const cachedUrl = audioCache.get(text);
      console.log(`  Using cached audio for: "${text}"`);
      await playAudioUrl(cachedUrl, text);
      return;
    }
    
    const { apiKey, voiceId } = config.premiumApis.elevenlabs;
    
    if (!apiKey || !voiceId) {
      throw new Error('ElevenLabs API key or voice ID not configured');
    }
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    // Cache the blob URL
    audioCache.set(text, url);
    console.log(`  Cached ElevenLabs audio for: "${text}"`);
    
    await playAudioUrl(url, text);
  }

  /**
   * Play audio using Azure AI Speech API
   */
  async function playAzureAudio(text) {
    // Check cache first
    if (audioCache.has(text)) {
      const cachedUrl = audioCache.get(text);
      console.log(`  Using cached audio for: "${text}"`);
      await playAudioUrl(cachedUrl, text);
      return;
    }
    
    const { apiKey, region } = config.premiumApis.azure;
    
    if (!apiKey || !region) {
      throw new Error('Azure API key or region not configured');
    }
    
    // Get access token
    const tokenResponse = await fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    if (!tokenResponse.ok) {
      throw new Error(`Azure token error: ${tokenResponse.status}`);
    }
    
    const token = await tokenResponse.text();
    
    // Generate speech
    const ssml = `
      <speak version='1.0' xml:lang='zh-CN'>
        <voice xml:lang='zh-CN' xml:gender='Female' name='zh-CN-XiaoxiaoNeural'>
          ${text}
        </voice>
      </speak>
    `;
    
    const speechResponse = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
      },
      body: ssml
    });
    
    if (!speechResponse.ok) {
      throw new Error(`Azure speech error: ${speechResponse.status}`);
    }
    
    const blob = await speechResponse.blob();
    const url = URL.createObjectURL(blob);
    
    // Cache the blob URL
    audioCache.set(text, url);
    console.log(`  Cached Azure audio for: "${text}"`);
    
    await playAudioUrl(url, text);
  }

  /**
   * Play audio using VoiceRSS API
   */
  async function playVoiceRSSAudio(text) {
    // Check cache first
    if (audioCache.has(text)) {
      const cachedUrl = audioCache.get(text);
      console.log(`  Using cached audio for: "${text}"`);
      await playAudioUrl(cachedUrl, text);
      return;
    }
    
    const { apiKey } = config.premiumApis.voicerss;
    
    if (!apiKey) {
      throw new Error('VoiceRSS API key not configured');
    }
    
    const url = `https://api.voicerss.org/?key=${apiKey}&hl=zh-cn&c=MP3&f=16khz_16bit_stereo&src=${encodeURIComponent(text)}`;
    
    // Cache the URL
    audioCache.set(text, url);
    console.log(`  Cached VoiceRSS audio for: "${text}"`);
    
    await playAudioUrl(url, text);
  }

  /**
   * Main speak function with fallback chain
   */
  async function speak(text, options = {}) {
    if (!text) {
      console.warn('No text to speak');
      return;
    }
    
    const forceSynthesis = options.forceSynthesis === true;
    
    try {
      // Strategy 1: Force Web Speech API (if explicitly requested)
      if (forceSynthesis) {
        await speakWithSynthesis(text, options);
        console.log('✓ Audio played via Web Speech API (forced)');
        return;
      }
      
      // Strategy 2: Try online APIs FIRST (default for all platforms)
      // This provides consistent, cacheable, high-quality audio
      const success = await tryOnlineApis(text);
      if (success) return;
      
      // Strategy 3: Fallback to Web Speech API if online fails
      console.log('Online APIs failed, trying Web Speech API as fallback...');
      try {
        await speakWithSynthesis(text, options);
        console.log('✓ Audio played via Web Speech API (fallback)');
      } catch (synthError) {
        throw new Error(`All audio playback methods failed: ${synthError.message}`);
      }
    } catch (error) {
      console.error('Audio playback error:', error);
      // Show user-friendly error (optional)
      if (options.onError) {
        options.onError(error);
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
    return currentAudio !== null || (window.speechSynthesis && window.speechSynthesis.speaking);
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
   * Configure premium APIs
   */
  function configurePremiumAPI(provider, apiConfig) {
    if (provider === 'elevenlabs') {
      if (apiConfig.apiKey && apiConfig.voiceId) {
        config.premiumApis.elevenlabs = {
          ...config.premiumApis.elevenlabs,
          ...apiConfig,
          enabled: true
        };
        console.log('✓ ElevenLabs API configured');
      }
    } else if (provider === 'azure') {
      if (apiConfig.apiKey && apiConfig.region) {
        config.premiumApis.azure = {
          ...config.premiumApis.azure,
          ...apiConfig,
          enabled: true
        };
        console.log('✓ Azure AI Speech configured');
      }
    } else if (provider === 'voicerss') {
      if (apiConfig.apiKey) {
        config.premiumApis.voicerss = {
          ...config.premiumApis.voicerss,
          ...apiConfig,
          enabled: true
        };
        console.log('✓ VoiceRSS API configured');
      }
    }
  }

  /**
   * Get available TTS providers
   */
  function getAvailableProviders() {
    const providers = [];
    
    // Check premium providers
    if (config.premiumApis.elevenlabs.enabled) {
      providers.push({ name: 'ElevenLabs', type: 'premium', quality: 'excellent' });
    }
    if (config.premiumApis.azure.enabled) {
      providers.push({ name: 'Azure AI Speech', type: 'premium', quality: 'excellent' });
    }
    if (config.premiumApis.voicerss.enabled) {
      providers.push({ name: 'VoiceRSS', type: 'premium', quality: 'good' });
    }
    
    // Check free providers
    config.apis.filter(api => api.enabled).forEach(api => {
      providers.push({ name: api.name, type: 'free', quality: 'good' });
    });
    
    // Check Web Speech API
    if (window.speechSynthesis) {
      providers.push({ name: 'Web Speech API', type: 'native', quality: 'good' });
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
    configurePremiumAPI,
    getAvailableProviders,
    config
  };

  console.log('✓ Audio Service initialized');
  console.log(`  Strategy: Google Translate TTS (primary), Web Speech API (fallback)`);
  console.log(`  Platform: ${config.preferOnline ? 'iOS' : 'Desktop'}`);
  
  // Log available providers
  const providers = getAvailableProviders();
  console.log(`  Available providers: ${providers.map(p => p.name).join(', ')}`);

})();