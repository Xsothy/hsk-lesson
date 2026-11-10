<?php

namespace Tests\Feature;

use App\Models\Character;
use App\Models\HskWord;
use Database\Seeders\LegacyContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SearchPageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(LegacyContentSeeder::class);
        $now = now();
        HskWord::insert([[
            'simplified' => '学', 'traditional' => '學', 'pinyin' => 'xué', 'pinyin_plain' => HskWord::plain('xué'),
            'meanings' => json_encode(['to learn', 'to study']), 'frequency' => 524, 'hsk2_level' => null, 'hsk3_level' => 1,
            'created_at' => $now, 'updated_at' => $now,
        ]]);
        Character::create(['char' => '学', 'pinyin' => ['xué'], 'definition' => 'to study', 'radical' => '子']);
    }

    public function test_empty_query_shows_prompt(): void
    {
        $this->get('/search')->assertOk()->assertSee('Type a character', false);
    }

    public function test_every_query_form_finds_the_character_and_word(): void
    {
        foreach (['xue', 'xué', 'xue2', '学', 'study'] as $q) {
            $this->get('/search?q='.urlencode($q))->assertOk()
                ->assertSee('Characters', false)
                ->assertSee(route('char', '学'), false)
                ->assertSee('Words', false);
        }
    }

    public function test_hanzi_query_lists_lessons_and_readings_containing_it(): void
    {
        $res = $this->get('/search?q='.urlencode('你好'))->assertOk();
        $res->assertSee('In your lessons', false);
        $this->assertStringContainsString('/lessons/', $res->getContent());
    }

    public function test_no_results_message(): void
    {
        $this->get('/search?q=zzzqqq')->assertOk()->assertSee('No results for', false);
    }
}
