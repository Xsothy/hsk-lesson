<?php

namespace Tests\Feature;

use App\Models\Character;
use Database\Seeders\LegacyContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AlphaChromeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(LegacyContentSeeder::class);
    }

    public function test_every_alpha_route_renders_header_and_tab_bar(): void
    {
        Character::create(['char' => '学', 'pinyin' => ['xué'], 'definition' => 'to study', 'radical' => '子']); // /char/学 is a real page (C1)
        $urls = ['/home', '/courses', '/lessons/lesson-1', '/lessons/lesson-1/reading/1', '/char/学', '/browse', '/search', '/practice', '/review', '/words', '/settings'];
        foreach ($urls as $url) {
            $this->get($url)->assertOk()
                ->assertSee('class="hdr"', false)
                ->assertSee('class="tabbar"', false)
                ->assertSee('aria-expanded="false"', false);
        }
    }

    public function test_active_tab_is_marked_current(): void
    {
        $this->get('/review')->assertSee('aria-current="page"', false);
    }

    public function test_root_serves_home(): void
    {
        $this->get('/')->assertOk()->assertSee('Your course');
    }
}
