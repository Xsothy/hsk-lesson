<?php

namespace Tests\Feature;

use App\Models\HskWord;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TextbooksTest extends TestCase
{
    use RefreshDatabase;

    public function test_tab_renders_import_ui_without_bundled_lists(): void
    {
        $this->get('/courses?tab=textbooks')->assertOk()
            ->assertSee('data-textbooks', false)
            ->assertSee('id="tb-text"', false)
            ->assertSee('Upload CSV')
            ->assertSee('/js/textbooks.js', false)
            ->assertDontSee('Textbooks are coming');
        $this->get('/courses?tab=hsk2')->assertOk()->assertDontSee('/js/textbooks.js', false);
    }

    public function test_lookup_fills_pinyin_and_meaning_from_hsk_data(): void
    {
        HskWord::create(['simplified' => '学习', 'pinyin' => 'xuéxí', 'meanings' => ['to study', 'to learn', 'a', 'b'], 'hsk2_level' => 1]);
        $r = $this->postJson('/textbooks/lookup', ['words' => ['学习', '学习', 'zzz']])->assertOk();
        $this->assertSame(['p' => 'xuéxí', 'e' => 'to study; to learn; a'], $r->json('results.学习'));
        $this->assertArrayNotHasKey('zzz', (array) $r->json('results'));
    }

    public function test_lookup_validates_input(): void
    {
        $this->postJson('/textbooks/lookup', [])->assertStatus(422);
        $this->postJson('/textbooks/lookup', ['words' => array_fill(0, 301, '学')])->assertStatus(422);
    }

    public function test_practice_and_review_accept_list_source(): void
    {
        $this->get('/practice?source=list&id=x')->assertOk()->assertSee('data-has-source', false);
        $this->get('/review?source=list&id=x')->assertOk();
    }

    public function test_sync_accepts_lists_domain(): void
    {
        $user = User::factory()->create();
        $state = ['v' => 1, 'data' => ['lists' => ['a' => ['name' => 'Book', 'words' => [['h' => '学', 'p' => '', 'e' => '']], 'at' => 1]]], 'stamps' => ['lists|a' => 1]];
        $this->actingAs($user)->postJson('/sync', ['rev' => 0, 'state' => $state])->assertOk();
        $this->actingAs($user)->getJson('/sync')->assertJsonPath('state.data.lists.a.name', 'Book');
    }
}
