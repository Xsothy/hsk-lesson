"""Review OC 3.0 lesson content (database/content/hsk3/*.json) before seeding.

  python scripts/review-oc3.py [--level 1]

Checks: required fields, question answers in range, vocab within the HSK 3.0
level, out-of-level words in example text (greedy segmentation against
hsk_words), tokens with no dictionary entry, duplicate vocab across lessons and
syllabus coverage. Exits 1 if any hard error is found.
"""
import glob, json, re, sqlite3, sys

sys.stdout.reconfigure(encoding="utf-8")
LEVEL = int(sys.argv[sys.argv.index("--level") + 1]) if "--level" in sys.argv else 1
db = sqlite3.connect("database/database.sqlite")
hsk = {}
for s, l3, l2 in db.execute("select simplified, hsk3_level, hsk2_level from hsk_words"):
    hsk.setdefault(s, (l3 or 99, l2))
dict_words = {r[0] for r in db.execute("select hanzi from words where pinyin is not null")}
NAMES = {"王", "李", "张", "明", "月", "小月", "小明", "王明", "李月", "张小月", "王小明", "大明", "小白"}  # whole names only, so 张 / 小 as words are still checked
# Fixed phrases and particles accepted in examples although outside the list.
ALLOW = {"你好", "快乐", "啊", "第一"}  # 快乐 only in 生日快乐 / 新年快乐

files = sorted(glob.glob("database/content/hsk3/*.json"))
lessons, extra_words = [], {}
for f in files:
    d = json.load(open(f, encoding="utf-8"))
    lessons += d["lessons"]
    for w in d.get("words", []):
        extra_words[w["c"]] = w
# Same greedy longest-match as ContentService::tokenize, over the dictionary
# plus every in-level word (so in-level words missing from the dictionary show up).
known = dict_words | set(extra_words) | {w for w, (l3, _) in hsk.items() if l3 <= LEVEL}
maxlen = max(map(len, known))

def segment(text):
    out, i = [], 0
    while i < len(text):
        if not re.match(r"[一-鿿〇]", text[i]):
            i += 1; continue
        for n in range(min(maxlen, len(text) - i), 0, -1):
            if text[i:i + n] in known or n == 1:
                out.append(text[i:i + n]); i += n; break
    return out

def splits(tok, ok):
    return tok == "" or any(tok[:n] in ok and splits(tok[n:], ok) for n in range(len(tok), 0, -1))

def composed(tok, ok):
    """True if tok splits into two or more words in ok (e.g. 看电视 = 看 + 电视)."""
    return any(tok[:n] in ok and splits(tok[n:], ok) for n in range(len(tok) - 1, 0, -1))

errors, warns = [], []
target = {w for w, (l3, _) in hsk.items() if l3 == LEVEL}
allowed = {w for w, (l3, _) in hsk.items() if l3 <= LEVEL} | NAMES | ALLOW
taught, seen_vocab = set(), {}
REQ = ["id", "zhTitle", "enTitle", "description", "emoji", "color", "emojiColor", "grammarLabel", "vocab", "grammar", "sentences", "dialogue", "readings"]

for l in sorted(lessons, key=lambda x: x["id"]):
    lid = l.get("id")
    for k in REQ:
        if k not in l: errors.append(f"L{lid}: missing {k}")
    for v in l["vocab"]:
        if v in seen_vocab: warns.append(f"L{lid}: vocab {v} already taught in L{seen_vocab[v]}")
        seen_vocab.setdefault(v, lid)
        if hsk.get(v, (99,))[0] > LEVEL: errors.append(f"L{lid}: vocab {v} is not HSK 3.0 level ≤{LEVEL}")
    taught |= set(l["vocab"])
    texts = [s["zh"] for s in l["sentences"] + l["dialogue"]] + [g["pattern"] for g in l["grammar"]]
    for r in l["readings"]:
        for k in ["type", "difficulty", "title", "titleEn", "emoji", "lines", "questions", "focusWords", "grammarFocus"]:
            if k not in r: errors.append(f"L{lid} reading {r.get('title')}: missing {k}")
        texts += [x["zh"] for x in r["lines"]]
        for q in r["questions"]:
            texts.append(q["question"])
            if q["type"] == "multiple_choice":
                texts += q["options"]
                if not 0 <= q["answer"] < len(q["options"]): errors.append(f"L{lid} {r['title']} {q['id']}: answer out of range")
            elif not isinstance(q["answer"], bool): errors.append(f"L{lid} {r['title']} {q['id']}: true_false answer must be bool")
        for fw in r["focusWords"]:
            if fw not in "".join(x["zh"] for x in r["lines"]): warns.append(f"L{lid} {r['title']}: focus word {fw} not in text")
    out_level, no_dict = set(), set()
    for t in texts:
        for tok in segment(t):
            if tok not in allowed and tok not in taught and not (len(tok) > 1 and composed(tok, allowed | taught)): out_level.add(tok)
            if tok not in dict_words and tok not in extra_words and tok not in NAMES and (len(tok) > 1 or tok in allowed):
                no_dict.add(tok)
    if out_level: warns.append(f"L{lid}: words outside level {LEVEL} / not yet taught: {' '.join(sorted(out_level))}")
    if no_dict: warns.append(f"L{lid}: no dictionary entry (add to words): {' '.join(sorted(no_dict))}")

missing = sorted(target - taught)
print(f"{len(lessons)} lessons, {len(taught & target)}/{len(target)} level-{LEVEL} words taught")
if missing: print(f"Not yet taught ({len(missing)}): {' '.join(missing)}")
for w in warns: print("WARN ", w)
for e in errors: print("ERROR", e)
sys.exit(1 if errors else 0)
