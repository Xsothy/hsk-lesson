<?php

namespace App\Support;

/**
 * Pinyin normalisation: tone marks ↔ tone numbers ↔ toneless.
 *
 * Toneless form matches `hsk_words.pinyin_plain` (lowercase a–z, ü written as "v", no spaces).
 */
class Pinyin
{
    private const MARKS = [
        'a' => ['ā', 'á', 'ǎ', 'à'], 'e' => ['ē', 'é', 'ě', 'è'], 'i' => ['ī', 'í', 'ǐ', 'ì'],
        'o' => ['ō', 'ó', 'ǒ', 'ò'], 'u' => ['ū', 'ú', 'ǔ', 'ù'], 'ü' => ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
    ];

    /** "Xué xí" / "xue2xi2" / "lü" → "xuexi" / "xuexi" / "lv". */
    public static function toneless(string $s): string
    {
        $s = mb_strtolower($s);
        $map = ['ü' => 'v'];
        foreach (self::MARKS as $base => $marks) {
            foreach ($marks as $m) {
                $map[$m] = $base === 'ü' ? 'v' : $base;
            }
        }

        return preg_replace('/[^a-z]/', '', strtr($s, $map));
    }

    /** Tone (1–4) of a single marked syllable; 5 when it carries no mark. */
    public static function tone(string $syllable): int
    {
        foreach (self::MARKS as $marks) {
            foreach ($marks as $i => $m) {
                if (str_contains($syllable, $m)) {
                    return $i + 1;
                }
            }
        }

        return 5;
    }

    /** Tone of a one-syllable reading, or null for multi-syllable words (used for colouring). */
    public static function singleTone(?string $pinyin): ?int
    {
        $pinyin = trim((string) $pinyin);
        if ($pinyin === '' || str_contains($pinyin, ' ')) {
            return null;
        }
        $t = self::tone($pinyin);

        return $t === 5 ? null : $t;
    }

    /** Whether the input carries tone information (marks or digits 1–5). */
    public static function hasTones(string $s): bool
    {
        return (bool) preg_match('/[1-5]|[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/u', $s);
    }

    /**
     * Convert numbered pinyin to marked, keeping existing marks: "xue2" → "xué", "lv4" → "lǜ", "ma5" → "ma".
     * Each digit applies to the last vowel run before it (pinyin has one run per syllable).
     */
    public static function marked(string $s): string
    {
        $s = str_replace(['u:', 'v'], ['ü', 'ü'], mb_strtolower(trim($s)));

        return preg_replace_callback('/([a-zü]+)([0-5])/u', function ($m) {
            [$word, $tone] = [$m[1], (int) $m[2]];
            if ($tone < 1 || $tone > 4) {
                return $word;
            }
            if (! preg_match_all('/[aeiouü]+/u', $word, $runs, PREG_OFFSET_CAPTURE)) {
                return $word;
            }
            [$run, $offset] = end($runs[0]);
            $target = match (true) {
                str_contains($run, 'a') => 'a',
                str_contains($run, 'e') => 'e',
                str_contains($run, 'ou') => 'o',
                default => mb_substr($run, -1),
            };
            $pos = $target === mb_substr($run, -1) && ! in_array($target, ['a', 'e', 'o'], true)
                ? mb_strlen($run) - 1
                : mb_strpos($run, $target);
            $newRun = mb_substr($run, 0, $pos).self::MARKS[$target][$tone - 1].mb_substr($run, $pos + 1);
            $start = mb_strlen(substr($word, 0, $offset));

            return mb_substr($word, 0, $start).$newRun.mb_substr($word, $start + mb_strlen($run));
        }, $s);
    }

    /** Marked pinyin without spaces/apostrophes, for comparing with `REPLACE(pinyin,' ','')`. */
    public static function compactMarked(string $s): string
    {
        return preg_replace("/[\\s'’]+/u", '', self::marked($s));
    }
}
