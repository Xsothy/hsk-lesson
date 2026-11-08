<?php

namespace Tests\Feature;

use App\Models\HskWord;
use Database\Seeders\LegacyContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReviewTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(LegacyContentSeeder::class);
        HskWord::insert(collect(range(1, 20))->map(fn ($i) => [
            'simplified' => "词$i", 'pinyin' => "cí$i", 'pinyin_plain' => 'ci', 'meanings' => json_encode(["word $i", 'extra']),
            'hsk2_level' => 1, 'frequency' => $i, 'created_at' => now(), 'updated_at' => now(),
        ])->all());
    }

    public function test_review_page_renders_chooser_with_lessons_and_levels(): void
    {
        $this->get('/review')->assertOk()
            ->assertSee('Cards due')->assertSee('Saved words')->assertSee('Lessons')->assertSee('HSK levels')
            ->assertSee('Level 7–9')->assertSee('rv-reveal', false)->assertSee('/js/review.js', false)
            ->assertSee('review?lesson=lesson-1', false);
    }

    public function test_deck_for_lesson(): void
    {
        $r = $this->getJson('/data/review-deck?lesson=lesson-1')->assertOk();
        $this->assertStringContainsString('Lesson 1', $r['title']);
        $this->assertNotEmpty($r['cards']);
        $this->assertSame(['id', 'hanzi', 'pinyin', 'english'], array_keys($r['cards'][0]));
    }

    public function test_deck_for_hsk_level_and_set(): void
    {
        $all = $this->getJson('/data/review-deck?version=2&level=1')->assertOk();
        $this->assertCount(20, $all['cards']);
        $set2 = $this->getJson('/data/review-deck?version=2&level=1&set=2')->assertOk();
        $this->assertSame(['词16', '词17', '词18', '词19', '词20'], array_column($set2['cards'], 'id'));
        $this->assertSame('word 16; extra', $set2['cards'][0]['english']);
        $this->assertSame('cí16', $set2['cards'][0]['pinyin']);
    }

    public function test_deck_for_words_resolves_hsk_and_lesson_words(): void
    {
        $r = $this->getJson('/data/review-deck?source=saved&words='.urlencode('词1,词2,词1,nonexistent'))->assertOk();
        $this->assertSame('Saved words', $r['title']);
        $this->assertSame(['词1', '词2', 'nonexistent'], array_column($r['cards'], 'id'));
        $this->assertSame('word 1; extra', $r['cards'][0]['english']);
        $this->assertSame('', $r['cards'][2]['english']);
    }

    public function test_deck_validation(): void
    {
        $this->getJson('/data/review-deck')->assertStatus(422);
        $this->getJson('/data/review-deck?lesson=nope')->assertNotFound();
        $this->getJson('/data/review-deck?version=9&level=1')->assertNotFound();
        $this->getJson('/data/review-deck?version=2&level=99')->assertNotFound();
    }

    public function test_deck_caps_cards_and_is_throttled(): void
    {
        $words = implode(',', array_map(fn ($i) => "w$i", range(1, 400)));
        $this->getJson('/data/review-deck?words='.$words)->assertOk()->assertJsonCount(300, 'cards');
        $route = collect(app('router')->getRoutes()->getRoutes())->first(fn ($r) => $r->uri() === 'data/review-deck');
        $this->assertContains('throttle:120,1', $route->gatherMiddleware());
    }
}
