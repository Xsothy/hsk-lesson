<?php

namespace Tests\Feature;

use App\Models\Character;
use Database\Seeders\LegacyContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CharacterPartsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(LegacyContentSeeder::class);
        Character::create(['char' => '学', 'pinyin' => ['xué'], 'definition' => 'to study', 'radical' => '子', 'decomposition' => '⿱⺍⿱冖子', 'hsk3_level' => 1]);
        Character::create(['char' => '子', 'pinyin' => ['zǐ'], 'definition' => 'child', 'radical' => '子', 'decomposition' => '⿻了一', 'hsk3_level' => 1]);
        Character::create(['char' => '字', 'pinyin' => ['zì'], 'definition' => 'character', 'radical' => '子', 'decomposition' => '⿱宀子', 'hsk3_level' => 2]);
        foreach ([['学', '⺍'], ['学', '冖'], ['学', '子'], ['字', '宀'], ['字', '子']] as [$c, $p]) {
            DB::table('character_parts')->insert(['char' => $c, 'part' => $p]);
        }
    }

    public function test_character_facts_link_each_part_to_the_parts_page(): void
    {
        $this->get('/char/'.rawurlencode('学'))->assertOk()
            ->assertSee('Top–bottom')
            ->assertSee('href="'.route('parts', ['c' => '子']).'"', false)
            ->assertDontSee('data-parts', false);
    }

    private function seedClues(): void
    {
        $e = fn ($sem, $pho) => ['type' => 'pictophonetic', 'semantic' => $sem, 'phonetic' => $pho, 'hint' => 'x'];
        Character::create(['char' => '氵', 'pinyin' => ['shuǐ'], 'definition' => 'water', 'radical' => '水']);
        Character::create(['char' => '青', 'pinyin' => ['qīng'], 'definition' => 'blue, green', 'radical' => '青']);
        foreach ([['清', 'qīng', 'clear', 1], ['情', 'qíng', 'feeling', 2], ['请', 'qǐng', 'please', 1]] as [$c, $p, $d, $l]) {
            Character::create(['char' => $c, 'pinyin' => [$p], 'definition' => $d, 'radical' => '氵', 'hsk3_level' => $l, 'etymology' => $e('氵', '青')]);
        }
        foreach ([['河', 'hé', 'river'], ['海', 'hǎi', 'sea'], ['洗', 'xǐ', 'to wash']] as [$c, $p, $d]) {
            Character::create(['char' => $c, 'pinyin' => [$p], 'definition' => $d, 'radical' => '氵', 'hsk3_level' => 2, 'etymology' => $e('氵', '可')]);
        }
        \Illuminate\Support\Facades\Cache::flush();
    }

    public function test_parts_page_lists_meaning_and_sound_clues_from_etymology(): void
    {
        $this->seedClues();
        $this->get('/parts')->assertOk()
            ->assertSee('Character parts')->assertSee('/css/parts.css', false)
            ->assertSee('data-part="氵"', false)->assertSee('data-part="青"', false)
            ->assertSee('Meaning clues')->assertSee('Sound families')
            ->assertSee('Water radical')->assertSee('A meaning clue in 6 HSK characters');
    }

    public function test_parts_page_detail_filter_and_search(): void
    {
        $this->seedClues();
        $this->get('/parts?c='.rawurlencode('青'))->assertOk()
            ->assertSee('Sound clue')->assertSee('Qing sound family')
            ->assertSee('3 of them are read qing', false)
            ->assertSee('href="'.route('char', '清').'"', false)
            ->assertSee('data-add-cards=', false);
        $this->get('/parts?kind=sound')->assertOk()->assertSee('data-part="青"', false)->assertDontSee('data-part="氵"', false);
        $this->get('/parts?q=water')->assertOk()->assertSee('data-part="氵"', false)->assertDontSee('data-part="青"', false);
        $this->get('/parts?q=qing')->assertOk()->assertSee('data-part="青"', false);
        $this->get('/parts?q=zzzz')->assertOk()->assertSee('No parts match');
    }

    public function test_written_part_without_a_clue_role_falls_back_to_character_parts(): void
    {
        $this->get('/parts?c='.rawurlencode('冖'))->assertOk()->assertSee('Appears as a written part')
            ->assertSee('href="'.route('char', '学').'"', false);
    }

    public function test_header_links_character_parts_to_parts_page(): void
    {
        $this->get("/parts")->assertOk()->assertSee("menu-chars is-current", false)->assertSeeInOrder(["href=\"".route("parts")."\"", "aria-current=\"page\""], false);
    }

    public function test_json_exposes_decomposition_radical_and_parts(): void
    {
        $d = $this->getJson('/data/char/'.rawurlencode('学').'.json')->assertOk()->json('data');
        $this->assertSame('⿱⺍⿱冖子', $d['decomposition']);
        $this->assertSame('子', $d['radical']);
        $this->assertSame(['⺍', '冖', '子'], array_column($d['parts']['components'], 'char'));
        $this->assertTrue($d['parts']['components'][2]['is_radical']);
        $this->assertFalse($d['parts']['components'][0]['exists']);
        $this->assertSame('字', $d['parts']['shared'][0]['items'][0]['char']);
    }

    public function test_parts_of_parses_ids(): void
    {
        $this->assertSame(['⺍', '冖', '子'], \App\Services\CharacterService::partsOf('⿱⺍⿱冖子'));
        $this->assertSame([], \App\Services\CharacterService::partsOf('？'));
    }
}
