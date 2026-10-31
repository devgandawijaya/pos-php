<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\HeldOrder;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderPayment;
use App\Models\Product;
use App\Models\StockBalance;
use App\Models\Store;
use App\Models\Warehouse;
use DomainException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PosCheckoutService
{
    public function __construct(
        protected InventoryService $inventoryService
    ) {}

    /**
     * Process checkout transaction atomically with row-level locking.
     */
    public function checkout(array $data, ?string $idempotencyKey = null): Order
    {
        $store = Store::findOrFail($data['store_id']);
        $tenantId = $data['tenant_id'] ?? auth()->user()?->tenant_id ?? app(TenantManager::class)->getTenantId() ?? $store->tenant_id;

        if (auth()->check() && auth()->user()->tenant_id && auth()->user()->tenant_id !== $store->tenant_id) {
            throw new DomainException('Akses ke toko tenant lain ditolak.');
        }

        // 1. Idempotency Check: Prevent duplicate payments / charges
        if (! empty($idempotencyKey)) {
            $existingOrder = Order::where('tenant_id', $tenantId)
                ->where('idempotency_key', $idempotencyKey)
                ->with(['items.product', 'payments', 'customer', 'store', 'cashier'])
                ->first();

            if ($existingOrder) {
                return $existingOrder;
            }
        }

        return DB::transaction(function () use ($data, $idempotencyKey, $tenantId, $store) {
            // Locate warehouse responsible for this store's stock
            $warehouse = Warehouse::where('tenant_id', $tenantId)
                ->where('store_id', $store->id)
                ->where('is_active', true)
                ->first();

            if (! $warehouse) {
                $warehouse = Warehouse::where('tenant_id', $tenantId)
                    ->where('is_active', true)
                    ->first();
            }

            $itemsData = $data['items'] ?? [];
            if (empty($itemsData)) {
                throw new DomainException('Keranjang belanja kasir masih kosong.');
            }

            // Customer
            $customer = null;
            if (! empty($data['customer_id'])) {
                $customer = Customer::where('tenant_id', $tenantId)->find($data['customer_id']);
            }

            // Recalculate all items from server-side fresh state
            $orderLines = [];
            $subtotal = 0;

            foreach ($itemsData as $item) {
                $product = Product::where('tenant_id', $tenantId)->findOrFail($item['product_id']);
                $qty = (float) ($item['quantity'] ?? 1);

                if ($qty <= 0) {
                    throw new DomainException("Kuantitas produk {$product->name} harus lebih dari 0.");
                }

                // Check and lock stock if warehouse exists and tracking enabled
                if ($warehouse && $product->track_inventory) {
                    $stockBalance = StockBalance::where('warehouse_id', $warehouse->id)
                        ->where('product_id', $product->id)
                        ->lockForUpdate()
                        ->first();

                    $availableStock = $stockBalance ? (float) $stockBalance->quantity : 0;

                    if ($availableStock < $qty && ! ($store->allow_negative_stock ?? false)) {
                        throw new DomainException(
                            "Stok tidak mencukupi untuk {$product->name} (SKU: {$product->sku}). Stok tersedia: {$availableStock}, diminta: {$qty}."
                        );
                    }
                }

                $unitPrice = (float) $product->selling_price;
                $unitCost = (float) $product->purchase_cost;
                $itemDiscount = (float) ($item['discount_amount'] ?? 0);
                $lineSubtotal = max(0, ($unitPrice * $qty) - $itemDiscount);

                $subtotal += $lineSubtotal;

                $orderLines[] = [
                    'product' => $product,
                    'quantity' => $qty,
                    'unit_price' => $unitPrice,
                    'unit_cost' => $unitCost,
                    'discount_amount' => $itemDiscount,
                    'subtotal' => $lineSubtotal,
                    'notes' => $item['notes'] ?? null,
                ];
            }

            // Tax (Default store tax percentage, e.g. 11% PPN)
            $taxPercentage = (float) ($store->tax_percentage ?? 11.00);
            $taxAmount = round($subtotal * ($taxPercentage / 100), 2);

            // Transaction-level Discount
            $discountAmount = min((float) ($data['discount_amount'] ?? 0), $subtotal);

            // Service Charge
            $serviceCharge = (float) ($data['service_charge'] ?? 0);

            // Grand Total
            $totalAmount = max(0, $subtotal - $discountAmount + $taxAmount + $serviceCharge);

            // Payment Calculations
            $paymentMethod = $data['payment_method'] ?? 'cash';
            $paidAmount = (float) ($data['paid_amount'] ?? $totalAmount);

            if ($paymentMethod === 'cash' && $paidAmount < $totalAmount) {
                throw new DomainException(
                    "Jumlah uang tunai yang dibayarkan (" . number_format($paidAmount, 0, ',', '.') . ") kurang dari total belanja (" . number_format($totalAmount, 0, ',', '.') . ")."
                );
            }

            $changeAmount = max(0, $paidAmount - $totalAmount);

            // Generate Sequential Invoice Number: INV/{STORE_CODE}/{YYYYMMDD}/{SEQUENCE}
            $datePrefix = date('Ymd');
            $storeCode = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $store->code ?? 'STORE'));
            $todayCount = Order::where('tenant_id', $tenantId)
                ->where('store_id', $store->id)
                ->whereDate('created_at', now()->toDateString())
                ->count();
            $sequence = str_pad($todayCount + 1, 4, '0', STR_PAD_LEFT);
            $orderNumber = "INV/{$storeCode}/{$datePrefix}/{$sequence}";

            // Create Order Record
            $order = Order::create([
                'tenant_id' => $tenantId,
                'store_id' => $store->id,
                'register_id' => $data['register_id'] ?? null,
                'user_id' => auth()->id() ?? $data['user_id'] ?? null,
                'customer_id' => $customer?->id,
                'order_number' => $orderNumber,
                'idempotency_key' => $idempotencyKey,
                'status' => 'completed',
                'subtotal' => $subtotal,
                'discount_amount' => $discountAmount,
                'tax_amount' => $taxAmount,
                'service_charge' => $serviceCharge,
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'change_amount' => $changeAmount,
                'payment_method' => $paymentMethod,
                'notes' => $data['notes'] ?? null,
                'completed_at' => now(),
            ]);

            // Create Order Items and decrease inventory atomically
            foreach ($orderLines as $line) {
                $prod = $line['product'];

                OrderItem::create([
                    'tenant_id' => $tenantId,
                    'order_id' => $order->id,
                    'product_id' => $prod->id,
                    'product_variant_id' => null,
                    'product_name' => $prod->name,
                    'product_sku' => $prod->sku,
                    'quantity' => $line['quantity'],
                    'unit_cost' => $line['unit_cost'],
                    'unit_price' => $line['unit_price'],
                    'discount_amount' => $line['discount_amount'],
                    'tax_amount' => 0,
                    'subtotal' => $line['subtotal'],
                    'notes' => $line['notes'],
                ]);

                // Record Inventory Movement
                if ($warehouse && $prod->track_inventory) {
                    $this->inventoryService->recordMovement(
                        warehouseId: $warehouse->id,
                        productId: $prod->id,
                        movementType: 'SALE',
                        quantityChange: -$line['quantity'],
                        unitCost: $line['unit_cost'],
                        referenceType: Order::class,
                        referenceId: $order->id,
                        notes: "Penjualan POS Faktur #{$orderNumber}",
                        userId: auth()->id() ?? $data['user_id'] ?? null
                    );
                }
            }

            // Record Payment
            OrderPayment::create([
                'tenant_id' => $tenantId,
                'order_id' => $order->id,
                'payment_method' => $paymentMethod,
                'amount' => $totalAmount,
                'reference_number' => $data['payment_reference'] ?? null,
                'status' => 'success',
            ]);

            // Loyalty Points Accumulation (1 point per IDR 10,000 spent)
            if ($customer && $totalAmount >= 10000) {
                $pointsEarned = (int) floor($totalAmount / 10000);
                $customer->increment('loyalty_points', $pointsEarned);
            }

            return $order->load(['items.product', 'payments', 'customer', 'store', 'cashier']);
        });
    }

    /**
     * Hold a cart for later resumption.
     */
    public function holdCart(array $data): HeldOrder
    {
        $store = Store::findOrFail($data['store_id']);
        $tenantId = $data['tenant_id'] ?? auth()->user()?->tenant_id ?? app(TenantManager::class)->getTenantId() ?? $store->tenant_id;

        return HeldOrder::create([
            'tenant_id' => $tenantId,
            'store_id' => $store->id,
            'register_id' => $data['register_id'] ?? null,
            'user_id' => auth()->id() ?? $data['user_id'] ?? null,
            'customer_id' => $data['customer_id'] ?? null,
            'reference_note' => $data['reference_note'] ?? 'Antrean ' . date('H:i'),
            'cart_payload' => $data['cart_payload'],
            'expires_at' => now()->addHours(12),
        ]);
    }

    /**
     * Retrieve and delete held order for resumption.
     */
    public function resumeCart(string $heldOrderId): array
    {
        $held = HeldOrder::findOrFail($heldOrderId);

        $payload = $held->cart_payload;
        $held->delete();

        return $payload;
    }

    /**
     * List held orders for a given store.
     */
    public function getHeldOrders(string $storeId): Collection
    {
        $store = Store::findOrFail($storeId);
        $tenantId = auth()->user()?->tenant_id ?? app(TenantManager::class)->getTenantId() ?? $store->tenant_id;

        return HeldOrder::where('tenant_id', $tenantId)
            ->where('store_id', $store->id)
            ->with('customer:id,name,phone')
            ->orderByDesc('created_at')
            ->get();
    }
}
