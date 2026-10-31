<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Customer;
use App\Models\CustomerGroup;
use App\Models\Permission;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Register;
use App\Models\Role;
use App\Models\Store;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\UnitConversion;
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

            // Products & Catalog
            ['name' => 'product.view', 'label' => 'Lihat Produk & Katalog', 'module' => 'product'],
            ['name' => 'product.create_update', 'label' => 'Tambah / Ubah Produk', 'module' => 'product'],
            ['name' => 'product.pricing.update', 'label' => 'Ubah Harga Produk', 'module' => 'product'],

            // Customers & Suppliers
            ['name' => 'customer.view', 'label' => 'Lihat Data Pelanggan', 'module' => 'crm'],
            ['name' => 'customer.manage', 'label' => 'Kelola Pelanggan & Loyalty', 'module' => 'crm'],
            ['name' => 'supplier.view', 'label' => 'Lihat Data Supplier', 'module' => 'supplier'],
            ['name' => 'supplier.manage', 'label' => 'Kelola Supplier', 'module' => 'supplier'],

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
                'product.view', 'customer.view', 'customer.manage', 'supplier.view',
                'inventory.view', 'inventory.transfer', 'inventory.stock_opname',
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
                'pos.discount.apply', 'shift.open', 'shift.close', 'shift.cash_movement', 'product.view', 'customer.view'
            ])->pluck('id')
        );

        // 3. Seed Platform Super Admin User
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

        // 4. Seed SaaS Subscription Plans
        $planStarter = SubscriptionPlan::firstOrCreate(
            ['slug' => 'starter'],
            [
                'name' => 'Starter Retail',
                'description' => 'Cocok untuk toko ritel tunggal atau usaha baru berkembang.',
                'price_monthly' => 199000,
                'price_annual' => 1990000,
                'max_stores' => 1,
                'max_registers' => 2,
                'max_warehouses' => 1,
                'max_users' => 3,
                'features' => ['pos', 'inventory', 'basic_reports'],
                'is_active' => true,
            ]
        );

        $planPro = SubscriptionPlan::firstOrCreate(
            ['slug' => 'professional'],
            [
                'name' => 'Professional Multi-Store',
                'description' => 'Solusi lengkap untuk bisnis multi-cabang dengan transfer gudang.',
                'price_monthly' => 499000,
                'price_annual' => 4990000,
                'max_stores' => 5,
                'max_registers' => 10,
                'max_warehouses' => 5,
                'max_users' => 15,
                'features' => ['pos', 'multi_store', 'multi_warehouse', 'advanced_reports', 'crm', 'promotions'],
                'is_active' => true,
            ]
        );

        $planEnterprise = SubscriptionPlan::firstOrCreate(
            ['slug' => 'enterprise'],
            [
                'name' => 'Enterprise Unlimited',
                'description' => 'Skala tak terbatas untuk jaringan ritel besar dan waralaba.',
                'price_monthly' => 1499000,
                'price_annual' => 14990000,
                'max_stores' => 999,
                'max_registers' => 999,
                'max_warehouses' => 999,
                'max_users' => 999,
                'features' => ['all_features', 'dedicated_db_ready', 'custom_integration', 'priority_support'],
                'is_active' => true,
            ]
        );

        // 5. Seed Tenant A ("PT Retail Jaya Abadi")
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

        // Assign Active Subscription to Tenant A
        Subscription::firstOrCreate(
            ['tenant_id' => $tenantA->id],
            [
                'plan_id' => $planPro->id,
                'status' => 'active',
                'billing_interval' => 'annual',
                'starts_at' => now(),
                'ends_at' => now()->addYear(),
                'auto_renew' => true,
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

        // Phase 2: Master Data for Tenant A
        // Categories
        $catBeverages = ProductCategory::firstOrCreate(
            ['tenant_id' => $tenantA->id, 'slug' => 'minuman'],
            ['name' => 'Minuman & Kopi', 'description' => 'Kategori kopi, teh, dan minuman segar', 'is_active' => true]
        );
        $catFood = ProductCategory::firstOrCreate(
            ['tenant_id' => $tenantA->id, 'slug' => 'makanan-snack'],
            ['name' => 'Makanan & Snack', 'description' => 'Camilan, mie instan, dan makanan ringan', 'is_active' => true]
        );
        $catGroceries = ProductCategory::firstOrCreate(
            ['tenant_id' => $tenantA->id, 'slug' => 'kebutuhan-harian'],
            ['name' => 'Kebutuhan Harian', 'description' => 'Susu, gula, minyak, dan kebutuhan pokok', 'is_active' => true]
        );

        // Brands
        $brandNestle = Brand::firstOrCreate(
            ['tenant_id' => $tenantA->id, 'slug' => 'nestle'],
            ['name' => 'Nestlé', 'description' => 'Produk Nestlé Indonesia', 'is_active' => true]
        );
        $brandIndofood = Brand::firstOrCreate(
            ['tenant_id' => $tenantA->id, 'slug' => 'indofood'],
            ['name' => 'Indofood', 'description' => 'Produk Indofood Makmur', 'is_active' => true]
        );
        $brandLocal = Brand::firstOrCreate(
            ['tenant_id' => $tenantA->id, 'slug' => 'nusantara-roastery'],
            ['name' => 'Nusantara Roastery', 'description' => 'Kopi Artisan Lokal', 'is_active' => true]
        );

        // Units
        $unitPcs = Unit::firstOrCreate(
            ['tenant_id' => $tenantA->id, 'code' => 'PCS'],
            ['name' => 'Pcs (Satuan)', 'is_active' => true]
        );
        $unitBox = Unit::firstOrCreate(
            ['tenant_id' => $tenantA->id, 'code' => 'BOX'],
            ['name' => 'Box (Karton)', 'is_active' => true]
        );
        $unitPack = Unit::firstOrCreate(
            ['tenant_id' => $tenantA->id, 'code' => 'PACK'],
            ['name' => 'Pack', 'is_active' => true]
        );

        // Unit Conversion: 1 BOX = 24 PCS
        UnitConversion::firstOrCreate(
            ['tenant_id' => $tenantA->id, 'from_unit_id' => $unitBox->id, 'to_unit_id' => $unitPcs->id],
            ['multiplier' => 24.0000]
        );

        // Products
        $productsA = [
            [
                'sku' => 'KOPI-GAYO-250',
                'barcode' => '899123456001',
                'name' => 'Kopi Arabika Gayo Aceh 250g',
                'category_id' => $catBeverages->id,
                'brand_id' => $brandLocal->id,
                'unit_id' => $unitPcs->id,
                'purchase_cost' => 38000,
                'selling_price' => 68000,
                'min_stock' => 10,
                'max_stock' => 100,
            ],
            [
                'sku' => 'TEH-MELATI-25',
                'barcode' => '899123456002',
                'name' => 'Teh Celup Melati Wangi Isi 25',
                'category_id' => $catBeverages->id,
                'brand_id' => $brandNestle->id,
                'unit_id' => $unitBox->id,
                'purchase_cost' => 11500,
                'selling_price' => 22000,
                'min_stock' => 20,
                'max_stock' => 200,
            ],
            [
                'sku' => 'MIE-GORENG-SP',
                'barcode' => '899123456003',
                'name' => 'Indomie Goreng Spesial 85g',
                'category_id' => $catFood->id,
                'brand_id' => $brandIndofood->id,
                'unit_id' => $unitPcs->id,
                'purchase_cost' => 2800,
                'selling_price' => 4500,
                'min_stock' => 50,
                'max_stock' => 500,
            ],
            [
                'sku' => 'AIR-MINERAL-600',
                'barcode' => '899123456004',
                'name' => 'Air Mineral Pegunungan 600ml',
                'category_id' => $catBeverages->id,
                'brand_id' => $brandNestle->id,
                'unit_id' => $unitPcs->id,
                'purchase_cost' => 2500,
                'selling_price' => 5000,
                'min_stock' => 48,
                'max_stock' => 480,
            ],
            [
                'sku' => 'SUSU-UHT-1L',
                'barcode' => '899123456005',
                'name' => 'Susu UHT Full Cream 1 Liter',
                'category_id' => $catGroceries->id,
                'brand_id' => $brandNestle->id,
                'unit_id' => $unitPcs->id,
                'purchase_cost' => 17000,
                'selling_price' => 25000,
                'min_stock' => 12,
                'max_stock' => 120,
            ],
            [
                'sku' => 'KERIPIK-BALADO',
                'barcode' => '899123456006',
                'name' => 'Keripik Singkong Pedas Balado 150g',
                'category_id' => $catFood->id,
                'brand_id' => $brandIndofood->id,
                'unit_id' => $unitPack->id,
                'purchase_cost' => 8500,
                'selling_price' => 16000,
                'min_stock' => 15,
                'max_stock' => 150,
            ],
        ];

        foreach ($productsA as $item) {
            Product::firstOrCreate(
                ['tenant_id' => $tenantA->id, 'sku' => $item['sku']],
                array_merge($item, ['tenant_id' => $tenantA->id, 'track_inventory' => true, 'status' => 'active'])
            );
        }

        // Customer Groups & Customers for Tenant A
        $groupVip = CustomerGroup::firstOrCreate(
            ['tenant_id' => $tenantA->id, 'name' => 'VIP Member'],
            ['discount_percentage' => 5.00]
        );

        Customer::firstOrCreate(
            ['tenant_id' => $tenantA->id, 'code' => 'CUST-WALKIN'],
            [
                'name' => 'Pelanggan Umum (Walk-in)',
                'status' => 'active',
                'loyalty_points' => 0,
            ]
        );

        Customer::firstOrCreate(
            ['tenant_id' => $tenantA->id, 'code' => 'CUST-001'],
            [
                'name' => 'Andi Pratama',
                'phone' => '081234567890',
                'email' => 'andi@gmail.test',
                'address' => 'Jl. Kebon Sirih No. 45, Jakarta Pusat',
                'loyalty_points' => 350,
                'status' => 'active',
            ]
        );

        Customer::firstOrCreate(
            ['tenant_id' => $tenantA->id, 'code' => 'CUST-002'],
            [
                'customer_group_id' => $groupVip->id,
                'name' => 'Budi Santoso (VIP)',
                'phone' => '081234567891',
                'email' => 'budi.santoso@gmail.test',
                'address' => 'Menteng Square Tower B No. 12',
                'loyalty_points' => 1450,
                'credit_limit' => 5000000,
                'status' => 'active',
            ]
        );

        // Suppliers for Tenant A
        Supplier::firstOrCreate(
            ['tenant_id' => $tenantA->id, 'code' => 'SUP-INDOFOOD'],
            [
                'name' => 'PT Indofood Sukses Makmur Tbk',
                'contact_person' => 'Kevin Sanjaya',
                'phone' => '0218881234',
                'email' => 'orders@indofood.test',
                'address' => 'Sudirman Plaza, Jl. Jend Sudirman Kav 76-78',
                'payment_terms_days' => 30,
                'is_active' => true,
            ]
        );

        Supplier::firstOrCreate(
            ['tenant_id' => $tenantA->id, 'code' => 'SUP-NESTLE'],
            [
                'name' => 'PT Nestlé Indonesia',
                'contact_person' => 'Lisa Permata',
                'phone' => '0218885678',
                'email' => 'supply@nestle.test',
                'address' => 'Perkantoran Hijau Arkadia, TB Simatupang',
                'payment_terms_days' => 45,
                'is_active' => true,
            ]
        );

        // 6. Seed Tenant B ("CV Maju Bersama") for Tenant Isolation Proof
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

        Subscription::firstOrCreate(
            ['tenant_id' => $tenantB->id],
            [
                'plan_id' => $planStarter->id,
                'status' => 'active',
                'billing_interval' => 'monthly',
                'starts_at' => now(),
                'ends_at' => now()->addMonth(),
                'auto_renew' => true,
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

        // Tenant B distinct product (testing same SKU isolation capability)
        $unitB = Unit::firstOrCreate(
            ['tenant_id' => $tenantB->id, 'code' => 'PCS'],
            ['name' => 'Pcs', 'is_active' => true]
        );

        Product::firstOrCreate(
            ['tenant_id' => $tenantB->id, 'sku' => 'KOPI-GAYO-250'],
            [
                'name' => 'Kopi Gayo Khusus Tenant B',
                'unit_id' => $unitB->id,
                'purchase_cost' => 40000,
                'selling_price' => 75000,
                'track_inventory' => true,
                'status' => 'active',
            ]
        );
    }
}
