<?php

namespace Tests\Feature;

use App\Models\Store;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_a_cannot_see_tenant_b_stores(): void
    {
        // 1. Create Tenant A & Store A
        $tenantA = Tenant::create([
            'name' => 'Tenant A Corp',
            'slug' => 'tenant-a',
        ]);
        $storeA = Store::create([
            'tenant_id' => $tenantA->id,
            'code' => 'STORE-A',
            'name' => 'Store A Central',
        ]);

        // 2. Create Tenant B & Store B
        $tenantB = Tenant::create([
            'name' => 'Tenant B Corp',
            'slug' => 'tenant-b',
        ]);
        $storeB = Store::create([
            'tenant_id' => $tenantB->id,
            'code' => 'STORE-B',
            'name' => 'Store B Central',
        ]);

        // 3. User of Tenant A queries stores
        $userA = User::create([
            'tenant_id' => $tenantA->id,
            'name' => 'Alice Tenant A',
            'email' => 'alice@tenant-a.test',
            'password' => bcrypt('password'),
        ]);

        $this->actingAs($userA);

        $visibleStores = Store::all();

        // Should only see Store A
        $this->assertCount(1, $visibleStores);
        $this->assertTrue($visibleStores->contains('id', $storeA->id));
        $this->assertFalse($visibleStores->contains('id', $storeB->id));

        // Attempting to find Store B directly by ID should return null due to global scope
        $attemptStoreB = Store::find($storeB->id);
        $this->assertNull($attemptStoreB);
    }

    public function test_model_automatically_assigns_current_tenant_id_on_creation(): void
    {
        $tenant = Tenant::create([
            'name' => 'Auto Tenant Corp',
            'slug' => 'auto-tenant',
        ]);

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Bob',
            'email' => 'bob@tenant.test',
            'password' => bcrypt('password'),
        ]);

        $this->actingAs($user);

        // Create store without explicitly providing tenant_id
        $store = Store::create([
            'code' => 'AUTO-01',
            'name' => 'Auto Store',
        ]);

        $this->assertEquals($tenant->id, $store->tenant_id);
    }

    public function test_super_admin_can_view_all_stores_across_tenants(): void
    {
        $tenantA = Tenant::create(['name' => 'Tenant A', 'slug' => 't-a']);
        $tenantB = Tenant::create(['name' => 'Tenant B', 'slug' => 't-b']);

        Store::create(['tenant_id' => $tenantA->id, 'code' => 'A1', 'name' => 'Store A1']);
        Store::create(['tenant_id' => $tenantB->id, 'code' => 'B1', 'name' => 'Store B1']);

        // Super Admin has null tenant_id
        $superAdmin = User::create([
            'tenant_id' => null,
            'name' => 'Super Admin',
            'email' => 'admin@pos.test',
            'password' => bcrypt('password'),
        ]);

        $this->actingAs($superAdmin);

        $allStores = Store::all();
        $this->assertCount(2, $allStores);
    }
}

