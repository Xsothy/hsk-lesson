<?php

namespace Tests\Feature;

use App\Models\Character;
use App\Models\HskWord;
use Database\Seeders\LegacyContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CharacterPageTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(LegacyContentSeeder::class);
        Character::create(['char' => '学', 'pinyin' => ['xué'], 'definition' => 'to study', 'radical' => '子', 'decomposition' => '⿱⺍⿱冖子', 'hsk2_level' => 1, 'hsk3_level' => 1]);
        Character::create(['char' => '子', 'pinyin' => ['zǐ'], 'definition' => 'child', 'radical' => '子', 'hsk3_level' => 1]);
        Character::create(['char' => '字', 'pinyin' => ['zì'], 'definition' => 'character', 'radical' => '子', 'hsk3_level' => 1]);
        HskWord::create(['simplified' => '学生', 'pinyin' => 'xué sheng', 'pinyin_plain' => 'xuesheng', 'meanings' => ['student'], 'hsk2_level' => 1, 'hsk3_level' => 1]);
    }

    public function test_character_page_renders_all_sections_from_character_service(): void
    {
        $this->get('/char/'.rawurlencode('学'))
            ->assertOk()
            ->assertSee('data-character-page', false)
            ->assertSee('data-char="学"', false)
            ->assertSeeInOrder(['01 · Write', '02 · Stroke order', '03 · Details'])
            ->assertSee('class="writing-grid', false)
            ->assertSee('data-writer', false)
            ->assertSee('role="tablist"', false)
            ->assertSeeInOrder(['data-action="replay"', 'data-action="toggle"', 'data-action="speed"', 'data-action="hint"', 'data-action="outline"', 'data-action="retry"'], false)
            ->assertSee('tone-2', false);
    }

    public function test_character_page_shows_lessons_words_examples_facts_and_related(): void
    {
        $res = $this->get('/char/'.rawurlencode('学'))->assertOk();

        $res->assertSee('HSK 2.0 · 1')
            ->assertSee('href="'.route('lesson', 'lesson-1').'"', false)   // 学生 is in lesson 1
            ->assertSee('class="word-row', false)
            ->assertSee('学生')
            ->assertSee('data-say="学生"', false)
            ->assertSee('Examples from your lessons')
            ->assertSee('<mark>学</mark>', false)
            ->assertSee('Top–bottom')
            ->assertSee('U+5B66')
            ->assertSee('class="char-tile', false)
            ->assertSee('href="'.route('char', '字').'"', false)
            ->assertSee('/css/character.css', false)
            ->assertSee('/js/character.js', false)
            ->assertSee('hanzi-writer@3.7.2', false);
    }

    public function test_only_the_first_character_of_the_path_is_used(): void
    {
        $this->get('/char/'.rawurlencode('学生'))->assertOk()->assertSee('data-char="学"', false);
    }

    public function test_unknown_character_is_404(): void
    {
        $this->get('/char/'.rawurlencode('龘'))->assertNotFound();
    }

    public function test_legacy_char_html_redirects_to_the_new_page(): void
    {
        $this->get('/char.html?c='.rawurlencode('学'))->assertRedirect(route('char', '学'))->assertStatus(301);
        $this->get('/char.html')->assertRedirect(route('browse'));
    }
}
