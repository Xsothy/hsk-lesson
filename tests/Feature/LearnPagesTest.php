<?php

namespace Tests\Feature;

use App\Models\Lesson;
use App\Models\Reading;
use Database\Seeders\LegacyContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LearnPagesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(LegacyContentSeeder::class);
    }

    public function test_home_renders_with_empty_store(): void
    {
        $this->get('/home')->assertOk()->assertSee('Continue')->assertSee('Your course')->assertSee('HSK path');
    }

    public function test_courses_tabs(): void
    {
        $this->get('/courses')->assertOk()->assertSee('lesson-card', false);
        $this->get('/courses?tab=hsk2')->assertOk()->assertSee('Level 6');
        $this->get('/courses?tab=hsk3')->assertOk()->assertSee('Level 7–9');
        $this->get('/courses?tab=textbooks')->assertOk()->assertSee('Upload CSV');
    }

    public function test_courses_render_both_hsk_versions_for_the_setting_to_pick(): void
    {
        $this->get('/courses?tab=hsk')->assertOk()
            ->assertSee('class="hsk-v2"', false)->assertSee('class="hsk-v3"', false)
            ->assertSee('Level 6')->assertSee('Level 7–9')->assertSee('Change in Settings');
        $this->get('/courses')->assertOk()
            ->assertSee('data-course="2.0"', false)->assertSee('data-course="3.0"', false)
            ->assertSee('Planned');
    }

    public function test_sets_endpoint_chunks_by_fifteen(): void
    {
        \App\Models\HskWord::insert(collect(range(1, 32))->map(fn ($i) => [
            'simplified' => "词$i", 'pinyin' => 'ci', 'pinyin_plain' => 'ci', 'meanings' => '["w"]',
            'hsk2_level' => 1, 'frequency' => $i, 'created_at' => now(), 'updated_at' => now(),
        ])->all());

        $this->getJson('/data/hsk/2/1/sets')->assertOk()
            ->assertJsonPath('total', 32)->assertJsonCount(3, 'sets')
            ->assertJsonPath('sets.0.count', 15)->assertJsonPath('sets.2.count', 2)
            ->assertJsonPath('sets.0.words.0', '词1');
        $this->getJson('/data/hsk/3/7/sets')->assertOk()->assertJsonPath('label', '7–9');
        $this->getJson('/data/hsk/2/7/sets')->assertNotFound();
        $this->getJson('/data/hsk/4/1/sets')->assertNotFound();
    }

    public function test_all_lessons_render_with_practice_links(): void
    {
        foreach (Lesson::all() as $l) {
            $this->get("/lessons/{$l->slug}")->assertOk()
                ->assertSee('?lesson='.$l->slug, false)->assertSee('Vocabulary');
        }
        $this->assertGreaterThanOrEqual(12, Lesson::count());
        $this->get('/lessons/nope')->assertNotFound();
    }

    public function test_all_readings_render(): void
    {
        $count = 0;
        foreach (Lesson::all() as $l) {
            $n = Reading::where('lesson_number', $l->number)->count();
            for ($i = 1; $i <= $n; $i++) {
                $this->get("/lessons/{$l->slug}/reading/$i")->assertOk()->assertSee('Quiz');
                $count++;
            }
            $this->get('/lessons/'.$l->slug.'/reading/'.($n + 1))->assertNotFound();
        }
        $this->assertSame(Reading::count(), $count);
    }

    public function test_reading_answers_match_question_data(): void
    {
        $r = Reading::where('lesson_number', 1)->orderBy('id')->first();
        $resp = $this->get('/lessons/lesson-1/reading/1');
        foreach ($r->questions as $q) {
            $expected = ($q['type'] ?? '') === 'true_false' ? ($q['answer'] ? 0 : 1) : (int) $q['answer'];
            $resp->assertSee('data-answer="'.$expected.'"', false);
        }
    }
}
