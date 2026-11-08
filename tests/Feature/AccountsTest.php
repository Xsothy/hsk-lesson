<?php

namespace Tests\Feature;

use App\Mail\MagicLinkMail;
use App\Models\LoginToken;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Tests\TestCase;

class AccountsTest extends TestCase
{
    use RefreshDatabase;

    /** Request a link and return the URL that was emailed. */
    private function requestLink(string $email = 'learner@example.com'): string
    {
        Mail::fake();
        $this->post('/login', ['email' => $email])->assertRedirect('/login/sent');
        $url = null;
        Mail::assertSent(MagicLinkMail::class, function ($m) use (&$url) {
            $url = $m->url;

            return true;
        });

        return $url;
    }

    private function signIn(string $url)
    {
        $this->get($url)->assertOk()->assertSee('Finish signing in');

        return $this->post($url);
    }

    public function test_login_pages_render_with_csrf_and_no_google_by_default(): void
    {
        $this->get('/login')->assertOk()->assertSee('Email me a sign-in link')
            ->assertSee('name="_token"', false)->assertDontSee('Continue with Google');
        $this->get('/auth/google')->assertNotFound();
        $this->get('/account')->assertRedirect('/login');
    }

    public function test_magic_link_signs_in_creates_user_and_signs_out(): void
    {
        $url = $this->requestLink('Learner@Example.com ');
        $this->assertDatabaseMissing('users', ['email' => 'learner@example.com']);
        $this->assertStringNotContainsString(parse_url($url, PHP_URL_PATH), json_encode(LoginToken::all()));

        $this->get('/login/sent')->assertOk();
        $this->signIn($url)->assertRedirect('/account');
        $this->assertAuthenticated();
        $user = User::where('email', 'learner@example.com')->firstOrFail();
        $this->assertNotNull($user->email_verified_at);
        $this->get('/account')->assertOk()->assertSee('learner@example.com')->assertSee('Sync coming soon');
        $this->get('/settings')->assertSee('Signed in as')->assertDontSee('id="st-signin"', false);
        $this->get('/login')->assertRedirect('/account');

        $this->post('/logout')->assertRedirect('/login');
        $this->assertGuest();

        $this->signIn($this->requestLink('learner@example.com'))->assertRedirect('/account');
        $this->assertAuthenticatedAs($user);
        $this->assertSame(1, User::count());
    }

    public function test_get_on_link_does_not_consume_token(): void
    {
        $url = $this->requestLink();
        $this->get($url)->assertOk();
        $this->get($url)->assertOk();
        $this->assertGuest();
        $this->post($url)->assertRedirect('/account');
    }

    public function test_token_cannot_be_reused(): void
    {
        $url = $this->requestLink();
        $this->post($url)->assertRedirect('/account');
        $this->post('/logout');
        $this->post($url)->assertStatus(410)->assertSee('invalid, expired or already used');
        $this->assertGuest();
    }

    public function test_token_expires_after_15_minutes(): void
    {
        $url = $this->requestLink();
        $this->travel(16)->minutes();
        $this->post($url)->assertStatus(410);
        $this->assertGuest();
    }

    public function test_expired_db_row_rejected_even_with_valid_signature(): void
    {
        $url = $this->requestLink();
        LoginToken::query()->update(['expires_at' => now()->subMinute()]);
        $this->post($url)->assertStatus(410);
        $this->assertGuest();
    }

    public function test_tampered_links_are_rejected(): void
    {
        $url = $this->requestLink();
        // Changed token, same signature.
        $this->post(preg_replace('#/verify/[^?]+#', '/verify/'.str_repeat('a', 64), $url))->assertStatus(410);
        // Changed signature.
        $this->post(preg_replace('/signature=[0-9a-f]+/', 'signature='.str_repeat('0', 64), $url))->assertStatus(410);
        // Extended expiry.
        $this->post(preg_replace('/expires=\d+/', 'expires='.(time() + 86400), $url))->assertStatus(410);
        // Unsigned but known token.
        [, $plain] = LoginToken::issue('x@example.com');
        $this->post('/login/verify/'.$plain)->assertStatus(410);
        // Signed link for a token that was never issued.
        $this->post(URL::temporarySignedRoute('login.verify', now()->addMinutes(5), ['token' => 'nope']))->assertStatus(410);
        $this->assertGuest();
        // The original still works.
        $this->post($url)->assertRedirect('/account');
    }

    public function test_requests_are_throttled_per_email(): void
    {
        Mail::fake();
        for ($i = 0; $i < 3; $i++) {
            $this->post('/login', ['email' => 'a@example.com'])->assertRedirect('/login/sent');
        }
        $this->post('/login', ['email' => 'a@example.com'])->assertStatus(429)->assertSee('Too many sign-in links');
        Mail::assertSentCount(3);
        // A different address from the same IP still works.
        $this->post('/login', ['email' => 'b@example.com'])->assertRedirect('/login/sent');
    }

    public function test_requests_are_throttled_per_ip(): void
    {
        Mail::fake();
        for ($i = 0; $i < 10; $i++) {
            $this->post('/login', ['email' => "u{$i}@example.com"])->assertRedirect('/login/sent');
        }
        $this->post('/login', ['email' => 'u99@example.com'])->assertStatus(429);
        Mail::assertSentCount(10);
    }

    public function test_invalid_email_is_rejected(): void
    {
        Mail::fake();
        $this->post('/login', ['email' => 'not-an-email'])->assertSessionHasErrors('email');
        Mail::assertNothingSent();
    }

    public function test_delete_account_requires_confirmation_and_removes_user_and_sessions(): void
    {
        $this->signIn($this->requestLink('del@example.com'));
        $user = User::where('email', 'del@example.com')->firstOrFail();
        $user->createToken('agent');
        DB::table('sessions')->insert(['id' => 'other-device', 'user_id' => $user->id, 'payload' => '', 'last_activity' => time()]);

        $this->delete('/account', ['confirm_email' => 'wrong@example.com'])->assertSessionHasErrors('confirm_email');
        $this->assertDatabaseHas('users', ['id' => $user->id]);

        $this->delete('/account', ['confirm_email' => 'DEL@example.com'])->assertRedirect('/login');
        $this->assertGuest();
        $this->assertDatabaseMissing('users', ['id' => $user->id]);
        $this->assertDatabaseMissing('sessions', ['user_id' => $user->id]);
        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $user->id]);
        $this->assertDatabaseMissing('login_tokens', ['email' => 'del@example.com']);
    }

    public function test_account_forms_carry_csrf_tokens(): void
    {
        $this->actingAs(User::forVerifiedEmail('c@example.com'));
        $html = $this->get('/account')->assertOk()->getContent();
        $this->assertSame(2, substr_count($html, 'name="_token"'));
        $this->assertStringContainsString('name="_method" value="DELETE"', $html);
    }

    private function mockGoogle(string $id, ?string $email, bool $verified = true): void
    {
        $g = (new SocialiteUser)->map(['id' => $id, 'email' => $email, 'name' => 'G User']);
        $g->setRaw(['email_verified' => $verified]);
        $provider = Mockery::mock(\Laravel\Socialite\Contracts\Provider::class);
        $provider->shouldReceive('user')->andReturn($g);
        $provider->shouldReceive('redirect')->andReturn(redirect('https://accounts.google.test/o/oauth2/auth'));
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
    }

    public function test_google_flow_with_mocked_provider(): void
    {
        config(['services.google.enabled' => true]);
        $this->get('/login')->assertSee('Continue with Google');
        $this->mockGoogle('g-123', 'Gee@Example.com');

        $this->get('/auth/google')->assertRedirect('https://accounts.google.test/o/oauth2/auth');
        $this->get('/auth/google/callback')->assertRedirect('/account');
        $user = User::where('email', 'gee@example.com')->firstOrFail();
        $this->assertSame('g-123', $user->google_id);
        $this->assertAuthenticatedAs($user);

        // Second sign-in finds the same user by google_id.
        $this->post('/logout');
        $this->get('/auth/google/callback')->assertRedirect('/account');
        $this->assertSame(1, User::count());
    }

    public function test_google_links_to_existing_magic_link_account(): void
    {
        config(['services.google.enabled' => true]);
        $existing = User::forVerifiedEmail('same@example.com');
        $this->mockGoogle('g-9', 'same@example.com');
        $this->get('/auth/google/callback')->assertRedirect('/account');
        $this->assertAuthenticatedAs($existing);
        $this->assertSame('g-9', $existing->fresh()->google_id);
    }

    public function test_google_unverified_email_is_refused(): void
    {
        config(['services.google.enabled' => true]);
        $this->mockGoogle('g-1', 'u@example.com', verified: false);
        $this->get('/auth/google/callback')->assertRedirect('/login');
        $this->assertGuest();
        $this->assertSame(0, User::count());
    }
}
