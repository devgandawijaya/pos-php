<?php

namespace App\Http\Middleware;

use App\Models\Store;
use App\Services\TenantManager;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $tenantManager = app(TenantManager::class);
        $tenant = $tenantManager->getTenant();

        $activeStoreId = $request->session()->get('active_store_id');
        $activeStore = null;

        if ($user && $user->tenant_id) {
            if ($activeStoreId) {
                $activeStore = Store::find($activeStoreId);
            }
            if (! $activeStore) {
                $activeStore = $user->defaultStore();
                if ($activeStore) {
                    $request->session()->put('active_store_id', $activeStore->id);
                }
            }
        }

        return [
            ...parent::share($request),
            'appName' => config('app.name', 'Enterprise SaaS POS'),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'roles' => $user->roles->pluck('slug')->toArray(),
                    'permissions' => $user->isSuperAdmin() ? ['*'] : $user->roles->flatMap->permissions->pluck('name')->unique()->values()->toArray(),
                    'isSuperAdmin' => $user->isSuperAdmin(),
                ] : null,
                'tenant' => $tenant ? [
                    'id' => $tenant->id,
                    'name' => $tenant->name,
                    'slug' => $tenant->slug,
                    'currency' => $tenant->currency,
                    'timezone' => $tenant->timezone,
                    'status' => $tenant->status,
                ] : null,
                'activeStore' => $activeStore ? [
                    'id' => $activeStore->id,
                    'code' => $activeStore->code,
                    'name' => $activeStore->name,
                    'taxPercentage' => $activeStore->tax_percentage,
                ] : null,
                'availableStores' => $user && $user->tenant_id ? (
                    $user->isTenantOwner() || $user->hasRole('company-admin')
                        ? Store::where('is_active', true)->select('id', 'code', 'name')->get()
                        : $user->stores()->where('is_active', true)->select('stores.id', 'stores.code', 'stores.name')->get()
                ) : [],
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'info' => fn () => $request->session()->get('info'),
            ],
        ];
    }
}

