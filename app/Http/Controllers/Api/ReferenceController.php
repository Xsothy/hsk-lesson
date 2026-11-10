<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Character;
use App\Services\CharacterService;
use App\Services\HskWordSearch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Read-only reference data: characters and HSK 2.0/3.0 words. */
class ReferenceController extends Controller
{
    public function character(string $char, CharacterService $chars): JsonResponse
    {
        $data = $chars->details($char);
        abort_if($data === null, 404, 'Character not found.');

        return response()->json(['data' => $data], 200, [], JSON_UNESCAPED_UNICODE);
    }

    /**
     * Stroke data in the Hanzi Writer format ({strokes, medians, radStrokes?}), served from our own
     * database so the writing pages do not depend on a CDN. 404 until `hsk:import-reference` has run.
     */
    public function strokes(string $char): JsonResponse
    {
        $row = \App\Models\CharacterStroke::where('char', mb_substr($char, 0, 1))->first();
        abort_if(! $row || empty($row->medians), 404, 'No stroke data for this character.');

        $data = ['strokes' => $row->strokes, 'medians' => $row->medians];
        if ($row->rad_strokes) {
            $data['radStrokes'] = $row->rad_strokes;
        }

        // The data only changes when the reference import is re-run, so browsers may keep it for a week.
        return response()->json($data, 200, ['Cache-Control' => 'public, max-age=604800']);
    }

    public function characters(Request $request): JsonResponse
    {
        $q = Character::query()->orderByRaw('COALESCE(hsk3_level, 10)')->orderByRaw('COALESCE(frequency, 999999)');
        foreach (['radical', 'hsk2_level', 'hsk3_level'] as $f) {
            if ($request->filled($f)) {
                $q->where($f, $request->query($f));
            }
        }

        return response()->json($q->paginate(min((int) $request->query('per_page', 100), 500)));
    }

    /**
     * ?q= matches hanzi, pinyin ("xue", "xué", "xue2") or English, ranked best first;
     * ?version=2|3&level= or ?hsk2_level= / ?hsk3_level= filter. See HskWordSearch.
     */
    public function hskWords(Request $request, HskWordSearch $search): JsonResponse
    {
        $q = $search->query($request->only(['q', 'version', 'level', 'hsk2_level', 'hsk3_level']));

        return response()->json($q->paginate(min(max((int) $request->query('per_page', 100), 1), 500)));
    }
}
