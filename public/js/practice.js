/**
 * Practice session (D1): Write + Dictation over a queue of unique characters.
 * Reuses HSKCharacter (character.js) for the Hanzi Writer setup/quiz and HSK_STORE (store.js) for results.
 * Queue sources: ?lesson=slug · ?version=2|3&level=&set= · ?source=saved · ?source=due (all via /data/practice-queue).
 */
(function () {
  'use strict';
  var root = document.querySelector('[data-practice]');
  if (!root) return;
  var $ = function (s) { return root.querySelector(s); };
  var store = window.HSK_STORE, HC = window.HSKCharacter;
  var q = new URLSearchParams(location.search);

  var el = {
    picker: $('[data-picker]'), session: $('[data-session]'), summary: $('[data-summary]'), msg: $('[data-msg]'), title: $('[data-title]'),
    bar: $('[data-bar]'), progress: $('.pr-bar'), done: $('[data-done]'), doneRow: $('[data-done-row]'), count: $('[data-count]'), label: $('[data-label]'), dictHint: $('[data-dict-hint]'),
    py: $('[data-py]'), en: $('[data-en]'), feedback: $('[data-feedback]'), grid: $('.writing-grid'), mount: $('[data-writer]'),
    next: $('[data-action=next]'), nextLabel: $('[data-next-label]'), outlineBtn: $('[data-action=outline]'),
    modeBtns: [].slice.call(root.querySelectorAll('[data-set-mode]')),
  };
  var S = { queue: [], i: 0, mode: root.dataset.mode, outline: true, results: [], writer: null, nextStroke: 0, mistakes: 0, strokes: 0, finished: false };

  function say(t, cls) { el.feedback.textContent = t || ''; el.feedback.className = 'pr-feedback' + (cls ? ' ' + cls : ''); }
  function msg(t) { el.msg.textContent = t; el.msg.hidden = !t; }
  function hintAfter() {
    var s = {};
    try { s = store && store.getSettings ? store.getSettings() : {}; } catch (e) {}
    var v = parseInt(s.hintAfterMisses != null ? s.hintAfterMisses : s.hint_after_misses != null ? s.hint_after_misses : s.hintAfter, 10);
    return v >= 1 && v <= 10 ? v : 3;
  }
  function speak(t) {
    if (!window.HSK_AUDIO || !t) return;
    try { var p = window.HSK_AUDIO.speak(t); if (p && p.catch) p.catch(function () {}); } catch (e) {}
  }
  function cur() { return S.queue[S.i]; }

  // ---------- queue ----------
  function queueUrl() {
    var src = q.get('source');
    if (q.get('lesson')) return Promise.resolve('/data/practice-queue?lesson=' + encodeURIComponent(q.get('lesson')));
    if (q.get('words')) { // from Browse "Practise" (search / pinyin / radical views)
      var ws = q.get('words').split(',').map(function (w) { return w.replace(/[^㐀-鿿]/g, ''); }).filter(Boolean).slice(0, 100);
      if (ws.length) return Promise.resolve('/data/practice-queue?words=' + encodeURIComponent(ws.join(',')));
    }
    if (q.get('version')) {
      var p = new URLSearchParams();
      ['version', 'level', 'set'].forEach(function (k) { if (q.get(k)) p.set(k, q.get(k)); });
      return Promise.resolve('/data/practice-queue?' + p);
    }
    if (src === 'list') { // F1 textbook list: words come from the browser store, hints filled by the queue endpoint
      var lst = null;
      try { lst = store.getList(q.get('id')); } catch (e) {}
      var lw = lst ? lst.words.map(function (w) { return String(w.h).replace(/[^㐀-鿿]/g, ''); }).filter(Boolean).slice(0, 100) : [];
      if (!lw.length) return Promise.reject(new Error('That list was not found or has no Chinese words.'));
      return Promise.resolve('/data/practice-queue?words=' + encodeURIComponent(lw.join(',')));
    }
    if (src === 'saved' || src === 'due') {
      var words = [];
      try { words = src === 'saved' ? store.getSaved() : store.srsDue(); } catch (e) {}
      words = words.map(function (w) { return String(w).replace(/[^㐀-鿿]/g, ''); }).filter(Boolean);
      if (!words.length) return Promise.reject(new Error(src === 'saved' ? 'You have no saved words yet. Save words from a character page or Browse.' : 'No cards are due right now. Nice work!'));
      return Promise.resolve('/data/practice-queue?words=' + encodeURIComponent(words.join(',')));
    }
    return Promise.reject(new Error('Choose a source.'));
  }

  function start() {
    msg('Building your queue…');
    el.picker.hidden = true;
    queueUrl().then(function (u) { return fetch(u); }).then(function (r) {
      if (!r.ok) throw new Error(r.status === 404 ? 'That lesson was not found.' : 'Could not build a queue for that source.');
      return r.json();
    }).then(function (d) {
      var f = q.get('filter');
      if (f === 'learn' || f === 'known') { // Browse filter: To learn / Known (store-based)
        d.items = d.items.filter(function (it) { var k = false; try { k = !!(store && (store.isKnown(it.word) || store.isKnown(it.char))); } catch (e) {} return f === 'known' ? k : !k; });
      }
      if (!d.items.length) throw new Error('No characters to practise in that source.');
      if (q.get('order') === 'random') { // "Which items · Random"
        for (var k = d.items.length - 1; k > 0; k--) { var j = Math.floor(Math.random() * (k + 1)), t = d.items[k]; d.items[k] = d.items[j]; d.items[j] = t; }
      }
      S.queue = d.items; S.i = 0; S.results = []; S.finished = false;
      el.title.textContent = 'Practice · ' + d.label;
      el.label.textContent = d.label;
      msg('');
      el.session.hidden = false; el.summary.hidden = true;
      show(0);
    }).catch(function (e) {
      el.picker.hidden = false; el.session.hidden = true;
      msg(e.message || 'Something went wrong.');
    });
  }

  // ---------- progress UI ----------
  function renderDone() {
    var n = S.queue.length;
    // Only finished characters are listed ("Done:"), so Dictation never reveals what is coming.
    var items = [];
    S.queue.forEach(function (it, k) {
      var r = S.results[k];
      if (!r) return;
      var li = document.createElement('li'), a = document.createElement('a');
      a.className = 'pr-chip zh' + (r.done ? ' is-done' : ' is-skipped');
      a.lang = 'zh-Hans'; a.textContent = it.char; a.href = '/char/' + encodeURIComponent(it.char);
      a.setAttribute('aria-label', it.char + (r.done ? ', written' : ', skipped') + ' — open character page');
      li.appendChild(a); items.push(li);
    });
    el.done.replaceChildren.apply(el.done, items);
    el.doneRow.hidden = !items.length;
    var finished = S.results.filter(Boolean).length;
    el.bar.style.width = Math.round(finished / n * 100) + '%';
    el.progress.setAttribute('aria-valuemax', n); el.progress.setAttribute('aria-valuenow', finished);
    el.count.textContent = Math.min(S.i + 1, n) + ' / ' + n;
  }

  function paintPrompt(reveal) {
    var it = cur(), dict = S.mode === 'dictation';
    var py = dict && !reveal ? '' : (it.pinyin || '');
    if (py && window.HSK_PINYIN) el.py.innerHTML = window.HSK_PINYIN.html(py); else el.py.textContent = py;
    el.en.textContent = (it.english || '') + (it.word && it.word !== it.char && !dict ? ' · from ' + it.word : '');
    el.dictHint.textContent = it.english ? 'Hint: “' + it.english + '” — no outline shown' : 'No outline shown';
    el.grid.dataset.mode = dict ? 'blank' : 'write';
    el.grid.classList.toggle('wg-blank', dict);
    el.grid.classList.toggle('wg-write', !dict);
    el.modeBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.setMode === S.mode)); });
    root.dataset.mode = S.mode;
  }

  // ---------- one character ----------
  function show(i) {
    S.i = i; var it = cur();
    S.nextStroke = 0; S.mistakes = 0; S.strokes = 0; S.finished = false;
    el.grid.dataset.char = it.char;
    S.outline = S.mode === 'write';
    el.outlineBtn.setAttribute('aria-pressed', String(S.outline));
    el.nextLabel.textContent = i === S.queue.length - 1 ? 'Finish' : 'Next';
    paintPrompt(false); renderDone();
    if (S.mode === 'dictation') speak(it.word);
    build();
  }

  function build() {
    var it = cur(), size = Math.round(el.mount.getBoundingClientRect().width) || 300;
    if (S.writer) { try { S.writer.cancelQuiz(); } catch (e) {} }
    el.mount.replaceChildren();
    if (!window.HanziWriter) { say('Could not load the writing tool. Check your connection and reload.', 'bad'); return; }
    S.writer = HC.createWriter(el.mount, it.char, {
      width: size, height: size, showCharacter: false, showOutline: S.outline, ghost: false,
      onLoadCharDataError: function () { say('Stroke data is not available for ' + it.char + ' — use Next to skip.', 'bad'); },
    });
    quiz();
  }

  function quiz() {
    var w = S.writer, it = cur();
    S.nextStroke = 0; S.finished = false;
    say(S.mode === 'dictation' ? 'Listen, then write the character. Stroke 1.' : 'Write stroke 1 in the grid.');
    HC.runQuiz(w, {
      hintAfter: hintAfter(),
      onMistake: function () { S.mistakes++; say('Not quite — try that stroke again.', 'bad'); },
      onCorrectStroke: function (s) { S.strokes++; S.nextStroke = s.strokeNum + 1; say('Stroke ' + S.nextStroke + ' ✓ · ' + s.strokesRemaining + ' to go', 'ok'); },
      onComplete: function () {
        if (S.finished || w !== S.writer) return;
        S.finished = true;
        HC.markWritten(it.char);
        S.results[S.i] = { char: it.char, done: true, mistakes: S.mistakes, strokes: S.strokes };
        paintPrompt(true); renderDone();
        say(S.mistakes ? 'Done with ' + S.mistakes + ' mistake' + (S.mistakes > 1 ? 's' : '') + '.' : 'Perfect! No mistakes.', 'ok');
        el.next.focus();
      },
    });
  }

  function advance() {
    if (!S.results[S.i]) S.results[S.i] = { char: cur().char, done: false, mistakes: S.mistakes, strokes: S.strokes };
    if (S.i + 1 < S.queue.length) show(S.i + 1); else finish();
  }

  function finish() {
    if (S.writer) { try { S.writer.cancelQuiz(); } catch (e) {} }
    renderDone();
    var done = S.results.filter(function (r) { return r && r.done; });
    var mistakes = S.results.reduce(function (a, r) { return a + (r ? r.mistakes : 0); }, 0);
    var strokes = S.results.reduce(function (a, r) { return a + (r ? r.strokes : 0); }, 0);
    var acc = strokes + mistakes ? Math.round(strokes / (strokes + mistakes) * 100) : 0;
    var skipped = S.results.filter(function (r) { return r && !r.done; });
    try { if (store && done.length) store.streakTouch(); } catch (e) {}
    $('[data-stat=done] .stat-value').textContent = done.length + '/' + S.queue.length;
    $('[data-stat=mistakes] .stat-value').textContent = mistakes;
    $('[data-stat=accuracy] .stat-value').textContent = acc + '%';
    var sk = $('[data-skipped]');
    sk.hidden = !skipped.length;
    sk.textContent = skipped.length ? skipped.length + ' skipped: ' + skipped.map(function (r) { return r.char; }).join(' ') : '';
    el.session.hidden = true; el.summary.hidden = false;
    var h = $('[data-summary] h2'); h.setAttribute('tabindex', '-1'); h.focus();
    try { window.dispatchEvent(new CustomEvent('hsk:practice-done', { detail: { done: done.length, total: S.queue.length, mistakes: mistakes, mode: S.mode } })); } catch (e) {}
  }

  function hintStroke() {
    if (S.finished || !S.writer) return;
    HC.loadCharData(cur().char).then(function (d) {
      if (S.nextStroke < d.strokes.length) S.writer.highlightStroke(S.nextStroke);
    }, function () {});
  }

  // ---------- controls ----------
  root.addEventListener('click', function (e) {
    var m = e.target.closest('[data-set-mode]');
    if (m) { if (m.dataset.setMode !== S.mode && S.queue.length) { S.mode = m.dataset.setMode; show(S.i); } return; }
    var a = e.target.closest('[data-action]');
    if (!a) return;
    var w = S.writer, act = a.dataset.action;
    if (act === 'audio') speak(cur().word);
    else if (act === 'hint') hintStroke();
    else if (act === 'outline' && w) { S.outline = !S.outline; if (S.outline) w.showOutline(); else w.hideOutline(); a.setAttribute('aria-pressed', String(S.outline)); }
    else if (act === 'retry' && w) { w.cancelQuiz(); w.hideCharacter(); S.mistakes = 0; S.strokes = 0; delete S.results[S.i]; paintPrompt(false); renderDone(); quiz(); }
    else if (act === 'next') advance();
    else if (act === 'again') { S.results = []; el.summary.hidden = true; el.session.hidden = false; show(0); }
  });

  // Setup aside: radio sources navigate; saved / due counts come from the store.
  root.addEventListener('change', function (e) {
    var t = e.target;
    if (t.name === 'pr-src' && t.dataset.href) location.href = t.dataset.href;
    else if (t.matches('[data-more]') && t.value) location.href = t.value;
  });
  try {
    var ns = store.getSaved().length, nd = store.srsDueCount();
    root.querySelector('[data-src-sub=saved]').textContent = ns + (ns === 1 ? ' word' : ' words');
    root.querySelector('[data-src-sub=due]').textContent = nd + (nd === 1 ? ' card' : ' cards');
  } catch (e) {}

  if (root.hasAttribute('data-has-source')) start();
})();
