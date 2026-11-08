/* Learn pages: progress bars, word status dots, home stats, lazy HSK sets. Needs store.js. */
(function () {
  var S = window.HSK_STORE;
  if (!S) return;
  function parse(s) { try { var v = JSON.parse(s); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function pct(words) {
    if (!words.length) return 0;
    var k = 0; words.forEach(function (w) { if (S.isKnown(w)) k++; });
    return Math.round(k * 100 / words.length);
  }
  function setBar(card, p) {
    var bar = card.querySelector('.lc-bar, .set-bar');
    if (!bar) return;
    bar.setAttribute('aria-valuenow', p);
    var i = bar.querySelector('i'); if (i) i.style.width = p + '%';
  }

  // Lesson cards
  [].forEach.call(document.querySelectorAll('.lesson-card[data-words]'), function (c) {
    setBar(c, pct(parse(c.getAttribute('data-words'))));
  });

  // Vocabulary tiles: status dots
  function paintTiles() {
    [].forEach.call(document.querySelectorAll('.char-tile[data-word]'), function (t) {
      var w = t.getAttribute('data-word'), dot = t.querySelector('.dot');
      if (!dot) return;
      var st = S.isKnown(w) ? 'known' : (S.srsGet(w) || S.isSaved(w)) ? 'learning' : 'new';
      dot.className = 'dot dot-' + st;
      dot.setAttribute('aria-label', { known: 'Known', learning: 'Learning', 'new': 'New' }[st]);
    });
  }
  paintTiles();
  var markAll = document.getElementById('mark-all');
  if (markAll) {
    var words = [].map.call(document.querySelectorAll('.char-tile[data-word]'), function (t) { return t.getAttribute('data-word'); });
    var sync = function () { markAll.textContent = words.length && words.every(S.isKnown) ? 'Unmark all' : 'Mark all known'; };
    sync();
    markAll.addEventListener('click', function () {
      var on = !words.every(S.isKnown);
      words.forEach(function (w) { S.markKnown(w, on); });
      paintTiles(); sync();
    });
    var sec = document.getElementById('vocab');
    if (sec) S.setLast(sec.getAttribute('data-lesson'), 'vocab');
  }

  // Home
  var due = document.querySelector('[data-today=due] .stat-value');
  if (due) {
    due.textContent = S.srsDueCount();
    var goal = S.getSettings().dailyGoal || 10, today = new Date().toDateString(), chars = S.getProgress().chars, n = 0;
    Object.keys(chars).forEach(function (c) { if (chars[c].at && new Date(chars[c].at).toDateString() === today) n++; });
    document.querySelector('[data-today=chars] .stat-value').textContent = n + '/' + goal;
    document.querySelector('[data-today=streak] .stat-value').textContent = S.getStreak();
    var last = S.getLast(), cont = document.getElementById('continue');
    if (last && cont) {
      var link = cont.getAttribute('data-default').replace(/[^/]+$/, encodeURIComponent(last.slug));
      cont.href = link + (last.section ? '#' + last.section : '');
      document.getElementById('continue-title').textContent = 'Lesson ' + last.slug.replace(/\D+/g, '');
      document.getElementById('continue-sub').textContent = last.section ? 'Next: ' + last.section : 'Pick up where you left off';
    }
  }

  // Courses: lazy-load HSK study sets
  [].forEach.call(document.querySelectorAll('details.level'), function (d) {
    d.addEventListener('toggle', function () {
      if (!d.open || d.getAttribute('data-loaded')) return;
      d.setAttribute('data-loaded', '1');
      var v = d.getAttribute('data-version'), l = d.getAttribute('data-level'), box = d.querySelector('.sets');
      fetch('/data/hsk/' + v + '/' + l + '/sets').then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) {
        box.innerHTML = '';
        j.sets.forEach(function (s) {
          var a = document.createElement('a');
          a.className = 'set-row';
          a.href = '/browse?version=' + v + '&level=' + l + '&set=' + s.set;
          a.innerHTML = '<span class="set-n"></span><span class="set-words zh"></span><span class="set-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-label="Progress"><i></i></span>';
          a.querySelector('.set-n').textContent = 'Set ' + s.set;
          a.querySelector('.set-words').textContent = s.words.slice(0, 6).join(' ');
          setBar(a, pct(s.words));
          box.appendChild(a);
        });
      }).catch(function () { d.removeAttribute('data-loaded'); box.textContent = 'Could not load sets. Try again.'; });
    });
  });
})();
