<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Services\ContentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LessonController extends Controller
{
    public function __construct(private ContentService $content) {}

    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Lesson::orderBy('number')->get()
                ->map(fn (Lesson $l) => $l->toSummary() + ['is_published' => $l->is_published]),
        ]);
    }

    /** ?enrich=1 adds vocab_details with pinyin/english/breakdown for each vocab word. */
    public function show(Request $request, Lesson $lesson): JsonResponse
    {
        $data = $lesson->toArray();
        if ($request->boolean('enrich')) {
            $data['vocab_details'] = array_map(fn ($w) => $this->content->enrich($w), $lesson->vocab ?? []);
        }

        return response()->json(['data' => $data]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $data['number'] ??= (Lesson::max('number') ?? 0) + 1;
        $data['slug'] ??= 'lesson-'.$data['number'];
        $data['title'] ??= 'Lesson '.$data['number'];

        return response()->json(['data' => Lesson::create($data)], 201);
    }

    /** Partial update: send only the fields to change. Arrays (vocab, grammar, sentences, dialogue) are replaced whole. */
    public function update(Request $request, Lesson $lesson): JsonResponse
    {
        $lesson->update($this->validated($request, $lesson));

        return response()->json(['data' => $lesson->fresh()]);
    }

    public function destroy(Lesson $lesson): JsonResponse
    {
        $lesson->delete();

        return response()->json(['deleted' => true]);
    }

    private function validated(Request $request, ?Lesson $lesson = null): array
    {
        $data = $request->validate([
            'slug' => ['sometimes', 'string', 'max:100', 'regex:/^[A-Za-z0-9\-_]+$/', Rule::unique('lessons')->ignore($lesson)],
            'number' => ['sometimes', 'integer', 'min:1', Rule::unique('lessons')->ignore($lesson)],
            'title' => 'sometimes|string|max:255',
            'zh_title' => 'nullable|string|max:255',
            'en_title' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'emoji' => 'nullable|string|max:32',
            'color' => 'nullable|string|max:32',
            'emoji_color' => 'nullable|string|max:32',
            'grammar_label' => 'nullable|string|max:255',
            'course' => 'sometimes|in:2.0,3.0',
            'is_preview' => 'sometimes|boolean',
            'is_published' => 'sometimes|boolean',
            'content' => 'nullable|string',
            'vocab' => 'sometimes|array',
            'vocab.*' => 'string',
            'grammar' => 'sometimes|array',
            'grammar.*.title' => 'required|string',
            'grammar.*.pattern' => 'nullable|string',
            'grammar.*.note' => 'nullable|string',
            'sentences' => 'sometimes|array',
            'sentences.*.zh' => 'required|string',
            'sentences.*.en' => 'nullable|string',
            'sentences.*.words' => 'sometimes|array',
            'dialogue' => 'sometimes|array',
            'dialogue.*.speaker' => 'required|string',
            'dialogue.*.zh' => 'required|string',
            'dialogue.*.en' => 'nullable|string',
            'dialogue.*.words' => 'sometimes|array',
        ]);

        foreach (['sentences', 'dialogue'] as $key) {
            if (array_key_exists($key, $data)) {
                $data[$key] = $this->content->normalizeLines($data[$key]);
            }
        }

        return $data;
    }
}
