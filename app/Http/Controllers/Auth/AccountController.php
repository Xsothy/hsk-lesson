<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password;

class AccountController extends Controller
{
    public function show(Request $request)
    {
        return view('auth.account', ['user' => $request->user()]);
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login')->with('status', 'You are signed out. Your progress stays on this device.');
    }

    public function updatePassword(Request $request)
    {
        $data = $request->validateWithBag('password', [
            'current_password' => ['required', 'current_password:web'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $request->user()->resetPasswordAndSessions($data['password'], $request->session()->getId());
        Auth::guard('web')->login($request->user(), $request->hasCookie(Auth::guard('web')->getRecallerName()));
        $request->session()->regenerate();

        return redirect()->route('account')->with('status', 'Password changed. Other devices have been signed out.');
    }

    public function destroy(Request $request)
    {
        $request->validateWithBag('delete', ['password' => ['required', 'current_password:web']]);

        $user = $request->user();
        Auth::guard('web')->logout();
        $user->deleteAccount();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login')->with('status', 'Your account has been deleted. Progress on this device was not touched.');
    }
}
