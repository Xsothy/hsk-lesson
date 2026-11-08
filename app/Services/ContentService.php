<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Lesson;
use App\Models\Reading;
use App\Models\Word;
use Illuminate\Support\Collection;

/**
 * Shared content logic: legacy-format builders for the frontend,
 * word enrichment, tokenization and integrity checks.
 */
class ContentService
{
    public const PUNCTUATION = ['。', '，', '！', '？', '、', '：', '；', '…', '“', '”', '（', '）', '.', ',', '!', '?', ' '];

    private ?array $wordMap = null;

    /** @return Collection<int, Word> */
    public function words(): Collection
    {
        return Word::orderBy('sort_order')->orderBy('id')->get();
    }

    public function dictionary(): array
    {
        return [
            'categories' => Category::orderBy('sort_order')->pluck('label', 'key'),
            'words' => $this->words()->filter(fn (Word $w) => $w->pinyin !== null)
                ->map->toDictionaryEntry()->values(),
        ];
    }

    public function vocabulary(): array
    {
        return $this->words()->filter(fn (Word $w) => $w->parts || $w->literal)
            ->unique('hanzi')
            ->mapWithKeys(fn (Word $w) => [$w->hanzi => array_filter(['parts' => $w->parts, 'literal' => $w->literal])])
            ->all();
    }

    /** hanzi => pinyin. Legacy snapshot (proper nouns, single chars, punctuation) overlaid with live DB words. */
    public function wordMap(): array
    {
        if ($this->wordMap !== null) {
            return $this->wordMap;
        }

        $base = json_decode(file_get_contents(database_path('legacy/content.json')), true)['word_map'] ?? [];
        foreach ($this->words()->reverse() as $w) { // reverse so the first dictionary entry wins
            if ($w->pinyin !== null) {
                $base[$w->hanzi] = $w->pinyin;
            }
        }
        foreach (self::PUNCTUATION as $p) {
            $base[$p] ??= '';
        }
        ksort($base);

        return $this->wordMap = $base;
    }

    public function lessonsIndex(bool $includeUnpublished = false): array
    {
        return Lesson::orderBy('number')
            ->when(! $includeUnpublished, fn ($q) => $q->where('is_published', true))
            ->get()->map->toSummary()->all();
    }

    public function readings(bool $includeUnpublished = false): array
    {
        return Reading::orderBy('lesson_number')->orderBy('id')
            ->when(! $includeUnpublished, fn ($q) => $q->where('is_published', true))
            ->get()->map->toLegacy()->all();
    }

    /** Full word info for one hanzi string (dictionary + breakdown merged), like HSK_API.enrichVocabWord. */
    public function enrich(string $hanzi): array
    {
        $entries = Word::where('hanzi', $hanzi)->orderBy('sort_order')->get();
        $main = $entries->firstWhere('pinyin', '!=', null) ?? $entries->first();
        $breakdown = $entries->first(fn ($w) => $w->parts || $w->literal);

        return [
            'c' => $hanzi,
            'p' => $main?->pinyin ?? $this->wordMap()[$hanzi] ?? null,
            'e' => $main?->english,
            'cat' => $main?->category,
            'hsk_level' => $main?->hsk_level,
            'parts' => $breakdown?->parts,
            'literal' => $breakdown?->literal,
            'in_dictionary' => $main?->pinyin !== null,
        ];
    }

    /** Greedy longest-match segmentation against the dictionary + word map. */
    public function tokenize(string $text): array
    {
        $known = $this->wordMap();
        $maxLen = max(array_map('mb_strlen', array_keys($known)) ?: [1]);
        $chars = mb_str_split($text);
        $tokens = [];
        $n = count($chars);

        for ($i = 0; $i < $n;) {
            $matched = null;
            for ($len = min($maxLen, $n - $i); $len >= 1; $len--) {
                $candidate = implode('', array_slice($chars, $i, $len));
                if (array_key_exists($candidate, $known)) {
                    $matched = $candidate;
                    break;
                }
            }
            $matched ??= $chars[$i];
            if (trim($matched) !== '') {
                $tokens[] = $matched;
            }
            $i += mb_strlen($matched);
        }

        return $tokens;
    }

    /** Fill in missing `words` arrays on lines ([{zh, en, words?}]) by tokenizing `zh`. */
    public function normalizeLines(?array $lines): ?array
    {
        if ($lines === null) {
            return null;
        }

        return array_map(function ($line) {
            if (is_array($line) && ! empty($line['zh']) && empty($line['words'])) {
                $line['words'] = $this->tokenize($line['zh']);
            }

            return $line;
        }, $lines);
    }

    /** Integrity report: unknown words, token/text mismatches, broken references. */
    public function validate(): array
    {
        $map = $this->wordMap();
        $issues = [];
        $check = function (string $where, array $lines) use (&$issues, $map) {
            foreach ($lines as $i => $line) {
                $words = $line['words'] ?? [];
                if (implode('', $words) !== str_replace(' ', '', $line['zh'] ?? '')) {
                    $issues[] = ['where' => "$where.$i", 'type' => 'tokens_do_not_match_text', 'zh' => $line['zh'] ?? null, 'words' => $words];
                }
                foreach ($words as $w) {
                    if (! array_key_exists($w, $map)) {
                        $issues[] = ['where' => "$where.$i", 'type' => 'word_missing_pinyin', 'word' => $w];
                    }
                }
            }
        };

        $dictionary = Word::whereNotNull('pinyin')->pluck('hanzi')->flip();
        $lessonNumbers = Lesson::pluck('number')->flip();

        foreach (Lesson::orderBy('number')->get() as $lesson) {
            foreach ($lesson->vocab ?? [] as $v) {
                if (! isset($dictionary[$v])) {
                    $issues[] = ['where' => "lessons.{$lesson->slug}.vocab", 'type' => 'vocab_not_in_dictionary', 'word' => $v];
                }
            }
            $check("lessons.{$lesson->slug}.sentences", $lesson->sentences ?? []);
            $check("lessons.{$lesson->slug}.dialogue", $lesson->dialogue ?? []);
        }

        foreach (Reading::orderBy('id')->get() as $reading) {
            if ($reading->lesson_number !== null && ! isset($lessonNumbers[$reading->lesson_number])) {
                $issues[] = ['where' => "readings.{$reading->id}", 'type' => 'unknown_lesson_number', 'lesson_number' => $reading->lesson_number];
            }
            $check("readings.{$reading->id}.lines", $reading->lines ?? []);
            foreach ($reading->questions ?? [] as $qi => $q) {
                if (isset($q['options'], $q['answer']) && is_int($q['answer']) && ! array_key_exists($q['answer'], $q['options'])) {
                    $issues[] = ['where' => "readings.{$reading->id}.questions.$qi", 'type' => 'answer_index_out_of_range'];
                }
            }
        }

        return ['ok' => $issues === [], 'issue_count' => count($issues), 'issues' => $issues];
    }
}
