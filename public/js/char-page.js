/**
 * Character page: char.html?c=学
 * Data: /data/char/{c}.json (Laravel, merged reference data + our lessons).
 * Strokes, animation and writing quiz: Hanzi Writer.
 */
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const pinyinHTML = (p) => (window.HSK_UTILS?.colorizePinyin ? window.HSK_UTILS.colorizePinyin(p || '') : esc(p));
  const speak = (t) => window.HSK_UTILS?.speakChinese ? window.HSK_UTILS.speakChinese(t) : window.HSK_AUDIO?.speak?.(t);
  const charHref = (c) => `char.html?c=${encodeURIComponent(c)}`;
  const PLAY_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

  let writer = null;
  let mode = 'watch';
  let speedIdx = 1;
  const SPEEDS = [0.5, 1, 2];
  let outlineOn = true;
  let nextStroke = 0;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    const params = new URLSearchParams(location.search);
    const c = (params.get('c') || '学').trim();
    const back = $('#cp-back');
    if (document.referrer && new URL(document.referrer).origin === location.origin) {
      back.addEventListener('click', (e) => { e.preventDefault(); history.back(); });
    }
    $('#cp-search').addEventListener('submit', (e) => {
      e.preventDefault();
      const v = $('#cp-q').value.trim();
      if (v) location.href = charHref(Array.from(v)[0]);
    });
    load(Array.from(c)[0]);
  }

  async function load(c) {
    const status = $('#cp-status');
    try {
      const res = await fetch(`data/char/${encodeURIComponent(c)}.json`, { headers: { Accept: 'application/json' } });
      if (res.status === 404) { status.textContent = `No entry yet for "${c}".`; return; }
      if (!res.ok) throw new Error(res.status);
      render((await res.json()).data);
    } catch (err) {
      status.textContent = 'Could not load this character. Check your connection and try again.';
    }
  }

  function render(d) {
    document.title = `${d.char} (${(d.pinyin || []).join(', ')}) · 汉字课堂`;
    const main = $('#cp-main');
    main.replaceChildren($('#cp-template').content.cloneNode(true));
    const slot = (n) => main.querySelector(`[data-slot="${n}"]`);

    slot('char').textContent = d.char;
    slot('char').lang = 'zh-Hans';
    slot('pinyin').innerHTML = (d.pinyin || []).map(pinyinHTML).join(' · ');
    slot('definition').textContent = d.lesson_word?.english || d.definition || '';
    const badges = [];
    if (d.hsk2_level) badges.push(`<span class="cp-badge">HSK 2.0 · ${d.hsk2_level}</span>`);
    if (d.hsk3_level) badges.push(`<span class="cp-badge alt">HSK 3.0 · ${d.hsk3_level === 7 ? '7–9' : d.hsk3_level}</span>`);
    slot('badges').innerHTML = badges.join('');
    main.querySelector('[data-action="speak"]').addEventListener('click', () => speak(d.char));

    // Our differentiator: where it's taught
    slot('lessons').innerHTML = d.lessons.length
      ? d.lessons.map((l) => `<a class="cp-lesson" href="lesson.html?slug=${encodeURIComponent(l.slug)}"><span><b lang="zh-Hans">${esc(l.zh_title)}</b><small>Lesson ${l.number} · ${esc(l.en_title)}</small></span>${l.in_vocab ? '<span class="tag">vocab</span>' : ''}</a>`).join('')
      : '<p class="cp-empty">Not in a lesson yet — a good candidate for a new one.</p>';

    // Facts
    const facts = [
      ['Pinyin', (d.pinyin || []).join(', ')],
      ['Meaning', d.definition],
      ['Radical', d.radical ? `<a href="${charHref(d.radical)}" lang="zh-Hans">${esc(d.radical)}</a>` : null, true],
      ['Parts', d.decomposition && !d.decomposition.includes('？') ? d.decomposition : null],
      ['Unicode', d.unicode],
    ].filter((f) => f[1]);
    slot('facts').innerHTML = facts.map(([k, v, raw]) => `<dt>${k}</dt><dd>${raw ? v : esc(v)}</dd>`).join('');
    if (d.lesson_word?.literal) slot('etymology').textContent = d.lesson_word.literal;
    else if (d.etymology?.hint) slot('etymology').textContent = `${capital(d.etymology.type || '')}: ${d.etymology.hint}`;

    // Words containing it
    if (d.words.length) {
      slot('words').innerHTML = d.words.map((w) => `
        <li><a class="zh" lang="zh-Hans" href="${charHref(Array.from(w.word).find((ch) => ch !== d.char) || d.char)}">${esc(w.word)}</a>
          <span class="meta"><span>${pinyinHTML(w.pinyin)}</span><span>${esc(w.meaning)}</span></span>
          ${w.hsk3_level ? `<span class="lvl">HSK ${w.hsk3_level === 7 ? '7–9' : w.hsk3_level}</span>` : ''}
          <button class="cp-play" type="button" data-say="${esc(w.word)}" aria-label="Play ${esc(w.word)}">${PLAY_ICON}</button></li>`).join('');
    } else slot('words-card').hidden = true;

    // Examples from our lessons
    if (d.examples.length) {
      slot('examples').innerHTML = d.examples.map((s) => `
        <li><span class="meta"><span class="zh" lang="zh-Hans">${highlight(s.zh, d.char)}</span><span>${esc(s.en)}</span>
          <span class="src">${s.href ? `<a href="${esc(s.href)}">${esc(s.source)}</a>` : esc(s.source)}</span></span>
          <button class="cp-play" type="button" data-say="${esc(s.zh)}" aria-label="Play sentence">${PLAY_ICON}</button></li>`).join('');
    } else slot('examples-card').hidden = true;

    // Related
    const groups = [['Same radical', d.related.same_radical], ['Same sound', d.related.same_sound], ['Same HSK level', d.related.same_level]]
      .filter(([, list]) => list && list.length);
    slot('related').innerHTML = groups.map(([title, list]) => `
      <div class="cp-rel-group"><span class="cp-rel-title">${title}</span><div class="cp-rel">
        ${list.map((r) => `<a href="${charHref(r.char)}" title="${esc(r.meaning)}"><b lang="zh-Hans">${esc(r.char)}</b><small>${esc(r.pinyin)}</small></a>`).join('')}
      </div></div>`).join('') || '<p class="cp-empty">No related characters found.</p>';

    main.addEventListener('click', (e) => {
      const say = e.target.closest('[data-say]');
      if (say) speak(say.dataset.say);
    });

    setupStrokes(d.char, main);
  }

  function setupStrokes(c, main) {
    const target = $('#cp-writer');
    const feedback = $('#cp-feedback');
    const size = Math.round(target.getBoundingClientRect().width) || 280;

    const create = () => {
      target.replaceChildren();
      writer = HanziWriter.create(target, c, {
        width: size, height: size, padding: 16,
        strokeColor: getComputedStyle(document.body).getPropertyValue('--ink').trim() || '#0f0c08',
        radicalColor: '#b8892e', highlightColor: '#b5302a', outlineColor: '#d6cdbf', drawingColor: '#b5302a',
        showOutline: true, showCharacter: mode === 'watch',
        strokeAnimationSpeed: SPEEDS[speedIdx], delayBetweenStrokes: 250,
        onLoadCharDataSuccess: (data) => {
          main.querySelector('[data-slot="stroke-count"]').textContent = `${data.strokes.length} strokes`;
          renderDiagrams(data.strokes);
        },
        onLoadCharDataError: () => { feedback.textContent = 'Stroke data not available for this character.'; },
      });
      if (mode === 'watch') writer.animateCharacter();
      else startQuiz();
    };

    const startQuiz = () => {
      nextStroke = 0;
      outlineOn ? writer.showOutline() : writer.hideOutline();
      feedback.className = 'cp-feedback';
      feedback.textContent = 'Write the first stroke.';
      writer.quiz({
        showHintAfterMisses: 3,
        onMistake: () => { feedback.className = 'cp-feedback bad'; feedback.textContent = 'Not quite — try that stroke again.'; },
        onCorrectStroke: (s) => {
          nextStroke = s.strokeNum + 1;
          feedback.className = 'cp-feedback ok';
          feedback.textContent = `Stroke ${s.strokeNum + 1} ✓ · ${s.strokesRemaining} to go`;
        },
        onComplete: (s) => {
          feedback.className = 'cp-feedback ok';
          feedback.textContent = s.totalMistakes ? `Done with ${s.totalMistakes} mistake${s.totalMistakes > 1 ? 's' : ''}. Retry to improve.` : 'Perfect! No mistakes.';
        },
      });
    };

    main.querySelectorAll('.cp-tab').forEach((tab) => tab.addEventListener('click', () => {
      mode = tab.dataset.mode;
      main.querySelectorAll('.cp-tab').forEach((t) => { t.classList.toggle('is-on', t === tab); t.setAttribute('aria-selected', t === tab); });
      main.querySelector('[data-group="watch"]').hidden = mode !== 'watch';
      main.querySelector('[data-group="write"]').hidden = mode !== 'write';
      feedback.textContent = '';
      create();
    }));

    main.querySelector('[data-group="watch"]').addEventListener('click', (e) => {
      const a = e.target.closest('[data-action]')?.dataset.action;
      if (a === 'play') { writer.showCharacter(); writer.animateCharacter(); }
      if (a === 'pause') writer.pauseAnimation();
      if (a === 'speed') {
        speedIdx = (speedIdx + 1) % SPEEDS.length;
        e.target.textContent = `Speed ${SPEEDS[speedIdx]}×`;
        create();
      }
    });

    main.querySelector('[data-group="write"]').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'hint') writer.highlightStroke(nextStroke);
      if (btn.dataset.action === 'outline') {
        outlineOn = !outlineOn;
        outlineOn ? writer.showOutline() : writer.hideOutline();
        btn.textContent = `Outline: ${outlineOn ? 'on' : 'off'}`;
      }
      if (btn.dataset.action === 'retry') startQuiz();
    });

    create();
  }

  function renderDiagrams(strokes) {
    const box = $('#cp-diagrams');
    const NS = 'http://www.w3.org/2000/svg';
    const { transform } = HanziWriter.getScalingTransform(100, 100, 6);
    const ink = getComputedStyle(document.body).getPropertyValue('--ink').trim() || '#0f0c08';
    box.replaceChildren(...strokes.map((_, i) => {
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', `Stroke ${i + 1} of ${strokes.length}`);
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('transform', transform);
      strokes.slice(0, i + 1).forEach((d, j) => {
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('d', d);
        p.setAttribute('fill', j === i ? '#b5302a' : ink);
        if (j !== i) p.setAttribute('opacity', '.55');
        g.appendChild(p);
      });
      svg.appendChild(g);
      return svg;
    }));
  }

  function highlight(text, c) {
    return esc(text).split(esc(c)).join(`<mark style="background:#f7ecd2;color:inherit;border-radius:3px">${esc(c)}</mark>`);
  }

  function capital(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
})();
