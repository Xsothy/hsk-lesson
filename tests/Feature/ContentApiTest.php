<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\LegacyContentSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ContentApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(LegacyContentSeeder::class);
    }

    public function test_requires_token(): void
    {
        $this->getJson('/api/v1/lessons')->assertUnauthorized();
    }

    public function test_read_only_token_cannot_write(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['content:read']);

        $this->getJson('/api/v1/lessons')->assertOk()->assertJsonCount(12, 'data');
        $this->deleteJson('/api/v1/lessons/lesson-1')->assertForbidden();
    }

    public function test_agent_can_create_lesson_and_it_is_served_to_frontend(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['content:read', 'content:write']);

        $this->postJson('/api/v1/lessons', [
            'en_title' => 'Test',
            'vocab' => ['你好'],
            'sentences' => [['zh' => '你好！我是老师。', 'en' => 'Hi! I am a teacher.']],
        ])->assertCreated()
            ->assertJsonPath('data.slug', 'lesson-13')
            ->assertJsonPath('data.sentences.0.words', ['你好', '！', '我', '是', '老师', '。']);

        $this->get('/lessons/lesson-13')->assertOk()->assertSee('老师', false);
        $this->getJson('/api/v1/validate')->assertJsonPath('ok', true);
    }
}
