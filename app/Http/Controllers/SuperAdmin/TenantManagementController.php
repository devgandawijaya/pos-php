<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use App\Services\SubscriptionService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TenantManagementController extends Controller
{
    public function __construct(
        protected SubscriptionService $subscriptionService
    ) {}

    /**
     * Authorize that the current authenticated user is a Platform Super Admin.
     */
    protected function authorizeSuperAdmin(Request $request): void
    {
        $user = $request->user();
        if (! $user || ! $user->isSuperAdmin()) {
            abort(403, 'Akses ditolak. Fitur ini hanya untuk Super Administrator platform.');
        }
    }

    /**
     * Display all platform tenants with subscription statuses and usage stats.
     */
    public function index(Request $request): Response
    {
        $this->authorizeSuperAdmin($request);

        $query = Tenant::with([
            'latestSubscription.plan',
        ])->withCount(['stores', 'users', 'registers', 'warehouses']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('slug', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%");
            });
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $tenants = $query->orderByDesc('created_at')->paginate(15)->withQueryString();

        // Platform KPIs
        $totalTenants = Tenant::count();
        $activeTenants = Tenant::where('status', 'active')->count();
        $suspendedTenants = Tenant::where('status', 'suspended')->count();

        // Estimate MRR (Monthly Recurring Revenue)
        $mrrEstimate = (float) Tenant::where('status', 'active')
            ->whereHas('latestSubscription', fn ($sq) => $sq->whereIn('status', ['active', 'trial']))
            ->with('latestSubscription.plan')
            ->get()
            ->sum(function ($t) {
                return (float) ($t->latestSubscription?->plan?->price_monthly ?? 0);
            });

        $plans = SubscriptionPlan::where('is_active', true)->orderBy('price_monthly')->get();

        return Inertia::render('Admin/Tenants/Index', [
            'tenants' => $tenants,
            'plans' => $plans,
            'filters' => [
                'search' => $request->query('search', ''),
                'status' => $request->query('status', ''),
            ],
            'kpis' => [
                'total_tenants' => $totalTenants,
                'active_tenants' => $activeTenants,
                'suspended_tenants' => $suspendedTenants,
                'mrr_estimate' => $mrrEstimate,
            ],
        ]);
    }

    /**
     * Change or assign subscription plan for a specific tenant.
     */
    public function updatePlan(Request $request, Tenant $tenant)
    {
        $this->authorizeSuperAdmin($request);

        $validated = $request->validate([
            'plan_id' => ['required', 'uuid', 'exists:subscription_plans,id'],
            'billing_interval' => ['required', 'string', 'in:monthly,annual'],
        ]);

        $plan = SubscriptionPlan::findOrFail($validated['plan_id']);

        $subscription = $this->subscriptionService->upgradeOrChangePlan(
            tenant: $tenant,
            newPlan: $plan,
            billingInterval: $validated['billing_interval']
        );

        if ($request->wantsJson()) {
            return response()->json([
                'status' => 'success',
                'message' => "Paket tenant {$tenant->name} berhasil diubah ke {$plan->name}.",
                'subscription' => $subscription,
            ]);
        }

        return redirect()->back()->with('success', "Paket tenant {$tenant->name} berhasil diubah ke {$plan->name}.");
    }

    /**
     * Update tenant operating status (active, suspended, cancelled).
     */
    public function updateStatus(Request $request, Tenant $tenant)
    {
        $this->authorizeSuperAdmin($request);

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:active,suspended,cancelled'],
        ]);

        $tenant->update(['status' => $validated['status']]);

        // Synchronize active subscription status
        $activeSub = $this->subscriptionService->getActiveSubscription($tenant);
        if ($activeSub) {
            $this->subscriptionService->updateSubscriptionStatus($activeSub, $validated['status']);
        }

        if ($request->wantsJson()) {
            return response()->json([
                'status' => 'success',
                'message' => "Status tenant {$tenant->name} berhasil diubah menjadi {$validated['status']}.",
            ]);
        }

        return redirect()->back()->with('success', "Status tenant {$tenant->name} berhasil diubah menjadi {$validated['status']}.");
    }

    /**
     * Switch active tenant context for Super Admin.
     */
    public function switchTenant(Request $request)
    {
        $this->authorizeSuperAdmin($request);

        $validated = $request->validate([
            'tenant_id' => ['required', 'uuid', 'exists:tenants,id'],
        ]);

        $tenant = Tenant::findOrFail($validated['tenant_id']);
        $request->session()->put('active_tenant_id', $tenant->id);
        $request->session()->forget('active_store_id');

        $firstStore = $tenant->stores()->where('is_active', true)->first();
        if ($firstStore) {
            $request->session()->put('active_store_id', $firstStore->id);
        }

        return redirect()->back()->with('success', "Beralih ke konteks tenant: {$tenant->name}.");
    }
}
