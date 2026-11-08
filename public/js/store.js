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
  // Card: { ease [1.3..3.0], interval (days, may be 0.25), reps, lapses, due, last, first (ms of first rating; used for the new-cards-per-day cap) }.
  // Settings keys read by Review (D2; E1 edits them): reviewFirst 'zh'|'en'|'audio' (default 'zh'), reviewPinyinFront bool (false),
  // reviewAudioReveal bool (true), newPerDay number (20). They live in `hsk.v1.settings` next to the E1 keys.
  var EASE_MIN = 1.3, EASE_MAX = 3.0;
  function srsGet(id) { var all = read('srs', {}); return all[id] || null; }
  // Pure scheduler: returns the card after `rating` at `now` (the input is not mutated).
  function srsNext(card, rating, now) {
    now = now || Date.now();
    var c = { ease: 2.5, interval: 0, reps: 0, lapses: 0 };
    if (card) for (var k in card) c[k] = card[k];
    var prev = c.interval || 0;
    if (rating <= 1) { c.reps = 0; c.lapses++; c.interval = 0; c.ease = Math.max(EASE_MIN, c.ease - 0.2); c.due = now + 10 * 60000; }
    else {
      c.reps++;
      if (c.reps === 1) c.interval = rating === 4 ? 4 : rating === 3 ? 1 : 0.25;
      else {
        var hard = Math.max(prev + 1, Math.round(prev * 1.2));
        var good = Math.max(hard + 1, Math.round(prev * c.ease));
        var easy = Math.max(good + 1, Math.round(prev * c.ease * 1.3));
        c.interval = rating === 2 ? hard : rating === 4 ? easy : good;
      }
      if (rating === 2) c.ease = Math.max(EASE_MIN, c.ease - 0.15);
      if (rating === 4) c.ease = Math.min(EASE_MAX, c.ease + 0.15);
      c.due = now + c.interval * DAY;
    }
    c.last = now; c.first = c.first || now;
    return c;
  }
  function srsRate(id, rating, now) {
    now = now || Date.now();
    var all = read('srs', {}), c = srsNext(all[id], rating, now);
    all[id] = c; write('srs', all); bump(); streakTouch(now); return c;
  }
  // Human label for a delay: "10 min", "6 h", "1 d", "2 mo".
  function srsLabel(ms) {
    var m = Math.round(ms / 60000);
    if (m < 60) return Math.max(1, m) + ' min';
    var h = Math.round(m / 60); if (h < 24) return h + ' h';
    var d = Math.round(h / 24); if (d < 30) return d + ' d';
    return Math.round(d / 30) + ' mo';
  }
  // Next-due preview for each rating without saving: { 1: {due, interval, label}, ... 4: ... }.
  function srsPreview(id, now) {
    now = now || Date.now(); var card = srsGet(id), out = {};
    for (var r = 1; r <= 4; r++) { var n = srsNext(card, r, now); out[r] = { due: n.due, interval: n.interval, label: srsLabel(n.due - now) }; }
    return out;
  }
  function srsDue(now) {
    now = now || Date.now(); var all = read('srs', {});
    return Object.keys(all).filter(function (k) { return all[k].due <= now; });
  }
  // The "cards due" number. Home and Review both call this.
  function srsDueCount(now) { return srsDue(now).length; }
  function srsNewToday(now) {
    var all = read('srs', {}), t = dayKey(now || Date.now());
    return Object.keys(all).filter(function (k) { return all[k].first && dayKey(all[k].first) === t; }).length;
  }
  // Session queue for a deck (array of ids): due cards (oldest due first) + unseen cards, capped at newPerDay minus new cards already started today.
  function srsQueue(ids, now) {
    now = now || Date.now();
    var all = read('srs', {}), cap = Number(getSettings().newPerDay);
    if (!isFinite(cap) || cap < 0) cap = 20;
    var left = Math.max(0, cap - srsNewToday(now)), seen = {}, due = [], fresh = [];
    ids.forEach(function (id) {
      if (seen[id]) return; seen[id] = 1;
      var c = all[id];
      if (c) { if (c.due <= now) due.push(id); }
      else fresh.push(id);
    });
    due.sort(function (a, b) { return all[a].due - all[b].due; });
    return { due: due, fresh: fresh.slice(0, left), newTotal: fresh.length, newLeft: left };
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

  /* Settings (key hsk.v1.settings). Final key names — other pages read these via getSettings():
     pinyin 'show'|'hide' · pinyinPos 'above'|'below' · toneColors bool · charSize 'sm'|'md'|'lg'
     theme 'light'|'dark'|'system' · audioRate 0.5-1.5 · voice voiceURI string ('' = auto)
     hskVersion '2.0'|'3.0' · dailyGoal int 1-100 · hintAfterMisses int 0-10 (0 = never hint)
     Unknown keys (e.g. browseView) are kept untouched. Invalid values fall back to defaults. */
  var SETTING_DEFAULTS = { pinyin: 'show', pinyinPos: 'above', toneColors: true, charSize: 'md', theme: 'system',
    audioRate: 0.7, voice: '', hskVersion: '2.0', dailyGoal: 10, hintAfterMisses: 2 };
  var SETTING_OK = {
    pinyin: function (v) { return v === 'show' || v === 'hide'; },
    pinyinPos: function (v) { return v === 'above' || v === 'below'; },
    toneColors: function (v) { return typeof v === 'boolean'; },
    charSize: function (v) { return v === 'sm' || v === 'md' || v === 'lg'; },
    theme: function (v) { return v === 'light' || v === 'dark' || v === 'system'; },
    audioRate: function (v) { return typeof v === 'number' && v >= 0.5 && v <= 1.5; },
    voice: function (v) { return typeof v === 'string' && v.length < 300; },
    hskVersion: function (v) { return v === '2.0' || v === '3.0'; },
    dailyGoal: function (v) { return typeof v === 'number' && v % 1 === 0 && v >= 1 && v <= 100; },
    hintAfterMisses: function (v) { return typeof v === 'number' && v % 1 === 0 && v >= 0 && v <= 10; }
  };
  function cleanSettings(raw) {
    var out = {}, k;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) for (k in raw) out[k] = raw[k];
    for (k in SETTING_DEFAULTS) if (!SETTING_OK[k](out[k])) out[k] = SETTING_DEFAULTS[k];
    return out;
  }
  function getSettings() { return cleanSettings(read('settings', {})); }
  function setSettings(patch) {
    var s = getSettings(), k;
    if (patch && typeof patch === 'object') for (k in patch) if (!SETTING_OK[k] || SETTING_OK[k](patch[k])) s[k] = patch[k];
    write('settings', s); announceSettings(s); return s;
  }
  function announceSettings(s) {
    try { if (typeof window !== 'undefined' && window.dispatchEvent && typeof CustomEvent === 'function') window.dispatchEvent(new CustomEvent('hsk:settings', { detail: s })); } catch (e) {}
  }
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
  var IMPORT_SHAPE = { progress: 'object', srs: 'object', saved: 'array', streak: 'object', settings: 'object', activity: 'object', quiz: 'object', last: 'object' };
  function shapeOk(v, t) { return t === 'array' ? Array.isArray(v) : !!v && typeof v === 'object' && !Array.isArray(v); }
  function importAll(json) {
    try {
      var d = JSON.parse(json);
      if (!d || typeof d !== 'object' || d.version !== 1) return false;
      var keys = Object.keys(IMPORT_SHAPE).filter(function (k) { return d[k] != null; });
      for (var i = 0; i < keys.length; i++) if (!shapeOk(d[keys[i]], IMPORT_SHAPE[keys[i]])) return false;
      keys.forEach(function (k) { write(k, k === 'settings' ? cleanSettings(d[k]) : d[k]); });
      announceSettings(getSettings());
      return true;
    } catch (e) { return false; }
  }
  function reset() { ['progress', 'srs', 'saved', 'streak', 'settings', 'activity', 'quiz', 'last'].forEach(function (k) { try { if (storage) storage.removeItem(P + k); } catch (e) {} delete mem[k]; }); announceSettings(getSettings()); }

  return { getProgress: getProgress, markWritten: markWritten, markKnown: markKnown, isKnown: isKnown,
    getSaved: getSaved, saveWord: saveWord, unsaveWord: unsaveWord, isSaved: isSaved,
    srsGet: srsGet, srsRate: srsRate, srsNext: srsNext, srsPreview: srsPreview, srsLabel: srsLabel, srsDue: srsDue, srsDueCount: srsDueCount, srsNewToday: srsNewToday, srsQueue: srsQueue, streakTouch: streakTouch, getStreak: getStreak,
    getSettings: getSettings, setSettings: setSettings, settingDefaults: SETTING_DEFAULTS, getActivity: getActivity, recordQuiz: recordQuiz, getQuiz: getQuiz, setLast: setLast, getLast: getLast,
    exportAll: exportAll, importAll: importAll, reset: reset };
});
