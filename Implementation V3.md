# HSK 1 Learning App v3 — Implementation Guide

## Changelog from v2

| # | Issue | Fix |
|---|-------|-----|
| 1 | `py` array duplicated pinyin in every reading line | Removed — pinyin now looked up from central `WORD_MAP` at render time |
| 2 | `JSON.parse(localStorage)` crashes on corrupted data | Wrapped in `try/catch` with fallback to defaults |
| 3 | `togglePinyin()` / `toggleDarkMode()` never saved to localStorage | Both now persist via `toggleSetting()` |
| 4 | `ttsVolume` in DEFAULT_SETTINGS but never applied | Added `utterance.volume` in `speakText()` |
| 5 | TTS voices empty on first load (async race) | `onvoiceschanged` + 1000ms timeout fallback |
| 6 | `renderReading()` used `innerHTML` (XSS risk) | Replaced with DOM API (`createElement`, `createTextNode`) |
| 7 | `ruby { display: inline-block }` broke Firefox/Safari layout | Removed — native ruby handles centering |
| 8 | Modal had no focus trap or Escape key handler | Added `trapFocus()` and `keydown` listener |
| 9 | Toggle switches had no ARIA labels | Added `role="switch"`, `aria-checked`, keyboard support |
| 10 | Punctuation rendered as empty `<rt></rt>` | `renderLine()` skips `<rt>` when pinyin is empty |

---

## Why `py` Was Removed

### The v2 Problem

In v2, every reading line carried its own `py` array alongside `words`:

```javascript
// v2 — py duplicated on every line
{
  zh:    "你好！你叫什么名字？",
  words: ["你", "好", "！", "你", "叫", "什么", "名字", "？"],
  py:    ["nǐ", "hǎo", "",  "nǐ", "jiào", "shénme", "míngzi", ""],
  en:    "Hello! What is your name?"
}
```

This caused several problems:

- **Duplication** — the same pinyin for "你" (`nǐ`) had to be typed on every line it appeared in, across all 24 readings.
- **Mismatch risk** — `words[]` and `py[]` had to stay the same length. Adding or removing a word without updating `py` caused misaligned or missing pinyin with no error.
- **Hard to fix** — correcting a pinyin typo (e.g. a wrong tone mark) required finding and updating every occurrence across all reading files.

### The v3 Solution

Pinyin is defined **once** per word in a central `WORD_MAP`. Reading lines only list `words[]`. The renderer looks up pinyin at render time — no `py` array needed anywhere.

```javascript
// v3 — words only, py gone
{
  zh:    "你好！你叫什么名字？",
  words: ["你", "好", "！", "你", "叫", "什么", "名字", "？"],
  en:    "Hello! What is your name?"
}
```

Pinyin is resolved by `renderLine()` at render time:

```
WORD_MAP            readings_v3.js              renderer.js
──────────          ──────────────              ───────────
"你" → "nǐ"   ←──  words: ["你", "好", …]  →  <ruby>你<rt>nǐ</rt></ruby>
"好" → "hǎo"  ←──                          →  <ruby>好<rt>hǎo</rt></ruby>
```

### Benefits

| | v2 (`py` per line) | v3 (`WORD_MAP`) |
|---|---|---|
| Fix a pinyin typo | Update every reading line | Update `WORD_MAP` once |
| Add a new word | Add to `words[]` + `py[]` | Add to `words[]` only |
| Array mismatch risk | Yes — silent misalignment | Gone — single source |
| Reading file size | Larger (pinyin duplicated) | Smaller (words only) |
| New readings reuse words | Must re-enter pinyin | Pinyin inherited automatically |

### Authoring Rule

Every token in `words[]` must have a corresponding entry in `WORD_MAP`. If a word is missing, `renderLine()` will render the character without pinyin and log a console warning:

```
[renderer] "新词" not found in WORD_MAP
```

Add the missing word to `WORD_MAP` to resolve it. Punctuation entries use an empty string `""` as their pinyin value — `renderLine()` treats these as plain text with no `<ruby>` wrapper.

---

## Architecture

### Core Idea — Central Word Map

Pinyin is defined **once** in a central `WORD_MAP`. Reading lines only store the word tokens. The renderer looks up pinyin at render time.

```
WORD_MAP            readings_v3.js         renderer.js
──────────          ──────────────         ───────────
"你" → "nǐ"   ←──  words: ["你","好"]  →  <ruby>你<rt>nǐ</rt></ruby>
"好" → "hǎo"  ←──                     →  <ruby>好<rt>hǎo</rt></ruby>
```

**Benefits:**
- Fix a pinyin typo once — all readings update automatically
- Reading data is smaller and easier to author
- No risk of `words[]` / `py[]` array length mismatch (that problem is gone)
- New words added to `WORD_MAP` are instantly available to all readings

---

## Data Structures

### `word-map.js` — Central Pinyin Lookup

This file exports a flat object. Every word that appears in any reading or lesson must have an entry here. Punctuation and proper nouns are included.

```javascript
// word-map.js
// Keys: Chinese word or character
// Values: pinyin string (tone marks, not numbers)
// Proper nouns use capital first letter

const WORD_MAP = {
  // Pronouns
  "我":   "wǒ",
  "你":   "nǐ",
  "他":   "tā",
  "她":   "tā",
  "它":   "tā",
  "我们": "wǒmen",
  "你们": "nǐmen",
  "他们": "tāmen",
  "这":   "zhè",
  "那":   "nà",
  "哪":   "nǎ",

  // Numbers
  "零":   "líng",
  "一":   "yī",
  "二":   "èr",
  "三":   "sān",
  "四":   "sì",
  "五":   "wǔ",
  "六":   "liù",
  "七":   "qī",
  "八":   "bā",
  "九":   "jiǔ",
  "十":   "shí",
  "百":   "bǎi",
  "千":   "qiān",
  "两":   "liǎng",
  "二十": "èrshí",
  "三十": "sānshí",
  "四十": "sìshí",
  "五十": "wǔshí",
  "四十五": "sìshíwǔ",

  // Time
  "今天": "jīntiān",
  "明天": "míngtiān",
  "昨天": "zuótiān",
  "现在": "xiànzài",
  "上午": "shàngwǔ",
  "中午": "zhōngwǔ",
  "下午": "xiàwǔ",
  "早上": "zǎoshang",
  "晚上": "wǎnshang",
  "星期": "xīngqī",
  "星期一": "xīngqī yī",
  "星期二": "xīngqī èr",
  "星期三": "xīngqī sān",
  "星期四": "xīngqī sì",
  "星期五": "xīngqī wǔ",
  "星期六": "xīngqī liù",
  "星期日": "xīngqī rì",
  "年":   "nián",
  "月":   "yuè",
  "日":   "rì",
  "号":   "hào",
  "点":   "diǎn",
  "分钟": "fēnzhōng",
  "时候": "shíhou",
  "今年": "jīnnián",

  // Nouns
  "人":   "rén",
  "名字": "míngzi",
  "家":   "jiā",
  "爸爸": "bàba",
  "妈妈": "māma",
  "儿子": "érzi",
  "女儿": "nǚ'ér",
  "老师": "lǎoshī",
  "学生": "xuésheng",
  "同学": "tóngxué",
  "朋友": "péngyou",
  "医生": "yīshēng",
  "中国": "Zhōngguó",
  "北京": "Běijīng",
  "学校": "xuéxiào",
  "医院": "yīyuàn",
  "饭店": "fàndiàn",
  "商店": "shāngdiàn",
  "火车站": "huǒchēzhàn",
  "电话": "diànhuà",
  "电脑": "diànnǎo",
  "手机": "shǒujī",
  "电视": "diànshì",
  "书":   "shū",
  "水":   "shuǐ",
  "饭":   "fàn",
  "菜":   "cài",
  "茶":   "chá",
  "米饭": "mǐfàn",
  "水果": "shuǐguǒ",
  "苹果": "píngguǒ",
  "钱":   "qián",
  "块":   "kuài",
  "衣服": "yīfu",
  "猫":   "māo",
  "狗":   "gǒu",
  "飞机": "fēijī",
  "出租车": "chūzūchē",
  "天气": "tiānqì",
  "岁":   "suì",
  "课":   "kè",
  "汉语": "Hànyǔ",
  "汉字": "Hànzì",
  "字":   "zì",
  "桌子": "zhuōzi",
  "椅子": "yǐzi",
  "杯子": "bēizi",
  "一共": "yīgòng",

  // Verbs
  "是":   "shì",
  "有":   "yǒu",
  "叫":   "jiào",
  "说":   "shuō",
  "看":   "kàn",
  "听":   "tīng",
  "写":   "xiě",
  "读":   "dú",
  "学习": "xuéxí",
  "工作": "gōngzuò",
  "喜欢": "xǐhuan",
  "爱":   "ài",
  "想":   "xiǎng",
  "要":   "yào",
  "会":   "huì",
  "能":   "néng",
  "去":   "qù",
  "来":   "lái",
  "回":   "huí",
  "住":   "zhù",
  "坐":   "zuò",
  "走":   "zǒu",
  "开":   "kāi",
  "买":   "mǎi",
  "卖":   "mài",
  "吃":   "chī",
  "喝":   "hē",
  "睡觉": "shuìjiào",
  "起床": "qǐchuáng",
  "上课": "shàngkè",
  "下课": "xiàkè",
  "回家": "huíjiā",
  "吃饭": "chīfàn",
  "打电话": "dǎ diànhuà",
  "认识": "rènshi",
  "知道": "zhīdào",
  "谢谢": "xièxie",
  "请":   "qǐng",
  "再见": "zàijiàn",
  "你好": "nǐ hǎo",
  "对不起": "duìbuqǐ",
  "没关系": "méiguānxi",

  // Adjectives
  "好":   "hǎo",
  "大":   "dà",
  "小":   "xiǎo",
  "多":   "duō",
  "少":   "shǎo",
  "高":   "gāo",
  "冷":   "lěng",
  "热":   "rè",
  "漂亮": "piàoliang",
  "快":   "kuài",
  "慢":   "màn",
  "贵":   "guì",
  "忙":   "máng",
  "累":   "lèi",
  "高兴": "gāoxìng",

  // Adverbs
  "不":   "bù",
  "没":   "méi",
  "很":   "hěn",
  "太":   "tài",
  "也":   "yě",
  "都":   "dōu",
  "真":   "zhēn",
  "还":   "hái",
  "再":   "zài",
  "不太": "bú tài",

  // Question words
  "吗":   "ma",
  "呢":   "ne",
  "什么": "shénme",
  "谁":   "shéi",
  "哪儿": "nǎr",
  "哪里": "nǎlǐ",
  "怎么": "zěnme",
  "怎么样": "zěnmeyàng",
  "多少": "duōshao",
  "几":   "jǐ",
  "为什么": "wèishénme",
  "多大": "duō dà",

  // Particles
  "的":   "de",
  "了":   "le",
  "过":   "guò",
  "着":   "zhe",
  "地":   "de",
  "得":   "de",
  "是的": "shì de",

  // Prepositions
  "在":   "zài",
  "从":   "cóng",
  "到":   "dào",
  "对":   "duì",
  "比":   "bǐ",
  "给":   "gěi",

  // Conjunctions
  "和":   "hé",
  "但是": "dànshì",
  "因为": "yīnwèi",
  "所以": "suǒyǐ",
  "如果": "rúguǒ",

  // Measure words
  "个":   "gè",
  "本":   "běn",
  "些":   "xiē",
  "张":   "zhāng",
  "件":   "jiàn",
  "位":   "wèi",
  "碗":   "wǎn",
  "杯":   "bēi",

  // Common multi-word chunks used in sentences
  "多少钱": "duōshao qián",
  "没有":   "méiyǒu",
  "一点儿": "yīdiǎnr",
  "有点儿": "yǒudiǎnr",
  "一样":   "yīyàng",

  // Proper nouns
  "李华":   "Lǐ Huá",
  "王芳":   "Wáng Fāng",
  "李明":   "Lǐ Míng",
  "陈明":   "Chén Míng",

  // HSK 2 Preview words (used in lessons 9–12)
  "每天":   "měitiān",
  "先":     "xiān",
  "然后":   "ránhòu",
  "早饭":   "zǎofàn",
  "音乐":   "yīnyuè",
  "电影":   "diànyǐng",
  "运动":   "yùndòng",
  "跑步":   "pǎobù",
  "唱歌":   "chànggē",
  "游泳":   "yóuyǒng",
  "爱好":   "àihào",
  "不舒服": "bù shūfu",
  "发烧":   "fāshāo",
  "头":     "tóu",
  "手":     "shǒu",
  "眼睛":   "yǎnjing",
  "红色":   "hóngsè",
  "白色":   "báisè",
  "黑色":   "hēisè",
  "新":     "xīn",
  "旧":     "jiù",
  "最":     "zuì",
  "颜色":   "yánsè",
  "便宜":   "piányí",

  // Punctuation — always empty pinyin
  "。": "", "，": "", "！": "", "？": "",
  "、": "", "：": "", "；": "", "…": "",
};
```

### `readings_v3.js` — Reading Lines (no `py`)

Lines now only have `zh`, `words`, and `en`. No `py` array.

```javascript
// readings_v3.js

const READINGS = [
  {
    id: 1,
    lesson: 1,
    type: "dialogue",
    difficulty: 1,
    title: "你好！",
    titleEn: "Hello!",
    emoji: "👋",
    lines: [
      {
        zh:    "你好！",
        words: ["你", "好", "！"],
        en:    "Hello!"
      },
      {
        zh:    "你好！你叫什么名字？",
        words: ["你", "好", "！", "你", "叫", "什么", "名字", "？"],
        en:    "Hello! What is your name?"
      },
      {
        zh:    "我叫李华。你呢？",
        words: ["我", "叫", "李华", "。", "你", "呢", "？"],
        en:    "My name is Li Hua. And you?"
      },
      {
        zh:    "我叫王芳。",
        words: ["我", "叫", "王芳", "。"],
        en:    "My name is Wang Fang."
      },
      {
        zh:    "你是学生吗？",
        words: ["你", "是", "学生", "吗", "？"],
        en:    "Are you a student?"
      },
      {
        zh:    "是的，我是学生。",
        words: ["是的", "，", "我", "是", "学生", "。"],
        en:    "Yes, I am a student."
      },
      {
        zh:    "再见！",
        words: ["再见", "！"],
        en:    "Goodbye!"
      }
    ],
    questions: [
      {
        id: "q1",
        type: "multiple_choice",
        question: "李华是什么人？",
        questionEn: "What is Li Hua?",
        options: ["老师", "学生", "医生", "朋友"],
        answer: 1
      },
      {
        id: "q2",
        type: "true_false",
        question: "王芳叫李华。",
        questionEn: "Wang Fang is called Li Hua.",
        answer: false
      }
    ],
    focusWords: ["你好", "叫", "名字", "是", "学生", "再见"],
    grammarFocus: ["我叫…", "是…吗？", "你呢？"]
  },
  // ... remaining 23 readings follow same format
];
```

**Authoring rule:** Every token in `words[]` must exist in `WORD_MAP`. If a word is missing, `renderLine()` will render the character without pinyin and log a warning.

---

## JavaScript

### `renderer.js` — Word Map Lookup

```javascript
// renderer.js

// renderLine — builds ruby markup by looking up each word in WORD_MAP
// No py array needed. Pinyin comes entirely from WORD_MAP.
function renderLine(line) {
  if (!Array.isArray(line.words) || line.words.length === 0) {
    console.warn('[renderer] No words array for line:', line.zh);
    return document.createTextNode(line.zh);
  }

  const fragment = document.createDocumentFragment();

  line.words.forEach(word => {
    const pinyin = WORD_MAP[word];

    if (pinyin === undefined) {
      // Word not in WORD_MAP — render plain text, log for follow-up
      console.warn(`[renderer] "${word}" not found in WORD_MAP`);
      fragment.appendChild(document.createTextNode(word));
      return;
    }

    if (pinyin === "") {
      // Punctuation — render as plain text, no ruby wrapper
      fragment.appendChild(document.createTextNode(word));
      return;
    }

    // Normal word — wrap in <ruby>
    const ruby = document.createElement('ruby');
    ruby.appendChild(document.createTextNode(word));

    const rt = document.createElement('rt');
    rt.textContent = pinyin;
    ruby.appendChild(rt);

    fragment.appendChild(ruby);
  });

  return fragment;
}

// renderReading — renders a full reading into a container element
function renderReading(reading, containerEl) {
  containerEl.innerHTML = '';

  reading.lines.forEach(line => {
    const sentenceEl = document.createElement('div');
    sentenceEl.className = 'reading-sentence';

    // TTS button
    const speakBtn = document.createElement('button');
    speakBtn.className = 'speak-btn';
    speakBtn.textContent = '🔊';
    speakBtn.setAttribute('aria-label', `Speak: ${line.zh}`);
    speakBtn.onclick = () => speakText(line.zh);

    // Chinese with ruby pinyin
    const chineseEl = document.createElement('div');
    chineseEl.className = 'sentence-zh';
    chineseEl.appendChild(renderLine(line));

    // English translation
    const enEl = document.createElement('div');
    enEl.className = 'sentence-en';
    enEl.textContent = line.en;

    sentenceEl.appendChild(speakBtn);
    sentenceEl.appendChild(chineseEl);
    sentenceEl.appendChild(enEl);
    containerEl.appendChild(sentenceEl);
  });
}
```

### `settings.js` — Settings Manager

```javascript
// settings.js

const SETTINGS_VERSION = 1;
const STORAGE_KEY = 'hsk1_settings';

const DEFAULT_SETTINGS = {
  version:       SETTINGS_VERSION,
  pinyinVisible: true,
  charSize:      24,       // px, 16–32
  pinyinSize:    12,       // px, 8–16
  ttsEnabled:    true,
  ttsVoiceURI:   "",       // empty = system default
  ttsRate:       1,        // 0.5–2.0
  ttsVolume:     1,        // 0–1
  darkMode:      false
};

// In-memory working copy — avoids reading localStorage on every interaction
let pendingSettings = {};

function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_SETTINGS };
    // Merge stored with defaults so new keys are always present
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch (e) {
    console.warn('[settings] Corrupted data, reverting to defaults:', e);
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingSettings));
  } catch (e) {
    console.warn('[settings] Save failed:', e);
  }
  applySettings();
  closeSettings();
}

function saveSingleSetting(key, value) {
  pendingSettings[key] = value;
  saveSettings();
}

function resetSettings() {
  if (!confirm('Reset all settings to defaults?')) return;
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  pendingSettings = { ...DEFAULT_SETTINGS };
  applySettings();
  syncUIToSettings(pendingSettings);
}

function applySettings() {
  const s = pendingSettings;
  const root = document.documentElement;

  root.style.setProperty('--char-size',     s.charSize   + 'px');
  root.style.setProperty('--pinyin-size',   s.pinyinSize + 'px');
  root.style.setProperty('--pinyin-visible', s.pinyinVisible ? '1' : '0');

  document.body.classList.toggle('dark-mode', s.darkMode);
  syncUIToSettings(s);
}

function syncUIToSettings(s) {
  setSlider('char-size-slider',   'char-size-value',   s.charSize,   'px');
  setSlider('pinyin-size-slider', 'pinyin-size-value', s.pinyinSize, 'px');
  setSlider('tts-rate-slider',    'tts-rate-value',    s.ttsRate,    'x');
  setSlider('tts-volume-slider',  'tts-volume-value',  s.ttsVolume,  '');
  setSwitch('pinyin-toggle', s.pinyinVisible);
  setSwitch('tts-toggle',    s.ttsEnabled);
  setSwitch('dark-toggle',   s.darkMode);
  toggleTTSOptions(s.ttsEnabled);
  const voiceEl = document.getElementById('tts-voice');
  if (voiceEl && s.ttsVoiceURI) voiceEl.value = s.ttsVoiceURI;
}

function setSlider(sliderId, labelId, value, suffix) {
  const slider = document.getElementById(sliderId);
  const label  = document.getElementById(labelId);
  if (slider) slider.value = value;
  if (label)  label.textContent = parseFloat(value).toFixed(suffix === 'x' ? 1 : 0) + suffix;
}

function setSwitch(id, isActive) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('active', isActive);
  el.setAttribute('aria-checked', String(isActive));
}

// Single unified toggle — persists immediately, no separate Save needed for toggles
function toggleSetting(key, switchId, sideEffect) {
  pendingSettings[key] = !pendingSettings[key];
  setSwitch(switchId, pendingSettings[key]);
  if (key === 'pinyinVisible') {
    document.documentElement.style.setProperty(
      '--pinyin-visible', pendingSettings[key] ? '1' : '0'
    );
  }
  if (sideEffect) sideEffect(pendingSettings[key]);
  saveSettings();
}

// Live slider preview — CSS updates instantly, saves on modal close
function liveUpdate(key, value, labelId, suffix, cssVar) {
  const num = suffix === 'x' ? parseFloat(value) : parseInt(value);
  pendingSettings[key] = num;
  const label = document.getElementById(labelId);
  if (label) label.textContent = num.toFixed(suffix === 'x' ? 1 : 0) + suffix;
  if (cssVar) document.documentElement.style.setProperty(cssVar, num + (suffix === 'x' ? '' : suffix));
}

function toggleTTSOptions(enabled) {
  const el = document.getElementById('tts-options');
  if (el) el.style.display = enabled ? 'block' : 'none';
}
```

### `tts.js` — TTS Manager

```javascript
// tts.js

const synth = window.speechSynthesis;
let ttsVoices = [];

function loadTTSVoices() {
  return new Promise(resolve => {
    const voices = synth.getVoices();
    if (voices.length) {
      ttsVoices = voices;
      resolve(voices);
      return;
    }
    synth.onvoiceschanged = () => {
      ttsVoices = synth.getVoices();
      resolve(ttsVoices);
    };
    // Firefox never fires onvoiceschanged — fallback after 1s
    setTimeout(() => {
      ttsVoices = synth.getVoices();
      resolve(ttsVoices);
    }, 1000);
  });
}

function populateVoiceDropdown(voices) {
  const select = document.getElementById('tts-voice');
  if (!select) return;
  const zhVoices = voices.filter(v => v.lang.startsWith('zh') || v.lang.startsWith('cmn'));
  zhVoices.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.voiceURI;
    opt.textContent = `${v.name} (${v.lang})`;
    select.appendChild(opt);
  });
  const saved = pendingSettings.ttsVoiceURI;
  if (saved) select.value = saved;
}

function speakText(text) {
  const s = pendingSettings;
  if (!s.ttsEnabled || !text?.trim()) return;

  synth.cancel();

  const utterance     = new SpeechSynthesisUtterance(text);
  utterance.lang      = 'zh-CN';
  utterance.rate      = s.ttsRate;
  utterance.volume    = s.ttsVolume;

  if (s.ttsVoiceURI) {
    const voice = ttsVoices.find(v => v.voiceURI === s.ttsVoiceURI);
    if (voice) utterance.voice = voice;
  }

  utterance.onerror = e => {
    if (e.error === 'interrupted') return; // expected from synth.cancel()
    console.warn('[TTS] Error:', e.error);
  };

  synth.speak(utterance);
}

function stopSpeak() {
  synth.cancel();
}
```

### `app.js` — Modal & Initialization

```javascript
// app.js

let lastFocusedElement = null;

function openSettings() {
  lastFocusedElement = document.activeElement;
  pendingSettings = loadSettings();
  syncUIToSettings(pendingSettings);

  const modal = document.getElementById('settings-modal');
  modal.classList.add('active');
  modal.querySelector('.modal-content')?.focus();

  document.addEventListener('keydown', handleModalKeydown);
}

function closeSettings() {
  document.getElementById('settings-modal').classList.remove('active');
  document.removeEventListener('keydown', handleModalKeydown);
  lastFocusedElement?.focus();
  saveSettings(); // persist any pending slider changes
}

function handleModalKeydown(e) {
  if (e.key === 'Escape') { closeSettings(); return; }
  if (e.key !== 'Tab') return;

  const modal     = document.getElementById('settings-modal');
  const focusable = modal.querySelectorAll(
    'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    last.focus(); e.preventDefault();
  } else if (!e.shiftKey && document.activeElement === last) {
    first.focus(); e.preventDefault();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  pendingSettings = loadSettings();
  applySettings();

  if ('speechSynthesis' in window) {
    const voices = await loadTTSVoices();
    populateVoiceDropdown(voices);
  } else {
    document.querySelector('[data-setting="tts"]')?.remove();
  }
});
```

---

## CSS

### Root Variables

```css
:root {
  --char-size:      24px;
  --pinyin-size:    12px;
  --pinyin-visible: 1;
}
```

### Ruby Text

```css
/* Do NOT set display on ruby — native layout centers <rt> automatically */
ruby rt {
  font-family:  'Outfit', sans-serif;
  font-size:    var(--pinyin-size);
  font-weight:  500;
  color:        #b5302a;
  opacity:      var(--pinyin-visible);
  transition:   opacity 0.25s ease;
  user-select:  none;
}

.reading-sentence ruby + ruby {
  margin-left: 0.05em;
}
```

### Dark Mode

```css
body.dark-mode {
  background: #1a1208;
  color:      #f0ede8;
}

body.dark-mode ruby rt {
  color: #e8a0a0;
}
```

---

## File Structure

```
hsk1-app/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── word-map.js      # Central pinyin lookup — WORD_MAP constant
│   ├── readings_v3.js   # Reading data — words[] only, no py[]
│   ├── lessons.js       # Lesson + vocabulary data
│   ├── settings.js      # loadSettings, saveSettings, applySettings
│   ├── tts.js           # speakText, stopSpeak, loadTTSVoices
│   ├── renderer.js      # renderLine, renderReading
│   └── app.js           # Modal, init, page routing
└── README.md
```

**Script load order in `index.html`** — `word-map.js` must load before `renderer.js`:

```html
<script src="js/word-map.js"></script>
<script src="js/readings_v3.js"></script>
<script src="js/lessons.js"></script>
<script src="js/settings.js"></script>
<script src="js/tts.js"></script>
<script src="js/renderer.js"></script>
<script src="js/app.js"></script>
```

---

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge | Notes |
|---------|:------:|:-------:|:------:|:----:|-------|
| LocalStorage | ✅ | ✅ | ✅ | ✅ | |
| CSS Variables | ✅ | ✅ | ✅ | ✅ | |
| Ruby Text | ✅ | ✅ | ✅ | ✅ | Do not override `display` |
| Web Speech API | ✅ | ⚠️ | ⚠️ | ✅ | Firefox: no Chinese voices on most OSes |
| `onvoiceschanged` | ✅ | ❌ | ⚠️ | ✅ | Timeout fallback handles Firefox |
| `speechSynthesis.cancel()` | ✅ | ✅ | ⚠️ | ✅ | iOS Safari requires direct user gesture |

---

## Testing Checklist

### Word Map
- [ ] Every word in every reading exists in `WORD_MAP`
- [ ] No warnings in console for missing words during render
- [ ] Punctuation tokens render without `<rt>` tags
- [ ] Fixing a pinyin entry in `WORD_MAP` updates all readings

### Settings
- [ ] Settings persist after page reload
- [ ] Corrupted localStorage falls back gracefully
- [ ] All toggles persist immediately without clicking Save
- [ ] Sliders persist on modal close
- [ ] Reset clears localStorage and restores defaults

### Modal
- [ ] Escape key closes modal
- [ ] Tab key trapped inside modal
- [ ] Focus returns to trigger button on close
- [ ] `role="dialog"` and `aria-labelledby` present

### TTS
- [ ] Chinese voices populate in dropdown
- [ ] Rate, volume, and voice URI all applied to utterance
- [ ] `interrupted` error silently ignored
- [ ] TTS disabled hides options panel

### Rendering
- [ ] Pinyin appears above characters via native ruby
- [ ] Pinyin toggles on/off via CSS opacity
- [ ] Unknown words log warning and render without pinyin
- [ ] No `innerHTML` used with external data