<?php

namespace App\Http\Controllers;

use App\Models\Character;
use App\Models\Lesson;
use App\Models\Reading;
use App\Services\HskWordSearch;
use App\Support\Pinyin;
use Illuminate\Http\Request;

/** C3 · Search results: characters, words, and the lessons / readings that contain the query. */
class SearchController extends Controller
{
    public const WORDS = 20;

    public const CHARS = 12;

    public function __construct(private HskWordSearch $search) {}

    /** GET /search?q= */
    public function index(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        $data = ['q' => $q, 'characters' => collect(), 'words' => collect(), 'wordTotal' => 0, 'lessons' => collect(), 'readings' => collect()];
        if ($q === '') {
            return view('pages.search', $data);
        }

        $query = $this->search->query(['q' => $q]);
        $wordTotal = (clone $query)->count();
        $hits = $query->limit(self::WORDS)->get();

        return view('pages.search', [
            ...$data,
            'wordTotal' => $wordTotal,
            'words' => $hits->map(fn ($w) => (object) [
                'hanzi' => $w->simplified, 'pinyin' => $w->pinyin, 'tone' => Pinyin::singleTone($w->pinyin),
                'english' => implode('; ', array_slice(is_array($w->meanings) ? $w->meanings : [], 0, 3)),
            ]),
            'characters' => $this->characters($q, $hits),
            ...$this->content($q),
        ]);
    }

    /** Characters named in the query, else the single-character words that matched. */
    private function characters(string $q, $hits)
    {
        $chars = preg_match_all('/\p{Han}/u', $q, $m) ? array_values(array_unique($m[0])) : [];
        if (! $chars) {
            $chars = $hits->filter(fn ($w) => mb_strlen($w->simplified) === 1)->pluck('simplified')->all();
        }
        if (! $chars) {
            return collect();
        }
        $chars = array_slice($chars, 0, self::CHARS);

        return Character::whereIn('char', $chars)->get()
            ->sortBy(fn ($c) => array_search($c->char, $chars))->values()
            ->map(function ($c) {
                $reading = array_values(array_filter((array) $c->pinyin))[0] ?? '';

                return (object) [
                    'c' => $c->char, 'p' => $reading, 'tone' => Pinyin::singleTone($reading),
                    'm' => trim(preg_split('/[;,]/', (string) $c->definition)[0] ?? '') ?: null,
                ];
            });
    }

    /** Lessons and readings whose text contains the query (the corpus is tiny, so match in PHP). */
    private function content(string $q): array
    {
        $needle = mb_strtolower($q);
        $has = fn (array $parts) => str_contains(mb_strtolower(json_encode($parts, JSON_UNESCAPED_UNICODE)), $needle);

        $lessons = Lesson::where('is_published', true)->orderBy('number')->get();
        $slugs = $lessons->pluck('slug', 'number');

        $hitLessons = $lessons
            ->filter(fn ($l) => $has([$l->title, $l->zh_title, $l->en_title, $l->description, $l->content, $l->vocab, $l->grammar, $l->sentences, $l->dialogue]))
            ->map(fn ($l) => (object) [
                'n' => $l->full_label, 'title' => $l->en_title ?: $l->title, 'sub' => $l->zh_title,
                'href' => route('lesson', $l->slug),
            ])->values();

        $position = [];
        $hitReadings = Reading::where('is_published', true)->orderBy('id')->get()
            ->map(function ($r) use (&$position, $slugs, $has, $lessons) {
                $position[$r->lesson_number] = ($position[$r->lesson_number] ?? 0) + 1;
                $slug = $slugs[$r->lesson_number] ?? null;

                return $slug && $has([$r->title, $r->title_en, $r->lines, $r->focus_words, $r->grammar_focus]) ? (object) [
                    'n' => ($lessons->firstWhere('number', $r->lesson_number)?->full_label ?? 'Lesson '.$r->lesson_number).' · Reading '.$position[$r->lesson_number],
                    'title' => $r->title_en ?: $r->title, 'sub' => $r->title,
                    'href' => route('reading', [$slug, $position[$r->lesson_number]]),
                ] : null;
            })->filter()->values();

        return ['lessons' => $hitLessons, 'readings' => $hitReadings];
    }
}
