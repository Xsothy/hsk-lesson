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

    public function test_parts_section_shows_components_radical_and_sharing(): void
    {
        $this->get('/char/'.rawurlencode('学'))->assertOk()
            ->assertSee('data-parts', false)
            ->assertSee('Top–bottom')
            ->assertSee('data-radical', false)
            ->assertSee('Characters sharing')
            ->assertSee('href="'.route('char', '字').'"', false);
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
