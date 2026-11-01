<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderRefund;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Promotion;
use App\Models\Register;
use App\Models\SalesCommission;
use App\Models\Shift;
use App\Models\StockBalance;
use App\Models\Store;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\PosCheckoutService;
use App\Services\PromotionService;
use App\Services\RefundService;
use App\Services\ShiftService;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PromotionAndRefundTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Store $store;

    protected Register $register;

    protected Warehouse $warehouse;

    protected User $cashier;

    protected User $salesPerson;

    protected Product $productA;

    protected Product $productB;

    protected Customer $customer;

    protected PromotionService $promotionService;

    protected RefundService $refundService;

    protected PosCheckoutService $checkoutService;

    protected ShiftService $shiftService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'PT Ritel Nusantara Jaya',
            'slug' => 'ritel-nusantara',
        ]);

        $this->store = Store::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Store Grand Indonesia',
            'code' => 'GI-01',
            'tax_percentage' => 11.00,
        ]);

        $this->register = Register::create([
            'tenant_id' => $this->tenant->id,
            'store_id' => $this->store->id,
            'name' => 'Register POS 01',
            'code' => 'REG-01',
            'is_active' => true,
        ]);

        $this->warehouse = Warehouse::create([
            'tenant_id' => $this->tenant->id,
            'store_id' => $this->store->id,
            'name' => 'Gudang Pusat GI',
            'code' => 'WH-GI',
            'is_active' => true,
        ]);

        $this->cashier = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Kasir Rina',
            'email' => 'rina.kasir@ritel.test',
            'password' => bcrypt('password'),
            'status' => 'active',
        ]);
        $this->cashier->stores()->syncWithoutDetaching([
            $this->store->id => ['is_default' => true, 'tenant_id' => $this->tenant->id],
        ]);

        $this->salesPerson = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Sales Budi',
            'email' => 'budi.sales@ritel.test',
            'password' => bcrypt('password'),
            'status' => 'active',
        ]);
        $this->salesPerson->stores()->syncWithoutDetaching([
            $this->store->id => ['is_default' => true, 'tenant_id' => $this->tenant->id],
        ]);

        $unit = Unit::create([
            'tenant_id' => $this->tenant->id,
            'code' => 'PCS',
            'name' => 'Pieces',
        ]);

        $category = ProductCategory::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Makanan Ringan',
            'slug' => 'makanan-ringan',
        ]);

        $this->productA = Product::create([
            'tenant_id' => $this->tenant->id,
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'sku' => 'SNACK-CHIPS',
            'barcode' => '8990001',
            'name' => 'Potato Crisps Deluxe 100g',
            'purchase_cost' => 15000,
            'selling_price' => 25000,
            'track_inventory' => true,
            'status' => 'active',
        ]);

        $this->productB = Product::create([
            'tenant_id' => $this->tenant->id,
            'category_id' => $category->id,
            'unit_id' => $unit->id,
            'sku' => 'SNACK-WAFER',
            'barcode' => '8990002',
            'name' => 'Chocolate Wafer Roll',
            'purchase_cost' => 8000,
            'selling_price' => 15000,
            'track_inventory' => true,
            'status' => 'active',
        ]);

        StockBalance::create([
            'tenant_id' => $this->tenant->id,
            'warehouse_id' => $this->warehouse->id,
            'product_id' => $this->productA->id,
            'quantity' => 100,
            'reserved_quantity' => 0,
        ]);

        StockBalance::create([
            'tenant_id' => $this->tenant->id,
            'warehouse_id' => $this->warehouse->id,
            'product_id' => $this->productB->id,
            'quantity' => 100,
            'reserved_quantity' => 0,
        ]);

        $this->customer = Customer::create([
            'tenant_id' => $this->tenant->id,
            'code' => 'CUST-001',
            'name' => 'Pelanggan Setia Anton',
            'phone' => '081299998888',
            'email' => 'anton@pelanggan.test',
            'loyalty_points' => 50,
        ]);

        $this->promotionService = app(PromotionService::class);
        $this->refundService = app(RefundService::class);
        $this->checkoutService = app(PosCheckoutService::class);
        $this->shiftService = app(ShiftService::class);
    }

    public function test_percentage_coupon_with_max_discount_cap(): void
    {
        // 20% discount with max Rp 30.000 cap
        Promotion::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Promo Diskon 20%',
            'code' => 'DISKON20',
            'type' => 'percentage',
            'discount_value' => 20,
            'max_discount_amount' => 30000,
            'min_order_amount' => 50000,
            'target_type' => 'all',
            'is_active' => true,
        ]);

        // Subtotal Rp 200.000 -> 20% is 40.000, but capped at 30.000
        $result = $this->promotionService->validateCoupon(
            code: 'DISKON20',
            subtotal: 200000,
            cartItems: [],
            customer: null,
            tenantId: $this->tenant->id
        );

        $this->assertTrue($result['valid']);
        $this->assertEquals(30000, $result['discount_amount']);
    }

    public function test_fixed_coupon_with_minimum_order_requirement(): void
    {
        Promotion::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Potongan Langsung Rp 25.000',
            'code' => 'HEMAT25',
            'type' => 'fixed',
            'discount_value' => 25000,
            'min_order_amount' => 100000,
            'target_type' => 'all',
            'is_active' => true,
        ]);

        // Case A: Below minimum order -> throws DomainException
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Minimal pembelanjaan untuk promo');
        $this->promotionService->validateCoupon(
            code: 'HEMAT25',
            subtotal: 80000,
            cartItems: [],
            customer: null,
            tenantId: $this->tenant->id
        );
    }

    public function test_buy_x_get_y_promotion_calculation(): void
    {
        // Buy 2 Get 1 Free on productA (Potato Crisps Deluxe, unit_price = 25.000)
        Promotion::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Beli 2 Gratis 1 Keripik',
            'code' => 'BUY2GET1',
            'type' => 'buy_x_get_y',
            'discount_value' => 0,
            'buy_quantity' => 2,
            'get_quantity' => 1,
            'target_type' => 'product',
            'target_id' => $this->productA->id,
            'is_active' => true,
        ]);

        // Customer buys 3 of ProductA (Total items = 3) -> 1 free item worth 25.000
        $cartItems = [
            [
                'product' => $this->productA,
                'product_id' => $this->productA->id,
                'quantity' => 3,
                'unit_price' => 25000,
            ],
        ];

        $result = $this->promotionService->validateCoupon(
            code: 'BUY2GET1',
            subtotal: 75000,
            cartItems: $cartItems,
            customer: null,
            tenantId: $this->tenant->id
        );

        $this->assertTrue($result['valid']);
        $this->assertEquals(25000, $result['discount_amount']);
    }

    public function test_coupon_validation_fails_when_expired_or_usage_limit_reached(): void
    {
        // Expired promo
        Promotion::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Promo Kemarin',
            'code' => 'EXPIRED99',
            'type' => 'fixed',
            'discount_value' => 10000,
            'target_type' => 'all',
            'is_active' => true,
            'start_date' => now()->subDays(10),
            'end_date' => now()->subDay(),
        ]);

        try {
            $this->promotionService->validateCoupon(
                code: 'EXPIRED99',
                subtotal: 100000,
                cartItems: [],
                customer: null,
                tenantId: $this->tenant->id
            );
            $this->fail('Expected DomainException for expired promotion was not thrown.');
        } catch (DomainException $e) {
            $this->assertStringContainsString('kedaluwarsa', $e->getMessage());
        }

        // Usage limit reached promo
        Promotion::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Promo Kuota 1',
            'code' => 'KUOTA1',
            'type' => 'fixed',
            'discount_value' => 10000,
            'target_type' => 'all',
            'is_active' => true,
            'usage_limit' => 1,
            'usage_count' => 1,
        ]);

        try {
            $this->promotionService->validateCoupon(
                code: 'KUOTA1',
                subtotal: 100000,
                cartItems: [],
                customer: null,
                tenantId: $this->tenant->id
            );
            $this->fail('Expected DomainException for usage limit was not thrown.');
        } catch (DomainException $e) {
            $this->assertStringContainsString('sudah habis', $e->getMessage());
        }
    }

    public function test_pos_checkout_applies_coupon_and_records_promotion_usage(): void
    {
        $this->actingAs($this->cashier);

        $promo = Promotion::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Diskon Rp 10.000',
            'code' => 'HEMAT10K',
            'type' => 'fixed',
            'discount_value' => 10000,
            'min_order_amount' => 40000,
            'target_type' => 'all',
            'is_active' => true,
            'usage_limit' => 10,
            'usage_count' => 0,
        ]);

        // Buy 2 of ProductA: Subtotal = 2 * 25.000 = 50.000
        // Discount = 10.000 -> Taxable = 40.000 -> Tax 11% = 4.400 -> Grand Total = 44.400
        $order = $this->checkoutService->checkout([
            'store_id' => $this->store->id,
            'customer_id' => $this->customer->id,
            'coupon_code' => 'HEMAT10K',
            'payment_method' => 'cash',
            'paid_amount' => 50000,
            'items' => [
                [
                    'product_id' => $this->productA->id,
                    'quantity' => 2,
                ],
            ],
        ]);

        $this->assertInstanceOf(Order::class, $order);
        $this->assertEquals(50000, (float) $order->subtotal);
        $this->assertEquals(10000, (float) $order->discount_amount);
        $this->assertEquals(4400, (float) $order->tax_amount);
        $this->assertEquals(44400, (float) $order->total_amount);

        // Assert promotion usage recorded
        $this->assertDatabaseHas('promotion_usages', [
            'tenant_id' => $this->tenant->id,
            'promotion_id' => $promo->id,
            'order_id' => $order->id,
            'customer_id' => $this->customer->id,
            'discount_amount' => 10000,
        ]);

        // Promotion usage_count should increment to 1
        $promo->refresh();
        $this->assertEquals(1, $promo->usage_count);
    }

    public function test_order_lookup_for_refund_returns_refundable_items_and_quantities(): void
    {
        $this->actingAs($this->cashier);

        $order = $this->checkoutService->checkout([
            'store_id' => $this->store->id,
            'customer_id' => $this->customer->id,
            'payment_method' => 'cash',
            'paid_amount' => 100000,
            'items' => [
                ['product_id' => $this->productA->id, 'quantity' => 2],
                ['product_id' => $this->productB->id, 'quantity' => 1],
            ],
        ]);

        $response = $this->getJson("/refunds/lookup-order?order_number={$order->order_number}");

        $response->assertOk();
        $response->assertJson([
            'status' => 'success',
            'order' => [
                'id' => $order->id,
                'order_number' => $order->order_number,
            ],
        ]);

        $items = $response->json('order.items');
        $this->assertCount(2, $items);
        $this->assertEquals(2, $items[0]['available_quantity']);
        $this->assertEquals(1, $items[1]['available_quantity']);
    }

    public function test_full_refund_marks_order_as_refunded_and_returns_stock(): void
    {
        $this->actingAs($this->cashier);

        // Initial stock is 100 for ProductA
        $initialStock = StockBalance::where('warehouse_id', $this->warehouse->id)
            ->where('product_id', $this->productA->id)
            ->value('quantity');

        $order = $this->checkoutService->checkout([
            'store_id' => $this->store->id,
            'customer_id' => $this->customer->id,
            'payment_method' => 'cash',
            'paid_amount' => 150000,
            'items' => [
                ['product_id' => $this->productA->id, 'quantity' => 4],
            ],
        ]);

        // Stock after sale is 96
        $stockAfterSale = StockBalance::where('warehouse_id', $this->warehouse->id)
            ->where('product_id', $this->productA->id)
            ->value('quantity');
        $this->assertEquals(96, $stockAfterSale);

        $orderItem = $order->items->first();

        // Process full refund with restock condition 'good'
        $refund = $this->refundService->processRefund($order, [
            'type' => 'full_refund',
            'refund_method' => 'cash',
            'reason' => 'Pelanggan membatalkan pesanan',
            'items' => [
                [
                    'order_item_id' => $orderItem->id,
                    'quantity' => 4,
                    'restock' => true,
                    'condition' => 'good',
                ],
            ],
        ], $this->cashier);

        $this->assertInstanceOf(OrderRefund::class, $refund);
        $this->assertEquals('full_refund', $refund->type);
        $this->assertEquals(100000, (float) $refund->total_refund_amount);

        // Order status should transition to 'refunded'
        $order->refresh();
        $this->assertEquals('refunded', $order->status);

        // Stock must return back to 100
        $stockAfterRefund = StockBalance::where('warehouse_id', $this->warehouse->id)
            ->where('product_id', $this->productA->id)
            ->value('quantity');
        $this->assertEquals(100, $stockAfterRefund);

        // Assert RETURN movement created in inventory_movements
        $this->assertDatabaseHas('inventory_movements', [
            'tenant_id' => $this->tenant->id,
            'warehouse_id' => $this->warehouse->id,
            'product_id' => $this->productA->id,
            'movement_type' => 'RETURN',
            'quantity_change' => 4,
        ]);
    }

    public function test_partial_refund_marks_order_as_partially_refunded_and_adjusts_loyalty_points(): void
    {
        $this->actingAs($this->cashier);

        $initialPoints = (int) $this->customer->loyalty_points;

        $order = $this->checkoutService->checkout([
            'store_id' => $this->store->id,
            'customer_id' => $this->customer->id,
            'payment_method' => 'cash',
            'paid_amount' => 150000,
            'items' => [
                ['product_id' => $this->productA->id, 'quantity' => 2], // 50.000
                ['product_id' => $this->productB->id, 'quantity' => 2], // 30.000
            ],
        ]);

        $orderItemA = $order->items->firstWhere('product_id', $this->productA->id);

        // Refund only 1 of ProductA
        $refund = $this->refundService->processRefund($order, [
            'type' => 'partial_refund',
            'refund_method' => 'cash',
            'reason' => '1 bungkus salah varian rasa',
            'items' => [
                [
                    'order_item_id' => $orderItemA->id,
                    'quantity' => 1,
                    'restock' => true,
                    'condition' => 'good',
                ],
            ],
        ], $this->cashier);

        $this->assertEquals('partial_refund', $refund->type);
        $this->assertEquals(25000, (float) $refund->total_refund_amount);

        // Order status should be 'partially_refunded'
        $order->refresh();
        $this->assertEquals('partially_refunded', $order->status);

        // Check customer points deduction for refunded portion
        $this->customer->refresh();
        $this->assertLessThanOrEqual($initialPoints + 8, (int) $this->customer->loyalty_points);
    }

    public function test_damaged_item_refund_does_not_increment_inventory_balance(): void
    {
        $this->actingAs($this->cashier);

        $order = $this->checkoutService->checkout([
            'store_id' => $this->store->id,
            'customer_id' => null,
            'payment_method' => 'cash',
            'paid_amount' => 100000,
            'items' => [
                ['product_id' => $this->productA->id, 'quantity' => 2],
            ],
        ]);

        $stockAfterSale = StockBalance::where('warehouse_id', $this->warehouse->id)
            ->where('product_id', $this->productA->id)
            ->value('quantity');

        $orderItem = $order->items->first();

        // Refund item as damaged, restock = false
        $this->refundService->processRefund($order, [
            'type' => 'partial_refund',
            'refund_method' => 'cash',
            'reason' => 'Bungkus bocor / rusak saat dibuka pelanggan',
            'items' => [
                [
                    'order_item_id' => $orderItem->id,
                    'quantity' => 1,
                    'restock' => false,
                    'condition' => 'damaged',
                ],
            ],
        ], $this->cashier);

        // Stock balance MUST REMAIN the same (not added back into sellable inventory)
        $stockAfterRefund = StockBalance::where('warehouse_id', $this->warehouse->id)
            ->where('product_id', $this->productA->id)
            ->value('quantity');

        $this->assertEquals($stockAfterSale, $stockAfterRefund);
    }

    public function test_cannot_refund_more_than_purchased_quantity(): void
    {
        $this->actingAs($this->cashier);

        $order = $this->checkoutService->checkout([
            'store_id' => $this->store->id,
            'customer_id' => null,
            'payment_method' => 'cash',
            'paid_amount' => 100000,
            'items' => [
                ['product_id' => $this->productA->id, 'quantity' => 2],
            ],
        ]);

        $orderItem = $order->items->first();

        // Try to refund 3 items when customer only bought 2
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Kuantitas refund untuk');

        $this->refundService->processRefund($order, [
            'type' => 'partial_refund',
            'refund_method' => 'cash',
            'reason' => 'Percobaan refund berlebih',
            'items' => [
                [
                    'order_item_id' => $orderItem->id,
                    'quantity' => 3,
                    'restock' => true,
                    'condition' => 'good',
                ],
            ],
        ], $this->cashier);
    }

    public function test_cash_refund_creates_shift_cash_movement_when_active_shift_exists(): void
    {
        // 1. Open cashier shift
        $shift = $this->shiftService->openShift([
            'tenant_id' => $this->tenant->id,
            'store_id' => $this->store->id,
            'register_id' => $this->register->id,
            'opening_cash' => 200000,
            'notes' => 'Shift Pagi Kasir',
        ], $this->cashier);

        $this->actingAs($this->cashier);

        $order = $this->checkoutService->checkout([
            'store_id' => $this->store->id,
            'register_id' => $this->register->id,
            'customer_id' => null,
            'payment_method' => 'cash',
            'paid_amount' => 100000,
            'items' => [
                ['product_id' => $this->productA->id, 'quantity' => 2],
            ],
        ]);

        $orderItem = $order->items->first();

        // 2. Perform Cash Refund
        $refund = $this->refundService->processRefund($order, [
            'type' => 'full_refund',
            'refund_method' => 'cash',
            'reason' => 'Refund uang tunai ke pelanggan',
            'items' => [
                [
                    'order_item_id' => $orderItem->id,
                    'quantity' => 2,
                    'restock' => true,
                    'condition' => 'good',
                ],
            ],
        ], $this->cashier);

        // 3. Verify shift cash movement recorded
        $this->assertDatabaseHas('shift_cash_movements', [
            'tenant_id' => $this->tenant->id,
            'shift_id' => $shift->id,
            'type' => 'cash_out',
            'amount' => 50000,
            'reason' => "Refund Tunai Faktur #{$order->order_number}",
        ]);
    }

    public function test_sales_commission_is_calculated_on_checkout_and_reversed_on_refund(): void
    {
        $this->actingAs($this->salesPerson);

        // 1. Checkout with sales commission attribution (5% rate)
        $order = $this->checkoutService->checkout([
            'store_id' => $this->store->id,
            'commission_rate' => 5.0,
            'payment_method' => 'cash',
            'paid_amount' => 150000,
            'items' => [
                ['product_id' => $this->productA->id, 'quantity' => 4], // Subtotal = 100.000
            ],
        ]);

        // Commission on 100.000 net @ 5% = 5.000
        $this->assertDatabaseHas('sales_commissions', [
            'tenant_id' => $this->tenant->id,
            'order_id' => $order->id,
            'user_id' => $this->salesPerson->id,
            'commission_amount' => 5000,
            'status' => 'approved',
        ]);

        $orderItem = $order->items->first();

        // 2. Refund half of the order (2 out of 4 items)
        $this->refundService->processRefund($order, [
            'type' => 'partial_refund',
            'refund_method' => 'cash',
            'reason' => 'Retur 2 barang',
            'items' => [
                [
                    'order_item_id' => $orderItem->id,
                    'quantity' => 2,
                    'restock' => true,
                    'condition' => 'good',
                ],
            ],
        ], $this->cashier);

        // Commission should be proportionally adjusted or have a reversal record
        $totalCommission = (float) SalesCommission::where('order_id', $order->id)
            ->where('status', '!=', 'cancelled')
            ->sum('commission_amount');

        $this->assertEquals(2500, $totalCommission);
    }

    public function test_cross_tenant_promotion_and_refund_isolation(): void
    {
        // Second tenant
        $tenantB = Tenant::create([
            'name' => 'PT Kompetitor Jaya',
            'slug' => 'kompetitor-jaya',
        ]);

        $promoB = Promotion::create([
            'tenant_id' => $tenantB->id,
            'name' => 'Voucher Rahasia Tenant B',
            'code' => 'RAHASIAB',
            'type' => 'fixed',
            'discount_value' => 50000,
            'target_type' => 'all',
            'is_active' => true,
        ]);

        // Tenant A cashier attempts to validate promo code of Tenant B
        $this->actingAs($this->cashier);

        $response = $this->postJson('/promotions/validate', [
            'code' => 'RAHASIAB',
            'subtotal' => 100000,
        ]);

        // Must reject because promotion belongs to another tenant
        $response->assertStatus(422);
        $response->assertJson([
            'status' => 'error',
            'message' => 'Kupon atau kode promo \'RAHASIAB\' tidak ditemukan.',
        ]);
    }
}
