<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Customer;
use App\Models\CustomerGroup;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderPayment;
use App\Models\OrderRefund;
use App\Models\OrderRefundItem;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Promotion;
use App\Models\Register;
use App\Models\SalesCommission;
use App\Models\Shift;
use App\Models\ShiftCashMovement;
use App\Models\StockBalance;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class LargeScaleDummyDataSeeder extends Seeder
{
    /**
     * Run the comprehensive large-scale dummy database seeds (>100 records per entity).
     */
    public function run(): void
    {
        // 1. Get Primary Tenant (Tenant A)
        $tenant = Tenant::where('slug', 'retail-jaya')->first() ?? Tenant::first();
        if (! $tenant) {
            $tenant = Tenant::create([
                'name' => 'PT Retail Jaya Abadi',
                'slug' => 'retail-jaya',
                'email' => 'contact@retailjaya.test',
                'phone' => '0215551234',
                'currency' => 'IDR',
                'timezone' => 'Asia/Jakarta',
                'status' => 'active',
                'is_active' => true,
            ]);
        }
        $tenantId = $tenant->id;

        // Stores & Warehouses
        $store = Store::where('tenant_id', $tenantId)->first();
        if (! $store) {
            $store = Store::create([
                'tenant_id' => $tenantId,
                'name' => 'Toko Retail Central Jakarta',
                'code' => 'STR-CENTRAL',
                'tax_percentage' => 11.00,
                'is_active' => true,
            ]);
        }

        $warehouse = Warehouse::where('tenant_id', $tenantId)->first();
        if (! $warehouse) {
            $warehouse = Warehouse::create([
                'tenant_id' => $tenantId,
                'store_id' => $store->id,
                'name' => 'Gudang Distribusi Cakung',
                'code' => 'WH-CAKUNG',
                'is_active' => true,
            ]);
        }

        $register = Register::where('tenant_id', $tenantId)->first();
        if (! $register) {
            $register = Register::create([
                'tenant_id' => $tenantId,
                'store_id' => $store->id,
                'name' => 'Mesin Kasir Utama 01',
                'code' => 'POS-01',
                'is_active' => true,
            ]);
        }

        $cashierUser = User::where('tenant_id', $tenantId)->first() ?? User::first();
        $userId = $cashierUser?->id;

        // Units
        $unitPcs = Unit::firstOrCreate(
            ['tenant_id' => $tenantId, 'code' => 'PCS'],
            ['name' => 'Pieces', 'is_active' => true]
        );
        $unitPack = Unit::firstOrCreate(
            ['tenant_id' => $tenantId, 'code' => 'PACK'],
            ['name' => 'Pack', 'is_active' => true]
        );
        $unitBox = Unit::firstOrCreate(
            ['tenant_id' => $tenantId, 'code' => 'BOX'],
            ['name' => 'Box', 'is_active' => true]
        );
        $unitBottle = Unit::firstOrCreate(
            ['tenant_id' => $tenantId, 'code' => 'BTL'],
            ['name' => 'Botol', 'is_active' => true]
        );

        // Categories (10 categories)
        $categoriesData = [
            ['name' => 'Minuman & Kopi', 'slug' => 'minuman-kopi'],
            ['name' => 'Makanan Ringan & Snack', 'slug' => 'makanan-snack'],
            ['name' => 'Kebutuhan Sembako', 'slug' => 'kebutuhan-sembako'],
            ['name' => 'Susu & Olahan Dairy', 'slug' => 'susu-dairy'],
            ['name' => 'Mie Instan & Pasta', 'slug' => 'mie-instan'],
            ['name' => 'Perawatan Pribadi & Sabun', 'slug' => 'personal-care'],
            ['name' => 'Pembersih Rumah Tangga', 'slug' => 'pembersih-rumah'],
            ['name' => 'Bumbu Dapur & Minyak', 'slug' => 'bumbu-dapur'],
            ['name' => 'Kue & Biskuit Kaleng', 'slug' => 'biskuit-kue'],
            ['name' => 'Alat Tulis & Kantor', 'slug' => 'atk-kantor'],
        ];

        $categoryModels = [];
        foreach ($categoriesData as $c) {
            $categoryModels[] = ProductCategory::firstOrCreate(
                ['tenant_id' => $tenantId, 'slug' => $c['slug']],
                array_merge($c, ['tenant_id' => $tenantId, 'is_active' => true])
            );
        }

        // Brands (15 brands)
        $brandsData = [
            'Indofood', 'Nestle', 'Unilever', 'Wings', 'Mayora',
            'Ultra Jaya', 'Kapal Api', 'Dua Kelinci', 'Garuda Food', 'ABC Heinz',
            'Danone Aqua', 'Sosro', 'Frisian Flag', 'Nabisco', 'Khong Guan',
        ];
        $brandModels = [];
        foreach ($brandsData as $bName) {
            $bSlug = Str::slug($bName);
            $brandModels[] = Brand::firstOrCreate(
                ['tenant_id' => $tenantId, 'slug' => $bSlug],
                ['name' => $bName, 'tenant_id' => $tenantId, 'is_active' => true]
            );
        }

        $this->command?->info('Men-seed > 100 Suppliers...');
        // ==============================================================================
        // 1. SEED > 100 SUPPLIERS (110 Suppliers)
        // ==============================================================================
        $supplierPrefixes = ['PT', 'CV', 'UD', 'Distributor'];
        $supplierNouns = [
            'Makmur', 'Sejahtera', 'Abadi', 'Sentosa', 'Mandiri', 'Jaya', 'Berkah', 'Utama',
            'Gemilang', 'Lestari', 'Anugerah', 'Nusantara', 'Prima', 'Megah', 'Kencana',
            'Bintang', 'Sinar', 'Cahaya', 'Karya', 'Sukses', 'Agung', 'Mulia', 'Damai',
        ];
        $cities = ['Jakarta', 'Surabaya', 'Bandung', 'Semarang', 'Medan', 'Bekasi', 'Tangerang', 'Depok', 'Bogor'];

        $existingSuppliersCount = Supplier::where('tenant_id', $tenantId)->count();
        $targetSuppliers = 110;

        for ($i = $existingSuppliersCount + 1; $i <= $targetSuppliers; $i++) {
            $pref = $supplierPrefixes[$i % count($supplierPrefixes)];
            $noun = $supplierNouns[($i * 3) % count($supplierNouns)];
            $noun2 = $supplierNouns[($i * 7) % count($supplierNouns)];
            $city = $cities[$i % count($cities)];
            $code = 'SUP-'.str_pad($i, 4, '0', STR_PAD_LEFT);

            Supplier::firstOrCreate(
                ['tenant_id' => $tenantId, 'code' => $code],
                [
                    'name' => "{$pref} {$noun} {$noun2} {$city}",
                    'contact_person' => "Bpk/Ibu Kontak {$i}",
                    'phone' => '021'.rand(5000000, 9999999),
                    'email' => "supplier{$i}@distribusi-pos.test",
                    'address' => "Kawasan Pergudangan Blok {$i}, {$city}",
                    'payment_terms_days' => [14, 30, 45, 60][$i % 4],
                    'is_active' => true,
                ]
            );
        }

        $this->command?->info('Men-seed > 100 Pelanggan (Customers)...');
        // ==============================================================================
        // 2. SEED > 100 CUSTOMERS (125 Customers)
        // ==============================================================================
        $customerFirstNames = [
            'Budi', 'Siti', 'Joko', 'Rina', 'Hendra', 'Dewi', 'Agus', 'Maya', 'Dedi', 'Putri',
            'Ahmad', 'Ratna', 'Eko', 'Wulan', 'Bambang', 'Sri', 'Fajar', 'Indah', 'Rudi', 'Nur',
            'Rizky', 'Tari', 'Dimas', 'Lestari', 'Bayu', 'Anita', 'Gilang', 'Yanti', 'Reza', 'Fitri',
        ];
        $customerLastNames = [
            'Santoso', 'Pratama', 'Kusuma', 'Saputra', 'Wibowo', 'Hidayat', 'Siregar', 'Lubis',
            'Setiawan', 'Nugroho', 'Wijaya', 'Anggraini', 'Utami', 'Permata', 'Gunawan', 'Hartono',
        ];

        $vipGroup = CustomerGroup::where('tenant_id', $tenantId)->first();

        $existingCustomerCount = Customer::where('tenant_id', $tenantId)->count();
        $targetCustomers = 125;

        for ($i = $existingCustomerCount + 1; $i <= $targetCustomers; $i++) {
            $fName = $customerFirstNames[$i % count($customerFirstNames)];
            $lName = $customerLastNames[($i * 2) % count($customerLastNames)];
            $code = 'CUST-'.str_pad($i, 4, '0', STR_PAD_LEFT);

            Customer::firstOrCreate(
                ['tenant_id' => $tenantId, 'code' => $code],
                [
                    'customer_group_id' => ($i % 5 === 0 && $vipGroup) ? $vipGroup->id : null,
                    'name' => "{$fName} {$lName}",
                    'phone' => '0812'.rand(10000000, 99999999),
                    'email' => strtolower("{$fName}.{$lName}{$i}@gmail.test"),
                    'address' => "Jl. Mawar No. {$i}, RT/RW 0{$i}, Jakarta",
                    'loyalty_points' => rand(10, 850),
                    'credit_limit' => ($i % 5 === 0) ? 2500000 : 0,
                    'status' => 'active',
                ]
            );
        }

        $this->command?->info('Men-seed > 100 Katalog Produk (Products)...');
        // ==============================================================================
        // 3. SEED > 100 PRODUCTS (120 Products dengan Real SKU & Barcode)
        // ==============================================================================
        $productTemplates = [
            // Beverages
            ['name' => 'Kopi Arabika Gayo Aceh 250g', 'cost' => 38000, 'price' => 68000, 'cat' => 0, 'brand' => 6, 'unit' => $unitPack, 'image' => 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Kopi Robusta Lampung Super 250g', 'cost' => 25000, 'price' => 45000, 'cat' => 0, 'brand' => 6, 'unit' => $unitPack, 'image' => 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Teh Celup Melati Wangi 25s', 'cost' => 11000, 'price' => 20000, 'cat' => 0, 'brand' => 11, 'unit' => $unitBox, 'image' => 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Teh Hijau Asli Kepala Jenggot', 'cost' => 14000, 'price' => 24000, 'cat' => 0, 'brand' => 11, 'unit' => $unitBox, 'image' => 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Air Mineral Pegunungan 600ml', 'cost' => 2500, 'price' => 5000, 'cat' => 0, 'brand' => 10, 'unit' => $unitBottle, 'image' => 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Air Mineral Botol 1500ml Jumbo', 'cost' => 4500, 'price' => 8500, 'cat' => 0, 'brand' => 10, 'unit' => $unitBottle, 'image' => 'https://images.unsplash.com/photo-1559839914-1b3967399f66?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Minuman Isotonik Botol 500ml', 'cost' => 4500, 'price' => 8000, 'cat' => 0, 'brand' => 10, 'unit' => $unitBottle, 'image' => 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Jus Jeruk Pulpy Fresh 330ml', 'cost' => 5500, 'price' => 9500, 'cat' => 0, 'brand' => 1, 'unit' => $unitBottle, 'image' => 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Kopi Susu Gula Aren Kaleng 240ml', 'cost' => 6000, 'price' => 11000, 'cat' => 0, 'brand' => 4, 'unit' => $unitPcs, 'image' => 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Teh Botol Melati Kotak 250ml', 'cost' => 2800, 'price' => 5000, 'cat' => 0, 'brand' => 11, 'unit' => $unitPcs, 'image' => 'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=400&q=80'],

            // Snacks & Food
            ['name' => 'Indomie Goreng Spesial 85g', 'cost' => 2800, 'price' => 4500, 'cat' => 4, 'brand' => 0, 'unit' => $unitPcs, 'image' => 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Indomie Kuah Ayam Bawang 75g', 'cost' => 2700, 'price' => 4200, 'cat' => 4, 'brand' => 0, 'unit' => $unitPcs, 'image' => 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Indomie Kuah Soto Mie 75g', 'cost' => 2700, 'price' => 4200, 'cat' => 4, 'brand' => 0, 'unit' => $unitPcs, 'image' => 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Mie Sedaap Goreng Original 90g', 'cost' => 2800, 'price' => 4500, 'cat' => 4, 'brand' => 3, 'unit' => $unitPcs, 'image' => 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Mie Sedaap Soto Madura 82g', 'cost' => 2700, 'price' => 4200, 'cat' => 4, 'brand' => 3, 'unit' => $unitPcs, 'image' => 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Keripik Singkong Balado 150g', 'cost' => 8500, 'price' => 16000, 'cat' => 1, 'brand' => 0, 'unit' => $unitPack, 'image' => 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Keripik Kentang Keju Gurih 68g', 'cost' => 9000, 'price' => 17500, 'cat' => 1, 'brand' => 0, 'unit' => $unitPack, 'image' => 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Kacang Kulit Sangrai Gurih 200g', 'cost' => 12000, 'price' => 22000, 'cat' => 1, 'brand' => 7, 'unit' => $unitPack, 'image' => 'https://images.unsplash.com/photo-1536599018102-9f803c140fc1?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Kacang Atom Bawang Renyah 130g', 'cost' => 7500, 'price' => 14000, 'cat' => 1, 'brand' => 8, 'unit' => $unitPack, 'image' => 'https://images.unsplash.com/photo-1508746829417-e6f548d8d6ed?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Biskuit Cokelat Sandwich 133g', 'cost' => 6500, 'price' => 12000, 'cat' => 8, 'brand' => 13, 'unit' => $unitPack, 'image' => 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Wafer Cokelat Renyah Kotak 145g', 'cost' => 7500, 'price' => 14500, 'cat' => 8, 'brand' => 4, 'unit' => $unitBox, 'image' => 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&w=400&q=80'],

            // Sembako & Groceries
            ['name' => 'Beras Pandan Wangi Premium 5kg', 'cost' => 68000, 'price' => 85000, 'cat' => 2, 'brand' => 0, 'unit' => $unitPack, 'image' => 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Minyak Goreng Sawit Pouch 2 Liter', 'cost' => 31000, 'price' => 39500, 'cat' => 7, 'brand' => 0, 'unit' => $unitPcs, 'image' => 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Gula Pasir Kristal Putih 1kg', 'cost' => 14500, 'price' => 18000, 'cat' => 2, 'brand' => 0, 'unit' => $unitPcs, 'image' => 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Garam Beryodium Halus 500g', 'cost' => 3500, 'price' => 6500, 'cat' => 7, 'brand' => 0, 'unit' => $unitPcs, 'image' => 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Tepung Terigu Serbaguna 1kg', 'cost' => 10500, 'price' => 14500, 'cat' => 2, 'brand' => 0, 'unit' => $unitPcs, 'image' => 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Kecap Manis Botol Kaca 600ml', 'cost' => 18000, 'price' => 26000, 'cat' => 7, 'brand' => 9, 'unit' => $unitBottle, 'image' => 'https://images.unsplash.com/photo-1607672632458-9eb56696346b?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Saus Sambal Extra Pedas 335ml', 'cost' => 12000, 'price' => 18500, 'cat' => 7, 'brand' => 9, 'unit' => $unitBottle, 'image' => 'https://images.unsplash.com/photo-1588615419957-c6b78d2fb1b8?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Susu Kental Manis Putih Kaleng 370g', 'cost' => 10500, 'price' => 15500, 'cat' => 3, 'brand' => 12, 'unit' => $unitPcs, 'image' => 'https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Susu UHT Cokelat Full Cream 1 Liter', 'cost' => 16500, 'price' => 24500, 'cat' => 3, 'brand' => 5, 'unit' => $unitPcs, 'image' => 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Susu Steril Beruang Kaleng 189ml', 'cost' => 8500, 'price' => 12500, 'cat' => 3, 'brand' => 1, 'unit' => $unitPcs, 'image' => 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=400&q=80'],

            // Personal Care & Cleaning
            ['name' => 'Sabun Mandi Batang Antibakteri 85g', 'cost' => 3500, 'price' => 6500, 'cat' => 5, 'brand' => 2, 'unit' => $unitPcs, 'image' => 'https://images.unsplash.com/photo-1608248597359-2e70e30d2d38?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Shampoo Anti Ketombe Botol 170ml', 'cost' => 18500, 'price' => 28000, 'cat' => 5, 'brand' => 2, 'unit' => $unitBottle, 'image' => 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Pasta Gigi Herbal Ekstra Daun Sirih 190g', 'cost' => 12000, 'price' => 19500, 'cat' => 5, 'brand' => 2, 'unit' => $unitPcs, 'image' => 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Deterjen Bubuk Konsentrat 800g', 'cost' => 17000, 'price' => 25500, 'cat' => 6, 'brand' => 3, 'unit' => $unitPack, 'image' => 'https://images.unsplash.com/photo-1585670270608-b404fb880222?auto=format&fit=crop&w=400&q=80'],
            ['name' => 'Cairan Pencuci Piring Jeruk Nipis 780ml', 'cost' => 11500, 'price' => 17500, 'cat' => 6, 'brand' => 2, 'unit' => $unitPcs, 'image' => 'https://images.unsplash.com/photo-1585421514738-01798e348b17?auto=format&fit=crop&w=400&q=80'],
        ];

        $targetProducts = 120;
        $allProducts = [];

        for ($i = 1; $i <= $targetProducts; $i++) {
            $template = $productTemplates[($i - 1) % count($productTemplates)];
            $variantSuffix = $i > count($productTemplates) ? ' Varian '.ceil($i / count($productTemplates)) : '';
            $sku = 'PRD-'.str_pad($i, 5, '0', STR_PAD_LEFT);
            $barcode = '899'.str_pad($i, 10, '0', STR_PAD_LEFT);
            $catId = $categoryModels[$template['cat']]->id;
            $brandId = $brandModels[$template['brand']]->id;

            $prod = Product::firstOrCreate(
                ['tenant_id' => $tenantId, 'sku' => $sku],
                [
                    'category_id' => $catId,
                    'brand_id' => $brandId,
                    'unit_id' => $template['unit']->id,
                    'sku' => $sku,
                    'barcode' => $barcode,
                    'name' => "{$template['name']}{$variantSuffix}",
                    'image_url' => $template['image'],
                    'purchase_cost' => $template['cost'] + (($i % 5) * 500),
                    'selling_price' => $template['price'] + (($i % 5) * 1000),
                    'min_stock' => 10,
                    'max_stock' => 500,
                    'track_inventory' => true,
                    'status' => 'active',
                ]
            );

            if (! $prod->image_url) {
                $prod->update(['image_url' => $template['image']]);
            }

            // Seed Stock Balance
            StockBalance::firstOrCreate(
                ['tenant_id' => $tenantId, 'warehouse_id' => $warehouse->id, 'product_id' => $prod->id],
                [
                    'quantity' => rand(80, 450),
                    'reserved_quantity' => 0,
                ]
            );

            $allProducts[] = $prod;
        }

        $this->command?->info('Men-seed > 100 Kupon & Promosi (Promotions)...');
        // ==============================================================================
        // 4. SEED > 100 PROMOTIONS & COUPONS (105 Promotions)
        // ==============================================================================
        $promoTypes = ['percentage', 'fixed', 'buy_x_get_y'];
        $targetPromotions = 105;
        $allPromotions = [];

        for ($i = 1; $i <= $targetPromotions; $i++) {
            $code = 'PROMO'.str_pad($i, 4, '0', STR_PAD_LEFT);
            $type = $promoTypes[$i % count($promoTypes)];

            $p = Promotion::firstOrCreate(
                ['tenant_id' => $tenantId, 'code' => $code],
                [
                    'name' => "Promosi Spesial {$code}",
                    'type' => $type,
                    'discount_value' => $type === 'percentage' ? [5, 10, 15, 20][$i % 4] : [10000, 15000, 25000][$i % 3],
                    'min_order_amount' => [30000, 50000, 75000][$i % 3],
                    'max_discount_amount' => $type === 'percentage' ? 50000 : null,
                    'buy_quantity' => $type === 'buy_x_get_y' ? 2 : null,
                    'get_quantity' => $type === 'buy_x_get_y' ? 1 : null,
                    'target_type' => 'all',
                    'start_date' => now()->subDays(30),
                    'end_date' => now()->addDays(60),
                    'usage_limit' => 500,
                    'usage_count' => rand(5, 50),
                    'is_active' => true,
                ]
            );
            $allPromotions[] = $p;
        }

        $this->command?->info('Men-seed > 100 Shift Kasir (Shifts & Cash Movements)...');
        // ==============================================================================
        // 5. SEED > 100 SHIFTS (110 Shifts)
        // ==============================================================================
        $targetShifts = 110;
        $allShifts = [];

        for ($i = 1; $i <= $targetShifts; $i++) {
            $shiftDate = now()->subDays(floor($i / 2))->subHours(($i % 2 === 0 ? 8 : 16));
            $openingCash = 200000;
            $cashSales = rand(500000, 2500000);
            $cashIn = rand(0, 1) ? 100000 : 0;
            $cashOut = rand(0, 1) ? 50000 : 0;
            $expectedCash = $openingCash + $cashSales + $cashIn - $cashOut;
            $actualCash = $expectedCash; // Exact match or minimal variance

            $shift = Shift::firstOrCreate(
                ['tenant_id' => $tenantId, 'notes' => "Shift Seeder #{$i}"],
                [
                    'store_id' => $store->id,
                    'register_id' => $register->id,
                    'user_id' => $userId,
                    'status' => 'closed',
                    'opened_at' => $shiftDate,
                    'closed_at' => $shiftDate->copy()->addHours(8),
                    'opening_cash' => $openingCash,
                    'expected_cash' => $expectedCash,
                    'actual_cash' => $actualCash,
                    'cash_difference' => 0,
                    'approval_status' => 'approved',
                    'approved_at' => $shiftDate->copy()->addHours(8),
                    'created_at' => $shiftDate,
                    'updated_at' => $shiftDate->copy()->addHours(8),
                ]
            );

            // Mid shift cash movement
            if ($cashIn > 0) {
                ShiftCashMovement::firstOrCreate(
                    ['tenant_id' => $tenantId, 'shift_id' => $shift->id, 'reason' => "Modal Tambahan Kasir #{$i}"],
                    [
                        'user_id' => $userId,
                        'type' => 'cash_in',
                        'amount' => $cashIn,
                        'notes' => 'Tukar uang pecahan kecil',
                        'created_at' => $shiftDate->copy()->addHours(2),
                        'updated_at' => $shiftDate->copy()->addHours(2),
                    ]
                );
            }

            $allShifts[] = $shift;
        }

        $this->command?->info('Men-seed > 100 Faktur Penjualan POS (Orders & Payments)...');
        // ==============================================================================
        // 6. SEED > 100 ORDERS & PAYMENTS (150 Real Completed Orders)
        // ==============================================================================
        $targetOrders = 150;
        $customersList = Customer::where('tenant_id', $tenantId)->get();
        $paymentMethods = ['cash', 'qris', 'debit', 'credit', 'split'];

        for ($i = 1; $i <= $targetOrders; $i++) {
            $daysAgo = rand(0, 29);
            $hoursAgo = rand(8, 21);
            $orderDate = now()->subDays($daysAgo)->setHour($hoursAgo)->setMinute(rand(0, 59));
            $orderNumber = 'INV/STR01/'.$orderDate->format('Ymd').'/'.str_pad($i, 4, '0', STR_PAD_LEFT);

            // Random 1 to 4 products for this order
            $chosenProducts = collect($allProducts)->random(rand(1, 4));
            $subtotal = 0;
            $itemsData = [];

            foreach ($chosenProducts as $cp) {
                $qty = rand(1, 3);
                $unitPrice = (float) $cp->selling_price;
                $unitCost = (float) $cp->purchase_cost;
                $lineSubtotal = $qty * $unitPrice;
                $subtotal += $lineSubtotal;

                $itemsData[] = [
                    'product_id' => $cp->id,
                    'product_name' => $cp->name,
                    'product_sku' => $cp->sku,
                    'quantity' => $qty,
                    'unit_cost' => $unitCost,
                    'unit_price' => $unitPrice,
                    'subtotal' => $lineSubtotal,
                ];
            }

            // Discount
            $discount = ($i % 4 === 0) ? 10000 : 0;
            $taxable = max(0, $subtotal - $discount);
            $tax = round($taxable * 0.11, 2);
            $totalAmount = $taxable + $tax;

            $method = $paymentMethods[$i % count($paymentMethods)];
            $customer = ($i % 3 === 0 && $customersList->isNotEmpty()) ? $customersList->random() : null;
            $shift = $allShifts[$i % count($allShifts)];

            $order = Order::firstOrCreate(
                ['tenant_id' => $tenantId, 'order_number' => $orderNumber],
                [
                    'store_id' => $store->id,
                    'register_id' => $register->id,
                    'shift_id' => $shift->id,
                    'user_id' => $userId,
                    'customer_id' => $customer?->id,
                    'status' => 'completed',
                    'subtotal' => $subtotal,
                    'discount_amount' => $discount,
                    'tax_amount' => $tax,
                    'service_charge' => 0,
                    'total_amount' => $totalAmount,
                    'paid_amount' => $method === 'cash' ? ceil($totalAmount / 10000) * 10000 : $totalAmount,
                    'change_amount' => $method === 'cash' ? (ceil($totalAmount / 10000) * 10000) - $totalAmount : 0,
                    'payment_method' => $method,
                    'completed_at' => $orderDate,
                    'created_at' => $orderDate,
                    'updated_at' => $orderDate,
                ]
            );

            // Seed Order Items & Inventory Movements
            foreach ($itemsData as $row) {
                OrderItem::firstOrCreate(
                    ['tenant_id' => $tenantId, 'order_id' => $order->id, 'product_id' => $row['product_id']],
                    array_merge($row, [
                        'tenant_id' => $tenantId,
                        'order_id' => $order->id,
                        'discount_amount' => 0,
                        'tax_amount' => 0,
                        'created_at' => $orderDate,
                        'updated_at' => $orderDate,
                    ])
                );

                // Inventory Movement (SALE)
                InventoryMovement::create([
                    'tenant_id' => $tenantId,
                    'warehouse_id' => $warehouse->id,
                    'product_id' => $row['product_id'],
                    'movement_type' => 'SALE',
                    'quantity_change' => -$row['quantity'],
                    'balance_before' => 100,
                    'balance_after' => 100 - $row['quantity'],
                    'unit_cost' => $row['unit_cost'],
                    'reference_type' => Order::class,
                    'reference_id' => $order->id,
                    'user_id' => $userId,
                    'notes' => "Faktur Penjualan {$orderNumber}",
                    'created_at' => $orderDate,
                ]);
            }

            // Seed Order Payment
            if ($method === 'split') {
                $half1 = round($totalAmount / 2, 2);
                $half2 = $totalAmount - $half1;

                OrderPayment::create([
                    'tenant_id' => $tenantId,
                    'order_id' => $order->id,
                    'shift_id' => $shift->id,
                    'payment_method' => 'cash',
                    'amount' => $half1,
                    'status' => 'success',
                    'created_at' => $orderDate,
                    'updated_at' => $orderDate,
                ]);

                OrderPayment::create([
                    'tenant_id' => $tenantId,
                    'order_id' => $order->id,
                    'shift_id' => $shift->id,
                    'payment_method' => 'qris',
                    'amount' => $half2,
                    'reference_number' => 'QRIS-'.Str::random(10),
                    'status' => 'success',
                    'created_at' => $orderDate,
                    'updated_at' => $orderDate,
                ]);
            } else {
                OrderPayment::create([
                    'tenant_id' => $tenantId,
                    'order_id' => $order->id,
                    'shift_id' => $shift->id,
                    'payment_method' => $method,
                    'amount' => $totalAmount,
                    'reference_number' => $method !== 'cash' ? strtoupper($method).'-'.Str::random(8) : null,
                    'status' => 'success',
                    'created_at' => $orderDate,
                    'updated_at' => $orderDate,
                ]);
            }

            // Sales Commission (2%)
            SalesCommission::create([
                'tenant_id' => $tenantId,
                'order_id' => $order->id,
                'user_id' => $userId,
                'rate_percentage' => 2.0,
                'commission_amount' => round(($subtotal - $discount) * 0.02, 2),
                'status' => 'approved',
                'approved_by_id' => $userId,
                'approved_at' => $orderDate,
                'created_at' => $orderDate,
                'updated_at' => $orderDate,
            ]);
        }

        $this->command?->info('Men-seed Retur & Refund (Refunds)...');
        // ==============================================================================
        // 7. SEED REFUNDS & RETURNS (20 Refunds)
        // ==============================================================================
        $sampleOrders = Order::where('tenant_id', $tenantId)->with('items')->limit(20)->get();

        foreach ($sampleOrders as $idx => $sOrder) {
            $item = $sOrder->items->first();
            if (! $item) {
                continue;
            }

            $refundNumber = 'REF/STR01/'.now()->format('Ymd').'/'.str_pad($idx + 1, 4, '0', STR_PAD_LEFT);
            $refundAmount = (float) $item->subtotal;

            $refund = OrderRefund::firstOrCreate(
                ['tenant_id' => $tenantId, 'refund_number' => $refundNumber],
                [
                    'order_id' => $sOrder->id,
                    'store_id' => $store->id,
                    'user_id' => $userId,
                    'type' => 'partial_refund',
                    'status' => 'completed',
                    'total_refund_amount' => $refundAmount,
                    'refund_method' => 'cash',
                    'reason' => 'Barang Rusak / Cacat Kemasan',
                    'notes' => 'Pelanggan minta ganti uang tunai',
                ]
            );

            OrderRefundItem::firstOrCreate(
                ['tenant_id' => $tenantId, 'order_refund_id' => $refund->id, 'order_item_id' => $item->id],
                [
                    'product_id' => $item->product_id,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'refund_amount' => $refundAmount,
                    'restock' => false,
                    'condition' => 'damaged',
                ]
            );

            $sOrder->update(['status' => 'partially_refunded']);
        }

        $this->command?->info('✅ Selesai! Seluruh entitas database kini memiliki lebih dari 100 data!');
    }
}
