/* F2 · Worksheet builder (canvas board "Worksheet"): "Start from" fills the characters, the preview mirrors the PDF layout. */
(function () {
  'use strict';
  var form = document.querySelector('[data-worksheet-form]');
  if (!form) return;
  var root = form.closest('.ws'), pick = form.querySelector('[data-pick]'), ta = form.querySelector('#ws-chars');
  var f = function (k) { return form.querySelector('[data-f=' + k + ']'); };
  var CELLS = 12, MAX = 60, info = {}, auto = null, timer = null;

  function han(s) { var seen = {}; return Array.from(s || '').filter(function (c) { if (!/\p{Script=Han}/u.test(c) || seen[c]) return false; seen[c] = 1; return true; }); }
  function opt() { return pick.options[pick.selectedIndex]; }

  function choose(fill) {
    var v = pick.value, o = opt();
    root.querySelector('[data-ptitle]').textContent = o ? o.getAttribute('data-title') : '';
    if (!fill) return render();
    if (v.indexOf('lesson:') === 0) { ta.value = auto = o.getAttribute('data-chars') || ''; render(); }
    else if (v.indexOf('hsk:') === 0) {
      var p = v.split(':');
      fetch('/data/practice-queue?version=' + p[1] + '&level=' + p[2]).then(function (r) { return r.ok ? r.json() : { items: [] }; }).then(function (d) {
        ta.value = auto = d.items.map(function (i) { return i.char; }).join('').slice(0, MAX); render();
      });
    } else if (v === 'saved') {
      var w = []; try { w = window.HSK_STORE.getSaved(); } catch (e) {}
      ta.value = han(w.join('')).slice(0, MAX).join(''); auto = null; render();
    } else { auto = null; render(); }
  }

  function render() {
    var chars = han(ta.value).slice(0, MAX), n = chars.length;
    root.querySelector('[data-count]').textContent = n + (n === 1 ? ' character' : ' characters') + ' · up to ' + MAX + ' per sheet';
    var pages = n <= 9 ? 1 : 1 + Math.ceil((n - 9) / 10);
    root.querySelector('[data-pages]').textContent = 'A4 · page 1 of ' + pages;
    root.querySelector('[data-empty]').hidden = n > 0;
    var grid = (form.querySelector('input[name=grid]:checked') || {}).value || 'tian';
    var trace = +((form.querySelector('input[name=trace]:checked') || {}).value || 4);
    var showPy = form.querySelector('input[name=pinyin]').checked;
    var rows = root.querySelector('[data-rows]');
    rows.className = 'ws-rows ws-g-' + grid;
    rows.replaceChildren.apply(rows, chars.slice(0, 9).map(function (c) {
      var r = document.createElement('div'); r.className = 'ws-row';
      if (showPy) {
        var l = document.createElement('span'); l.className = 'ws-row-l';
        var i = info[c] || {}, b = document.createElement('b'); b.textContent = i.pinyin || '';
        l.appendChild(b); l.appendChild(document.createTextNode(i.english ? ' · ' + i.english : ''));
        r.appendChild(l);
      }
      var g = document.createElement('div'); g.className = 'ws-cells';
      for (var k = 0; k < CELLS; k++) {
        var s = document.createElement('span'); s.lang = 'zh-Hans';
        s.className = 'ws-cell' + (k === 0 ? ' is-model' : '');
        if (k === 0) s.textContent = c; else if (k <= trace) { s.setAttribute('data-g', c); s.setAttribute('aria-hidden', 'true'); } // grey tracing copies are drawn, not text
        g.appendChild(s);
      }
      r.appendChild(g); return r;
    }));
    var miss = chars.filter(function (c) { return !info[c]; });
    if (showPy && miss.length) {
      clearTimeout(timer);
      timer = setTimeout(function () {
        fetch('/data/practice-queue?words=' + encodeURIComponent(miss.join(','))).then(function (r) { return r.ok ? r.json() : { items: [] }; }).then(function (d) {
          d.items.forEach(function (i) { info[i.char] = { pinyin: i.pinyin || '', english: (i.english || '').split(';')[0] }; });
          miss.forEach(function (c) { info[c] = info[c] || {}; });
          render();
        }).catch(function () {});
      }, 250);
    }
  }

  pick.addEventListener('change', function () { choose(true); });
  form.addEventListener('input', render);
  form.addEventListener('change', function (e) { if (e.target !== pick) render(); });
  form.addEventListener('submit', function () {
    var v = pick.value, p = v.split(':'), useSrc = auto !== null && ta.value === auto && (p[0] === 'lesson' || p[0] === 'hsk');
    ['lesson', 'version', 'level'].forEach(function (k) { f(k).disabled = true; });
    if (useSrc && p[0] === 'lesson') { f('source').value = 'lesson'; f('lesson').value = p[1]; f('lesson').disabled = false; }
    else if (useSrc) { f('source').value = 'hsk'; f('version').value = p[1]; f('level').value = p[2]; f('version').disabled = false; f('level').disabled = false; }
    else f('source').value = 'text';
    ta.disabled = useSrc; setTimeout(function () { ta.disabled = false; }, 0);
    f('english').value = form.querySelector('input[name=pinyin]').checked ? '1' : '0';
  });

  // Prefilled characters (?chars=) win over the source's own list.
  if (ta.value.trim()) { auto = null; choose(false); } else choose(true);
})();
