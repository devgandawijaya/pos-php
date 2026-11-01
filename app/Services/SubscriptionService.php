<?php

namespace App\Services;

use App\Models\Register;
use App\Models\Store;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use DomainException;
use Illuminate\Support\Facades\DB;

class SubscriptionService
{
    /**
     * Get the active or trial subscription for a tenant.
     */
    public function getActiveSubscription(Tenant $tenant): ?Subscription
    {
        return Subscription::where('tenant_id', $tenant->id)
            ->whereIn('status', ['active', 'trial'])
            ->where(function ($q) {
                $q->whereNull('ends_at')
                    ->orWhere('ends_at', '>', now());
            })
            ->with('plan')
            ->orderByDesc('created_at')
            ->first();
    }

    /**
     * Get real-time usage statistics against subscription plan quotas.
     *
     * @return array{
     *     subscription: ?Subscription,
     *     plan: ?SubscriptionPlan,
     *     stores: array{current: int, max: int, remaining: int, percentage: float},
     *     registers: array{current: int, max: int, remaining: int, percentage: float},
     *     warehouses: array{current: int, max: int, remaining: int, percentage: float},
     *     users: array{current: int, max: int, remaining: int, percentage: float}
     * }
     */
    public function getSubscriptionUsage(Tenant $tenant): array
    {
        $subscription = $this->getActiveSubscription($tenant);
        $plan = $subscription?->plan;

        // Fallback default quotas if no active plan
        $maxStores = $plan?->max_stores ?? 1;
        $maxRegisters = $plan?->max_registers ?? 1;
        $maxWarehouses = $plan?->max_warehouses ?? 1;
        $maxUsers = $plan?->max_users ?? 3;

        $currentStores = Store::where('tenant_id', $tenant->id)->count();
        $currentRegisters = Register::where('tenant_id', $tenant->id)->count();
        $currentWarehouses = Warehouse::where('tenant_id', $tenant->id)->count();
        $currentUsers = User::where('tenant_id', $tenant->id)->count();

        return [
            'subscription' => $subscription,
            'plan' => $plan,
            'stores' => [
                'current' => $currentStores,
                'max' => $maxStores,
                'remaining' => max(0, $maxStores - $currentStores),
                'percentage' => $maxStores > 0 ? min(100, round(($currentStores / $maxStores) * 100, 1)) : 100,
            ],
            'registers' => [
                'current' => $currentRegisters,
                'max' => $maxRegisters,
                'remaining' => max(0, $maxRegisters - $currentRegisters),
                'percentage' => $maxRegisters > 0 ? min(100, round(($currentRegisters / $maxRegisters) * 100, 1)) : 100,
            ],
            'warehouses' => [
                'current' => $currentWarehouses,
                'max' => $maxWarehouses,
                'remaining' => max(0, $maxWarehouses - $currentWarehouses),
                'percentage' => $maxWarehouses > 0 ? min(100, round(($currentWarehouses / $maxWarehouses) * 100, 1)) : 100,
            ],
            'users' => [
                'current' => $currentUsers,
                'max' => $maxUsers,
                'remaining' => max(0, $maxUsers - $currentUsers),
                'percentage' => $maxUsers > 0 ? min(100, round(($currentUsers / $maxUsers) * 100, 1)) : 100,
            ],
        ];
    }

    /**
     * Assert that tenant is allowed to add a new Store under their current plan.
     *
     * @throws DomainException
     */
    public function assertCanCreateStore(Tenant $tenant): void
    {
        $usage = $this->getSubscriptionUsage($tenant);
        if ($usage['stores']['current'] >= $usage['stores']['max']) {
            $planName = $usage['plan']?->name ?? 'Dasar';
            throw new DomainException(
                "Batas kuota toko ({$usage['stores']['max']} toko) untuk paket {$planName} telah tercapai. Silakan upgrade paket langganan Anda untuk menambah cabang baru."
            );
        }
    }

    /**
     * Assert that tenant is allowed to add a new POS Register.
     *
     * @throws DomainException
     */
    public function assertCanCreateRegister(Tenant $tenant): void
    {
        $usage = $this->getSubscriptionUsage($tenant);
        if ($usage['registers']['current'] >= $usage['registers']['max']) {
            $planName = $usage['plan']?->name ?? 'Dasar';
            throw new DomainException(
                "Batas kuota register kasir ({$usage['registers']['max']} unit) untuk paket {$planName} telah tercapai. Silakan upgrade paket langganan Anda."
            );
        }
    }

    /**
     * Assert that tenant is allowed to add a new Staff / User.
     *
     * @throws DomainException
     */
    public function assertCanCreateUser(Tenant $tenant): void
    {
        $usage = $this->getSubscriptionUsage($tenant);
        if ($usage['users']['current'] >= $usage['users']['max']) {
            $planName = $usage['plan']?->name ?? 'Dasar';
            throw new DomainException(
                "Batas kuota pengguna/karyawan ({$usage['users']['max']} staf) untuk paket {$planName} telah tercapai. Silakan upgrade paket langganan Anda."
            );
        }
    }

    /**
     * Assert that tenant is allowed to add a new Warehouse.
     *
     * @throws DomainException
     */
    public function assertCanCreateWarehouse(Tenant $tenant): void
    {
        $usage = $this->getSubscriptionUsage($tenant);
        if ($usage['warehouses']['current'] >= $usage['warehouses']['max']) {
            $planName = $usage['plan']?->name ?? 'Dasar';
            throw new DomainException(
                "Batas kuota gudang ({$usage['warehouses']['max']} gudang) untuk paket {$planName} telah tercapai. Silakan upgrade paket langganan Anda."
            );
        }
    }

    /**
     * Upgrade or change a tenant's subscription plan.
     */
    public function upgradeOrChangePlan(Tenant $tenant, SubscriptionPlan $newPlan, string $billingInterval = 'monthly'): Subscription
    {
        return DB::transaction(function () use ($tenant, $newPlan, $billingInterval) {
            // Cancel or supersede any existing active subscriptions
            Subscription::where('tenant_id', $tenant->id)
                ->whereIn('status', ['active', 'trial'])
                ->update(['status' => 'cancelled']);

            $startsAt = now();
            $endsAt = $billingInterval === 'annual'
                ? $startsAt->copy()->addYear()
                : $startsAt->copy()->addMonth();

            $subscription = Subscription::create([
                'tenant_id' => $tenant->id,
                'plan_id' => $newPlan->id,
                'status' => 'active',
                'billing_interval' => $billingInterval,
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'auto_renew' => true,
            ]);

            // Ensure tenant status is active
            $tenant->update(['status' => 'active']);

            return $subscription->load('plan');
        });
    }

    /**
     * Update subscription status (e.g. suspend or reactivate).
     */
    public function updateSubscriptionStatus(Subscription $subscription, string $status): Subscription
    {
        $subscription->update(['status' => $status]);

        // If suspended or cancelled, update tenant status as well
        if (in_array($status, ['suspended', 'cancelled', 'expired'])) {
            $subscription->tenant->update(['status' => $status]);
        } elseif ($status === 'active') {
            $subscription->tenant->update(['status' => 'active']);
        }

        return $subscription;
    }
}
