/**
 * F4 · Pinyin match. Rounds of ~6 pairs: tap a character tile, then its pinyin (or meaning) tile, in either order.
 * Deck: /data/review-deck (lesson | HSK level/set | saved words) or a textbook list from the store (F1, hsk.v1.lists).
 * Score = pairs*10 - misses*2 (min 0); a timer runs across the session. Best per source is kept by HSK_STORE.recordMatch (synced by S2).
 */
(function () {
  'use strict';
  var root = document.querySelector('[data-match]');
  if (!root) return;
  var $ = function (s) { return root.querySelector(s); };
  var store = window.HSK_STORE, PY = window.HSK_PINYIN;
  var qs = new URLSearchParams(location.search);
  var ROUND = 6, MAX_WORDS = 30, MIN_PAIRS = 3;
  var el = {
    picker: $('[data-picker]'), lists: $('[data-lists]'), msg: $('[data-msg]'), session: $('[data-session]'), summary: $('[data-summary]'),
    count: $('[data-count]'), timer: $('[data-timer]'), misses: $('[data-misses]'), best: $('[data-best]'),
    left: $('[data-left]'), right: $('[data-right]'), feedback: $('[data-feedback]'), bestNote: $('[data-best-note]'),
    modeBtns: [].slice.call(root.querySelectorAll('[data-set-mode]')),
  };
  var S = { key: '', cards: [], rounds: [], r: 0, mode: 'pinyin', matched: {}, sel: null, misses: 0, pairs: 0, t0: 0, ms: 0, timer: null, done: false };

  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function say(t, cls) { el.feedback.textContent = t || ''; el.feedback.className = 'pr-feedback' + (cls ? ' ' + cls : ''); }
  function fmt(ms) { var s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function msg(t) { el.msg.textContent = t; el.msg.hidden = false; }
  function answer(c) { return S.mode === 'pinyin' ? c.pinyin : c.english; }
  function score() { return Math.max(0, S.pairs * 10 - S.misses * 2); }
  function bestOf(key) { try { return store && store.getMatch ? store.getMatch(key) : null; } catch (e) { return null; } }
  function paintBest() { var b = bestOf(S.key); el.best.textContent = b ? b.score + ' · ' + fmt(b.ms) : '–'; }

  // ---- source ----
  function sourceKey() {
    if (qs.get('lesson')) return qs.get('lesson'); // slug, e.g. lesson-1
    if (qs.get('version')) return 'hsk' + qs.get('version') + '-' + (qs.get('level') || 1) + (qs.get('set') ? '-s' + qs.get('set') : '');
    if (qs.get('source') === 'saved') return 'saved';
    if (qs.get('source') === 'list') return 'list-' + qs.get('id');
    return '';
  }
  function deck() {
    var u = root.getAttribute('data-deck-url'), src = qs.get('source');
    if (qs.get('lesson')) return fetchDeck(u + '?lesson=' + encodeURIComponent(qs.get('lesson')));
    if (qs.get('version')) {
      return fetchDeck(u + '?version=' + encodeURIComponent(qs.get('version')) + '&level=' + encodeURIComponent(qs.get('level') || 1) + (qs.get('set') ? '&set=' + encodeURIComponent(qs.get('set')) : ''));
    }
    if (src === 'list') {
      var lst = null;
      try { lst = store.getList(qs.get('id')); } catch (e) {}
      if (!lst) return Promise.reject(new Error('That list was not found.'));
      return Promise.resolve(lst.words.map(function (w) { return { id: w.h, hanzi: w.h, pinyin: w.p, english: w.e }; }));
    }
    if (src === 'saved') {
      var ids = [];
      try { ids = store.getSaved().slice(0, 150); } catch (e) {}
      if (!ids.length) return Promise.reject(new Error('You have no saved words yet. Save words from a character page or Browse.'));
      return fetchDeck(u + '?source=saved&words=' + encodeURIComponent(ids.join(',')));
    }
    return null;
  }
  function fetchDeck(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status === 404 ? 'That source was not found.' : 'Could not load the words.'); return r.json(); })
      .then(function (d) { return d.cards || []; });
  }

  // ---- rounds ----
  function build(cards) {
    var seen = {};
    // Every card needs a character, pinyin and meaning, and each hanzi shows once.
    S.cards = shuffle(cards.filter(function (c) {
      if (!c || !c.hanzi || !c.pinyin || !c.english || seen[c.hanzi]) return false;
      seen[c.hanzi] = 1; return true;
    })).slice(0, MAX_WORDS);
    if (S.cards.length < MIN_PAIRS) return false;
    S.rounds = [];
    for (var i = 0; i < S.cards.length; i += ROUND) S.rounds.push(S.cards.slice(i, i + ROUND));
    if (S.rounds.length > 1 && S.rounds[S.rounds.length - 1].length < MIN_PAIRS) { // fold a tiny last round into the one before
      var tail = S.rounds.pop(); S.rounds[S.rounds.length - 1] = S.rounds[S.rounds.length - 1].concat(tail);
    }
    return true;
  }

  function newGame() {
    S.cards = shuffle(S.cards); S.rounds = [];
    for (var i = 0; i < S.cards.length; i += ROUND) S.rounds.push(S.cards.slice(i, i + ROUND));
    if (S.rounds.length > 1 && S.rounds[S.rounds.length - 1].length < MIN_PAIRS) { var tail = S.rounds.pop(); S.rounds[S.rounds.length - 1] = S.rounds[S.rounds.length - 1].concat(tail); }
    S.r = 0; S.misses = 0; S.pairs = 0; S.done = false; S.t0 = Date.now(); S.ms = 0;
    el.misses.textContent = '0'; el.summary.hidden = true; el.session.hidden = false;
    paintBest(); startTimer(); round(0);
  }

  function startTimer() {
    clearInterval(S.timer);
    S.timer = setInterval(function () { S.ms = Date.now() - S.t0; el.timer.textContent = fmt(S.ms); }, 250);
    el.timer.textContent = '0:00';
  }

  function tile(cls, c, html) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'mt-tile ' + cls; b.dataset.id = c.id;
    if (html) b.innerHTML = html; else b.textContent = '';
    return b;
  }

  function round(n) {
    S.r = n; S.matched = {}; S.sel = null; say('');
    el.modeBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.setMode === S.mode)); });
    el.count.textContent = 'Round ' + (n + 1) + ' of ' + S.rounds.length;
    paintBoard();
  }

  function paintBoard() {
    var cards = S.rounds[S.r];
    var L = cards.map(function (c) { var b = tile('zh', c); b.textContent = c.hanzi; b.lang = 'zh-Hans'; b.dataset.side = 'l'; return b; });
    var R = shuffle(cards).map(function (c) {
      var b = tile('', c); b.dataset.side = 'r';
      if (S.mode === 'pinyin' && PY && PY.html) b.innerHTML = PY.html(c.pinyin); else b.textContent = answer(c);
      b.dataset.ans = answer(c);
      return b;
    });
    L.forEach(function (b) { b.dataset.ans = answer(cards.filter(function (c) { return c.id === b.dataset.id; })[0]); });
    el.left.replaceChildren.apply(el.left, L); el.right.replaceChildren.apply(el.right, R);
    S.sel = null;
  }

  function pick(b) {
    if (S.done || b.classList.contains('is-done')) return;
    if (!S.sel) { S.sel = b; b.classList.add('is-sel'); return; }
    if (S.sel === b) { b.classList.remove('is-sel'); S.sel = null; return; }
    if (S.sel.dataset.side === b.dataset.side) { S.sel.classList.remove('is-sel'); S.sel = b; b.classList.add('is-sel'); return; } // same column: switch pick
    var a = S.sel; S.sel = null; a.classList.remove('is-sel');
    if (a.dataset.ans === b.dataset.ans) { // equal answer text counts, so homophones never trap the player
      [a, b].forEach(function (t) { t.classList.add('is-done'); t.disabled = true; });
      S.pairs++; say('');
      if (el.board().querySelectorAll('.mt-tile:not(.is-done)').length === 0) roundDone();
    } else {
      S.misses++; el.misses.textContent = S.misses; say('Not a match — try again.', 'bad');
      [a, b].forEach(function (t) { t.classList.add('is-bad'); });
      setTimeout(function () { [a, b].forEach(function (t) { t.classList.remove('is-bad'); }); }, 350);
    }
  }
  el.board = function () { return root.querySelector('[data-board]'); };

  function roundDone() {
    if (S.r + 1 < S.rounds.length) { say('Round clear!', 'ok'); setTimeout(function () { if (!S.done) round(S.r + 1); }, 450); }
    else finish();
  }

  function finish() {
    S.done = true; clearInterval(S.timer); S.ms = Date.now() - S.t0;
    var sc = score(), res = null;
    try { if (store && store.recordMatch && S.key) res = store.recordMatch(S.key, sc, S.pairs, S.misses, S.ms); } catch (e) {}
    $('[data-stat=score] .stat-value').textContent = sc;
    $('[data-stat=time] .stat-value').textContent = fmt(S.ms);
    $('[data-stat=misses] .stat-value').textContent = S.misses;
    el.bestNote.textContent = res && res.isBest ? 'New best!' : res && res.best ? 'Best: ' + res.best.score + ' in ' + fmt(res.best.ms) : '';
    el.session.hidden = true; el.summary.hidden = false;
    var h = $('[data-summary] h2'); h.setAttribute('tabindex', '-1'); h.focus();
    try { window.dispatchEvent(new CustomEvent('hsk:practice-done', { detail: { kind: 'match', done: S.pairs, total: S.pairs, score: sc } })); } catch (e) {}
  }

  root.addEventListener('click', function (e) {
    var m = e.target.closest('[data-set-mode]');
    if (m) {
      if (m.dataset.setMode !== S.mode && !S.done) {
        S.mode = m.dataset.setMode;
        S.pairs -= el.board().querySelectorAll('.mt-tile.is-done').length / 2; // the round restarts, so its pairs are replayed
        round(S.r);
      }
      return;
    }
    var t = e.target.closest('.mt-tile');
    if (t) { pick(t); return; }
    if (e.target.closest('[data-action=again]')) newGame();
  });

  // ---- boot ----
  if (!root.hasAttribute('data-has-source')) {
    try {
      var ls = store.getLists();
      Object.keys(ls).forEach(function (id) {
        var a = document.createElement('a');
        a.className = 'chip'; a.href = '/practice/match?source=list&id=' + encodeURIComponent(id); a.textContent = ls[id].name;
        el.lists.appendChild(a);
      });
    } catch (e) {}
    return;
  }
  S.key = sourceKey();
  var p = deck();
  if (!p) return;
  msg('Loading words…');
  p.then(function (cards) {
    if (!build(cards)) throw new Error('This source needs at least ' + MIN_PAIRS + ' words with pinyin and a meaning.');
    el.msg.hidden = true; newGame();
  }).catch(function (e) { msg(e.message || 'Something went wrong.'); });
})();
