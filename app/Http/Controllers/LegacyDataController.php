<?php

namespace App\Http\Controllers;

use App\Models\Lesson;
use App\Services\ContentService;
use Illuminate\Http\Response;

/**
 * Serves the database content in the exact `window.HSK_*` script format
 * the original static frontend expects, so public/*.html works unchanged.
 */
class LegacyDataController extends Controller
{
    public function __construct(private ContentService $content) {}

    public function lessons(): Response
    {
        return $this->js('window.HSK_LESSONS = '.$this->json($this->content->lessonsIndex()).';');
    }

    public function lesson(string $slug): Response
    {
        $lesson = Lesson::where('slug', $slug)->where('is_published', true)->firstOrFail();

        return $this->js(
            "window.HSK_LESSONS_BY_SLUG = window.HSK_LESSONS_BY_SLUG || {};\n".
            'window.HSK_LESSONS_BY_SLUG['.$this->json($slug).'] = '.$this->json($lesson->toLegacy()).';'
        );
    }

    public function dictionary(): Response
    {
        return $this->js('window.HSK_DICTIONARY = '.$this->json($this->content->dictionary()).';');
    }

    public function vocabulary(): Response
    {
        return $this->js('window.HSK_VOCABULARY = '.$this->json((object) $this->content->vocabulary()).';');
    }

    public function readings(): Response
    {
        return $this->js('window.HSK_READINGS = '.$this->json($this->content->readings()).';');
    }

    public function wordMap(): Response
    {
        return $this->js('const WORD_MAP = '.$this->json((object) $this->content->wordMap()).";\nwindow.WORD_MAP = WORD_MAP;");
    }

    private function json(mixed $value): string
    {
        return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    }

    private function js(string $body): Response
    {
        return response($body."\n", 200, [
            'Content-Type' => 'application/javascript; charset=utf-8',
            'Cache-Control' => 'no-cache',
        ]);
    }
}
