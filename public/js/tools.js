// Tools: one tabbed page. Tabs are links to /tools/{pinyin,hsk-check,name,zodiac}; JS swaps panels and keeps the URL in step.
(function () {
  var page = document.querySelector('[data-tools]');
  if (!page) return;
  var csrf = (document.querySelector('meta[name=csrf-token]') || {}).content || '';
  var S = window.HSK_STORE;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function getJSON(url) { return fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.message || 'Request failed'); return j; }); }); }
  function post(url, payload) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.message || 'Request failed'); return j; }); });
  }
  function setting(k, d) { try { var s = S && S.getSettings ? S.getSettings() : null; return s && s[k] != null ? s[k] : d; } catch (e) { return d; } }

  // ---- Tabs ----
  var tabs = Array.prototype.slice.call(page.querySelectorAll('[data-tab-link]'));
  var TITLES = { pinyin: 'Pinyin converter', hsk: 'HSK level checker', name: 'Chinese name', zodiac: 'Zodiac' };
  function show(k, focus, push) {
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-tab-link') === k;
      t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      if (on) { if (focus) t.focus(); if (push && location.pathname !== new URL(t.href).pathname) history.pushState({ tab: k }, '', t.href); }
    });
    page.setAttribute('data-tab', k);
    document.title = TITLES[k] + ' · Tools' + document.title.replace(/^.*?· Tools/, '');
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault(); show(t.getAttribute('data-tab-link'), false, true);
    });
    t.addEventListener('keydown', function (e) {
      var d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key], n;
      if (e.key === 'Home') n = 0; else if (e.key === 'End') n = tabs.length - 1; else if (d) n = (i + d + tabs.length) % tabs.length; else return;
      e.preventDefault(); show(tabs[n].getAttribute('data-tab-link'), true, true);
    });
  });
  window.addEventListener('popstate', function () {
    var hit = tabs.filter(function (t) { return new URL(t.href).pathname === location.pathname; })[0] || tabs[0];
    show(hit.getAttribute('data-tab-link'), false, false);
  });

  // ---- Pinyin converter ----
  (function () {
    var root = page.querySelector('[data-tool=pinyin]'); if (!root) return;
    var base = root.getAttribute('data-url'), input = root.querySelector('#pin-in'), mode = root.querySelector('#pin-mode');
    var out = root.querySelector('[data-out]'), ruby = root.querySelector('[data-ruby]'), empty = root.querySelector('[data-empty]');
    var stats = root.querySelector('[data-stats]'), status = root.querySelector('[data-status]'), ws = root.querySelector('[data-worksheet]');
    var wsBase = ws.getAttribute('href'), seq = 0, timer, copyText = '';
    var HAN = /[㐀-鿿豈-﫿]/;
    function say(m) { status.textContent = m || ''; }
    function syllables(py, n) {
      py = String(py || '').trim(); if (!py) return null;
      var parts = py.split(/\s+/);
      if (parts.length === n) return parts;
      var m = py.replace(/\s+/g, '').match(/(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?[aeiouüvāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+(ng(?![aeiouüvāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ])|n(?![aeiouüvāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ])|r(?![aeiouüvāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]))?/gi);
      return m && m.length === n ? m : null;
    }
    function toneCls(s) { return 'tone-' + (window.HSK_PINYIN ? HSK_PINYIN.tone(s) : 5); }
    function renderRuby(tokens) {
      ruby.textContent = ''; var lines = [], ver = setting('hskVersion', '2.0'), lv = [], chars = 0, known = 0, words = {};
      tokens.forEach(function (t) {
        var cs = Array.from(t.t);
        if (!t.han) { cs.forEach(function (c) { if (/\S/.test(c)) { var s = el('span', 'tl-rb'); s.appendChild(el('span', null, '')); s.appendChild(el('span', null, c)); ruby.appendChild(s); } }); lines.push(t.t); return; }
        chars += cs.length;
        var l = ver === '3.0' ? t.l3 : t.l2; if (l) lv.push(l);
        if (!words[t.t]) { words[t.t] = 1; try { if (S && S.isKnown && S.isKnown(t.t)) known++; } catch (e) {} }
        var syl = syllables(t.py, cs.length);
        if (syl) cs.forEach(function (c, i) { var s = el('span', 'tl-rb'); s.appendChild(el('span', toneCls(syl[i]), syl[i])); s.appendChild(el('span', null, c)); ruby.appendChild(s); });
        else { var s = el('span', 'tl-rb'); s.appendChild(el('span', toneCls(t.py || ''), t.py || '')); s.appendChild(el('span', null, t.t)); ruby.appendChild(s); }
        lines.push(t.py || t.t);
      });
      copyText = tokens.map(function (t) { return t.han && t.py ? t.t + '(' + t.py + ')' : t.t; }).join('');
      var nw = Object.keys(words).length;
      stats.querySelector('[data-st=chars]').textContent = chars;
      stats.querySelector('[data-st=avg]').textContent = lv.length ? (lv.reduce(function (a, b) { return a + b; }, 0) / lv.length).toFixed(1) : '–';
      stats.querySelector('[data-st=l1]').textContent = (lv.length ? Math.round(lv.filter(function (x) { return x === 1; }).length / lv.length * 100) : 0) + '%';
      stats.querySelector('[data-st=new]').textContent = nw - known;
      stats.hidden = chars === 0;
    }
    function run() {
      var text = input.value, m = mode.value, n = ++seq;
      say('');
      if (!text.trim()) { out.textContent = ''; ruby.hidden = true; stats.hidden = true; empty.hidden = false; copyText = ''; return; }
      var useRuby = m === 'ruby' && HAN.test(text);
      post(base, { text: text, mode: useRuby ? 'ruby' : (m === 'ruby' ? 'marks' : m) }).then(function (j) {
        if (n !== seq) return;
        empty.hidden = true;
        if (useRuby) { out.textContent = ''; ruby.hidden = false; renderRuby(j.tokens); }
        else { ruby.hidden = true; stats.hidden = true; out.textContent = j.result; copyText = j.result; }
        var han = Array.from(new Set(Array.from(text).filter(function (c) { return HAN.test(c); }))).slice(0, 60).join('');
        ws.href = han ? wsBase + '?chars=' + encodeURIComponent(han) : wsBase;
      }).catch(function (e) { say(e.message); });
    }
    root.querySelector('[data-run]').addEventListener('click', run);
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 300); });
    mode.addEventListener('change', run);
    root.querySelector('[data-copy]').addEventListener('click', function () {
      var t = copyText; if (!t) { say('Nothing to copy yet.'); return; }
      var done = function () { say('Copied'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { say('Copy failed'); });
      else { var ta = el('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { say('Copy failed'); } ta.remove(); }
    });
  })();

  // ---- HSK level checker ----
  (function () {
    var root = page.querySelector('[data-tool=hsk]'); if (!root) return;
    var base = root.getAttribute('data-url'), input = root.querySelector('#hsk-in'), status = root.querySelector('[data-status]');
    var version = setting('hskVersion', '2.0'), timer, seq = 0;
    var vbtns = root.querySelectorAll('[data-version]');
    function mark() { vbtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-version') === version)); }); }
    function group(l) { return !l ? 0 : (l <= 2 ? 1 : (l <= 4 ? 2 : 3)); }
    function run() {
      var text = input.value, n = ++seq;
      var words = root.querySelector('[data-words]'), dist = root.querySelector('[data-dist]');
      if (!text.trim()) { words.textContent = ''; dist.textContent = ''; status.textContent = ''; return; }
      status.textContent = 'Checking…';
      post(base, { text: text, version: version }).then(function (j) {
        if (n !== seq) return;
        status.textContent = '';
        words.textContent = '';
        j.tokens.forEach(function (t) {
          if (!t.han) { if (/\S/.test(t.t)) { var p = el('span', 'tl-w p'); p.appendChild(el('span', null, t.t.trim())); p.appendChild(el('span', null, '')); words.appendChild(p); } return; }
          var g = group(t.level), lbl = t.level ? (t.level === 7 && version === '3.0' ? 'HSK 7–9' : 'HSK ' + t.level) : 'beyond';
          var a = el('a', 'tl-w hsk-w g' + g); a.href = '/char/' + encodeURIComponent(Array.from(t.t)[0]);
          a.title = (t.pinyin || '') + (t.meaning ? ' · ' + t.meaning : '');
          a.appendChild(el('span', null, t.t)); a.lang = 'zh-Hans';
          var s = el('span', null, lbl); s.lang = 'en'; a.appendChild(s);
          words.appendChild(a);
        });
        var buckets = [0, 0, 0, 0], total = 0;
        j.levels.forEach(function (l) { buckets[l.level === 'unknown' ? 0 : group(Number(l.level))] += l.count; total += l.count; });
        var hi = version === '3.0' ? 'HSK 5–9' : 'HSK 5–6';
        dist.textContent = '';
        [[1, 'HSK 1–2'], [2, 'HSK 3–4'], [3, hi], [0, 'Beyond']].forEach(function (r) {
          var pct = total ? Math.round(buckets[r[0]] / total * 100) + '%' : '0%';
          var row = el('div', 'tl-bar'); row.appendChild(el('span', null, r[1]));
          var tr = el('div', 'tl-track'); tr.setAttribute('aria-hidden', 'true'); var i = el('i', 'b' + r[0]); i.style.width = pct; tr.appendChild(i); row.appendChild(tr);
          row.appendChild(el('span', null, pct)); dist.appendChild(row);
        });
      }).catch(function (e) { if (n === seq) status.textContent = e.message; });
    }
    vbtns.forEach(function (b) { b.addEventListener('click', function () { version = b.getAttribute('data-version'); mark(); run(); }); });
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 400); });
    mark();
  })();

  // ---- Chinese name ----
  (function () {
    var root = page.querySelector('[data-tool=name]'); if (!root) return;
    var base = root.getAttribute('data-url'), style = 'balanced';
    var st = root.querySelector('[data-ideas-status]');
    root.querySelectorAll('[data-style]').forEach(function (b) {
      b.addEventListener('click', function () {
        style = b.getAttribute('data-style');
        root.querySelectorAll('[data-style]').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      });
    });
    var themes = root.querySelectorAll('[data-theme]');
    function picked() { return Array.prototype.filter.call(themes, function (b) { return b.getAttribute('aria-pressed') === 'true'; }); }
    themes.forEach(function (b) {
      b.addEventListener('click', function () {
        var on = b.getAttribute('aria-pressed') === 'true';
        if (!on && picked().length >= 3) { st.textContent = 'Pick up to 3 meanings.'; return; }
        st.textContent = ''; b.setAttribute('aria-pressed', String(!on));
      });
    });
    root.querySelector('[data-ideas]').addEventListener('click', function () {
      var p = picked().map(function (b) { return b.getAttribute('data-theme'); });
      if (!p.length) { st.textContent = 'Pick at least one meaning.'; return; }
      st.textContent = '';
      var q = p.map(function (t) { return 'themes[]=' + encodeURIComponent(t); }).join('&') + '&style=' + style;
      getJSON(base + '/ideas?' + q).then(function (j) {
        var box = root.querySelector('[data-names]'); box.textContent = '';
        if (!j.names.length) { st.textContent = 'No names found. Try other meanings.'; return; }
        j.names.forEach(function (n) {
          var a = el('a', 'tl-nm'); a.href = '/char/' + encodeURIComponent(Array.from(n.given)[0]);
          var zh = el('span', null, n.name); zh.lang = 'zh-Hans'; a.appendChild(zh);
          var tx = el('span'); tx.appendChild(el('b', null, n.pinyin)); tx.appendChild(el('span', null, n.meaning)); a.appendChild(tx);
          box.appendChild(a);
        });
      }).catch(function (e) { st.textContent = e.message; });
    });

    // Sound-alike from an English name
    var chosen = [], syl = [];
    function render() {
      root.querySelector('[data-name]').textContent = chosen.map(function (c, i) { return syl[i].options[c].char; }).join('');
      root.querySelector('[data-pinyin]').textContent = chosen.map(function (c, i) { return syl[i].options[c].pinyin; }).join(' ');
      var box = root.querySelector('[data-syl]'); box.textContent = '';
      syl.forEach(function (s, i) {
        var b = el('button', null, s.options[chosen[i]].char); b.type = 'button'; b.lang = 'zh-Hans';
        b.setAttribute('aria-label', s.en + ': ' + s.options[chosen[i]].char + ', ' + s.options[chosen[i]].pinyin + '. Next option');
        b.addEventListener('click', function () { chosen[i] = (chosen[i] + 1) % s.options.length; render(); box.children[i].focus(); });
        box.appendChild(b);
      });
    }
    function suggest() {
      var v = root.querySelector('#nm-in').value.trim(); if (!v) return;
      getJSON(base + '/suggest?name=' + encodeURIComponent(v)).then(function (j) {
        syl = j.syllables || []; chosen = syl.map(function () { return 0; });
        root.querySelector('[data-result]').hidden = !syl.length; if (syl.length) render();
      });
    }
    root.querySelector('[data-run]').addEventListener('click', suggest);
    root.querySelector('#nm-in').addEventListener('keydown', function (e) { if (e.key === 'Enter') suggest(); });
  })();

  // ---- Zodiac ----
  (function () {
    var root = page.querySelector('[data-tool=zodiac]'); if (!root) return;
    var base = root.getAttribute('data-url'), input = root.querySelector('#zd-in'), last = '';
    function run() {
      var d = input.value;
      if (!d || d === last || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
      last = d;
      post(base, { date: d }).then(function (j) {
        var an = j.animal, elx = j.element;
        root.querySelector('[data-big]').textContent = an[0];
        root.querySelector('[data-title]').textContent = an[2] + ' · ' + an[1];
        root.querySelector('[data-text]').textContent = elx[2] + ' ' + an[2].toLowerCase() + ' year (' + j.zodiacYear + ')';
        var a = root.querySelector('[data-learn]'); a.hidden = false; a.href = '/char/' + encodeURIComponent(an[0]); a.textContent = 'Learn to write ' + an[0] + ' →';
        root.querySelector('[data-note]').textContent = 'Chinese New Year ' + d.slice(0, 4) + ' was on ' + j.lny + '. ' +
          (j.beforeNewYear ? 'Your birthday is before it, so you belong to the previous zodiac year.' : 'Your birthday is on or after it.');
      }).catch(function () { last = ''; root.querySelector('[data-note]').textContent = 'Enter a date between 1900 and 2100.'; });
    }
    input.addEventListener('change', run);
    input.addEventListener('input', run);
  })();
})();
