// Theme feature settings in the store + S2 sync. Run: node tests/Unit/store-theme.test.js
const assert = require('assert');
const factory = require('../../public/js/store.js');
function fakeStorage(init) {
  const m = Object.assign({}, init);
  return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: k => { delete m[k]; } };
}
let clock = 5_000_000; Date.now = () => clock;
const A = factory(fakeStorage()), B = factory(fakeStorage());

// Defaults are the Paper preset
const d = A.getSettings();
assert.deepStrictEqual([d.themePreset, d.themeBase, d.themeAccent, d.themeRadius, d.fontHead, d.fontBody, d.fontZh], ['paper', 'warm', 'red', 16, 'outfit', 'outfit', 'serif']);
// Valid values stick, invalid ones are ignored
A.setSettings({ themeBase: 'slate', themeAccent: 'amber', themeRadius: 8, fontZh: 'brush', themePreset: 'midnight' });
A.setSettings({ themeBase: 'neon', themeRadius: 13, fontHead: 'comic', themeAccent: 'pink' });
let s = A.getSettings();
assert.deepStrictEqual([s.themeBase, s.themeAccent, s.themeRadius, s.fontHead, s.fontZh, s.themePreset], ['slate', 'amber', 8, 'outfit', 'brush', 'midnight']);
// Corrupt stored values fall back to defaults
const C = factory(fakeStorage({ 'hsk.v1.settings': JSON.stringify({ themeBase: 42, themeRadius: '8', fontBody: null }) }));
s = C.getSettings();
assert.deepStrictEqual([s.themeBase, s.themeRadius, s.fontBody], ['warm', 16, 'outfit']);
// Sync: B picks a theme later than A, B wins per key
clock += 1000; B.setSettings({ themeBase: 'zinc', themeAccent: 'plum', themePreset: 'plum' });
const m = A.syncMerge(A.syncSnapshot(), B.syncSnapshot()); A.syncApply(m); B.syncApply(m);
assert.strictEqual(A.getSettings().themeBase, 'zinc');
assert.strictEqual(A.getSettings().themeAccent, 'plum');
assert.strictEqual(A.getSettings().themeRadius, 8); // only A changed radius, so A's value survives
assert.deepStrictEqual(A.getSettings(), B.getSettings());
console.log('store-theme.test.js: all passed');
