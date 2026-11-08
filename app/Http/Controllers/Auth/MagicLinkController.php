<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\MagicLinkMail;
use App\Models\LoginToken;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;

class MagicLinkController extends Controller
{
    public function show()
    {
        if (Auth::check()) {
            return redirect()->route('account');
        }

        return view('auth.login', ['google' => (bool) config('services.google.enabled')]);
    }

    public function send(Request $request)
    {
        $data = $request->validate(['email' => ['required', 'string', 'email', 'max:255']]);
        $email = strtolower(trim($data['email']));

        $limits = [
            'magic:email:'.hash('sha256', $email) => (int) config('auth.magic_link.per_email', 3),
            'magic:ip:'.$request->ip() => (int) config('auth.magic_link.per_ip', 10),
        ];
        foreach ($limits as $key => $max) {
            if (RateLimiter::tooManyAttempts($key, $max)) {
                $minutes = max(1, (int) ceil(RateLimiter::availableIn($key) / 60));

                return response()->view('auth.login', [
                    'google' => (bool) config('services.google.enabled'),
                    'throttled' => "Too many sign-in links requested. Try again in {$minutes} min.",
                    'oldEmail' => $email,
                ], 429);
            }
        }
        foreach (array_keys($limits) as $key) {
            RateLimiter::hit($key, 15 * 60);
        }

        [, $plain] = LoginToken::issue($email);
        $url = URL::temporarySignedRoute('login.verify', now()->addMinutes(LoginToken::TTL_MINUTES), ['token' => $plain]);
        Mail::to($email)->send(new MagicLinkMail($url));

        return redirect()->route('login.sent')->with('magic_email', $email);
    }

    public function sent(Request $request)
    {
        return view('auth.check-email', ['email' => $request->session()->get('magic_email')]);
    }

    /**
     * The emailed link (GET) shows a "Sign in" button and does not consume the token,
     * so mail scanners that prefetch links can't burn it. The POST signs in.
     */
    public function confirm(Request $request, string $token)
    {
        if (! $request->hasValidSignature()) {
            return $this->invalid();
        }

        return view('auth.confirm', ['action' => $request->fullUrl()]);
    }

    public function verify(Request $request, string $token)
    {
        if (! $request->hasValidSignature() || ! ($row = LoginToken::consume($token))) {
            return $this->invalid();
        }

        Auth::login(User::forVerifiedEmail($row->email), remember: true);
        $request->session()->regenerate();

        return redirect()->intended(route('account'));
    }

    private function invalid()
    {
        return response()->view('auth.login', [
            'google' => (bool) config('services.google.enabled'),
            'linkError' => 'That sign-in link is invalid, expired or already used. Request a new one below.',
        ], 410);
    }
}
