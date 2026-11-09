<?php

namespace Tests\Feature;

use Tests\TestCase;

class AppearancePageTest extends TestCase
{
    public function test_appearance_page_renders_controls_and_preview(): void
    {
        $this->get('/settings/appearance')->assertOk()
            ->assertSee('Appearance')
            ->assertSee('data-ap="presets"', false)
            ->assertSee('data-ap="accents"', false)
            ->assertSee('Reset to Paper')
            ->assertSee('/js/appearance-page.js', false);
    }

    public function test_settings_links_to_appearance(): void
    {
        $this->get('/settings')->assertOk()->assertSee('data-appearance-link', false)->assertSee(route('appearance'), false);
    }
}
