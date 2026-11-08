<?php

namespace Tests\Feature;

use App\Models\Character;
use App\Models\Lesson;
use App\Models\Reading;
use App\Services\RubyTokens;
use Database\Seeders\LegacyContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RubyLineTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(LegacyContentSeeder::class);
    }

    public function test_syllables_split_one_per_character(): void
    {
        $this->assertSame(['míng', 'zi'], RubyTokens::syllables('míngzi', 2));
        $this->assertSame(['nǐ', 'hǎo'], RubyTokens::syllables('nǐ hǎo', 2));
        $this->assertSame(['Zhōng', 'guó'], RubyTokens::syllables('Zhōngguó', 2));
        $this->assertSame(['xǐ', 'huan'], RubyTokens::syllables('xǐhuan', 2));
        $this->assertSame(['nǐ'], RubyTokens::syllables('nǐ', 1));
    }

    public function test_tokens_follow_word_map_with_plain_punctuation(): void
    {
        $tokens = app(RubyTokens::class)->forLine(['zh' => '你好！你叫什么名字？', 'words' => ['你好', '！', '你', '叫', '什么', '名字', '？']]);

        $this->assertSame(['你好', '！', '你', '叫', '什么', '名字', '？'], array_column($tokens, 'zh'));
        $this->assertNull($tokens[1]['pinyin']);
        $this->assertSame([], $tokens[6]['syllables']);
        $this->assertSame([['s' => 'shén', 't' => 2], ['s' => 'me', 't' => 5]], $tokens[4]['syllables']);
        $this->assertSame([3, 3], array_column($tokens[0]['syllables'], 't'));
        $this->assertNotNull($tokens[5]['vocab']);
    }

    public function test_unknown_word_is_plain_text(): void
    {
        $tokens = app(RubyTokens::class)->forLine(['zh' => 'ABC', 'words' => ['ABC']]);
        $this->assertSame([['zh' => 'ABC', 'pinyin' => null, 'syllables' => [], 'vocab' => null]], $tokens);
    }

    public function test_lines_without_words_fall_back_to_character_pinyin(): void
    {
        Character::create(['char' => '龘', 'pinyin' => ['dá']]);
        $tokens = app(RubyTokens::class)->forLine(['zh' => '龘。']);

        $this->assertSame('dá', $tokens[0]['pinyin']);
        $this->assertSame(4 - 2, $tokens[0]['syllables'][0]['t']);
        $this->assertNull($tokens[1]['pinyin']);
    }

    public function test_lesson_one_dialogue_renders_interlinear_ruby(): void
    {
        $this->get('/lessons/'.Lesson::where('number', 1)->value('slug'))->assertOk()
            ->assertSee('<ruby><rb>你好</rb><rt><span class="tone-3">nǐ</span> <span class="tone-3">hǎo</span></rt></ruby>', false)
            ->assertSee('<rb>名字</rb><rt><span class="tone-2">míng</span><span class="tone-5">zi</span></rt>', false)
            ->assertSee('class="rl-word"', false)
            ->assertSee('/js/ruby.js', false)
            ->assertDontSee('class="b-py"', false);
    }

    public function test_every_lesson_and_reading_renders_ruby_lines(): void
    {
        $lessons = Lesson::where('is_published', true)->orderBy('number')->get();
        $this->assertCount(12, $lessons);
        foreach ($lessons as $lesson) {
            $html = $this->get('/lessons/'.$lesson->slug)->assertOk()->getContent();
            if ($lesson->dialogue || $lesson->sentences) {
                $this->assertStringContainsString('<ruby>', $html, "lesson {$lesson->number}");
            }
            $n = Reading::where('lesson_number', $lesson->number)->where('is_published', true)->count();
            for ($i = 1; $i <= $n; $i++) {
                $this->get("/lessons/{$lesson->slug}/reading/$i")->assertOk()->assertSee('<ruby>', false)->assertSee('id="tg-pinyin"', false);
            }
        }
        $this->assertSame(24, Reading::where('is_published', true)->count());
    }

    public function test_dialogue_bubble_keeps_legacy_pinyin_prop(): void
    {
        $this->get('/dev/components')->assertOk()
            ->assertSee('class="b-py"', false)
            ->assertSee('ruby-line', false)
            ->assertSee('rl-audio', false);
    }
}
