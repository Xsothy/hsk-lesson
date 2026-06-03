(function () {
  function getUrlParam(name, fallback = '') {
    return new URLSearchParams(window.location.search).get(name) || fallback;
  }

  function dictLink(char) {
    return `https://www.mdbg.net/chinese/dictionary?page=worddict&wdrst=0&wdqb=${encodeURIComponent(char)}`;
  }

  function setupPinyinToggle(buttonId = 'pinyin-toggle') {
    const button = document.getElementById(buttonId);

    if (!button) return;

    button.addEventListener('click', () => {
      const nextVisible = document.body.classList.toggle('hide-pinyin') === false;
      button.classList.toggle('active', nextVisible);
      button.setAttribute('aria-pressed', String(nextVisible));
      button.title = nextVisible ? 'Hide pinyin' : 'Show pinyin';
    });
  }

  window.HSK_UTILS = {
    dictLink,
    getUrlParam,
    setupPinyinToggle
  };
})();
