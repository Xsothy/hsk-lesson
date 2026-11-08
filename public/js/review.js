/* D2 Review: flashcards with SRS. Needs store.js. Deck comes from /data/review-deck; scheduling is HSK_STORE.srs*. */
(function () {
  var S = window.HSK_STORE, root = document.getElementById('rv');
  if (!S || !root) return;
  var $ = function (id) { return document.getElementById(id); };
  var qs = new URLSearchParams(location.search);
  var MAX_IDS = 200;

  function show(id) { ['rv-choose', 'rv-study', 'rv-done', 'rv-empty', 'rv-error'].forEach(function (x) { $(x).hidden = x !== id; }); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function speak(t) { try { if (window.HSK_AUDIO) window.HSK_AUDIO.speak(t); } catch (e) {} }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function emptyMsg(text) {
    var e = $('rv-empty'); e.textContent = text + ' ';
    var a = el('a', null, 'Choose another deck'); a.href = '/review'; e.appendChild(a);
    show('rv-empty');
  }

  // Settings (keys documented in store.js): reviewFirst zh|en|audio, reviewPinyinFront, reviewAudioReveal.
  function opts() {
    var s = S.getSettings();
    return { first: ['zh', 'en', 'audio'].indexOf(s.reviewFirst) >= 0 ? s.reviewFirst : 'zh', pinyinFront: s.reviewPinyinFront === true, audioReveal: s.reviewAudioReveal !== false };
  }

  // ---- chooser ----
  function chooser() {
    var due = S.srsDueCount(), saved = S.getSaved().length;
    function fill(id, n, one) {
      var a = $(id); a.querySelector('.ar-sub').textContent = n ? plural(n, one) : 'None yet';
      if (!n) { a.setAttribute('aria-disabled', 'true'); a.addEventListener('click', function (e) { e.preventDefault(); }); }
    }
    fill('rv-due-link', due, 'card due');
    fill('rv-saved-link', saved, 'saved word');
    $('rv-summary').textContent = plural(due, 'card') + ' due now.';
    show('rv-choose');
  }

  // ---- deck ----
  function deckUrl() {
    var u = root.getAttribute('data-deck-url'), source = qs.get('source');
    if (qs.get('lesson')) return u + '?lesson=' + encodeURIComponent(qs.get('lesson'));
    if (qs.get('version') || qs.get('level')) {
      return u + '?version=' + encodeURIComponent(qs.get('version') || 2) + '&level=' + encodeURIComponent(qs.get('level') || 1) + (qs.get('set') ? '&set=' + encodeURIComponent(qs.get('set')) : '');
    }
    if (source === 'list') return 'list';
    if (source === 'due' || source === 'saved') {
      var ids = (source === 'due' ? S.srsDue() : S.getSaved()).slice(0, MAX_IDS);
      return ids.length ? u + '?source=' + source + '&words=' + encodeURIComponent(ids.join(',')) : null;
    }
    return undefined;
  }

  var queue, cards, idx, revealed, stats, total;

  function start(d) {
    cards = {}; d.cards.forEach(function (c) { cards[c.id] = c; });
    var q = S.srsQueue(d.cards.map(function (c) { return c.id; }));
    queue = qs.get('source') === 'due' ? q.due.slice() : q.due.concat(q.fresh);
    if (!queue.length) {
      return emptyMsg('Nothing due in “' + d.title + '”. ' + (q.newTotal ? plural(q.newTotal, 'new card') + ' held back by your daily limit.' : 'Come back later.'));
    }
    $('rv-title').textContent = d.title;
    idx = 0; total = queue.length; stats = { 1: 0, 2: 0, 3: 0, 4: 0 };
    show('rv-study'); card();
  }

  function audioBtn(text) {
    var b = el('button', 'rv-audio', ''); b.type = 'button';
    b.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>'; b.setAttribute('aria-label', 'Play audio');
    b.addEventListener('click', function (e) { e.stopPropagation(); speak(text); });
    return b;
  }

  function card() {
    var c = cards[queue[idx]], o = opts(), f = $('rv-front'), b = $('rv-back');
    revealed = false; f.textContent = ''; b.textContent = '';
    var hanzi = function () { return el('div', 'rv-hanzi zh', c.hanzi); };
    var pinyin = function () { return c.pinyin ? el('div', 'rv-pinyin', c.pinyin) : null; };
    var english = function () { return el('div', 'rv-en', c.english || '—'); };
    function add(parent, n) { if (n) parent.appendChild(n); }

    if (o.first === 'zh') add(f, hanzi()); else if (o.first === 'en') add(f, english()); else add(f, audioBtn(c.hanzi));
    if (o.pinyinFront) add(f, pinyin());

    if (o.first !== 'zh') add(b, hanzi());
    if (!o.pinyinFront) add(b, pinyin());
    if (o.first !== 'en') add(b, english());
    if (o.first !== 'audio') add(b, audioBtn(c.hanzi));

    b.hidden = true; $('rv-rate').hidden = true; $('rv-reveal').hidden = false;
    progress();
    if (o.first === 'audio') speak(c.hanzi);
    $('rv-reveal').focus({ preventScroll: true });
  }

  function progress() {
    var p = Math.round(Math.min(idx, total) * 100 / total);
    $('rv-count').textContent = Math.min(idx + 1, total) + ' / ' + total;
    document.querySelector('.rv-bar').setAttribute('aria-valuenow', p);
    $('rv-bar-fill').style.width = p + '%';
  }

  function reveal() {
    if (revealed) return;
    revealed = true;
    var id = queue[idx], pv = S.srsPreview(id), o = opts();
    for (var r = 1; r <= 4; r++) document.querySelector('[data-next="' + r + '"]').textContent = pv[r].label;
    $('rv-back').hidden = false; $('rv-rate').hidden = false; $('rv-reveal').hidden = true;
    if (o.audioReveal && o.first !== 'audio') speak(cards[id].hanzi);
    document.querySelector('.rv-good').focus({ preventScroll: true });
  }

  function rate(r) {
    if (!revealed) return;
    var id = queue[idx];
    S.srsRate(id, r); stats[r]++;
    if (r === 1) { queue.push(id); total = queue.length; } // Again: see it once more at the end of this session
    idx++;
    if (idx >= queue.length) return done();
    card();
  }

  function done() {
    var reviewed = stats[1] + stats[2] + stats[3] + stats[4], box = $('rv-stats');
    box.textContent = '';
    [['Reviewed', reviewed, 'green'], ['Again', stats[1], 'red'], ['Good / Easy', stats[3] + stats[4], 'gold']].forEach(function (x) {
      var d = el('div', 'stat-card stat-' + x[2]); d.appendChild(el('div', 'stat-value', x[1])); d.appendChild(el('div', 'stat-label', x[0])); box.appendChild(d);
    });
    var left = S.srsDueCount();
    $('rv-done-note').textContent = left ? plural(left, 'card') + ' due now across all decks.' : 'All caught up. Nothing due right now.';
    $('rv-again-link').hidden = !left;
    document.querySelector('.rv-bar').setAttribute('aria-valuenow', 100);
    show('rv-done');
  }

  $('rv-reveal').addEventListener('click', reveal);
  [].forEach.call(document.querySelectorAll('[data-rating]'), function (b) { b.addEventListener('click', function () { rate(+b.getAttribute('data-rating')); }); });
  $('rv-card').addEventListener('click', function (e) { if (!revealed && !e.target.closest('button')) reveal(); });
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || $('rv-study').hidden) return;
    if (e.key >= '1' && e.key <= '4') { if (revealed) { e.preventDefault(); rate(+e.key); } }
    else if (e.key === ' ' && !e.target.closest('button')) { e.preventDefault(); reveal(); }
  });

  // ---- boot ----
  var url = deckUrl();
  if (url === undefined) return chooser();
  if (url === null) return emptyMsg(qs.get('source') === 'due' ? 'No cards due right now.' : 'You have no saved words yet. Save words from a character page.');
  if (url === 'list') { // F1: the deck is the user's own textbook list, read from the store (no server round trip)
    var lst = S.getList(qs.get('id'));
    if (!lst || !lst.words.length) return emptyMsg('That list was not found.');
    return start({ title: lst.name, cards: lst.words.slice(0, 300).map(function (w) { return { id: w.h, hanzi: w.h, pinyin: w.p, english: w.e }; }) });
  }
  fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
    if (!d.cards || !d.cards.length) return emptyMsg('This deck has no cards.');
    start(d);
  }).catch(function () { show('rv-error'); });
})();
