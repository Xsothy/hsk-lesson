<?php

namespace Tests\Feature;

use App\Models\Character;
use App\Models\HskWord;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ToolsTest extends TestCase
{
    use RefreshDatabase;

    private function word(string $s, string $py, array $m, ?int $v2, ?int $v3): void
    {
        HskWord::create(['simplified' => $s, 'pinyin' => $py, 'pinyin_plain' => HskWord::plain($py), 'meanings' => $m, 'hsk2_level' => $v2, 'hsk3_level' => $v3]);
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->word('学习', 'xué xí', ['to study'], 1, 1);
        $this->word('学', 'xué', ['to learn'], 1, 1);
        $this->word('我', 'wǒ', ['I'], 1, 1);
        $this->word('汉语', 'Hànyǔ', ['Chinese'], 2, 3);
        Character::create(['char' => '好', 'pinyin' => ['hǎo'], 'definition' => 'good, well', 'hsk3_level' => 1]);
        Character::create(['char' => '美', 'pinyin' => ['měi'], 'definition' => 'beautiful, pretty', 'hsk3_level' => 2, 'frequency' => 10]);
        Character::create(['char' => '汪', 'pinyin' => ['wāng'], 'definition' => 'surname Wang; beautiful', 'hsk3_level' => 2]);
    }

    public function test_pages_render_and_header_links_tools(): void
    {
        foreach (['', '/pinyin', '/hsk-check', '/name', '/zodiac'] as $p) {
            $this->get('/tools'.$p)->assertOk()->assertSee('Tools');
        }
        $this->get('/home')->assertSee(route('tools'), false);
        $this->get('/tools/name')->assertSee('For fun only');
    }

    public function test_pinyin_conversion(): void
    {
        $this->postJson('/tools/pinyin', ['text' => 'xue2xi2', 'mode' => 'marks'])->assertJson(['result' => 'xuéxí']);
        $this->postJson('/tools/pinyin', ['text' => 'xuéxí', 'mode' => 'numbers'])->assertJson(['result' => 'xue2xi2']);
        $this->postJson('/tools/pinyin', ['text' => 'xuéxí', 'mode' => 'plain'])->assertJson(['result' => 'xuexi']);
        $this->postJson('/tools/pinyin', ['text' => '我学习好', 'mode' => 'marks'])->assertJson(['result' => 'wǒ xué xí hǎo']);
        $this->postJson('/tools/pinyin', ['text' => '学习', 'mode' => 'numbers'])->assertJson(['result' => 'xue2 xi2']);
        $this->postJson('/tools/pinyin', ['text' => str_repeat('a', 2001), 'mode' => 'marks'])->assertStatus(422);
    }

    public function test_hsk_check_uses_version_and_longest_match(): void
    {
        $r = $this->postJson('/tools/hsk-check', ['text' => '我学习汉语，嗯。', 'version' => '3.0'])->assertOk();
        $words = collect($r->json('tokens'))->where('han', true)->pluck('t')->all();
        $this->assertSame(['我', '学习', '汉语', '嗯'], $words);
        $this->assertSame(['嗯'], $r->json('unknown'));
        $this->assertSame(4, $r->json('total'));
        $lv = collect($r->json('levels'))->pluck('count', 'level')->all();
        $this->assertSame(2, $lv[1]);
        $this->assertSame(1, $lv[3]);
        $r2 = $this->postJson('/tools/hsk-check', ['text' => '汉语', 'version' => '2.0']);
        $this->assertSame(2, $r2->json('tokens.0.level'));
        $this->postJson('/tools/hsk-check', ['text' => str_repeat('我', 5001), 'version' => '2.0'])->assertStatus(422);
        $this->postJson('/tools/hsk-check', ['text' => '我', 'version' => '9'])->assertStatus(422);
    }

    public function test_name_helper(): void
    {
        $this->getJson('/tools/name/suggest?name=Ben')->assertOk()->assertJsonPath('syllables.0.en', 'be');
        $chars = $this->getJson('/tools/name/meanings?theme=Beautiful')->assertOk()->json('characters');
        $this->assertSame(['美'], array_column($chars, 'char')); // surname entry excluded
        $this->getJson('/tools/name/meanings?theme=Nope')->assertStatus(422);
    }

    public function test_zodiac_endpoint(): void
    {
        $this->postJson('/tools/zodiac', ['date' => '2024-02-09'])->assertJsonPath('animal.2', 'Rabbit')->assertJsonPath('beforeNewYear', true);
        $this->postJson('/tools/zodiac', ['date' => '2024-02-10'])->assertJsonPath('animal.2', 'Dragon');
        $this->postJson('/tools/zodiac', ['date' => '1899-12-31'])->assertStatus(422);
    }

    public function test_ruby_mode_and_name_ideas(): void
    {
        $t = $this->postJson('/tools/pinyin', ['text' => '学习。', 'mode' => 'ruby'])->assertOk()->json('tokens');
        $this->assertSame('学习', $t[0]['t']);
        $this->assertTrue($t[0]['han']);
        $this->assertFalse($t[1]['han']);
        $this->getJson('/tools/name/ideas?themes[]=Nope&style=balanced')->assertStatus(422);
        $this->getJson('/tools/name/ideas?themes[]=Beautiful&style=weird')->assertStatus(422);
        $this->getJson('/tools/name/ideas?themes[]=Beautiful&themes[]=Wise&style=easy')->assertOk()->assertJsonStructure(['names']);
        $this->get('/tools/zodiac')->assertOk()->assertSee('id="tl-tab-zodiac"', false)->assertSee('aria-selected="true"', false);
    }
}
