/* Settings page (E1). Persists through HSK_STORE; apply-settings.js applies the result live. */
(function () {
  var S = window.HSK_STORE;
  var $ = function (id) { return document.getElementById(id); };
  var status = $('st-status');
  if (!S) { if (status) { status.textContent = 'Settings are unavailable in this browser.'; status.className = 'st-status is-error'; } return; }

  function say(msg, kind) { status.textContent = msg; status.className = 'st-status ' + (kind ? 'is-' + kind : ''); }
  // radio-group value <-> stored value (toneColors is a boolean)
  var toStr = function (k, v) { return k === 'toneColors' ? (v ? 'on' : 'off') : String(v); };
  var fromStr = function (k, v) { return k === 'toneColors' ? v === 'on' : v; };

  function render() {
    var s = S.getSettings();
    document.querySelectorAll('[data-seg]').forEach(function (fs) {
      var k = fs.getAttribute('data-seg'), cur = toStr(k, s[k]);
      fs.querySelectorAll('input').forEach(function (i) { i.checked = i.value === cur; });
    });
    $('st-rate').value = s.audioRate; $('st-rate-out').textContent = s.audioRate.toFixed(1) + '×';
    $('st-goal').value = String(s.dailyGoal);
    if (!$('st-goal').value) { var o = document.createElement('option'); o.value = o.textContent = String(s.dailyGoal); $('st-goal').appendChild(o); $('st-goal').value = String(s.dailyGoal); }
    $('st-hint').value = String(s.hintAfterMisses);
    $('st-rv-first').value = ['zh', 'en', 'audio'].indexOf(s.reviewFirst) >= 0 ? s.reviewFirst : 'zh';
    $('st-rv-pinyin').value = s.reviewPinyinFront === true ? 'on' : 'off';
    $('st-rv-audio').value = s.reviewAudioReveal === false ? 'off' : 'on';
    if ($('st-voice').querySelector('option[value="' + s.voice.replace(/"/g, '\\"') + '"]')) $('st-voice').value = s.voice;
    else $('st-voice').value = '';
  }

  document.querySelectorAll('[data-seg]').forEach(function (fs) {
    fs.addEventListener('change', function (e) {
      var k = fs.getAttribute('data-seg'), p = {}; p[k] = fromStr(k, e.target.value); S.setSettings(p);
    });
  });
  $('st-rate').addEventListener('input', function () {
    var v = Math.round(parseFloat(this.value) * 10) / 10; $('st-rate-out').textContent = v.toFixed(1) + '×'; S.setSettings({ audioRate: v });
  });
  $('st-goal').addEventListener('change', function () { S.setSettings({ dailyGoal: parseInt(this.value, 10) }); });
  $('st-hint').addEventListener('change', function () { S.setSettings({ hintAfterMisses: parseInt(this.value, 10) }); });
  $('st-rv-first').addEventListener('change', function () { S.setSettings({ reviewFirst: this.value }); });
  $('st-rv-pinyin').addEventListener('change', function () { S.setSettings({ reviewPinyinFront: this.value === 'on' }); });
  $('st-rv-audio').addEventListener('change', function () { S.setSettings({ reviewAudioReveal: this.value === 'on' }); });
  $('st-voice').addEventListener('change', function () { S.setSettings({ voice: this.value }); });

  // Voices load asynchronously in most browsers.
  function fillVoices() {
    var sel = $('st-voice'), list = [];
    try { list = (window.HSK_AUDIO && window.HSK_AUDIO.getVoices()) || (window.speechSynthesis ? speechSynthesis.getVoices() : []); } catch (e) {}
    list = Array.prototype.slice.call(list).sort(function (a, b) {
      var za = /^zh/i.test(a.lang) ? 0 : 1, zb = /^zh/i.test(b.lang) ? 0 : 1;
      return za - zb || a.name.localeCompare(b.name);
    });
    while (sel.options.length > 1) sel.remove(1);
    list.forEach(function (v) { var o = document.createElement('option'); o.value = v.voiceURI; o.textContent = v.name + ' (' + v.lang + ')'; sel.appendChild(o); });
    $('st-voice-note').hidden = list.length > 0;
    render();
    if (window.HSK_APPLY_SETTINGS) window.HSK_APPLY_SETTINGS();
  }
  fillVoices();
  try { if (window.speechSynthesis) speechSynthesis.addEventListener('voiceschanged', fillVoices); } catch (e) {}

  $('st-test').addEventListener('click', function () {
    try { if (window.HSK_AUDIO) window.HSK_AUDIO.speak('你好'); } catch (e) { say('Could not play audio.', 'error'); }
  });

  // Data
  $('st-export').addEventListener('click', function () {
    try {
      var blob = new Blob([S.exportAll()], { type: 'application/json' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'hanzi-classroom-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      say('Backup downloaded.', 'ok');
    } catch (e) { say('Export failed.', 'error'); }
  });
  $('st-import').addEventListener('click', function () { $('st-file').click(); });
  $('st-file').addEventListener('change', function () {
    var f = this.files && this.files[0], input = this;
    if (!f) return;
    var done = function (text) {
      var ok = false;
      try { ok = S.importAll(text); } catch (e) {}
      say(ok ? 'Import complete. Your data has been restored.' : 'That file is not a valid backup. Nothing was changed.', ok ? 'ok' : 'error');
      render(); input.value = '';
    };
    if (f.size > 5 * 1024 * 1024) { say('That file is too large to be a backup. Nothing was changed.', 'error'); input.value = ''; return; }
    var r = new FileReader();
    r.onload = function () { done(String(r.result)); };
    r.onerror = function () { say('Could not read that file. Nothing was changed.', 'error'); input.value = ''; };
    r.readAsText(f);
  });

  var dlg = $('st-confirm');
  $('st-reset').addEventListener('click', function () {
    if (dlg.showModal) dlg.showModal();
    else if (window.confirm('Reset all data? This cannot be undone.')) doReset();
  });
  dlg.addEventListener('close', function () { if (dlg.returnValue === 'reset') doReset(); dlg.returnValue = ''; $('st-reset').focus(); });
  function doReset() { S.reset(); render(); say('All data has been reset.', 'ok'); }

  // Changes made in another tab
  window.addEventListener('storage', function (e) { if (!e.key || e.key === 'hsk.v1.settings') render(); });
  window.addEventListener('hsk:settings', render);
  render();
})();
