/* F1 Textbooks: import the user's own word list (paste / CSV), fill gaps from the server, keep lists in HSK_STORE.
   Line formats: "hanzi" | "hanzi,pinyin,meaning" (comma, tab or full-width comma). Header rows (no Chinese) are skipped. */
(function () {
  var S = window.HSK_STORE, root = document.querySelector('[data-textbooks]');
  if (!S || !root) return;
  var $ = function (id) { return document.getElementById(id); };
  var HAN = /[㐀-鿿]/;

  function splitLine(line) {
    var cells = [], cur = '', q = false, i, c;
    for (i = 0; i < line.length; i++) {
      c = line[i];
      if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true;
      else if (c === ',' || c === '\t' || c === '，') { cells.push(cur); cur = ''; }
      else cur += c;
    }
    cells.push(cur);
    return cells.map(function (x) { return x.trim(); });
  }
  function parse(text) {
    var seen = {}, out = [];
    String(text || '').replace(/^﻿/, '').split(/\r?\n/).forEach(function (line) {
      if (!line.trim()) return;
      var c = splitLine(line), h = c[0];
      if (!h || !HAN.test(h) || h.length > 24 || seen[h]) return;
      seen[h] = 1;
      out.push({ h: h, p: c[1] || '', e: c.slice(2).join(', ') });
    });
    return out;
  }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function status(t) { $('tb-status').textContent = t || ''; }

  function lookup(words) {
    var need = words.filter(function (w) { return !w.p || !w.e; });
    if (!need.length) return Promise.resolve(words);
    var tok = document.querySelector('meta[name="csrf-token"]');
    return fetch('/textbooks/lookup', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': tok ? tok.content : '' },
      body: JSON.stringify({ words: need.map(function (w) { return w.h; }) }) })
      .then(function (r) { return r.ok ? r.json() : { results: {} }; })
      .then(function (j) { var m = j.results || {}; words.forEach(function (w) { var r = m[w.h]; if (r) { w.p = w.p || r.p; w.e = w.e || r.e; } }); return words; })
      .catch(function () { return words; });
  }

  function doImport() {
    var words = parse($('tb-text').value).slice(0, 300);
    if (!words.length) return status('No Chinese words found. Put one word per line, or hanzi,pinyin,meaning.');
    var name = $('tb-name').value.trim() || 'My list ' + (Object.keys(S.getLists()).length + 1);
    $('tb-import').disabled = true; status('Looking up pinyin and meanings…');
    lookup(words).then(function (ws) {
      S.saveList(name, ws);
      $('tb-text').value = ''; $('tb-name').value = '';
      status('Imported ' + ws.length + ' word' + (ws.length === 1 ? '' : 's') + ' into “' + name + '”.');
      render();
    }).then(function () { $('tb-import').disabled = false; });
  }

  function render() {
    var box = $('tb-lists'), lists = S.getLists(), ids = Object.keys(lists).sort(function (a, b) { return (lists[b].at || 0) - (lists[a].at || 0); });
    box.textContent = ''; $('tb-empty').hidden = ids.length > 0;
    var cl = $('tb-count-lists'), cw = $('tb-count-words');
    if (cl) {
      var all = {}; ids.forEach(function (id) { (lists[id].words || []).forEach(function (w) { all[w.hanzi || w] = 1; }); });
      var ws = Object.keys(all), kn = document.querySelector('.cr-known');
      cl.textContent = ids.length; cw.textContent = ws.length || '—';
      if (kn) kn.textContent = ws.length ? ws.filter(S.isKnown).length : '—';
    }
    ids.forEach(function (id) {
      var l = lists[id], sec = el('section', 'tb-list'), head = el('div', 'tb-head');
      head.appendChild(el('h2', null, l.name));
      head.appendChild(el('span', 'muted', l.words.length + ' word' + (l.words.length === 1 ? '' : 's')));
      sec.appendChild(head);
      var acts = el('div', 'tb-actions');
      var a1 = el('a', 'btn btn-primary tb-practice', 'Practice'); a1.href = '/practice?source=list&id=' + encodeURIComponent(id);
      var a2 = el('a', 'btn tb-review', 'Review'); a2.href = '/review?source=list&id=' + encodeURIComponent(id);
      var ren = el('button', 'btn tb-rename', 'Rename'); ren.type = 'button';
      ren.addEventListener('click', function () {
        var n = window.prompt('Rename list', l.name);
        if (n != null && n.trim()) { S.renameList(id, n); render(); }
      });
      var del = el('button', 'btn tb-delete', 'Delete'); del.type = 'button';
      del.addEventListener('click', function () {
        if (window.confirm('Delete “' + l.name + '”? This cannot be undone.')) { S.deleteList(id); render(); }
      });
      [a1, a2, ren, del].forEach(function (n) { acts.appendChild(n); });
      sec.appendChild(acts);
      var det = el('details', 'tb-words'); det.appendChild(el('summary', null, 'Show words'));
      var tpl = $('tb-row');
      l.words.slice(0, 200).forEach(function (w) {
        var row = tpl.content.firstElementChild.cloneNode(true);
        row.querySelector('.wr-zh').textContent = w.h;
        row.querySelector('.wr-py').textContent = w.p;
        row.querySelector('.wr-en').textContent = w.e;
        det.appendChild(row);
      });
      sec.appendChild(det); box.appendChild(sec);
    });
  }

  $('tb-import').addEventListener('click', doImport);
  $('tb-file').addEventListener('change', function (ev) {
    var f = ev.target.files && ev.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      $('tb-text').value = String(r.result || '');
      if (!$('tb-name').value) $('tb-name').value = f.name.replace(/\.[^.]+$/, '');
      status('Loaded ' + f.name + '. Check it, then tap Import list.');
    };
    r.readAsText(f); ev.target.value = '';
  });
  window.addEventListener('hsk:sync', render);
  render();
})();
