// F4 pinyin match scores in the store + S2 sync. Run: node tests/Unit/store-match.test.js
const assert = require('assert');
const factory = require('../../public/js/store.js');
function fakeStorage(init) {
  const m = Object.assign({}, init);
  return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } };
}
const realNow = Date.now;
let clock = 9_000_000;
Date.now = () => clock;
const A = factory(fakeStorage()), B = factory(fakeStorage());
const sync = (x, y) => { const m = x.syncMerge(x.syncSnapshot(), y.syncSnapshot()); x.syncApply(m); y.syncApply(m); return m; };

assert.deepStrictEqual(A.getMatch(), {});
assert.strictEqual(A.getMatch('lesson-1'), null);
let r = A.recordMatch('lesson-1', 50, 6, 5, 40000);
assert.ok(r.isBest);
assert.deepStrictEqual(A.getMatch('lesson-1'), { score: 50, pairs: 6, misses: 5, ms: 40000, at: clock });
// worse score keeps the old best; same score but faster replaces it
clock += 10; r = A.recordMatch('lesson-1', 40, 6, 10, 20000);
assert.ok(!r.isBest); assert.strictEqual(A.getMatch('lesson-1').score, 50);
clock += 10; r = A.recordMatch('lesson-1', 50, 6, 5, 30000);
assert.ok(r.isBest); assert.strictEqual(A.getMatch('lesson-1').ms, 30000);
assert.ok(Object.keys(A.getActivity()).length > 0); // playing counts as activity

// sync: best score survives from either side, new keys are unioned, merge is symmetric and idempotent
clock += 10;
B.recordMatch('lesson-1', 60, 6, 0, 50000);
B.recordMatch('saved', 20, 3, 5, 9000);
const m = sync(A, B);
assert.strictEqual(A.getMatch('lesson-1').score, 60);
assert.strictEqual(B.getMatch('saved').score, 20);
assert.deepStrictEqual(A.getMatch(), B.getMatch());
const ab = A.syncMerge(A.syncSnapshot(), B.syncSnapshot()), ba = A.syncMerge(B.syncSnapshot(), A.syncSnapshot());
assert.strictEqual(JSON.stringify(ab), JSON.stringify(ba));
assert.strictEqual(JSON.stringify(A.syncMerge(ab, ab)), JSON.stringify(ab));
assert.ok('match' in m.data);

// an old snapshot without match never wipes it; corrupt entries are dropped
assert.strictEqual(Object.keys(A.syncMerge(A.syncSnapshot(), { v: 1, data: { saved: ['x'] } }).data.match).length, 2);
assert.deepStrictEqual(A.syncClean({ v: 1, data: { match: { a: 5, b: { score: 'x' }, c: { score: 10, pairs: 3, misses: 1, ms: 100, at: 7 } } } }).data.match,
  { c: { score: 10, pairs: 3, misses: 1, ms: 100, at: 7 } });

// export/import round trip, reset
const C = factory(fakeStorage());
assert.ok(C.importAll(A.exportAll()));
assert.strictEqual(C.getMatch('lesson-1').score, 60);
C.reset(); assert.deepStrictEqual(C.getMatch(), {});
Date.now = realNow;
console.log('store-match.test.js: all passed');
