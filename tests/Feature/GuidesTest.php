<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GuidesTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_lists_all_guides_and_filters(): void
    {
        $this->get('/guides')->assertOk()->assertSee('的 vs 得 vs 地')->assertSee('Measure words')->assertSee('Tones and tone sandhi');
        $this->get('/guides?tag=negation')->assertOk()->assertSee('不 vs 没')->assertDontSee('Measure words');
        $this->get('/guides?level=elementary')->assertOk()->assertSee('再 vs 又')->assertDontSee('了 basics');
        $this->get('/guides?tag=nope')->assertOk()->assertSee('No guides match');
    }

    public function test_article_renders_markdown_and_ruby_examples(): void
    {
        $res = $this->get('/guides/de-particles')->assertOk();
        $res->assertSee('<h2>', false);
        $res->assertSee('class="ruby-line"', false);
        $res->assertSee('tone-', false);
        $res->assertSee('my book');
        $res->assertDontSee('```', false);
    }

    public function test_unknown_or_unsafe_slug_is_404(): void
    {
        $this->get('/guides/nope')->assertNotFound();
        $this->get('/guides/..%2F.env')->assertNotFound();
    }

    public function test_home_links_to_guides(): void
    {
        $this->get('/home')->assertSee(route('guides'), false);
    }
}
