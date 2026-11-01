<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeadersMiddleware
{
    /**
     * Handle an incoming request and apply OWASP security headers.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Standard OWASP & Production Hardening Headers
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('X-XSS-Protection', '1; mode=block');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

        // Remove revealing server headers
        if (function_exists('header_remove')) {
            @header_remove('X-Powered-By');
        }

        return $response;
    }
}
