<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Register;
use App\Models\StockBalance;
use App\Models\Store;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\AnalyticsService;
use App\Services\PosCheckoutService;
use App\Services\RefundService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardAndAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Store $storeA;

    protected Store $storeB;

    protected Register $register;

    protected Warehouse $warehouse;

    protected User $user;

    protected Product $product1;

    protected Product $product2;

    protected PosCheckoutService $checkoutService;

    protected AnalyticsService $analyticsService;

    protected RefundService $refundService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'PT Prima Distribusi Solusi',
            'slug' => 'prima-distribusi',
        ]);

        $this->storeA = Store::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Cabang Sudirman',
            'code' => 'SDR-01',
            'tax_percentage' => 11.00,
        ]);

        $this->storeB = Store::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Cabang Thamrin',
            'code' => 'THM-01',
            'tax_percentage' => 11.00,
        ]);

        $this->register = Register::create([
            'tenant_id' => $this->tenant->id,
            'store_id' => $this->storeA->id,
            'name' => 'POS Utama SDR',
            'code' => 'POS-SDR-1',
            'is_active' => true,
        ]);

        $this->warehouse = Warehouse::create([
            'tenant_id' => $this->tenant->id,
            'store_id' => $this->storeA->id,
            'name' => 'Gudang SDR',
            'code' => 'WH-SDR',
            'is_active' => true,
        ]);

        $this->user = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Manajer Arya',
            'email' => 'arya.manajer@prima.test',
            'password' => bcrypt('password'),
            'status' => 'active',
        ]);
        $this->user->stores()->syncWithoutDetaching([
            $this->storeA->id => ['is_default' => true, 'tenant_id' => $this->tenant->id],
            $this->storeB->id => ['is_default' => false, 'tenant_id' => $this->tenant->id],
        ]);

        $unit = Unit::create([
            'tenant_id' => $this->tenant->id,
            'code' => 'PCS',
            'name' => 'Pieces',
        ]);

        $category = ProductCategory::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Minuman Kemasan',
            'slug' => 'minuman-kemasan',
        ]);

        // Product 1: Cost 10.000, Price 20.000
        $this->product1 = Product::create([
            'tenant_id' => $this->tenant->id,
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'sku' => 'DRK-TEA',
            'name' => 'Teh Melati Organik 500ml',
            'purchase_cost' => 10000,
            'selling_price' => 20000,
            'track_inventory' => true,
            'status' => 'active',
        ]);

        // Product 2: Cost 15.000, Price 30.000
        $this->product2 = Product::create([
            'tenant_id' => $this->tenant->id,
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'sku' => 'DRK-COFFEE',
            'name' => 'Cold Brew Arabica 250ml',
            'purchase_cost' => 15000,
            'selling_price' => 30000,
            'track_inventory' => true,
            'status' => 'active',
        ]);

        StockBalance::create([
            'tenant_id' => $this->tenant->id,
            'warehouse_id' => $this->warehouse->id,
            'product_id' => $this->product1->id,
            'quantity' => 100,
            'reserved_quantity' => 0,
        ]);

        StockBalance::create([
            'tenant_id' => $this->tenant->id,
            'warehouse_id' => $this->warehouse->id,
            'product_id' => $this->product2->id,
            'quantity' => 100,
            'reserved_quantity' => 0,
        ]);

        $warehouseB = Warehouse::create([
            'tenant_id' => $this->tenant->id,
            'store_id' => $this->storeB->id,
            'name' => 'Gudang THM',
            'code' => 'WH-THM',
            'is_active' => true,
        ]);

        StockBalance::create([
            'tenant_id' => $this->tenant->id,
            'warehouse_id' => $warehouseB->id,
            'product_id' => $this->product2->id,
            'quantity' => 100,
            'reserved_quantity' => 0,
        ]);

        $this->checkoutService = app(PosCheckoutService::class);
        $this->analyticsService = app(AnalyticsService::class);
        $this->refundService = app(RefundService::class);
    }

    public function test_dashboard_page_loads_with_kpis_and_analytics_data(): void
    {
        $this->actingAs($this->user);

        // Perform 1 test sale
        $this->checkoutService->checkout([
            'store_id' => $this->storeA->id,
            'register_id' => $this->register->id,
            'payment_method' => 'cash',
            'paid_amount' => 100000,
            'items' => [
                ['product_id' => $this->product1->id, 'quantity' => 2],
            ],
        ]);

        $response = $this->get('/dashboard');

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->has('kpis')
            ->has('sales_trend')
            ->has('top_products')
            ->has('payment_methods')
            ->has('store_comparison')
            ->has('hourly_traffic')
            ->has('stores')
            ->has('filters')
        );
    }

    public function test_kpis_accurately_calculate_gross_sales_net_sales_and_cogs_profit(): void
    {
        $this->actingAs($this->user);

        // Order 1:
        // Product 1: 3x @ 20.000 = 60.000 (Cost: 3x @ 10.000 = 30.000)
        // Discount: 10.000
        // Subtotal = 60.000, Taxable = 50.000, Tax 11% = 5.500
        // Grand Total (Net Sales) = 55.500
        $order = $this->checkoutService->checkout([
            'store_id' => $this->storeA->id,
            'register_id' => $this->register->id,
            'discount_amount' => 10000,
            'payment_method' => 'cash',
            'paid_amount' => 100000,
            'items' => [
                ['product_id' => $this->product1->id, 'quantity' => 3],
            ],
        ]);

        $range = $this->analyticsService->resolveDateRange('today');
        $kpis = $this->analyticsService->getSummaryKpis(
            tenantId: $this->tenant->id,
            storeId: null,
            startDate: $range['start'],
            endDate: $range['end']
        );

        $this->assertEquals(60000, $kpis['gross_sales']);
        $this->assertEquals(55500, $kpis['net_sales']);
        $this->assertEquals(10000, $kpis['total_discounts']);
        $this->assertEquals(30000, $kpis['total_cogs']);
        $this->assertEquals(25500, $kpis['gross_profit']); // 55.500 - 30.000
        $this->assertEquals(1, $kpis['total_orders']);
        $this->assertEquals(55500, $kpis['aov']);
    }

    public function test_sales_trend_time_series_data_aggregation(): void
    {
        $this->actingAs($this->user);

        $this->checkoutService->checkout([
            'store_id' => $this->storeA->id,
            'register_id' => $this->register->id,
            'payment_method' => 'cash',
            'paid_amount' => 100000,
            'items' => [
                ['product_id' => $this->product1->id, 'quantity' => 2],
            ],
        ]);

        $range = $this->analyticsService->resolveDateRange('7_days');
        $trend = $this->analyticsService->getSalesTrend(
            tenantId: $this->tenant->id,
            storeId: null,
            startDate: $range['start'],
            endDate: $range['end']
        );

        $this->assertCount(7, $trend);

        // Today's entry is the last element
        $todayEntry = end($trend);
        $this->assertEquals(now()->format('Y-m-d'), $todayEntry['date']);
        $this->assertGreaterThan(0, $todayEntry['sales']);
        $this->assertEquals(1, $todayEntry['orders']);
    }

    public function test_top_products_ranking_by_sales_volume_and_profit(): void
    {
        $this->actingAs($this->user);

        // Product 2 sold 5 units
        $this->checkoutService->checkout([
            'store_id' => $this->storeA->id,
            'register_id' => $this->register->id,
            'payment_method' => 'cash',
            'paid_amount' => 200000,
            'items' => [
                ['product_id' => $this->product2->id, 'quantity' => 5],
            ],
        ]);

        // Product 1 sold 2 units
        $this->checkoutService->checkout([
            'store_id' => $this->storeA->id,
            'register_id' => $this->register->id,
            'payment_method' => 'cash',
            'paid_amount' => 100000,
            'items' => [
                ['product_id' => $this->product1->id, 'quantity' => 2],
            ],
        ]);

        $range = $this->analyticsService->resolveDateRange('today');
        $topProducts = $this->analyticsService->getTopProducts(
            tenantId: $this->tenant->id,
            storeId: null,
            startDate: $range['start'],
            endDate: $range['end'],
            limit: 5
        );

        $this->assertCount(2, $topProducts);

        // Rank 1 should be Product 2 (5 units sold)
        $this->assertEquals(1, $topProducts[0]['rank']);
        $this->assertEquals($this->product2->id, $topProducts[0]['product_id']);
        $this->assertEquals(5, $topProducts[0]['quantity_sold']);

        // Rank 2 should be Product 1 (2 units sold)
        $this->assertEquals(2, $topProducts[1]['rank']);
        $this->assertEquals($this->product1->id, $topProducts[1]['product_id']);
        $this->assertEquals(2, $topProducts[1]['quantity_sold']);
    }

    public function test_payment_method_distribution_breakdown(): void
    {
        $this->actingAs($this->user);

        // Cash order
        $this->checkoutService->checkout([
            'store_id' => $this->storeA->id,
            'register_id' => $this->register->id,
            'payment_method' => 'cash',
            'paid_amount' => 50000,
            'items' => [
                ['product_id' => $this->product1->id, 'quantity' => 1],
            ],
        ]);

        // QRIS order
        $this->checkoutService->checkout([
            'store_id' => $this->storeA->id,
            'register_id' => $this->register->id,
            'payment_method' => 'qris',
            'paid_amount' => 50000,
            'items' => [
                ['product_id' => $this->product1->id, 'quantity' => 1],
            ],
        ]);

        $range = $this->analyticsService->resolveDateRange('today');
        $methods = $this->analyticsService->getPaymentMethodBreakdown(
            tenantId: $this->tenant->id,
            storeId: null,
            startDate: $range['start'],
            endDate: $range['end']
        );

        $this->assertCount(2, $methods);
        $methodKeys = array_column($methods, 'method');
        $this->assertContains('cash', $methodKeys);
        $this->assertContains('qris', $methodKeys);
    }

    public function test_store_comparison_accurately_aggregates_per_branch(): void
    {
        $this->actingAs($this->user);

        // Sale in Store A
        $this->checkoutService->checkout([
            'store_id' => $this->storeA->id,
            'register_id' => $this->register->id,
            'payment_method' => 'cash',
            'paid_amount' => 50000,
            'items' => [
                ['product_id' => $this->product1->id, 'quantity' => 2],
            ],
        ]);

        // Sale in Store B
        $this->checkoutService->checkout([
            'store_id' => $this->storeB->id,
            'payment_method' => 'cash',
            'paid_amount' => 100000,
            'items' => [
                ['product_id' => $this->product2->id, 'quantity' => 1],
            ],
        ]);

        $range = $this->analyticsService->resolveDateRange('today');
        $comparison = $this->analyticsService->getStoreComparison(
            tenantId: $this->tenant->id,
            startDate: $range['start'],
            endDate: $range['end']
        );

        $this->assertCount(2, $comparison);
        $storeIds = array_column($comparison, 'store_id');
        $this->assertContains($this->storeA->id, $storeIds);
        $this->assertContains($this->storeB->id, $storeIds);
    }

    public function test_sales_report_csv_export_streams_correct_data(): void
    {
        $this->actingAs($this->user);

        $order = $this->checkoutService->checkout([
            'store_id' => $this->storeA->id,
            'register_id' => $this->register->id,
            'payment_method' => 'cash',
            'paid_amount' => 100000,
            'items' => [
                ['product_id' => $this->product1->id, 'quantity' => 2],
            ],
        ]);

        $response = $this->get('/analytics/export?period=7_days');

        $response->assertOk();
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');

        $content = $response->streamedContent();
        $this->assertStringContainsString('Nomor Faktur', $content);
        $this->assertStringContainsString($order->order_number, $content);
        $this->assertStringContainsString('Cabang Sudirman', $content);
    }

    public function test_rest_api_analytics_summary_and_trend(): void
    {
        $this->actingAs($this->user, 'sanctum');

        $this->checkoutService->checkout([
            'store_id' => $this->storeA->id,
            'register_id' => $this->register->id,
            'payment_method' => 'cash',
            'paid_amount' => 100000,
            'items' => [
                ['product_id' => $this->product1->id, 'quantity' => 2],
            ],
        ]);

        $responseSummary = $this->getJson('/api/v1/analytics/summary?period=today');
        $responseSummary->assertOk();
        $responseSummary->assertJsonStructure([
            'status',
            'period',
            'start_date',
            'end_date',
            'data' => [
                'net_sales',
                'gross_sales',
                'gross_profit',
                'profit_margin',
                'total_orders',
                'aov',
            ],
        ]);

        $responseTrend = $this->getJson('/api/v1/analytics/sales-trend?period=7_days');
        $responseTrend->assertOk();
        $responseTrend->assertJsonStructure([
            'status',
            'data' => [
                '*' => ['date', 'label', 'sales', 'cogs', 'profit', 'orders'],
            ],
        ]);
    }

    public function test_cross_tenant_analytics_data_isolation(): void
    {
        $tenantB = Tenant::create([
            'name' => 'PT Kompetitor Jaya',
            'slug' => 'kompetitor-jaya',
        ]);

        $storeB = Store::create([
            'tenant_id' => $tenantB->id,
            'name' => 'Toko Kompetitor',
            'code' => 'KMP-01',
        ]);

        $unitB = Unit::create([
            'tenant_id' => $tenantB->id,
            'code' => 'PCS',
            'name' => 'Pieces',
        ]);

        $productB = Product::create([
            'tenant_id' => $tenantB->id,
            'unit_id' => $unitB->id,
            'sku' => 'KMP-PROD',
            'name' => 'Produk Tenant Lain',
            'purchase_cost' => 50000,
            'selling_price' => 100000,
            'track_inventory' => true,
            'status' => 'active',
        ]);

        $whB = Warehouse::create([
            'tenant_id' => $tenantB->id,
            'store_id' => $storeB->id,
            'name' => 'Gudang KMP',
            'code' => 'WH-KMP',
            'is_active' => true,
        ]);

        StockBalance::create([
            'tenant_id' => $tenantB->id,
            'warehouse_id' => $whB->id,
            'product_id' => $productB->id,
            'quantity' => 10,
            'reserved_quantity' => 0,
        ]);

        // Sale executed in Tenant B
        $this->checkoutService->checkout([
            'tenant_id' => $tenantB->id,
            'store_id' => $storeB->id,
            'payment_method' => 'cash',
            'paid_amount' => 150000,
            'items' => [
                ['product_id' => $productB->id, 'quantity' => 1],
            ],
        ]);

        // Tenant A User views Dashboard
        $this->actingAs($this->user);

        $range = $this->analyticsService->resolveDateRange('today');
        $kpisA = $this->analyticsService->getSummaryKpis(
            tenantId: $this->tenant->id,
            storeId: null,
            startDate: $range['start'],
            endDate: $range['end']
        );

        // Tenant A must NOT see Tenant B's sales!
        $this->assertEquals(0, $kpisA['total_orders']);
        $this->assertEquals(0, $kpisA['net_sales']);
    }
}
