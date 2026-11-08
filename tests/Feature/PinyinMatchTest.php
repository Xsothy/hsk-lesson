<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\LegacyContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PinyinMatchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(LegacyContentSeeder::class);
    }

    public function test_page_renders_with_shared_components_and_sources(): void
    {
        $this->get('/practice/match')->assertOk()
            ->assertSee('data-match', false)->assertSee('class="page-head', false)
            ->assertSee('Pinyin match')->assertSee('My saved words')->assertSee('data-lists', false)
            ->assertSee('?lesson=lesson-1', false)->assertSee('version=2', false)->assertSee('version=3', false)
            ->assertSee('/js/match.js', false)->assertSee('/js/pinyin-tones.js', false)->assertSee('<svg', false);
    }

    public function test_source_params_hide_the_picker_and_practice_links_here(): void
    {
        $this->get('/practice/match?lesson=lesson-1')->assertOk()->assertSee('data-has-source', false);
        $this->get('/practice/match?source=list&id=l1')->assertOk()->assertSee('data-has-source', false);
        $this->get('/practice')->assertOk()->assertSee(route('practice.match'), false)->assertSee('Pinyin match');
    }

    public function test_lesson_deck_has_hanzi_pinyin_and_meaning_for_the_game(): void
    {
        $d = $this->getJson('/data/review-deck?lesson=lesson-1')->assertOk()->json();
        $full = array_filter($d['cards'], fn ($c) => $c['hanzi'] && $c['pinyin'] && $c['english']);
        $this->assertGreaterThanOrEqual(3, count($full));
    }

    public function test_sync_accepts_and_returns_the_match_domain(): void
    {
        $this->assertSame('object', \App\Http\Controllers\SyncController::DOMAINS['match']);
        $user = User::factory()->create();
        $match = ['lesson-1' => ['score' => 60, 'pairs' => 6, 'misses' => 0, 'ms' => 30000, 'at' => 1]];
        $this->actingAs($user)->postJson('/sync', ['rev' => 0, 'state' => ['v' => 1, 'data' => ['match' => $match], 'stamps' => []]])->assertOk();
        $this->actingAs($user)->getJson('/sync')->assertOk()->assertJsonPath('state.data.match.lesson-1.score', 60);
        $this->actingAs($user)->postJson('/sync', ['rev' => 1, 'state' => ['v' => 1, 'data' => ['match' => [1, 2]], 'stamps' => []]])->assertStatus(422);
    }
}
