<?php

namespace Tests\Feature;

use Tests\TestCase;

class SharedComponentsTest extends TestCase
{
    public function test_dev_components_page_renders_every_component(): void
    {
        $this->get('/dev/components')->assertOk()
            ->assertSee('class="chip', false)
            ->assertSee('stat-card', false)
            ->assertSee('char-tile', false)
            ->assertSee('word-row', false)
            ->assertSee('qo-correct', false)
            ->assertSee('qo-wrong', false)
            ->assertSee('bubble-right', false)
            ->assertSee('action-dark', false)
            ->assertSee('lc-current', false)
            ->assertSee('data-char="学"', false);
    }
}
