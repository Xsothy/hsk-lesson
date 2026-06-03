(function () {
function renderLessonList(container, lessons) {
  container.innerHTML = '';

  lessons.forEach((lesson, index) => {
    const previewFlag = lesson.isPreview ? '<span class="preview-badge">+ HSK 2 Preview</span>' : '';
    const card = document.createElement('a');
    card.className = 'lesson-card';
    card.href = `lesson.html?slug=${lesson.slug}`;
    card.style.animationDelay = `${index * 0.05}s`;
    card.innerHTML = `
      <div class="lesson-card-top">
        <div class="lesson-emoji" style="background:${lesson.color};">${lesson.emoji}</div>
        <div class="lesson-meta">
          <div class="lesson-num">Lesson ${lesson.id} of ${lessons.length}</div>
          <div class="lesson-title-zh">${lesson.zhTitle}${previewFlag}</div>
          <div class="lesson-title-en">${lesson.enTitle}</div>
        </div>
      </div>
      <div class="lesson-card-body">
        <div class="lesson-grammar-badge">${lesson.grammarLabel}</div>
        <div class="lesson-preview">${lesson.description}</div>
      </div>
      <div class="lesson-card-footer">
        <div class="lesson-words-count"><strong>${lesson.vocabularyCount}</strong> vocabulary words</div>
        <div class="lesson-arrow">→</div>
      </div>`;
    container.appendChild(card);
  });
}

function renderLessonDetail(lesson, totalLessons) {
  const previewFlag = lesson.isPreview
    ? '<span class="preview-badge">+ HSK 2 Preview</span>'
    : '<span class="core-badge">✓ HSK 1 Core</span>';

  document.title = `${lesson.title} · ${lesson.enTitle} · 汉字课堂`;
  document.getElementById('d-label').textContent = `Lesson ${lesson.id} of ${totalLessons} · HSK 1`;
  document.getElementById('d-title').innerHTML = `${lesson.emoji} ${lesson.zhTitle} ${previewFlag}`;
  document.getElementById('d-sub').textContent = `${lesson.enTitle} — ${lesson.description}`;

  const body = document.getElementById('d-body');
  body.innerHTML = '';

  body.appendChild(renderVocabularySection(lesson));
  body.appendChild(renderGrammarSection(lesson.grammar));
  body.appendChild(renderSentenceSection(lesson.sentences));
  body.appendChild(renderDialogueSection(lesson.dialogue));

  if (lesson.content) {
    const content = makeSection('📄', 'LESSON NOTES');
    const wrapper = document.createElement('div');
    wrapper.className = 'lesson-content';
    wrapper.innerHTML = lesson.content;
    content.appendChild(wrapper);
    body.appendChild(content);
  }
}

function renderVocabularySection(lesson) {
  const title = lesson.isPreview
    ? 'VOCABULARY · 词汇 <span class="section-note">★ = HSK 2 preview word</span>'
    : 'VOCABULARY · 词汇';
  const section = makeSection('📝', title);
  const list = document.createElement('div');
  list.className = 'vocab-list';

  lesson.vocab.forEach((word) => {
    const item = document.createElement('div');
    item.className = 'vocab-item';
    item.dataset.vocabWord = JSON.stringify(word);
    
    const audioBtn = window.HSK_UTILS.createAudioButton(word.c, 'sm');
    audioBtn.className = 'vocab-audio-btn';
    
    item.innerHTML = `
      ${word.preview ? '<span class="word-preview-star">★</span>' : ''}
      <span class="vocab-char ${word.preview ? 'is-preview' : ''}">${word.c}</span>
      <span class="vocab-pinyin">${word.p}</span>
      <span class="vocab-en">${word.e}</span>`;
    
    item.insertBefore(audioBtn, item.firstChild);
    list.appendChild(item);
  });

  section.appendChild(list);

  if (lesson.isPreview) {
    const note = document.createElement('div');
    note.className = 'preview-note';
    note.innerHTML = '★ Gold words are <strong>HSK 2 preview words</strong> — not required for HSK 1 but very useful in real conversation. They appear here naturally in context.';
    section.appendChild(note);
  }

  return section;
}

function renderGrammarSection(grammar) {
  const section = makeSection('📐', 'GRAMMAR PATTERNS · 语法');
  const box = document.createElement('div');
  box.className = 'grammar-box';

  grammar.forEach((grammarRule) => {
    const rule = document.createElement('div');
    rule.className = 'grammar-rule';
    rule.innerHTML = `
      <div class="grammar-rule-title">${grammarRule.title}</div>
      <div class="grammar-pattern">${grammarRule.pattern}</div>
      <div class="grammar-note">${grammarRule.note}</div>`;
    box.appendChild(rule);
  });

  section.appendChild(box);
  return section;
}

function renderSentenceSection(sentences) {
  const section = makeSection('✏️', 'EXAMPLE SENTENCES · 例句');
  const list = document.createElement('div');
  list.className = 'sentences-list';

  sentences.forEach((sentence) => {
    const item = document.createElement('div');
    item.className = 'sentence-item';
    
    const audioBtn = window.HSK_UTILS.createAudioButton(sentence.zh, 'sm');
    audioBtn.className = 'sentence-audio-btn';
    
    item.innerHTML = `
      <div>
        <div class="sentence-zh">${sentence.zh}</div>
        <div class="sentence-pinyin">${sentence.py}</div>
      </div>
      <div class="sentence-en">${sentence.en}</div>`;
    
    item.appendChild(audioBtn);
    list.appendChild(item);
  });

  section.appendChild(list);
  return section;
}

function renderDialogueSection(dialogue) {
  const section = makeSection('💬', 'DIALOGUE PRACTICE · 对话');
  const box = document.createElement('div');
  box.className = 'dialogue-box';

  dialogue.forEach((line) => {
    const item = document.createElement('div');
    item.className = 'dialogue-line';
    
    const audioBtn = window.HSK_UTILS.createAudioButton(line.zh, 'sm');
    audioBtn.className = 'dialogue-audio-btn';
    
    item.innerHTML = `
      <div class="dialogue-speaker ${line.speaker === 'A' ? 'speaker-a' : 'speaker-b'}">${line.speaker}</div>
      <div class="dialogue-content">
        <div class="dialogue-zh">${line.zh}</div>
        <div class="dialogue-pinyin">${line.py}</div>
        <div class="dialogue-en">${line.en}</div>
      </div>`;
    
    item.appendChild(audioBtn);
    box.appendChild(item);
  });

  section.appendChild(box);
  return section;
}

function renderDictionary(filtersContainer, grid, dictionary) {
  filtersContainer.innerHTML = '';
  grid.innerHTML = '';

  const allButton = document.createElement('button');
  allButton.className = 'dict-filter-btn active';
  allButton.type = 'button';
  allButton.textContent = 'All · 全部';
  allButton.dataset.cat = 'all';
  filtersContainer.appendChild(allButton);

  const categories = [...new Set(dictionary.words.map((word) => word.cat))];
  categories.forEach((category) => {
    const button = document.createElement('button');
    button.className = 'dict-filter-btn';
    button.type = 'button';
    button.textContent = dictionary.categories[category] || category;
    button.dataset.cat = category;
    filtersContainer.appendChild(button);
  });

  dictionary.words.forEach((word) => {
    const card = document.createElement('div');
    card.className = 'dict-card';
    card.dataset.cat = word.cat;
    card.dataset.char = word.c;
    card.dataset.pinyin = word.p.toLowerCase();
    card.dataset.english = word.e.toLowerCase();
    card.dataset.vocabWord = JSON.stringify(word);
    card.innerHTML = `
      <span class="dict-cat-tag">${word.cat}</span>
      <span class="dict-char">${word.c}</span>
      <span class="dict-pinyin">${word.p}</span>
      <span class="dict-en">${word.e}</span>`;
    grid.appendChild(card);
  });
}

window.HSK_RENDER = {
  renderDictionary,
  renderLessonDetail,
  renderLessonList
};

function makeSection(icon, titleHTML) {
  const section = document.createElement('section');
  section.className = 'detail-section';
  section.innerHTML = `
    <div class="detail-section-head">
      <span class="section-icon">${icon}</span>
      <span class="detail-section-title">${titleHTML}</span>
    </div>`;
  return section;
}
})();
