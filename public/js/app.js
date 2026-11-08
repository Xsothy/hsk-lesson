(function () {
  let currentDictCategory = 'all';

  init();

  function init() {
    window.HSK_UTILS.setupPinyinToggle();
    setupNavigation();

    const lessons = window.HSK_API.getLessons();
    const dictionary = window.HSK_API.getDictionary();

    window.HSK_RENDER.renderLessonList(document.getElementById('lessons-grid'), lessons);
    window.HSK_RENDER.renderDictionary(document.getElementById('dict-filters'), document.getElementById('dict-grid'), dictionary);
    setupDictionaryFilters();
    setupDictionarySearch();
    setupDictionaryModalHandlers();

    if (window.location.hash === '#dictionary') {
      showPage('dictionary');
    }
  }

  function setupNavigation() {
    document.querySelectorAll('[data-page]').forEach((tab) => {
      tab.addEventListener('click', () => showPage(tab.dataset.page));
    });
  }

  function showPage(name) {
    document.querySelectorAll('.page').forEach((page) => page.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach((tab) => tab.classList.remove('active'));
    document.getElementById(`page-${name}`).classList.add('active');
    document.querySelector(`[data-page="${name}"]`).classList.add('active');
    window.location.hash = name === 'dictionary' ? 'dictionary' : '';
    window.scrollTo(0, 0);
  }

  function setupDictionaryFilters() {
    document.querySelectorAll('.dict-filter-btn').forEach((button) => {
      button.addEventListener('click', () => {
        currentDictCategory = button.dataset.cat;
        document.querySelectorAll('.dict-filter-btn').forEach((filterButton) => filterButton.classList.remove('active'));
        button.classList.add('active');
        filterDictionary();
      });
    });
  }

  function setupDictionarySearch() {
    document.getElementById('dict-search').addEventListener('input', filterDictionary);
  }

  function filterDictionary() {
    const query = document.getElementById('dict-search').value.toLowerCase().trim();
    let shown = 0;

    document.querySelectorAll('.dict-card').forEach((card) => {
      const matchesCategory = currentDictCategory === 'all' || card.dataset.cat === currentDictCategory;
      const matchesQuery = !query || card.dataset.char.includes(query) || card.dataset.pinyin.includes(query) || card.dataset.english.includes(query);
      const isVisible = matchesCategory && matchesQuery;

      card.classList.toggle('hidden', !isVisible);
      if (isVisible) shown += 1;
    });

    document.getElementById('dict-no-results').style.display = shown === 0 ? 'block' : 'none';
  }

  function setupDictionaryModalHandlers() {
    document.addEventListener('click', (e) => {
      const dictCard = e.target.closest('.dict-card');
      if (dictCard && dictCard.dataset.vocabWord) {
        const word = JSON.parse(dictCard.dataset.vocabWord);
        window.HSK_MODAL.open(word, null);
      }
    });
  }
})();
