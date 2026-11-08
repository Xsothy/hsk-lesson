<?php

namespace Tests\Feature;

use Tests\TestCase;

class AlphaChromeTest extends TestCase
{
    public function test_every_alpha_route_renders_header_and_tab_bar(): void
    {
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

    public function test_root_still_serves_legacy_home(): void
    {
        $this->get('/')->assertOk();
    }
}
