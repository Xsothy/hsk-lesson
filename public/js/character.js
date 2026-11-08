/**
 * Character page logic (C1) + shared Hanzi Writer helpers.
 * - window.HSKCharacter: helpers reused by the legacy char.html (char-page.js) and later by Practice (D1).
 * - Auto-initialises the Blade page /char/{c} when [data-character-page] is present.
 * Stroke data: Make Me a Hanzi via hanzi-writer-data (pinned), loaded from jsDelivr.
 */
(function () {
  'use strict';

  var DATA_URL = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/';
  var NS = 'http://www.w3.org/2000/svg';
  var cache = {};

  // ---------- data ----------
  function loadCharData(c) {
    if (!cache[c]) {
      cache[c] = fetch(DATA_URL + encodeURIComponent(c) + '.json').then(function (r) {
        if (!r.ok) throw new Error('No stroke data for ' + c);
        return r.json();
      });
      cache[c].catch(function () { delete cache[c]; });
    }
    return cache[c];
  }
  function charDataLoader(c, onLoad, onError) { loadCharData(c).then(onLoad, onError); }

  function cssVar(name, fallback) {
    try { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback; } catch (e) { return fallback; }
  }
  function colors() {
    return {
      strokeColor: cssVar('--ink', '#0f0c08'), radicalColor: cssVar('--stroke-rad', '#b8892e'), highlightColor: cssVar('--red', '#b5302a'),
      outlineColor: cssVar('--stroke-out', '#ddd5c8'), drawingColor: cssVar('--red', '#b5302a'),
    };
  }

  // ---------- writer + quiz ----------
  function createWriter(target, c, opts) {
    var o = { padding: 16, showOutline: true, delayBetweenStrokes: 250, charDataLoader: charDataLoader };
    var col = colors();
    for (var k in col) o[k] = col[k];
    for (var j in opts || {}) o[j] = opts[j];
    // Placeholder until stroke data arrives: the static character (ghost) or, with ghost:false, a skeleton.
    var ph = document.createElement('span');
    ph.setAttribute('aria-hidden', 'true');
    if (o.ghost === false) ph.className = 'wg-skeleton';
    else { ph.className = 'wg-ghost wg-loading zh'; ph.textContent = c; }
    delete o.ghost;
    target.appendChild(ph);
    var done = function () { if (ph.parentNode) ph.parentNode.removeChild(ph); };
    var ok = o.onLoadCharDataSuccess, bad = o.onLoadCharDataError;
    o.onLoadCharDataSuccess = function (d) { done(); if (ok) ok(d); };
    o.onLoadCharDataError = function (e) { done(); if (bad) bad(e); };
    return window.HanziWriter.create(target, c, o);
  }

  /** Start a writing quiz. h: {onMistake, onCorrectStroke, onComplete, hintAfter}. */
  function runQuiz(writer, h) {
    h = h || {};
    writer.quiz({
      showHintAfterMisses: h.hintAfter || 3,
      onMistake: function (s) { h.onMistake && h.onMistake(s); },
      onCorrectStroke: function (s) { h.onCorrectStroke && h.onCorrectStroke(s); },
      onComplete: function (s) { h.onComplete && h.onComplete(s); },
    });
  }

  // ---------- stroke diagrams ----------
  /**
   * One stroke-order cell as SVG. mode 'all': earlier strokes ink, current red, later strokes faint.
   * mode 'cumulative': only strokes up to current (legacy char.html look).
   */
  function strokeSvg(strokes, current, mode) {
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('aria-hidden', 'true');
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('transform', window.HanziWriter.getScalingTransform(100, 100, 8).transform);
    var ink = cssVar('--ink', '#0f0c08'), red = cssVar('--red', '#b5302a');
    strokes.forEach(function (d, j) {
      if (mode === 'cumulative' && j > current) return;
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      p.setAttribute('fill', j === current ? red : j < current ? ink : cssVar('--stroke-ghost', '#e4dccf'));
      if (mode === 'cumulative' && j !== current) p.setAttribute('opacity', '.55');
      g.appendChild(p);
    });
    svg.appendChild(g);
    return svg;
  }

  /** Legacy "stroke by stroke" strip: one cumulative diagram per stroke. */
  function renderDiagrams(box, strokes) {
    box.replaceChildren.apply(box, strokes.map(function (_, i) {
      var svg = strokeSvg(strokes, i, 'cumulative');
      svg.setAttribute('role', 'img');
      svg.removeAttribute('aria-hidden');
      svg.setAttribute('aria-label', 'Stroke ' + (i + 1) + ' of ' + strokes.length);
      return svg;
    }));
  }

  // ---------- per-stroke tip (generated from the stroke's median line) ----------
  function dist(a, b) { return Math.hypot(b[0] - a[0], b[1] - a[1]); }
  /** Change of heading (degrees) at corner c going from a→c to c→b. */
  function angleDiff(c, a, b) {
    var d = Math.atan2(b[1] - c[1], b[0] - c[0]) - Math.atan2(c[1] - a[1], c[0] - a[0]);
    d = d * 180 / Math.PI;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return d;
  }
  function dirName(a, b) {
    var ang = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI; // y points up in the data
    if (ang >= -22 && ang <= 22) return 'horizontal';
    if (ang > 22 && ang < 80) return 'rising';
    if (ang >= -112 && ang <= -68) return 'vertical';
    if (ang < -112 && ang > -175) return 'left-falling';
    if (ang < -22 && ang > -68) return 'right-falling';
    return ang > 0 ? 'upward' : 'leftward';
  }
  var DIR_WORD = { horizontal: 'right', rising: 'up to the right', vertical: 'down', 'left-falling': 'down-left', 'right-falling': 'down-right', upward: 'up', leftward: 'left' };
  var PINYIN = { horizontal: 'héng', vertical: 'shù', 'left-falling': 'piě', 'right-falling': 'nà', rising: 'tí' };

  function strokeKind(m) {
    var len = 0;
    for (var i = 1; i < m.length; i++) len += dist(m[i - 1], m[i]);
    var p0 = m[0], pn = m[m.length - 1];
    if (len < 230) return { name: 'Dot', py: 'diǎn' };
    // Corner = median point farthest from the chord p0→pn.
    var cx = pn[0] - p0[0], cy = pn[1] - p0[1], cl = Math.hypot(cx, cy) || 1, best = 0, bi = -1;
    for (var k = 1; k < m.length - 1; k++) {
      var d = Math.abs(cx * (p0[1] - m[k][1]) - cy * (p0[0] - m[k][0])) / cl;
      if (d > best) { best = d; bi = k; }
    }
    // Angle between the two legs; gentle curves (piě, nà) are not turns.
    var turn = bi < 0 ? 0 : Math.abs(angleDiff(m[bi], p0, pn));
    if (bi < 0 || best < 0.14 * len || turn < 55) {
      var base = dirName(p0, pn);
      return { name: cap(base), py: PINYIN[base] };
    }
    var first = dirName(p0, m[bi]), tail = dist(m[bi], pn);
    // A short tail that doubles back sharply is a hook (gōu).
    if (tail < 0.3 * len && (turn > 100 || tail < 0.18 * len)) return { name: cap(first) + ' ending in a hook' };
    return { name: cap(first) + ', then turn ' + DIR_WORD[dirName(m[bi], pn)] };
  }
  function where(p) {
    var x = p[0] < 380 ? 'left' : p[0] > 640 ? 'right' : 'centre';
    var y = p[1] > 590 ? 'top' : p[1] < 230 ? 'bottom' : 'middle';
    return y === 'middle' && x === 'centre' ? 'in the centre' : y === 'middle' ? 'middle ' + x : y + ' ' + x;
  }
  /** Plain-language tip for stroke i (0-based) of Hanzi Writer char data. */
  function strokeTip(data, i, radical) {
    var m = data.medians && data.medians[i];
    if (!m || m.length < 2) return 'Stroke ' + (i + 1) + '.';
    var k = strokeKind(m);
    var s = k.name + (k.py ? ' (' + k.py + ')' : '') + ', starting ' + where(m[0]) + '.';
    if (radical && data.radStrokes && data.radStrokes.indexOf(i) >= 0) s += ' Part of the radical ' + radical + '.';
    if (i === data.strokes.length - 1 && i > 0) s += ' Last stroke.';
    return s;
  }
  function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

  // ---------- progress (A4 client store, public/js/store.js) ----------
  function store() { return window.HSK_STORE || null; }
  function markWritten(c) { var s = store(); return s ? s.markWritten(c) : null; }
  function isSaved(w) { var s = store(); return !!(s && s.isSaved(w)); }
  function setSaved(w, on) { var s = store(); if (s) { if (on) s.saveWord(w); else s.unsaveWord(w); } }

  window.HSKCharacter = {
    loadCharData: loadCharData, charDataLoader: charDataLoader, createWriter: createWriter, runQuiz: runQuiz,
    strokeSvg: strokeSvg, renderDiagrams: renderDiagrams, strokeTip: strokeTip, markWritten: markWritten,
    isSaved: isSaved, setSaved: setSaved,
  };

  // ---------- Blade page ----------
  function initPage(root) {
    var c = root.dataset.char;
    var $ = function (sel) { return root.querySelector(sel); };
    var grid = $('.writing-grid'), mount = $('[data-writer]'), count = $('.wg-count');
    var feedback = $('[data-feedback]'), title = $('[data-write-title]');
    var tabs = [].slice.call(root.querySelectorAll('.cp-pill [role=tab]'));
    var groups = { watch: $('[data-group=watch]'), write: $('[data-group=write]') };
    var toggleBtn = $('[data-action=toggle]'), speedBtn = $('[data-action=speed]'), outlineBtn = $('[data-action=outline]');
    var SPEEDS = [0.5, 1, 2];
    var st = { mode: 'watch', speed: 1, outline: true, anim: 'idle', next: 0, data: null, step: 0, size: 0 };
    var writer = null;

    function say(text, cls) { feedback.textContent = text || ''; feedback.className = 'cp-feedback' + (cls ? ' ' + cls : ''); }
    function setCount(n) { if (count && st.data) count.textContent = n + '/' + st.data.strokes.length; }
    function setAnim(a) {
      st.anim = a;
      var paused = a !== 'playing';
      toggleBtn.setAttribute('aria-pressed', String(paused));
      toggleBtn.querySelector('[data-label]').textContent = paused ? 'Play' : 'Pause';
    }

    function build() {
      st.size = Math.round(mount.getBoundingClientRect().width) || 300;
      mount.replaceChildren();
      writer = createWriter(mount, c, {
        width: st.size, height: st.size,
        showCharacter: false, showOutline: st.mode === 'watch' || st.outline,
        strokeAnimationSpeed: SPEEDS[st.speed],
        onLoadCharDataError: function () { say('Stroke data is not available for this character.', 'bad'); },
      });
      if (st.mode === 'watch') play(); else quiz();
    }

    function play() {
      setAnim('playing');
      say('Watch the stroke order' + (st.data && st.data.radStrokes && st.data.radStrokes.length ? ' — the radical glows gold.' : '.'));
      writer.hideCharacter();
      writer.animateCharacter({ onComplete: function (r) { if (r && r.canceled) return; setAnim('done'); say('Done. Switch to Write to try it yourself.'); } });
    }

    function quiz() {
      st.next = 0; setCount(0);
      say('Write stroke 1 in the grid.');
      runQuiz(writer, {
        onMistake: function () { say('Not quite — try that stroke again.', 'bad'); },
        onCorrectStroke: function (s) {
          st.next = s.strokeNum + 1; setCount(st.next);
          say('Stroke ' + st.next + ' ✓ · ' + s.strokesRemaining + ' to go', 'ok');
        },
        onComplete: function (s) {
          setCount(st.data ? st.data.strokes.length : st.next);
          markWritten(c);
          root.dispatchEvent(new CustomEvent('hsk:written', { bubbles: true, detail: { char: c, mistakes: s.totalMistakes } }));
          say(s.totalMistakes ? 'Done with ' + s.totalMistakes + ' mistake' + (s.totalMistakes > 1 ? 's' : '') + ' — saved. Retry to improve.' : 'Perfect! No mistakes — saved to your progress.', 'ok');
        },
      });
    }

    function setMode(m, focus) {
      if (m === st.mode && writer) return;
      st.mode = m;
      tabs.forEach(function (t) {
        var on = t.dataset.mode === m;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (on && focus) t.focus();
      });
      $('#cp-stage').setAttribute('aria-labelledby', 'tab-' + m);
      groups.watch.hidden = m !== 'watch';
      groups.write.hidden = m !== 'write';
      grid.classList.toggle('wg-watch', m === 'watch');
      grid.classList.toggle('wg-write', m === 'write');
      grid.dataset.mode = m;
      title.textContent = m === 'watch' ? 'Watch it written' : 'Trace it yourself';
      build();
    }

    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { setMode(t.dataset.mode); });
      t.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        setMode(tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length].dataset.mode, true);
      });
    });

    groups.watch.addEventListener('click', function (e) {
      var a = e.target.closest('[data-action]'); if (!a || !writer) return;
      if (a.dataset.action === 'replay') play();
      if (a.dataset.action === 'toggle') {
        if (st.anim === 'playing') { writer.pauseAnimation(); setAnim('paused'); }
        else if (st.anim === 'paused') { writer.resumeAnimation(); setAnim('playing'); }
        else play();
      }
      if (a.dataset.action === 'speed') {
        st.speed = (st.speed + 1) % SPEEDS.length;
        speedBtn.querySelector('[data-label]').textContent = 'Speed ' + SPEEDS[st.speed] + '×';
        build();
      }
    });

    groups.write.addEventListener('click', function (e) {
      var a = e.target.closest('[data-action]'); if (!a || !writer) return;
      if (a.dataset.action === 'hint' && st.data && st.next < st.data.strokes.length) writer.highlightStroke(st.next);
      if (a.dataset.action === 'outline') {
        st.outline = !st.outline;
        st.outline ? writer.showOutline() : writer.hideOutline();
        outlineBtn.setAttribute('aria-pressed', String(st.outline));
      }
      if (a.dataset.action === 'retry') { writer.cancelQuiz(); writer.hideCharacter(); quiz(); }
    });

    // Save to my words
    var saveBtn = $('[data-action=save]');
    function paintSave() {
      var on = isSaved(c);
      saveBtn.setAttribute('aria-pressed', String(on));
      saveBtn.setAttribute('aria-label', on ? 'Remove from my words' : 'Save to my words');
    }
    saveBtn.addEventListener('click', function () { setSaved(c, !isSaved(c)); paintSave(); });
    paintSave();

    // 02 Stroke order stepper
    var cellsBox = $('[data-cells]'), stepTitle = $('[data-step-title]'), bar = $('[data-step-bar]'), tip = $('[data-step-tip]');
    var progress = $('.cp-bar'), prev = $('[data-step="-1"]'), next = $('[data-step="1"]');
    var PER_PAGE = 8;
    function showStep(i) {
      var n = st.data.strokes.length;
      st.step = Math.max(0, Math.min(n - 1, i));
      var page = Math.floor(st.step / PER_PAGE), from = page * PER_PAGE;
      var cells = [];
      for (var j = from; j < Math.min(n, from + PER_PAGE); j++) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'cp-cell'; b.dataset.go = j;
        b.setAttribute('aria-label', 'Show stroke ' + (j + 1));
        if (j === st.step) b.setAttribute('aria-current', 'step');
        b.appendChild(strokeSvg(st.data.strokes, j, 'all'));
        var num = document.createElement('span'); num.textContent = j + 1; num.setAttribute('aria-hidden', 'true');
        b.appendChild(num);
        cells.push(b);
      }
      var focused = cellsBox.contains(document.activeElement);
      cellsBox.replaceChildren.apply(cellsBox, cells);
      if (focused) { var cur = cellsBox.querySelector('[aria-current]'); if (cur) cur.focus(); }
      stepTitle.textContent = 'Stroke ' + (st.step + 1) + ' of ' + n;
      bar.style.width = Math.round((st.step + 1) / n * 100) + '%';
      progress.setAttribute('aria-valuemax', n); progress.setAttribute('aria-valuenow', st.step + 1);
      tip.textContent = strokeTip(st.data, st.step, root.dataset.radical);
      prev.disabled = st.step === 0; next.disabled = st.step === n - 1;
    }
    cellsBox.addEventListener('click', function (e) { var b = e.target.closest('[data-go]'); if (b) showStep(+b.dataset.go); });
    prev.addEventListener('click', function () { showStep(st.step - 1); });
    next.addEventListener('click', function () { showStep(st.step + 1); });

    loadCharData(c).then(function (data) {
      st.data = data;
      var badge = $('[data-stroke-count]');
      if (badge) { badge.textContent = data.strokes.length + ' strokes'; badge.hidden = false; }
      setCount(st.next);
      showStep(0);
    }, function () {
      tip.textContent = 'Stroke data is not available for this character.';
    });

    // Rebuild the writer when the grid size changes noticeably (rotation, resize across the breakpoint).
    var t = null;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var w = Math.round(mount.getBoundingClientRect().width);
        if (writer && Math.abs(w - st.size) > 8) build();
      }, 200);
    });

    if (!window.HanziWriter) { say('Could not load the writing tool. Check your connection and reload.', 'bad'); tip.textContent = ''; return; }
    build();
  }

  function boot() {
    var root = document.querySelector('[data-character-page]');
    if (root) initPage(root);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
