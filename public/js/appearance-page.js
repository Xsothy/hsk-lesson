/* Appearance page (theme feature). Data and token maths come from apply-settings.js (window.HSK_THEME);
   choices persist through HSK_STORE settings, which apply-settings.js applies live everywhere (and S2 syncs). */
(function () {
  var T = window.HSK_THEME, S = window.HSK_STORE;
  if (!T || !S) return;
  var $ = function (k) { return document.querySelector('[data-ap="' + k + '"]'); };
  var KEYS = ['theme', 'themeBase', 'themeAccent', 'themeRadius', 'fontHead', 'fontBody', 'fontZh'];
  var showCode = false;

  function el(tag, attrs, kids) {
    var e = document.createElement(tag), k;
    for (k in attrs || {}) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'style') e.setAttribute('style', attrs[k]);
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function btn(cls, on, label, onclick, kids, extra) {
    var a = { type: 'button', class: cls, 'aria-pressed': on ? 'true' : 'false', onclick: onclick };
    for (var k in extra || {}) a[k] = extra[k];
    return el('button', a, kids || [el('span', { text: label })]);
  }
  // Picking anything but a preset makes the theme custom.
  function set(patch) { patch.themePreset = ''; S.setSettings(patch); }

  function render() {
    var s = S.getSettings(), c = T.choice(s), dark = T.isDark(s);
    var presets = $('presets'); presets.textContent = '';
    Object.keys(T.PRESETS).forEach(function (k) {
      var p = T.PRESETS[k], b = T.BASES[p.themeBase][p.theme === 'dark' ? 'd' : 'l'];
      var accent = p.theme === 'dark' ? T.tokens({ base: p.themeBase, accent: p.themeAccent, radius: 16, head: 'outfit', body: 'outfit', zh: 'serif' }, true)['--red'] || '#e8736c' : T.ACCENTS[p.themeAccent][1];
      var swatch = el('span', { class: 'ap-sw', style: 'background:' + b[0] + ';border-color:' + b[2] }, [
        el('span', { class: 'ap-sw-zh', lang: 'zh-Hans', text: '学', style: 'color:' + b[4] + ';font-family:' + T.FONTS.zh.opts[p.fontZh][1] }),
        el('span', { class: 'ap-sw-gap' }),
        el('span', { class: 'ap-dot', style: 'background:' + accent }),
        el('span', { class: 'ap-dot', style: 'background:' + b[3] + ';border:1px solid ' + b[2] })
      ]);
      presets.appendChild(btn('ap-opt ap-preset', s.themePreset === k, '', function () {
        var patch = { themePreset: k }; KEYS.forEach(function (key) { patch[key] = p[key]; }); S.setSettings(patch);
      }, [swatch, el('span', { class: 'ap-pname' }, [el('b', { text: p.name }), el('span', { text: p.sub })])]));
    });

    var modes = $('modes'); modes.textContent = '';
    [['light', 'Light'], ['dark', 'Dark'], ['system', 'System']].forEach(function (m) {
      modes.appendChild(btn('ap-mode-btn', s.theme === m[0], m[1], function () { set({ theme: m[0] }); }));
    });

    var bases = $('bases'); bases.textContent = '';
    Object.keys(T.BASES).forEach(function (k) {
      var b = T.BASES[k].l;
      bases.appendChild(btn('ap-opt ap-base', c.base === k, '', function () { set({ themeBase: k }); }, [
        el('span', { class: 'ap-pair', 'aria-hidden': 'true' }, [el('span', { style: 'background:' + b[0] + ';border:1px solid ' + b[2] }), el('span', { style: 'background:' + b[4] })]),
        el('span', { text: T.BASES[k].label })
      ]));
    });

    var accents = $('accents'); accents.textContent = '';
    Object.keys(T.ACCENTS).forEach(function (k) {
      var a = T.ACCENTS[k];
      accents.appendChild(btn('ap-accent', c.accent === k, '', function () { set({ themeAccent: k }); },
        [el('span', { style: 'background:' + a[1] })], { 'aria-label': a[0], title: a[0], style: '--ring:' + a[1] }));
    });

    var radii = $('radii'); radii.textContent = '';
    T.RADII.forEach(function (r) {
      radii.appendChild(btn('ap-opt ap-radius', c.radius === r[1], r[0], function () { set({ themeRadius: r[1] }); }));
    });

    var fonts = $('fonts'); fonts.textContent = '';
    [['head', 'fontHead'], ['body', 'fontBody'], ['zh', 'fontZh']].forEach(function (g) {
      var G = T.FONTS[g[0]], id = 'ap-font-' + g[0], row = el('div', { class: 'ap-fonts', role: 'group', 'aria-labelledby': id });
      Object.keys(G.opts).forEach(function (k) {
        row.appendChild(btn('ap-opt ap-font', c[g[0]] === k, '', function () { var p = {}; p[g[1]] = k; set(p); }, [
          el('span', { class: 'ap-font-sample', text: G.sample, style: 'font-family:' + G.opts[k][1], lang: g[0] === 'zh' ? 'zh-Hans' : 'en' }),
          el('span', { class: 'ap-font-name', text: G.opts[k][0] })
        ]));
      });
      fonts.appendChild(el('div', { class: 'ap-group' }, [el('h2', { class: 'ap-lbl', id: id, text: G.title }), row]));
    });

    $('mode-name').textContent = dark ? 'Dark' : 'Light';
    var code = $('code'), pre = document.getElementById('ap-css');
    code.textContent = showCode ? 'Hide theme CSS' : 'Show theme CSS';
    code.setAttribute('aria-expanded', showCode ? 'true' : 'false');
    pre.hidden = !showCode;
    if (showCode) {
      var fmt = function (o) { var k = Object.keys(o); return k.length ? k.map(function (x) { return '  ' + x + ': ' + o[x] + ';'; }).join('\n') : '  /* stock tokens.css */'; };
      pre.textContent = ':root {\n' + fmt(T.tokens(c, false)) + '\n}\n:root[data-theme=dark] {\n' + fmt(T.tokens(c, true)) + '\n}';
    }
  }

  $('reset').addEventListener('click', function () {
    var p = T.PRESETS.paper, patch = { themePreset: 'paper' }; KEYS.forEach(function (k) { patch[k] = p[k]; }); S.setSettings(patch);
  });
  $('code').addEventListener('click', function () { showCode = !showCode; render(); });
  window.addEventListener('hsk:settings', render);
  window.addEventListener('storage', render);
  render();
})();
