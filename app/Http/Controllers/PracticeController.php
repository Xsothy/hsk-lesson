<?php

namespace App\Http\Controllers;

use App\Models\Character;
use App\Models\HskWord;
use App\Models\Lesson;
use App\Services\ContentService;
use App\Services\HskWordSearch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** D1 · Practice session: source picker + Write / Dictation, queue built from lesson, HSK level/set, saved or due words. */
class PracticeController extends Controller
{
    public const MAX_QUEUE = 60;

    public function __construct(private ContentService $content, private HskWordSearch $search) {}

    public function index(Request $request)
    {
        $lessons = Lesson::where('is_published', true)->orderBy('number')->get(['slug', 'number', 'title', 'zh_title', 'en_title']);

        return view('pages.practice', [
            'lessons' => $lessons,
            'params' => $request->only(['lesson', 'version', 'level', 'set', 'source', 'mode', 'words', 'filter']),
            'levels2' => LearnController::levels(2),
            'levels3' => LearnController::levels(3),
        ]);
    }

    /**
     * GET /data/practice-queue — unique characters of a source, each with the word it came from.
     *   ?lesson=slug | ?version=2|3&level=&set= | ?words=学习,你好 (saved / due cards, sent by the client)
     */
    public function queue(Request $request): JsonResponse
    {
        $words = []; // [hanzi, pinyin, english]
        $label = 'Practice';

        if ($slug = $request->query('lesson')) {
            $lesson = Lesson::where('slug', (string) $slug)->where('is_published', true)->first();
            if (! $lesson) {
                return response()->json(['message' => 'Unknown lesson'], 404);
            }
            $label = 'Lesson '.$lesson->number;
            foreach ($lesson->vocab ?? [] as $h) {
                $e = $this->content->enrich((string) $h);
                $words[] = [(string) $h, $e['p'], $e['e']];
            }
        } elseif ($request->filled('words')) {
            $label = 'Your words';
            $list = array_slice(array_unique(array_filter(explode(',', (string) $request->query('words')))), 0, 200);
            $rows = HskWord::whereIn('simplified', $list)->get()->keyBy('simplified');
            foreach ($list as $h) {
                $r = $rows->get($h);
                $words[] = [$h, $r?->pinyin, $r ? implode('; ', array_slice((array) $r->meanings, 0, 2)) : null];
            }
        } elseif (in_array((int) $request->query('version'), [2, 3], true)) {
            $version = (int) $request->query('version');
            $level = (int) $request->query('level') ?: 1;
            $q = $this->search->query(['version' => $version, 'level' => $level]);
            $label = 'HSK '.$version.'.0 · level '.LearnController::levelLabel($version, $level);
            $set = (int) $request->query('set');
            if ($set >= 1) {
                $q->forPage($set, HskWordSearch::SET_SIZE);
                $label .= ' · set '.$set;
            } else {
                $q->limit(self::MAX_QUEUE * 2);
            }
            foreach ($q->get() as $w) {
                $words[] = [$w->simplified, $w->pinyin, implode('; ', array_slice((array) $w->meanings, 0, 2))];
            }
        } else {
            return response()->json(['message' => 'Choose a source'], 422);
        }

        $items = [];
        foreach ($words as [$word, $pinyin, $english]) {
            foreach (preg_split('//u', $word, -1, PREG_SPLIT_NO_EMPTY) as $c) {
                if (! preg_match('/^\p{Han}$/u', $c) || isset($items[$c])) {
                    continue;
                }
                $items[$c] = ['char' => $c, 'word' => $word, 'pinyin' => $pinyin, 'english' => $english];
            }
        }
        $items = array_slice(array_values($items), 0, self::MAX_QUEUE);

        // Single-character entries without a hint take pinyin/definition from the character table.
        $missing = collect($items)->filter(fn ($i) => ! $i['pinyin'] || ! $i['english'])->pluck('char')->all();
        if ($missing) {
            $chars = Character::whereIn('char', $missing)->get()->keyBy('char');
            foreach ($items as &$i) {
                if ($ch = $chars->get($i['char'])) {
                    $i['pinyin'] ??= ((array) $ch->pinyin)[0] ?? null;
                    $i['english'] ??= $ch->definition;
                }
            }
            unset($i);
        }

        return response()->json(['label' => $label, 'items' => $items], 200, [], JSON_UNESCAPED_UNICODE);
    }
}
