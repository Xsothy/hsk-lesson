<?php

namespace App\Http\Controllers;

use App\Models\Character;
use App\Models\HskWord;
use App\Services\ContentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** F1 · Textbooks: fills in missing pinyin/meaning for a user's own imported words. Lists themselves live in the browser store. */
class TextbookController extends Controller
{
    public const MAX_WORDS = 300;

    public function __construct(private ContentService $content) {}

    /** POST /textbooks/lookup {words: ["学习", ...]} → {results: {"学习": {p, e}}}; unknown words are omitted. */
    public function lookup(Request $request): JsonResponse
    {
        $request->validate(['words' => ['required', 'array', 'max:'.self::MAX_WORDS], 'words.*' => ['string', 'max:24']]);
        $words = array_values(array_unique(array_filter(array_map('trim', $request->input('words')))));

        $hsk = HskWord::whereIn('simplified', $words)->orderByRaw('COALESCE(frequency, 999999)')->orderBy('id')
            ->get(['simplified', 'pinyin', 'meanings'])->unique('simplified')->keyBy('simplified');
        $chars = Character::whereIn('char', array_values(array_unique(preg_split('//u', implode('', $words), -1, PREG_SPLIT_NO_EMPTY))))->get()->keyBy('char');

        $results = [];
        foreach ($words as $w) {
            $p = $e = null;
            if ($r = $hsk->get($w)) {
                $p = $r->pinyin;
                $e = implode('; ', array_slice((array) $r->meanings, 0, 3));
            }
            if (! $p || ! $e) {
                $own = $this->content->enrich($w);
                $p = $p ?: $own['p'];
                $e = $e ?: $own['e'];
            }
            if (! $p || ! $e) {
                $letters = preg_split('//u', $w, -1, PREG_SPLIT_NO_EMPTY);
                if (count($letters) === 1 && ($c = $chars->get($w))) {
                    $p = $p ?: ((array) $c->pinyin)[0] ?? null;
                    $e = $e ?: $c->definition;
                } elseif (! $p) {
                    $parts = array_map(fn ($l) => ($c = $chars->get($l)) ? (((array) $c->pinyin)[0] ?? null) : null, $letters);
                    $p = in_array(null, $parts, true) ? null : implode('', $parts);
                }
            }
            if ($p || $e) {
                $results[$w] = ['p' => (string) $p, 'e' => (string) $e];
            }
        }

        return response()->json(['results' => (object) $results], 200, [], JSON_UNESCAPED_UNICODE);
    }
}
