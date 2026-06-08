(function () {
function renderLessonList(container, lessons) {
  container.innerHTML = '';

  lessons.forEach((lesson, index) => {
    const previewFlag = lesson.isPreview ? '<span class="preview-badge">+ HSK 2 Preview</span>' : '';
    const card = document.createElement('a');
    card.className = 'lesson-card';
    card.href = `lesson.html?slug=${lesson.slug}`;
    card.style.animationDelay = `${index * 0.05}s`;
    
    // Apply dynamic colors
    const bgColor = lesson.color || '#ffffff';
    const emojiBg = lesson.emojiColor || '#f3ede3';
    
    card.innerHTML = `
      <div class="lesson-card-top">
        <div class="lesson-emoji" style="background:${emojiBg};">${lesson.emoji}</div>
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
    
    // Smooth background transition on hover
    card.addEventListener('mouseenter', () => {
      card.style.background = `linear-gradient(135deg, ${bgColor} 0%, #ffffff 100%)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.background = '#ffffff';
    });

    container.appendChild(card);
  });
}

function renderLessonDetail(lesson, totalLessons, readings = []) {
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

  if (readings && readings.length > 0) {
    body.appendChild(renderReadingSection(readings, lesson));
  }

  if (lesson.content) {
    const content = makeSection('📄', 'LESSON NOTES');
    const wrapper = document.createElement('div');
    wrapper.className = 'lesson-content';
    wrapper.innerHTML = lesson.content;
    content.appendChild(wrapper);
    body.appendChild(content);
  }

  // Add Finish Lesson reward button
  const finishWrapper = document.createElement('div');
  finishWrapper.style.padding = '2rem 0';
  finishWrapper.style.textAlign = 'center';
  
  const finishBtn = document.createElement('button');
  finishBtn.className = 'finish-lesson-btn';
  finishBtn.innerHTML = `✨ Finish Lesson ${lesson.emoji}`;
  finishBtn.style.cssText = `
    background: linear-gradient(135deg, var(--ink) 0%, #333 100%);
    color: white;
    border: 0;
    padding: 1.2rem 3rem;
    border-radius: 50px;
    font-size: 1.2rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: var(--shadow-md);
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  `;

  finishBtn.onmouseenter = () => {
    finishBtn.style.transform = 'scale(1.05) translateY(-4px)';
    finishBtn.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
  };
  finishBtn.onmouseleave = () => {
    finishBtn.style.transform = 'scale(1) translateY(0)';
    finishBtn.style.boxShadow = 'var(--shadow-md)';
  };

  finishBtn.onclick = () => {
    window.HSK_UTILS.triggerConfetti();
    finishBtn.innerHTML = `🎊 Lesson Complete! 🎊`;
    finishBtn.style.background = 'linear-gradient(135deg, var(--gold) 0%, var(--gold-lt) 100%)';
    finishBtn.style.color = 'var(--ink)';
    finishBtn.disabled = true;
    finishBtn.style.cursor = 'default';
    finishBtn.style.transform = 'scale(1.1)';
  };

  finishWrapper.appendChild(finishBtn);
  body.appendChild(finishWrapper);
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
      <span class="vocab-pinyin">${window.HSK_UTILS.colorizePinyin(word.p)}</span>
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
        <div class="sentence-pinyin">${window.HSK_UTILS.colorizePinyin(sentence.py)}</div>
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
    item.className = `dialogue-line speaker-${line.speaker.toLowerCase()}-row`;
    
    item.innerHTML = `
      <div class="dialogue-speaker ${line.speaker === 'A' ? 'speaker-a' : 'speaker-b'}">${line.speaker}</div>
      <div class="dialogue-content" title="Click to hear pronunciation">
        <div class="dialogue-zh">${line.zh}</div>
        <div class="dialogue-pinyin">${window.HSK_UTILS.colorizePinyin(line.py)}</div>
        <div class="dialogue-en blur-reveal" title="Click to reveal translation">${line.en}</div>
      </div>`;
    
    const content = item.querySelector('.dialogue-content');
    const english = item.querySelector('.dialogue-en');

    // Click bubble to speak
    content.addEventListener('click', (e) => {
      if (e.target === english) return; // Don't speak when clicking translation
      window.HSK_UTILS.speakChinese(line.zh);
    });

    // Click translation to reveal
    english.addEventListener('click', (e) => {
      e.stopPropagation();
      english.classList.toggle('revealed');
    });

    box.appendChild(item);
  });

  section.appendChild(box);
  return section;
}

function renderReadingSection(readings, lessonData = {}) {
  const section = makeSection('📖', 'READING PRACTICE · 阅读');
  const container = document.createElement('div');
  container.className = 'readings-container';

  readings.forEach(reading => {
    const card = document.createElement('div');
    card.className = 'reading-card';
    
    card.innerHTML = `
      <div class="reading-card-header">
        <div class="reading-type-badge">${reading.type}</div>
        <h3 class="reading-title">${reading.emoji} ${reading.title}</h3>
        <p class="reading-title-en">${reading.titleEn}</p>
      </div>
    `;

    const passage = document.createElement('div');
    passage.className = 'reading-passage';
    reading.lines.forEach(line => {
      const lineEl = document.createElement('div');
      lineEl.className = 'reading-line';
      lineEl.innerHTML = `
        <div class="reading-zh">${line.zh}</div>
        <div class="reading-py">${window.HSK_UTILS.colorizePinyin(line.py)}</div>
        <div class="reading-en blur-reveal" title="Click to reveal translation">${line.en}</div>
      `;
      
      lineEl.addEventListener('click', (e) => {
        if (e.target.classList.contains('reading-en')) {
          e.stopPropagation();
          e.target.classList.toggle('revealed');
        } else {
          window.HSK_UTILS.speakChinese(line.zh);
        }
      });
      passage.appendChild(lineEl);
    });
    card.appendChild(passage);

    // Learning Objectives (Focus Words & Grammar)
    const objectives = document.createElement('div');
    objectives.className = 'reading-objectives';
    
    let objectivesHTML = '';
    if (reading.focusWords && reading.focusWords.length > 0) {
      objectivesHTML += `
        <div class="objective-group">
          <span class="objective-label">Vocabulary:</span>
          <div class="objective-tags vocab-objective-list">
            ${reading.focusWords.map(word => `<span class="obj-tag vocab" data-word="${word}">${word}</span>`).join('')}
          </div>
        </div>
      `;
    }
    
    if (reading.grammarFocus && reading.grammarFocus.length > 0) {
      objectivesHTML += `
        <div class="objective-group">
          <span class="objective-label">Grammar:</span>
          <div class="objective-tags">
            ${reading.grammarFocus.map(point => `<span class="obj-tag grammar">${point}</span>`).join('')}
          </div>
        </div>
      `;
    }
    
    if (objectivesHTML) {
      objectives.innerHTML = objectivesHTML;
      
      // Add click handlers for vocab tags
      objectives.querySelectorAll('.obj-tag.vocab').forEach(tag => {
        tag.addEventListener('click', () => {
          const char = tag.getAttribute('data-word');
          const vocabList = Array.isArray(lessonData) ? lessonData : (lessonData.vocab || []);
          const wordObj = vocabList.find(v => v.c === char);
          if (wordObj && window.HSK_MODAL) {
            window.HSK_MODAL.open(wordObj, lessonData);
          }
        });
      });
      
      card.appendChild(objectives);
    }

    if (reading.questions && reading.questions.length > 0) {
      const questionsSection = document.createElement('div');
      questionsSection.className = 'reading-questions';
      questionsSection.innerHTML = `<h4>Comprehension Questions</h4>`;
      
      reading.questions.forEach((q, qIndex) => {
        const qEl = document.createElement('div');
        qEl.className = 'reading-question';
        qEl.innerHTML = `<p class="question-text">${q.question} <span class="question-en">${q.questionEn}</span></p>`;
        
        const optionsContainer = document.createElement('div');
        optionsContainer.className = 'question-options';
        
        const options = q.type === 'true_false' ? ['True', 'False'] : q.options;
        
        options.forEach((opt, optIndex) => {
          const btn = document.createElement('button');
          btn.className = 'option-btn';
          btn.textContent = opt;
          btn.onclick = () => {
            const isCorrect = q.type === 'true_false' 
              ? (opt === 'True' ? q.answer === true : q.answer === false)
              : optIndex === q.answer;
            
            if (isCorrect) {
              btn.classList.add('correct');
              window.HSK_UTILS.triggerConfetti();
            } else {
              btn.classList.add('incorrect');
            }
            optionsContainer.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
          };
          optionsContainer.appendChild(btn);
        });
        
        qEl.appendChild(optionsContainer);
        questionsSection.appendChild(qEl);
      });
      card.appendChild(questionsSection);
    }

    container.appendChild(card);
  });

  section.appendChild(container);
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
      <span class="dict-pinyin">${window.HSK_UTILS.colorizePinyin(word.p)}</span>
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
