<?php

namespace App\Services;

use App\Models\Character;
use App\Models\Word;
use App\Support\Pinyin;

/**
 * Interlinear pinyin tokens for one line of text, following the old render.js rules:
 * each entry of `words` is looked up in the word map; '' = punctuation (plain text),
 * a reading = one <ruby>, unknown = plain text. Lines without `words` fall back to
 * per-character readings from the `characters` table.
 *
 * Token: ['zh' => string, 'pinyin' => ?string, 'syllables' => [['s' => 'nǐ', 't' => 3], …], 'vocab' => ?['e' => …]]
 */
class RubyTokens
{
    private const SYLLABLE = '/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?(iang|iong|uang|ueng|ang|eng|ing|ong|ian|iao|uai|uan|van|ai|ao|an|ei|en|er|ia|ie|in|iu|ou|ua|uo|ui|un|ve|ue|vn|a|o|e|i|u|v|ng|n|m|r)$/';

    private ?array $english = null;

    private array $charPinyin = [];

    public function __construct(private ContentService $content) {}

    /** @param array{zh?: string, words?: array<string>} $line */
    public function forLine(array $line): array
    {
        $words = $line['words'] ?? null;
        if (is_array($words) && $words) {
            return array_map(fn ($w) => $this->token((string) $w), $words);
        }

        return $this->fallback((string) ($line['zh'] ?? ''));
    }

    /**
     * Tokens for free text with no word list (e.g. grammar patterns "我叫 [name]。"):
     * greedy longest match against the word map, per-character fallback, other text kept plain.
     */
    public function forText(string $text): array
    {
        $map = $this->content->wordMap();
        $chars = mb_str_split($text);
        $tokens = [];
        $plain = '';
        $flush = function () use (&$plain, &$tokens) {
            if ($plain !== '') {
                $tokens[] = ['zh' => $plain, 'pinyin' => null, 'syllables' => [], 'vocab' => null];
                $plain = '';
            }
        };
        for ($i = 0, $n = count($chars); $i < $n;) {
            if (! preg_match('/\p{Han}/u', $chars[$i]) || in_array($chars[$i], ContentService::PUNCTUATION, true)) {
                $plain .= $chars[$i++];
                continue;
            }
            $flush();
            for ($len = min(4, $n - $i); $len > 1; $len--) {
                $w = implode('', array_slice($chars, $i, $len));
                if (! empty($map[$w])) {
                    break;
                }
            }
            $w = implode('', array_slice($chars, $i, $len));
            $tokens[] = ! empty($map[$w]) ? $this->token($w) : ($this->fallback($w)[0]);
            $i += $len;
        }
        $flush();

        return $tokens;
    }

    /** Adds `tokens` to every line. */
    public function lines(?array $lines): array
    {
        return array_map(fn ($l) => $l + ['tokens' => $this->forLine($l)], array_values($lines ?? []));
    }

    private function token(string $w): array
    {
        $map = $this->content->wordMap();
        $py = $map[$w] ?? null;
        if ($py === null || $py === '' || in_array($w, ContentService::PUNCTUATION, true)) {
            return ['zh' => $w, 'pinyin' => null, 'syllables' => [], 'vocab' => null];
        }

        return $this->ruby($w, $py, $this->englishOf($w));
    }

    private function ruby(string $zh, string $pinyin, ?string $english): array
    {
        return [
            'zh' => $zh,
            'pinyin' => $pinyin,
            'syllables' => array_map(fn ($s) => ['s' => $s, 't' => Pinyin::tone($s)], self::syllables($pinyin, mb_strlen($zh))),
            'vocab' => $english !== null ? ['e' => $english] : null,
        ];
    }

    /** Per-character fallback for lines with no word data. */
    private function fallback(string $zh): array
    {
        $chars = mb_str_split($zh);
        $missing = array_diff(array_unique($chars), array_keys($this->charPinyin));
        if ($missing) {
            foreach (Character::whereIn('char', $missing)->get(['char', 'pinyin']) as $c) {
                $this->charPinyin[$c->char] = $c->pinyin[0] ?? null;
            }
            foreach ($missing as $m) {
                $this->charPinyin[$m] ??= null;
            }
        }

        $tokens = [];
        foreach ($chars as $c) {
            $py = $this->charPinyin[$c] ?? null;
            $tokens[] = $py && ! in_array($c, ContentService::PUNCTUATION, true)
                ? $this->ruby($c, $py, $this->englishOf($c))
                : ['zh' => $c, 'pinyin' => null, 'syllables' => [], 'vocab' => null];
        }

        return $tokens;
    }

    private function englishOf(string $w): ?string
    {
        $this->english ??= Word::whereNotNull('english')->orderByDesc('sort_order')->orderByDesc('id')
            ->pluck('english', 'hanzi')->all(); // descending so the first entry wins

        return $this->english[$w] ?? null;
    }

    /**
     * Split a reading into syllables, one per character when possible:
     * "nǐ hǎo" → [nǐ, hǎo]; "míngzi" (2 chars) → [míng, zi]. Falls back to whitespace parts.
     */
    public static function syllables(string $pinyin, int $count): array
    {
        $parts = preg_split('/[\s\']+/u', trim($pinyin), -1, PREG_SPLIT_NO_EMPTY);
        if (count($parts) === $count || $count < 1) {
            return $parts;
        }
        $out = [];
        foreach ($parts as $k => $p) {
            $partsLeft = count($parts) - $k - 1;
            $split = self::split($p, max(1, $count - count($out) - $partsLeft));
            $out = array_merge($out, $split ?? [$p]);
        }

        return count($out) === $count ? $out : $parts;
    }

    /** Split one space-free chunk into syllables; tries to reach $max pieces, accepts fewer. */
    private static function split(string $chunk, int $max): ?array
    {
        $chars = mb_str_split($chunk);
        $plain = array_map(fn ($c) => Pinyin::toneless($c) ?: $c, $chars);
        $best = null;
        $walk = function (int $i, array $acc) use (&$walk, &$best, $chars, $plain, $max) {
            if ($best && count($best) === $max) {
                return;
            }
            if ($i === count($chars)) {
                if (! $best || abs(count($acc) - $max) < abs(count($best) - $max)) {
                    $best = $acc;
                }

                return;
            }
            if (count($acc) >= $max) {
                return;
            }
            for ($len = min(6, count($chars) - $i); $len >= 1; $len--) {
                $syl = strtolower(implode('', array_slice($plain, $i, $len)));
                if (preg_match(self::SYLLABLE, $syl)) {
                    $walk($i + $len, [...$acc, implode('', array_slice($chars, $i, $len))]);
                }
            }
        };
        $walk(0, []);

        return $best;
    }
}
