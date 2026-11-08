// F3 · Tools: one script, each page initialises from [data-tool].
(function () {
  var root = document.querySelector('[data-tool]');
  if (!root) return;
  var kind = root.getAttribute('data-tool');
  var base = root.getAttribute('data-url');
  var csrf = (document.querySelector('meta[name=csrf-token]') || {}).content || '';
  function $(s) { return root.querySelector(s); }
  function post(payload) {
    return fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrf },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.message || 'Request failed'); return j; }); });
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function status(msg) { var s = $('[data-status]'); if (s) s.textContent = msg || ''; }

  var init = {
    pinyin: function () {
      var input = $('#pin-in'), out = $('[data-out]'), timer, seq = 0;
      function run() {
        var text = input.value, mode = root.querySelector('input[name=mode]:checked').value, n = ++seq;
        if (!text.trim()) { out.textContent = ''; return; }
        post({ text: text, mode: mode }).then(function (j) { if (n === seq) { out.textContent = j.result; status(''); } })
          .catch(function (e) { status(e.message); });
      }
      input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 250); });
      root.addEventListener('change', function (e) { if (e.target.name === 'mode') run(); });
      $('[data-copy]').addEventListener('click', function () {
        var t = out.textContent;
        if (!t) return;
        var done = function () { status('Copied'); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { status('Copy failed'); });
        else { var ta = el('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { status('Copy failed'); } ta.remove(); }
      });
    },

    hsk: function () {
      var version = '2.0';
      try { var s = window.HSK_STORE && HSK_STORE.getSettings ? HSK_STORE.getSettings() : null; if (s && s.hskVersion) version = s.hskVersion; } catch (e) {}
      $('[data-version-label]').textContent = 'HSK ' + version;
      $('[data-run]').addEventListener('click', function () {
        var text = $('#hsk-in').value;
        if (!text.trim()) { status('Paste some Chinese text first.'); return; }
        status('Checking…');
        post({ text: text, version: version }).then(function (j) {
          status('');
          var box = $('[data-text]'); box.textContent = '';
          j.tokens.forEach(function (t) {
            if (!t.han) { box.appendChild(document.createTextNode(t.t)); return; }
            var sp = el('span', 'hsk-w ' + (t.level ? 'l' + t.level : 'unk'), t.t);
            sp.title = (t.pinyin || '') + (t.meaning ? ' · ' + t.meaning : '') + (t.level ? ' · HSK ' + t.level : ' · not in list');
            box.appendChild(sp);
          });
          var st = $('[data-stats]'); st.textContent = '';
          j.levels.forEach(function (l) {
            var li = el('li'); li.appendChild(el('span', null, l.level === 'unknown' ? 'Not in list' : 'HSK ' + l.level));
            li.appendChild(el('span', null, l.count + ' words · ' + l.pct + '%')); st.appendChild(li);
          });
          var un = $('[data-unknown]'); un.textContent = '';
          j.unknown.forEach(function (w) {
            if (w.length === 1) { var a = el('a', null, w); a.href = '/char/' + encodeURIComponent(w); un.appendChild(a); }
            else w.split('').forEach(function (c) { var a = el('a', null, c); a.href = '/char/' + encodeURIComponent(c); un.appendChild(a); });
          });
          $('[data-unknown-empty]').hidden = j.unknown.length > 0;
          $('[data-result]').hidden = false;
        }).catch(function (e) { status(e.message); });
      });
    },

    name: function () {
      var picks = [], chosen = [], syl = [];
      function render() {
        $('[data-name]').textContent = chosen.map(function (c, i) { return syl[i].options[c].char; }).join('');
        $('[data-pinyin]').textContent = chosen.map(function (c, i) { return syl[i].options[c].pinyin; }).join(' ');
        var box = $('[data-syl]'); box.textContent = '';
        syl.forEach(function (s, i) {
          var b = el('button', 'zh', s.options[chosen[i]].char); b.type = 'button';
          b.setAttribute('aria-label', s.en + ': ' + s.options[chosen[i]].char + ', ' + s.options[chosen[i]].pinyin + '. Next option');
          b.addEventListener('click', function () { chosen[i] = (chosen[i] + 1) % s.options.length; render(); box.children[i].focus(); });
          box.appendChild(b);
        });
      }
      function suggest() {
        var v = $('#nm-in').value.trim(); if (!v) return;
        fetch(base + '/suggest?name=' + encodeURIComponent(v), { headers: { Accept: 'application/json' } }).then(function (r) { return r.json(); }).then(function (j) {
          syl = j.syllables || []; chosen = syl.map(function () { return 0; });
          $('[data-result]').hidden = !syl.length; if (syl.length) render();
        });
      }
      $('[data-run]').addEventListener('click', suggest);
      $('#nm-in').addEventListener('keydown', function (e) { if (e.key === 'Enter') suggest(); });
      function renderPicks() { $('[data-picks]').textContent = picks.length ? picks.join('') : '—'; }
      root.querySelectorAll('[data-theme]').forEach(function (b) {
        b.addEventListener('click', function () {
          root.querySelectorAll('[data-theme]').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
          fetch(base + '/meanings?theme=' + encodeURIComponent(b.getAttribute('data-theme')), { headers: { Accept: 'application/json' } })
            .then(function (r) { return r.json(); }).then(function (j) {
              var box = $('[data-chars]'); box.textContent = '';
              j.characters.forEach(function (c) {
                var btn = el('button', 'zh'); btn.type = 'button'; btn.title = c.meaning;
                btn.appendChild(document.createTextNode(c.char)); btn.appendChild(el('small', null, c.pinyin));
                btn.setAttribute('aria-label', 'Add ' + c.char + ' (' + c.pinyin + ': ' + c.meaning + ')');
                btn.addEventListener('click', function () { picks.push(c.char); renderPicks(); });
                box.appendChild(btn);
              });
            });
        });
      });
      $('[data-clear]').addEventListener('click', function () { picks = []; renderPicks(); });
    },

    zodiac: function () {
      function run() {
        var d = $('#zd-in').value;
        if (!d) { status('Choose a date.'); return; }
        post({ date: d }).then(function (j) {
          status('');
          $('[data-big]').textContent = j.animal[0] + ' ' + j.element[0];
          $('[data-text]').textContent = j.element[2] + ' ' + j.animal[2] + ' (' + j.element[1] + ' ' + j.animal[1] + ') · zodiac year ' + j.zodiacYear;
          $('[data-note]').textContent = 'Chinese New Year ' + d.slice(0, 4) + ' was on ' + j.lny + '. ' +
            (j.beforeNewYear ? 'Your birthday is before it, so you belong to the previous zodiac year.' : 'Your birthday is on or after it.');
          $('[data-result]').hidden = false;
        }).catch(function () { status('Enter a date between 1900 and 2100.'); $('[data-result]').hidden = true; });
      }
      $('[data-run]').addEventListener('click', run);
      $('#zd-in').addEventListener('change', run);
    }
  };
  if (init[kind]) init[kind]();
})();
