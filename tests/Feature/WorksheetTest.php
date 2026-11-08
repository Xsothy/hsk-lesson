<?php

namespace Tests\Feature;

use App\Models\Character;
use App\Models\CharacterStroke;
use App\Models\HskWord;
use App\Models\Lesson;
use App\Services\Worksheet\WorksheetOptions;
use App\Services\Worksheet\WorksheetPdf;
use App\Services\Worksheet\WorksheetSource;
use Database\Seeders\LegacyContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WorksheetTest extends TestCase
{
    use RefreshDatabase;

    // Two real-ish strokes using M, L, Q, C and Z.
    private const STROKES = [
        'M 100 700 Q 300 720 500 700 L 520 680 Q 300 690 100 680 Z',
        'M 300 800 C 310 600 320 400 300 100 L 280 100 Q 290 450 280 800 Z',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(LegacyContentSeeder::class);
        foreach (['你' => 'nǐ', '好' => 'hǎo', '学' => 'xué'] as $c => $p) {
            Character::create(['char' => $c, 'pinyin' => [$p], 'definition' => "def of $c; more", 'hsk2_level' => 1, 'hsk3_level' => 1]);
            CharacterStroke::create(['char' => $c, 'strokes' => self::STROKES]);
        }
        HskWord::create(['simplified' => '你好', 'pinyin' => 'nǐ hǎo', 'pinyin_plain' => 'nihao', 'meanings' => ['hello'], 'hsk2_level' => 1, 'hsk3_level' => 1]);
    }

    private function assertPdf($response): void
    {
        $response->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('%PDF-', $response->getContent());
    }

    public function test_builder_page_renders_with_prefill_and_is_linked_from_tools(): void
    {
        $this->get('/worksheet?chars=你好')->assertOk()
            ->assertSee('data-worksheet-form', false)
            ->assertSee('你好')
            ->assertSee('name="grid"', false)
            ->assertSee('name="trace"', false);
        $this->get('/tools')->assertOk()->assertSee(route('worksheet'), false);
    }

    public function test_pdf_from_typed_characters(): void
    {
        $this->assertPdf($this->get('/worksheet.pdf?source=text&chars='.urlencode('你好 abc 你').'&grid=mi&trace=5&pinyin=0&english=1'));
    }

    public function test_pdf_from_a_lesson_and_an_hsk_level(): void
    {
        $lesson = Lesson::where('is_published', true)->first();
        $lesson->update(['vocab' => ['你好', '学']]);
        $this->assertPdf($this->get('/worksheet.pdf?source=lesson&lesson='.$lesson->slug.'&grid=plain'));
        $this->assertPdf($this->get('/worksheet.pdf?source=hsk&version=2&level=1'));
        $this->assertPdf($this->get('/worksheet.pdf?source=hsk&version=3&level=1&set=1'));
    }

    public function test_pdf_validates_input(): void
    {
        $this->getJson('/worksheet.pdf')->assertStatus(422)->assertJsonValidationErrors('source');
        $this->getJson('/worksheet.pdf?source=text')->assertStatus(422)->assertJsonValidationErrors('chars');
        $this->getJson('/worksheet.pdf?source=text&chars=abc')->assertStatus(422)->assertJsonValidationErrors('chars');
        $this->getJson('/worksheet.pdf?source=text&chars=你&grid=hex')->assertStatus(422)->assertJsonValidationErrors('grid');
        $this->getJson('/worksheet.pdf?source=text&chars=你&trace=12')->assertStatus(422)->assertJsonValidationErrors('trace');
        $this->getJson('/worksheet.pdf?source=text&chars='.str_repeat('你', 501))->assertStatus(422);
        $this->getJson('/worksheet.pdf?source=hsk&version=4&level=1')->assertStatus(422)->assertJsonValidationErrors('version');
        $this->getJson('/worksheet.pdf?source=hsk&version=2&level=7')->assertStatus(422)->assertJsonValidationErrors('level');
        $this->get('/worksheet.pdf?source=lesson&lesson=nope')->assertNotFound();
    }

    public function test_html_form_errors_redirect_back_to_the_builder(): void
    {
        $this->from('/worksheet')->get('/worksheet.pdf?form=1&source=text&chars=xyz')
            ->assertRedirect('/worksheet')->assertSessionHasErrors('chars');
    }

    public function test_entry_links_on_lesson_and_character_pages(): void
    {
        $lesson = Lesson::where('is_published', true)->first();
        $this->get('/lessons/'.$lesson->slug)->assertOk()->assertSee(route('worksheet', ['lesson' => $lesson->slug]), false);
        $this->get('/char/'.rawurlencode('学'))->assertOk()->assertSee('data-worksheet-link', false);
    }

    public function test_pipeline_is_reusable_and_reports_missing_characters(): void
    {
        $src = app(WorksheetSource::class);
        ['items' => $items, 'missing' => $missing] = $src->items(WorksheetSource::hanzi('你好吗'));
        $this->assertSame(['你', '好'], array_map(fn ($i) => $i->char, $items));
        $this->assertSame(['吗'], $missing);
        $this->assertSame('nǐ', $items[0]->pinyin);
        $this->assertSame('def of 你', $items[0]->english);

        $pdf = app(WorksheetPdf::class)->render('My words', $items, new WorksheetOptions(grid: 'mi', trace: 0, pinyin: false));
        $this->assertStringStartsWith('%PDF-', $pdf);
    }
}
