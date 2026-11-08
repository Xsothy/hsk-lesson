<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Word;
use App\Services\ContentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class WordController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Word::query()->orderBy('sort_order')->orderBy('id');

        if ($s = $request->query('q')) {
            $q->where(fn ($w) => $w->where('hanzi', 'like', "%$s%")
                ->orWhere('pinyin', 'like', "%$s%")
                ->orWhere('english', 'like', "%$s%"));
        }
        if ($request->filled('hanzi')) {
            $q->where('hanzi', $request->query('hanzi'));
        }
        if ($request->filled('category')) {
            $q->where('category', $request->query('category'));
        }
        if ($request->filled('hsk_level')) {
            $q->where('hsk_level', (int) $request->query('hsk_level'));
        }

        return response()->json($q->paginate(min((int) $request->query('per_page', 100), 500)));
    }

    public function show(Word $word): JsonResponse
    {
        return response()->json(['data' => $word]);
    }

    public function lookup(string $hanzi, ContentService $content): JsonResponse
    {
        return response()->json(['data' => $content->enrich($hanzi)]);
    }

    public function store(Request $request): JsonResponse
    {
        $word = Word::create($this->validated($request) + ['sort_order' => (Word::max('sort_order') ?? 0) + 1]);

        return response()->json(['data' => $word], 201);
    }

    public function update(Request $request, Word $word): JsonResponse
    {
        $word->update($this->validated($request, partial: true));

        return response()->json(['data' => $word]);
    }

    public function destroy(Word $word): JsonResponse
    {
        $word->delete();

        return response()->json(['deleted' => true]);
    }

    /**
     * Create or update many words at once, matched by hanzi (+ category when given).
     * Body: {"words": [{hanzi, pinyin, english, category, hsk_level, parts, literal}, ...]}
     */
    public function bulkUpsert(Request $request): JsonResponse
    {
        $request->validate(['words' => 'required|array|min:1|max:1000']);
        $results = ['created' => 0, 'updated' => 0, 'words' => []];

        DB::transaction(function () use ($request, &$results) {
            $next = (Word::max('sort_order') ?? 0) + 1;
            foreach ($request->input('words') as $i => $row) {
                $data = validator($row, $this->rules(partial: false))->validate();
                $existing = Word::where('hanzi', $data['hanzi'])
                    ->when(isset($data['category']), fn ($q) => $q->where('category', $data['category']))
                    ->orderBy('sort_order')->first();

                if ($existing) {
                    $existing->update($data);
                    $results['updated']++;
                    $results['words'][] = $existing;
                } else {
                    $results['words'][] = Word::create($data + ['sort_order' => $next++]);
                    $results['created']++;
                }
            }
        });

        return response()->json($results);
    }

    private function validated(Request $request, bool $partial = false): array
    {
        return $request->validate($this->rules($partial));
    }

    private function rules(bool $partial): array
    {
        $req = $partial ? 'sometimes' : 'required';

        return [
            'hanzi' => "$req|string|max:50",
            'pinyin' => 'nullable|string|max:100',
            'english' => 'nullable|string|max:255',
            'category' => ['nullable', 'string', Rule::exists('categories', 'key')],
            'hsk_level' => 'nullable|integer|between:1,9',
            'parts' => 'nullable|array',
            'parts.*' => 'string',
            'literal' => 'nullable|string|max:255',
            'sort_order' => 'sometimes|integer|min:0',
        ];
    }
}
