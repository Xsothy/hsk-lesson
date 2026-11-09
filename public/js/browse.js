/* C2 · Browse: List/Grid toggle, All / To learn / Known filter (store.js), status dots, Practise link. */
(function () {
  var root = document.querySelector('.browse-results');
  if (!root) return;
  var S = window.HSK_STORE;
  var known = function (w) { try { return !!(S && S.isKnown(w)); } catch (e) { return false; } };
  var learning = function (w) { try { return !!(S && (S.srsGet(w) || S.isSaved(w))); } catch (e) { return false; } };
  var settings = function () { try { return (S && S.getSettings()) || {}; } catch (e) { return {}; } };
  var items = [].slice.call(root.querySelectorAll('[data-word]'));
  var practise = root.querySelector('.practise');
  var empty = root.querySelector('[data-empty]');
  var view = settings().browseView === 'grid' ? 'grid' : 'list';
  var filter = 'all';

  function press(attr, value) {
    [].forEach.call(root.querySelectorAll('[' + attr + ']'), function (b) {
      if (b.tagName === 'BUTTON') b.setAttribute('aria-pressed', String(b.getAttribute(attr) === value));
    });
  }

  function paintDots() {
    [].forEach.call(root.querySelectorAll('.char-tile[data-word] .dot'), function (dot) {
      var w = dot.parentNode.getAttribute('data-word');
      var st = known(w) ? 'known' : learning(w) ? 'learning' : 'new';
      dot.className = 'dot dot-' + st;
      dot.setAttribute('aria-label', { known: 'Known', learning: 'Learning', 'new': 'New' }[st]);
    });
  }

  function visibleWords() {
    var seen = {}, out = [];
    items.forEach(function (el) {
      var w = el.getAttribute('data-word');
      if (!el.classList.contains('is-filtered') && !seen[w]) { seen[w] = 1; out.push(w); }
    });
    return out;
  }

  function updatePractise() {
    if (!practise) return;
    var base = root.getAttribute('data-practice') || '';
    var params = base ? base.split('&') : [];
    if (filter !== 'all') params.push('filter=' + filter);
    if (!base) {
      var words = visibleWords().slice(0, 100);
      if (words.length) params.push('words=' + words.map(encodeURIComponent).join(','));
    }
    practise.href = '/practice' + (params.length ? '?' + params.join('&') : '');
    var none = !visibleWords().length;
    practise.classList.toggle('is-disabled', none);
    if (none) practise.setAttribute('aria-disabled', 'true'); else practise.removeAttribute('aria-disabled');
  }

  /** Status tag on list rows (Known / Due / New) and the counts on the filter buttons. */
  function paintStatus() {
    var seen = {}, nKnown = 0, nAll = 0;
    [].forEach.call(root.querySelectorAll('.word-row[data-word]'), function (row) {
      var w = row.getAttribute('data-word');
      var k = known(w), card = null;
      try { card = S && S.srsGet(w); } catch (e) {}
      var due = !k && !!card && card.due <= Date.now(), lrn = !k && !due && learning(w);
      var tag = row.querySelector('.bw-st');
      if (!tag) { tag = document.createElement('span'); row.appendChild(tag); }
      tag.className = 'wr-tag bw-st ' + (k ? 'is-known' : due ? 'is-due' : lrn ? 'is-learning' : 'is-new');
      tag.textContent = k ? 'Known' : due ? 'Due' : lrn ? 'Learning' : 'New';
      if (!seen[w]) { seen[w] = 1; nAll++; if (k) nKnown++; }
    });
    var put = function (k, n) { var el = root.querySelector('[data-count="' + k + '"]'); if (el) el.textContent = n; };
    put('all', nAll); put('known', nKnown); put('learn', nAll - nKnown);
  }

  function applyFilter() {
    items.forEach(function (el) {
      var k = known(el.getAttribute('data-word'));
      el.classList.toggle('is-filtered', filter === 'known' ? !k : filter === 'learn' ? k : false);
    });
    if (empty) empty.hidden = !items.length || visibleWords().length > 0;
    press('data-filter', filter);
    updatePractise();
  }

  function applyView() {
    [].forEach.call(root.querySelectorAll('[data-pane]'), function (p) { p.hidden = p.getAttribute('data-pane') !== view; });
    press('data-view', view);
  }

  root.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-filter], button[data-view]');
    if (b) {
      if (b.hasAttribute('data-filter')) { filter = b.getAttribute('data-filter'); applyFilter(); }
      else {
        view = b.getAttribute('data-view'); applyView();
        try { S && S.setSettings({ browseView: view }); } catch (err) {}
      }
      return;
    }
    if (practise && e.target.closest('.practise') && practise.getAttribute('aria-disabled')) e.preventDefault();
  });

  applyView();
  paintDots();
  paintStatus();
  applyFilter();
})();
