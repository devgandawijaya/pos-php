<?php

namespace Tests\Feature;

use App\Models\Register;
use App\Models\Role;
use App\Models\Store;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use App\Models\User;
use App\Services\SubscriptionService;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SubscriptionAndBillingTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $tenantOwner;

    protected User $superAdmin;

    protected SubscriptionPlan $starterPlan;

    protected SubscriptionPlan $proPlan;

    protected SubscriptionPlan $enterprisePlan;

    protected SubscriptionService $subscriptionService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'PT Mitra Retail Mandiri',
            'slug' => 'mitra-retail',
            'status' => 'active',
        ]);

        $this->starterPlan = SubscriptionPlan::create([
            'name' => 'Starter',
            'slug' => 'starter',
            'description' => 'Paket dasar untuk 1 toko',
            'price_monthly' => 150000,
            'price_annual' => 1500000,
            'max_stores' => 1,
            'max_registers' => 1,
            'max_warehouses' => 1,
            'max_users' => 2,
            'features' => ['POS Standar', 'Laporan Dasar'],
            'is_active' => true,
        ]);

        $this->proPlan = SubscriptionPlan::create([
            'name' => 'Pro Business',
            'slug' => 'pro-business',
            'description' => 'Paket bisnis untuk hingga 5 cabang',
            'price_monthly' => 450000,
            'price_annual' => 4500000,
            'max_stores' => 5,
            'max_registers' => 10,
            'max_warehouses' => 3,
            'max_users' => 15,
            'features' => ['Multi-Store', 'Kupon & Promosi', 'Multi-Warehouse', 'API Access'],
            'is_active' => true,
        ]);

        $this->enterprisePlan = SubscriptionPlan::create([
            'name' => 'Enterprise Unlimited',
            'slug' => 'enterprise-unlimited',
            'description' => 'Solusi enterprise tanpa batasan cabang',
            'price_monthly' => 1200000,
            'price_annual' => 12000000,
            'max_stores' => 50,
            'max_registers' => 100,
            'max_warehouses' => 20,
            'max_users' => 100,
            'features' => ['Unlimited Scale', 'Dedicated Support', 'Custom Webhooks'],
            'is_active' => true,
        ]);

        // Assign Starter Plan as default active subscription
        Subscription::create([
            'tenant_id' => $this->tenant->id,
            'plan_id' => $this->starterPlan->id,
            'status' => 'active',
            'billing_interval' => 'monthly',
            'starts_at' => now(),
            'ends_at' => now()->addMonth(),
            'auto_renew' => true,
        ]);

        $ownerRole = Role::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Owner',
            'slug' => 'owner',
        ]);

        $this->tenantOwner = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Budi Pemilik',
            'email' => 'budi.owner@mitra.test',
            'password' => bcrypt('password'),
            'status' => 'active',
        ]);
        $this->tenantOwner->roles()->attach($ownerRole);

        // Platform Super Admin (Global scope bypass / super-admin role)
        $superAdminRole = Role::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Super Administrator',
            'slug' => 'super-admin',
        ]);

        $this->superAdmin = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Master Admin Platform',
            'email' => 'admin.platform@saaspos.test',
            'password' => bcrypt('password'),
            'status' => 'active',
        ]);
        $this->superAdmin->roles()->attach($superAdminRole);

        $this->subscriptionService = app(SubscriptionService::class);
    }

    public function test_tenant_can_view_subscription_status_and_quotas(): void
    {
        $this->actingAs($this->tenantOwner);

        $response = $this->get('/subscription');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Subscription/Index')
            ->has('usage')
            ->has('plans')
            ->where('current_plan_id', $this->starterPlan->id)
            ->where('usage.plan.name', 'Starter')
            ->where('usage.stores.max', 1)
            ->where('usage.registers.max', 1)
        );
    }

    public function test_quota_enforcement_prevents_creating_stores_exceeding_plan_limit(): void
    {
        // 1. Create first store (allowed, quota is 1)
        Store::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Toko Pertama',
            'code' => 'TK-01',
        ]);

        // 2. Next store creation check must throw DomainException
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Batas kuota toko (1 toko) untuk paket Starter telah tercapai');

        $this->subscriptionService->assertCanCreateStore($this->tenant);
    }

    public function test_quota_enforcement_prevents_creating_registers_exceeding_plan_limit(): void
    {
        $store = Store::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Toko Pertama',
            'code' => 'TK-01',
        ]);

        // 1. Create first register (allowed, quota is 1)
        Register::create([
            'tenant_id' => $this->tenant->id,
            'store_id' => $store->id,
            'name' => 'Register 1',
            'code' => 'REG-01',
        ]);

        // 2. Next register creation check must throw DomainException
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Batas kuota register kasir (1 unit) untuk paket Starter telah tercapai');

        $this->subscriptionService->assertCanCreateRegister($this->tenant);
    }

    public function test_quota_enforcement_prevents_creating_users_exceeding_plan_limit(): void
    {
        // Tenant already has 2 users created in setUp ($this->tenantOwner and $this->superAdmin)
        // Starter max_users is 2
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Batas kuota pengguna/karyawan (2 staf) untuk paket Starter telah tercapai');

        $this->subscriptionService->assertCanCreateUser($this->tenant);
    }

    public function test_tenant_can_upgrade_subscription_plan_and_increase_quotas(): void
    {
        $this->actingAs($this->tenantOwner);

        // Pre-upgrade: Cannot create second store
        Store::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Toko Pertama',
            'code' => 'TK-01',
        ]);

        $this->assertFalse(
            $this->subscriptionService->getSubscriptionUsage($this->tenant)['stores']['remaining'] > 0
        );

        // Post upgrade to Pro Plan (max_stores = 5)
        $response = $this->post('/subscription/upgrade', [
            'plan_id' => $this->proPlan->id,
            'billing_interval' => 'annual',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        // Verify active subscription updated
        $activeSub = $this->subscriptionService->getActiveSubscription($this->tenant);
        $this->assertEquals($this->proPlan->id, $activeSub->plan_id);
        $this->assertEquals('annual', $activeSub->billing_interval);
        $this->assertEquals('active', $activeSub->status);

        // Quotas should now expand to 5 stores
        $usage = $this->subscriptionService->getSubscriptionUsage($this->tenant);
        $this->assertEquals(5, $usage['stores']['max']);
        $this->assertEquals(4, $usage['stores']['remaining']);

        // assertCanCreateStore should now succeed without exception
        $this->subscriptionService->assertCanCreateStore($this->tenant);
    }

    public function test_super_admin_can_access_tenant_management_dashboard(): void
    {
        $this->actingAs($this->superAdmin);

        $response = $this->get('/admin/tenants');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Tenants/Index')
            ->has('tenants.data')
            ->has('plans')
            ->has('kpis.total_tenants')
            ->has('kpis.mrr_estimate')
        );
    }

    public function test_regular_tenant_user_cannot_access_super_admin_dashboard(): void
    {
        $this->actingAs($this->tenantOwner);

        $response = $this->get('/admin/tenants');

        $response->assertStatus(403);
    }

    public function test_super_admin_can_update_tenant_plan_and_status(): void
    {
        $this->actingAs($this->superAdmin);

        // 1. Assign Enterprise Plan to tenant
        $responsePlan = $this->post("/admin/tenants/{$this->tenant->id}/plan", [
            'plan_id' => $this->enterprisePlan->id,
            'billing_interval' => 'monthly',
        ]);

        $responsePlan->assertRedirect();
        $this->tenant->refresh();
        $activeSub = $this->subscriptionService->getActiveSubscription($this->tenant);
        $this->assertEquals($this->enterprisePlan->id, $activeSub->plan_id);

        // 2. Suspend tenant
        $responseStatus = $this->post("/admin/tenants/{$this->tenant->id}/status", [
            'status' => 'suspended',
        ]);

        $responseStatus->assertRedirect();
        $this->tenant->refresh();
        $this->assertEquals('suspended', $this->tenant->status);
    }

    public function test_rest_api_subscription_usage_and_upgrade(): void
    {
        $this->actingAs($this->tenantOwner, 'sanctum');

        // Test GET usage
        $responseUsage = $this->getJson('/api/v1/subscription/usage');
        $responseUsage->assertOk();
        $responseUsage->assertJsonStructure([
            'status',
            'data' => [
                'subscription',
                'plan',
                'stores' => ['current', 'max', 'remaining', 'percentage'],
                'registers' => ['current', 'max', 'remaining', 'percentage'],
                'users' => ['current', 'max', 'remaining', 'percentage'],
            ],
        ]);

        // Test GET plans
        $responsePlans = $this->getJson('/api/v1/subscription/plans');
        $responsePlans->assertOk();
        $responsePlans->assertJsonStructure([
            'status',
            'data' => [
                '*' => ['id', 'name', 'slug', 'price_monthly', 'max_stores'],
            ],
        ]);

        // Test POST upgrade
        $responseUpgrade = $this->postJson('/api/v1/subscription/upgrade', [
            'plan_id' => $this->proPlan->id,
            'billing_interval' => 'monthly',
        ]);

        $responseUpgrade->assertOk();
        $responseUpgrade->assertJson([
            'status' => 'success',
        ]);

        $activeSub = $this->subscriptionService->getActiveSubscription($this->tenant);
        $this->assertEquals($this->proPlan->id, $activeSub->plan_id);
    }
}
