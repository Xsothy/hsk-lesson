<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SyncTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $email = 'sync@example.com'): User
    {
        return User::create(['name' => 'Sync', 'email' => $email, 'password' => 'secret-pass']);
    }

    private function state(array $data = [], array $stamps = []): array
    {
        return ['v' => 1, 'data' => $data, 'stamps' => $stamps ?: new \stdClass];
    }

    public function test_guests_cannot_sync(): void
    {
        $this->getJson('/sync')->assertUnauthorized();
        $this->withoutMiddleware(ValidateCsrfToken::class)->postJson('/sync', ['rev' => 0, 'state' => $this->state()])->assertUnauthorized();
    }

    public function test_sync_routes_use_the_web_session_guard_with_csrf(): void
    {
        // Laravel skips CSRF checks under PHPUnit; the real 419 is covered in tests/e2e/alpha-sync.spec.js.
        foreach (['GET', 'POST'] as $method) {
            $route = app('router')->getRoutes()->match(\Illuminate\Http\Request::create('/sync', $method));
            $mw = $route->gatherMiddleware();
            $this->assertContains('web', $mw);
            $this->assertContains('auth', $mw);
            $this->assertContains('throttle:sync', $mw);
        }
    }

    public function test_pull_push_round_trip_with_revisions(): void
    {
        $u = $this->user();
        $this->actingAs($u)->getJson('/sync')->assertOk()->assertExactJson(['rev' => 0, 'state' => null]);

        $state = $this->state(['saved' => ['学习'], 'progress' => ['chars' => ['我' => ['written' => 2, 'at' => 5]], 'known' => []],
            'settings' => ['theme' => 'dark']], ['saved|学习' => 10]);
        $this->withoutMiddleware(ValidateCsrfToken::class);
        $this->postJson('/sync', ['rev' => 0, 'state' => $state])->assertOk()->assertExactJson(['rev' => 1]);

        $got = $this->getJson('/sync')->assertOk()->assertJsonPath('rev', 1)->json('state');
        $this->assertSame(['学习'], $got['data']['saved']);
        $this->assertSame('dark', $got['data']['settings']['theme']);
        $this->assertSame(10, $got['stamps']['saved|学习']);

        // A device that merged against rev 0 is told to pull again.
        $this->postJson('/sync', ['rev' => 0, 'state' => $state])->assertStatus(409)->assertJsonPath('rev', 1);
        $this->postJson('/sync', ['rev' => 1, 'state' => $state])->assertOk()->assertExactJson(['rev' => 2]);
    }

    public function test_users_only_see_their_own_state(): void
    {
        $this->withoutMiddleware(ValidateCsrfToken::class);
        $this->actingAs($this->user('a@example.com'))->postJson('/sync', ['rev' => 0, 'state' => $this->state(['saved' => ['甲']])])->assertOk();
        $this->actingAs($this->user('b@example.com'))->getJson('/sync')->assertExactJson(['rev' => 0, 'state' => null]);
    }

    public function test_invalid_or_old_payloads_are_rejected_and_nothing_is_stored(): void
    {
        $this->withoutMiddleware(ValidateCsrfToken::class)->actingAs($this->user());
        $bad = [
            ['rev' => 0],
            ['rev' => 'x', 'state' => $this->state()],
            ['rev' => -1, 'state' => $this->state()],
            ['rev' => 0, 'state' => 'nope'],
            ['rev' => 0, 'state' => ['v' => 2, 'data' => []]],
            ['rev' => 0, 'state' => ['data' => []]],
            ['rev' => 0, 'state' => $this->state(['saved' => ['a' => 'b']])],
            ['rev' => 0, 'state' => $this->state(['saved' => [1, 2]])],
            ['rev' => 0, 'state' => $this->state(['progress' => ['x', 'y']])],
            ['rev' => 0, 'state' => $this->state(['srs' => 'x'])],
            ['rev' => 0, 'state' => $this->state([], ['saved|a' => 'yesterday'])],
        ];
        foreach ($bad as $i => $body) {
            $this->postJson('/sync', $body)->assertStatus(422);
        }
        $this->assertSame(0, DB::table('sync_states')->count());

        $this->call('POST', '/sync', [], [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'],
            json_encode(['rev' => 0, 'state' => $this->state(['saved' => [str_repeat('字', 400_000)]])]))->assertStatus(413);
    }

    public function test_unknown_domains_are_dropped_and_empty_objects_stay_objects(): void
    {
        $this->withoutMiddleware(ValidateCsrfToken::class)->actingAs($this->user());
        $this->postJson('/sync', ['rev' => 0, 'state' => $this->state(['srs' => [], 'evil' => ['x' => 1]])])->assertOk();
        $raw = DB::table('sync_states')->value('state');
        $this->assertStringNotContainsString('evil', $raw);
        $this->assertStringContainsString('"srs":{}', $raw);
    }

    public function test_sync_is_throttled(): void
    {
        $this->actingAs($this->user());
        for ($i = 0; $i < 120; $i++) {
            $this->getJson('/sync')->assertOk();
        }
        $this->getJson('/sync')->assertStatus(429);
        // Account routes keep their own budget.
        $this->get('/account')->assertOk();
    }

    public function test_deleting_the_account_removes_the_sync_state(): void
    {
        $u = $this->user();
        $this->withoutMiddleware(ValidateCsrfToken::class)->actingAs($u)->postJson('/sync', ['rev' => 0, 'state' => $this->state()])->assertOk();
        $u->deleteAccount();
        $this->assertSame(0, DB::table('sync_states')->count());
    }

    public function test_layout_loads_sync_only_when_signed_in(): void
    {
        $this->get('/settings')->assertOk()->assertDontSee('/js/sync.js', false)->assertSee('Sign in to sync');
        $this->actingAs($this->user())->get('/settings')->assertOk()
            ->assertSee('<script src="/js/sync.js" data-csrf="', false)
            ->assertSee('id="st-sync-status"', false);
    }
}
