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
    bar: $('[data-bar]'), progress: $('.pr-bar'), done: $('[data-done]'), count: $('[data-count]'),
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
    if (q.get('version')) {
      var p = new URLSearchParams();
      ['version', 'level', 'set'].forEach(function (k) { if (q.get(k)) p.set(k, q.get(k)); });
      return Promise.resolve('/data/practice-queue?' + p);
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
      if (!d.items.length) throw new Error('No characters to practise in that source.');
      S.queue = d.items; S.i = 0; S.results = []; S.finished = false;
      el.title.textContent = d.label;
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
    el.done.replaceChildren.apply(el.done, S.queue.map(function (it, k) {
      var li = document.createElement('li'), r = S.results[k];
      li.className = 'pr-chip zh' + (k === S.i ? ' is-current' : '') + (r ? (r.done ? ' is-done' : ' is-skipped') : '');
      // Dictation must not reveal the answer: unfinished characters show their number instead.
      var hide = S.mode === 'dictation' && !r;
      li.lang = hide ? 'en' : 'zh-Hans'; li.textContent = hide ? String(k + 1) : it.char;
      if (k === S.i) li.setAttribute('aria-current', 'step');
      return li;
    }));
    var finished = S.results.filter(Boolean).length;
    el.bar.style.width = Math.round(finished / n * 100) + '%';
    el.progress.setAttribute('aria-valuemax', n); el.progress.setAttribute('aria-valuenow', finished);
    el.count.textContent = Math.min(S.i + 1, n) + ' of ' + n;
  }

  function paintPrompt(reveal) {
    var it = cur(), dict = S.mode === 'dictation';
    el.py.textContent = dict && !reveal ? '' : (it.pinyin || '');
    el.en.textContent = it.english || '';
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
      width: size, height: size, showCharacter: false, showOutline: S.outline,
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

  if (root.hasAttribute('data-has-source')) start();
})();
