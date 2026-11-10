/* Play feedback: small animations shared by Review, Match, Sentences, Write and the reading quiz. Styles in fx.css.
   Everything is a no-op when the user asks for reduced motion. */
(function () {
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduced() { return !!(mq && mq.matches); }

  // Restart a one-shot CSS animation class on an element.
  function play(el, cls) {
    if (!el || reduced()) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    el.addEventListener('animationend', function done() { el.classList.remove(cls); el.removeEventListener('animationend', done); });
  }
  function pop(el) { play(el, 'fx-pop'); }
  function shake(el) { play(el, 'fx-shake'); }
  function bump(el) { play(el, 'fx-bump'); }

  // Count a number up from 0 (e.g. session stats). `fmt` turns the running value into text.
  function countUp(el, to, fmt) {
    fmt = fmt || String;
    if (!el) return;
    if (reduced() || !to || !window.requestAnimationFrame) { el.textContent = fmt(to); return; }
    var t0 = null, ms = 700;
    (function step(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / ms);
      el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    })(performance.now());
  }

  // Confetti burst from the top-centre of the viewport. Decorative only (aria-hidden, no pointer events).
  var COLORS = ['var(--red)', 'var(--green)', 'var(--gold)', 'var(--blue)', 'var(--orange)'];
  function confetti(n) {
    if (reduced()) return;
    var old = document.querySelector('.fx-confetti'); if (old) old.remove();
    var box = document.createElement('div');
    box.className = 'fx-confetti'; box.setAttribute('aria-hidden', 'true');
    n = n || 60;
    for (var i = 0; i < n; i++) {
      var p = document.createElement('i');
      p.style.setProperty('--x', (Math.random() * 100 - 50).toFixed(1) + 'vw');
      p.style.setProperty('--r', Math.round(Math.random() * 1080 - 540) + 'deg');
      p.style.setProperty('--d', (1.4 + Math.random() * 1.4).toFixed(2) + 's');
      p.style.setProperty('--w', (6 + Math.random() * 6).toFixed(0) + 'px');
      p.style.background = COLORS[i % COLORS.length];
      p.style.animationDelay = (Math.random() * 0.25).toFixed(2) + 's';
      if (i % 3 === 0) p.style.borderRadius = '50%';
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 3400);
  }

  // A short message that floats up and fades (e.g. "5 in a row").
  function toast(parent, text) {
    if (!parent || reduced()) return;
    var t = document.createElement('span');
    t.className = 'fx-toast'; t.setAttribute('aria-hidden', 'true'); t.textContent = text;
    parent.appendChild(t);
    setTimeout(function () { t.remove(); }, 1300);
  }

  window.HSK_FX = { reduced: reduced, pop: pop, shake: shake, bump: bump, countUp: countUp, confetti: confetti, toast: toast };

  // Write, Sentences and Match announce a finished session with this event; celebrate when something was done.
  window.addEventListener('hsk:practice-done', function (e) {
    var d = e.detail || {};
    if (d.done > 0) confetti(d.total && d.done >= d.total ? 70 : 36);
  });
})();
