<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AccountsTest extends TestCase
{
    use RefreshDatabase;

    private function user(string $email = 'learner@example.com', string $password = 'secret-pass'): User
    {
        return User::create(['name' => 'Learner', 'email' => $email, 'password' => $password]);
    }

    public function test_auth_pages_render_with_csrf_and_telegram_help(): void
    {
        config(['hsk.support_telegram' => 'sothy_l']);
        $this->get('/login')->assertOk()->assertSee('name="_token"', false)
            ->assertSee('name="remember"', false)
            ->assertSee('Forgot your password? Message us on Telegram')
            ->assertSee('href="https://t.me/sothy_l" target="_blank" rel="noopener"', false)
            ->assertSee('@sothy_l');
        $this->get('/register')->assertOk()->assertSee('name="password_confirmation"', false)->assertSee('name="_token"', false);
        $this->get('/account')->assertRedirect('/login');
        $this->get('/forgot-password')->assertNotFound();
        $this->get('/reset-password/abc')->assertNotFound();
    }

    public function test_register_hashes_password_and_signs_in(): void
    {
        $this->post('/register', [
            'name' => 'Ann', 'email' => 'Ann@Example.com ', 'password' => 'longenough', 'password_confirmation' => 'longenough',
        ])->assertRedirect('/account');
        $user = User::where('email', 'ann@example.com')->firstOrFail();
        $this->assertAuthenticatedAs($user);
        $this->assertNotSame('longenough', $user->password);
        $this->assertTrue(Hash::check('longenough', $user->password));
        $this->get('/account')->assertSee('ann@example.com')->assertSee('Sync on');
        $this->get('/settings')->assertSee('Signed in as')->assertDontSee('id="st-signin"', false);
        $this->get('/login')->assertRedirect('/account');
    }

    public function test_register_validation(): void
    {
        $this->user('taken@example.com');
        $this->post('/register', ['name' => 'X', 'email' => 'taken@example.com', 'password' => 'longenough', 'password_confirmation' => 'longenough'])
            ->assertSessionHasErrors('email');
        $this->post('/register', ['name' => 'X', 'email' => 'x@example.com', 'password' => 'short', 'password_confirmation' => 'short'])
            ->assertSessionHasErrors('password');
        $this->post('/register', ['name' => 'X', 'email' => 'x@example.com', 'password' => 'longenough', 'password_confirmation' => 'different'])
            ->assertSessionHasErrors('password');
        $this->post('/register', ['name' => '', 'email' => 'x@example.com', 'password' => 'longenough', 'password_confirmation' => 'longenough'])
            ->assertSessionHasErrors('name');
        $this->assertGuest();
        $this->assertSame(1, User::count());
    }

    public function test_login_remember_me_logout_and_login_again(): void
    {
        $user = $this->user();
        $this->post('/login', ['email' => 'learner@example.com', 'password' => 'wrong'])->assertSessionHasErrors('email');
        $this->assertGuest();

        $resp = $this->post('/login', ['email' => 'Learner@example.com', 'password' => 'secret-pass', 'remember' => '1']);
        $resp->assertRedirect('/account');
        $this->assertAuthenticatedAs($user);
        $resp->assertCookie(auth()->guard('web')->getRecallerName());
        $this->assertNotNull($user->fresh()->remember_token);

        $this->post('/logout')->assertRedirect('/login');
        $this->assertGuest();

        $this->post('/login', ['email' => 'learner@example.com', 'password' => 'secret-pass'])
            ->assertRedirect('/account')->assertCookieMissing(auth()->guard('web')->getRecallerName());
        $this->assertAuthenticatedAs($user);
    }

    public function test_login_locks_out_after_five_failures(): void
    {
        $this->user();
        for ($i = 0; $i < 5; $i++) {
            $this->post('/login', ['email' => 'learner@example.com', 'password' => 'nope'])->assertSessionHasErrors('email');
        }
        $this->post('/login', ['email' => 'learner@example.com', 'password' => 'secret-pass'])
            ->assertSessionHasErrors(['email' => 'Too many sign-in attempts. Try again in 1 min.']);
        $this->assertGuest();

        $this->travel(61)->seconds();
        $this->post('/login', ['email' => 'learner@example.com', 'password' => 'secret-pass'])->assertRedirect('/account');
    }

    public function test_change_password_requires_current_and_signs_out_other_sessions(): void
    {
        $user = $this->user();
        DB::table('sessions')->insert(['id' => 'other-device', 'user_id' => $user->id, 'payload' => '', 'last_activity' => time()]);
        $oldRemember = $user->remember_token;
        $this->actingAs($user);

        $this->put('/account/password', ['current_password' => 'wrong', 'password' => 'new-password', 'password_confirmation' => 'new-password'])
            ->assertSessionHasErrorsIn('password', 'current_password');
        $this->assertTrue(Hash::check('secret-pass', $user->fresh()->password));

        $this->put('/account/password', ['current_password' => 'secret-pass', 'password' => 'new-password', 'password_confirmation' => 'new-password'])
            ->assertRedirect('/account');
        $fresh = $user->fresh();
        $this->assertTrue(Hash::check('new-password', $fresh->password));
        $this->assertNotSame($oldRemember, $fresh->remember_token);
        $this->assertDatabaseMissing('sessions', ['id' => 'other-device']);
        $this->assertAuthenticatedAs($user);
    }

    public function test_delete_account_requires_password_and_removes_user_sessions_and_tokens(): void
    {
        $user = $this->user('del@example.com');
        $user->createToken('agent');
        DB::table('sessions')->insert(['id' => 'other-device', 'user_id' => $user->id, 'payload' => '', 'last_activity' => time()]);
        $this->actingAs($user);

        $this->delete('/account', ['password' => 'wrong'])->assertSessionHasErrorsIn('delete', 'password');
        $this->assertDatabaseHas('users', ['id' => $user->id]);

        $this->delete('/account', ['password' => 'secret-pass'])->assertRedirect('/login');
        $this->assertGuest();
        $this->assertDatabaseMissing('users', ['id' => $user->id]);
        $this->assertDatabaseMissing('sessions', ['user_id' => $user->id]);
        $this->assertDatabaseMissing('personal_access_tokens', ['tokenable_id' => $user->id]);
    }

    public function test_account_forms_carry_csrf_tokens(): void
    {
        $this->actingAs($this->user());
        $html = $this->get('/account')->assertOk()->getContent();
        $this->assertSame(3, substr_count($html, 'name="_token"'));
        $this->assertStringContainsString('name="_method" value="PUT"', $html);
        $this->assertStringContainsString('name="_method" value="DELETE"', $html);
    }

    public function test_reset_password_command(): void
    {
        $user = $this->user();
        $user->forceFill(['remember_token' => 'old-token'])->save();
        DB::table('sessions')->insert(['id' => 's1', 'user_id' => $user->id, 'payload' => '', 'last_activity' => time()]);

        $this->assertSame(0, Artisan::call('hsk:reset-password', ['email' => 'Learner@example.com']));
        $this->assertSame(1, preg_match('/Temporary password for learner@example\.com: (\S{16})\s/', Artisan::output(), $m));

        $fresh = $user->fresh();
        $this->assertTrue(Hash::check($m[1], $fresh->password));
        $this->assertFalse(Hash::check('secret-pass', $fresh->password));
        $this->assertNotSame('old-token', $fresh->remember_token);
        $this->assertDatabaseMissing('sessions', ['user_id' => $user->id]);

        $this->post('/login', ['email' => 'learner@example.com', 'password' => $m[1]])->assertRedirect('/account');
    }

    public function test_reset_password_command_unknown_email(): void
    {
        $this->artisan('hsk:reset-password', ['email' => 'nobody@example.com'])
            ->expectsOutput('No user with that email.')->assertExitCode(1);
    }
}
