<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\Register;
use App\Models\StockBalance;
use App\Models\Store;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\InventoryService;
use App\Services\PosCheckoutService;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PosEngineTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Store $store;

    protected Register $register;

    protected Warehouse $warehouse;

    protected User $cashier;

    protected Customer $customer;

    protected Product $productA;

    protected Product $productB;

    protected PosCheckoutService $checkoutService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'PT Ritel Modern Sejahtera',
            'slug' => 'ritel-modern',
        ]);

        $this->store = Store::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Toko Cabang Thamrin',
            'code' => 'THAMRIN',
            'tax_percentage' => 11.00,
        ]);

        $this->register = Register::create([
            'tenant_id' => $this->tenant->id,
            'store_id' => $this->store->id,
            'name' => 'Kasir 01',
            'code' => 'REG-01',
            'is_active' => true,
        ]);

        $this->warehouse = Warehouse::create([
            'tenant_id' => $this->tenant->id,
            'store_id' => $this->store->id,
            'name' => 'Gudang Toko Thamrin',
            'code' => 'WH-THAMRIN',
            'is_active' => true,
        ]);

        $this->cashier = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Budi Kasir',
            'email' => 'kasir@ritel-modern.test',
            'password' => bcrypt('password'),
            'status' => 'active',
        ]);
        $this->cashier->stores()->syncWithoutDetaching([
            $this->store->id => ['is_default' => true, 'tenant_id' => $this->tenant->id],
        ]);

        $this->customer = Customer::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Andi Pelanggan',
            'code' => 'CUST-001',
            'loyalty_points' => 0,
            'status' => 'active',
        ]);

        $unit = Unit::create([
            'tenant_id' => $this->tenant->id,
            'code' => 'PCS',
            'name' => 'Pieces',
        ]);

        $this->productA = Product::create([
            'tenant_id' => $this->tenant->id,
            'unit_id' => $unit->id,
            'sku' => 'KOPI-LOKAL',
            'barcode' => '8990001',
            'name' => 'Kopi Arabika 250g',
            'purchase_cost' => 30000,
            'selling_price' => 50000,
            'track_inventory' => true,
            'status' => 'active',
        ]);

        $this->productB = Product::create([
            'tenant_id' => $this->tenant->id,
            'unit_id' => $unit->id,
            'sku' => 'TEH-MELATI',
            'barcode' => '8990002',
            'name' => 'Teh Melati Wangi',
            'purchase_cost' => 10000,
            'selling_price' => 20000,
            'track_inventory' => true,
            'status' => 'active',
        ]);

        // Seed stock: 50 pcs of Kopi, 100 pcs of Teh
        $inventoryService = app(InventoryService::class);
        $inventoryService->recordMovement(
            warehouseId: $this->warehouse->id,
            productId: $this->productA->id,
            movementType: 'INITIAL_BALANCE',
            quantityChange: 50,
            userId: $this->cashier->id
        );
        $inventoryService->recordMovement(
            warehouseId: $this->warehouse->id,
            productId: $this->productB->id,
            movementType: 'INITIAL_BALANCE',
            quantityChange: 100,
            userId: $this->cashier->id
        );

        $this->checkoutService = app(PosCheckoutService::class);
    }

    public function test_pos_terminal_screen_can_be_rendered(): void
    {
        $this->productA->update(['image_url' => 'https://example.com/kopi.jpg']);

        $response = $this->actingAs($this->cashier)->get('/pos');
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Pos/Terminal')
            ->has('catalog', 2)
            ->where('catalog.0.image_url', 'https://example.com/kopi.jpg')
        );
    }

    public function test_checkout_creates_order_and_calculates_financials(): void
    {
        // Buy 2 Kopi (@50,000 = 100,000) and 1 Teh (@20,000 = 20,000)
        // Subtotal = 120,000
        // Tax 11% = 13,200
        // Grand Total = 133,200
        $data = [
            'store_id' => $this->store->id,
            'register_id' => $this->register->id,
            'customer_id' => $this->customer->id,
            'payment_method' => 'cash',
            'paid_amount' => 150000,
            'items' => [
                ['product_id' => $this->productA->id, 'quantity' => 2],
                ['product_id' => $this->productB->id, 'quantity' => 1],
            ],
        ];

        $order = $this->checkoutService->checkout($data);

        $this->assertNotNull($order);
        $this->assertEquals(120000, (float) $order->subtotal);
        $this->assertEquals(13200, (float) $order->tax_amount);
        $this->assertEquals(133200, (float) $order->total_amount);
        $this->assertEquals(150000, (float) $order->paid_amount);
        $this->assertEquals(16800, (float) $order->change_amount);
        $this->assertStringStartsWith('INV/THAMRIN/', $order->order_number);

        // Verify order items snapshot
        $this->assertCount(2, $order->items);
        $itemA = $order->items->firstWhere('product_id', $this->productA->id);
        $this->assertEquals(2, (float) $itemA->quantity);
        $this->assertEquals(50000, (float) $itemA->unit_price);
        $this->assertEquals(30000, (float) $itemA->unit_cost);
        $this->assertEquals(100000, (float) $itemA->subtotal);

        // Verify inventory deduction
        $balanceA = StockBalance::where('warehouse_id', $this->warehouse->id)
            ->where('product_id', $this->productA->id)
            ->first();
        $this->assertEquals(48, (float) $balanceA->quantity); // 50 - 2

        $balanceB = StockBalance::where('warehouse_id', $this->warehouse->id)
            ->where('product_id', $this->productB->id)
            ->first();
        $this->assertEquals(99, (float) $balanceB->quantity); // 100 - 1

        // Verify customer loyalty points (133,200 / 10,000 = 13 points)
        $this->customer->refresh();
        $this->assertEquals(13, $this->customer->loyalty_points);
    }

    public function test_negative_stock_prevention_on_checkout(): void
    {
        // Try buying 60 Kopi when only 50 in stock
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Stok tidak mencukupi');

        $this->checkoutService->checkout([
            'store_id' => $this->store->id,
            'register_id' => $this->register->id,
            'payment_method' => 'cash',
            'paid_amount' => 3500000,
            'items' => [
                ['product_id' => $this->productA->id, 'quantity' => 60],
            ],
        ]);
    }

    public function test_idempotency_prevents_duplicate_checkout(): void
    {
        $idempotencyKey = 'IDEM-TEST-12345';
        $data = [
            'store_id' => $this->store->id,
            'register_id' => $this->register->id,
            'payment_method' => 'cash',
            'paid_amount' => 100000,
            'items' => [
                ['product_id' => $this->productA->id, 'quantity' => 1],
            ],
        ];

        // First attempt
        $order1 = $this->checkoutService->checkout($data, $idempotencyKey);

        // Second attempt with identical idempotency key
        $order2 = $this->checkoutService->checkout($data, $idempotencyKey);

        $this->assertEquals($order1->id, $order2->id);
        $this->assertEquals($order1->order_number, $order2->order_number);

        // Total orders in DB must be exactly 1
        $this->assertEquals(1, Order::where('tenant_id', $this->tenant->id)->count());

        // Stock must have only decremented once: 50 - 1 = 49
        $balance = StockBalance::where('warehouse_id', $this->warehouse->id)
            ->where('product_id', $this->productA->id)
            ->first();
        $this->assertEquals(49, (float) $balance->quantity);
    }

    public function test_hold_and_resume_cart_workflow(): void
    {
        $cartPayload = [
            'items' => [
                ['product_id' => $this->productA->id, 'quantity' => 3],
            ],
            'customer_id' => $this->customer->id,
        ];

        // 1. Hold cart
        $held = $this->checkoutService->holdCart([
            'store_id' => $this->store->id,
            'register_id' => $this->register->id,
            'customer_id' => $this->customer->id,
            'reference_note' => 'Antrean Meja 4',
            'cart_payload' => $cartPayload,
        ]);

        $this->assertNotNull($held);
        $this->assertEquals('Antrean Meja 4', $held->reference_note);

        // 2. Resume cart
        $resumedPayload = $this->checkoutService->resumeCart($held->id);

        $this->assertEquals($cartPayload, $resumedPayload);
        $this->assertDatabaseMissing('held_orders', ['id' => $held->id]);
    }

    public function test_checkout_via_http_endpoint(): void
    {
        $response = $this->actingAs($this->cashier)->postJson('/pos/checkout', [
            'store_id' => $this->store->id,
            'register_id' => $this->register->id,
            'payment_method' => 'cash',
            'paid_amount' => 100000,
            'items' => [
                ['product_id' => $this->productA->id, 'quantity' => 1],
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonStructure([
                'status',
                'order' => ['id', 'order_number', 'total_amount', 'paid_amount', 'change_amount'],
            ]);
    }

    public function test_checkout_via_sanctum_api(): void
    {
        $token = $this->cashier->createToken('pos-cashier-token')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/v1/pos/checkout', [
                'store_id' => $this->store->id,
                'register_id' => $this->register->id,
                'payment_method' => 'cash',
                'paid_amount' => 100000,
                'items' => [
                    ['product_id' => $this->productB->id, 'quantity' => 2],
                ],
            ]);

        $response->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonStructure([
                'status',
                'order' => ['id', 'order_number', 'total_amount'],
            ]);
    }
}
