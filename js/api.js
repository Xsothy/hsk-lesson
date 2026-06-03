(function () {
  /**
   * Enriches vocab words by fetching data from dictionary and vocabulary
   * Dictionary = source of truth for p, e, cat
   * Vocabulary = source of truth for parts, literal
   */
  function enrichVocabWord(wordChar) {
    // If it's already an object with data, return it
    if (typeof wordChar === 'object' && wordChar.c) {
      return wordChar;
    }
    
    // Otherwise, it's just a character string - enrich it
    const dict = window.HSK_DICTIONARY || { words: [] };
    const wordData = dict.words.find(w => w.c === wordChar);
    const breakdown = window.HSK_VOCABULARY?.[wordChar];
    
    if (!wordData) {
      // Fallback if not in dictionary
      return {
        c: wordChar,
        p: '?',
        e: '?',
        parts: breakdown?.parts,
        literal: breakdown?.literal
      };
    }
    
    return {
      c: wordData.c,
      p: wordData.p,
      e: wordData.e,
      cat: wordData.cat,
      parts: breakdown?.parts,
      literal: breakdown?.literal
    };
  }

  function getLessons() {
    return window.HSK_LESSONS || [];
  }

  function getDictionary() {
    return window.HSK_DICTIONARY || { categories: {}, words: [] };
  }

  function getLesson(slug) {
    window.HSK_LESSONS_BY_SLUG = window.HSK_LESSONS_BY_SLUG || {};

    if (window.HSK_LESSONS_BY_SLUG[slug]) {
      return Promise.resolve(window.HSK_LESSONS_BY_SLUG[slug]);
    }

    return loadScript(`data/lessons/${slug}.js`).then(() => {
      const lesson = window.HSK_LESSONS_BY_SLUG[slug];

      if (!lesson) {
        throw new Error(`Lesson data not found: ${slug}`);
      }

      // Enrich lesson vocabulary from dictionary + vocabulary breakdown
      lesson.vocab = lesson.vocab.map(enrichVocabWord);

      return lesson;
    });
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);

      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  window.HSK_API = {
    getDictionary,
    getLesson,
    getLessons,
    enrichVocabWord
  };
})();
