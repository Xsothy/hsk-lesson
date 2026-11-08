<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // S2 sync has its own bucket: unnamed `throttle:N,1` shares one counter per user across routes,
        // so frequent syncs would otherwise lock the account routes (throttle:10,1).
        // Same budgets as before for sign-in and sign-up, but separate buckets per route.
        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(30)->by('login|'.$request->ip()));
        RateLimiter::for('register', fn (Request $request) => Limit::perMinute(10)->by('register|'.$request->ip()));
        RateLimiter::for('sync', fn (Request $request) => Limit::perMinute(120)->by('sync|'.($request->user()?->id ?: $request->ip())));
        RateLimiter::for('worksheet', fn (Request $r) => Limit::perMinute(20)->by('worksheet|'.$r->ip()));
    }
}
