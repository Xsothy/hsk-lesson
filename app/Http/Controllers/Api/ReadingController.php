<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Reading;
use App\Services\ContentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReadingController extends Controller
{
    public function __construct(private ContentService $content) {}

    public function index(Request $request): JsonResponse
    {
        $q = Reading::orderBy('lesson_number')->orderBy('id');
        if ($request->filled('lesson_number')) {
            $q->where('lesson_number', (int) $request->query('lesson_number'));
        }
        if ($request->filled('type')) {
            $q->where('type', $request->query('type'));
        }

        return response()->json(['data' => $q->get()]);
    }

    public function show(Reading $reading): JsonResponse
    {
        return response()->json(['data' => $reading]);
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(['data' => Reading::create($this->validated($request, partial: false))], 201);
    }

    public function update(Request $request, Reading $reading): JsonResponse
    {
        $reading->update($this->validated($request, partial: true));

        return response()->json(['data' => $reading->fresh()]);
    }

    public function destroy(Reading $reading): JsonResponse
    {
        $reading->delete();

        return response()->json(['deleted' => true]);
    }

    private function validated(Request $request, bool $partial): array
    {
        $req = $partial ? 'sometimes' : 'required';
        $data = $request->validate([
            'lesson_number' => 'nullable|integer|exists:lessons,number',
            'type' => 'sometimes|string|max:50',
            'difficulty' => 'sometimes|integer|between:1,9',
            'title' => "$req|string|max:255",
            'title_en' => 'nullable|string|max:255',
            'emoji' => 'nullable|string|max:32',
            'is_published' => 'sometimes|boolean',
            'lines' => "$req|array",
            'lines.*.zh' => 'required|string',
            'lines.*.en' => 'nullable|string',
            'lines.*.words' => 'sometimes|array',
            'questions' => 'sometimes|array',
            'questions.*.id' => 'required|string',
            'questions.*.type' => 'required|string|in:multiple_choice,true_false',
            'questions.*.question' => 'required|string',
            'questions.*.questionEn' => 'nullable|string',
            'questions.*.options' => 'sometimes|array',
            'questions.*.answer' => 'required',
            'focus_words' => 'nullable|array',
            'grammar_focus' => 'nullable|array',
        ]);

        if (array_key_exists('lines', $data)) {
            $data['lines'] = $this->content->normalizeLines($data['lines']);
        }

        return $data;
    }
}
