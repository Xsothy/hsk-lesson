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
        ['🔤', 'Pinyin converter', 'Tone numbers, tone marks, no tones, and hanzi → pinyin', 'tools.pinyin'],
        ['📊', 'HSK checker', 'Paste Chinese text and see each word’s HSK level', 'tools.hsk'],
        ['📛', 'Chinese name helper', 'A fun sound-alike name from your English name', 'tools.name'],
        ['🐲', 'Zodiac', 'Your Chinese zodiac animal and element', 'tools.zodiac'],
        ['✍️', 'Worksheet PDF', 'Printable stroke-order practice sheets', 'worksheet'],
    ];

    public function __construct(private HskSegmenter $seg) {}

    public function index()
    {
        return view('pages.tools.index', ['tools' => self::TOOLS]);
    }

    public function pinyin()
    {
        return view('pages.tools.pinyin', ['max' => self::MAX_PINYIN]);
    }

    /** POST /tools/pinyin  {text, mode: marks|numbers|plain} */
    public function convertPinyin(Request $request)
    {
        $data = $request->validate(['text' => 'required|string|max:'.self::MAX_PINYIN, 'mode' => 'required|in:marks,numbers,plain']);
        $text = $data['text'];
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

    public function hsk()
    {
        return view('pages.tools.hsk', ['max' => self::MAX_HSK]);
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
        return view('pages.tools.name', ['themes' => array_keys(NameHelper::THEMES)]);
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
        return view('pages.tools.zodiac');
    }

    /** POST /tools/zodiac  {date: Y-m-d} */
    public function zodiacLookup(Request $request)
    {
        $data = $request->validate(['date' => 'required|date_format:Y-m-d|after_or_equal:1900-01-01|before_or_equal:2100-12-31']);

        return response()->json(Zodiac::forDate($data['date']));
    }
}
