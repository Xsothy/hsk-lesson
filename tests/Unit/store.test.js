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

console.log('store.test.js: all passed');
