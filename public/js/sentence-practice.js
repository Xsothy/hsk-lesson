/**
 * F7 · Sentence practice. Same session shape as D1 (practice.js): queue from /data/practice-queue, progress bar,
 * count, summary; results go to HSK_STORE.recordQuiz('sentences/<lesson|all>', correct, total) (synced by S2).
 * Exercises: "build" = tap word tiles in order from the English meaning; "meaning" = pick the English for a Chinese line.
 */
(function () {
  'use strict';
  var root = document.querySelector('[data-sentences]');
  if (!root) return;
  var $ = function (s) { return root.querySelector(s); };
  var store = window.HSK_STORE;
  var el = {
    msg: $('[data-msg]'), session: $('[data-session]'), summary: $('[data-summary]'), title: $('[data-title]'),
    bar: $('[data-bar]'), progress: $('.pr-bar'), count: $('[data-count]'), ask: $('[data-ask]'),
    build: $('[data-build]'), en: $('[data-en]'), answer: $('[data-answer]'), tiles: $('[data-tiles]'),
    meaning: $('[data-meaning]'), line: $('[data-line]'), choices: $('[data-choices]'),
    reveal: $('[data-reveal]'), feedback: $('[data-feedback]'),
    clear: $('[data-action=clear]'), check: $('[data-action=check]'), next: $('[data-action=next]'), nextLabel: $('[data-next-label]'),
    modeBtns: [].slice.call(root.querySelectorAll('[data-set-mode]')),
  };
  var lesson = root.dataset.lesson || '';
  var S = { items: [], i: 0, mode: root.dataset.mode || 'mix', results: [], picked: [], answered: false };

  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function say(t, cls) { el.feedback.textContent = t || ''; el.feedback.className = 'pr-feedback' + (cls ? ' ' + cls : ''); }
  function cur() { return S.items[S.i]; }
  function kindOf(i) { return S.mode === 'mix' ? (i % 2 ? 'meaning' : 'build') : S.mode; }
  function btn(cls, text, lang) { var b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = text; if (lang) b.lang = lang; return b; }

  function start() {
    fetch('/data/practice-queue?kind=sentences' + (lesson ? '&lesson=' + encodeURIComponent(lesson) : '')).then(function (r) {
      if (!r.ok) throw new Error(r.status === 404 ? 'That lesson was not found.' : 'Could not load sentences.');
      return r.json();
    }).then(function (d) {
      if (!d.items.length) throw new Error('No sentences to practise in that lesson yet.');
      S.items = shuffle(d.items); S.results = [];
      el.msg.hidden = true; el.session.hidden = false; el.summary.hidden = true;
      show(0);
    }).catch(function (e) { el.msg.textContent = e.message || 'Something went wrong.'; el.msg.hidden = false; });
  }

  function progress() {
    var n = S.items.length, done = S.results.filter(Boolean).length;
    el.bar.style.width = Math.round(done / n * 100) + '%';
    el.progress.setAttribute('aria-valuemax', n); el.progress.setAttribute('aria-valuenow', done);
    el.count.textContent = (S.i + 1) + ' / ' + n;
  }

  function show(i) {
    S.i = i; S.picked = []; S.answered = false;
    var it = cur(), kind = kindOf(i);
    root.dataset.kind = kind;
    el.modeBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.setMode === S.mode)); });
    el.reveal.hidden = true; el.reveal.replaceChildren(); say('');
    el.answer.className = 'sp-answer';
    el.build.hidden = kind !== 'build'; el.meaning.hidden = kind !== 'meaning';
    el.clear.hidden = kind !== 'build'; el.check.hidden = kind !== 'build'; el.next.hidden = true;
    el.nextLabel.textContent = i === S.items.length - 1 ? 'Finish' : 'Next';
    if (kind === 'build') {
      el.ask.textContent = 'Build the sentence';
      el.en.textContent = it.en;
      var order = shuffle(it.tiles.map(function (t, k) { return k; }));
      if (order.length > 1 && order.every(function (v, k) { return v === k; })) order.reverse(); // never pre-solved
      el.tiles.replaceChildren.apply(el.tiles, order.map(function (k) {
        var b = btn('sp-tile zh', it.tiles[k], 'zh-Hans'); b.dataset.k = k; return b;
      }));
      paintAnswer();
    } else {
      el.ask.textContent = 'What does it mean?';
      el.line.innerHTML = it.ruby; // server-rendered <x-ruby-line>
      el.choices.replaceChildren.apply(el.choices, shuffle(it.choices).map(function (c) { var b = btn('sp-choice', c); b.dataset.choice = c; return b; }));
    }
    progress();
  }

  function paintAnswer() {
    var it = cur();
    el.answer.replaceChildren.apply(el.answer, S.picked.map(function (k, pos) {
      var b = btn('sp-tile zh', it.tiles[k], 'zh-Hans'); b.dataset.pos = pos; b.disabled = S.answered; return b;
    }));
    [].forEach.call(el.tiles.children, function (b) { b.disabled = S.answered || S.picked.indexOf(+b.dataset.k) >= 0; });
    el.check.disabled = S.picked.length !== it.tiles.length;
  }

  function reveal(ok) {
    var it = cur();
    S.answered = true;
    S.results[S.i] = { id: it.id, kind: kindOf(S.i), ok: ok };
    el.reveal.innerHTML = it.ruby;
    var p = document.createElement('p'); p.className = 'sp-reveal-en'; p.textContent = it.en; el.reveal.appendChild(p);
    el.reveal.hidden = false;
    el.clear.hidden = true; el.check.hidden = true; el.next.hidden = false;
    say(ok ? 'Correct!' : 'Not quite — here is the sentence.', ok ? 'ok' : 'bad');
    progress();
    el.next.focus();
  }

  function check() {
    var it = cur();
    if (S.answered || S.picked.length !== it.tiles.length) return;
    // Compare text, not tile positions, so repeated words (你 … 你) in either order count.
    var ok = S.picked.map(function (k) { return it.tiles[k]; }).join('') === it.tiles.join('');
    el.answer.classList.add(ok ? 'is-ok' : 'is-bad');
    paintAnswer(); reveal(ok);
  }

  function choose(b) {
    if (S.answered) return;
    var it = cur(), ok = b.dataset.choice === it.en;
    [].forEach.call(el.choices.children, function (c) {
      c.disabled = true;
      if (c.dataset.choice === it.en) c.classList.add('is-ok'); else if (c === b) c.classList.add('is-bad');
    });
    reveal(ok);
  }

  function finish() {
    var n = S.items.length, right = S.results.filter(function (r) { return r && r.ok; }).length;
    try { if (store && store.recordQuiz) store.recordQuiz('sentences/' + (lesson || 'all'), right, n); } catch (e) {}
    $('[data-stat=correct] .stat-value').textContent = right + '/' + n;
    $('[data-stat=missed] .stat-value').textContent = n - right;
    $('[data-stat=accuracy] .stat-value').textContent = Math.round(right / n * 100) + '%';
    el.session.hidden = true; el.summary.hidden = false;
    var h = $('[data-summary] h2'); h.setAttribute('tabindex', '-1'); h.focus();
    try { window.dispatchEvent(new CustomEvent('hsk:practice-done', { detail: { kind: 'sentences', done: right, total: n, mode: S.mode } })); } catch (e) {}
  }

  root.addEventListener('click', function (e) {
    var m = e.target.closest('[data-set-mode]');
    if (m) {
      if (m.dataset.setMode !== S.mode) {
        S.mode = m.dataset.setMode;
        try { var u = new URL(location.href); u.searchParams.set('mode', S.mode); history.replaceState(null, '', u); } catch (err) {}
        if (S.items.length && !S.answered) show(S.i); else if (S.items.length) el.modeBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.setMode === S.mode)); });
      }
      return;
    }
    var t = e.target.closest('.sp-tile');
    if (t && !t.disabled && !S.answered) {
      if (t.dataset.pos != null) S.picked.splice(+t.dataset.pos, 1); else S.picked.push(+t.dataset.k);
      paintAnswer();
      return;
    }
    var c = e.target.closest('.sp-choice');
    if (c && !c.disabled) { choose(c); return; }
    var a = e.target.closest('[data-action]');
    if (!a) return;
    var act = a.dataset.action;
    if (act === 'clear') { S.picked = []; paintAnswer(); }
    else if (act === 'check') check();
    else if (act === 'next') { if (S.i + 1 < S.items.length) show(S.i + 1); else finish(); }
    else if (act === 'again') { S.items = shuffle(S.items); S.results = []; el.summary.hidden = true; el.session.hidden = false; show(0); }
  });

  start();
})();
