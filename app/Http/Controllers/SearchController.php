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
        $data = ['q' => $q, 'characters' => collect(), 'words' => collect(), 'wordTotal' => 0, 'lessons' => collect(), 'readings' => collect(), 'matched' => null, 'parts' => null];
        if ($q === '') {
            return view('pages.search', $data);
        }

        $query = $this->search->query(['q' => $q]);
        $wordTotal = (clone $query)->count();
        $hits = $query->limit(self::WORDS)->get();

        $characters = $this->characters($q, $hits);

        return view('pages.search', [
            ...$data,
            'wordTotal' => $wordTotal,
            'words' => $hits->map(fn ($w) => (object) [
                'hanzi' => $w->simplified, 'pinyin' => $w->pinyin, 'tone' => Pinyin::singleTone($w->pinyin),
                'english' => implode('; ', array_slice(is_array($w->meanings) ? $w->meanings : [], 0, 3)),
                'level' => $w->hsk3_level ?? $w->hsk2_level,
            ]),
            'characters' => $characters,
            'matched' => $this->matched($q, $hits),
            'parts' => $this->radicalPart($characters),
            ...$this->content($q),
        ]);
    }

    /** "Matched “xue” as pinyin (any tone). Also try 学, xué or “study”." — how the query was read, plus the other forms of the top hit. */
    private function matched(string $q, $hits): ?string
    {
        if ($hits->isEmpty()) {
            return null;
        }
        $top = $hits->first();
        if (preg_match('/\p{Han}/u', $q)) {
            $as = 'as Chinese characters';
        } elseif (preg_match('/[1-5]|[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/u', $q)) {
            $as = 'as pinyin with tones';
        } elseif ($hits->contains(fn ($w) => str_starts_with(mb_strtolower((string) $w->pinyin_plain), mb_strtolower(str_replace(' ', '', $q))))) {
            $as = 'as pinyin (any tone)';
        } else {
            $as = 'as English';
        }
        $meaning = trim(preg_split('/[;,(]/', (string) ((is_array($top->meanings) ? $top->meanings : [])[0] ?? ''))[0] ?? '');
        $try = array_values(array_unique(array_filter([$top->simplified, $top->pinyin, $meaning ? '“'.$meaning.'”' : null], fn ($t) => $t && mb_strtolower(trim($t, '“”')) !== mb_strtolower($q))));
        $also = match (count($try)) { 0 => '', 1 => ' Also try '.$try[0].'.', default => ' Also try '.implode(', ', array_slice($try, 0, -1)).' or '.end($try).'.' };

        return "Matched “{$q}” {$as}.{$also}";
    }

    /** The radical of the first character, for the "Guides & parts" box (links to /parts). */
    private function radicalPart($characters): ?object
    {
        $first = $characters->first();
        $r = $first ? Character::where('char', $first->c)->value('radical') : null;
        if (! $r) {
            return null;
        }
        $def = Character::where('char', $r)->value('definition');
        $gloss = \App\Services\PartsService::gloss($def);
        $users = Character::where('radical', $r)->whereNotNull('hsk3_level')->where('char', '!=', $r)
            ->orderBy('hsk3_level')->orderByRaw('COALESCE(frequency, 999999)')->limit(3)->pluck('char')->all();

        return (object) ['c' => $r, 'name' => ($gloss ? ucfirst($gloss).' ' : '').'radical', 'sub' => $users ? 'part of '.implode(', ', $users) : 'radical'];
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
                'n' => 'Lesson '.$l->number, 'title' => $l->en_title ?: $l->title, 'sub' => $l->zh_title,
                'zh' => $l->zh_title ?: $l->title, 'line' => 'Lesson '.$l->number.' · '.($l->en_title ?: $l->title),
                'href' => route('lesson', $l->slug),
            ])->values();

        $position = [];
        $hitReadings = Reading::where('is_published', true)->orderBy('id')->get()
            ->map(function ($r) use (&$position, $slugs, $has) {
                $position[$r->lesson_number] = ($position[$r->lesson_number] ?? 0) + 1;
                $slug = $slugs[$r->lesson_number] ?? null;

                return $slug && $has([$r->title, $r->title_en, $r->lines, $r->focus_words, $r->grammar_focus]) ? (object) [
                    'n' => 'Lesson '.$r->lesson_number.' · Reading '.$position[$r->lesson_number],
                    'title' => $r->title_en ?: $r->title, 'sub' => $r->title,
                    'zh' => $r->title, 'line' => 'Reading · Lesson '.$r->lesson_number,
                    'href' => route('reading', [$slug, $position[$r->lesson_number]]),
                ] : null;
            })->filter()->values();

        return ['lessons' => $hitLessons, 'readings' => $hitReadings];
    }
}
