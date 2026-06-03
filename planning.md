# HSK Lesson Site Planning

## Current Direction

Build a lightweight, framework-free static Chinese learning site that works both on Vercel and when opened directly from `index.html`.

Because direct `file://` opening blocks `fetch()` and ES modules, the project uses plain deferred JavaScript files instead of JSON fetches or module imports.

## Current Structure

```text
project/
├── index.html
├── lesson.html
├── export-lessons.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── lesson.js
│   ├── api.js
│   ├── render.js
│   ├── utils.js
│   └── export-lessons.js
├── data/
│   ├── lessons.js
│   ├── dictionary.js
│   └── lessons/
│       ├── lesson-1.js
│       ├── lesson-2.js
│       └── ...
└── assets/
    ├── images/
    ├── icons/
    └── fonts/
```

## Teacher Review

The current lesson content is a strong MVP for guided learning, but not enough yet for full self-study mastery.

Strengths:

- Practical HSK 1 topics.
- 10-12 vocabulary words per lesson.
- Clear grammar patterns.
- Useful example sentences and dialogues.
- Simple static structure that can scale to many lessons.

Gaps:

- Not enough repeated exposure for every vocabulary word.
- No active quiz/retrieval practice yet.
- No pronunciation/audio support yet.
- No character or word deconstruction yet.

## Lesson Content Target

Each lesson should eventually include:

- 10-12 vocabulary words.
- 8-10 example sentences.
- 1 dialogue.
- 2-3 grammar points.
- Vocabulary exposure rule: each vocabulary word should appear at least twice across examples/dialogue where possible.
- Optional short review quiz.

## Word Deconstruction And Stroke Plan

Add word deconstruction and stroke preview inside a vocabulary modal.

User flow:

1. Student clicks a vocabulary word.
2. A modal opens.
3. Modal shows the full word, pinyin, meaning, and audio button.
4. Modal shows a "Word Breakdown" section.
5. Each character/component appears as a small block with pinyin and meaning.
6. Student clicks a character block.
7. Modal shows stroke order for that character.

Example:

```text
火车站
huǒ chē zhàn
train station

Word Breakdown

火        车          站
huǒ      chē         zhàn
fire     vehicle     station

Literal idea:
fire + vehicle + station = train station

Stroke Preview

[火 selected]
Animated stroke order / static stroke frames
```

Recommended vocab data shape:

```js
{
  c: "火车站",
  p: "huǒ chē zhàn",
  e: "train station",
  parts: ["火", "车", "站"],
  literal: "fire + vehicle + station"
}
```

Recommended construct registry:

```js
window.HSK_CONSTRUCTS = {
  "火": {
    c: "火",
    p: "huǒ",
    e: "fire"
  },
  "车": {
    c: "车",
    p: "chē",
    e: "vehicle / car"
  },
  "站": {
    c: "站",
    p: "zhàn",
    e: "station / stop"
  }
};
```

Planned file:

```text
data/constructs.js
```

Recommended construct data shape with stroke support:

```js
window.HSK_CONSTRUCTS = {
  "火": {
    c: "火",
    p: "huǒ",
    e: "fire",
    strokes: {
      count: 4,
      svg: "assets/strokes/fire.svg",
      frames: [
        "assets/strokes/fire-1.svg",
        "assets/strokes/fire-2.svg",
        "assets/strokes/fire-3.svg",
        "assets/strokes/fire-4.svg"
      ]
    }
  }
};
```

Planned stroke asset folder:

```text
assets/
└── strokes/
    ├── huo.svg
    ├── huo-1.svg
    ├── huo-2.svg
    └── ...
```

Stroke preview UI:

- Default selected character is the first part of the word.
- Clicking any deconstruction block updates the stroke preview.
- Show character, pinyin, meaning, and stroke count.
- Show either animated SVG stroke order or simple frame-by-frame stroke images.
- Add "previous stroke" and "next stroke" buttons if using static frames.
- Add a replay button if using animated SVG.

Teacher note:

For early learners, stroke order should be optional and visual. It should not interrupt reading practice. The modal should prioritize meaning first, then deconstruction, then stroke details.

## Audio Plan

Use browser built-in TTS first because target students mainly use iOS.

Reason:

- iOS Chinese voices are generally good.
- No audio files are required.
- No storage or generation cost.
- Works well for MVP.

Basic approach:

```js
function speakChinese(text) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = 0.85;
  speechSynthesis.speak(utterance);
}
```

Future improvement:

- Add voice selection.
- Add slow/normal speed buttons.
- Optionally generate fixed audio files later if browser TTS quality becomes inconsistent.

## Modal Plan

Vocabulary modal should include:

- Chinese word.
- Pinyin.
- English meaning.
- Speak button.
- Word breakdown if `parts` exists.
- Literal meaning if `literal` exists.
- Stroke preview for selected component if stroke data exists.
- Example sentence list using that word if available.
- External dictionary link.

Keep deconstruction inside the modal only, not directly on lesson cards, to avoid clutter.

## Export Plan

`export-lessons.html` exports all lesson-related data as JSON:

```json
{
  "lessons": [],
  "lessonDetails": []
}
```

This helps recover or inspect JSON-style lesson data even though the app stores content as browser-readable `.js` files.

## Next Implementation Steps

1. Add `data/constructs.js`.
2. Add `parts` and `literal` to vocabulary items where useful.
3. Add `assets/strokes/` for stroke SVGs or stroke frame images.
4. Add a vocabulary modal component.
5. Add click handlers for vocabulary cards.
6. Add deconstruction block selection inside modal.
7. Add stroke preview panel inside modal.
8. Add browser TTS speak buttons.
9. Add simple lesson practice quizzes.
