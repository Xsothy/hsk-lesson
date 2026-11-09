/* Character parts: "Add to flashcards" saves the example characters to My words (the review deck). */
(function () {
  var b = document.querySelector('[data-add-cards]');
  if (!b) return;
  var S = window.HSK_STORE;
  var chars = b.getAttribute('data-add-cards').split(',').filter(Boolean);
  function paint() {
    var all = false;
    try { all = !!S && chars.length > 0 && chars.every(function (c) { return S.isSaved(c); }); } catch (e) {}
    b.setAttribute('aria-pressed', String(all));
    b.textContent = all ? 'Added to flashcards' : 'Add to flashcards';
  }
  b.addEventListener('click', function () {
    try { chars.forEach(function (c) { if (!S.isSaved(c)) S.saveWord(c); }); } catch (e) {}
    paint();
  });
  paint();
})();
