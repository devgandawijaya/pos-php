<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\InventoryMovement;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderPayment;
use App\Models\OrderRefund;
use App\Models\Product;
use App\Models\Promotion;
use App\Models\Shift;
use App\Models\ShiftCashMovement;
use App\Models\Supplier;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LargeScaleDummyDataTest extends TestCase
{
    use RefreshDatabase;

    public function test_database_seeder_generates_more_than_100_records_for_all_operational_entities(): void
    {
        // Run full database seeder including LargeScaleDummyDataSeeder
        $this->seed(DatabaseSeeder::class);

        // Verify Products > 100
        $productCount = Product::count();
        $this->assertGreaterThan(100, $productCount, "Product count should exceed 100, actual: {$productCount}");

        // Verify Customers > 100
        $customerCount = Customer::count();
        $this->assertGreaterThan(100, $customerCount, "Customer count should exceed 100, actual: {$customerCount}");

        // Verify Suppliers > 100
        $supplierCount = Supplier::count();
        $this->assertGreaterThan(100, $supplierCount, "Supplier count should exceed 100, actual: {$supplierCount}");

        // Verify Promotions > 100
        $promotionCount = Promotion::count();
        $this->assertGreaterThan(100, $promotionCount, "Promotion count should exceed 100, actual: {$promotionCount}");

        // Verify Shifts > 100
        $shiftCount = Shift::count();
        $this->assertGreaterThan(100, $shiftCount, "Shift count should exceed 100, actual: {$shiftCount}");

        // Verify Orders > 100
        $orderCount = Order::count();
        $this->assertGreaterThan(100, $orderCount, "Order count should exceed 100, actual: {$orderCount}");

        // Verify Order Items > 100
        $orderItemCount = OrderItem::count();
        $this->assertGreaterThan(100, $orderItemCount, "OrderItem count should exceed 100, actual: {$orderItemCount}");

        // Verify Order Payments > 100
        $orderPaymentCount = OrderPayment::count();
        $this->assertGreaterThan(100, $orderPaymentCount, "OrderPayment count should exceed 100, actual: {$orderPaymentCount}");

        // Verify Inventory Movements > 100
        $inventoryMovementCount = InventoryMovement::count();
        $this->assertGreaterThan(100, $inventoryMovementCount, "InventoryMovement count should exceed 100, actual: {$inventoryMovementCount}");

        // Verify Shift Cash Movements exist
        $cashMovementCount = ShiftCashMovement::count();
        $this->assertGreaterThan(0, $cashMovementCount);

        // Verify Refunds exist
        $refundCount = OrderRefund::count();
        $this->assertGreaterThan(0, $refundCount);
    }
}
