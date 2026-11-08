<?php

namespace Tests\Feature;

use App\Models\Character;
use App\Models\HskWord;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WordsPdfTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        HskWord::create(['simplified' => '你好', 'pinyin' => 'nǐ hǎo', 'pinyin_plain' => 'nihao', 'meanings' => ['hello'], 'hsk2_level' => 1, 'hsk3_level' => 1]);
        Character::create(['char' => '学', 'pinyin' => ['xué'], 'definition' => 'study', 'hsk2_level' => 1, 'hsk3_level' => 1]);
    }

    public function test_returns_pdf(): void
    {
        $r = $this->post('/words/pdf', ['words' => ['你好', '学', '未知']]);
        $r->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF-', $r->getContent());
    }

    public function test_level_column_optional(): void
    {
        $this->post('/words/pdf', ['words' => ['你好'], 'level' => 0])->assertOk()->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_rejects_bad_input(): void
    {
        $this->post('/words/pdf', [])->assertSessionHasErrors('words');
        $this->post('/words/pdf', ['words' => []])->assertSessionHasErrors('words');
        $this->post('/words/pdf', ['words' => ['hello']])->assertSessionHasErrors('words.0');
        $this->post('/words/pdf', ['words' => ['你好a']])->assertSessionHasErrors('words.0');
        $this->post('/words/pdf', ['words' => array_fill(0, 201, '你')])->assertSessionHasErrors('words');
        $this->post('/words/pdf', ['words' => '你好'])->assertSessionHasErrors('words');
    }

    public function test_is_throttled(): void
    {
        for ($i = 0; $i < 20; $i++) {
            $this->post('/words/pdf', ['words' => ['你好']])->assertOk();
        }
        $this->post('/words/pdf', ['words' => ['你好']])->assertStatus(429);
    }
}
