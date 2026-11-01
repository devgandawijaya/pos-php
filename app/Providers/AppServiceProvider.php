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
        // 1. General API Rate Limiter
        RateLimiter::for('api', function (Request $request) {
            return $request->user()
                ? Limit::perMinute(120)->by($request->user()->id)
                : Limit::perMinute(60)->by($request->ip());
        });

        // 2. POS Checkout Rate Limiter (Protects against double checkout / charge loops)
        RateLimiter::for('pos-checkout', function (Request $request) {
            $key = $request->user()?->id ?? $request->ip();

            return Limit::perMinute(30)->by($key)->response(function () {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Terlalu banyak permintaan checkout. Silakan tunggu sebentar sebelum mencoba lagi.',
                ], 429);
            });
        });

        // 3. Login Brute Force Protection Rate Limiter
        RateLimiter::for('auth-login', function (Request $request) {
            $email = (string) $request->input('email');

            return Limit::perMinute(5)->by($request->ip().'|'.$email)->response(function () {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Terlalu banyak percobaan login gagal. Akun Anda ditangguhkan sementara selama 1 menit.',
                ], 429);
            });
        });
    }
}
