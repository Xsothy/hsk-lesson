/**
 * F4 · Pinyin match (canvas board "Match"). A board of up to 8 pinyin slots and a tray of character stickers:
 * tap a sticker, then the slot with its pinyin. A wrong slot counts as a miss. "New board" deals the next words.
 * Deck: /data/review-deck (lesson | HSK level/set | saved words) or a textbook list from the store (F1, hsk.v1.lists).
 * When every word of the source has been placed, the session is scored (pairs*10 - misses*2, min 0) and the best per source
 * is kept by HSK_STORE.recordMatch (synced by S2).
 */
(function () {
  'use strict';
  var root = document.querySelector('[data-match]');
  if (!root) return;
  var $ = function (s) { return root.querySelector(s); };
  var store = window.HSK_STORE, PY = window.HSK_PINYIN;
  var qs = { get: function (k) { return root.getAttribute('data-q-' + k); } }; // the server fills in the default source
  var BOARD = 8, MAX_WORDS = 40, MIN_PAIRS = 3;
  var el = {
    msg: $('[data-msg]'), board: $('[data-board]'), session: $('[data-session]'), tray: $('[data-tray]'),
    score: $('[data-score]'), status: $('[data-feedback]'), lists: $('[data-lists]'),
  };
  var S = { key: '', cards: [], b: 0, boards: [], placed: {}, sel: null, wrong: null, misses: 0, pairs: 0, t0: 0, done: false };

  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function fmt(ms) { var s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function msg(t) { el.msg.textContent = t; el.msg.hidden = false; }
  function say(t, bad) { el.status.textContent = t; el.status.classList.toggle('is-bad', !!bad); }
  function score() { return Math.max(0, S.pairs * 10 - S.misses * 2); }

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

  // ---- boards ----
  function build(cards) {
    var seen = {}, py = {};
    // Every card needs a character and pinyin; each hanzi shows once, and one board never holds two words with the same pinyin.
    S.cards = shuffle(cards.filter(function (c) {
      if (!c || !c.hanzi || !c.pinyin || seen[c.hanzi]) return false;
      seen[c.hanzi] = 1; return true;
    })).slice(0, MAX_WORDS);
    if (S.cards.length < MIN_PAIRS) return false;
    S.boards = [];
    S.cards.forEach(function (c) {
      var k = c.pinyin.toLowerCase(), b = S.boards.filter(function (x) { return x.length < BOARD && !x.some(function (y) { return y.pinyin.toLowerCase() === k; }); })[0];
      if (!b) { b = []; S.boards.push(b); }
      b.push(c); void py;
    });
    if (S.boards.length > 1 && S.boards[S.boards.length - 1].length < MIN_PAIRS) { // fold a tiny last board into the others
      var tail = S.boards.pop();
      tail.forEach(function (c) { var b = S.boards.filter(function (x) { return !x.some(function (y) { return y.pinyin.toLowerCase() === c.pinyin.toLowerCase(); }); })[0]; if (b) b.push(c); });
    }
    return true;
  }

  function startSession() {
    S.b = 0; S.misses = 0; S.pairs = 0; S.done = false; S.t0 = Date.now();
    deal(0);
  }

  function deal(n) {
    S.b = n; S.placed = {}; S.sel = null; S.wrong = null;
    S.slots = shuffle(S.boards[n]); S.trayOrder = shuffle(S.boards[n]);
    el.board.hidden = false; el.session.hidden = false;
    say('Pick a sticker.');
    paint();
  }

  function paint() {
    var cards = S.slots, total = cards.length, placedN = Object.keys(S.placed).length;
    el.score.textContent = placedN + ' / ' + total;
    el.board.replaceChildren.apply(el.board, cards.map(function (c, i) {
      var b = document.createElement('button'), got = S.placed[i];
      b.type = 'button'; b.className = 'mt-slot' + (got ? ' is-done' : '') + (S.wrong === i ? ' is-bad' : '');
      b.dataset.slot = i;
      var zh = document.createElement('span'); zh.className = 'mt-slot-c'; zh.lang = 'zh-Hans'; zh.textContent = got || '';
      var p = document.createElement('span'); p.className = 'mt-slot-p';
      if (PY && PY.html) p.innerHTML = PY.html(c.pinyin); else p.textContent = c.pinyin;
      b.appendChild(zh); b.appendChild(p);
      b.setAttribute('aria-label', (got ? got + ' placed on ' : 'Slot ') + c.pinyin);
      if (got) b.setAttribute('aria-disabled', 'true');
      return b;
    }));
    var used = {}; Object.keys(S.placed).forEach(function (k) { used[S.placed[k]] = 1; });
    el.tray.replaceChildren.apply(el.tray, S.trayOrder.filter(function (c) { return !used[c.hanzi]; }).map(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'mt-sticker' + (S.sel === c.hanzi ? ' is-sel' : '');
      b.lang = 'zh-Hans'; b.textContent = c.hanzi; b.dataset.hanzi = c.hanzi;
      b.setAttribute('aria-label', 'Pick ' + c.hanzi); b.setAttribute('aria-pressed', String(S.sel === c.hanzi));
      return b;
    }));
  }

  function pickSticker(h) {
    if (S.done) return;
    S.sel = S.sel === h ? null : h; S.wrong = null;
    paint();
    say(S.sel ? 'Now tap the pinyin for ' + S.sel + '.' : 'Pick a sticker.');
    var s = S.sel && el.tray.querySelector('[data-hanzi="' + S.sel + '"]'); if (s) s.focus();
  }

  function drop(i) {
    if (!S.sel || S.placed[i] || S.done) return;
    var c = S.slots[i], selCard = S.slots.filter(function (x) { return x.hanzi === S.sel; })[0];
    if (c.hanzi === S.sel || (selCard && selCard.pinyin.toLowerCase() === c.pinyin.toLowerCase())) {
      S.placed[i] = S.sel; S.sel = null; S.wrong = null; S.pairs++;
      paint();
      if (Object.keys(S.placed).length === S.slots.length) boardDone(); else say('Pick a sticker.');
      var nx = el.tray.querySelector('.mt-sticker'); if (nx) nx.focus();
    } else {
      S.misses++; S.wrong = i;
      paint(); say('Not that one — try another slot.', true);
      el.board.querySelector('[data-slot="' + i + '"]').focus();
    }
  }

  function boardDone() {
    if (S.b + 1 < S.boards.length) { say('Board complete! Tap New board for the next ' + S.boards[S.b + 1].length + ' words.'); return; }
    S.done = true;
    var ms = Date.now() - S.t0, sc = score(), res = null;
    try { if (store && store.recordMatch && S.key) res = store.recordMatch(S.key, sc, S.pairs, S.misses, ms); } catch (e) {}
    var best = res && res.isBest ? ' New best!' : res && res.best ? ' Best: ' + res.best.score + ' in ' + fmt(res.best.ms) + '.' : '';
    say('Board complete! All ' + S.pairs + ' words in ' + fmt(ms) + ' with ' + S.misses + (S.misses === 1 ? ' miss' : ' misses') + ' · score ' + sc + '.' + best);
    try { window.dispatchEvent(new CustomEvent('hsk:practice-done', { detail: { kind: 'match', done: S.pairs, total: S.pairs, score: sc } })); } catch (e) {}
  }

  root.addEventListener('click', function (e) {
    var t = e.target.closest('.mt-sticker');
    if (t) { pickSticker(t.dataset.hanzi); return; }
    var s = e.target.closest('.mt-slot');
    if (s) { drop(+s.dataset.slot); return; }
    if (e.target.closest('[data-action=new]') && S.boards.length) {
      if (S.done) { S.cards = shuffle(S.cards); build(S.cards); startSession(); }
      else deal(Object.keys(S.placed).length === S.slots.length ? (S.b + 1) % S.boards.length : S.b); // a half-done board is re-dealt
    }
  });
  root.addEventListener('change', function (e) { if (e.target.matches('[data-more]') && e.target.value) location.href = e.target.value; });

  // ---- boot ----
  try { // the user's own lists (F1) as extra sources
    var ls = store.getLists();
    Object.keys(ls).forEach(function (id) {
      var a = document.createElement('a');
      a.className = 'mt-src'; a.href = '/practice/match?source=list&id=' + encodeURIComponent(id); a.textContent = ls[id].name;
      a.setAttribute('role', 'button'); a.setAttribute('aria-pressed', String(qs.get('source') === 'list' && qs.get('id') === id));
      el.lists.appendChild(a);
    });
    if (qs.get('source') === 'list' && ls[qs.get('id')]) $('[data-source-label]').textContent = ls[qs.get('id')].name;
  } catch (e) {}
  S.key = sourceKey();
  var p = deck();
  if (!p) return;
  msg('Loading words…');
  p.then(function (cards) {
    if (!build(cards)) throw new Error('This source needs at least ' + MIN_PAIRS + ' words with pinyin.');
    el.msg.hidden = true; startSession();
  }).catch(function (e) { msg(e.message || 'Something went wrong.'); });
})();
