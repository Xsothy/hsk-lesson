/**
 * Lesson quiz (beta). One question at a time over the lesson's own words and sentences (JSON in #qz-data):
 * choose the meaning / word / pinyin, match pairs, build a sentence, listen, say it aloud, write a character.
 * - A wrong answer costs a heart (optional) and the question returns once at the end.
 * - "Can't listen / speak / write now" drops that kind of question for the rest of the session, no heart lost.
 * - Speaking uses the browser's speech recognition and is scored by sound (toneless pinyin from /data/sounds),
 *   not by which characters were recognised; tones cannot be judged this way.
 * - Results: HSK_STORE.recordQuiz('quiz/<slug>'), missed words are rated Again in the flashcards (srsRate),
 *   written characters are credited like the Write page (HSKCharacter.markWritten).
 * Needs store.js, character.js, fx.js, audio-service.js; styles in quiz.css.
 */
(function () {
  'use strict';
  var root = document.getElementById('qz'), raw = document.getElementById('qz-data'), go = document.getElementById('qz-go');
  if (!root || !raw || !go) return;
  var D = JSON.parse(raw.textContent), store = window.HSK_STORE, FX = window.HSK_FX || {}, HC = window.HSKCharacter;
  var $ = function (id) { return document.getElementById('qz-' + id); };
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function show(id) { ['start', 'play', 'done'].forEach(function (s) { $(s).hidden = s !== id; }); window.scrollTo(0, 0); }
  function setting(k, d) { try { var s = store.getSettings(); return s[k] === undefined ? d : s[k]; } catch (e) { return d; } }
  var ICON = {
    ok: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    no: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    say: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
    mic: '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>'
  };
  var S = null;

  // ---- what this browser can do ----
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var can = { listen: !!(window.HSK_AUDIO && (window.speechSynthesis || window.Audio)), speak: !!SR, write: !!(window.HanziWriter && HC && D.writable.length) };
  (function note() {
    var on = [], off = [];
    ['listen', 'speak', 'write'].forEach(function (k) { (can[k] ? on : off).push({ listen: 'listening', speak: 'speaking', write: 'writing' }[k]); });
    $('note').textContent = (on.length ? 'Included in this browser: ' + on.join(', ') + '. ' : '') + (off.length ? 'Not available here, so left out: ' + off.join(', ') + '.' : '');
  })();
  $('o-hearts').checked = setting('quizHearts', true) !== false;
  $('o-fx').checked = setting('quizFx', true) !== false;
  function chime(name) { if ($('o-fx').checked && FX.chime) FX.chime(name); }

  // ---- audio: the speaker button pulses from the click until the sound ends ----
  var busyBtn = null;
  function busy(btn) { if (busyBtn) busyBtn.classList.remove('is-busy'); busyBtn = btn || null; if (btn) btn.classList.add('is-busy'); }
  function say(text, btn) {
    if (!window.HSK_AUDIO || (S && S.muted)) return;
    busy(btn);
    var done = function () { if (busyBtn === btn) busy(null); };
    try { var p = window.HSK_AUDIO.speak(text); if (p && p.then) p.then(done, done); else done(); } catch (e) { done(); }
  }
  function sayBtn(text, small) {
    var b = el('button', 'qz-say' + (small ? ' is-small' : '')); b.type = 'button'; b.innerHTML = ICON.say; b.setAttribute('aria-label', 'Play audio');
    b.addEventListener('click', function () { say(text, b); });
    return b;
  }

  // ---- session ----
  var W = D.words.map(function (w) { return [w.hanzi, w.pinyin, w.english]; });
  function options(w, field) { // distractors from the same lesson, never repeating the shown value (他 / 她 share tā)
    var seen = {}; seen[w[field]] = 1;
    var others = shuffle(W).filter(function (x) { if (seen[x[field]]) return false; seen[x[field]] = 1; return true; }).slice(0, 3);
    return shuffle([w].concat(others)).map(function (x) { return { label: x[field], right: x[field] === w[field] }; });
  }
  function build() {
    var ws = shuffle(W), q = [], k = 0, next = function () { return ws[k++ % ws.length]; };
    var uniquePy = shuffle(W.filter(function (w) { return W.filter(function (x) { return x[1] === w[1]; }).length === 1; }));
    var ss = shuffle(D.sentences), writable = shuffle(W.filter(function (w) { return D.writable.indexOf(w[0]) >= 0; }));
    q.push({ type: 'meaning', w: next() }, { type: 'meaning', w: next() }, { type: 'hanzi', w: next() });
    q.push({ type: 'match', ws: shuffle(W).slice(0, 4) });
    if (uniquePy[0]) q.push({ type: 'pinyin', w: uniquePy[0] });
    q.push({ type: 'hanzi', w: next() });
    if (can.listen && uniquePy[1]) q.push({ type: 'listen', w: uniquePy[1] });
    if (ss[0]) q.push({ type: 'build', s: ss[0] });
    if (can.speak && ss.length) q.push({ type: 'speak', s: ss[2] || ss[0] });
    q.push({ type: 'meaning', w: next() });
    if (ss[1]) q.push({ type: 'build', s: ss[1] });
    if (can.write && writable[0]) q.push({ type: 'write', w: writable[0] });
    return q;
  }
  function start() {
    if (FX.chime && $('o-fx').checked) FX.chime(); // unlock sound from this click
    try { store.setSettings({ quizHearts: $('o-hearts').checked, quizFx: $('o-fx').checked }); } catch (e) {}
    var q = build();
    S = { queue: q, i: 0, goal: q.length, done: 0, hearts: 5, useHearts: $('o-hearts').checked, xp: 0, answers: 0, firstTry: 0, streak: 0,
      missed: {}, t0: Date.now(), state: 'answer', check: null, pick: null, muted: false, rec: null };
    show('play'); hud(); question();
  }
  function hud() {
    var p = Math.round(S.done * 100 / S.goal);
    $('bar-fill').style.width = p + '%'; $('bar').setAttribute('aria-valuenow', p);
    $('hearts').hidden = !S.useHearts; $('hearts-n').textContent = S.hearts;
  }
  var KIND = { meaning: 'Choose the meaning', hanzi: 'Choose the word', pinyin: 'Choose the pinyin', listen: 'Listen and choose', build: 'Build the sentence', match: 'Match the pairs', speak: 'Say it aloud', write: 'Write the character' };

  function question() {
    var q = S.queue[S.i], stage = $('stage'), box = el('div', 'qz-q');
    stopMic(); stage.textContent = '';
    S.state = 'answer'; S.check = null; S.pick = null;
    box.setAttribute('data-type', q.type);
    $('foot').className = 'qz-foot'; $('check').textContent = 'Check'; $('check').disabled = true;
    $('check').hidden = q.type === 'match' || q.type === 'speak' || q.type === 'write';
    var kind = el('div', 'qz-kind'); kind.appendChild(el('span', null, KIND[q.type]));
    if (q.retry) kind.appendChild(el('span', 'is-retry', 'Previous mistake'));
    box.appendChild(kind);
    ({ meaning: choiceQ, hanzi: choiceQ, pinyin: choiceQ, listen: choiceQ, build: buildQ, match: matchQ, speak: speakQ, write: writeQ })[q.type](q, box);
    stage.appendChild(box);
    if (S.mount) { var m = S.mount; S.mount = null; m(); } // work that needs the question to be in the page
  }

  // multiple choice (meaning / hanzi / pinyin / listen)
  function choiceQ(q, box) {
    var w = q.w, field = { meaning: 2, hanzi: 0, pinyin: 1, listen: 0 }[q.type], zhOpts = field === 0;
    box.appendChild(el('h2', null, { meaning: 'What does this mean?', hanzi: 'Which word means this?', pinyin: 'How is this pronounced?', listen: 'What did you hear?' }[q.type]));
    var p = el('div', 'qz-prompt');
    if (q.type === 'listen') { var sb = sayBtn(w[0]); p.appendChild(sb); p.appendChild(el('span', 'qz-en', 'Tap to listen again')); say(w[0], sb); }
    else if (q.type === 'hanzi') p.appendChild(el('span', 'qz-en', w[2]));
    else {
      var z = el('div', 'zh', w[0]), small = sayBtn(w[0], true); z.lang = 'zh-Hans'; p.appendChild(z); p.appendChild(small);
      if (q.type === 'meaning') say(w[0], small);
    }
    box.appendChild(p);
    var opts = options(w, field), wrap = el('div', 'qz-choices' + (zhOpts ? ' is-two' : '')), picked = null, btns = [];
    opts.forEach(function (o, i) {
      var b = el('button', 'qz-choice' + (zhOpts ? ' zh' : '')); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
      if (zhOpts) b.lang = 'zh-Hans';
      if (o.right) b.setAttribute('data-right', '1');
      var k = el('kbd', null, String(i + 1)); k.setAttribute('aria-hidden', 'true'); b.appendChild(k); b.appendChild(document.createTextNode(o.label));
      b.addEventListener('click', function () {
        if (S.state !== 'answer') return;
        picked = i; btns.forEach(function (x, n) { x.setAttribute('aria-pressed', String(n === i)); });
        $('check').disabled = false;
      });
      btns.push(b); wrap.appendChild(b);
    });
    box.appendChild(wrap);
    if (q.type === 'listen') box.appendChild(skipBtn("Can't listen now", 'listen'));
    S.pick = function (n) { if (btns[n]) btns[n].click(); };
    S.check = function () {
      var right = opts[picked].right;
      btns.forEach(function (b, n) { b.disabled = true; b.classList.add(opts[n].right ? 'is-ok' : n === picked ? 'is-no' : 'is-dim'); });
      if (q.type === 'hanzi' || q.type === 'pinyin') say(w[0]);
      result(right, w[0] + ' · ' + w[1] + ' · ' + w[2], w);
    };
  }

  // build the sentence from word tiles (two distractors from the lesson's words)
  function buildQ(q, box) {
    var target = q.s.tiles, extra = shuffle(W.map(function (w) { return w[0]; }).filter(function (h) { return target.indexOf(h) < 0; })).slice(0, 2);
    var tiles = shuffle(target.concat(extra)), order = [];
    box.appendChild(el('h2', null, 'Write this in Chinese'));
    var p = el('div', 'qz-prompt'); p.appendChild(el('span', 'qz-en', q.s.en)); box.appendChild(p);
    var ans = el('div', 'qz-answer'), bank = el('div', 'qz-bank'); ans.setAttribute('aria-label', 'Your answer');
    var bankBtns = tiles.map(function (t, i) {
      var b = el('button', 'qz-tile', t); b.type = 'button'; b.lang = 'zh-Hans';
      if (target.indexOf(t) >= 0) b.setAttribute('data-word', t);
      b.addEventListener('click', function () { if (S.state !== 'answer') return; order.push(i); paint(); });
      bank.appendChild(b); return b;
    });
    function paint() {
      ans.textContent = '';
      order.forEach(function (i, pos) {
        var b = el('button', 'qz-tile', tiles[i]); b.type = 'button'; b.lang = 'zh-Hans'; b.setAttribute('aria-label', 'Remove ' + tiles[i]);
        b.addEventListener('click', function () { if (S.state !== 'answer') return; order.splice(pos, 1); paint(); });
        ans.appendChild(b);
      });
      bankBtns.forEach(function (b, i) { b.classList.toggle('is-used', order.indexOf(i) >= 0); });
      $('check').disabled = !order.length;
    }
    box.appendChild(ans); box.appendChild(bank);
    S.check = function () {
      var right = order.map(function (i) { return tiles[i]; }).join('') === target.join('');
      ans.classList.add(right ? 'is-ok' : 'is-no');
      [].forEach.call(box.querySelectorAll('.qz-tile'), function (b) { b.disabled = true; });
      if (right) say(target.join(''));
      result(right, target.join(''), null);
    };
  }

  // match four pairs; a wrong pair costs a heart once per question
  function matchQ(q, box) {
    box.appendChild(el('h2', null, 'Tap the matching pairs'));
    var grid = el('div', 'qz-pairs'), left = shuffle(q.ws), right = shuffle(q.ws), sel = null, found = 0, slipped = false;
    function cell(w, side) {
      var b = el('button', 'qz-pair' + (side === 'zh' ? ' zh' : ''), side === 'zh' ? w[0] : w[2]); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
      b.setAttribute('data-pair', w[0]); b.setAttribute('data-side', side);
      if (side === 'zh') b.lang = 'zh-Hans';
      b.addEventListener('click', function () {
        if (b.classList.contains('is-ok')) return;
        if (!sel || sel.side === side) { if (sel) sel.b.setAttribute('aria-pressed', 'false'); sel = { b: b, w: w, side: side }; b.setAttribute('aria-pressed', 'true'); return; }
        var a = sel; sel = null; a.b.setAttribute('aria-pressed', 'false');
        if (a.w === w) {
          [a.b, b].forEach(function (x) { x.classList.add('is-ok'); x.disabled = true; });
          if (++found === q.ws.length) result(!slipped, slipped ? 'All pairs matched, with a slip along the way.' : '', null, true);
        } else {
          [a.b, b].forEach(function (x) { x.classList.remove('is-no'); void x.offsetWidth; x.classList.add('is-no'); setTimeout(function () { x.classList.remove('is-no'); }, 400); });
          if (!slipped) { slipped = true; loseHeart(); chime('no'); }
        }
      });
      return b;
    }
    for (var i = 0; i < left.length; i++) { grid.appendChild(cell(left[i], 'zh')); grid.appendChild(cell(right[i], 'en')); }
    box.appendChild(grid);
  }

  // "Can't listen / speak / write now": drop that kind of question for the rest of the session. No heart is lost.
  function skipBtn(label, type) {
    var b = el('button', 'qz-skip', label); b.type = 'button'; b.setAttribute('data-skip', type);
    b.addEventListener('click', function () { skipKind(type); });
    return b;
  }
  function skipKind(type) {
    if (!S || S.state !== 'answer') return;
    stopMic();
    if (type === 'listen') { S.muted = true; try { window.HSK_AUDIO.stop(); } catch (e) {} }
    var gone = 0;
    S.queue = S.queue.filter(function (q, ix) { if (ix < S.i || q.type !== type) return true; if (!q.retry) gone++; return false; });
    S.goal = Math.max(1, S.goal - gone);
    hud();
    if (S.i >= S.queue.length) finish(true); else question();
  }

  // ---- speaking, scored by sound ----
  // A different character with the same sound counts; a near sound (zh/z, ch/c, sh/s, -ng/-n) gets most of the credit.
  function loose(p) { return p.replace(/^zh/, 'z').replace(/^ch/, 'c').replace(/^sh/, 's').replace(/ng$/, 'n'); }
  function near(a, b) {
    var best = 0;
    a.forEach(function (x) { b.forEach(function (y) { best = Math.max(best, x === y ? 1 : loose(x) === loose(y) ? 0.7 : 0); }); });
    return best;
  }
  function scoreSpeech(h, t) { // h, t: lists of readings per character; best alignment of heard onto target
    var n = h.length, m = t.length, i, j, d = [];
    for (i = 0; i <= n; i++) d.push(new Array(m + 1).fill(0));
    for (i = 1; i <= n; i++) for (j = 1; j <= m; j++) d[i][j] = Math.max(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1] + near(h[i - 1], t[j - 1]));
    var per = new Array(m).fill(0); i = n; j = m;
    while (i > 0 && j > 0) {
      var s = near(h[i - 1], t[j - 1]);
      if (s > 0 && d[i][j] === d[i - 1][j - 1] + s) { per[j - 1] = s; i--; j--; } else if (d[i][j] === d[i - 1][j]) i--; else j--;
    }
    return { score: m ? d[n][m] / m : 0, per: per, heard: h.map(function (r) { return r[0]; }).join(' ') };
  }
  function stopMic() { try { if (S && S.rec) { var r = S.rec; S.rec = null; r.onend = r.onresult = r.onerror = null; r.abort(); } } catch (e) {} }
  var PASS = 0.6, TRIES = 3;
  function speakQ(q, box) {
    var target = q.s.tiles.join(''), judged = false, tries = 0, last = null, text = '';
    // q.s.sounds lines up with the characters; one with no known reading is left out of the score and stays uncoloured.
    var known = [], sounds = (q.s.sounds || []).filter(function (r, k) { if (r.length) known.push(k); return r.length; });
    box.appendChild(el('h2', null, 'Say this sentence'));
    var p = el('div', 'qz-prompt'), col = el('div'), z = el('div', 'zh'); z.lang = 'zh-Hans'; z.style.fontSize = '32px';
    var syl = Array.from(target).map(function (c) { var sp = el('span', 'qz-syl', c); z.appendChild(sp); return sp; });
    col.appendChild(z); col.appendChild(el('div', null, q.s.en)); p.appendChild(col); p.appendChild(sayBtn(target, true)); box.appendChild(p);
    var wrap = el('div', 'qz-speak'), mic = el('button', 'qz-mic'), heard = el('div', 'qz-heard'), score = el('div', 'qz-score'), status = el('p', 'qz-status', 'Tap the microphone, then read the sentence aloud.');
    mic.type = 'button'; mic.innerHTML = ICON.mic; mic.setAttribute('aria-label', 'Start speaking'); status.setAttribute('role', 'status');
    var move = el('button', 'qz-skip', 'Move on'); move.type = 'button'; move.hidden = true;
    move.addEventListener('click', function () { if (last) end(last); });
    function listening(on) { mic.classList.toggle('is-on', on); mic.setAttribute('aria-label', on ? 'Stop' : 'Start speaking'); }
    function end(r) {
      if (judged || S.state !== 'answer') return;
      judged = true; mic.disabled = true; move.hidden = true;
      var right = r.score >= PASS, pct = Math.round(r.score * 100);
      result(right, right ? target + ' · sounds ' + pct + '% right' : 'Sounded ' + pct + '% right. Listen once more and copy the rhythm.', null, true);
    }
    function judge(mine) {
      if (judged || !S || S.queue[S.i] !== q || S.state !== 'answer') return;
      if (!/\p{Script=Han}/u.test(text)) { status.textContent = 'Nothing was heard. Tap the microphone to try again.'; return; }
      status.textContent = 'Checking…';
      fetch(root.getAttribute('data-sounds-url') + '?text=' + encodeURIComponent(text)).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (d) {
        if (judged || !S || S.queue[S.i] !== q || mine !== tries) return;
        var r = scoreSpeech(d.sounds || [], sounds), pct = Math.round(r.score * 100);
        tries++; last = r; heard.textContent = r.heard;
        known.forEach(function (k, n) { if (syl[k]) syl[k].className = 'qz-syl is-' + (r.per[n] >= 1 ? 2 : r.per[n] > 0 ? 1 : 0); });
        score.textContent = pct + '%'; score.className = 'qz-score ' + (r.score >= PASS ? 'is-good' : 'is-bad');
        if (r.score >= PASS || tries >= TRIES) return end(r);
        chime('no');
        status.textContent = (r.score >= 0.3 ? 'Close. ' : 'Not there yet. ') + 'The red sounds were not heard. Tap to try again (' + (TRIES - tries) + ' left).'; move.hidden = false;
      }).catch(function () { status.textContent = 'Could not check that. Tap the microphone to try again.'; });
    }
    mic.addEventListener('click', function () {
      if (S.state !== 'answer' || judged) return;
      if (S.rec) { try { S.rec.stop(); } catch (e) {} return; }
      var rec, mine = tries;
      try { rec = new SR(); } catch (e) { return skipKind('speak'); }
      rec.lang = 'zh-CN'; rec.interimResults = true; rec.continuous = false; text = ''; heard.textContent = ''; score.textContent = '';
      rec.onresult = function (e) { text = [].map.call(e.results, function (r) { return r[0].transcript; }).join(''); heard.textContent = text; };
      rec.onerror = function (e) {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'language-not-supported') { S.rec = null; listening(false); can.speak = false; skipKind('speak'); }
      };
      rec.onend = function () { if (S && S.rec === rec) S.rec = null; listening(false); judge(mine); };
      try { rec.start(); S.rec = rec; listening(true); status.textContent = 'Listening… tap again when you have finished.'; } catch (e) { status.textContent = 'The microphone did not start. Tap it to try again.'; }
    });
    wrap.appendChild(mic); wrap.appendChild(score); wrap.appendChild(heard); wrap.appendChild(status); wrap.appendChild(move); box.appendChild(wrap);
    box.appendChild(skipBtn("Can't speak now", 'speak'));
  }

  // ---- writing: one character stroke by stroke (Hanzi Writer, stroke data from this site) ----
  function writeQ(q, box) {
    var w = q.w;
    box.appendChild(el('h2', null, 'Write this character'));
    var p = el('div', 'qz-prompt'), col = el('div'); col.appendChild(el('div', 'qz-en', w[2])); col.appendChild(el('div', 'qz-py', w[1]));
    p.appendChild(col); p.appendChild(sayBtn(w[0], true)); box.appendChild(p);
    var wrap = el('div', 'qz-write'), grid = el('div', 'qz-grid'), status = el('p', 'qz-status', 'Draw the first stroke inside the square.');
    grid.setAttribute('role', 'img'); grid.setAttribute('aria-label', 'Writing square'); grid.setAttribute('data-char', w[0]); status.setAttribute('role', 'status');
    wrap.appendChild(grid); wrap.appendChild(status); box.appendChild(wrap);
    box.appendChild(skipBtn("Can't write now", 'write'));
    S.mount = function () {
      var writer;
      try { writer = HC.createWriter(grid, w[0], { width: 236, height: 236, showCharacter: false, showOutline: false, drawingWidth: 20 }); } catch (e) { return skipKind('write'); }
      writer.quiz({ showHintAfterMisses: 2, highlightOnComplete: !(FX.reduced && FX.reduced()),
        onMistake: function () { status.textContent = 'Not that stroke. Try again; a hint shows after two misses.'; },
        onCorrectStroke: function (d) { status.textContent = d.strokesRemaining ? 'Stroke ' + (d.strokeNum + 2) + ' of ' + (d.strokeNum + 1 + d.strokesRemaining) + '.' : 'Done.'; },
        onComplete: function (sum) {
          if (!S || S.state !== 'answer' || S.queue[S.i] !== q) return;
          var right = sum.totalMistakes <= 3; grid.classList.add('is-ok');
          try { HC.markWritten(w[0]); } catch (e) {}
          result(right, w[0] + ' · ' + w[1] + ' · ' + w[2] + (right ? '' : ' (' + sum.totalMistakes + ' wrong strokes)'), w);
        } });
    };
  }

  function loseHeart() {
    if (!S.useHearts) return;
    S.hearts = Math.max(0, S.hearts - 1); hud();
    if (FX.shake) FX.shake($('hearts'));
  }

  // Show the verdict in the bottom sheet. A wrong question returns once more at the end of the session.
  function result(right, detail, word, heartAlreadyTaken) {
    var q = S.queue[S.i];
    S.state = 'feedback'; S.answers++;
    chime(right ? 'ok' : 'no');
    if (right) {
      S.done++; S.streak++;
      if (!q.retry) S.firstTry++;
      S.xp += q.retry ? 5 : 10;
      if (S.streak === 3 || S.streak === 5 || S.streak % 10 === 0) { S.xp += 5; if (FX.toast) FX.toast($('stage'), S.streak + ' in a row · +5 XP'); }
    } else {
      S.streak = 0;
      if (word) S.missed[word[0]] = word;
      if (!heartAlreadyTaken) loseHeart();
      // match: every pair was found, the slip only cost the heart. speak: a recogniser miss is not held against the learner.
      if (q.type === 'match' || q.type === 'speak') S.done++;
      else { var again = {}; for (var k in q) again[k] = q[k]; again.retry = true; S.queue.push(again); }
    }
    hud();
    $('foot').className = 'qz-foot ' + (right ? 'is-ok' : 'is-no');
    $('fb-ico').innerHTML = right ? ICON.ok : ICON.no;
    $('fb-title').textContent = right ? ['Correct!', 'Nice work!', 'That is right!'][S.answers % 3] : (q.type === 'match' ? 'Matched' : q.type === 'speak' ? 'Not quite what was heard' : 'Not quite');
    $('fb-text').textContent = right || q.type === 'match' || q.type === 'speak' ? detail : 'Answer: ' + detail;
    var c = $('check'); c.hidden = false; c.disabled = false; c.textContent = 'Continue'; c.focus({ preventScroll: true });
  }

  function advance() {
    if (S.useHearts && S.hearts === 0) return finish(false);
    S.i++;
    if (S.i >= S.queue.length) return finish(true);
    question();
  }
  $('check').addEventListener('click', function () {
    if (!S) return;
    if (S.state === 'answer' && S.check) S.check(); else if (S.state === 'feedback') advance();
  });
  document.addEventListener('keydown', function (e) {
    if (!S || $('play').hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key >= '1' && e.key <= '4' && S.state === 'answer' && S.pick) { e.preventDefault(); S.pick(+e.key - 1); }
    else if (e.key === 'Enter' && !e.target.closest('button,a') && !$('check').disabled && !$('check').hidden) { e.preventDefault(); $('check').click(); }
  });
  $('quit').addEventListener('click', function () { stopMic(); try { window.HSK_AUDIO.stop(); } catch (e) {} S = null; show('start'); });

  // ---- finish ----
  function fmt(ms) { var s = Math.round(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function finish(passed) {
    stopMic();
    var acc = Math.min(100, Math.round(S.firstTry * 100 / S.goal)), missed = Object.keys(S.missed).map(function (k) { return S.missed[k]; });
    $('done-eyebrow').textContent = passed ? 'Quiz complete' : 'Out of hearts';
    $('done-title').textContent = passed ? (acc === 100 ? 'Perfect quiz' : 'Well done') : 'Take another run at it';
    $('done-sub').textContent = D.title + (passed ? '' : '. You answered ' + S.done + ' of ' + S.goal + ' before the hearts ran out.');
    $('st-xp').textContent = S.xp; $('st-acc').textContent = acc + '%'; $('st-time').textContent = fmt(Date.now() - S.t0);
    try {
      if (passed) store.recordQuiz('quiz/' + D.slug, S.firstTry, S.goal);
      missed.forEach(function (w) { store.srsRate(w[0], 1); }); // missed words come up in the flashcards
    } catch (e) {}
    var m = $('missed'); m.textContent = ''; m.hidden = !missed.length;
    if (missed.length) {
      m.appendChild(el('h2', null, 'Words to review'));
      m.appendChild(el('p', null, 'These were added to your flashcards as due.'));
      missed.forEach(function (w) {
        var r = el('a'); r.href = '/search?q=' + encodeURIComponent(w[0]);
        var z = el('span', 'zh', w[0]); z.lang = 'zh-Hans'; r.appendChild(z); r.appendChild(el('i', null, w[1])); r.appendChild(el('span', null, w[2])); m.appendChild(r);
      });
    }
    show('done'); $('done-title').focus({ preventScroll: true });
    chime(passed ? 'done' : 'fail');
    if (passed && FX.confetti) FX.confetti(acc === 100 ? 70 : 40);
  }
  go.addEventListener('click', start);
  $('again').addEventListener('click', start);
})();
