/* Applies display/audio settings to every page. Self-contained (loaded in <head>, before store.js). Reads hsk.v1.settings. */
(function () {
  var KEY = 'hsk.v1.settings', root = document.documentElement;
  var ok = { pinyin: ['show', 'hide'], pinyinPos: ['above', 'below'], charSize: ['sm', 'md', 'lg'], theme: ['light', 'dark', 'system'] };
  function pick(s, k, d) { return ok[k].indexOf(s[k]) >= 0 ? s[k] : d; }
  function read() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); return s && typeof s === 'object' && !Array.isArray(s) ? s : {}; } catch (e) { return {}; }
  }
  function apply(s) {
    s = s || read();
    root.setAttribute('data-theme', pick(s, 'theme', 'system'));
    root.setAttribute('data-tone-colors', s.toneColors === false ? 'off' : 'on');
    root.setAttribute('data-pinyin', pick(s, 'pinyin', 'show'));
    root.setAttribute('data-pinyin-pos', pick(s, 'pinyinPos', 'above'));
    root.setAttribute('data-char-size', pick(s, 'charSize', 'md'));
    audio(s);
  }
  function audio(s) {
    var A = window.HSK_AUDIO;
    if (!A) return;
    try {
      if (typeof s.audioRate === 'number' && s.audioRate >= 0.5 && s.audioRate <= 1.5) A.config.playbackRate = s.audioRate;
      if (typeof s.voice === 'string' && s.voice) {
        // audio-service on main exposes saveSelectedVoice(voiceURI); older builds had setVoice(voice).
        if (A.saveSelectedVoice) A.saveSelectedVoice(s.voice);
        else if (A.setVoice && A.getVoices) {
          var v = A.getVoices().filter(function (x) { return x.voiceURI === s.voice; })[0];
          if (v) A.setVoice(v);
        }
      }
    } catch (e) {}
  }
  apply();
  window.HSK_APPLY_SETTINGS = apply;
  window.addEventListener('hsk:settings', function (e) { apply(e && e.detail); });
  window.addEventListener('storage', function (e) { if (!e.key || e.key === KEY) apply(); });
  document.addEventListener('DOMContentLoaded', function () { audio(read()); });
  window.addEventListener('load', function () { audio(read()); });
  try { if (window.speechSynthesis) window.speechSynthesis.addEventListener('voiceschanged', function () { audio(read()); }); } catch (e) {}
})();
