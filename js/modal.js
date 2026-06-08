(function () {
  let currentModal = null;
  let currentWriter = null;

  function openVocabModal(vocabItem, lessonData) {
    closeModal();

    // Ensure item is enriched with breakdown data
    const enrichedItem = window.HSK_API.enrichVocabWord(vocabItem);

    const lastFocused = document.activeElement;
    const modal = createModalElement(enrichedItem, lessonData);
    document.body.appendChild(modal);
    currentModal = modal;
    
    // Store last focused element on the modal object
    modal._lastFocused = lastFocused;

    // Trigger animation
    setTimeout(() => {
      modal.classList.add('active');
      modal.querySelector('.modal-close')?.focus();
    }, 10);
  }

  function closeModal() {
    if (!currentModal) return;

    const lastFocused = currentModal._lastFocused;

    if (currentWriter) {
      currentWriter = null;
    }

    currentModal.classList.remove('active');
    setTimeout(() => {
      currentModal?.remove();
      currentModal = null;
      
      // Restore focus
      if (lastFocused && document.body.contains(lastFocused)) {
        lastFocused.focus();
      }
    }, 200);
  }

  function createModalElement(vocabItem, lessonData) {
    const modal = document.createElement('div');
    modal.className = 'vocab-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'modal-title');
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-container">
        <div class="modal-header">
          <div class="modal-header-content">
            <div class="modal-word" id="modal-title">${vocabItem.c}</div>
            <div class="modal-pinyin">${window.HSK_UTILS.colorizePinyin(vocabItem.p)}</div>
            <div class="modal-english">${vocabItem.e}</div>
          </div>
          <div class="modal-header-actions">
            <button class="modal-audio-btn" type="button" aria-label="Pronounce word">🔊</button>
            <a class="modal-dict-link" href="${window.HSK_UTILS.dictLink(vocabItem.c)}" target="_blank" rel="noopener noreferrer" title="View in external dictionary" aria-label="Open external dictionary">📖</a>
            <button class="modal-close" type="button" aria-label="Close modal">✕</button>
          </div>
        </div>
        <div class="modal-body">
          <div class="modal-section modal-breakdown" id="modal-breakdown"></div>
          <div class="modal-section modal-stroke" id="modal-stroke"></div>
          <div class="modal-section modal-examples" id="modal-examples"></div>
        </div>
      </div>
    `;

    // Event listeners
    modal.querySelector('.modal-backdrop').addEventListener('click', closeModal);
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.modal-audio-btn').addEventListener('click', () => {
      window.HSK_UTILS.speakChinese(vocabItem.c);
    });

    // Keyboard handlers
    const keyHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', keyHandler);
      }
      
      if (e.key === 'Tab') {
        const focusables = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusables.length === 0) return;
        
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };
    document.addEventListener('keydown', keyHandler);

    // Populate modal sections
    populateBreakdownSection(modal, vocabItem);
    populateStrokeSection(modal, vocabItem);
    populateExamplesSection(modal, vocabItem, lessonData);

    return modal;
  }

  function populateBreakdownSection(modal, vocabItem) {
    const container = modal.querySelector('#modal-breakdown');
    
    let parts = vocabItem.parts;
    
    // Fallback: If no parts defined, but word has multiple characters, split them!
    if (!parts || parts.length === 0) {
      if (vocabItem.c && vocabItem.c.length > 1) {
        // Only split if they are Chinese characters
        parts = Array.from(vocabItem.c).filter(char => /[\u4e00-\u9fff]/.test(char));
      }
    }

    if (!parts || parts.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    let html = '<div class="modal-section-title">CHARACTER FUSION · 汉字组合</div>';
    html += '<div class="breakdown-grid">';

    parts.forEach((char, index) => {
      // Fetch character data from dictionary
      const charData = window.HSK_API.enrichVocabWord(char);
 
      html += `
        <button class="breakdown-item ${index === 0 ? 'selected' : ''}" 
                data-char="${char}" 
                data-index="${index}"
                type="button">
          <div class="breakdown-char">${char}</div>
          <div class="breakdown-pinyin">${window.HSK_UTILS.colorizePinyin(charData.p || '?')}</div>
          <div class="breakdown-meaning">${charData.e || '?'}</div>
        </button>
      `;
    });

    html += '</div>';

    if (vocabItem.literal) {
      html += `<div class="breakdown-literal"><strong>Fusion:</strong> ${vocabItem.literal} </div>`;
    } else if (!vocabItem.parts && vocabItem.e) {
      // Simple fallback literal if we auto-split
      html += `<div class="breakdown-literal"><strong>Fusion:</strong> ${parts.join(' + ')} = ${vocabItem.e}</div>`;
    }

    container.innerHTML = html;
  }

  function populateStrokeSection(modal, vocabItem) {
    const container = modal.querySelector('#modal-stroke');
    
    // Default to first part or the word itself (filtered for CJK)
    let defaultChar = vocabItem.parts?.[0];
    if (!defaultChar && vocabItem.c) {
      const chars = Array.from(vocabItem.c).filter(char => /[\u4e00-\u9fff]/.test(char));
      defaultChar = chars[0];
    }
    
    if (!defaultChar) {
      container.style.display = 'none';
      return;
    }

    const charData = window.HSK_API.enrichVocabWord(defaultChar);

    container.innerHTML = `
      <div class="modal-section-title">STROKE ORDER · 笔画顺序</div>
      <div class="stroke-info">
        <div class="stroke-char-display">${charData.c}</div>
        <div class="stroke-char-meta">
          <div class="stroke-char-pinyin">${window.HSK_UTILS.colorizePinyin(charData.p || '?')}</div>
          <div class="stroke-char-meaning">${charData.e || '?'}</div>
        </div>
      </div>
      <div class="stroke-writer-container">
        <svg class="stroke-grid" xmlns="http://www.w3.org/2000/svg" width="200" height="200">
          <line x1="0" y1="0" x2="200" y2="200" stroke="#E5E0D8" stroke-width="1"/>
          <line x1="200" y1="0" x2="0" y2="200" stroke="#E5E0D8" stroke-width="1"/>
          <line x1="100" y1="0" x2="100" y2="200" stroke="#E5E0D8" stroke-width="1"/>
          <line x1="0" y1="100" x2="200" y2="100" stroke="#E5E0D8" stroke-width="1"/>
        </svg>
        <div id="hanzi-writer-target"></div>
        <div class="stroke-loading">Loading stroke data...</div>
        <div class="stroke-error" style="display: none;">Stroke data not available</div>
      </div>
      <div class="stroke-controls">
        <button class="stroke-btn" id="stroke-replay" type="button">↻ Replay</button>
        <button class="stroke-btn" id="stroke-slow" type="button">🐢 Slow</button>
      </div>
    `;

    loadStrokeAnimation(defaultChar, modal);

    // Setup click handlers for breakdown items
    const breakdownItems = modal.querySelectorAll('.breakdown-item');
    breakdownItems.forEach(item => {
      item.addEventListener('click', () => {
        const char = item.dataset.char;
        
        // Update selection
        breakdownItems.forEach(b => b.classList.remove('selected'));
        item.classList.add('selected');
        
        // Load new character
        loadStrokeAnimation(char, modal);
      });
    });
  }

  function loadStrokeAnimation(character, modal) {
    if (!window.HanziWriter) {
      console.error('HanziWriter not loaded');
      return;
    }

    const target = modal.querySelector('#hanzi-writer-target');
    const loading = modal.querySelector('.stroke-loading');
    const errorMsg = modal.querySelector('.stroke-error');
    const replayBtn = modal.querySelector('#stroke-replay');
    const slowBtn = modal.querySelector('#stroke-slow');

    // Clear previous writer
    if (currentWriter) {
      target.innerHTML = '';
      currentWriter = null;
    }

    // Show loading
    loading.style.display = 'block';
    errorMsg.style.display = 'none';
    target.style.opacity = '0';

    // Update stroke info
    const charData = window.HSK_API.enrichVocabWord(character);
    modal.querySelector('.stroke-char-display').textContent = charData.c;
    modal.querySelector('.stroke-char-pinyin').innerHTML = window.HSK_UTILS.colorizePinyin(charData.p || '?');
    modal.querySelector('.stroke-char-meaning').textContent = charData.e || '?';

    try {
      const writer = HanziWriter.create(target, character, {
        width: 200,
        height: 200,
        padding: 10,
        strokeColor: '#555',
        outlineColor: '#DDD',
        radicalColor: '#b8892e',
        showOutline: true,
        showCharacter: false,
        delayBetweenStrokes: 300,
        strokeAnimationSpeed: 1,
        onLoadCharDataSuccess: () => {
          loading.style.display = 'none';
          target.style.opacity = '1';
          writer.animateCharacter();
        },
        onLoadCharDataError: () => {
          loading.style.display = 'none';
          errorMsg.style.display = 'block';
        }
      });

      currentWriter = writer;

      // Replay button (normal speed)
      replayBtn.onclick = () => {
        if (currentWriter) {
          currentWriter.animateCharacter({
            strokeAnimationSpeed: 1,
            delayBetweenStrokes: 300
          });
        }
      };

      // Slow replay button
      slowBtn.onclick = () => {
        if (currentWriter) {
          currentWriter.animateCharacter({
            strokeAnimationSpeed: 0.5,
            delayBetweenStrokes: 800
          });
        }
      };

    } catch (err) {
      console.error('HanziWriter error:', err);
      loading.style.display = 'none';
      errorMsg.style.display = 'block';
    }
  }

  function populateExamplesSection(modal, vocabItem, lessonData) {
    const container = modal.querySelector('#modal-examples');
    
    if (!lessonData) {
      container.style.display = 'none';
      return;
    }

    const examples = findExamplesInLesson(vocabItem.c, lessonData);
    
    if (examples.length === 0) {
      container.style.display = 'none';
      return;
    }

    let html = '<div class="modal-section-title">EXAMPLE SENTENCES · 例句</div>';
    html += '<div class="examples-list">';

    examples.forEach((ex, index) => {
      html += `
        <div class="example-item">
          <div class="example-header">
            <span class="example-type">${ex.type}</span>
            <button class="audio-btn audio-btn-sm" data-text="${ex.zh}" type="button" aria-label="Pronounce sentence">🔊</button>
          </div>
          <div class="example-zh">${ex.zh}</div>
          <div class="example-pinyin">${window.HSK_UTILS.colorizePinyin(ex.py)}</div>
          <div class="example-en">${ex.en}</div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Add audio button listeners
    container.querySelectorAll('.audio-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.HSK_UTILS.speakChinese(btn.dataset.text);
      });
    });
  }

  function findExamplesInLesson(vocabChar, lessonData) {
    const examples = [];
    
    // Search sentences
    if (lessonData.sentences) {
      lessonData.sentences.forEach(sent => {
        if (sent.zh.includes(vocabChar)) {
          examples.push({
            type: 'Sentence',
            zh: sent.zh,
            py: sent.py,
            en: sent.en
          });
        }
      });
    }

    // Search dialogue
    if (lessonData.dialogue) {
      lessonData.dialogue.forEach(line => {
        if (line.zh.includes(vocabChar)) {
          examples.push({
            type: `Dialogue (${line.speaker})`,
            zh: line.zh,
            py: line.py,
            en: line.en
          });
        }
      });
    }

    return examples;
  }

  window.HSK_MODAL = {
    open: openVocabModal,
    show: openVocabModal, // Alias for backward compatibility
    close: closeModal,
    setWriter: (writer) => { currentWriter = writer; }
  };
})();
