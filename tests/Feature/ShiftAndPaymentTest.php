<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderPayment;
use App\Models\Product;
use App\Models\Register;
use App\Models\Shift;
use App\Models\StockBalance;
use App\Models\Store;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\Payment\MockPaymentGatewayService;
use App\Services\PosCheckoutService;
use App\Services\ShiftService;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShiftAndPaymentTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Store $store;

    protected Register $register;

    protected Warehouse $warehouse;

    protected User $cashier;

    protected User $supervisor;

    protected Product $product;

    protected ShiftService $shiftService;

    protected PosCheckoutService $checkoutService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'PT Retail Multi Usaha',
            'slug' => 'retail-multi-usaha',
        ]);

        $this->store = Store::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Store Mega Kuningan',
            'code' => 'KUNINGAN',
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
            'name' => 'Gudang Kuningan',
            'code' => 'WH-KUNINGAN',
            'is_active' => true,
        ]);

        $this->cashier = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Kasir Siti',
            'email' => 'siti.kasir@retail.test',
            'password' => bcrypt('password'),
            'status' => 'active',
        ]);
        $this->cashier->stores()->syncWithoutDetaching([
            $this->store->id => ['is_default' => true, 'tenant_id' => $this->tenant->id],
        ]);

        $this->supervisor = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Supervisor Doni',
            'email' => 'doni.spv@retail.test',
            'password' => bcrypt('password'),
            'status' => 'active',
        ]);
        $this->supervisor->stores()->syncWithoutDetaching([
            $this->store->id => ['is_default' => true, 'tenant_id' => $this->tenant->id],
        ]);

        $unit = Unit::create([
            'tenant_id' => $this->tenant->id,
            'code' => 'PCS',
            'name' => 'Pieces',
        ]);

        $this->product = Product::create([
            'tenant_id' => $this->tenant->id,
            'unit_id' => $unit->id,
            'sku' => 'SNACK-01',
            'barcode' => '899123456',
            'name' => 'Snack Keripik Kentang',
            'purchase_cost' => 10000,
            'selling_price' => 20000,
            'track_inventory' => true,
            'status' => 'active',
        ]);

        StockBalance::create([
            'tenant_id' => $this->tenant->id,
            'warehouse_id' => $this->warehouse->id,
            'product_id' => $this->product->id,
            'quantity' => 100,
            'reserved_quantity' => 0,
        ]);

        $this->shiftService = app(ShiftService::class);
        $this->checkoutService = app(PosCheckoutService::class);
    }

    public function test_cashier_can_open_shift_with_opening_cash(): void
    {
        $shift = $this->shiftService->openShift([
            'tenant_id' => $this->tenant->id,
            'store_id' => $this->store->id,
            'register_id' => $this->register->id,
            'opening_cash' => 250000,
            'notes' => 'Pecahan kembalian lengkap',
        ], $this->cashier);

        $this->assertInstanceOf(Shift::class, $shift);
        $this->assertEquals('open', $shift->status);
        $this->assertEquals(250000, (float) $shift->opening_cash);
        $this->assertEquals($this->cashier->id, $shift->user_id);
        $this->assertEquals('not_required', $shift->approval_status);
        $this->assertNotNull($shift->opened_at);
        $this->assertNull($shift->closed_at);
    }

    public function test_cannot_open_two_active_shifts_on_same_register(): void
    {
        $this->shiftService->openShift([
            'tenant_id' => $this->tenant->id,
            'store_id' => $this->store->id,
            'register_id' => $this->register->id,
            'opening_cash' => 200000,
        ], $this->cashier);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('masih memiliki shift aktif');

        $this->shiftService->openShift([
            'tenant_id' => $this->tenant->id,
            'store_id' => $this->store->id,
            'register_id' => $this->register->id,
            'opening_cash' => 150000,
        ], $this->cashier);
    }

    public function test_cashier_can_record_cash_in_and_cash_out_with_mandatory_reason(): void
    {
        $shift = $this->shiftService->openShift([
            'tenant_id' => $this->tenant->id,
            'store_id' => $this->store->id,
            'register_id' => $this->register->id,
            'opening_cash' => 200000,
        ], $this->cashier);

        // Record Cash In
        $cashIn = $this->shiftService->recordCashMovement(
            shift: $shift,
            type: 'cash_in',
            amount: 50000,
            reason: 'Modal Kembalian Tambahan',
            notes: 'Pecahan 2.000',
            user: $this->cashier
        );

        $this->assertEquals('cash_in', $cashIn->type);
        $this->assertEquals(50000, (float) $cashIn->amount);

        // Record Cash Out
        $cashOut = $this->shiftService->recordCashMovement(
            shift: $shift,
            type: 'cash_out',
            amount: 25000,
            reason: 'Beli Kertas Struk Thermal',
            notes: 'Nota terlampir',
            user: $this->cashier
        );

        $this->assertEquals('cash_out', $cashOut->type);
        $this->assertEquals(25000, (float) $cashOut->amount);

        $this->assertCount(2, $shift->movements);
    }

    public function test_pos_checkout_associates_with_active_shift(): void
    {
        $shift = $this->shiftService->openShift([
            'tenant_id' => $this->tenant->id,
            'store_id' => $this->store->id,
            'register_id' => $this->register->id,
            'opening_cash' => 200000,
        ], $this->cashier);

        $this->actingAs($this->cashier);

        // Checkout 2 items (2 * 20.000 = 40.000 + 11% PPN = 44.400)
        $order = $this->checkoutService->checkout([
            'tenant_id' => $this->tenant->id,
            'store_id' => $this->store->id,
            'register_id' => $this->register->id,
            'payment_method' => 'cash',
            'paid_amount' => 50000,
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 2,
                    'discount_amount' => 0,
                ],
            ],
        ]);

        $this->assertEquals($shift->id, $order->shift_id);
        $this->assertEquals('completed', $order->status);

        $payment = $order->payments()->first();
        $this->assertNotNull($payment);
        $this->assertEquals($shift->id, $payment->shift_id);
        $this->assertEquals('cash', $payment->payment_method);
        $this->assertEquals(44400, (float) $payment->amount);
    }

    public function test_split_payment_checkout_records_all_payment_methods_and_amounts(): void
    {
        $shift = $this->shiftService->openShift([
            'tenant_id' => $this->tenant->id,
            'store_id' => $this->store->id,
            'register_id' => $this->register->id,
            'opening_cash' => 200000,
        ], $this->cashier);

        $this->actingAs($this->cashier);

        // Subtotal = 2 * 20.000 = 40.000, Tax (11%) = 4.400, Total = 44.400
        // Split: Cash 20.000 + QRIS 24.400
        $order = $this->checkoutService->checkout([
            'tenant_id' => $this->tenant->id,
            'store_id' => $this->store->id,
            'register_id' => $this->register->id,
            'payments' => [
                [
                    'payment_method' => 'cash',
                    'amount' => 20000,
                    'paid_amount' => 20000,
                ],
                [
                    'payment_method' => 'qris',
                    'amount' => 24400,
                    'reference_number' => 'QRIS-REF-9988',
                ],
            ],
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 2,
                ],
            ],
        ]);

        $this->assertEquals('split', $order->payment_method);
        $this->assertEquals(44400, (float) $order->total_amount);
        $this->assertCount(2, $order->payments);

        $cashPayment = $order->payments()->where('payment_method', 'cash')->first();
        $qrisPayment = $order->payments()->where('payment_method', 'qris')->first();

        $this->assertNotNull($cashPayment);
        $this->assertEquals(20000, (float) $cashPayment->amount);
        $this->assertEquals($shift->id, $cashPayment->shift_id);

        $this->assertNotNull($qrisPayment);
        $this->assertEquals(24400, (float) $qrisPayment->amount);
        $this->assertEquals('QRIS-REF-9988', $qrisPayment->reference_number);
        $this->assertEquals($shift->id, $qrisPayment->shift_id);
    }

    public function test_closing_shift_calculates_expected_cash_accurately_and_isolates_non_cash(): void
    {
        $shift = $this->shiftService->openShift([
            'tenant_id' => $this->tenant->id,
            'store_id' => $this->store->id,
            'register_id' => $this->register->id,
            'opening_cash' => 200000,
        ], $this->cashier);

        $this->actingAs($this->cashier);

        // 1. Cash sale: 44.400
        $this->checkoutService->checkout([
            'tenant_id' => $this->tenant->id,
            'store_id' => $this->store->id,
            'register_id' => $this->register->id,
            'payment_method' => 'cash',
            'paid_amount' => 50000,
            'items' => [['product_id' => $this->product->id, 'quantity' => 2]],
        ]);

        // 2. Non-cash sale (QRIS): 44.400 -> MUST NOT enter physical drawer expected cash!
        $this->checkoutService->checkout([
            'tenant_id' => $this->tenant->id,
            'store_id' => $this->store->id,
            'register_id' => $this->register->id,
            'payment_method' => 'qris',
            'paid_amount' => 44400,
            'payment_reference' => 'QRIS-1122',
            'items' => [['product_id' => $this->product->id, 'quantity' => 2]],
        ]);

        // 3. Cash In: 30.000
        $this->shiftService->recordCashMovement($shift, 'cash_in', 30000, 'Modal Tambahan');

        // 4. Cash Out: 10.000
        $this->shiftService->recordCashMovement($shift, 'cash_out', 10000, 'Beli Konsumsi');

        // Calculation:
        // Expected Cash = 200.000 (opening) + 44.400 (cash sale) + 30.000 (in) - 10.000 (out) = 264.400
        $summary = $this->shiftService->calculateExpectedCash($shift);

        $this->assertEquals(200000, $summary['opening_cash']);
        $this->assertEquals(44400, $summary['cash_sales']);
        $this->assertEquals(44400, $summary['non_cash_sales']['qris']);
        $this->assertEquals(44400, $summary['total_non_cash_sales']);
        $this->assertEquals(88800, $summary['total_sales']);
        $this->assertEquals(30000, $summary['cash_in']);
        $this->assertEquals(10000, $summary['cash_out']);
        $this->assertEquals(264400, $summary['expected_cash']);

        // Close shift with exact match (264.400)
        $closedShift = $this->shiftService->closeShift($shift, 264400, 'Shift lancar, kas seimbang');

        $this->assertEquals('closed', $closedShift->status);
        $this->assertEquals(264400, (float) $closedShift->actual_cash);
        $this->assertEquals(264400, (float) $closedShift->expected_cash);
        $this->assertEquals(0, (float) $closedShift->cash_difference);
        $this->assertEquals('approved', $closedShift->approval_status);
        $this->assertNotNull($closedShift->closed_at);
    }

    public function test_closing_shift_with_discrepancy_requires_supervisor_approval(): void
    {
        $shift = $this->shiftService->openShift([
            'tenant_id' => $this->tenant->id,
            'store_id' => $this->store->id,
            'register_id' => $this->register->id,
            'opening_cash' => 200000,
        ], $this->cashier);

        // Expected cash is 200.000
        // Cashier counts actual cash: 195.000 (Shortage of 5.000)
        $closedShift = $this->shiftService->closeShift($shift, 195000, 'Selisih 5rb uang kembalian');

        $this->assertEquals('closed', $closedShift->status);
        $this->assertEquals(-5000, (float) $closedShift->cash_difference);
        $this->assertEquals('pending', $closedShift->approval_status);

        // Supervisor review & approval
        $approvedShift = $this->shiftService->approveShift($closedShift, $this->supervisor, 'Telah diverifikasi kembalian kurang');

        $this->assertEquals('approved', $approvedShift->approval_status);
        $this->assertEquals($this->supervisor->id, $approvedShift->approved_by_id);
        $this->assertNotNull($approvedShift->approved_at);
    }

    public function test_payment_gateway_webhook_verifies_signature_and_updates_payment_status_idempotently(): void
    {
        $gateway = app(MockPaymentGatewayService::class);
        $secretKey = 'pos_default_secret_token_123';

        $order = Order::create([
            'tenant_id' => $this->tenant->id,
            'store_id' => $this->store->id,
            'order_number' => 'INV/TEST/20261101/0001',
            'status' => 'completed',
            'subtotal' => 20000,
            'total_amount' => 22200,
            'payment_method' => 'qris',
        ]);

        $payment = OrderPayment::create([
            'tenant_id' => $this->tenant->id,
            'order_id' => $order->id,
            'payment_method' => 'qris',
            'amount' => 22200,
            'gateway_transaction_id' => 'GW-TEST-001',
            'status' => 'pending',
        ]);

        $payload = [
            'event_id' => 'EVT-WEBHOOK-999',
            'order_number' => $order->order_number,
            'gateway_transaction_id' => 'GW-TEST-001',
            'transaction_status' => 'settlement',
            'reference_number' => 'QRIS-BANK-SETTLE-888',
            'approval_code' => 'APPR-777',
        ];

        $rawBody = json_encode($payload);
        $validSignature = hash_hmac('sha256', $rawBody, $secretKey);

        // 1. Test POST with valid signature
        $response = $this->postJson('/api/v1/payments/webhook', $payload, [
            'X-Signature' => $validSignature,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'status' => 'success',
            'result' => [
                'status' => 'processed',
                'payment_status' => 'success',
            ],
        ]);

        $payment->refresh();
        $this->assertEquals('success', $payment->status);
        $this->assertEquals('QRIS-BANK-SETTLE-888', $payment->reference_number);

        // 2. Test Idempotency: Second call with same event_id should not reprocess
        $duplicateResponse = $this->postJson('/api/v1/payments/webhook', $payload, [
            'X-Signature' => $validSignature,
        ]);

        $duplicateResponse->assertStatus(200);
        $duplicateResponse->assertJson([
            'result' => [
                'status' => 'already_processed',
            ],
        ]);

        // 3. Test Invalid Signature rejection
        $invalidResponse = $this->postJson('/api/v1/payments/webhook', $payload, [
            'X-Signature' => 'invalid_signature_hash',
        ]);

        $invalidResponse->assertStatus(401);
    }

    public function test_tenant_isolation_for_shifts_and_cash_movements(): void
    {
        $tenantB = Tenant::create([
            'name' => 'Tenant Lain',
            'slug' => 'tenant-lain',
        ]);

        $storeB = Store::create([
            'tenant_id' => $tenantB->id,
            'name' => 'Toko B',
            'code' => 'TB',
        ]);

        $registerB = Register::create([
            'tenant_id' => $tenantB->id,
            'store_id' => $storeB->id,
            'name' => 'Reg B',
            'code' => 'REG-B',
            'is_active' => true,
        ]);

        $shiftA = $this->shiftService->openShift([
            'tenant_id' => $this->tenant->id,
            'store_id' => $this->store->id,
            'register_id' => $this->register->id,
            'opening_cash' => 100000,
        ], $this->cashier);

        $cashierB = User::create([
            'tenant_id' => $tenantB->id,
            'name' => 'Kasir Tenant B',
            'email' => 'kasir@tenant-b.test',
            'password' => bcrypt('password'),
            'status' => 'active',
        ]);

        $this->actingAs($cashierB);

        // Cashier B attempts to mutate cash on Shift A (Tenant A) -> global tenant scope prevents visibility (404 Not Found)
        $response = $this->postJson("/shifts/{$shiftA->id}/cash-movement", [
            'type' => 'cash_in',
            'amount' => 50000,
            'reason' => 'Unauthorized intrusion',
        ]);

        $response->assertNotFound();
    }
}
