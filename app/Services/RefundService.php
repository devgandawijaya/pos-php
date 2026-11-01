<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderRefund;
use App\Models\OrderRefundItem;
use App\Models\Shift;
use App\Models\Store;
use App\Models\User;
use App\Models\Warehouse;
use DomainException;
use Illuminate\Support\Facades\DB;

class RefundService
{
    public function __construct(
        protected InventoryService $inventoryService,
        protected ShiftService $shiftService,
        protected CommissionService $commissionService
    ) {}

    /**
     * Process an order refund / item return atomically with reverse inventory movements.
     */
    public function processRefund(Order $order, array $data, ?User $user = null): OrderRefund
    {
        if ($order->status === 'refunded') {
            throw new DomainException("Faktur pesanan #{$order->order_number} sudah sepenuhnya direfund sebelumnya.");
        }

        $itemsData = $data['items'] ?? [];
        if (empty($itemsData)) {
            throw new DomainException('Pilih minimal satu barang untuk proses refund atau retur.');
        }

        $store = $order->store ?? Store::findOrFail($order->store_id);
        $tenantId = $order->tenant_id;
        $userId = $user?->id ?? auth()->id() ?? $order->user_id;

        // Resolve active shift if cash refund
        $shiftId = $data['shift_id'] ?? null;
        $shift = null;
        if ($shiftId) {
            $shift = Shift::find($shiftId);
        } elseif (($data['refund_method'] ?? 'cash') === 'cash') {
            if (! empty($order->register_id)) {
                $shift = Shift::where('tenant_id', $tenantId)
                    ->where('register_id', $order->register_id)
                    ->where('status', 'open')
                    ->first();
            }
            if (! $shift && $userId) {
                $shift = Shift::where('tenant_id', $tenantId)
                    ->where('user_id', $userId)
                    ->where('status', 'open')
                    ->first();
            }
            $shiftId = $shift?->id;
        }

        // Resolve warehouse for returning stock
        $warehouse = Warehouse::where('tenant_id', $tenantId)
            ->where('store_id', $store->id)
            ->where('is_active', true)
            ->first() ?: Warehouse::where('tenant_id', $tenantId)->where('is_active', true)->first();

        return DB::transaction(function () use ($order, $store, $tenantId, $userId, $user, $shift, $shiftId, $warehouse, $data, $itemsData) {
            // Generate Sequential Refund Number: REF/{STORE_CODE}/{YYYYMMDD}/{SEQUENCE}
            $datePrefix = date('Ymd');
            $storeCode = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $store->code ?? 'STORE'));
            $todayRefundsCount = OrderRefund::where('tenant_id', $tenantId)
                ->where('store_id', $store->id)
                ->whereDate('created_at', now()->toDateString())
                ->count();
            $sequence = str_pad($todayRefundsCount + 1, 4, '0', STR_PAD_LEFT);
            $refundNumber = "REF/{$storeCode}/{$datePrefix}/{$sequence}";

            $refund = OrderRefund::create([
                'tenant_id' => $tenantId,
                'order_id' => $order->id,
                'store_id' => $store->id,
                'user_id' => $userId,
                'approved_by_id' => auth()->id(),
                'shift_id' => $shiftId,
                'refund_number' => $refundNumber,
                'type' => $data['type'] ?? 'partial_refund',
                'status' => 'completed',
                'total_refund_amount' => 0,
                'refund_method' => $data['refund_method'] ?? 'cash',
                'reason' => $data['reason'] ?? 'customer_change_mind',
                'notes' => $data['notes'] ?? null,
            ]);

            $totalRefundAmount = 0;

            foreach ($itemsData as $itemInput) {
                $orderItemId = $itemInput['order_item_id'];
                $requestedQty = (float) $itemInput['quantity'];

                if ($requestedQty <= 0) {
                    continue;
                }

                $orderItem = OrderItem::where('order_id', $order->id)->findOrFail($orderItemId);

                // Check previously refunded quantity for this item
                $previouslyRefundedQty = (float) OrderRefundItem::where('order_item_id', $orderItem->id)->sum('quantity');
                $maxAvailableToRefund = (float) $orderItem->quantity - $previouslyRefundedQty;

                if ($requestedQty > $maxAvailableToRefund) {
                    throw new DomainException(
                        "Kuantitas refund untuk {$orderItem->product_name} melebihi batas yang dapat direfund (Maksimal: {$maxAvailableToRefund}, diminta: {$requestedQty})."
                    );
                }

                $unitPrice = (float) $orderItem->unit_price;
                $lineRefundAmount = round($requestedQty * $unitPrice, 2);
                $totalRefundAmount += $lineRefundAmount;

                $restock = (bool) ($itemInput['restock'] ?? true);
                $condition = $itemInput['condition'] ?? 'good';

                // Create Refund Item record
                OrderRefundItem::create([
                    'tenant_id' => $tenantId,
                    'order_refund_id' => $refund->id,
                    'order_item_id' => $orderItem->id,
                    'product_id' => $orderItem->product_id,
                    'quantity' => $requestedQty,
                    'unit_price' => $unitPrice,
                    'refund_amount' => $lineRefundAmount,
                    'restock' => $restock,
                    'condition' => $condition,
                ]);

                // Record Reverse Inventory Movement (RETURN) if item condition is good and restock enabled
                if ($restock && $condition === 'good' && $warehouse && $orderItem->product?->track_inventory) {
                    $this->inventoryService->recordMovement(
                        warehouseId: $warehouse->id,
                        productId: $orderItem->product_id,
                        movementType: 'RETURN',
                        quantityChange: $requestedQty, // Positive quantity adds back to warehouse!
                        unitCost: (float) $orderItem->unit_cost,
                        referenceType: OrderRefund::class,
                        referenceId: $refund->id,
                        notes: "Retur barang Faktur #{$order->order_number} ({$refundNumber})",
                        userId: $userId
                    );
                }
            }

            if ($totalRefundAmount <= 0) {
                throw new DomainException('Total nilai pengembalian dana harus lebih dari 0.');
            }

            $refund->update(['total_refund_amount' => $totalRefundAmount]);

            // Update Order Status (refunded vs partially_refunded)
            $totalOrderQty = (float) $order->items()->sum('quantity');
            $totalRefundedQty = (float) OrderRefundItem::whereIn('order_item_id', $order->items->pluck('id'))->sum('quantity');

            if ($totalRefundedQty >= $totalOrderQty) {
                $order->update(['status' => 'refunded']);
            } else {
                $order->update(['status' => 'partially_refunded']);
            }

            // Cash Drawer Movement if cash refund during open shift
            if (($data['refund_method'] ?? 'cash') === 'cash' && $shift && $shift->isOpen()) {
                $this->shiftService->recordCashMovement(
                    shift: $shift,
                    type: 'cash_out',
                    amount: $totalRefundAmount,
                    reason: "Refund Tunai Faktur #{$order->order_number}",
                    notes: "Retur Faktur #{$refundNumber}",
                    user: $user
                );
            }

            // Loyalty Points Reversal (Proportionally deduct points earned)
            if ($order->customer_id && $totalRefundAmount >= 10000) {
                $customer = Customer::find($order->customer_id);
                if ($customer) {
                    $pointsToDeduct = (int) floor($totalRefundAmount / 10000);
                    $customer->decrement('loyalty_points', min($customer->loyalty_points, $pointsToDeduct));
                }
            }

            // Commission Reversal
            $this->commissionService->reverseCommissionOnRefund($refund);

            return $refund->load(['items.product', 'order.items', 'cashier', 'store']);
        });
    }
}
