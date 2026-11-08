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
        // Own bucket: plain `throttle:N,1` shares one per-IP counter across every throttled route.
        RateLimiter::for('worksheet', fn (Request $r) => Limit::perMinute(20)->by('worksheet|'.$r->ip()));
    }
}
