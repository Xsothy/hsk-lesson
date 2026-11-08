/* S2 · Cross-device sync. Loaded by the layout only for signed-in users.
   Pull → merge (store.syncMerge) → apply locally → push if the server copy differs. The push names the revision it
   merged against; on 409 we pull and merge again. Runs on load (covers "just signed in"), 1.5 s after a change,
   and when the window regains focus. Offline or failing requests leave local data untouched. */
(function () {
  var me = document.currentScript, csrf = me && me.getAttribute('data-csrf');
  var DEBOUNCE = 1500, timer = null, running = false, again = false;
  var status = { state: 'idle', at: null, error: null };
  window.HSK_SYNC = { status: function () { return status; }, now: function () { return run(); } };

  function setStatus(state, error) {
    status = { state: state, at: state === 'synced' ? Date.now() : status.at, error: error || null };
    if (state === 'synced') try { localStorage.setItem('hsk.v1.syncedAt', JSON.stringify(status.at)); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('hsk:sync', { detail: status })); } catch (e) {}
  }
  try { status.at = JSON.parse(localStorage.getItem('hsk.v1.syncedAt')) || null; } catch (e) {}

  function req(method, body) {
    return fetch('/sync', {
      method: method, credentials: 'same-origin',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf || '', 'X-Requested-With': 'XMLHttpRequest' },
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, body: j || {} }; });
    });
  }

  function once(store, tries) {
    return req('GET').then(function (res) {
      if (res.status !== 200) throw new Error('pull ' + res.status);
      var remote = res.body.state, rev = typeof res.body.rev === 'number' ? res.body.rev : 0;
      var merged = store.syncMerge(store.syncSnapshot(), remote);
      store.syncApply(merged);
      if (remote && JSON.stringify(store.syncClean(remote)) === JSON.stringify(merged)) return true;
      return req('POST', { rev: rev, state: merged }).then(function (p) {
        if (p.status === 200) return true;
        if (p.status === 409 && tries > 0) return once(store, tries - 1);
        throw new Error('push ' + p.status);
      });
    });
  }

  function run() {
    var store = window.HSK_STORE;
    if (!store || !store.syncMerge) return Promise.resolve(false);
    if (running) { again = true; return Promise.resolve(false); }
    running = true; setStatus('syncing');
    return once(store, 3).then(function () { setStatus('synced'); return true; }, function (e) {
      setStatus(navigator.onLine === false ? 'offline' : 'error', String(e && e.message || e)); return false;
    }).then(function (ok) {
      running = false;
      if (again) { again = false; schedule(); }
      return ok;
    });
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(run, DEBOUNCE); }

  // Settings page: "Signed in as … · <status>".
  function ago(t) { var m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : new Date(t).toLocaleString(); }
  function paint() {
    var el = document.getElementById('st-sync-status'); if (!el) return;
    var s = status, txt = s.state === 'syncing' ? 'Syncing…' : s.state === 'offline' ? 'Offline — will sync when back online'
      : s.state === 'error' ? 'Sync failed — will retry' : s.at ? 'Synced ' + ago(s.at) : 'Sync on';
    el.textContent = txt; el.setAttribute('data-state', s.state);
  }
  window.addEventListener('hsk:sync', paint);
  setInterval(paint, 30000);

  function start() {
    window.addEventListener('hsk:change', schedule);
    window.addEventListener('focus', function () { run(); });
    window.addEventListener('online', function () { run(); });
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') run(); });
    run();
  }
  // Pages without the store (e.g. /account) load it so the first sync after sign-in still happens.
  if (window.HSK_STORE) start();
  else {
    var s = document.createElement('script'); s.src = '/js/store.js'; s.onload = start; document.head.appendChild(s);
  }
})();
