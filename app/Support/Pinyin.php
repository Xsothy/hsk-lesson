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

    private const TONED = 'āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ';

    /** Toneless but readable: "Xué xí" → "Xue xi", "lǜ" → "lü", "xue2" → "xue". Keeps case, spaces, punctuation. */
    public static function stripTones(string $s): string
    {
        $map = [];
        foreach (self::MARKS as $base => $marks) {
            foreach ($marks as $m) {
                $map[$m] = $base;
                $map[mb_strtoupper($m)] = mb_strtoupper($base);
            }
        }
        $s = strtr($s, $map);

        return preg_replace('/(?<=[A-Za-zÜü])[0-5]/u', '', $s);
    }

    /**
     * Tone numbers → tone marks, preserving case and punctuation:
     * "Xue2xi2" → "Xuéxí", "lv4"/"lu:4" → "lǜ", "ma5" → "ma", "xi1'an1" → "xī'ān".
     * Mark goes on a/e, else the o of "ou", else the last vowel.
     */
    public static function numbersToMarks(string $s): string
    {
        return preg_replace_callback('/([A-Za-zÜü]+(?::)?)([0-5])/u', function ($m) {
            $word = str_replace(['u:', 'U:', 'v', 'V'], ['ü', 'Ü', 'ü', 'Ü'], $m[1]);
            $tone = (int) $m[2];
            if ($tone < 1 || $tone > 4) {
                return $word;
            }
            $chars = mb_str_split($word);
            $lower = array_map('mb_strtolower', $chars);
            $idx = array_search('a', $lower, true);
            if ($idx === false) {
                $idx = array_search('e', $lower, true);
            }
            if ($idx === false && ($o = array_search('o', $lower, true)) !== false) {
                $idx = $o;
            }
            if ($idx === false) {
                foreach ($lower as $i => $c) {
                    if (in_array($c, ['i', 'u', 'ü'], true)) {
                        $idx = $i;
                    }
                }
            }
            if ($idx === false) {
                return $word;
            }
            $lc = $lower[$idx];
            $marked = self::MARKS[$lc][$tone - 1];
            $chars[$idx] = $chars[$idx] === $lc ? $marked : mb_strtoupper($marked);

            return implode('', $chars);
        }, $s);
    }

    /**
     * Tone marks → tone numbers: "Xuéxí" → "Xue2xi2", "lǜ" → "lv4", "māma" → "ma1ma5", "xī'ān" → "xi1'an1".
     * ü is written "v". Unmarked words with no mark anywhere ("ma", "de") are left as typed; once a word carries
     * a mark, unmarked trailing syllables get neutral tone 5.
     */
    public static function marksToNumbers(string $s): string
    {
        $rev = [];
        foreach (self::MARKS as $base => $marks) {
            foreach ($marks as $i => $m) {
                $rev[$m] = [$base, $i + 1];
            }
        }
        $isVowel = fn (?string $c) => $c !== null && in_array(mb_strtolower($c), ['a', 'e', 'i', 'o', 'u', 'ü', 'v'], true);
        $plain = fn (string $c) => match ($c) {
            'ü' => 'v', 'Ü' => 'V', default => $c,
        };

        return preg_replace_callback('/[A-Za-zÜü'.self::TONED.mb_strtoupper(self::TONED).']+/u', function ($m) use ($rev, $isVowel, $plain) {
            $chars = mb_str_split($m[0]);
            $n = count($chars);
            $hasMark = false;
            foreach ($chars as $c) {
                if (isset($rev[mb_strtolower($c)])) {
                    $hasMark = true;
                }
            }
            if (! $hasMark) {
                return $m[0];
            }
            $out = '';
            $buf = '';
            for ($i = 0; $i < $n; $i++) {
                $c = $chars[$i];
                $lc = mb_strtolower($c);
                if (! isset($rev[$lc])) {
                    $buf .= $plain($c);

                    continue;
                }
                [$base, $tone] = $rev[$lc];
                $buf .= $plain($c === $lc ? $base : mb_strtoupper($base));
                while ($isVowel($chars[$i + 1] ?? null)) {
                    $buf .= $plain($chars[++$i]);
                }
                $next = mb_strtolower($chars[$i + 1] ?? '');
                $after = $chars[$i + 2] ?? null;
                if ($next === 'n' && ($chars[$i + 2] ?? '') !== '' && mb_strtolower($chars[$i + 2]) === 'g' && ! $isVowel($chars[$i + 3] ?? null)) {
                    $buf .= $chars[++$i].$chars[++$i];
                } elseif (($next === 'n' || $next === 'r') && ! $isVowel($after)) {
                    $buf .= $chars[++$i];
                }
                $out .= $buf.$tone;
                $buf = '';
            }

            return $out.($buf !== '' ? $buf.'5' : '');
        }, $s);
    }

    /**
     * Tone-coloured HTML for a reading: one <span class="tone-N"> per syllable, escaped.
     * "xuéxí" + zh "学习" → two spans; " · "/","-separated alternatives are kept as text.
     */
    public static function toneHtml(?string $pinyin, ?string $zh = null): string
    {
        $pinyin = trim((string) $pinyin);
        if ($pinyin === '') {
            return '';
        }
        $parts = preg_split('/(\s*[·,;\/]\s*)/u', $pinyin, -1, PREG_SPLIT_DELIM_CAPTURE);
        $alternatives = count($parts) > 1;
        $out = '';
        foreach ($parts as $i => $part) {
            if ($i % 2 === 1) {
                $out .= e($part);
                continue;
            }
            $count = ($zh !== null && ! $alternatives) ? mb_strlen($zh) : 0;
            $syl = \App\Services\RubyTokens::syllables($part, $count);
            $sep = str_contains($part, ' ') ? ' ' : '';
            $out .= implode($sep, array_map(fn ($x) => '<span class="tone-'.self::tone($x).'">'.e($x).'</span>', $syl));
        }

        return $out;
    }
}
