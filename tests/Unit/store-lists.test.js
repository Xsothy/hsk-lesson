// F1 textbook lists in the store + S2 sync. Run: node tests/Unit/store-lists.test.js
const assert = require('assert');
const factory = require('../../public/js/store.js');
function fakeStorage(init) {
  const m = Object.assign({}, init);
  return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } };
}

const realNow = Date.now;
let clock = 5_000_000;
Date.now = () => clock;
const A = factory(fakeStorage()), B = factory(fakeStorage());
const sync = (x, y) => { const m = x.syncMerge(x.syncSnapshot(), y.syncSnapshot()); x.syncApply(m); y.syncApply(m); return m; };

assert.deepStrictEqual(A.getLists(), {});
const id = A.saveList('Book 1', [{ h: '学习', p: 'xué xí', e: 'to study' }, { h: '学习' }, { h: '  ' }, { h: '你好' }]);
assert.deepStrictEqual(A.getList(id).words, [{ h: '学习', p: 'xué xí', e: 'to study' }, { h: '你好', p: '', e: '' }]);
assert.ok(A.syncSnapshot().stamps['lists|' + id] > 0);

sync(A, B);
assert.strictEqual(B.getList(id).name, 'Book 1');
clock += 10; B.renameList(id, 'Renamed'); sync(A, B);
assert.strictEqual(A.getList(id).name, 'Renamed');
clock += 10; A.deleteList(id); sync(A, B);
assert.deepStrictEqual(B.getLists(), {}); // delete wins over the older copy

clock += 10;
const id2 = B.saveList('Other', [{ h: '朋友' }]), idA = A.saveList('Mine', [{ h: '我' }]);
sync(A, B);
assert.deepStrictEqual(Object.keys(A.getLists()).sort(), [id2, idA].sort());
const ab = A.syncMerge(A.syncSnapshot(), B.syncSnapshot()), ba = A.syncMerge(B.syncSnapshot(), A.syncSnapshot());
assert.strictEqual(JSON.stringify(ab), JSON.stringify(ba)); // symmetric
assert.strictEqual(JSON.stringify(A.syncMerge(ab, ab)), JSON.stringify(ab)); // idempotent

// an old snapshot without lists never wipes lists; corrupt lists are dropped
assert.strictEqual(Object.keys(A.syncMerge(A.syncSnapshot(), { v: 1, data: { saved: ['x'] } }).data.lists).length, 2);
assert.deepStrictEqual(A.syncClean({ v: 1, data: { lists: { a: 5, b: { name: 'x', words: 'no' }, c: { name: 'ok', words: [{ h: '好' }, 3] } } } }).data.lists,
  { c: { name: 'ok', words: [{ h: '好', p: '', e: '' }], at: 0 } });

// export/import round trip, reset
const C = factory(fakeStorage());
assert.ok(C.importAll(A.exportAll()));
assert.strictEqual(Object.keys(C.getLists()).length, 2);
C.reset(); assert.deepStrictEqual(C.getLists(), {});
Date.now = realNow;
console.log('store-lists.test.js: all passed');
