/* Applies display/audio/appearance settings to every page. Self-contained (loaded in <head>, before store.js). Reads hsk.v1.settings.
   Appearance (theme feature, design canvas "Appearance · themes"): base, accent, radius and fonts override the tokens in
   tokens.css via inline custom properties on <html>. The Paper defaults (warm · red · 16 · outfit · serif) set nothing,
   so the stock look is exactly tokens.css. window.HSK_THEME exposes the data for the Appearance page. */
(function () {
  var KEY = 'hsk.v1.settings', root = document.documentElement;
  var ok = { pinyin: ['show', 'hide'], pinyinPos: ['above', 'below'], charSize: ['sm', 'md', 'lg'], theme: ['light', 'dark', 'system'] };
  function pick(s, k, d) { return ok[k].indexOf(s[k]) >= 0 ? s[k] : d; }
  function read() {
    try { var s = JSON.parse(localStorage.getItem(KEY)); return s && typeof s === 'object' && !Array.isArray(s) ? s : {}; } catch (e) { return {}; }
  }

  /* ---- Theme data (matches the design canvas) ---- */
  // [bg, card, line, soft, ink, muted] per mode. 'warm' = tokens.css itself (no override).
  var BASES = {
    warm:  { label: 'Warm',  l: ['#fbf9f5', '#ffffff', '#ece7df', '#f3efe8', '#0f0c08', '#5c5348'], d: ['#14110d', '#1d1914', '#37312a', '#2a251e', '#f4efe7', '#aca295'] },
    stone: { label: 'Stone', l: ['#fafaf9', '#ffffff', '#e7e5e4', '#f5f5f4', '#292524', '#78716c'], d: ['#1c1917', '#24201e', '#3a3532', '#2a2624', '#e7e5e4', '#a8a29e'] },
    slate: { label: 'Slate', l: ['#f8fafc', '#ffffff', '#e2e8f0', '#f1f5f9', '#1e293b', '#64748b'], d: ['#121821', '#1a2230', '#2c3646', '#202a38', '#e2e8f0', '#94a3b8'] },
    zinc:  { label: 'Zinc',  l: ['#fafafa', '#ffffff', '#e4e4e7', '#f4f4f5', '#27272a', '#71717a'], d: ['#18181b', '#202024', '#34343a', '#27272b', '#e4e4e7', '#a1a1aa'] }
  };
  var ACCENTS = { red: ['Cinnabar', '#b5302a'], orange: ['Persimmon', '#c2410c'], amber: ['Amber', '#b7791f'], jade: ['Jade', '#2f6b47'],
    teal: ['Teal', '#0f766e'], blue: ['Ink blue', '#3b5b7a'], indigo: ['Indigo', '#4f46e5'], plum: ['Plum', '#7a3b69'] };
  var DARK_ACCENT = { red: '#e8736c' };
  var RADII = [['None', 0], ['S', 8], ['M', 16], ['L', 22], ['XL', 28]];
  var FONTS = {
    head: { title: 'Heading font', sample: 'Aa', opts: { outfit: ['Outfit', "'Outfit',system-ui,sans-serif"], inter: ['Inter', "'Inter',system-ui,sans-serif"], nunito: ['Nunito', "'Nunito',system-ui,sans-serif"], lora: ['Lora', "'Lora',Georgia,serif"] } },
    body: { title: 'Body font', sample: 'Aa', opts: { outfit: ['Outfit', "'Outfit',system-ui,sans-serif"], inter: ['Inter', "'Inter',system-ui,sans-serif"], nunito: ['Nunito', "'Nunito',system-ui,sans-serif"], lora: ['Lora', "'Lora',Georgia,serif"] } },
    zh: { title: 'Chinese font', sample: '学', opts: { serif: ['Song (serif)', "'Noto Serif SC',serif"], sans: ['Hei (sans)', "'Noto Sans SC',sans-serif"], brush: ['Brush', "'Ma Shan Zheng',cursive"] } }
  };
  var GFONT = { inter: 'Inter:wght@400;500;600;700', nunito: 'Nunito:wght@400;600;700', lora: 'Lora:wght@500;600;700', sans: 'Noto+Sans+SC:wght@500;700', brush: 'Ma+Shan+Zheng' };
  var PRESETS = {
    paper:    { name: 'Paper',    sub: 'Warm · cinnabar',  themeBase: 'warm',  themeAccent: 'red',    themeRadius: 16, theme: 'system', fontHead: 'outfit', fontBody: 'outfit', fontZh: 'serif' },
    inkwash:  { name: 'Ink wash', sub: 'Slate · ink blue', themeBase: 'slate', themeAccent: 'blue',   themeRadius: 8,  theme: 'system', fontHead: 'inter',  fontBody: 'inter',  fontZh: 'serif' },
    jade:     { name: 'Jade',     sub: 'Stone · jade',     themeBase: 'stone', themeAccent: 'jade',   themeRadius: 22, theme: 'system', fontHead: 'nunito', fontBody: 'nunito', fontZh: 'sans' },
    plum:     { name: 'Plum',     sub: 'Zinc · plum',      themeBase: 'zinc',  themeAccent: 'plum',   themeRadius: 16, theme: 'system', fontHead: 'lora',   fontBody: 'inter',  fontZh: 'serif' },
    sunrise:  { name: 'Sunrise',  sub: 'Warm · persimmon', themeBase: 'warm',  themeAccent: 'orange', themeRadius: 28, theme: 'light',  fontHead: 'nunito', fontBody: 'nunito', fontZh: 'sans' },
    midnight: { name: 'Midnight', sub: 'Slate · amber',    themeBase: 'slate', themeAccent: 'amber',  themeRadius: 16, theme: 'dark',   fontHead: 'outfit', fontBody: 'inter',  fontZh: 'brush' }
  };
  function mix(hex, other, t) {
    var a = [1, 3, 5].map(function (i) { return parseInt(hex.slice(i, i + 2), 16); }), b = [1, 3, 5].map(function (i) { return parseInt(other.slice(i, i + 2), 16); });
    return '#' + a.map(function (v, i) { return Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0'); }).join('');
  }
  function lum(hex) { return [1, 3, 5].map(function (i) { var v = parseInt(hex.slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce(function (s, v, i) { return s + v * [0.2126, 0.7152, 0.0722][i]; }, 0); }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  // Accent must read as text on every surface (paper, card, its soft tint) and carry on-accent text: >= 4.5:1.
  // Start from the design's shade (dark: +25% white) and move toward white/black only as far as needed.
  function readable(hex, surfaces, toward, from) {
    for (var t = from; t <= 1; t += .05) { var c = mix(hex, toward, t); if (surfaces.every(function (s) { return contrast(c, s) >= 4.5; })) return c; }
    return toward;
  }
  function darkAccent(k, surfaces) { return DARK_ACCENT[k] || readable(ACCENTS[k][1], surfaces || ['#1d1914'], '#ffffff', .25); }
  function val(s, k, d, list) { return list.indexOf(s[k]) >= 0 ? s[k] : d; }
  function choice(s) {
    return { base: val(s, 'themeBase', 'warm', Object.keys(BASES)), accent: val(s, 'themeAccent', 'red', Object.keys(ACCENTS)),
      radius: val(s, 'themeRadius', 16, [0, 8, 16, 22, 28]), head: val(s, 'fontHead', 'outfit', Object.keys(FONTS.head.opts)),
      body: val(s, 'fontBody', 'outfit', Object.keys(FONTS.body.opts)), zh: val(s, 'fontZh', 'serif', Object.keys(FONTS.zh.opts)) };
  }
  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function isDark(s) { var t = pick(s, 'theme', 'system'); return t === 'dark' || (t === 'system' && !!(mq && mq.matches)); }
  // Token overrides for a choice + mode. Empty object for the Paper defaults.
  function tokens(c, dark) {
    var o = {}, b = BASES[c.base][dark ? 'd' : 'l'], bg = b[0];
    if (c.base !== 'warm') {
      o['--paper'] = bg; o['--card'] = b[1]; o['--card-2'] = mix(b[1], bg, .5); o['--line'] = b[2]; o['--soft'] = b[3];
      o['--ink'] = b[4]; o['--muted'] = b[5]; o['--text-2'] = mix(b[4], b[5], .45); o['--on-ink'] = dark ? bg : '#ffffff';
    }
    if (c.accent !== 'red') {
      var card = b[1], hex = ACCENTS[c.accent][1];
      // soft tint is derived from the design shade, then the accent is nudged until it reads on paper, card and tint
      var tint = mix(dark ? mix(hex, '#ffffff', .25) : hex, bg, dark ? .8 : .9);
      var acc = dark ? darkAccent(c.accent, [bg, card, tint]) : readable(hex, ['#ffffff', bg, card, tint], '#000000', 0);
      o['--red'] = acc; o['--red-d'] = dark ? readable(acc, [bg, card, tint], '#ffffff', .3) : readable(acc, [bg, card, tint], '#000000', .2);
      o['--red-t'] = tint; o['--on-red'] = dark ? bg : '#ffffff';
    }
    if (c.radius !== 16) { var f = c.radius / 16; o['--r-s'] = Math.round(12 * f) + 'px'; o['--r-m'] = Math.round(16 * f) + 'px'; o['--r-l'] = Math.round(22 * f) + 'px'; o['--r-xl'] = Math.round(24 * f) + 'px'; }
    if (c.body !== 'outfit') o['--font-ui'] = FONTS.body.opts[c.body][1];
    if (c.head !== 'outfit') o['--font-head'] = FONTS.head.opts[c.head][1];
    if (c.zh !== 'serif') o['--font-zh'] = FONTS.zh.opts[c.zh][1];
    return o;
  }
  var applied = [];
  function loadFonts(c) {
    var fam = [c.head, c.body, c.zh].filter(function (k, i, a) { return GFONT[k] && a.indexOf(k) === i; }).map(function (k) { return 'family=' + GFONT[k]; });
    if (!fam.length) return;
    var href = 'https://fonts.googleapis.com/css2?' + fam.join('&') + '&display=swap';
    var el = document.getElementById('hsk-theme-fonts');
    if (!el) { el = document.createElement('link'); el.id = 'hsk-theme-fonts'; el.rel = 'stylesheet'; (document.head || root).appendChild(el); }
    if (el.getAttribute('href') !== href) el.setAttribute('href', href);
  }
  function theme(s) {
    var c = choice(s), o = tokens(c, isDark(s));
    applied.forEach(function (k) { if (!(k in o)) root.style.removeProperty(k); });
    applied = Object.keys(o);
    applied.forEach(function (k) { root.style.setProperty(k, o[k]); });
    root.setAttribute('data-theme-preset', typeof s.themePreset === 'string' && PRESETS[s.themePreset] ? s.themePreset : (Object.keys(o).length ? 'custom' : 'paper'));
    loadFonts(c);
  }

  function apply(s) {
    s = s || read();
    root.setAttribute('data-theme', pick(s, 'theme', 'system'));
    root.setAttribute('data-tone-colors', s.toneColors === false ? 'off' : 'on');
    root.setAttribute('data-pinyin', pick(s, 'pinyin', 'show'));
    root.setAttribute('data-pinyin-pos', pick(s, 'pinyinPos', 'above'));
    root.setAttribute('data-char-size', pick(s, 'charSize', 'md'));
    root.setAttribute('data-hsk', s.hskVersion === '3.0' ? '3' : '2');
    try { theme(s); } catch (e) {}
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
  window.HSK_THEME = { BASES: BASES, ACCENTS: ACCENTS, RADII: RADII, FONTS: FONTS, PRESETS: PRESETS, choice: choice, tokens: tokens, isDark: isDark };
  apply();
  window.HSK_APPLY_SETTINGS = apply;
  window.addEventListener('hsk:settings', function (e) { apply(e && e.detail); });
  window.addEventListener('storage', function (e) { if (!e.key || e.key === KEY) apply(); });
  try { if (mq) (mq.addEventListener ? mq.addEventListener('change', function () { apply(); }) : mq.addListener(function () { apply(); })); } catch (e) {}
  document.addEventListener('DOMContentLoaded', function () { audio(read()); });
  window.addEventListener('load', function () { audio(read()); });
  try { if (window.speechSynthesis) window.speechSynthesis.addEventListener('voiceschanged', function () { audio(read()); }); } catch (e) {}
})();
