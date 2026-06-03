# hsk-lesson

Framework-free static HSK lesson site.

Deploy as a plain static site. On Vercel, use the project root as the output directory and leave build settings empty.

The site also works when opened directly from `index.html`. Browser security blocks `fetch()` and ES modules from `file://`, so content data lives in plain script files under `data/`.

Entry pages:

- `index.html`
- `lesson.html?slug=lesson-1`
- `export-lessons.html`

To add a lesson:

1. Add metadata to `data/lessons.js`.
2. Add full lesson content to `data/lessons/{slug}.js`.
3. Link to it as `lesson.html?slug={slug}`.
