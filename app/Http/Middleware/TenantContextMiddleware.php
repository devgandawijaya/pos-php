<?php

namespace App\Http\Middleware;

use App\Models\Store;
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

        if ($user) {
            $tenantId = $user->tenant_id;

            // If super-admin, dynamically resolve active tenant context so they can access all modules
            if ($user->isSuperAdmin()) {
                $sessionTenantId = $request->hasSession() ? $request->session()->get('active_tenant_id') : null;
                if ($sessionTenantId && Tenant::where('id', $sessionTenantId)->where('is_active', true)->exists()) {
                    $tenantId = $sessionTenantId;
                } else {
                    $firstTenant = Tenant::where('is_active', true)->first();
                    $tenantId = $firstTenant?->id;
                    if ($firstTenant && $request->hasSession()) {
                        $request->session()->put('active_tenant_id', $firstTenant->id);
                    }
                }

                if ($tenantId) {
                    $user->tenant_id = $tenantId;
                }
            }

            if ($tenantId) {
                $tenant = Tenant::find($tenantId);

                if (! $tenant || ! $tenant->is_active || $tenant->status === 'suspended') {
                    if (! $user->isSuperAdmin()) {
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
                }

                if ($tenant) {
                    $this->tenantManager->setTenant($tenant);
                }

                // Ensure active store is populated in session if session is available
                if ($request->hasSession() && ! $request->session()->has('active_store_id')) {
                    $defaultStore = $user->defaultStore() ?? Store::where('tenant_id', $tenantId)->first();
                    if ($defaultStore) {
                        $request->session()->put('active_store_id', $defaultStore->id);
                    }
                }
            }
        }

        return $next($request);
    }
}
