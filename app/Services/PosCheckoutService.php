<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\HeldOrder;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderPayment;
use App\Models\Product;
use App\Models\Shift;
use App\Models\StockBalance;
use App\Models\Store;
use App\Models\Warehouse;
use DomainException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class PosCheckoutService
{
    public function __construct(
        protected InventoryService $inventoryService,
        protected PromotionService $promotionService,
        protected CommissionService $commissionService
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

            // Coupon & Promotion Evaluation
            $appliedPromotion = null;
            $couponCode = $data['coupon_code'] ?? null;
            $discountAmount = (float) ($data['discount_amount'] ?? 0);

            if (! empty($couponCode)) {
                $promoValidation = $this->promotionService->validateCoupon(
                    code: $couponCode,
                    subtotal: $subtotal,
                    cartItems: $orderLines,
                    customer: $customer,
                    tenantId: $tenantId
                );
                $appliedPromotion = $promoValidation['promotion'];
                $discountAmount = max($discountAmount, (float) $promoValidation['discount_amount']);
            }

            $discountAmount = min($discountAmount, $subtotal);

            // Tax (Default store tax percentage, e.g. 11% PPN)
            $taxPercentage = (float) ($store->tax_percentage ?? 11.00);
            $taxAmount = round(max(0, $subtotal - $discountAmount) * ($taxPercentage / 100), 2);

            // Service Charge
            $serviceCharge = (float) ($data['service_charge'] ?? 0);

            // Grand Total
            $totalAmount = max(0, $subtotal - $discountAmount + $taxAmount + $serviceCharge);

            // Shift Association: resolve provided shift_id or active shift on register
            $shiftId = $data['shift_id'] ?? null;
            if (! $shiftId && ! empty($data['register_id'])) {
                $activeShift = Shift::where('tenant_id', $tenantId)
                    ->where('register_id', $data['register_id'])
                    ->where('status', 'open')
                    ->first();
                $shiftId = $activeShift?->id;
            }

            // Payment Calculations (Single or Split Payments)
            $paymentRecords = [];
            $splitPayments = $data['payments'] ?? null;

            if (! empty($splitPayments) && is_array($splitPayments)) {
                $totalPaid = 0;
                $totalAllocated = 0;
                $totalChange = 0;

                foreach ($splitPayments as $p) {
                    $pMethod = $p['payment_method'] ?? 'cash';
                    $pAmount = (float) ($p['amount'] ?? 0);
                    $pPaidAmount = (float) ($p['paid_amount'] ?? $pAmount);

                    if ($pAmount <= 0) {
                        throw new DomainException("Nominal pembayaran untuk metode {$pMethod} harus lebih dari 0.");
                    }

                    if ($pMethod === 'cash' && $pPaidAmount < $pAmount) {
                        throw new DomainException('Uang tunai yang dibayarkan kurang dari nominal split tunai.');
                    }

                    $lineChange = ($pMethod === 'cash') ? max(0, $pPaidAmount - $pAmount) : 0;
                    $totalChange += $lineChange;
                    $totalPaid += $pPaidAmount;
                    $totalAllocated += $pAmount;

                    $paymentRecords[] = [
                        'payment_method' => $pMethod,
                        'amount' => $pAmount,
                        'reference_number' => $p['reference_number'] ?? null,
                        'gateway_transaction_id' => $p['gateway_transaction_id'] ?? null,
                        'payment_channel' => $p['payment_channel'] ?? null,
                        'approval_code' => $p['approval_code'] ?? null,
                        'status' => $p['status'] ?? 'success',
                        'metadata' => $p['metadata'] ?? null,
                    ];
                }

                if ($totalAllocated < $totalAmount) {
                    $shortage = $totalAmount - $totalAllocated;
                    throw new DomainException('Total pembayaran gabungan ('.number_format($totalAllocated, 0, ',', '.').') kurang dari total belanja ('.number_format($totalAmount, 0, ',', '.').'). Kurang: '.number_format($shortage, 0, ',', '.'));
                }

                $paymentMethod = count($splitPayments) > 1 ? 'split' : ($splitPayments[0]['payment_method'] ?? 'cash');
                $paidAmount = $totalPaid;
                $changeAmount = $totalChange;
            } else {
                $paymentMethod = $data['payment_method'] ?? 'cash';
                $paidAmount = (float) ($data['paid_amount'] ?? $totalAmount);

                if ($paymentMethod === 'cash' && $paidAmount < $totalAmount) {
                    throw new DomainException(
                        'Jumlah uang tunai yang dibayarkan ('.number_format($paidAmount, 0, ',', '.').') kurang dari total belanja ('.number_format($totalAmount, 0, ',', '.').').'
                    );
                }

                $changeAmount = max(0, $paidAmount - $totalAmount);

                $paymentRecords[] = [
                    'payment_method' => $paymentMethod,
                    'amount' => $totalAmount,
                    'reference_number' => $data['payment_reference'] ?? $data['reference_number'] ?? null,
                    'gateway_transaction_id' => $data['gateway_transaction_id'] ?? null,
                    'payment_channel' => $data['payment_channel'] ?? null,
                    'approval_code' => $data['approval_code'] ?? null,
                    'status' => 'success',
                    'metadata' => null,
                ];
            }

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
                'shift_id' => $shiftId,
                'user_id' => auth()->id() ?? $data['user_id'] ?? null,
                'customer_id' => $customer?->id,
                'promotion_id' => $appliedPromotion?->id,
                'coupon_code' => $appliedPromotion?->code ?? $couponCode,
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

            // Record Payments (single or multi-split)
            foreach ($paymentRecords as $pRec) {
                OrderPayment::create([
                    'tenant_id' => $tenantId,
                    'order_id' => $order->id,
                    'shift_id' => $shiftId,
                    'payment_method' => $pRec['payment_method'],
                    'amount' => $pRec['amount'],
                    'reference_number' => $pRec['reference_number'],
                    'gateway_transaction_id' => $pRec['gateway_transaction_id'],
                    'payment_channel' => $pRec['payment_channel'],
                    'approval_code' => $pRec['approval_code'],
                    'status' => $pRec['status'] ?? 'success',
                    'metadata' => $pRec['metadata'],
                ]);
            }

            // Record Promotion Usage if applied
            if ($appliedPromotion) {
                $this->promotionService->recordUsage($appliedPromotion, $order, $discountAmount, $customer);
            }

            // Loyalty Points Accumulation (1 point per IDR 10,000 spent)
            if ($customer && $totalAmount >= 10000) {
                $pointsEarned = (int) floor($totalAmount / 10000);
                $customer->increment('loyalty_points', $pointsEarned);
            }

            // Record Sales Commission for Cashier / Sales Rep (Default 2%)
            $this->commissionService->calculateAndRecordCommission(
                order: $order,
                salesRep: auth()->user(),
                ratePercentage: (float) ($data['commission_rate'] ?? 2.00)
            );

            return $order->load(['items.product', 'payments', 'customer', 'store', 'cashier', 'promotion']);
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
            'reference_note' => $data['reference_note'] ?? 'Antrean '.date('H:i'),
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
