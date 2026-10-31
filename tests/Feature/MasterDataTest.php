<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Customer;
use App\Models\CustomerGroup;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MasterDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_product_creation_and_tenant_isolation_with_identical_sku(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant Retail A', 'slug' => 'tenant-a']);
        $tenantB = Tenant::create(['name' => 'Tenant Retail B', 'slug' => 'tenant-b']);

        $unitA = Unit::create(['tenant_id' => $tenantA->id, 'code' => 'PCS', 'name' => 'Pieces']);
        $unitB = Unit::create(['tenant_id' => $tenantB->id, 'code' => 'PCS', 'name' => 'Pieces']);

        $userA = User::create([
            'tenant_id' => $tenantA->id,
            'name' => 'Alice A',
            'email' => 'alice@retail-a.test',
            'password' => bcrypt('password'),
        ]);

        $userB = User::create([
            'tenant_id' => $tenantB->id,
            'name' => 'Bob B',
            'email' => 'bob@retail-b.test',
            'password' => bcrypt('password'),
        ]);

        // Tenant A creates product with SKU "SKU-SHARED"
        $this->actingAs($userA);
        $productA = Product::create([
            'unit_id' => $unitA->id,
            'sku' => 'SKU-SHARED',
            'name' => 'Kopi Tenant A',
            'selling_price' => 50000,
        ]);

        // Tenant B creates product with SAME SKU "SKU-SHARED"
        $this->actingAs($userB);
        $productB = Product::create([
            'unit_id' => $unitB->id,
            'sku' => 'SKU-SHARED',
            'name' => 'Kopi Tenant B',
            'selling_price' => 75000,
        ]);

        $this->assertEquals($tenantA->id, $productA->tenant_id);
        $this->assertEquals($tenantB->id, $productB->tenant_id);

        // Under user B context, querying products should only return Product B
        $userBProducts = Product::all();
        $this->assertCount(1, $userBProducts);
        $this->assertEquals('Kopi Tenant B', $userBProducts->first()->name);

        // Switch to user A
        $this->actingAs($userA);
        $userAProducts = Product::all();
        $this->assertCount(1, $userAProducts);
        $this->assertEquals('Kopi Tenant A', $userAProducts->first()->name);
    }

    public function test_customer_creation_with_group_and_loyalty(): void
    {
        $tenant = Tenant::create(['name' => 'CRM Tenant', 'slug' => 'crm-tenant']);
        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Cashier',
            'email' => 'cashier@crm.test',
            'password' => bcrypt('password'),
        ]);

        $this->actingAs($user);

        $group = CustomerGroup::create([
            'name' => 'Gold VIP',
            'discount_percentage' => 10.00,
        ]);

        $customer = Customer::create([
            'customer_group_id' => $group->id,
            'code' => 'CUST-GOLD-01',
            'name' => 'Dewi Lestari',
            'phone' => '081299998888',
            'loyalty_points' => 500,
        ]);

        $this->assertEquals($tenant->id, $customer->tenant_id);
        $this->assertEquals('Gold VIP', $customer->customerGroup->name);
        $this->assertEquals(500, $customer->loyalty_points);
    }

    public function test_supplier_creation_and_scoping(): void
    {
        $tenant = Tenant::create(['name' => 'Supplier Tenant', 'slug' => 'sup-tenant']);
        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Purchaser',
            'email' => 'purchaser@sup.test',
            'password' => bcrypt('password'),
        ]);

        $this->actingAs($user);

        $supplier = Supplier::create([
            'code' => 'SUP-AGRO-01',
            'name' => 'PT Agro Nusantara Sejahtera',
            'contact_person' => 'Bapak Hartono',
            'phone' => '0217654321',
            'payment_terms_days' => 45,
        ]);

        $this->assertEquals($tenant->id, $supplier->tenant_id);
        $this->assertEquals(45, $supplier->payment_terms_days);
        $this->assertTrue((bool) $supplier->refresh()->is_active);
    }

    public function test_subscription_plan_and_active_status(): void
    {
        $tenant = Tenant::create(['name' => 'SaaS Tenant', 'slug' => 'saas-tenant']);

        $plan = SubscriptionPlan::create([
            'name' => 'Pro Plan',
            'slug' => 'pro-plan',
            'price_monthly' => 499000,
            'max_stores' => 5,
            'max_registers' => 10,
        ]);

        $subscription = Subscription::create([
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'status' => 'active',
            'starts_at' => now(),
            'ends_at' => now()->addMonth(),
        ]);

        $this->assertTrue($subscription->isActive());
        $this->assertEquals(5, $tenant->latestSubscription->plan->max_stores);
    }

    public function test_product_api_listing_with_sanctum_token(): void
    {
        $tenant = Tenant::create(['name' => 'API Tenant', 'slug' => 'api-tenant']);
        $unit = Unit::create(['tenant_id' => $tenant->id, 'code' => 'PCS', 'name' => 'Pieces']);

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'API User',
            'email' => 'api@tenant.test',
            'password' => bcrypt('password'),
            'status' => 'active',
        ]);

        Product::create([
            'tenant_id' => $tenant->id,
            'unit_id' => $unit->id,
            'sku' => 'PRD-API-01',
            'name' => 'Product For API',
            'selling_price' => 15000,
        ]);

        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer ' . $token)
            ->getJson('/api/v1/products');

        $response->assertStatus(200);
        $response->assertJsonFragment(['sku' => 'PRD-API-01']);
    }
}
