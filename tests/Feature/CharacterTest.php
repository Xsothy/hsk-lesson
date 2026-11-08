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
