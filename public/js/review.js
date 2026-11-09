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
    var due = S.srsDueCount();
    $('rv-summary').textContent = (due ? plural(due, 'card') + ' due now. ' : 'Nothing due right now. ') + 'Pick a deck to start.';
    $('rv-start').hidden = !due;
    $('rv-start').textContent = 'Review ' + plural(due, 'card') + ' due';
    show('rv-choose');
  }

  // ---- aside: decks + settings ----
  function decks() {
    var dueIds = S.srsDue(), dueSet = {}, saved = S.getSaved();
    dueIds.forEach(function (id) { dueSet[id] = 1; });
    function dueBadge(node, n) { node.textContent = String(n); node.classList.toggle('is-zero', !n); }
    dueBadge(document.querySelector('[data-due=due]'), dueIds.length);
    dueBadge(document.querySelector('[data-due=saved]'), saved.filter(function (w) { return dueSet[w]; }).length);
    document.querySelector('[data-size=saved]').textContent = plural(saved.length, 'word');
    [].forEach.call(document.querySelectorAll('[data-due-lesson]'), function (b) {
      var ws = (b.parentNode.getAttribute('data-words') || '').split(',').filter(Boolean);
      dueBadge(b, ws.filter(function (w) { return dueSet[w]; }).length);
    });
    // The user's own lists (F1) are decks too.
    var more = document.querySelector('.rv-more'), ls = {};
    try { ls = S.getLists(); } catch (e) {}
    Object.keys(ls).forEach(function (id) {
      var a = el('a', 'rv-deck'); a.href = '/review?source=list&id=' + encodeURIComponent(id); a.setAttribute('data-deck', 'list-' + id);
      var t = el('span', 'rv-deck-t'); t.appendChild(el('b', null, ls[id].name)); t.appendChild(el('span', null, plural(ls[id].words.length, 'word')));
      a.appendChild(t); a.appendChild(el('span', 'rv-due', ''));
      more.insertBefore(a, more.querySelector('summary').nextSibling);
    });
    // Highlight the open deck.
    var key = qs.get('lesson') || (qs.get('version') ? 'hsk' + qs.get('version') + '-' + (qs.get('level') || 1) : qs.get('source') === 'list' ? 'list-' + qs.get('id') : qs.get('source'));
    var cur = key && document.querySelector('[data-deck="' + key + '"]');
    if (cur) { cur.setAttribute('aria-current', 'page'); var d = cur.closest('details'); if (d) d.open = true; }
  }
  function settingsPanel() {
    var o = opts(), s = S.getSettings();
    [].forEach.call(document.querySelectorAll('[data-first]'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-first') === o.first)); });
    $('rv-pyfront').checked = o.pinyinFront; $('rv-audio-reveal').checked = o.audioReveal;
    var n = Number(s.newPerDay) || 20, sel = $('rv-newday');
    if (![].some.call(sel.options, function (op) { return +op.value === n; })) sel.appendChild(new Option(String(n), String(n)));
    sel.value = String(n);
  }
  function changed(patch) {
    S.setSettings(patch); settingsPanel();
    if (!$('rv-study').hidden && !revealed) card(); // re-draw the front with the new setting
  }
  document.querySelector('.rv-side').addEventListener('click', function (e) {
    var b = e.target.closest('[data-first]');
    if (b) changed({ reviewFirst: b.getAttribute('data-first') });
  });
  $('rv-pyfront').addEventListener('change', function () { changed({ reviewPinyinFront: this.checked }); });
  $('rv-audio-reveal').addEventListener('change', function () { changed({ reviewAudioReveal: this.checked }); });
  $('rv-newday').addEventListener('change', function () { changed({ newPerDay: +this.value }); });
  $('rv-new-deck').addEventListener('click', function () {
    var saved = S.getSaved();
    if (!saved.length) { $('rv-new-msg').textContent = 'Save some words first: open a character and tap Save word.'; return; }
    var name = 'Saved words · ' + new Date().toLocaleDateString('en', { month: 'short', day: 'numeric' });
    var id = S.saveList(name, saved.map(function (w) { return { h: w }; }));
    location.href = '/review?source=list&id=' + encodeURIComponent(id);
  });
  decks(); settingsPanel();

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

  var queue, cards, idx, revealed, stats, total, deckTitle = '';

  function start(d) {
    cards = {}; d.cards.forEach(function (c) { cards[c.id] = c; });
    var q = S.srsQueue(d.cards.map(function (c) { return c.id; }));
    queue = qs.get('source') === 'due' ? q.due.slice() : q.due.concat(q.fresh);
    if (!queue.length) {
      return emptyMsg('Nothing due in “' + d.title + '”. ' + (q.newTotal ? plural(q.newTotal, 'new card') + ' held back by your daily limit.' : 'Come back later.'));
    }
    $('rv-title').textContent = d.title; deckTitle = d.title;
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
    $('rv-tag').textContent = (S.srsGet(c.id) ? 'REVIEW' : 'NEW CARD') + ' · ' + deckTitle.toUpperCase();
    $('rv-hint').hidden = false;
    var han = Array.from(c.hanzi).filter(function (ch) { return /\p{Script=Han}/u.test(ch); });
    $('rv-strokes').hidden = !han.length; $('rv-write').hidden = !han.length;
    if (han.length) {
      $('rv-strokes').href = '/char/' + encodeURIComponent(han[0]); $('rv-strokes').textContent = 'Strokes for ' + c.hanzi;
      $('rv-write').href = '/practice?words=' + encodeURIComponent(han.join(''));
    }
    var hanzi = function () { return el('div', 'rv-hanzi zh', c.hanzi); };
    var pinyin = function () {
      if (!c.pinyin) return null;
      var n = el('div', 'rv-pinyin');
      if (window.HSK_PINYIN && window.HSK_PINYIN.html) n.innerHTML = window.HSK_PINYIN.html(c.pinyin); else n.textContent = c.pinyin;
      return n;
    };
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
    $('rv-count').textContent = Math.min(idx + 1, total) + ' of ' + total + (qs.get('source') === 'due' ? ' due' : '');
    document.querySelector('.rv-bar').setAttribute('aria-valuenow', p);
    $('rv-bar-fill').style.width = p + '%';
  }

  function reveal() {
    if (revealed) return;
    revealed = true;
    var id = queue[idx], pv = S.srsPreview(id), o = opts();
    for (var r = 1; r <= 4; r++) document.querySelector('[data-next="' + r + '"]').textContent = pv[r].label;
    $('rv-back').hidden = false; $('rv-rate').hidden = false; $('rv-reveal').hidden = true; $('rv-hint').hidden = true;
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
