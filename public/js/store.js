/* Client store (alpha): localStorage wrapper, versioned keys hsk.v1.*, never throws. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.HSK_STORE = factory(root.localStorage);
})(typeof window !== 'undefined' ? window : this, function (storage) {
  var P = 'hsk.v1.';
  var DAY = 86400000;
  var mem = {}; // fallback when storage is unavailable

  function read(name, fallback) {
    try {
      var raw = storage ? storage.getItem(P + name) : mem[name];
      if (raw == null) return fallback;
      var v = JSON.parse(raw);
      return v == null || typeof v !== typeof fallback ? fallback : v;
    } catch (e) { return fallback; }
  }
  function write(name, value) {
    var s = JSON.stringify(value);
    try { if (storage) storage.setItem(P + name, s); else mem[name] = s; }
    catch (e) { mem[name] = s; }
  }
  function dayKey(t) { var d = new Date(t || Date.now()); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function bump() { var a = read('activity', {}), k = dayKey(); a[k] = (a[k] || 0) + 1; write('activity', a); }

  // progress: { chars: {c: {written, at}}, known: {word: at} }
  function getProgress() {
    var p = read('progress', {});
    if (!p.chars || typeof p.chars !== 'object') p.chars = {};
    if (!p.known || typeof p.known !== 'object') p.known = {};
    return p;
  }
  function markWritten(c) {
    var p = getProgress(), e = p.chars[c] || { written: 0 };
    e.written = (e.written || 0) + 1; e.at = Date.now(); p.chars[c] = e;
    write('progress', p); bump(); streakTouch(); return e;
  }
  function markKnown(word, known) {
    var p = getProgress();
    if (known === false) delete p.known[word]; else p.known[word] = Date.now();
    write('progress', p); return known !== false;
  }
  function isKnown(word) { return !!getProgress().known[word]; }

  function getSaved() { var s = read('saved', []); return Array.isArray(s) ? s : []; }
  function saveWord(w) { var s = getSaved(); if (s.indexOf(w) < 0) s.push(w); write('saved', s); return s; }
  function unsaveWord(w) { var s = getSaved().filter(function (x) { return x !== w; }); write('saved', s); return s; }
  function isSaved(w) { return getSaved().indexOf(w) >= 0; }

  // SRS (SM-2 style). rating: 1 Again, 2 Hard, 3 Good, 4 Easy.
  function srsGet(id) { var all = read('srs', {}); return all[id] || null; }
  function srsRate(id, rating, now) {
    now = now || Date.now();
    var all = read('srs', {}), c = all[id] || { ease: 2.5, interval: 0, reps: 0, lapses: 0 };
    if (rating <= 1) { c.reps = 0; c.lapses++; c.interval = 0; c.ease = Math.max(1.3, c.ease - 0.2); c.due = now + 10 * 60000; }
    else {
      c.reps++;
      c.interval = c.reps === 1 ? (rating === 4 ? 4 : 1) : Math.max(1, Math.round(c.interval * c.ease * (rating === 2 ? 0.8 : rating === 4 ? 1.3 : 1)));
      if (rating === 2) c.ease = Math.max(1.3, c.ease - 0.15);
      if (rating === 4) c.ease += 0.15;
      c.due = now + c.interval * DAY;
    }
    c.last = now; all[id] = c; write('srs', all); bump(); streakTouch(now); return c;
  }
  function srsDue(now) {
    now = now || Date.now(); var all = read('srs', {});
    return Object.keys(all).filter(function (k) { return all[k].due <= now; });
  }

  function streakTouch(now) {
    now = now || Date.now();
    var s = read('streak', { count: 0, last: null }), today = dayKey(now);
    if (s.last === today) return s;
    s.count = s.last === dayKey(now - DAY) ? s.count + 1 : 1;
    s.last = today; write('streak', s); return s;
  }
  function getStreak(now) {
    var s = read('streak', { count: 0, last: null }), t = now || Date.now();
    return s.last === dayKey(t) || s.last === dayKey(t - DAY) ? s.count : 0;
  }

  function getSettings() { return read('settings', {}); }
  function setSettings(patch) { var s = getSettings(); for (var k in patch) s[k] = patch[k]; write('settings', s); return s; }
  // quiz scores: { "<key>": {score, total, at} }, key like "lesson-1/1"
  function recordQuiz(key, score, total) { var q = read('quiz', {}); q[key] = { score: score, total: total, at: Date.now() }; write('quiz', q); bump(); streakTouch(); return q[key]; }
  function getQuiz(key) { var q = read('quiz', {}); return key ? q[key] || null : q; }
  // last place visited: { slug, section, at }
  function setLast(slug, section) { write('last', { slug: slug, section: section || null, at: Date.now() }); }
  function getLast() { var l = read('last', {}); return l.slug ? l : null; }

  function getActivity() { return read('activity', {}); }

  function exportAll() {
    return JSON.stringify({ version: 1, progress: getProgress(), srs: read('srs', {}), saved: getSaved(), streak: read('streak', {}), settings: getSettings(), activity: getActivity(), quiz: getQuiz(), last: read('last', {}) });
  }
  function importAll(json) {
    try {
      var d = JSON.parse(json);
      if (!d || d.version !== 1) return false;
      ['progress', 'srs', 'saved', 'streak', 'settings', 'activity', 'quiz', 'last'].forEach(function (k) { if (d[k] != null) write(k, d[k]); });
      return true;
    } catch (e) { return false; }
  }
  function reset() { ['progress', 'srs', 'saved', 'streak', 'settings', 'activity', 'quiz', 'last'].forEach(function (k) { try { if (storage) storage.removeItem(P + k); } catch (e) {} delete mem[k]; }); }

  return { getProgress: getProgress, markWritten: markWritten, markKnown: markKnown, isKnown: isKnown,
    getSaved: getSaved, saveWord: saveWord, unsaveWord: unsaveWord, isSaved: isSaved,
    srsGet: srsGet, srsRate: srsRate, srsDue: srsDue, streakTouch: streakTouch, getStreak: getStreak,
    getSettings: getSettings, setSettings: setSettings, getActivity: getActivity, recordQuiz: recordQuiz, getQuiz: getQuiz, setLast: setLast, getLast: getLast,
    exportAll: exportAll, importAll: importAll, reset: reset };
});
