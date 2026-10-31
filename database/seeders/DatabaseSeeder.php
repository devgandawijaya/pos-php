<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Register;
use App\Models\Role;
use App\Models\Store;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Seed Granular Permissions
        $permissions = [
            // Platform
            ['name' => 'platform.tenants.manage', 'label' => 'Kelola Seluruh Tenant', 'module' => 'platform'],
            ['name' => 'platform.subscriptions.manage', 'label' => 'Kelola Paket & Langganan', 'module' => 'platform'],

            // Tenant
            ['name' => 'tenant.profile.update', 'label' => 'Update Profil Bisnis Tenant', 'module' => 'tenant'],
            ['name' => 'tenant.subscription.view', 'label' => 'Lihat Status Langganan', 'module' => 'tenant'],
            ['name' => 'tenant.subscription.change', 'label' => 'Ubah Paket Langganan', 'module' => 'tenant'],

            // Stores & Registers
            ['name' => 'store.view', 'label' => 'Lihat Toko', 'module' => 'store'],
            ['name' => 'store.manage', 'label' => 'Kelola Toko', 'module' => 'store'],
            ['name' => 'register.manage', 'label' => 'Kelola Register Kasir', 'module' => 'store'],

            // POS
            ['name' => 'pos.terminal.access', 'label' => 'Akses Mesin POS', 'module' => 'pos'],
            ['name' => 'pos.sale.create', 'label' => 'Buat Transaksi Kasir', 'module' => 'pos'],
            ['name' => 'pos.sale.hold_resume', 'label' => 'Hold / Resume Transaksi', 'module' => 'pos'],
            ['name' => 'pos.sale.void', 'label' => 'Batalkan Transaksi / Void', 'module' => 'pos'],
            ['name' => 'pos.sale.refund', 'label' => 'Proses Retur & Refund', 'module' => 'pos'],
            ['name' => 'pos.discount.apply', 'label' => 'Terapkan Diskon Transaksi', 'module' => 'pos'],
            ['name' => 'pos.discount.override', 'label' => 'Otorisasi Diskon Khusus', 'module' => 'pos'],

            // Shift
            ['name' => 'shift.open', 'label' => 'Buka Shift Kasir', 'module' => 'shift'],
            ['name' => 'shift.close', 'label' => 'Tutup Shift Kasir', 'module' => 'shift'],
            ['name' => 'shift.variance.approve', 'label' => 'Approval Selisih Kas Shift', 'module' => 'shift'],
            ['name' => 'shift.cash_movement', 'label' => 'Catat Kas Masuk / Keluar Shift', 'module' => 'shift'],

            // Products
            ['name' => 'product.view', 'label' => 'Lihat Produk & Katalog', 'module' => 'product'],
            ['name' => 'product.create_update', 'label' => 'Tambah / Ubah Produk', 'module' => 'product'],
            ['name' => 'product.pricing.update', 'label' => 'Ubah Harga Produk', 'module' => 'product'],

            // Inventory
            ['name' => 'inventory.view', 'label' => 'Lihat Stok Inventaris', 'module' => 'inventory'],
            ['name' => 'inventory.adjust', 'label' => 'Penyesuaian Stok', 'module' => 'inventory'],
            ['name' => 'inventory.transfer', 'label' => 'Transfer Stok Antar Gudang', 'module' => 'inventory'],
            ['name' => 'inventory.stock_opname', 'label' => 'Stock Opname', 'module' => 'inventory'],
            ['name' => 'purchase.order.manage', 'label' => 'Kelola Purchase Order', 'module' => 'inventory'],

            // Reports & Audit
            ['name' => 'reports.sales.view', 'label' => 'Lihat Laporan Penjualan', 'module' => 'reports'],
            ['name' => 'reports.finance.view', 'label' => 'Lihat Laporan Keuangan', 'module' => 'reports'],
            ['name' => 'audit_log.view', 'label' => 'Lihat Jejak Audit Log', 'module' => 'audit'],
            ['name' => 'users.manage', 'label' => 'Kelola Pengguna & Hak Akses', 'module' => 'users'],
        ];

        foreach ($permissions as $p) {
            Permission::firstOrCreate(['name' => $p['name']], $p);
        }

        // 2. Seed Default Global Roles
        $roleSuperAdmin = Role::firstOrCreate(
            ['slug' => 'super-admin', 'tenant_id' => null],
            ['name' => 'Platform Super Admin', 'description' => 'Akses penuh seluruh platform SaaS', 'is_system' => true]
        );
        $roleSuperAdmin->permissions()->sync(Permission::pluck('id'));

        $roleOwner = Role::firstOrCreate(
            ['slug' => 'owner', 'tenant_id' => null],
            ['name' => 'Tenant Owner', 'description' => 'Pemilik bisnis tenant, akses penuh organisasi tenant', 'is_system' => true]
        );
        $roleOwner->permissions()->sync(
            Permission::where('module', '!=', 'platform')->pluck('id')
        );

        $roleCompanyAdmin = Role::firstOrCreate(
            ['slug' => 'company-admin', 'tenant_id' => null],
            ['name' => 'Company Admin', 'description' => 'Administrator operasional multi-cabang', 'is_system' => true]
        );
        $roleCompanyAdmin->permissions()->sync(
            Permission::whereNotIn('name', ['tenant.profile.update', 'tenant.subscription.change'])
                ->where('module', '!=', 'platform')
                ->pluck('id')
        );

        $roleStoreManager = Role::firstOrCreate(
            ['slug' => 'store-manager', 'tenant_id' => null],
            ['name' => 'Store Manager', 'description' => 'Kepala toko operasional cabang', 'is_system' => true]
        );
        $roleStoreManager->permissions()->sync(
            Permission::whereIn('name', [
                'store.view', 'register.manage', 'pos.terminal.access', 'pos.sale.create', 'pos.sale.hold_resume',
                'pos.sale.void', 'pos.sale.refund', 'pos.discount.apply', 'pos.discount.override',
                'shift.open', 'shift.close', 'shift.variance.approve', 'shift.cash_movement',
                'product.view', 'inventory.view', 'inventory.transfer', 'inventory.stock_opname',
                'reports.sales.view'
            ])->pluck('id')
        );

        $roleCashier = Role::firstOrCreate(
            ['slug' => 'cashier', 'tenant_id' => null],
            ['name' => 'Cashier / Kasir', 'description' => 'Operator kasir register POS', 'is_system' => true]
        );
        $roleCashier->permissions()->sync(
            Permission::whereIn('name', [
                'store.view', 'pos.terminal.access', 'pos.sale.create', 'pos.sale.hold_resume',
                'pos.discount.apply', 'shift.open', 'shift.close', 'shift.cash_movement', 'product.view'
            ])->pluck('id')
        );

        // 3. Seed Platform Super Admin
        $superAdminUser = User::firstOrCreate(
            ['email' => 'superadmin@pos.test'],
            [
                'name' => 'Super Administrator',
                'password' => Hash::make('password'),
                'status' => 'active',
                'phone' => '081200000001',
                'email_verified_at' => now(),
            ]
        );
        $superAdminUser->assignRole($roleSuperAdmin);

        // 4. Seed Tenant A ("PT Retail Jaya Abadi")
        $tenantA = Tenant::firstOrCreate(
            ['slug' => 'retail-jaya'],
            [
                'name' => 'PT Retail Jaya Abadi',
                'email' => 'contact@retailjaya.test',
                'phone' => '0215551234',
                'currency' => 'IDR',
                'timezone' => 'Asia/Jakarta',
                'status' => 'active',
                'is_active' => true,
            ]
        );

        $storeA1 = Store::firstOrCreate(
            ['tenant_id' => $tenantA->id, 'code' => 'STR-CENTRAL'],
            [
                'name' => 'Toko Retail Central Jakarta',
                'address' => 'Jl. MH Thamrin No. 10, Jakarta Pusat',
                'phone' => '0215551235',
                'email' => 'central@retailjaya.test',
                'timezone' => 'Asia/Jakarta',
                'tax_percentage' => 11.00,
                'is_active' => true,
            ]
        );

        $storeA2 = Store::firstOrCreate(
            ['tenant_id' => $tenantA->id, 'code' => 'STR-EAST'],
            [
                'name' => 'Toko Retail Cabang Timur',
                'address' => 'Jl. Pemuda No. 88, Rawamangun, Jakarta Timur',
                'phone' => '0215551236',
                'email' => 'east@retailjaya.test',
                'timezone' => 'Asia/Jakarta',
                'tax_percentage' => 11.00,
                'is_active' => true,
            ]
        );

        $whA1 = Warehouse::firstOrCreate(
            ['tenant_id' => $tenantA->id, 'code' => 'WH-CAKUNG'],
            [
                'store_id' => $storeA1->id,
                'name' => 'Gudang Distribusi Cakung',
                'address' => 'Kawasan Industri Cakung Blok B No. 4',
                'is_active' => true,
            ]
        );

        $regA1 = Register::firstOrCreate(
            ['store_id' => $storeA1->id, 'code' => 'POS-01'],
            [
                'tenant_id' => $tenantA->id,
                'name' => 'Mesin Kasir Utama 01',
                'printer_type' => 'thermal_80mm',
                'is_active' => true,
            ]
        );

        $regA2 = Register::firstOrCreate(
            ['store_id' => $storeA1->id, 'code' => 'POS-02'],
            [
                'tenant_id' => $tenantA->id,
                'name' => 'Mesin Kasir Cepat 02',
                'printer_type' => 'thermal_80mm',
                'is_active' => true,
            ]
        );

        // Users for Tenant A
        $ownerA = User::firstOrCreate(
            ['email' => 'owner@retailjaya.test'],
            [
                'tenant_id' => $tenantA->id,
                'name' => 'Bambang Retail (Owner)',
                'password' => Hash::make('password'),
                'status' => 'active',
                'phone' => '081299990001',
                'email_verified_at' => now(),
            ]
        );
        $ownerA->assignRole($roleOwner);
        $ownerA->stores()->syncWithoutDetaching([
            $storeA1->id => ['is_default' => true, 'tenant_id' => $tenantA->id],
            $storeA2->id => ['is_default' => false, 'tenant_id' => $tenantA->id],
        ]);

        $managerA = User::firstOrCreate(
            ['email' => 'manager@retailjaya.test'],
            [
                'tenant_id' => $tenantA->id,
                'name' => 'Hendro Manager',
                'password' => Hash::make('password'),
                'status' => 'active',
                'phone' => '081299990002',
                'email_verified_at' => now(),
            ]
        );
        $managerA->assignRole($roleStoreManager);
        $managerA->stores()->syncWithoutDetaching([
            $storeA1->id => ['is_default' => true, 'tenant_id' => $tenantA->id],
        ]);

        $cashierA = User::firstOrCreate(
            ['email' => 'cashier@retailjaya.test'],
            [
                'tenant_id' => $tenantA->id,
                'name' => 'Siti Kasir',
                'password' => Hash::make('password'),
                'status' => 'active',
                'phone' => '081299990003',
                'email_verified_at' => now(),
            ]
        );
        $cashierA->assignRole($roleCashier);
        $cashierA->stores()->syncWithoutDetaching([
            $storeA1->id => ['is_default' => true, 'tenant_id' => $tenantA->id],
        ]);

        // 5. Seed Tenant B ("CV Maju Bersama") for Tenant Isolation Proof
        $tenantB = Tenant::firstOrCreate(
            ['slug' => 'maju-bersama'],
            [
                'name' => 'CV Maju Bersama',
                'email' => 'admin@majubersama.test',
                'phone' => '0217778888',
                'currency' => 'IDR',
                'timezone' => 'Asia/Jakarta',
                'status' => 'active',
                'is_active' => true,
            ]
        );

        $storeB = Store::firstOrCreate(
            ['tenant_id' => $tenantB->id, 'code' => 'STR-MAJU-BARAT'],
            [
                'name' => 'Toko Maju Kebon Jeruk',
                'address' => 'Jl. Panjang No. 12, Kebon Jeruk, Jakarta Barat',
                'phone' => '0217778889',
                'email' => 'barat@majubersama.test',
                'timezone' => 'Asia/Jakarta',
                'tax_percentage' => 11.00,
                'is_active' => true,
            ]
        );

        $ownerB = User::firstOrCreate(
            ['email' => 'owner@majubersama.test'],
            [
                'tenant_id' => $tenantB->id,
                'name' => 'Rudi Maju (Owner B)',
                'password' => Hash::make('password'),
                'status' => 'active',
                'phone' => '081377770001',
                'email_verified_at' => now(),
            ]
        );
        $ownerB->assignRole($roleOwner);
        $ownerB->stores()->syncWithoutDetaching([
            $storeB->id => ['is_default' => true, 'tenant_id' => $tenantB->id],
        ]);
    }
}
