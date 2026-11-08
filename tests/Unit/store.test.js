// Run: node tests/unit/store.test.js
const assert = require('assert');
const factory = require('../../public/js/store.js');

function fakeStorage(init) {
  const m = Object.assign({}, init);
  return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; }, _m: m };
}

// persists across "reloads" (same storage, new store instance)
let ls = fakeStorage();
let s = factory(ls);
s.markWritten('学'); s.saveWord('学习'); s.markKnown('你好');
let s2 = factory(ls);
assert.strictEqual(s2.getProgress().chars['学'].written, 1);
assert.deepStrictEqual(s2.getSaved(), ['学习']);
assert.ok(s2.isKnown('你好'));
s2.unsaveWord('学习'); assert.deepStrictEqual(s2.getSaved(), []);

// corrupt storage never throws
ls = fakeStorage({ 'hsk.v1.progress': '{bad', 'hsk.v1.saved': '"x"', 'hsk.v1.srs': '[]', 'hsk.v1.streak': 'null' });
s = factory(ls);
assert.deepStrictEqual(s.getProgress(), { chars: {}, known: {} });
assert.deepStrictEqual(s.getSaved(), []);
assert.deepStrictEqual(s.srsDue(), []);
assert.strictEqual(s.getStreak(), 0);
s.markWritten('我'); assert.strictEqual(s.getProgress().chars['我'].written, 1);

// missing / throwing storage
factory(null).saveWord('a');
const boom = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
s = factory(boom); s.saveWord('a'); s.markWritten('a'); s.srsRate('a', 3); s.reset();

// SRS
s = factory(fakeStorage());
const t0 = Date.UTC(2026, 0, 1, 12);
let c = s.srsRate('学', 3, t0);
assert.strictEqual(c.interval, 1); assert.strictEqual(c.due, t0 + 86400000);
assert.deepStrictEqual(s.srsDue(t0), []);
assert.deepStrictEqual(s.srsDue(t0 + 86400000), ['学']);
c = s.srsRate('学', 3, t0 + 86400000); assert.ok(c.interval >= 2);
c = s.srsRate('学', 1, t0 + 3 * 86400000); assert.strictEqual(c.reps, 0);

// SRS scheduler (D2)
{
  const D = 86400000, st = factory(fakeStorage());
  const fresh = st.srsNext(null, 3, t0);
  assert.strictEqual(st.srsNext(null, 1, t0).due, t0 + 600000);          // Again = 10 min
  assert.strictEqual(st.srsNext(null, 2, t0).interval, 0.25);            // Hard first = 6 h
  assert.strictEqual(fresh.interval, 1); assert.strictEqual(st.srsNext(null, 4, t0).interval, 4);
  assert.strictEqual(fresh.first, t0); assert.strictEqual(fresh.ease, 2.5);
  // mature card: Hard < Good < Easy and due dates
  const mature = { ease: 2.5, interval: 10, reps: 3, lapses: 0, due: t0 };
  const [h, g, e] = [2, 3, 4].map(r => st.srsNext(mature, r, t0));
  assert.deepStrictEqual([h.interval, g.interval, e.interval], [12, 25, 33]);
  assert.strictEqual(g.due, t0 + 25 * D);
  const tiny = { ease: 2.5, interval: 1, reps: 1, lapses: 0 };
  const ti = [2, 3, 4].map(r => st.srsNext(tiny, r, t0).interval);
  assert.ok(ti[0] < ti[1] && ti[1] < ti[2], ti.join());
  // lapse: reps reset, lapses counted, ease drops and is floored
  let lc = st.srsNext(mature, 1, t0);
  assert.deepStrictEqual([lc.reps, lc.lapses, lc.interval], [0, 1, 0]); assert.ok(Math.abs(lc.ease - 2.3) < 1e-9);
  for (let i = 0; i < 20; i++) lc = st.srsNext(lc, 1, t0);
  assert.strictEqual(lc.ease, 1.3);
  // ease bounds
  let ec = mature; for (let i = 0; i < 20; i++) ec = st.srsNext(ec, 4, t0);
  assert.strictEqual(ec.ease, 3);
  let hc = mature; for (let i = 0; i < 20; i++) hc = st.srsNext(hc, 2, t0);
  assert.strictEqual(hc.ease, 1.3);
  assert.strictEqual(mature.interval, 10); // pure
  // labels + preview (does not write)
  assert.deepStrictEqual([600000, 6 * 3600000, D, 4 * D, 45 * D].map(st.srsLabel), ['10 min', '6 h', '1 d', '4 d', '2 mo']);
  const pv = st.srsPreview('x', t0);
  assert.deepStrictEqual([1, 2, 3, 4].map(r => pv[r].label), ['10 min', '6 h', '1 d', '4 d']);
  assert.strictEqual(st.srsGet('x'), null);
  const r = st.srsRate('x', 3, t0); assert.deepStrictEqual(st.srsGet('x'), r); assert.strictEqual(r.first, t0);
}

// Due count (Home and Review both use srsDueCount) and queue with the new-per-day cap
{
  const D = 86400000, st = factory(fakeStorage());
  st.srsRate('a', 3, t0); st.srsRate('b', 3, t0 + 1000); st.srsRate('c', 1, t0);
  assert.strictEqual(st.srsDueCount(t0 + 700000), 1);
  assert.strictEqual(st.srsDueCount(t0 + D + 5000), 3);
  const q = st.srsQueue(['a', 'b', 'c', 'n1', 'n2', 'n3', 'a'], t0 + D + 5000);
  assert.deepStrictEqual(q.due, ['c', 'a', 'b']); assert.deepStrictEqual(q.fresh, ['n1', 'n2', 'n3']);
  st.setSettings({ newPerDay: 2 });
  assert.deepStrictEqual(st.srsQueue(['n1', 'n2', 'n3'], t0 + D + 5000).fresh, ['n1', 'n2']);
  const st2 = factory(fakeStorage()); st2.setSettings({ newPerDay: 2 });
  st2.srsRate('n1', 3, t0);
  assert.strictEqual(st2.srsNewToday(t0), 1);
  const q2 = st2.srsQueue(['n1', 'n2', 'n3'], t0); assert.deepStrictEqual(q2.fresh, ['n2']); assert.strictEqual(q2.newLeft, 1);
  assert.strictEqual(st2.srsQueue(['n3'], t0 + D).newLeft, 2); // next day resets
  st2.setSettings({ newPerDay: 0 }); assert.deepStrictEqual(st2.srsQueue(['z'], t0).fresh, []);
}

// streak
s = factory(fakeStorage());
s.streakTouch(t0); s.streakTouch(t0 + 3600000); assert.strictEqual(s.getStreak(t0), 1);
s.streakTouch(t0 + 86400000); assert.strictEqual(s.getStreak(t0 + 86400000), 2);
assert.strictEqual(s.getStreak(t0 + 5 * 86400000), 0);

// export / import / reset
s = factory(fakeStorage()); s.saveWord('x'); const dump = s.exportAll();
const s3 = factory(fakeStorage()); assert.ok(s3.importAll(dump)); assert.deepStrictEqual(s3.getSaved(), ['x']);
assert.strictEqual(s3.importAll('nope'), false);
s3.reset(); assert.deepStrictEqual(s3.getSaved(), []);

// quiz + last
s = factory(fakeStorage());
s.recordQuiz('lesson-1/1', 2, 3); assert.strictEqual(s.getQuiz('lesson-1/1').score, 2);
assert.strictEqual(s.getLast(), null); s.setLast('lesson-2', 'dialogue'); assert.strictEqual(s.getLast().slug, 'lesson-2');

// settings: defaults, validation, unknown keys kept, import validation
s = factory(fakeStorage());
assert.strictEqual(s.getSettings().theme, 'system'); assert.strictEqual(s.getSettings().dailyGoal, 10);
s.setSettings({ theme: 'dark', dailyGoal: 999, pinyin: 'nope', browseView: 'grid' });
assert.strictEqual(s.getSettings().theme, 'dark'); assert.strictEqual(s.getSettings().dailyGoal, 10);
assert.strictEqual(s.getSettings().pinyin, 'show'); assert.strictEqual(s.getSettings().browseView, 'grid');
s = factory(fakeStorage({ 'hsk.v1.settings': '{"theme":5,"audioRate":9,"hintAfterMisses":0}' }));
assert.strictEqual(s.getSettings().theme, 'system'); assert.strictEqual(s.getSettings().audioRate, 0.7); assert.strictEqual(s.getSettings().hintAfterMisses, 0);
s = factory(fakeStorage()); s.setSettings({ theme: 'light' });
assert.strictEqual(s.importAll('{"version":1,"saved":"oops"}'), false);
assert.strictEqual(s.importAll('[]'), false); assert.strictEqual(s.getSettings().theme, 'light');
assert.ok(s.importAll('{"version":1,"settings":{"theme":"dark","dailyGoal":"x"}}'));
assert.strictEqual(s.getSettings().theme, 'dark'); assert.strictEqual(s.getSettings().dailyGoal, 10);

// S2 sync: stamps, merge, apply
{
  const realNow = Date.now;
  let clock = 1_000_000;
  Date.now = () => clock;
  const A = factory(fakeStorage()), B = factory(fakeStorage());
  const sync = (x, y) => { const m = x.syncMerge(x.syncSnapshot(), y.syncSnapshot()); x.syncApply(m); y.syncApply(m); return m; };

  // fresh device: defaults never get stamps; user changes do
  A.getSettings(); A.setSettings({});
  assert.deepStrictEqual(Object.keys(A.syncSnapshot().stamps), []);
  A.setSettings({ theme: 'dark', voice: 'device-voice' });
  clock += 10; B.setSettings({ theme: 'light' });            // B changed theme later → B wins
  clock += 10; A.saveWord('学习'); A.markKnown('你好');
  clock += 10; B.saveWord('朋友');
  B.markWritten('我');
  let m = sync(A, B);
  assert.strictEqual(A.getSettings().theme, 'light'); assert.strictEqual(B.getSettings().theme, 'light');
  assert.strictEqual(A.getSettings().voice, 'device-voice');   // device-only
  assert.strictEqual(B.getSettings().voice, '');
  assert.ok(!('voice' in m.data.settings));
  assert.deepStrictEqual(A.getSaved().slice().sort(), ['学习', '朋友'].sort());
  assert.deepStrictEqual(B.getSaved().slice().sort(), ['学习', '朋友'].sort());
  assert.ok(B.isKnown('你好')); assert.strictEqual(A.getProgress().chars['我'].written, 1);

  // deletions propagate (tombstones), and a later re-add beats an older delete
  clock += 10; A.unsaveWord('朋友'); A.markKnown('你好', false);
  clock += 10; B.saveWord('学习');                              // no-op (already saved), no new stamp
  sync(B, A);
  assert.deepStrictEqual(B.getSaved(), ['学习']); assert.ok(!B.isKnown('你好'));
  clock += 10; B.saveWord('朋友'); sync(A, B);
  assert.ok(A.isSaved('朋友'));

  // SRS keeps the later review even if the other side has more reps
  A.srsRate('学', 3, 5000); A.srsRate('学', 3, 6000); A.srsRate('学', 3, 7000);
  B.srsRate('学', 1, 8000);
  sync(A, B);
  assert.strictEqual(A.srsGet('学').last, 8000); assert.strictEqual(A.srsGet('学').reps, 0);
  assert.deepStrictEqual(A.srsGet('学'), B.srsGet('学'));

  // merge is symmetric (same result either way) and idempotent
  clock += 10; A.setSettings({ dailyGoal: 30 }); B.recordQuiz('lesson-1/1', 3, 5);
  const ab = A.syncMerge(A.syncSnapshot(), B.syncSnapshot()), ba = A.syncMerge(B.syncSnapshot(), A.syncSnapshot());
  const norm = (x) => JSON.stringify(Object.assign({}, x, { data: Object.assign({}, x.data, { saved: x.data.saved.slice().sort() }) }));
  assert.strictEqual(norm(ab), norm(ba));
  assert.strictEqual(JSON.stringify(A.syncMerge(ab, ab)), JSON.stringify(ab));

  // streak keeps the later day; activity keeps the max per day
  const s1 = { v: 1, data: { streak: { count: 5, last: '2026-01-02' }, activity: { '2026-01-01': 3 } } };
  const s2 = { v: 1, data: { streak: { count: 9, last: '2026-01-01' }, activity: { '2026-01-01': 7, '2026-01-02': 1 } } };
  m = A.syncMerge(s1, s2);
  assert.deepStrictEqual(m.data.streak, { count: 5, last: '2026-01-02' });
  assert.deepStrictEqual(m.data.activity, { '2026-01-01': 7, '2026-01-02': 1 });

  // corrupt / old payloads never break the store
  for (const bad of [null, undefined, 42, 'x', [], { v: 2, data: {} }, { v: 1, data: 'x' },
    { v: 1, data: { progress: 'x', srs: [1], saved: [1, null, 'ok', 'ok'], settings: [], streak: 'x', quiz: 7, last: 3 }, stamps: { 'saved|ok': 'x' } }]) {
    const st = factory(fakeStorage()); st.saveWord('mine');
    st.syncApply(st.syncMerge(st.syncSnapshot(), bad));
    assert.ok(st.isSaved('mine'));
    assert.deepStrictEqual(st.syncClean(bad).v, 1);
  }
  assert.deepStrictEqual(factory(fakeStorage()).syncClean({ v: 1, data: { saved: [1, null, 'ok', 'ok'] } }).data.saved, ['ok']);

  // apply does not emit stamps; reset clears them
  const ls2 = fakeStorage(), C = factory(ls2);
  C.syncApply({ v: 1, data: { saved: ['x'] }, stamps: { 'saved|x': 5 } });
  assert.deepStrictEqual(C.syncSnapshot().stamps, { 'saved|x': 5 });
  C.reset(); assert.deepStrictEqual(C.syncSnapshot().stamps, {});
  Date.now = realNow;
}

console.log('store.test.js: all passed');
