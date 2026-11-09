<?php

namespace Tests\Feature;

use App\Models\Character;
use App\Models\HskWord;
use Database\Seeders\LegacyContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PracticeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(LegacyContentSeeder::class);
        $now = now();
        $w = fn ($s, $p, $m, $f, $h2) => ['simplified' => $s, 'traditional' => null, 'pinyin' => $p, 'pinyin_plain' => HskWord::plain($p),
            'meanings' => json_encode($m), 'frequency' => $f, 'hsk2_level' => $h2, 'hsk3_level' => $h2, 'created_at' => $now, 'updated_at' => $now];
        HskWord::insert([$w('学习', 'xué xí', ['to learn', 'to study'], 1, 1), $w('学校', 'xué xiào', ['school'], 2, 1), $w('你', 'nǐ', ['you'], 3, 1)]);
        Character::create(['char' => '你', 'pinyin' => ['nǐ'], 'definition' => 'you', 'radical' => '亻']);
    }

    public function test_page_shows_source_picker(): void
    {
        $this->get('/practice')->assertOk()
            ->assertSee('My saved words')->assertSee('Due for review')->assertSee('?lesson=', false)
            ->assertSee('version=2&amp;level=1', false)->assertSee('data-practice', false)->assertSee('/js/practice.js', false);
    }

    public function test_page_with_source_hides_picker(): void
    {
        $this->get('/practice?source=saved')->assertOk()->assertSee('data-has-source', false);
        $this->get('/practice')->assertOk()->assertDontSee('data-has-source', false);
    }

    public function test_browse_words_link_starts_a_session(): void
    {
        // Browse "Practise" emits /practice?words=学,学习 — must skip the picker.
        $this->get('/practice?words='.urlencode('学,学习').'&filter=learn')->assertOk()->assertSee('data-has-source', false);
    }

    public function test_lesson_queue_is_unique_characters(): void
    {
        $slug = \App\Models\Lesson::where('is_published', true)->orderBy('number')->value('slug');
        $items = $this->getJson('/data/practice-queue?lesson='.$slug)->assertOk()->json('items');
        $this->assertNotEmpty($items);
        $chars = array_column($items, 'char');
        $this->assertSame($chars, array_values(array_unique($chars)));
        foreach ($chars as $c) {
            $this->assertMatchesRegularExpression('/^\p{Han}$/u', $c);
        }
        $this->getJson('/data/practice-queue?lesson=nope')->assertNotFound();
    }

    public function test_hsk_level_queue(): void
    {
        $r = $this->getJson('/data/practice-queue?version=2&level=1')->assertOk();
        $this->assertSame(['学', '习', '校', '你'], array_column($r->json('items'), 'char'));
        $this->assertSame('学习', $r->json('items.0.word'));
        $this->assertSame('to learn; to study', $r->json('items.0.english'));
        $this->assertSame('you', $r->json('items.3.english'));
        $this->getJson('/data/practice-queue?version=2&level=1&set=2')->assertOk()->assertJsonCount(0, 'items');
    }

    public function test_words_queue_for_saved_and_due(): void
    {
        $r = $this->getJson('/data/practice-queue?words='.urlencode('学校,你,学校'))->assertOk();
        $this->assertSame(['学', '校', '你'], array_column($r->json('items'), 'char'));
        $this->assertSame('nǐ', $r->json('items.2.pinyin'));
    }

    public function test_queue_requires_a_source(): void
    {
        $this->getJson('/data/practice-queue')->assertStatus(422);
    }
}
