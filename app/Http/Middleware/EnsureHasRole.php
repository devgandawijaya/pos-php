<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureHasRole
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            abort(401, 'Unauthenticated.');
        }

        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        if ($user->hasRole($roles)) {
            return $next($request);
        }

        abort(403, 'Anda tidak memiliki role yang diizinkan untuk mengakses halaman ini.');
    }
}
