<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

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

    public function destroy(Request $request)
    {
        $user = $request->user();
        if (strtolower(trim((string) $request->input('confirm_email'))) !== $user->email) {
            return back()->withErrors(['confirm_email' => 'Type your email address exactly to confirm.']);
        }

        Auth::guard('web')->logout();
        $user->deleteAccount();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login')->with('status', 'Your account has been deleted. Progress on this device was not touched.');
    }
}
