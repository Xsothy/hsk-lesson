<?php

namespace Tests\Feature;

use App\Models\Character;
use App\Models\HskWord;
use App\Support\Pinyin;
use App\Support\Radicals;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class BrowseTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $now = now();
        $w = fn ($s, $p, $m, $f, $h2 = null, $h3 = null, $t = null) => [
            'simplified' => $s, 'traditional' => $t, 'pinyin' => $p, 'pinyin_plain' => HskWord::plain($p),
            'meanings' => json_encode($m), 'frequency' => $f, 'hsk2_level' => $h2, 'hsk3_level' => $h3,
            'created_at' => $now, 'updated_at' => $now,
        ];
        HskWord::insert([
            $w('学', 'xué', ['to learn', 'to study', 'science'], 524, null, 1, '學'),
            $w('学习', 'xué xí', ['to learn', 'to study'], 789, 1, 1, '學習'),
            $w('学校', 'xué xiào', ['school'], 900, 1, 1, '學校'),
            $w('大学', 'dà xué', ['university'], 1200, 2, 2),
            $w('雪', 'xuě', ['snow'], 2500, 2, 2),
            $w('血', 'xuè', ['blood'], 2000, 3, 3),
            $w('读书', 'dú shū', ['to read a book', 'to study'], 3000, 2, 2),
            $w('学生', 'xué sheng', ['student'], 950, 1, 1),
            $w('绿', 'lǜ', ['green'], 3100, 3, 2),
            $w('研究', 'yán jiū', ['research', 'to study in depth'], 1500, 4, 3),
            $w('学者', 'xué zhě', ['scholar'], 5000, null, 7),
        ]);
        // Pad HSK 2.0 level 1 to the official 150 words (学习, 学校, 学生 + 147).
        HskWord::insert(collect(range(1, 147))->map(fn ($i) => $w("词$i", 'cí', ["word $i"], 10000 + $i, 1, 1))->all());

        $c = fn ($ch, $py, $def, $rad, $f, $h3) => [
            'char' => $ch, 'pinyin' => json_encode($py), 'definition' => $def, 'radical' => $rad,
            'frequency' => $f, 'hsk3_level' => $h3, 'created_at' => $now, 'updated_at' => $now,
        ];
        Character::insert([
            $c('学', ['xué'], 'learning; to study', '子', 524, 1),
            $c('雪', ['xuě'], 'snow', '雨', 2500, 2),
            $c('血', ['xuè', 'xiě'], 'blood', '血', 2000, 3),
            $c('字', ['zì'], 'letter, character', '子', 600, 1),
            $c('河', ['hé'], 'river', '氵', 1700, 2),
            $c('龘', ['dá'], 'dragon flying', '龍', null, null), // not HSK: excluded
        ]);
    }

    public static function queries(): array
    {
        return [['xue'], ['xué'], ['xue2'], ['学'], ['study'], ['XUE'], ['to study'], ['學']];
    }

    #[DataProvider('queries')]
    public function test_search_returns_xue_first(string $q): void
    {
        $this->getJson('/data/hsk-words?q='.urlencode($q))->assertOk()
            ->assertJsonPath('data.0.simplified', '学');
    }

    public function test_search_ranking_and_tone_filtering(): void
    {
        $words = fn ($q) => collect($this->getJson('/data/hsk-words?q='.urlencode($q))->json('data'))->pluck('simplified')->all();

        // Exact syllable before prefix before contains; frequency breaks ties.
        $this->assertSame(['学', '血', '雪', '学习', '学校', '学生', '学者', '大学'], $words('xue'));
        $this->assertSame(['学', '学习', '学校', '学生', '学者', '大学'], $words('xue2')); // tone 2 only
        $this->assertSame(['雪'], $words('xuě'));
        $this->assertSame(['雪'], $words('xue3'));
        $this->assertSame(['学习'], $words('xue2xi2'));
        $this->assertSame(['学习', '学校'], $words('xue xi'));                 // exact, then prefix (xuexiao)
        $this->assertSame(['学习', '学校'], $words('xuexi2'));                    // partly toned → toneless fallback
        $this->assertSame(['绿'], $words('lv4'));
        $this->assertSame(['绿'], $words('lü'));
        $this->assertSame(['学', '学习', '读书', '研究'], $words('study'));  // exact meaning first
        $this->assertSame(['学', '学习', '学校', '学生', '学者', '大学'], $words('学'));
        $this->assertSame([], $words('100%'));
        $this->assertSame([], $words('_'));
    }

    public function test_endpoint_filters_and_paginates(): void
    {
        $this->getJson('/data/hsk-words?version=2&level=1')->assertOk()
            ->assertJsonPath('total', 150)->assertJsonPath('per_page', 50)->assertJsonPath('last_page', 3)
            ->assertJsonPath('data.0.simplified', '学习');
        $this->getJson('/data/hsk-words?level=1')->assertOk()->assertJsonPath('total', 150); // defaults to 2.0
        $this->getJson('/data/hsk-words?version=3&level=1')->assertOk()->assertJsonPath('total', 151);
        $this->getJson('/data/hsk-words?version=3&level=7&q=xue')->assertOk()
            ->assertJsonPath('total', 1)->assertJsonPath('data.0.simplified', '学者');
        $this->getJson('/data/hsk-words?version=2&q=xue')->assertOk()
            ->assertJsonPath('data.0.simplified', '血'); // 学 is not in the HSK 2.0 list

        $p3 = $this->getJson('/data/hsk-words?version=2&level=1&page=3')->assertOk()
            ->assertJsonPath('current_page', 3)->assertJsonCount(50, 'data');
        $this->assertStringContainsString('version=2', (string) $p3->json('prev_page_url'));
        $this->getJson('/data/hsk-words?version=2&level=1&per_page=500')->assertJsonPath('per_page', 100);
        $this->getJson('/data/hsk-words?q=xue')->assertJsonMissingPath('data.0.created_at')
            ->assertJsonStructure(['data' => [['simplified', 'traditional', 'pinyin', 'meanings', 'hsk2_level', 'hsk3_level']]]);
    }

    public function test_agent_api_uses_same_search(): void
    {
        $token = \App\Models\User::factory()->create()->createToken('t', ['content:read'])->plainTextToken;
        $this->withToken($token)->getJson('/api/v1/hsk-words?q=xue2')->assertOk()->assertJsonPath('data.0.simplified', '学');
        $this->withToken($token)->getJson('/api/v1/hsk-words?hsk2_level=1')->assertOk()->assertJsonPath('total', 150);
    }

    public function test_browse_hsk_tabs(): void
    {
        $page = $this->get('/browse')->assertOk()
            ->assertSee('Level 1 · 150 words')->assertSee('By pinyin')->assertSee('By radical')
            ->assertSee('/css/browse.css', false)->assertSee('/js/store.js', false)
            ->assertSee('class="word-row"', false)->assertSee('char-tile', false)
            ->assertSee('/practice?version=2&amp;level=1', false);
        $this->assertSame(150, substr_count($page->getContent(), 'class="word-row"'));

        $this->get('/browse?tab=hsk3&level=7')->assertOk()->assertSee('Level 7–9 · 1 words');
        $this->get('/browse?tab=hsk2&level=9')->assertOk()->assertSee('Level 1 · 150 words'); // invalid → 1
    }

    public function test_browse_accepts_course_set_links(): void
    {
        // Courses (B2) links to /browse?version=&level=&set= — set N is the Nth 15 words by frequency.
        $page = $this->get('/browse?version=2&level=1&set=2')->assertOk()
            ->assertSee('Level 1 · Set 2 · 15 words')->assertSee('/practice?version=2&amp;level=1&amp;set=2', false);
        $this->assertSame(15, substr_count($page->getContent(), 'class="word-row"'));
        $sets = $this->getJson('/data/hsk/2/1/sets')->json('sets.1.words');
        foreach ($sets as $word) {
            $page->assertSee('data-word="'.$word.'"', false);
        }
        $this->get('/browse?version=3&level=1&set=1')->assertOk()->assertSee('Level 1 · Set 1 · 15 words');
        $this->get('/browse?version=2&level=1&set=99')->assertOk()->assertSee('Level 1 · 150 words');
    }

    public function test_browse_search(): void
    {
        foreach (['xue', 'xué', 'xue2', '学', 'study'] as $q) {
            $this->get('/browse?q='.urlencode($q))->assertOk()->assertSee('for “'.$q.'”', false)
                ->assertSeeInOrder(['data-word="学"', 'data-word="学习"'], false);
        }
        $this->get('/browse?q=zzzz')->assertOk()->assertSee('0 results')->assertSee('No matches');
    }

    public function test_browse_by_pinyin(): void
    {
        $this->get('/browse?tab=pinyin')->assertOk()->assertSee('Pick a syllable')
            ->assertSee('/browse?tab=pinyin&amp;syl=xue', false)->assertDontSee('syl=da', false);
        $this->get('/browse?tab=pinyin&syl=xue')->assertOk()->assertSee('xue · 3 characters')
            ->assertSeeInOrder(['data-word="学"', 'data-word="血"', 'data-word="雪"'], false)
            ->assertSee('Tone 2 · 1')->assertSee('Tone 3 · 1')->assertSee('Tone 4 · 1');
        $this->get('/browse?tab=pinyin&syl=xue&tone=2')->assertOk()->assertSee('xue · tone 2 · 1 characters')
            ->assertSee('data-word="学"', false)->assertDontSee('data-word="雪"', false);
        $this->get('/browse?tab=pinyin&syl=xie')->assertOk()->assertSee('data-word="血"', false); // second reading
    }

    public function test_browse_by_radical(): void
    {
        $this->get('/browse?tab=radical')->assertOk()->assertSee('Pick a radical')
            ->assertSeeInOrder(['3 strokes', '子', '6 strokes', '血', '8 strokes', '雨'])->assertDontSee('龍');
        $this->get('/browse?tab=radical&r='.urlencode('子'))->assertOk()->assertSee('Radical 子 · 3 strokes · 2 characters')
            ->assertSeeInOrder(['data-word="学"', 'data-word="字"'], false);
    }

    public function test_pinyin_and_radical_helpers(): void
    {
        $this->assertSame('xué', Pinyin::marked('xue2'));
        $this->assertSame('lǜ', Pinyin::marked('lv4'));
        $this->assertSame('guì', Pinyin::marked('gui4'));
        $this->assertSame('liú', Pinyin::marked('liu2'));
        $this->assertSame('dōu', Pinyin::marked('dou1'));
        $this->assertSame('xuéxí', Pinyin::compactMarked('xue2 xi2'));
        $this->assertSame('ma', Pinyin::marked('ma5'));
        $this->assertSame('xuexi', Pinyin::toneless('Xué xí'));
        $this->assertSame('lv', Pinyin::toneless('lǜ'));
        $this->assertSame(2, Pinyin::tone('xué'));
        $this->assertSame(5, Pinyin::tone('ma'));
        $this->assertNull(Pinyin::singleTone('xué xí'));
        $this->assertSame([1, 2, 3, 8, 3, 3, 17], array_map([Radicals::class, 'strokes'], ['一', '人', '口', '金', '氵', '子', '龠']));
    }
}
