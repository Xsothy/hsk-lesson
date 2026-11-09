<?php

namespace App\Http\Controllers;

use App\Models\Character;
use App\Services\HskSegmenter;
use App\Support\NameHelper;
use App\Support\Pinyin;
use App\Support\Zodiac;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/** F3 · Tools: pinyin converter, HSK checker, name helper, zodiac. */
class ToolsController extends Controller
{
    public const MAX_PINYIN = 2000;

    public const MAX_HSK = 5000;

    public const TOOLS = [
        ['pinyin', 'Pinyin converter', 'Tone numbers, tone marks, no tones, and hanzi → pinyin', 'tools.pinyin'],
        ['chart', 'HSK checker', 'Paste Chinese text and see each word’s HSK level', 'tools.hsk'],
        ['tag', 'Chinese name helper', 'A fun sound-alike name from your English name', 'tools.name'],
        ['calendar', 'Zodiac', 'Your Chinese zodiac animal and element', 'tools.zodiac'],
        ['pen', 'Worksheet PDF', 'Printable stroke-order practice sheets', 'worksheet'],
    ];

    public function __construct(private HskSegmenter $seg) {}

    /** The canvas shows one "Text tools" page with four tabs; every tool URL renders it with its tab open. */
    private function page(string $tab)
    {
        return view('pages.tools.index', [
            'tab' => $tab, 'maxPinyin' => self::MAX_PINYIN, 'maxHsk' => self::MAX_HSK,
            'themes' => array_keys(NameHelper::THEMES),
        ]);
    }

    public function index()
    {
        return $this->page('pinyin');
    }

    public function pinyin()
    {
        return $this->page('pinyin');
    }

    /** POST /tools/pinyin  {text, mode: marks|numbers|plain} */
    public function convertPinyin(Request $request)
    {
        $data = $request->validate(['text' => 'required|string|max:'.self::MAX_PINYIN, 'mode' => 'required|in:marks,numbers,plain,ruby']);
        $text = $data['text'];
        if ($data['mode'] === 'ruby') {
            return response()->json(['tokens' => $this->rubyTokens($text)]);
        }
        if (preg_match('/'.HskSegmenter::HAN.'/u', $text)) {
            $text = $this->seg->pinyin($text);
        }
        $out = match ($data['mode']) {
            'marks' => Pinyin::numbersToMarks($text),
            'numbers' => Pinyin::marksToNumbers($text),
            'plain' => Pinyin::stripTones($text),
        };

        return response()->json(['result' => $out]);
    }

    /** Word tokens with marked pinyin and both HSK levels, for "Pinyin over characters". */
    private function rubyTokens(string $text): array
    {
        $tokens = $this->seg->segment($text);
        $chars = Character::whereIn('char', collect($tokens)->filter(fn ($t) => $t['han'] && ! $t['word'])->pluck('t')->unique()->all())
            ->get(['char', 'pinyin', 'hsk2_level', 'hsk3_level'])->keyBy('char');
        $out = [];
        foreach ($tokens as $t) {
            $w = $t['word'];
            $c = $t['han'] && ! $w ? ($chars[$t['t']] ?? null) : null;
            $out[] = [
                't' => $t['t'], 'han' => $t['han'],
                'py' => $w ? $w->pinyin : ($c && is_array($c->pinyin) ? ($c->pinyin[0] ?? null) : null),
                'l2' => $w?->hsk2_level ?? $c?->hsk2_level, 'l3' => $w?->hsk3_level ?? $c?->hsk3_level,
            ];
        }

        return $out;
    }

    public function hsk()
    {
        return $this->page('hsk');
    }

    /** POST /tools/hsk-check  {text, version: 2.0|3.0} */
    public function checkHsk(Request $request)
    {
        $data = $request->validate(['text' => 'required|string|max:'.self::MAX_HSK, 'version' => 'required|in:2.0,3.0']);
        $col = $data['version'] === '3.0' ? 'hsk3_level' : 'hsk2_level';
        $tokens = [];
        $stats = [];
        $unknown = [];
        foreach ($this->seg->segment($data['text']) as $t) {
            $w = $t['word'];
            $level = $w?->{$col};
            $tokens[] = [
                't' => $t['t'], 'han' => $t['han'], 'level' => $level,
                'pinyin' => $w?->pinyin,
                'meaning' => $w && is_array($w->meanings) ? implode('; ', array_slice($w->meanings, 0, 2)) : null,
            ];
            if (! $t['han']) {
                continue;
            }
            if ($level) {
                $stats[$level] = ($stats[$level] ?? 0) + 1;
            } else {
                $stats['unknown'] = ($stats['unknown'] ?? 0) + 1;
                $unknown[$t['t']] = true;
            }
        }
        $total = array_sum($stats);
        $levels = [];
        foreach ($stats as $k => $n) {
            $levels[] = ['level' => $k, 'count' => $n, 'pct' => $total ? round($n / $total * 100) : 0];
        }
        usort($levels, fn ($a, $b) => ($a['level'] === 'unknown' ? 99 : $a['level']) <=> ($b['level'] === 'unknown' ? 99 : $b['level']));

        return response()->json(['tokens' => $tokens, 'levels' => $levels, 'total' => $total, 'unknown' => array_keys($unknown)]);
    }

    public function name()
    {
        return $this->page('name');
    }

    /** Common surnames for full-name ideas: [char, pinyin]. */
    public const SURNAMES = [['李', 'Lǐ'], ['王', 'Wáng'], ['张', 'Zhāng'], ['刘', 'Liú'], ['陈', 'Chén'], ['杨', 'Yáng'], ['赵', 'Zhào'], ['黄', 'Huáng'], ['周', 'Zhōu'], ['吴', 'Wú']];

    /** GET /tools/name/ideas?themes=Wise,Peace&style=balanced|modern|easy — full names from meaning characters. */
    public function ideas(Request $request)
    {
        $themes = array_keys(NameHelper::THEMES);
        $data = $request->validate(['themes' => 'required|array|min:1|max:3', 'themes.*' => 'in:'.implode(',', $themes), 'style' => 'required|in:balanced,modern,easy']);
        $pools = [];
        foreach (array_values(array_unique($data['themes'])) as $t) {
            $pool = $this->pool($t);
            if ($data['style'] === 'easy') {
                usort($pool, fn ($a, $b) => ($a['level'] ?? 9) <=> ($b['level'] ?? 9));
            } elseif ($data['style'] === 'modern') {
                $pool = array_slice($pool, 0, 8);
                shuffle($pool);
            }
            $pools[] = ['theme' => $t, 'chars' => array_slice($pool, 0, 6)];
        }
        $names = [];
        $seen = [];
        $sur = self::SURNAMES;
        shuffle($sur);
        for ($i = 0; $i < 12 && count($names) < 4; $i++) {
            $a = $pools[$i % count($pools)];
            $b = $pools[($i + 1) % count($pools)];
            $c1 = $a['chars'][intdiv($i, count($pools)) % max(1, count($a['chars']))] ?? null;
            $c2 = $b['chars'][(intdiv($i, count($pools)) + 1) % max(1, count($b['chars']))] ?? null;
            if (! $c1 || ! $c2 || $c1['char'] === $c2['char']) {
                continue;
            }
            $given = $c1['char'].$c2['char'];
            if (isset($seen[$given])) {
                continue;
            }
            $seen[$given] = true;
            [$sc, $sp] = $sur[count($names) % count($sur)];
            $names[] = [
                'name' => $sc.$given, 'given' => $given,
                'pinyin' => $sp.' '.mb_convert_case($c1['pinyin'].$c2['pinyin'], MB_CASE_TITLE),
                'meaning' => mb_strtolower($a['theme']).' · '.mb_strtolower($b['theme']),
            ];
        }

        return response()->json(['names' => $names]);
    }

    /** Characters whose definition names a positive quality, most frequent first. */
    private function pool(string $theme): array
    {
        return Cache::remember('tools.name.pool.v2.'.$theme, 3600, function () use ($theme) {
            $re = '/\b('.implode('|', NameHelper::THEMES[$theme]).')\b/i';

            return Character::where(fn ($q) => $q->whereNotNull('hsk3_level')->orWhereNotNull('hsk2_level'))
                ->orderBy('frequency')->get(['char', 'pinyin', 'definition', 'hsk2_level', 'hsk3_level'])
                ->filter(fn ($c) => preg_match($re, (string) $c->definition) && ! preg_match('/surname|variant|radical|\bname\b/i', $c->definition))
                ->take(24)
                ->map(fn ($c) => ['char' => $c->char, 'pinyin' => is_array($c->pinyin) ? ($c->pinyin[0] ?? '') : '', 'level' => $c->hsk3_level ?? $c->hsk2_level])
                ->values()->all();
        });
    }

    /** GET /tools/name/suggest?name= */
    public function suggestName(Request $request)
    {
        $name = $request->validate(['name' => 'required|string|max:60'])['name'];

        return response()->json(['syllables' => NameHelper::suggest($name)]);
    }

    /** GET /tools/name/meanings?theme= — characters whose definition names a positive quality. */
    public function meanings(Request $request)
    {
        $theme = $request->validate(['theme' => 'required|in:'.implode(',', array_keys(NameHelper::THEMES))])['theme'];
        $chars = Cache::remember('tools.name.'.$theme, 3600, function () use ($theme) {
            $re = '/\b('.implode('|', NameHelper::THEMES[$theme]).')\b/i';

            return Character::where(fn ($q) => $q->whereNotNull('hsk3_level')->orWhereNotNull('hsk2_level'))
                ->orderBy('frequency')->get(['char', 'pinyin', 'definition'])
                ->filter(fn ($c) => preg_match($re, (string) $c->definition) && ! preg_match('/surname|variant|radical|\bname\b/i', $c->definition))
                ->take(24)
                ->map(fn ($c) => ['char' => $c->char, 'pinyin' => is_array($c->pinyin) ? ($c->pinyin[0] ?? '') : '', 'meaning' => mb_substr((string) $c->definition, 0, 60)])
                ->values()->all();
        });

        return response()->json(['characters' => $chars]);
    }

    public function zodiac()
    {
        return $this->page('zodiac');
    }

    /** POST /tools/zodiac  {date: Y-m-d} */
    public function zodiacLookup(Request $request)
    {
        $data = $request->validate(['date' => 'required|date_format:Y-m-d|after_or_equal:1900-01-01|before_or_equal:2100-12-31']);

        return response()->json(Zodiac::forDate($data['date']));
    }
}
