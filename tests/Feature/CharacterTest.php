<?php

namespace Tests\Feature;

use App\Models\Character;
use App\Models\HskWord;
use App\Models\User;
use Database\Seeders\LegacyContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CharacterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(LegacyContentSeeder::class);
        Character::create(['char' => '学', 'pinyin' => ['xué'], 'definition' => 'to study', 'radical' => '子', 'hsk3_level' => 1]);
        Character::create(['char' => '字', 'pinyin' => ['zì'], 'definition' => 'character', 'radical' => '子', 'hsk3_level' => 1]);
        HskWord::create(['simplified' => '学生', 'pinyin' => 'xué sheng', 'pinyin_plain' => 'xuesheng', 'meanings' => ['student'], 'hsk2_level' => 1, 'hsk3_level' => 1]);
    }

    public function test_stroke_data_is_served_in_hanzi_writer_format(): void
    {
        \App\Models\CharacterStroke::create(['char' => '学', 'strokes' => ['M 0 0 Z', 'M 1 1 Z'], 'medians' => [[[0, 0], [5, 5]], [[1, 1], [6, 6]]], 'rad_strokes' => [1]]);
        \App\Models\CharacterStroke::create(['char' => '字', 'strokes' => ['M 0 0 Z']]); // outlines only (imported before medians were stored)

        $this->getJson('/data/strokes/'.rawurlencode('学').'.json')->assertOk()
            ->assertExactJson(['strokes' => ['M 0 0 Z', 'M 1 1 Z'], 'medians' => [[[0, 0], [5, 5]], [[1, 1], [6, 6]]], 'radStrokes' => [1]])
            ->assertHeader('Cache-Control', 'max-age=604800, public');
        $this->getJson('/data/strokes/'.rawurlencode('字').'.json')->assertNotFound();
        $this->getJson('/data/strokes/'.rawurlencode('龘').'.json')->assertNotFound();
    }

    public function test_radical_strokes_follow_the_decomposition(): void
    {
        $rad = [\App\Console\Commands\ImportReferenceData::class, 'radStrokes'];
        $this->assertSame([5, 6, 7], $rad('⿱⿱⺍冖子', '子', [[0, 0], [0, 0], [0, 0], [0, 1], [0, 1], [1], [1], [1]]));
        $this->assertSame([0, 1, 2, 3, 4], $rad('⿰瓜瓜', '瓜', [[0], [0], [0], [0], [0], [1], [1], [1], [1], [1]])); // first occurrence only
        $this->assertSame([], $rad('田', '田', [[], [], [], [], []])); // the character is its own radical
        $this->assertSame([], $rad('⿰女子', '宀', [[0], [1]]));
    }

    public function test_public_character_json_merges_reference_data_with_lessons(): void
    {
        $this->getJson('/data/char/'.rawurlencode('学').'.json')
            ->assertOk()
            ->assertJsonPath('data.unicode', 'U+5B66')
            ->assertJsonPath('data.words.0.word', '学生')
            ->assertJsonPath('data.related.same_radical.0.char', '字')
            ->assertJsonPath('data.lessons.0.slug', 'lesson-1')       // 学生 appears in lesson 1 sentences
            ->assertJsonPath('data.examples.0.source', 'Lesson 1');
    }

    public function test_unknown_character_is_404(): void
    {
        $this->getJson('/data/char/'.rawurlencode('龘').'.json')->assertNotFound();
    }

    public function test_agent_can_search_hsk_words_by_toneless_pinyin(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['content:read']);

        $this->getJson('/api/v1/hsk-words?q=xuesh')->assertOk()->assertJsonPath('data.0.simplified', '学生');
        $this->getJson('/api/v1/characters?radical=子')->assertOk()->assertJsonCount(2, 'data');
    }
}
