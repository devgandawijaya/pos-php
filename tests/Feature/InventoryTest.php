<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\StockBalance;
use App\Models\StockTransfer;
use App\Models\StockTransferItem;
use App\Models\Store;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\Unit;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\InventoryService;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;
    protected Store $store;
    protected Warehouse $warehouseA;
    protected Warehouse $warehouseB;
    protected User $user;
    protected Product $product;
    protected InventoryService $inventoryService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name' => 'PT Retail Perkasa',
            'slug' => 'retail-perkasa',
        ]);

        $this->store = Store::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Toko Pusat',
            'code' => 'STORE-01',
        ]);

        $this->warehouseA = Warehouse::create([
            'tenant_id' => $this->tenant->id,
            'store_id' => $this->store->id,
            'name' => 'Gudang Pusat Cakung',
            'code' => 'WH-01',
            'is_active' => true,
        ]);

        $this->warehouseB = Warehouse::create([
            'tenant_id' => $this->tenant->id,
            'store_id' => $this->store->id,
            'name' => 'Gudang Cabang Barat',
            'code' => 'WH-02',
            'is_active' => true,
        ]);

        $this->user = User::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Inventory Manager',
            'email' => 'manager@retail-perkasa.test',
            'password' => bcrypt('password'),
            'status' => 'active',
        ]);
        $this->user->stores()->syncWithoutDetaching([$this->store->id => ['is_default' => true, 'tenant_id' => $this->tenant->id]]);

        $unit = Unit::create([
            'tenant_id' => $this->tenant->id,
            'code' => 'PCS',
            'name' => 'Pieces',
        ]);

        $this->product = Product::create([
            'tenant_id' => $this->tenant->id,
            'unit_id' => $unit->id,
            'sku' => 'INDOMIE-GRG',
            'name' => 'Indomie Goreng 85g',
            'purchase_cost' => 3000,
            'selling_price' => 4500,
            'track_inventory' => true,
            'status' => 'active',
        ]);

        $this->inventoryService = app(InventoryService::class);
    }

    public function test_stock_movement_creates_immutable_ledger_and_updates_balance(): void
    {
        // 1. Initial balance movement of 100 pcs
        $movement1 = $this->inventoryService->recordMovement(
            warehouseId: $this->warehouseA->id,
            productId: $this->product->id,
            movementType: 'INITIAL_BALANCE',
            quantityChange: 100,
            unitCost: 3000,
            notes: 'Saldo awal gudang',
            userId: $this->user->id
        );

        $this->assertEquals(0, $movement1->balance_before);
        $this->assertEquals(100, $movement1->balance_after);
        $this->assertEquals(100, $movement1->quantity_change);

        // Verify stock balance row
        $balance = StockBalance::where('warehouse_id', $this->warehouseA->id)
            ->where('product_id', $this->product->id)
            ->first();

        $this->assertNotNull($balance);
        $this->assertEquals(100, (float) $balance->quantity);

        // 2. Secondary sale / deduct movement of 20 pcs
        $movement2 = $this->inventoryService->recordMovement(
            warehouseId: $this->warehouseA->id,
            productId: $this->product->id,
            movementType: 'SALE',
            quantityChange: -20,
            unitCost: 3000,
            notes: 'Penjualan kasir',
            userId: $this->user->id
        );

        $this->assertEquals(100, $movement2->balance_before);
        $this->assertEquals(80, $movement2->balance_after);
        $this->assertEquals(-20, $movement2->quantity_change);

        $balance->refresh();
        $this->assertEquals(80, (float) $balance->quantity);
    }

    public function test_negative_stock_prevention_throws_exception(): void
    {
        // Set initial stock to 10
        $this->inventoryService->recordMovement(
            warehouseId: $this->warehouseA->id,
            productId: $this->product->id,
            movementType: 'INITIAL_BALANCE',
            quantityChange: 10,
            userId: $this->user->id
        );

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Stok tidak mencukupi');

        // Attempting to deduct 15 when only 10 available
        $this->inventoryService->recordMovement(
            warehouseId: $this->warehouseA->id,
            productId: $this->product->id,
            movementType: 'SALE',
            quantityChange: -15,
            userId: $this->user->id,
            allowNegative: false
        );
    }

    public function test_stock_transfer_dispatch_and_receive_flow(): void
    {
        // 1. Initial stock in Warehouse A = 50 pcs
        $this->inventoryService->recordMovement(
            warehouseId: $this->warehouseA->id,
            productId: $this->product->id,
            movementType: 'INITIAL_BALANCE',
            quantityChange: 50,
            userId: $this->user->id
        );

        // 2. Create Stock Transfer from A to B (20 pcs)
        $transfer = StockTransfer::create([
            'tenant_id' => $this->tenant->id,
            'transfer_number' => 'TRF-TEST-001',
            'source_warehouse_id' => $this->warehouseA->id,
            'destination_warehouse_id' => $this->warehouseB->id,
            'status' => 'draft',
            'user_id' => $this->user->id,
        ]);

        StockTransferItem::create([
            'tenant_id' => $this->tenant->id,
            'stock_transfer_id' => $transfer->id,
            'product_id' => $this->product->id,
            'quantity_requested' => 20,
        ]);

        // 3. Dispatch Transfer
        $this->inventoryService->dispatchTransfer($transfer, $this->user->id);

        $transfer->refresh();
        $this->assertEquals('in_transit', $transfer->status);
        $this->assertNotNull($transfer->dispatched_at);

        // Warehouse A balance should now be 50 - 20 = 30
        $balanceA = StockBalance::where('warehouse_id', $this->warehouseA->id)
            ->where('product_id', $this->product->id)
            ->first();
        $this->assertEquals(30, (float) $balanceA->quantity);

        // 4. Receive Transfer in Warehouse B
        $this->inventoryService->receiveTransfer($transfer, [], $this->user->id);

        $transfer->refresh();
        $this->assertEquals('completed', $transfer->status);
        $this->assertNotNull($transfer->received_at);

        // Warehouse B balance should now be 20
        $balanceB = StockBalance::where('warehouse_id', $this->warehouseB->id)
            ->where('product_id', $this->product->id)
            ->first();
        $this->assertEquals(20, (float) $balanceB->quantity);
    }

    public function test_purchase_order_creation_and_goods_receipt(): void
    {
        $supplier = Supplier::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'PT Indofood CBP Sukses',
            'code' => 'SUP-INDO',
        ]);

        // Create PO for 100 pcs
        $po = PurchaseOrder::create([
            'tenant_id' => $this->tenant->id,
            'po_number' => 'PO-TEST-001',
            'supplier_id' => $supplier->id,
            'warehouse_id' => $this->warehouseA->id,
            'status' => 'approved',
            'order_date' => now()->toDateString(),
            'subtotal' => 300000,
            'tax_amount' => 33000,
            'total_amount' => 333000,
            'user_id' => $this->user->id,
        ]);

        $poItem = PurchaseOrderItem::create([
            'tenant_id' => $this->tenant->id,
            'purchase_order_id' => $po->id,
            'product_id' => $this->product->id,
            'quantity_ordered' => 100,
            'quantity_received' => 0,
            'unit_cost' => 3000,
            'subtotal' => 300000,
        ]);

        // Receive goods partially (40 pcs)
        $receipt = $this->inventoryService->receiveGoods(
            po: $po,
            receivedItems: [
                ['purchase_order_item_id' => $poItem->id, 'quantity_received' => 40],
            ],
            notes: 'Penerimaan tahap 1',
            userId: $this->user->id
        );

        $this->assertNotNull($receipt);
        $po->refresh();
        $this->assertEquals('partially_received', $po->status);

        $poItem->refresh();
        $this->assertEquals(40, (float) $poItem->quantity_received);

        // Warehouse A should have 40 pcs in stock
        $balance = StockBalance::where('warehouse_id', $this->warehouseA->id)
            ->where('product_id', $this->product->id)
            ->first();
        $this->assertEquals(40, (float) $balance->quantity);

        // Receive remainder (60 pcs)
        $this->inventoryService->receiveGoods(
            po: $po,
            receivedItems: [
                ['purchase_order_item_id' => $poItem->id, 'quantity_received' => 60],
            ],
            notes: 'Penerimaan tahap 2 (pelunasan)',
            userId: $this->user->id
        );

        $po->refresh();
        $this->assertEquals('received', $po->status);

        $balance->refresh();
        $this->assertEquals(100, (float) $balance->quantity);
    }

    public function test_authenticated_user_can_view_inventory_and_make_adjustment(): void
    {
        $response = $this->actingAs($this->user)->get('/inventory');
        $response->assertOk();

        // Perform adjustment via web route
        $adjustResponse = $this->actingAs($this->user)->post('/inventory/adjust', [
            'warehouse_id' => $this->warehouseA->id,
            'product_id' => $this->product->id,
            'type' => 'in',
            'quantity' => 25,
            'reason' => 'correction',
            'notes' => 'Audit stok fisik mingguan',
        ]);

        $adjustResponse->assertSessionHasNoErrors();
        $adjustResponse->assertRedirect();

        $balance = StockBalance::where('warehouse_id', $this->warehouseA->id)
            ->where('product_id', $this->product->id)
            ->first();
        $this->assertEquals(25, (float) $balance->quantity);
    }

    public function test_inventory_api_endpoints_with_sanctum_token(): void
    {
        // Add some stock
        $this->inventoryService->recordMovement(
            warehouseId: $this->warehouseA->id,
            productId: $this->product->id,
            movementType: 'INITIAL_BALANCE',
            quantityChange: 50,
            userId: $this->user->id
        );

        $token = $this->user->createToken('test-token')->plainTextToken;

        // Test API balances
        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/inventory/balances');

        $response->assertOk()
            ->assertJsonStructure([
                'status',
                'data' => [
                    '*' => ['id', 'quantity', 'product', 'warehouse']
                ]
            ]);

        // Test API movements
        $movResponse = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/v1/inventory/movements');

        $movResponse->assertOk()
            ->assertJsonStructure([
                'status',
                'data' => [
                    '*' => ['id', 'movement_type', 'quantity_change', 'balance_before', 'balance_after']
                ]
            ]);
    }
}
