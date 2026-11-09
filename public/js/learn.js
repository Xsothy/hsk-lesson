/* Learn pages: progress bars, word status dots, Home "Today", lesson section nav, Courses level panels. Needs store.js. */
(function () {
  var S = window.HSK_STORE;
  if (!S) return;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function parse(s, d) { try { var v = JSON.parse(s); return v == null ? d : v; } catch (e) { return d; } }
  function known(words) { var k = 0; words.forEach(function (w) { if (S.isKnown(w)) k++; }); return k; }
  function pct(words) { return words.length ? Math.round(known(words) * 100 / words.length) : 0; }
  function label(p) { return p === 100 ? 'Done' : (p ? p + '%' : 'Start'); }
  function setBar(card, p) {
    var bar = $('.lc-bar, .set-bar, [role=progressbar]', card);
    if (!bar) return;
    bar.setAttribute('aria-valuenow', p);
    var i = $('i', bar); if (i) i.style.width = p + '%';
    var lbl = $('.lc-pct', card); if (lbl) lbl.textContent = label(p);
    card.classList.toggle('is-done', p === 100);
  }
  function hskVersion() { return document.documentElement.getAttribute('data-hsk') === '3' ? 3 : 2; }
  var setsCache = {};
  function sets(v, l) {
    var k = v + '/' + l;
    if (!setsCache[k]) setsCache[k] = fetch('/data/hsk/' + k + '/sets').then(function (r) { if (!r.ok) throw 0; return r.json(); });
    return setsCache[k];
  }
  window.HSK_LEARN = { known: known, pct: pct, label: label, setBar: setBar, sets: sets, hskVersion: hskVersion };

  // Lesson cards (Home, Courses)
  $$('.lesson-card[data-words]').forEach(function (c) { setBar(c, pct(parse(c.getAttribute('data-words'), []))); });

  // ---- Home ----
  var cont = document.getElementById('continue');
  if (cont) {
    var lessons = parse(cont.getAttribute('data-lessons'), {});
    var last = S.getLast(), names = { vocab: 'Vocabulary', grammar: 'Grammar', sentences: 'Sentences', dialogue: 'Dialogue', reading: 'Reading', practice: 'Practice' };
    var slug = last && lessons[last.slug] ? last.slug : Object.keys(lessons)[0];
    var L = slug && lessons[slug];
    if (L) {
      var p = pct(L.words || []);
      if (last && lessons[last.slug]) {
        cont.href = cont.getAttribute('data-default').replace(/[^/]+$/, encodeURIComponent(slug)) + (last.section ? '#' + last.section : '');
        $('#continue-eyebrow').textContent = 'CONTINUE · LESSON ' + L.n + ' OF ' + L.of;
        $('#continue-title').textContent = L.zh || L.en;
        $('#continue-glyph').textContent = (String(L.zh || '').match(/\p{Script=Han}/u) || ['学'])[0];
        $('#continue-sub').textContent = L.en + ' · next: ' + (names[last.section] || 'Vocabulary');
        $('#continue-btn').textContent = 'Continue lesson';
      }
      $('#continue-bar').style.width = p + '%';
      $('#continue-bar').parentNode.setAttribute('aria-valuenow', p);
    }
  }
  var due = $('[data-today=due]');
  if (due) {
    var n = S.srsDueCount();
    $('.ar-icon', due).textContent = n;
    $('.ar-sub', due).textContent = '≈ ' + Math.max(n ? 1 : 0, Math.ceil(n / 3)) + ' minutes';
    var goal = S.getSettings().dailyGoal || 10, today = new Date().toDateString(), chars = S.getProgress().chars, w = 0;
    Object.keys(chars).forEach(function (c) { if (chars[c].at && new Date(chars[c].at).toDateString() === today) w++; });
    var ch = $('[data-today=chars]');
    $('.ar-icon', ch).textContent = w;
    $('.ar-title', ch).textContent = 'Characters written · ' + w + '/' + goal;
  }
  // "HSK 2.0 · 4 of 24 done"
  $$('[data-course-done]').forEach(function (el) {
    var c = el.getAttribute('data-course-done'), cards = $$('.lesson-card[data-course="' + c + '"]');
    var d = cards.filter(function (x) { return x.classList.contains('is-done'); }).length;
    el.textContent = 'HSK ' + c + ' · ' + d + ' of ' + cards.length + ' done';
  });
  // HSK path: known words per level (current HSK version only)
  var path = $$('.path-card[data-level]');
  if (path.length) {
    var v = hskVersion();
    path.filter(function (a) { return +a.getAttribute('data-version') === v; }).forEach(function (a) {
      sets(v, a.getAttribute('data-level')).then(function (j) {
        var all = []; j.sets.forEach(function (s) { all = all.concat(s.words); });
        var k = known(all);
        $('[data-known]', a).textContent = k;
        setBar(a, all.length ? Math.round(k * 100 / all.length) : 0);
      }).catch(function () {});
    });
  }

  // ---- Lesson ----
  function paintTiles() {
    $$('.char-tile[data-word]').forEach(function (t) {
      var w = t.getAttribute('data-word'), dot = $('.dot', t);
      if (!dot) return;
      var st = S.isKnown(w) ? 'known' : (S.srsGet(w) || S.isSaved(w)) ? 'learning' : 'new';
      dot.className = 'dot dot-' + st;
      dot.setAttribute('aria-label', { known: 'Known', learning: 'Learning', 'new': 'New' }[st]);
    });
    var words = $$('.char-tile[data-word]').map(function (t) { return t.getAttribute('data-word'); });
    var done = $('[data-lesson-done]');
    if (done) done.textContent = pct(words) + '% done';
  }
  paintTiles();
  var markAll = document.getElementById('mark-all');
  if (markAll) {
    var words = $$('.char-tile[data-word]').map(function (t) { return t.getAttribute('data-word'); });
    var sync = function () { markAll.textContent = words.length && words.every(S.isKnown) ? 'Unmark all' : 'Mark all known'; };
    sync();
    markAll.addEventListener('click', function () {
      var on = !words.every(S.isKnown);
      words.forEach(function (w) { S.markKnown(w, on); });
      paintTiles(); sync();
    });
    var vs = document.getElementById('vocab');
    if (vs) S.setLast(vs.getAttribute('data-lesson'), 'vocab');
  }
  var dueEl = $('[data-lesson-due]');
  if (dueEl) {
    var dw = parse(dueEl.getAttribute('data-lesson-due'), []), now = Date.now();
    var dn = dw.filter(function (w) { var c = S.srsGet(w); return c && c.due <= now; }).length;
    $('.ar-sub', dueEl).textContent = dn + ' due today';
  }
  // Section nav: highlight the section in view and remember it for "Continue"
  var nav = $('.secnav');
  if (nav && 'IntersectionObserver' in window) {
    var links = $$('a[href^="#"]', nav), lessonSlug = nav.getAttribute('data-lesson');
    var current = function (id) {
      links.forEach(function (a) {
        var on = a.getAttribute('href') === '#' + id;
        a.classList.toggle('is-now', on);
        if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
      });
      if (lessonSlug && id) S.setLast(lessonSlug, id);
    };
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) current(e.target.id); });
    }, { rootMargin: '-30% 0px -60% 0px' });
    links.forEach(function (a) { var t = document.getElementById(a.getAttribute('href').slice(1)); if (t) io.observe(t); });
  }
  // ---- Courses: level picker, rings, row status, lazy HSK study sets ----
  function ring(btn, p) { var r = $('.cr-ring', btn); if (!r) return; r.style.setProperty('--p', Math.round(p * 3.6) + 'deg'); $('span', r).textContent = p + '%'; }
  function rowState(row, p) {
    row.classList.toggle('is-done', p === 100); row.classList.toggle('is-part', p > 0 && p < 100);
    var t = $('.cr-tag', row); if (t) t.textContent = label(p);
  }
  $$('.lesson-row[data-words]').forEach(function (r) { rowState(r, pct(parse(r.getAttribute('data-words'), []))); });
  $$('[data-known-words]').forEach(function (b) { b.textContent = known(parse(b.getAttribute('data-known-words'), [])); });
  function loadPanel(panel) {
    var v = panel.getAttribute('data-version'), l = panel.getAttribute('data-level'), box = $('.sets', panel);
    if (!v || !box || panel.getAttribute('data-loaded')) return;
    panel.setAttribute('data-loaded', '1');
    sets(v, l).then(function (j) {
      box.innerHTML = '';
      j.sets.forEach(function (s) {
        var a = document.createElement('a'), from = (s.set - 1) * j.set_size + 1;
        a.className = 'cr-row set-row';
        a.href = '/browse?version=' + v + '&level=' + l + '&set=' + s.set;
        a.innerHTML = '<span class="cr-num"></span><span class="cr-rt"><b class="zh" lang="zh-Hans"></b><span></span></span><span class="cr-count"></span><span class="cr-tag"></span>';
        $('.cr-num', a).textContent = s.set;
        $('.cr-rt b', a).textContent = s.words.slice(0, 5).join(' · ');
        $('.cr-rt span', a).textContent = 'Study set ' + s.set + ' · words ' + from + '–' + (from + s.count - 1);
        $('.cr-count', a).textContent = s.count + ' words';
        rowState(a, pct(s.words));
        box.appendChild(a);
      });
    }).catch(function () { panel.removeAttribute('data-loaded'); box.textContent = 'Could not load sets. Try again.'; });
  }
  $$('[data-levels]').forEach(function (wrap) {
    var btns = $$('.cr-lvb', wrap), panels = $$('.cr-panel', wrap);
    btns.forEach(function (b) {
      var w = b.getAttribute('data-words');
      if (w) ring(b, pct(parse(w, [])));
      b.addEventListener('click', function () {
        var i = b.getAttribute('data-lv');
        btns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        panels.forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== i; if (!p.hidden) loadPanel(p); });
      });
    });
    if (panels[0] && wrap.offsetParent !== null) loadPanel(panels[0]);
  });
  // HSK levels tab: rings + known total for the selected HSK version
  $$('[data-hsk-known]').forEach(function (el) {
    var v = +el.getAttribute('data-hsk-known'); if (v !== hskVersion()) return;
    var total = 0;
    $$('.cr-lvb[data-version="' + v + '"]').forEach(function (b) {
      sets(v, b.getAttribute('data-level')).then(function (j) {
        var all = []; j.sets.forEach(function (s) { all = all.concat(s.words); });
        var k = known(all); total += k; el.textContent = total.toLocaleString();
        ring(b, all.length ? Math.round(k * 100 / all.length) : 0);
      }).catch(function () {});
    });
  });

  // Play all: speak each line in order
  $$('[data-play-all]').forEach(function (b) {
    b.addEventListener('click', function () {
      var box = document.getElementById(b.getAttribute('data-play-all'));
      var lines = $$('[data-say]', box).map(function (x) { return x.getAttribute('data-say'); });
      var A = window.HSK_AUDIO; if (!A || !lines.length) return;
      lines.reduce(function (p, t) { return p.then(function () { return A.speak(t); }).catch(function () {}); }, Promise.resolve());
    });
  });
})();
