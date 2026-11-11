<?php

namespace App\Http\Controllers;

use App\Models\Character;
use App\Models\CharacterStroke;
use App\Models\Lesson;
use App\Services\ContentService;
use App\Support\Pinyin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Lesson quiz (beta): one question at a time over a lesson's own words and sentences — choose, match, build,
 * listen, speak and write. The page gets its content as JSON; questions are built in the browser (public/js/quiz.js).
 */
class QuizController extends Controller
{
    /** Readings the reference data lacks for common characters with two sounds. */
    private const EXTRA_SOUNDS = [
        '了' => ['le', 'liao'], '的' => ['de', 'di'], '得' => ['de', 'dei'], '地' => ['de', 'di'], '还' => ['hai', 'huan'],
        '都' => ['dou', 'du'], '行' => ['xing', 'hang'], '长' => ['chang', 'zhang'], '觉' => ['jue', 'jiao'], '乐' => ['le', 'yue'],
        '着' => ['zhe', 'zhao'], '谁' => ['shei', 'shui'], '那' => ['na', 'nei'], '这' => ['zhe', 'zhei'],
    ];

    public function __construct(private ContentService $content) {}

    public function show(string $slug)
    {
        $lesson = Lesson::where('slug', $slug)->where('is_published', true)->firstOrFail();

        $words = collect($lesson->vocab ?? [])->filter(fn ($h) => is_string($h) && $h !== '')->unique()->map(function ($h) {
            $e = $this->content->enrich($h);

            return ['hanzi' => $h, 'pinyin' => (string) ($e['p'] ?? ''), 'english' => (string) ($e['e'] ?? '')];
        })->filter(fn ($w) => $w['pinyin'] !== '' && $w['english'] !== '')->values();

        // A sentence becomes word tiles (punctuation dropped). Very short or very long ones make poor questions.
        $sentences = collect($lesson->sentences ?? [])->map(function ($s) {
            $tiles = array_values(array_filter((array) ($s['words'] ?? []), fn ($w) => is_string($w) && preg_match('/\p{Han}/u', $w)));

            return ['en' => (string) ($s['en'] ?? ''), 'tiles' => $tiles, 'sounds' => $this->soundsOf(implode('', $tiles), true)];
        })->filter(fn ($s) => $s['en'] !== '' && count($s['tiles']) >= 3 && count($s['tiles']) <= 8)->values();

        // Single-character words that have stroke data can be written.
        $single = $words->pluck('hanzi')->filter(fn ($h) => mb_strlen($h) === 1)->values();
        $writable = $single->isEmpty() ? [] : CharacterStroke::whereIn('char', $single)->whereNotNull('medians')->pluck('char')->all();

        $data = ['slug' => $lesson->slug, 'title' => $lesson->en_title ?: $lesson->title, 'words' => $words, 'sentences' => $sentences, 'writable' => array_values($writable)];

        return view('pages.quiz', ['lesson' => $lesson, 'data' => $data, 'enough' => $words->count() >= 4]);
    }

    /** Toneless pinyin readings for each Chinese character of ?text=, so spoken answers are scored by sound. */
    public function sounds(Request $request): JsonResponse
    {
        $text = mb_substr((string) $request->query('text', ''), 0, 120);

        return response()->json(['sounds' => $this->soundsOf($text)]);
    }

    /**
     * One list of readings per Chinese character, in order. Characters with no known reading are skipped,
     * or kept as an empty list when \$keepUnknown is set (so the list lines up with the characters).
     *
     * @return array<int, array<int, string>>
     */
    private function soundsOf(string $text, bool $keepUnknown = false): array
    {
        preg_match_all('/\p{Han}/u', $text, $m);
        $chars = $m[0];
        if (! $chars) {
            return [];
        }
        $known = Character::whereIn('char', array_unique($chars))->pluck('pinyin', 'char');
        $out = [];
        foreach ($chars as $c) {
            $readings = [];
            foreach ((array) ($known[$c] ?? []) as $p) {
                $plain = preg_replace('/[^a-z]/', '', str_replace('ü', 'v', mb_strtolower(Pinyin::toneless((string) $p))));
                if ($plain !== '') {
                    $readings[] = $plain;
                }
            }
            $readings = array_values(array_unique(array_merge($readings, self::EXTRA_SOUNDS[$c] ?? [])));
            if ($readings || $keepUnknown) {
                $out[] = $readings;
            }
        }

        return $out;
    }
}
