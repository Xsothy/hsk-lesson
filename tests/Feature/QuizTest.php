<?php

namespace Tests\Feature;

use App\Models\Character;
use App\Models\CharacterStroke;
use Database\Seeders\LegacyContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuizTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(LegacyContentSeeder::class);
    }

    private function data(string $html): array
    {
        $this->assertSame(1, preg_match('#<script type="application/json" id="qz-data">(.*?)</script>#s', $html, $m));

        return json_decode($m[1], true);
    }

    public function test_quiz_page_carries_the_lessons_words_and_sentences(): void
    {
        CharacterStroke::create(['char' => '我', 'strokes' => ['M 0 0 Z'], 'medians' => [[[0, 0], [5, 5]]]]);
        CharacterStroke::create(['char' => '你', 'strokes' => ['M 0 0 Z']]); // outlines only: cannot be written in the quiz
        Character::create(['char' => '我', 'pinyin' => ['wǒ'], 'definition' => 'I']);

        $res = $this->get('/lessons/lesson-1/quiz')->assertOk()
            ->assertSee('Lesson quiz · beta')->assertSee('id="qz-go"', false)->assertSee('/js/quiz.js', false)
            ->assertSee('/vendor/hanzi-writer-3.7.2.min.js', false);
        $d = $this->data($res->getContent());

        $this->assertSame('lesson-1', $d['slug']);
        $this->assertContains(['hanzi' => '你好', 'pinyin' => 'nǐ hǎo', 'english' => 'hello'], $d['words']);
        $this->assertGreaterThanOrEqual(4, count($d['words']));
        $this->assertSame(['我'], $d['writable']);
        $this->assertNotEmpty($d['sentences']);
        foreach ($d['sentences'] as $s) {
            $this->assertNotSame('', $s['en']);
            $this->assertGreaterThanOrEqual(3, count($s['tiles']));
            foreach ($s['tiles'] as $t) {
                $this->assertMatchesRegularExpression('/\p{Han}/u', $t); // punctuation never becomes a tile
            }
        }
    }

    public function test_lesson_page_links_to_its_quiz_and_unknown_lessons_404(): void
    {
        $this->get('/lessons/lesson-1')->assertOk()->assertSee('href="'.route('quiz', 'lesson-1').'"', false);
        $this->get('/lessons/nope/quiz')->assertNotFound();
    }

    public function test_sounds_gives_toneless_readings_per_character(): void
    {
        Character::create(['char' => '学', 'pinyin' => ['xué'], 'definition' => 'study']);
        Character::create(['char' => '女', 'pinyin' => ['nǚ'], 'definition' => 'woman']);
        Character::create(['char' => '了', 'pinyin' => ['le'], 'definition' => 'particle']);

        $this->getJson('/data/sounds?text='.urlencode('学，女 ok 了龘'))->assertOk()
            ->assertExactJson(['sounds' => [['xue'], ['nv'], ['le', 'liao']]]); // unknown characters and non-Chinese text are skipped
        $this->getJson('/data/sounds')->assertOk()->assertExactJson(['sounds' => []]);
    }
}
