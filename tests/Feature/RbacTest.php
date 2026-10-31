<?php

namespace Tests\Feature;

use App\Models\Permission;
use App\Models\Role;
use App\Models\Store;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class RbacTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Register temporary test routes to verify middleware
        Route::get('/test/protected-permission', function () {
            return response()->json(['status' => 'granted']);
        })->middleware(['auth', 'permission:reports.sales.view']);

        Route::get('/test/protected-role', function () {
            return response()->json(['status' => 'granted']);
        })->middleware(['auth', 'role:owner,company-admin']);
    }

    public function test_user_can_be_assigned_role_and_inherits_permissions(): void
    {
        $tenant = Tenant::create(['name' => 'RBAC Tenant', 'slug' => 'rbac-tenant']);

        $perm = Permission::create([
            'name' => 'reports.sales.view',
            'label' => 'View Sales Reports',
            'module' => 'reports',
        ]);

        $role = Role::create([
            'tenant_id' => $tenant->id,
            'name' => 'Manager',
            'slug' => 'manager',
        ]);

        $role->givePermissionTo($perm);

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Jane Manager',
            'email' => 'jane@rbac.test',
            'password' => bcrypt('password'),
        ]);

        $user->assignRole($role);

        $this->assertTrue($user->hasRole('manager'));
        $this->assertTrue($user->hasPermissionTo('reports.sales.view'));
        $this->assertFalse($user->hasPermissionTo('users.manage'));
    }

    public function test_permission_middleware_blocks_unauthorized_user(): void
    {
        $tenant = Tenant::create(['name' => 'RBAC Tenant', 'slug' => 'rbac-tenant']);

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Cashier Bob',
            'email' => 'bob@rbac.test',
            'password' => bcrypt('password'),
        ]);

        // User Bob has no permission for reports.sales.view
        $response = $this->actingAs($user)->get('/test/protected-permission');

        $response->assertStatus(403);
    }

    public function test_permission_middleware_allows_authorized_user(): void
    {
        $tenant = Tenant::create(['name' => 'RBAC Tenant', 'slug' => 'rbac-tenant']);

        $perm = Permission::create([
            'name' => 'reports.sales.view',
            'label' => 'View Sales Reports',
            'module' => 'reports',
        ]);

        $role = Role::create([
            'tenant_id' => $tenant->id,
            'name' => 'Auditor',
            'slug' => 'auditor',
        ]);
        $role->givePermissionTo($perm);

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Auditor Alice',
            'email' => 'alice@rbac.test',
            'password' => bcrypt('password'),
        ]);
        $user->assignRole($role);

        $response = $this->actingAs($user)->get('/test/protected-permission');

        $response->assertStatus(200);
        $response->assertJson(['status' => 'granted']);
    }

    public function test_super_admin_bypasses_all_permission_checks(): void
    {
        $superAdmin = User::create([
            'tenant_id' => null,
            'name' => 'Global Admin',
            'email' => 'admin@pos.test',
            'password' => bcrypt('password'),
        ]);

        $roleSuper = Role::create([
            'tenant_id' => null,
            'name' => 'Super Admin',
            'slug' => 'super-admin',
            'is_system' => true,
        ]);

        $superAdmin->assignRole($roleSuper);

        $this->assertTrue($superAdmin->hasPermissionTo('any.arbitrary.permission'));

        $response = $this->actingAs($superAdmin)->get('/test/protected-permission');
        $response->assertStatus(200);
    }

    public function test_store_access_restriction(): void
    {
        $tenant = Tenant::create(['name' => 'Store Tenant', 'slug' => 'store-tenant']);

        $store1 = Store::create(['tenant_id' => $tenant->id, 'code' => 'ST1', 'name' => 'Store 1']);
        $store2 = Store::create(['tenant_id' => $tenant->id, 'code' => 'ST2', 'name' => 'Store 2']);

        $cashier = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Cashier One',
            'email' => 'cashier1@store.test',
            'password' => bcrypt('password'),
        ]);

        // Assign only Store 1
        $cashier->stores()->attach($store1->id, ['tenant_id' => $tenant->id, 'is_default' => true]);

        $this->assertTrue($cashier->canAccessStore($store1->id));
        $this->assertFalse($cashier->canAccessStore($store2->id));
    }
}
