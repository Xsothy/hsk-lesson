<?php

namespace Tests\Feature;

use Tests\TestCase;

class MyWordsPageTest extends TestCase
{
    public function test_words_page_renders_shell(): void
    {
        $this->get('/words')->assertOk()
            ->assertSee('My words')
            ->assertSee('data-words-page', false)
            ->assertSee('data-stat="due"', false)
            ->assertSee('/css/words.css', false)
            ->assertSee('/js/words.js', false)
            ->assertSee('No saved words yet')
            ->assertSee('/practice?source=saved', false)
            ->assertSee('/review?source=saved', false)
            ->assertSee('Export CSV');
    }
}
