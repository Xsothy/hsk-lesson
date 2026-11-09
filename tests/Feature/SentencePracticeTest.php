<?php

namespace Tests\Feature;

use App\Models\Lesson;
use Database\Seeders\LegacyContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SentencePracticeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(LegacyContentSeeder::class);
    }

    public function test_page_renders_with_shared_components(): void
    {
        $this->get('/practice/sentences')->assertOk()
            ->assertSee('data-sentences', false)->assertSee('data-title', false)
            ->assertSee('Build')->assertSee('Meaning')->assertSee('/js/sentence-practice.js', false)
            ->assertSee('?lesson=lesson-1', false)->assertDontSee('📝');
    }

    public function test_practice_picker_links_to_sentences(): void
    {
        $this->get('/practice')->assertOk()->assertSee(route('practice.sentences'), false)->assertSee('Sentence');
    }

    public function test_mode_is_whitelisted(): void
    {
        $this->get('/practice/sentences?mode=build')->assertSee('data-mode="build"', false);
        $this->get('/practice/sentences?mode=<x>')->assertSee('data-mode="mix"', false);
    }

    public function test_lesson_queue_has_tiles_choices_and_ruby(): void
    {
        $lesson = Lesson::where('slug', 'lesson-1')->first();
        $items = $this->getJson('/data/practice-queue?kind=sentences&lesson=lesson-1')->assertOk()
            ->assertJsonPath('label', 'Lesson 1 sentences')->json('items');
        $this->assertNotEmpty($items);
        $sources = array_unique(array_column($items, 'source'));
        $this->assertContains('sentence', $sources);
        $this->assertContains('dialogue', $sources);

        $first = collect($items)->firstWhere('zh', $lesson->sentences[0]['zh']);
        $this->assertSame(['你好', '我', '叫', '李华'], $first['tiles']); // punctuation dropped, order kept
        foreach ($items as $it) {
            $this->assertCount(4, $it['choices']);
            $this->assertContains($it['en'], $it['choices']);
            $this->assertCount(4, array_unique($it['choices']));
            $this->assertStringContainsString('class="ruby-line', $it['ruby']);
            $this->assertStringContainsString('<rt>', $it['ruby']);
            $this->assertMatchesRegularExpression('/class="tone-[1-5]"/', $it['ruby']);
            $this->assertSame(preg_replace('/[^\p{L}\p{N}]/u', '', $it['zh']), implode('', $it['tiles']));
        }
        $this->assertSame(count($items), count(array_unique(array_column($items, 'zh'))));
    }

    public function test_all_lessons_queue_is_capped_and_unknown_lesson_404s(): void
    {
        $items = $this->getJson('/data/practice-queue?kind=sentences')->assertOk()->json('items');
        $this->assertLessThanOrEqual(\App\Services\SentencePool::MAX, count($items));
        $this->assertNotEmpty($items);
        $this->getJson('/data/practice-queue?kind=sentences&lesson=nope')->assertNotFound();
    }

    public function test_grammar_examples_are_included_and_patterns_skipped(): void
    {
        $lesson = Lesson::where('slug', 'lesson-1')->first();
        $grammar = $lesson->grammar;
        $grammar[0]['examples'] = [['zh' => '我叫小明。', 'en' => 'My name is Xiao Ming.']];
        $lesson->update(['grammar' => $grammar]);

        $items = collect($this->getJson('/data/practice-queue?kind=sentences&lesson=lesson-1')->json('items'));
        $this->assertTrue($items->contains(fn ($i) => $i['source'] === 'grammar' && $i['zh'] === '我叫小明。'));
        $this->assertFalse($items->contains(fn ($i) => str_contains($i['zh'], '[')));
    }
}
