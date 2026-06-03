(function () {
  init();

  function init() {
    window.HSK_UTILS.setupPinyinToggle();

    const slug = window.HSK_UTILS.getUrlParam('slug', 'lesson-1');

    window.HSK_API.getLesson(slug)
      .then((lesson) => {
        window.HSK_RENDER.renderLessonDetail(lesson, window.HSK_API.getLessons().length);
        setupVocabModalHandlers(lesson);
      })
      .catch((error) => showLoadError(error, slug));
  }

  function setupVocabModalHandlers(lessonData) {
    // Add click handlers to vocab items
    document.addEventListener('click', (e) => {
      const vocabItem = e.target.closest('.vocab-item');
      if (vocabItem && vocabItem.dataset.vocabWord) {
        const word = JSON.parse(vocabItem.dataset.vocabWord);
        window.HSK_MODAL.open(word, lessonData);
      }
    });
  }

  function showLoadError(error, slug) {
    console.error(error);
    document.title = 'Lesson not found · 汉字课堂';
    document.getElementById('d-label').textContent = 'Lesson not found';
    document.getElementById('d-title').textContent = slug;
    document.getElementById('d-sub').textContent = 'Check the lesson URL or return to the lesson list.';
    document.getElementById('d-body').innerHTML = '<p class="load-error">Could not load this lesson.</p>';
  }
})();
