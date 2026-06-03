(function () {
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
    getLessons
  };
})();
