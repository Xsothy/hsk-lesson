<?php

namespace App\Http\Controllers;

use App\Models\HskWord;
use App\Models\Lesson;
use App\Services\ContentService;
use App\Services\HskWordSearch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** D2 · Review (flashcards): the page and a small public deck endpoint. SRS state stays in the browser. */
class ReviewController extends Controller
{
    public const MAX_CARDS = 300;

    public function __construct(private ContentService $content, private HskWordSearch $search) {}

    /**
     * GET /review
     *   ?lesson=slug               words of a lesson
     *   ?version=2|3&level=[&set=] an HSK level or a 15-word set (same links as Courses/Browse)
     *   ?source=saved|due          the browser's saved words / cards due now (resolved client-side, cards via /data/review-deck?words=)
     * Without any of these the page shows a deck chooser.
     */
    public function index()
    {
        $versions = [];
        foreach ([2, 3] as $v) {
            foreach (LearnController::levels($v) as $l) {
                $versions[$v][] = ['level' => $l, 'label' => LearnController::levelLabel($v, $l)];
            }
        }

        return view('pages.review', [
            'lessons' => Lesson::where('is_published', true)->orderBy('number')->get(['slug', 'number', 'title', 'en_title', 'vocab', 'course']),
            'levels' => $versions,
            'hskSize' => [2 => $this->search->query(['version' => 2, 'level' => 1])->count(), 3 => $this->search->query(['version' => 3, 'level' => 1])->count()],
        ]);
    }

    /**
     * GET /data/review-deck?lesson=|version=&level=[&set=]|words=a,b,c → { title, cards: [{id, hanzi, pinyin, english}] }
     * Public, read-only, throttled; at most 300 cards.
     */
    public function deck(Request $request): JsonResponse
    {
        $title = 'Review';
        $words = [];
        $preferLesson = false;

        if ($slug = $request->query('lesson')) {
            $lesson = Lesson::where('slug', (string) $slug)->where('is_published', true)->first();
            abort_unless($lesson, 404);
            $title = 'Lesson '.$lesson->number.' · '.($lesson->en_title ?: $lesson->title);
            $words = array_values(array_filter((array) $lesson->vocab, 'is_string'));
            $preferLesson = true;
        } elseif ($request->filled('version') || $request->filled('level')) {
            $version = (int) $request->query('version', 2);
            $level = (int) $request->query('level', 1);
            abort_unless(in_array($version, [2, 3], true) && in_array($level, LearnController::levels($version), true), 404);
            $query = $this->search->query(['version' => $version, 'level' => $level]);
            $label = LearnController::levelLabel($version, $level);
            $set = (int) $request->query('set');
            if ($set >= 1) {
                $query->forPage($set, HskWordSearch::SET_SIZE);
                $title = "HSK $version.0 · Level $label · Set $set";
            } else {
                $query->limit(self::MAX_CARDS);
                $title = "HSK $version.0 · Level $label";
            }
            $rows = $query->get(['simplified', 'pinyin', 'meanings']);

            return $this->respond($title, $rows->map(fn ($w) => self::hskCard($w))->unique('id')->values()->all());
        } elseif ($request->filled('words')) {
            $title = match ($request->query('source')) {
                'due' => 'Cards due',
                'saved' => 'Saved words',
                default => 'Your words',
            };
            $words = array_filter(array_map('trim', explode(',', (string) $request->query('words'))), fn ($w) => $w !== '' && mb_strlen($w) <= 12);
        } else {
            abort(422, 'Give lesson, version+level or words.');
        }

        $words = array_slice(array_values(array_unique($words)), 0, self::MAX_CARDS);
        $hsk = HskWord::whereIn('simplified', $words)->orderByRaw('COALESCE(frequency, 999999)')->orderBy('id')
            ->get(['simplified', 'pinyin', 'meanings'])->unique('simplified')->keyBy('simplified');

        $cards = [];
        foreach ($words as $h) {
            $lessonInfo = $this->content->enrich($h);
            $own = ! empty($lessonInfo['p']) && ! empty($lessonInfo['e']) ? ['id' => $h, 'hanzi' => $h, 'pinyin' => $lessonInfo['p'], 'english' => $lessonInfo['e']] : null;
            $ref = isset($hsk[$h]) ? self::hskCard($hsk[$h]) : null;
            $card = $preferLesson ? ($own ?? $ref) : ($ref ?? $own);
            $cards[] = $card ?? ['id' => $h, 'hanzi' => $h, 'pinyin' => $lessonInfo['p'] ?? '', 'english' => $lessonInfo['e'] ?? ''];
        }

        return $this->respond($title, $cards);
    }

    private function respond(string $title, array $cards): JsonResponse
    {
        return response()->json(['title' => $title, 'cards' => $cards], 200, [], JSON_UNESCAPED_UNICODE);
    }

    private static function hskCard($w): array
    {
        $meanings = is_array($w->meanings) ? $w->meanings : [];

        return ['id' => $w->simplified, 'hanzi' => $w->simplified, 'pinyin' => (string) $w->pinyin, 'english' => implode('; ', array_slice($meanings, 0, 3))];
    }
}
