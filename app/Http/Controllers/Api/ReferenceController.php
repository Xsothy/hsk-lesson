<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Character;
use App\Models\HskWord;
use App\Services\CharacterService;
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

    /** ?q= matches hanzi, toneless pinyin ("xuexi", "lv"→"lü") or English; ?hsk2_level= / ?hsk3_level= filter. */
    public function hskWords(Request $request): JsonResponse
    {
        $q = HskWord::query();
        if ($s = trim((string) $request->query('q'))) {
            $plain = HskWord::plain(str_replace(['lv', 'nv'], ['lü', 'nü'], $s));
            $q->where(fn ($w) => $w->where('simplified', 'like', "%$s%")
                ->orWhere('pinyin_plain', 'like', $plain.'%')
                ->orWhere('meanings', 'like', "%$s%"));
        }
        foreach (['hsk2_level', 'hsk3_level'] as $f) {
            if ($request->filled($f)) {
                $q->where($f, (int) $request->query($f));
            }
        }

        return response()->json(
            $q->orderByRaw('COALESCE(frequency, 999999)')->paginate(min((int) $request->query('per_page', 100), 500)),
        );
    }
}
