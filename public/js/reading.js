/* Reading page: pinyin/English toggles and quiz. */
(function () {
  var S = window.HSK_STORE;
  function toggle(btn, cls) {
    if (!btn) return;
    btn.addEventListener('click', function () {
      var on = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(on));
      btn.classList.toggle('is-active', on);
      document.getElementById('reading-lines').classList.toggle(cls, !on);
    });
  }
  toggle(document.getElementById('tg-pinyin'), 'hide-py');
  toggle(document.getElementById('tg-en'), 'hide-en');

  var quiz = document.getElementById('quiz');
  if (!quiz) return;
  var total = parseInt(quiz.getAttribute('data-total'), 10), score = 0, done = 0;
  var prev = S && S.getQuiz(quiz.getAttribute('data-key'));
  if (prev) { var sc = document.getElementById('score'); sc.hidden = false; sc.textContent = 'Last score: ' + prev.score + '/' + prev.total; }

  [].forEach.call(quiz.querySelectorAll('.question'), function (q) {
    var answer = parseInt(q.getAttribute('data-answer'), 10), opts = [].slice.call(q.querySelectorAll('.quiz-option'));
    opts.forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (q.getAttribute('data-done')) return;
        q.setAttribute('data-done', '1');
        var i = parseInt(btn.getAttribute('data-i'), 10), ok = i === answer;
        opts.forEach(function (o, k) {
          o.disabled = true;
          o.classList.remove('qo-idle');
          if (k === answer) o.classList.add('qo-correct');
          else if (o === btn) o.classList.add('qo-wrong');
          else o.classList.add('qo-disabled');
          if (k === answer || o === btn) {
            var m = document.createElement('span'); m.className = 'qo-mark'; m.setAttribute('role', 'img');
            m.setAttribute('aria-label', k === answer ? 'Correct' : 'Wrong'); m.textContent = k === answer ? '✓' : '✗';
            o.appendChild(m);
          }
        });
        q.querySelector('.feedback').textContent = ok ? 'Correct!' : 'Not quite — the answer is ' + opts[answer].querySelector('.qo-label').textContent + '.';
        if (ok) score++;
        if (++done === total) {
          var el = document.getElementById('score');
          el.hidden = false; el.textContent = 'Score: ' + score + '/' + total;
          if (S) S.recordQuiz(quiz.getAttribute('data-key'), score, total);
        }
      });
    });
  });
})();
