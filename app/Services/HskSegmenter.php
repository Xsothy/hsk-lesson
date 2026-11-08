<?php

namespace App\Services;

use App\Models\Character;
use App\Models\HskWord;

/** Greedy longest-match segmentation of Chinese text against `hsk_words`. */
class HskSegmenter
{
    public const MAX_WORD = 6;

    /** CJK ideographs only (\p{Han} also matches some CJK punctuation). */
    public const HAN = '[\x{3400}-\x{4DBF}\x{4E00}-\x{9FFF}\x{20000}-\x{2FA1F}]';

    /**
     * @return list<array{t:string, han:bool, word:?HskWord}>  non-Han runs come back as one token each
     */
    public function segment(string $text): array
    {
        $runs = preg_split('/('.self::HAN.'+)/u', $text, -1, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY);
        $subs = [];
        foreach ($runs as $run) {
            if (! preg_match('/^'.self::HAN.'+$/u', $run)) {
                continue;
            }
            $c = mb_str_split($run);
            for ($i = 0, $n = count($c); $i < $n; $i++) {
                for ($l = 1; $l <= min(self::MAX_WORD, $n - $i); $l++) {
                    $subs[implode('', array_slice($c, $i, $l))] = true;
                }
            }
        }
        $dict = [];
        foreach (array_chunk(array_keys($subs), 500) as $chunk) {
            foreach (HskWord::whereIn('simplified', $chunk)->orderBy('id')->get() as $w) {
                $dict[$w->simplified] ??= $w;
            }
        }

        $tokens = [];
        foreach ($runs as $run) {
            if (! preg_match('/^'.self::HAN.'+$/u', $run)) {
                $tokens[] = ['t' => $run, 'han' => false, 'word' => null];

                continue;
            }
            $c = mb_str_split($run);
            for ($i = 0, $n = count($c); $i < $n;) {
                $hit = null;
                for ($l = min(self::MAX_WORD, $n - $i); $l >= 1; $l--) {
                    $s = implode('', array_slice($c, $i, $l));
                    if (isset($dict[$s])) {
                        $hit = [$s, $l];
                        break;
                    }
                }
                if ($hit) {
                    $tokens[] = ['t' => $hit[0], 'han' => true, 'word' => $dict[$hit[0]]];
                    $i += $hit[1];
                } else {
                    $tokens[] = ['t' => $c[$i], 'han' => true, 'word' => null];
                    $i++;
                }
            }
        }

        return $tokens;
    }

    /** Space-separated marked pinyin for text: words via hsk_words, other characters via `characters`, rest as-is. */
    public function pinyin(string $text): string
    {
        $tokens = $this->segment($text);
        $chars = Character::whereIn('char', collect($tokens)->filter(fn ($t) => $t['han'] && ! $t['word'])->pluck('t')->unique()->all())
            ->pluck('pinyin', 'char');
        $out = '';
        foreach ($tokens as $t) {
            if (! $t['han']) {
                $out .= $t['t'];

                continue;
            }
            $py = $t['word'] ? $t['word']->pinyin : (is_array($chars[$t['t']] ?? null) ? ($chars[$t['t']][0] ?? '') : '');
            $out .= ($out !== '' && ! preg_match('/[\s(“"‘\']$/u', $out) ? ' ' : '').($py !== '' && $py !== null ? $py : $t['t']);
        }

        return trim($out);
    }
}
