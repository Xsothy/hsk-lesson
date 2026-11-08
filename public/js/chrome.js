(function () {
  var menus = [].slice.call(document.querySelectorAll('.menu'));
  function close(m) { m.classList.remove('open'); m.querySelector('.menu-btn').setAttribute('aria-expanded', 'false'); }
  menus.forEach(function (m) {
    var b = m.querySelector('.menu-btn');
    b.addEventListener('click', function () {
      var open = !m.classList.contains('open');
      menus.forEach(function (o) { if (o !== m) close(o); });
      m.classList.toggle('open', open);
      b.setAttribute('aria-expanded', String(open));
    });
    m.addEventListener('keydown', function (e) { if (e.key === 'Escape') { close(m); b.focus(); } });
    m.addEventListener('focusout', function (e) { if (!m.contains(e.relatedTarget)) close(m); });
  });
  document.addEventListener('click', function (e) { menus.forEach(function (m) { if (!m.contains(e.target)) close(m); }); });
})();
