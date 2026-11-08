<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

/** Google sign-in via Socialite; only active when AUTH_GOOGLE_ENABLED=true. */
class GoogleController extends Controller
{
    public function redirect()
    {
        abort_unless(config('services.google.enabled'), 404);

        return Socialite::driver('google')->redirect();
    }

    public function callback(Request $request)
    {
        abort_unless(config('services.google.enabled'), 404);

        try {
            $g = Socialite::driver('google')->user();
        } catch (Throwable) {
            return redirect()->route('login')->withErrors(['email' => 'Google sign-in failed. Try again or use an email link.']);
        }
        $raw = (array) ($g->user ?? []);
        $verified = filter_var($raw['email_verified'] ?? $raw['verified_email'] ?? false, FILTER_VALIDATE_BOOLEAN);
        if (! $g->getEmail() || ! $verified) {
            return redirect()->route('login')->withErrors(['email' => 'Your Google account has no verified email address.']);
        }

        $user = User::where('google_id', $g->getId())->first() ?? User::forVerifiedEmail($g->getEmail());
        if (! $user->google_id) {
            $user->forceFill(['google_id' => $g->getId()])->save();
        }

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        return redirect()->intended(route('account'));
    }
}
