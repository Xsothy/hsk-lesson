/* My words (D3): saved words from the client store, resolved via public JSON endpoints, cached locally. */
(function () {
  var S = window.HSK_STORE;
  var root = document.querySelector('[data-words-page]');
  if (!root || !S) return;
  var $ = function (s) { return root.querySelector(s); };
  var CACHE_KEY = 'hsk.v1.wordcache';
  var cache = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') || {}; } catch (e) { cache = {}; }
  function saveCache() { try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (e) {} }

  var filter = 'all', failed = {};
  var DAY = 86400000;

  function lookup(key) {
    return fetch('/data/hsk-words?per_page=10&q=' + encodeURIComponent(key), { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : { data: [] }; })
      .then(function (j) {
        var hits = (j.data || []).filter(function (w) { return w.simplified === key; });
        hits.sort(function (a, b) { return (!(a.hsk3_level || a.hsk2_level) - !(b.hsk3_level || b.hsk2_level)) || ((a.frequency || 1e9) - (b.frequency || 1e9)); });
        var hit = hits[0];
        if (hit) {
          var m = Array.isArray(hit.meanings) ? hit.meanings : [];
          return { py: hit.pinyin || '', en: m.slice(0, 2).join('; '), lv: hit.hsk3_level || hit.hsk2_level || null };
        }
        if (Array.from(key).length !== 1) return null;
        return fetch('/data/char/' + encodeURIComponent(key) + '.json').then(function (r) { return r.ok ? r.json() : null; }).then(function (c) {
          if (!c) return null;
          var p = Array.isArray(c.pinyin) ? c.pinyin[0] : c.pinyin;
          return { py: p || '', en: c.definition || '', lv: c.hsk3_level || null };
        });
      }).catch(function () { return null; });
  }
  // Resolve unknown keys with a small worker pool (4 at a time), cached in localStorage, then re-render.
  function resolveMissing(keys) {
    var todo = keys.filter(function (k) { return !cache[k]; });
    if (!todo.length) return;
    function next() {
      if (!todo.length) return Promise.resolve();
      var k = todo.shift();
      return lookup(k).then(function (v) { if (v) cache[k] = v; else failed[k] = 1; }).then(next);
    }
    Promise.all([next(), next(), next(), next()]).then(function () { saveCache(); render(); });
  }

  function info(k) { return cache[k] || { py: '', en: '', lv: null }; }
  function status(k) { return S.isKnown(k) ? 'known' : 'learn'; }
  // Card state for the row tag: Due (SRS due now) · Known · Learning (has an SRS card) · New.
  function state(k) {
    var c = S.srsGet(k);
    if (c && c.due <= Date.now()) return ['Due', 'due'];
    if (S.isKnown(k)) return ['Known', 'known'];
    return c ? ['Learning', 'learning'] : ['New', 'new'];
  }
  function matches(k) {
    if (filter === 'all') return true;
    if (filter === 'known' || filter === 'learn') return status(k) === filter;
    return String(info(k).lv) === filter.slice(3); // "hsk<N>"
  }

  function renderStats(saved) {
    var p = S.getProgress();
    var vals = { known: Object.keys(p.known).length, written: Object.keys(p.chars).length, due: S.srsDueCount(), streak: S.getStreak() };
    Object.keys(vals).forEach(function (k) { var el = $('[data-stat=' + k + '] .stat-value'); if (el) el.textContent = vals[k]; });
  }

  function dayKey(t) { var d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function renderWeek() {
    var act = S.getActivity(), now = Date.now(), days = [], i, max = 1, total = 0;
    for (i = 6; i >= 0; i--) {
      var t = now - i * DAY, n = +act[dayKey(t)] || 0;
      days.push({ label: new Date(t).toLocaleDateString('en', { weekday: 'short' }), n: n });
      max = Math.max(max, n); total += n;
    }
    var desc = 'Activity in the last 7 days: ' + days.map(function (d) { return d.label + ' ' + d.n; }).join(', ') + '. Total ' + total + '.';
    var html = '<div class="week-chart" role="img" aria-label="' + desc + '">';
    days.forEach(function (d, j) {
      var h = Math.round(d.n / max * 80);
      html += '<div class="wk-day"><span class="wk-n">' + d.n + '</span><div class="wk-bar' + (j === 6 ? ' is-today' : '') + '" style="height:' + h + 'px"></div><span class="wk-d">' + d.label + '</span></div>';
    });
    $('[data-week]').innerHTML = html + '</div>' +
      (total ? '' : '<p class="words-count">No activity yet this week — write a character or review a card to get started.</p>');
  }

  function chipEl(label, val) {
    var el = document.getElementById('tpl-chip').content.firstElementChild.cloneNode(true);
    el.textContent = label; el.setAttribute('data-filter', val);
    var on = filter === val; el.classList.toggle('is-active', on); el.setAttribute('aria-pressed', on);
    return el;
  }
  function renderChips(saved) {
    var levels = {}, box = $('[data-chips]');
    saved.forEach(function (k) { var l = info(k).lv; if (l) levels[l] = 1; });
    if (filter.indexOf('hsk') === 0 && !levels[filter.slice(3)]) filter = 'all';
    box.textContent = '';
    function n(f) { var keep = filter; filter = f; var c = saved.filter(matches).length; filter = keep; return c; }
    box.appendChild(chipEl('All ' + saved.length, 'all')); box.appendChild(chipEl('Known ' + n('known'), 'known')); box.appendChild(chipEl('To learn ' + n('learn'), 'learn'));
    Object.keys(levels).sort(function (a, b) { return a - b; }).forEach(function (l) { box.appendChild(chipEl('HSK ' + l + ' · ' + n('hsk' + l), 'hsk' + l)); });
  }

  function rowEl(k) {
    var el = document.getElementById('tpl-row').content.firstElementChild.cloneNode(true), i = info(k);
    var zh = el.querySelector('.wr-zh');
    var a = document.createElement('a'); a.href = '/char/' + encodeURIComponent(Array.from(k)[0]); a.className = 'wr-zh-link'; a.textContent = k;
    a.setAttribute('aria-label', 'Open ' + k); zh.textContent = ''; zh.appendChild(a);
    var py = el.querySelector('.wr-py');
    if (i.py && window.HSK_PINYIN) py.innerHTML = window.HSK_PINYIN.html(i.py); else py.textContent = i.py || ' ';
    el.querySelector('.wr-en').textContent = i.en || (cache[k] || failed[k] ? '' : '…');
    var au = el.querySelector('.wr-audio'); au.setAttribute('data-say', k); au.setAttribute('aria-label', 'Play ' + k);
    var u = el.querySelector('[data-unsave]'); u.setAttribute('data-key', k); u.setAttribute('aria-label', 'Remove ' + k + ' from saved words');
    var st = state(k), t = document.createElement('span'); t.className = 'wr-tag mw-tag-' + st[1]; t.textContent = st[0]; au.parentNode.insertBefore(t, au);
    return el;
  }

  function render() {
    var saved = S.getSaved();
    renderStats(saved); renderWeek();
    $('[data-empty]').hidden = saved.length > 0;
    $('[data-main]').hidden = saved.length === 0;
    if (!saved.length) return;
    sheetLink();
    renderChips(saved);
    var shown = saved.filter(matches), list = $('[data-list]');
    list.textContent = '';
    shown.forEach(function (k) { list.appendChild(rowEl(k)); });
    $('[data-count]').textContent = shown.length === saved.length ? saved.length + ' saved' : shown.length + ' of ' + saved.length + ' saved';
    if (!shown.length) list.innerHTML = '<p class="words-count">Nothing in this group yet.</p>';
  }

  function csvCell(v) { v = String(v == null ? '' : v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function csv() {
    var rows = [['hanzi', 'pinyin', 'english', 'hsk_level', 'status']];
    S.getSaved().forEach(function (k) { var i = info(k); rows.push([k, i.py, i.en, i.lv || '', status(k) === 'known' ? 'known' : 'to learn']); });
    return '﻿' + rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n') + '\r\n';
  }
  function download() {
    var blob = new Blob([csv()], { type: 'text/csv;charset=utf-8' }), url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = 'my-words.csv';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  root.addEventListener('click', function (e) {
    var t = e.target.closest('[data-filter],[data-unsave],[data-act=csv],[data-act=pdf]');
    if (!t) return;
    if (t.hasAttribute('data-filter')) { filter = t.getAttribute('data-filter'); render(); }
    else if (t.hasAttribute('data-unsave')) { S.unsaveWord(t.getAttribute('data-key')); render(); }
    else if (t.getAttribute('data-act') === 'pdf') exportPdf();
    else download();
  });

  // F9: the form lives outside [data-words-page] (it is a sibling), so look it up on document.
  function savedHan() { return S.getSaved().filter(function (k) { return /^\p{Script=Han}+$/u.test(k); }).slice(0, 200); }
  function exportPdf() {
    var form = document.querySelector('[data-pdf-form]'), words = savedHan();
    if (!form || !words.length) return;
    Array.prototype.slice.call(form.querySelectorAll('input[name="words[]"]')).forEach(function (i) { i.remove(); });
    words.forEach(function (w) { var i = document.createElement('input'); i.type = 'hidden'; i.name = 'words[]'; i.value = w; form.appendChild(i); });
    form.submit();
  }
  function sheetLink() {
    var a = $('[data-act=sheet]'); if (!a) return;
    a.href = '/worksheet?source=text&chars=' + encodeURIComponent(savedHan().join('').slice(0, 500));
  }

  render();
  resolveMissing(S.getSaved());
})();
