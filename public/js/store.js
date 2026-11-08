/* Client store (alpha): localStorage wrapper, versioned keys hsk.v1.*, never throws. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.HSK_STORE = factory(root.localStorage);
})(typeof window !== 'undefined' ? window : this, function (storage) {
  var P = 'hsk.v1.';
  var DAY = 86400000;
  var mem = {}; // fallback when storage is unavailable
  var SYNCED = { progress: 1, srs: 1, saved: 1, streak: 1, settings: 1, activity: 1, quiz: 1, last: 1 };
  var applying = false;

  function read(name, fallback) {
    try {
      var raw = storage ? storage.getItem(P + name) : mem[name];
      if (raw == null) return fallback;
      var v = JSON.parse(raw);
      return v == null || typeof v !== typeof fallback ? fallback : v;
    } catch (e) { return fallback; }
  }
  // S2: a write of a synced domain stamps the items that changed (for last-write-wins) and tells sync.js.
  function write(name, value) {
    if (SYNCED[name] && !applying) { try { track(name, value); } catch (e) {} }
    rawWrite(name, value);
    if (SYNCED[name] && !applying) changed(name);
  }
  function rawWrite(name, value) {
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
  function reset() { ['progress', 'srs', 'saved', 'streak', 'settings', 'activity', 'quiz', 'last', 'stamps'].forEach(function (k) { try { if (storage) storage.removeItem(P + k); } catch (e) {} delete mem[k]; }); announceSettings(getSettings()); }

  /* ---- S2 sync (additive). Snapshot: { v: 1, data: {progress, srs, saved, streak, settings, activity, quiz, last},
     stamps: { 'known|w' | 'saved|w' | 'settings|k': ms } }. Stamps record when an item last changed, deletions included.
     Merge is pure and symmetric: per-item last-write-wins; SRS keeps the later review (`last`); chars/quiz/last use `at`;
     activity keeps the max per day; streak keeps the later day. `voice` stays on the device. */
  var LOCAL_ONLY_SETTINGS = { voice: 1 };
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : 0; }
  function stamps() { var s = read('stamps', {}); return isObj(s) ? s : {}; }
  function track(name, next) {
    var st = stamps(), now = Date.now(), dirty = false, k;
    function mark(key, t) { st[key] = Math.max(t, num(st[key]) + 1); dirty = true; }
    if (name === 'progress') {
      var a = getProgress().known, b = isObj(next) && isObj(next.known) ? next.known : {};
      for (k in b) if (a[k] !== b[k]) mark('known|' + k, typeof b[k] === 'number' ? b[k] : now);
      for (k in a) if (!(k in b)) mark('known|' + k, now);
    } else if (name === 'saved') {
      var was = {}, is = {};
      getSaved().forEach(function (w) { was[w] = 1; });
      (Array.isArray(next) ? next : []).forEach(function (w) { is[w] = 1; });
      for (k in is) if (!was[k]) mark('saved|' + k, now);
      for (k in was) if (!is[k]) mark('saved|' + k, now);
    } else if (name === 'settings') {
      // Compare against the cleaned settings so filling in defaults never counts as a user change.
      var prev = cleanSettings(read('settings', {})); next = isObj(next) ? next : {};
      for (k in next) if (JSON.stringify(prev[k]) !== JSON.stringify(next[k])) mark('settings|' + k, now);
      for (k in prev) if (!(k in next)) mark('settings|' + k, now);
    }
    if (dirty) rawWrite('stamps', st);
  }
  function changed(name) {
    try { if (typeof window !== 'undefined' && window.dispatchEvent && typeof CustomEvent === 'function') window.dispatchEvent(new CustomEvent('hsk:change', { detail: { key: name } })); } catch (e) {}
  }
  // Deterministic tie-break so both sides of a merge pick the same value.
  function pick(a, b) { return JSON.stringify(a) >= JSON.stringify(b) ? a : b; }
  function newer(x, y, f) { return !x ? y : !y ? x : num(x[f]) > num(y[f]) ? x : num(y[f]) > num(x[f]) ? y : pick(x, y); }
  // Normalise any payload (old, partial or corrupt) to a valid snapshot. Never throws.
  function syncClean(st) {
    var out = { v: 1, data: {}, stamps: {} }, k;
    try {
      var d = isObj(st) && st.v === 1 && isObj(st.data) ? st.data : {};
      var p = isObj(d.progress) ? d.progress : {}, chars = {}, known = {};
      if (isObj(p.chars)) for (k in p.chars) if (isObj(p.chars[k])) chars[k] = p.chars[k];
      if (isObj(p.known)) for (k in p.known) if (typeof p.known[k] === 'number') known[k] = p.known[k];
      out.data.progress = { chars: chars, known: known };
      out.data.srs = {};
      if (isObj(d.srs)) for (k in d.srs) if (isObj(d.srs[k]) && typeof d.srs[k].due === 'number') out.data.srs[k] = d.srs[k];
      out.data.saved = Array.isArray(d.saved) ? d.saved.filter(function (w, i, a) { return typeof w === 'string' && a.indexOf(w) === i; }) : [];
      out.data.streak = isObj(d.streak) && typeof d.streak.count === 'number' ? { count: d.streak.count, last: typeof d.streak.last === 'string' ? d.streak.last : null } : { count: 0, last: null };
      out.data.settings = isObj(d.settings) ? JSON.parse(JSON.stringify(d.settings)) : {};
      out.data.activity = {};
      if (isObj(d.activity)) for (k in d.activity) if (typeof d.activity[k] === 'number') out.data.activity[k] = d.activity[k];
      out.data.quiz = {};
      if (isObj(d.quiz)) for (k in d.quiz) if (isObj(d.quiz[k])) out.data.quiz[k] = d.quiz[k];
      out.data.last = isObj(d.last) && typeof d.last.slug === 'string' ? d.last : {};
      if (isObj(st) && isObj(st.stamps)) for (k in st.stamps) if (typeof st.stamps[k] === 'number' && isFinite(st.stamps[k])) out.stamps[k] = st.stamps[k];
      return out;
    } catch (e) { return syncClean(null); }
  }
  function syncSnapshot() {
    var settings = read('settings', {}), s = {}, k;
    if (isObj(settings)) for (k in settings) if (!LOCAL_ONLY_SETTINGS[k]) s[k] = settings[k];
    return syncClean({ v: 1, stamps: stamps(), data: { progress: getProgress(), srs: read('srs', {}), saved: getSaved(),
      streak: read('streak', { count: 0, last: null }), settings: s, activity: getActivity(), quiz: getQuiz(), last: read('last', {}) } });
  }
  function union() { var o = {}; for (var i = 0; i < arguments.length; i++) for (var k in arguments[i]) o[k] = 1; return Object.keys(o); }
  function stampKeys(st, pre) { var o = {}; for (var k in st) if (k.indexOf(pre) === 0) o[k.slice(pre.length)] = 1; return o; }
  // Per-item last-write-wins. Each side: { t(key) -> ms, has(key), val(key) }. Ties: presence wins, then a deterministic pick.
  function lww(keys, A, B, set) {
    keys.forEach(function (k) {
      var ta = A.t(k), tb = B.t(k), ha = A.has(k), hb = B.has(k), win;
      if (ta !== tb) win = ta > tb ? A : B;
      else if (ha !== hb) win = ha ? A : B;
      else win = ha && pick(A.val(k), B.val(k)) !== A.val(k) ? B : A;
      if (win.has(k)) set(k, win.val(k));
    });
  }
  function syncMerge(a, b) {
    a = syncClean(a); b = syncClean(b);
    var A = a.data, B = b.data, out = { v: 1, data: {}, stamps: {} }, k;
    for (k in a.stamps) out.stamps[k] = a.stamps[k];
    for (k in b.stamps) out.stamps[k] = Math.max(out.stamps[k] || 0, b.stamps[k]);
    var chars = {}, known = {}, keep = {}, settings = {};
    union(A.progress.chars, B.progress.chars).forEach(function (c) { chars[c] = newer(A.progress.chars[c], B.progress.chars[c], 'at'); });
    function knownSide(x, S) { return { t: function (w) { return Math.max(num(x.stamps['known|' + w]), num(S.progress.known[w])); },
      has: function (w) { return w in S.progress.known; }, val: function (w) { return S.progress.known[w]; } }; }
    lww(union(A.progress.known, B.progress.known, stampKeys(a.stamps, 'known|'), stampKeys(b.stamps, 'known|')),
      knownSide(a, A), knownSide(b, B), function (w, v) { known[w] = v; });
    out.data.progress = { chars: chars, known: known };
    function savedSide(x, S) { var m = {}; S.saved.forEach(function (w) { m[w] = 1; });
      return { m: m, t: function (w) { return num(x.stamps['saved|' + w]); }, has: function (w) { return !!m[w]; }, val: function () { return true; } }; }
    var sA = savedSide(a, A), sB = savedSide(b, B);
    lww(union(sA.m, sB.m, stampKeys(a.stamps, 'saved|'), stampKeys(b.stamps, 'saved|')), sA, sB, function (w) { keep[w] = 1; });
    out.data.saved = A.saved.concat(B.saved).filter(function (w, i, arr) { return keep[w] && arr.indexOf(w) === i; });
    function setSide(x, S) { return { t: function (key) { return num(x.stamps['settings|' + key]); },
      has: function (key) { return key in S.settings; }, val: function (key) { return S.settings[key]; } }; }
    lww(union(A.settings, B.settings, stampKeys(a.stamps, 'settings|'), stampKeys(b.stamps, 'settings|')),
      setSide(a, A), setSide(b, B), function (key, v) { settings[key] = v; });
    out.data.settings = settings;
    out.data.srs = {};
    union(A.srs, B.srs).forEach(function (id) { out.data.srs[id] = newer(A.srs[id], B.srs[id], 'last'); });
    out.data.quiz = {};
    union(A.quiz, B.quiz).forEach(function (q) { out.data.quiz[q] = newer(A.quiz[q], B.quiz[q], 'at'); });
    out.data.activity = {};
    union(A.activity, B.activity).forEach(function (d) { out.data.activity[d] = Math.max(num(A.activity[d]), num(B.activity[d])); });
    var la = A.streak.last || '', lb = B.streak.last || '';
    out.data.streak = la !== lb ? (la > lb ? A.streak : B.streak) : A.streak.count >= B.streak.count ? A.streak : B.streak;
    out.data.last = !A.last.slug ? B.last : !B.last.slug ? A.last : newer(A.last, B.last, 'at');
    return out;
  }
  // Replace local synced data with a (merged) snapshot. Keeps device-only settings; no stamps or change events.
  function syncApply(state) {
    var c = syncClean(state), d = c.data, local = read('settings', {}), s = {}, k;
    for (k in d.settings) s[k] = d.settings[k];
    if (isObj(local)) for (k in LOCAL_ONLY_SETTINGS) if (k in local) s[k] = local[k];
    applying = true;
    try {
      rawWrite('progress', d.progress); rawWrite('srs', d.srs); rawWrite('saved', d.saved); rawWrite('streak', d.streak);
      rawWrite('settings', cleanSettings(s)); rawWrite('activity', d.activity); rawWrite('quiz', d.quiz); rawWrite('last', d.last);
      rawWrite('stamps', c.stamps);
    } finally { applying = false; }
    announceSettings(getSettings());
    return true;
  }

  return { syncSnapshot: syncSnapshot, syncMerge: syncMerge, syncApply: syncApply, syncClean: syncClean,
    getProgress: getProgress, markWritten: markWritten, markKnown: markKnown, isKnown: isKnown,
    getSaved: getSaved, saveWord: saveWord, unsaveWord: unsaveWord, isSaved: isSaved,
    srsGet: srsGet, srsRate: srsRate, srsNext: srsNext, srsPreview: srsPreview, srsLabel: srsLabel, srsDue: srsDue, srsDueCount: srsDueCount, srsNewToday: srsNewToday, srsQueue: srsQueue, streakTouch: streakTouch, getStreak: getStreak,
    getSettings: getSettings, setSettings: setSettings, settingDefaults: SETTING_DEFAULTS, getActivity: getActivity, recordQuiz: recordQuiz, getQuiz: getQuiz, setLast: setLast, getLast: getLast,
    exportAll: exportAll, importAll: importAll, reset: reset };
});
