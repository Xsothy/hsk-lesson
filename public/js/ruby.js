/* Ruby lines: clicking a word opens a small word sheet (hanzi, pinyin, meaning, audio, character links). */
(function () {
  var sheet;
  function build() {
    sheet = document.createElement('dialog');
    sheet.className = 'word-sheet';
    sheet.setAttribute('aria-label', 'Word details');
    sheet.innerHTML = '<div class="ws-head"><span class="ws-zh zh" lang="zh-CN"></span>' +
      '<button type="button" class="icon-btn ws-say" aria-label="Play word">🔊</button>' +
      '<button type="button" class="icon-btn ws-close" aria-label="Close">✕</button></div>' +
      '<div class="ws-py"></div><div class="ws-en"></div><div class="ws-chars"></div>';
    sheet.querySelector('.ws-close').addEventListener('click', function () { sheet.close(); });
    sheet.addEventListener('click', function (e) { if (e.target === sheet) sheet.close(); });
    document.body.appendChild(sheet);
  }
  function open(btn) {
    if (!sheet) build();
    var w = btn.getAttribute('data-word');
    sheet.querySelector('.ws-zh').textContent = w;
    sheet.querySelector('.ws-say').setAttribute('data-say', w);
    var py = sheet.querySelector('.ws-py');
    py.innerHTML = btn.querySelector('rt') ? btn.querySelector('rt').innerHTML : '';
    sheet.querySelector('.ws-en').textContent = btn.getAttribute('data-en') || '';
    var chars = sheet.querySelector('.ws-chars');
    chars.innerHTML = '';
    Array.from(w).forEach(function (c) {
      var a = document.createElement('a');
      a.className = 'chip';
      a.href = '/char/' + encodeURIComponent(c);
      a.textContent = c + ' →';
      chars.appendChild(a);
    });
    if (sheet.showModal) sheet.showModal(); else sheet.setAttribute('open', '');
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.rl-word');
    if (b) open(b);
  });
})();
