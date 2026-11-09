<?php

namespace Tests\Feature;

use Tests\TestCase;

class SettingsPageTest extends TestCase
{
    public function test_settings_page_shell(): void
    {
        $this->get('/settings')->assertOk()
            ->assertSee('Settings</h1>', false)
            ->assertSee('DISPLAY')->assertSee('AUDIO')->assertSee('STUDY')->assertSee('YOUR DATA')
            ->assertSee('name="pinyinPos"', false)->assertSee('id="st-voice"', false)->assertSee('id="st-rv-first"', false)
            ->assertSee('Export progress (JSON)')->assertSee('Import progress')
            ->assertSee('Sign in to sync')->assertSee('beta')
            ->assertSee('/js/settings-page.js', false)->assertSee('/css/settings.css', false);
    }

    public function test_layout_loads_apply_settings_early(): void
    {
        $html = $this->get('/settings')->getContent();
        $this->assertStringContainsString('/js/apply-settings.js', $html);
        $this->assertLessThan(strpos($html, '</head>'), strpos($html, '/js/apply-settings.js'));
    }
}
