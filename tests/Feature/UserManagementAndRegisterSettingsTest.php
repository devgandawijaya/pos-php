<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Register;
use App\Models\Role;
use App\Models\Store;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementAndRegisterSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Store $store;

    protected Register $register;

    protected User $owner;

    protected Role $roleOwner;

    protected Role $roleManager;

    protected Role $roleSupervisor;

    protected Role $roleInventoryStaff;

    protected Role $roleCashier;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'PT Retail Nusantara',
            'slug' => 'retail-nusantara',
            'status' => 'active',
            'is_active' => true,
        ]);

        $this->store = Store::create([
            'tenant_id' => $this->tenant->id,
            'code' => 'STR-01',
            'name' => 'Toko Cabang Utama',
            'tax_percentage' => 11.00,
            'is_active' => true,
        ]);

        $this->register = Register::create([
            'tenant_id' => $this->tenant->id,
            'store_id' => $this->store->id,
            'code' => 'POS-01',
            'name' => 'Mesin Kasir Utama',
            'printer_type' => 'thermal_80mm',
            'paper_size' => '80mm',
            'header_text' => 'Selamat Datang',
            'footer_text' => 'Terima kasih telah berbelanja!',
            'show_logo' => true,
            'show_cashier' => true,
            'show_customer' => true,
            'show_tax_details' => true,
            'show_barcode' => true,
            'auto_print' => false,
            'open_cash_drawer' => true,
            'auto_cut' => true,
            'connection_type' => 'browser',
            'is_active' => true,
        ]);

        $this->roleOwner = Role::create([
            'name' => 'Owner',
            'slug' => 'owner',
            'is_system' => true,
        ]);

        $this->roleManager = Role::create([
            'name' => 'Store Manager',
            'slug' => 'store-manager',
            'is_system' => true,
        ]);

        $this->roleSupervisor = Role::create([
            'name' => 'Supervisor Kasir & Toko',
            'slug' => 'supervisor',
            'is_system' => true,
        ]);

        $this->roleInventoryStaff = Role::create([
            'name' => 'Staf Gudang & Logistik',
            'slug' => 'inventory-staff',
            'is_system' => true,
        ]);

        $this->roleCashier = Role::create([
            'name' => 'Cashier / Kasir',
            'slug' => 'cashier',
            'is_system' => true,
        ]);

        $this->owner = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Bambang Owner',
            'email' => 'owner@nusantara.test',
            'password' => bcrypt('password'),
            'status' => 'active',
        ]);
        $this->owner->roles()->sync([$this->roleOwner->id]);
        $this->owner->stores()->sync([$this->store->id => ['tenant_id' => $this->tenant->id, 'is_default' => true]]);
    }

    public function test_user_management_screen_can_be_rendered(): void
    {
        $response = $this->actingAs($this->owner)->get('/users');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Users/Index')
            ->has('users.data')
            ->has('roles')
            ->has('stores')
        );
    }

    public function test_owner_can_create_new_cashier_user(): void
    {
        $response = $this->actingAs($this->owner)->post('/users', [
            'name' => 'Siti Kasir Baru',
            'email' => 'siti.kasir@nusantara.test',
            'phone' => '081234567890',
            'password' => 'secret123',
            'role_id' => $this->roleCashier->id,
            'store_ids' => [$this->store->id],
            'default_store_id' => $this->store->id,
            'status' => 'active',
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('users', [
            'tenant_id' => $this->tenant->id,
            'email' => 'siti.kasir@nusantara.test',
            'name' => 'Siti Kasir Baru',
            'status' => 'active',
        ]);

        $newUser = User::where('email', 'siti.kasir@nusantara.test')->first();
        $this->assertTrue($newUser->hasRole('cashier'));
        $this->assertEquals($this->store->id, $newUser->defaultStore()?->id);
    }

    public function test_owner_can_create_supervisor_and_inventory_staff(): void
    {
        // 1. Create Supervisor
        $this->actingAs($this->owner)->post('/users', [
            'name' => 'Budi Supervisor',
            'email' => 'budi.spv@nusantara.test',
            'password' => 'secret123',
            'role_id' => $this->roleSupervisor->id,
            'store_ids' => [$this->store->id],
            'status' => 'active',
        ]);

        $spvUser = User::where('email', 'budi.spv@nusantara.test')->first();
        $this->assertNotNull($spvUser);
        $this->assertTrue($spvUser->hasRole('supervisor'));

        // 2. Create Inventory Staff
        $this->actingAs($this->owner)->post('/users', [
            'name' => 'Agus Staf Gudang',
            'email' => 'agus.gudang@nusantara.test',
            'password' => 'secret123',
            'role_id' => $this->roleInventoryStaff->id,
            'store_ids' => [$this->store->id],
            'status' => 'active',
        ]);

        $gudangUser = User::where('email', 'agus.gudang@nusantara.test')->first();
        $this->assertNotNull($gudangUser);
        $this->assertTrue($gudangUser->hasRole('inventory-staff'));
    }

    public function test_user_can_be_updated_with_role_and_store_assignment(): void
    {
        $cashier = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Dina Kasir',
            'email' => 'dina@nusantara.test',
            'password' => bcrypt('password'),
            'status' => 'active',
        ]);
        $cashier->roles()->sync([$this->roleCashier->id]);

        $response = $this->actingAs($this->owner)->put("/users/{$cashier->id}", [
            'name' => 'Dina Promoted to Supervisor',
            'email' => 'dina@nusantara.test',
            'role_id' => $this->roleSupervisor->id,
            'store_ids' => [$this->store->id],
            'default_store_id' => $this->store->id,
            'status' => 'active',
        ]);

        $response->assertRedirect();
        $cashier->refresh();
        $this->assertEquals('Dina Promoted to Supervisor', $cashier->name);
        $this->assertTrue($cashier->hasRole('supervisor'));
    }

    public function test_user_cannot_deactivate_or_delete_oneself(): void
    {
        // Attempt self-deactivation
        $responseDeactivate = $this->actingAs($this->owner)->put("/users/{$this->owner->id}", [
            'name' => $this->owner->name,
            'email' => $this->owner->email,
            'role_id' => $this->roleOwner->id,
            'status' => 'inactive',
        ]);
        $responseDeactivate->assertSessionHasErrors('error');
        $this->assertEquals('active', $this->owner->fresh()->status);

        // Attempt self-deletion
        $responseDelete = $this->actingAs($this->owner)->delete("/users/{$this->owner->id}");
        $responseDelete->assertSessionHasErrors('error');
        $this->assertNull($this->owner->fresh()->deleted_at);
    }

    public function test_user_can_be_soft_deleted(): void
    {
        $cashier = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Kasir Hapus',
            'email' => 'hapus@nusantara.test',
            'password' => bcrypt('password'),
            'status' => 'active',
        ]);

        $response = $this->actingAs($this->owner)->delete("/users/{$cashier->id}");
        $response->assertRedirect();
        $this->assertSoftDeleted('users', ['id' => $cashier->id]);
    }

    public function test_tenant_isolation_in_user_management(): void
    {
        $otherTenant = Tenant::create(['name' => 'Other Tenant', 'slug' => 'other-tenant', 'status' => 'active']);
        $otherUser = User::create([
            'tenant_id' => $otherTenant->id,
            'name' => 'Other User',
            'email' => 'other@other.test',
            'password' => bcrypt('password'),
            'status' => 'active',
        ]);

        // Attempt update user of different tenant
        $response = $this->actingAs($this->owner)->put("/users/{$otherUser->id}", [
            'name' => 'Hacked Name',
            'email' => 'other@other.test',
            'role_id' => $this->roleCashier->id,
            'status' => 'active',
        ]);
        $response->assertStatus(403);

        // Attempt delete user of different tenant
        $responseDel = $this->actingAs($this->owner)->delete("/users/{$otherUser->id}");
        $responseDel->assertStatus(403);
    }

    public function test_register_settings_screen_can_be_rendered(): void
    {
        $response = $this->actingAs($this->owner)->get('/settings/registers');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Settings/PosRegister')
            ->has('stores')
            ->has('selectedStore')
            ->has('registers')
        );
    }

    public function test_register_settings_can_be_updated(): void
    {
        $response = $this->actingAs($this->owner)->put("/settings/registers/{$this->register->id}", [
            'name' => 'Register Kasir 58mm Portable',
            'printer_type' => 'thermal_58mm',
            'paper_size' => '58mm',
            'header_text' => 'Toko Retail Cabang Timur - NPWP: 01.999.888.7-000',
            'footer_text' => 'Kebijakan Retur: Maksimal 3 hari kerja dengan struk.',
            'show_logo' => true,
            'show_cashier' => true,
            'show_customer' => false,
            'show_tax_details' => true,
            'show_barcode' => true,
            'auto_print' => true,
            'open_cash_drawer' => true,
            'auto_cut' => true,
            'connection_type' => 'network',
            'printer_ip' => '192.168.1.188',
            'printer_port' => 9100,
            'is_active' => true,
        ]);

        $response->assertRedirect();
        $this->register->refresh();

        $this->assertEquals('58mm', $this->register->paper_size);
        $this->assertEquals('Register Kasir 58mm Portable', $this->register->name);
        $this->assertTrue($this->register->auto_print);
        $this->assertFalse($this->register->show_customer);
        $this->assertEquals('192.168.1.188', $this->register->printer_ip);
    }

    public function test_receipt_endpoint_returns_register_settings(): void
    {
        $order = Order::create([
            'tenant_id' => $this->tenant->id,
            'store_id' => $this->store->id,
            'order_number' => 'ORD-TEST-001',
            'status' => 'completed',
            'payment_status' => 'paid',
            'subtotal' => 50000,
            'tax_amount' => 5500,
            'total_amount' => 55500,
            'paid_amount' => 60000,
            'change_amount' => 4500,
            'completed_at' => now(),
        ]);

        $response = $this->actingAs($this->owner)->getJson("/pos/receipt/{$order->id}");

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'success',
            'order' => [
                'id' => $order->id,
                'order_number' => 'ORD-TEST-001',
            ],
            'register' => [
                'id' => $this->register->id,
                'paper_size' => '80mm',
            ],
        ]);
    }
}
