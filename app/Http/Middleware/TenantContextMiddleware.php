<?php

namespace App\Http\Middleware;

use App\Models\Tenant;
use App\Services\TenantManager;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TenantContextMiddleware
{
    public function __construct(
        protected TenantManager $tenantManager
    ) {}

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->tenant_id) {
            $tenant = Tenant::find($user->tenant_id);

            if (! $tenant || ! $tenant->is_active || $tenant->status === 'suspended') {
                if ($request->expectsJson()) {
                    return response()->json([
                        'message' => 'Tenant account is inactive or suspended. Please contact support.',
                    ], 403);
                }

                auth()->logout();
                return redirect()->route('login')->withErrors([
                    'email' => 'Akun tenant Anda sedang dinonaktifkan atau ditangguhkan.',
                ]);
            }

            $this->tenantManager->setTenant($tenant);

            // Ensure active store is populated in session if session is available
            if ($request->hasSession() && ! $request->session()->has('active_store_id') && $defaultStore = $user->defaultStore()) {
                $request->session()->put('active_store_id', $defaultStore->id);
            }
        }

        return $next($request);
    }
}
