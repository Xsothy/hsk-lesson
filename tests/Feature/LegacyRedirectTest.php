<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LegacyRedirectTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_root_is_home(): void
    {
        $this->get('/')->assertOk()->assertSee('Your course');
    }

    public function test_index_html_redirects_to_root(): void
    {
        $this->get('/index.html')->assertStatus(301)->assertRedirect('/');
    }

    public function test_lesson_html_redirects_by_slug_and_number(): void
    {
        $this->get('/lesson.html?slug=lesson-1')->assertStatus(301)->assertRedirect(route('lesson', 'lesson-1'));
        $this->get('/lesson.html?lesson=2')->assertStatus(301)->assertRedirect(route('lesson', 'lesson-2'));
        $this->get('/lesson.html')->assertStatus(301)->assertRedirect(route('courses'));
        $this->get('/lesson.html?slug='.rawurlencode('../x'))->assertStatus(301)->assertRedirect(route('courses'));
    }

    public function test_char_html_redirects_to_char_page(): void
    {
        $this->get('/char.html?c='.rawurlencode('学'))->assertStatus(301)->assertRedirect(route('char', '学'));
    }

    public function test_export_page_redirects_to_courses(): void
    {
        $this->get('/export-lessons.html')->assertStatus(301)->assertRedirect(route('courses'));
    }

    public function test_legacy_data_scripts_are_gone(): void
    {
        foreach (['/data/lessons.js', '/data/dictionary.js', '/js/word-map.js'] as $url) {
            $this->get($url)->assertNotFound();
        }
    }

    public function test_ported_lesson_extras_render(): void
    {
        \App\Models\Lesson::where('slug', 'lesson-1')->update(['content' => '<p>Notes body</p>', 'is_preview' => true]);
        $this->get('/lessons/lesson-1')->assertOk()->assertSee('Lesson notes')->assertSee('<p>Notes body</p>', false)->assertSee('HSK 2 preview');
    }
}
