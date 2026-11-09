<?php

namespace App\Http\Controllers;

use App\Models\HskWord;
use App\Models\Lesson;
use App\Models\Reading;
use App\Services\ContentService;
use App\Services\RubyTokens;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Alpha "Learn" pages: Home, Courses, Lesson, Reading. */
class LearnController extends Controller
{
    public const SET_SIZE = 15;

    public function __construct(private ContentService $content, private RubyTokens $ruby) {}

    /** HSK 3.0 stores levels 7–9 as a single band (level 7). */
    public static function levels(int $version): array
    {
        return $version === 2 ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 7];
    }

    public static function levelLabel(int $version, int $level): string
    {
        return $version === 3 && $level === 7 ? '7–9' : (string) $level;
    }

    private function levelCounts(int $version): array
    {
        $col = $version === 2 ? 'hsk2_level' : 'hsk3_level';

        return HskWord::whereNotNull($col)->selectRaw("$col as l, count(*) as n")->groupBy($col)->pluck('n', 'l')->all();
    }

    private function lessonCards()
    {
        return Lesson::where('is_published', true)->orderBy('number')->get()
            ->map(fn (Lesson $l) => (object) [
                'slug' => $l->slug, 'n' => $l->number, 'course' => $l->course ?? '2.0', 'title' => $l->en_title ?: $l->title,
                'zh' => $l->zh_title, 'emoji' => $l->emoji, 'vocab' => $l->vocab ?? [],
            ]);
    }

    public function home()
    {
        $count = HskWord::where('hsk2_level', 1)->whereRaw('length(simplified) = 1')->count(); // single hanzi
        $cotd = $count
            ? HskWord::where('hsk2_level', 1)->whereRaw('length(simplified) = 1')->orderBy('id')
                ->skip(((int) date('z')) % $count)->first()
            : null;

        return view('pages.home', [
            'lessons' => $this->lessonCards(),
            'cotd' => $cotd,
            'readingCount' => Reading::where('is_published', true)->count(),
            'hsk2' => $this->levelCounts(2),
            'hsk3' => $this->levelCounts(3),
        ]);
    }

    public function courses(Request $request)
    {
        // The HSK version (2.0 / 3.0) is a user setting applied client-side (html[data-hsk]); both versions are
        // rendered and CSS shows the one that matches. Old ?tab=hsk2|hsk3 links land on the HSK levels tab.
        $tab = match ($request->query('tab')) {
            'hsk', 'hsk2', 'hsk3' => 'hsk',
            'textbooks' => 'textbooks',
            default => 'ours',
        };
        $lessons = $this->lessonCards();

        return view('pages.courses', [
            'tab' => $tab,
            'lessons' => $lessons,
            'courses' => [2 => $lessons->where('course', '2.0')->values(), 3 => $lessons->where('course', '3.0')->values()],
            'counts' => $tab === 'hsk' ? [2 => $this->levelCounts(2), 3 => $this->levelCounts(3)] : [],
        ]);
    }

    /** GET /data/hsk/{version}/{level}/sets — study sets of 15 words ordered by frequency. */
    public function sets(int $version, int $level): JsonResponse
    {
        abort_unless(in_array($version, [2, 3]) && in_array($level, self::levels($version)), 404);
        $col = $version === 2 ? 'hsk2_level' : 'hsk3_level';

        $words = HskWord::where($col, $level)->orderByRaw('COALESCE(frequency, 999999)')->orderBy('id')
            ->get(['simplified', 'pinyin', 'meanings']);
        $sets = $words->chunk(self::SET_SIZE)->values()->map(fn ($chunk, $i) => [
            'set' => $i + 1,
            'count' => $chunk->count(),
            'words' => $chunk->pluck('simplified')->all(),
        ])->all();

        return response()->json([
            'version' => $version, 'level' => $level, 'label' => self::levelLabel($version, $level),
            'total' => $words->count(), 'set_size' => self::SET_SIZE, 'sets' => $sets,
        ]);
    }

    /** Old `lesson.html?slug=lesson-1` / `?lesson=1` URLs. */
    public function legacyLesson(\Illuminate\Http\Request $request)
    {
        $slug = (string) $request->query('slug', '');
        if ($slug === '' && ($n = (int) $request->query('lesson', $request->query('id', 0))) > 0) {
            $slug = Lesson::where('number', $n)->value('slug') ?? '';
        }

        return $slug !== '' && preg_match('/^[A-Za-z0-9\-_]+$/', $slug)
            ? redirect()->route('lesson', $slug, 301)
            : redirect()->route('courses', [], 301);
    }

    public function lesson(string $slug)
    {
        $lesson = Lesson::where('slug', $slug)->where('is_published', true)->firstOrFail();
        $map = $this->content->wordMap();
        $pinyinOf = fn (array $words) => trim(implode(' ', array_filter(array_map(fn ($w) => $map[$w] ?? '', $words))));

        $vocab = collect($lesson->vocab ?? [])->map(function ($h) {
            $e = $this->content->enrich($h);

            return (object) ['hanzi' => $h, 'pinyin' => $e['p'], 'english' => $e['e']];
        });
        $dialogue = collect($lesson->dialogue ?? [])->map(fn ($d) => $d + ['pinyin' => $pinyinOf($d['words'] ?? []), 'tokens' => $this->ruby->forLine($d)]);
        $sentences = collect($lesson->sentences ?? [])->map(fn ($s) => $s + ['pinyin' => $pinyinOf($s['words'] ?? []), 'tokens' => $this->ruby->forLine($s)]);
        $readings = Reading::where('lesson_number', $lesson->number)->where('is_published', true)->orderBy('id')->get();
        $grammar = collect($lesson->grammar ?? [])->map(fn ($g) => $g + [
            'tokens' => ! empty($g['pattern']) ? $this->ruby->forText((string) $g['pattern']) : [],
        ]);

        return view('pages.lesson', compact('lesson', 'vocab', 'grammar', 'dialogue', 'sentences', 'readings'));
    }

    public function reading(string $slug, int $n)
    {
        $lesson = Lesson::where('slug', $slug)->where('is_published', true)->firstOrFail();
        $readings = Reading::where('lesson_number', $lesson->number)->where('is_published', true)->orderBy('id')->get();
        $reading = $readings->get($n - 1);
        abort_unless($reading, 404);

        $map = $this->content->wordMap();
        $lines = collect($reading->lines ?? [])->map(fn ($l) => $l + [
            'pinyin' => trim(implode(' ', array_filter(array_map(fn ($w) => $map[$w] ?? '', $l['words'] ?? [])))),
            'tokens' => $this->ruby->forLine($l),
        ]);

        return view('pages.reading', [
            'lesson' => $lesson, 'reading' => $reading, 'lines' => $lines, 'n' => $n, 'total' => $readings->count(),
        ]);
    }
}
