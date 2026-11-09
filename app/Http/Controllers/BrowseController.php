<?php

namespace App\Http\Controllers;

use App\Models\Character;
use App\Services\HskWordSearch;
use App\Support\Pinyin;
use App\Support\Radicals;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/** C2 · Browse: HSK 2.0 / 3.0 lists, characters by pinyin and by radical, and word search. */
class BrowseController extends Controller
{
    public const PER_PAGE = 150;

    public const SEARCH_PER_PAGE = 50;

    public const TABS = ['hsk2' => 'HSK 2.0', 'hsk3' => 'HSK 3.0', 'pinyin' => 'By pinyin', 'radical' => 'By radical'];

    public function __construct(private HskWordSearch $search) {}

    /**
     * GET /browse
     *   ?q=                         search (hanzi, pinyin in any form, English)
     *   ?tab=hsk2|hsk3&level=       HSK list; ?version=2|3&level=&set= is what Courses links to
     *   ?tab=pinyin&syl=xue&tone=2  characters by toneless syllable, optional tone 1–5
     *   ?tab=radical&r=子           characters by radical (grouped by stroke count)
     */
    public function index(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        $version = (int) $request->query('version', 0);
        $tab = $request->query('tab');
        if (! array_key_exists((string) $tab, self::TABS)) {
            $tab = $version === 3 ? 'hsk3' : 'hsk2';
        }
        $data = ['tab' => $tab, 'q' => $q, 'title' => null, 'items' => collect(), 'paginator' => null, 'practice' => []];

        if ($q !== '') {
            $hits = $this->search->query(['q' => $q])->paginate(self::SEARCH_PER_PAGE)->withQueryString();
            $data['paginator'] = $hits;
            $data['items'] = collect($hits->items())->map(fn ($w) => self::wordItem($w));
            $data['title'] = $hits->total().' '.str('result')->plural($hits->total()).' for “'.$q.'”';
            $data['tab'] = null;

            return view('pages.browse', $data);
        }

        return view('pages.browse', match ($tab) {
            'pinyin' => $this->byPinyin($request, $data),
            'radical' => $this->byRadical($request, $data),
            default => $this->hsk($request, $data, $tab === 'hsk3' ? 3 : 2),
        });
    }

    private function hsk(Request $request, array $data, int $version): array
    {
        $levels = LearnController::levels($version);
        $level = in_array((int) $request->query('level'), $levels, true) ? (int) $request->query('level') : 1;
        $label = LearnController::levelLabel($version, $level);
        $query = $this->search->query(['version' => $version, 'level' => $level]);
        $total = (clone $query)->count();
        $sets = (int) ceil($total / HskWordSearch::SET_SIZE);
        $set = (int) $request->query('set');
        $set = $set >= 1 && $set <= $sets ? $set : null;

        if ($set) {
            $words = $query->forPage($set, HskWordSearch::SET_SIZE)->get();
            $data['title'] = "Level $label · Set $set · ".$words->count().' words';
        } else {
            $words = $query->paginate(self::PER_PAGE)->withQueryString();
            $data['paginator'] = $words;
            $data['title'] = "Level $label · ".number_format($total).' words';
        }

        $counts = [];
        foreach ($levels as $lv) {
            $counts[$lv] = $lv === $level ? $total : $this->search->query(['version' => $version, 'level' => $lv])->count();
        }

        return [
            ...$data,
            'version' => $version, 'levels' => $levels, 'levelCounts' => $counts, 'level' => $level, 'set' => $set, 'sets' => $sets,
            'items' => collect($set ? $words : $words->items())->map(fn ($w) => self::wordItem($w)),
            'practice' => array_filter(['version' => $version, 'level' => $level, 'set' => $set]),
        ];
    }

    private function byPinyin(Request $request, array $data): array
    {
        $readings = $this->hskCharacters()->flatMap(fn ($c) => collect($c->readings)->map(fn ($r) => [
            'char' => $c, 'reading' => $r, 'syl' => Pinyin::toneless($r), 'tone' => Pinyin::tone($r),
        ]))->filter(fn ($r) => $r['syl'] !== '');
        $bySyllable = $readings->groupBy('syl')->sortKeys();
        $groups = $bySyllable->map->count()->groupBy(fn ($n, $syl) => $syl[0], true);

        $syl = Pinyin::toneless((string) $request->query('syl', ''));
        $syl = $bySyllable->has($syl) ? $syl : null;
        $tone = in_array((int) $request->query('tone'), [1, 2, 3, 4, 5], true) ? (int) $request->query('tone') : null;
        $toneCounts = [];
        $toneLabels = [];

        if ($syl) {
            $hits = $bySyllable[$syl]->unique(fn ($r) => $r['char']->char.$r['tone']);
            $toneCounts = $hits->countBy('tone')->sortKeys()->all();
            $toneLabels = $hits->groupBy('tone')->map(fn ($g) => $g->first()['reading'])->all();
            $hits = $tone ? $hits->where('tone', $tone) : $hits;
            $data['items'] = $hits->sortBy(fn ($r) => $r['char']->frequency ?? 999999)->values()
                ->map(fn ($r) => self::charItem($r['char'], $r['reading']));
            $data['title'] = $syl.($tone ? " · tone $tone" : '').' · '.$data['items']->count().' characters';
        }

        return [...$data, 'groups' => $groups, 'syl' => $syl, 'tone' => $tone, 'toneCounts' => $toneCounts, 'toneLabels' => $toneLabels];
    }

    private function byRadical(Request $request, array $data): array
    {
        $byRadical = $this->hskCharacters()->filter(fn ($c) => $c->radical)->groupBy('radical');
        $groups = $byRadical->map->count()->sortDesc()
            ->groupBy(fn ($n, $r) => Radicals::strokes($r) ?? 99, true)->sortKeys();

        $r = (string) $request->query('r', '');
        $r = $byRadical->has($r) ? $r : null;
        if ($r) {
            $data['items'] = $byRadical[$r]->sortBy(fn ($c) => $c->frequency ?? 999999)->values()
                ->map(fn ($c) => self::charItem($c));
            $strokes = Radicals::strokes($r);
            $data['title'] = "Radical $r".($strokes ? " · $strokes ".str('stroke')->plural($strokes) : '')
                .' · '.$data['items']->count().' characters';
        }

        $radPinyin = Character::whereIn('char', $byRadical->keys()->all())->get(['char', 'pinyin'])
            ->mapWithKeys(fn ($c) => [$c->char => array_values(array_filter((array) $c->pinyin))[0] ?? ''])->all();

        return [...$data, 'groups' => $groups, 'radical' => $r, 'radPinyin' => $radPinyin];
    }

    /** HSK characters (2.0 or 3.0) with readings, cached — the pinyin and radical tabs group these. */
    private function hskCharacters(): Collection
    {
        $count = Character::whereNotNull('hsk2_level')->orWhereNotNull('hsk3_level')->count();

        // Cached as plain arrays: the cache store only unserializes allow-listed classes.
        $rows = Cache::remember("browse.hsk-chars.v2.$count", 86400, fn () => Character::query()
            ->where(fn ($w) => $w->whereNotNull('hsk2_level')->orWhereNotNull('hsk3_level'))
            ->get(['char', 'pinyin', 'definition', 'radical', 'frequency'])
            ->map(fn ($c) => [
                'char' => $c->char, 'readings' => array_values(array_filter((array) $c->pinyin)),
                'definition' => $c->definition, 'radical' => $c->radical, 'frequency' => $c->frequency,
            ])->all());

        return collect($rows)->map(fn ($r) => (object) $r);
    }

    private static function wordItem($w): object
    {
        $meanings = is_array($w->meanings) ? $w->meanings : [];

        return (object) [
            'hanzi' => $w->simplified, 'pinyin' => $w->pinyin, 'tone' => Pinyin::singleTone($w->pinyin),
            'english' => implode('; ', array_slice($meanings, 0, 3)),
            'short' => $meanings[0] ?? null,
        ];
    }

    private static function charItem(object $c, ?string $reading = null): object
    {
        $reading ??= $c->readings[0] ?? '';
        $short = trim(preg_split('/[;,]/', (string) $c->definition)[0] ?? '');

        return (object) [
            'hanzi' => $c->char, 'pinyin' => $reading, 'tone' => Pinyin::singleTone($reading),
            'english' => (string) str((string) $c->definition)->limit(80), 'short' => $short ?: null,
        ];
    }

    /** GET /data/hsk-words?q&version&level&page[&per_page] — public, read-only, same search as /api/v1/hsk-words. */
    public function words(Request $request): JsonResponse
    {
        $opts = $request->only(['q', 'version', 'level']);
        if (! empty($opts['level']) && empty($opts['version'])) {
            $opts['version'] = 2;
        }
        $perPage = min(max((int) $request->query('per_page', 50), 1), 100);
        $page = $this->search->query($opts)
            ->paginate($perPage, ['id', 'simplified', 'traditional', 'pinyin', 'meanings', 'hsk2_level', 'hsk3_level', 'frequency'])
            ->withQueryString();

        return response()->json($page, 200, [], JSON_UNESCAPED_UNICODE);
    }
}
