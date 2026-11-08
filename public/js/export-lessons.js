(function () {
  init();

  function init() {
    const lessons = window.HSK_LESSONS || [];
    const slugs = lessons.map((lesson) => lesson.slug);

    Promise.all(slugs.map(loadLesson))
      .then((lessonDetails) => {
        const exportData = {
          lessons,
          lessonDetails
        };
        renderExport(exportData);
      })
      .catch((error) => {
        console.error(error);
        document.getElementById('json-output').textContent = `Could not export lesson JSON: ${error.message}`;
      });
  }

  function loadLesson(slug) {
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
      const script = document.createElement('script');
      script.src = src;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  function renderExport(exportData) {
    const json = JSON.stringify(exportData, null, 2);
    const output = document.getElementById('json-output');
    const download = document.getElementById('download-json');
    const blob = new Blob([json], { type: 'application/json' });

    output.textContent = json;
    download.href = URL.createObjectURL(blob);
  }
})();
