<?php

namespace App\Services;

use App\Models\GoodsReceipt;
use App\Models\GoodsReceiptItem;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\StockBalance;
use App\Models\StockOpname;
use App\Models\StockTransfer;
use DomainException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class InventoryService
{
    /**
     * Record an immutable inventory movement and atomically mutate stock balance with pessimistic locking.
     */
    public function recordMovement(
        string $warehouseId,
        string $productId,
        string $movementType,
        float $quantityChange,
        float $unitCost = 0,
        ?string $referenceType = null,
        ?string $referenceId = null,
        ?string $notes = null,
        ?string $userId = null,
        bool $allowNegative = false
    ): InventoryMovement {
        return DB::transaction(function () use (
            $warehouseId,
            $productId,
            $movementType,
            $quantityChange,
            $unitCost,
            $referenceType,
            $referenceId,
            $notes,
            $userId,
            $allowNegative
        ) {
            $product = Product::findOrFail($productId);

            // Row-level lock on the stock balance
            $balance = StockBalance::where('warehouse_id', $warehouseId)
                ->where('product_id', $productId)
                ->lockForUpdate()
                ->first();

            if (! $balance) {
                $balance = StockBalance::create([
                    'tenant_id' => $product->tenant_id,
                    'warehouse_id' => $warehouseId,
                    'product_id' => $productId,
                    'quantity' => 0,
                    'reserved_quantity' => 0,
                    'min_stock_alert' => $product->min_stock ?? 5,
                ]);
            }

            $balanceBefore = (float) $balance->quantity;
            $balanceAfter = $balanceBefore + $quantityChange;

            if ($balanceAfter < 0 && ! $allowNegative && $product->track_inventory) {
                throw new DomainException(
                    "Stok tidak mencukupi untuk {$product->name} (SKU: {$product->sku}). Stok saat ini: {$balanceBefore}, diminta: ".abs($quantityChange)
                );
            }

            $balance->update(['quantity' => $balanceAfter]);

            return InventoryMovement::create([
                'tenant_id' => $product->tenant_id,
                'warehouse_id' => $warehouseId,
                'product_id' => $productId,
                'movement_type' => $movementType,
                'quantity_change' => $quantityChange,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'unit_cost' => $unitCost > 0 ? $unitCost : (float) $product->purchase_cost,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'user_id' => $userId ?: auth()->id(),
                'notes' => $notes,
            ]);
        });
    }

    /**
     * Dispatch stock transfer from source warehouse.
     */
    public function dispatchTransfer(StockTransfer $transfer, ?string $userId = null): void
    {
        DB::transaction(function () use ($transfer, $userId) {
            $transfer->load('items.product');

            foreach ($transfer->items as $item) {
                $qty = (float) $item->quantity_requested;

                $this->recordMovement(
                    warehouseId: $transfer->source_warehouse_id,
                    productId: $item->product_id,
                    movementType: 'TRANSFER_OUT',
                    quantityChange: -$qty,
                    referenceType: StockTransfer::class,
                    referenceId: $transfer->id,
                    notes: "Transfer #{$transfer->transfer_number} ke {$transfer->destinationWarehouse->name}",
                    userId: $userId
                );

                $item->update(['quantity_dispatched' => $qty]);
            }

            $transfer->update([
                'status' => 'in_transit',
                'dispatched_at' => now(),
            ]);
        });
    }

    /**
     * Receive stock transfer into destination warehouse.
     */
    public function receiveTransfer(StockTransfer $transfer, array $receivedQuantities = [], ?string $userId = null): void
    {
        DB::transaction(function () use ($transfer, $receivedQuantities, $userId) {
            $transfer->load('items.product');

            foreach ($transfer->items as $item) {
                $qty = isset($receivedQuantities[$item->id])
                    ? (float) $receivedQuantities[$item->id]
                    : (float) $item->quantity_dispatched;

                $this->recordMovement(
                    warehouseId: $transfer->destination_warehouse_id,
                    productId: $item->product_id,
                    movementType: 'TRANSFER_IN',
                    quantityChange: $qty,
                    referenceType: StockTransfer::class,
                    referenceId: $transfer->id,
                    notes: "Penerimaan transfer #{$transfer->transfer_number} dari {$transfer->sourceWarehouse->name}",
                    userId: $userId
                );

                $item->update(['quantity_received' => $qty]);
            }

            $transfer->update([
                'status' => 'completed',
                'received_at' => now(),
            ]);
        });
    }

    /**
     * Apply stock opname discrepancy adjustments.
     */
    public function applyStockOpname(StockOpname $opname, ?string $userId = null): void
    {
        DB::transaction(function () use ($opname, $userId) {
            $opname->load('items.product');

            foreach ($opname->items as $item) {
                $variance = (float) $item->variance;

                if ($variance != 0) {
                    $this->recordMovement(
                        warehouseId: $opname->warehouse_id,
                        productId: $item->product_id,
                        movementType: 'STOCK_OPNAME_ADJUSTMENT',
                        quantityChange: $variance,
                        unitCost: (float) $item->unit_cost,
                        referenceType: StockOpname::class,
                        referenceId: $opname->id,
                        notes: "Penyesuaian hasil opname #{$opname->opname_number}. Selisih: {$variance}",
                        userId: $userId
                    );
                }
            }

            $opname->update([
                'status' => 'completed',
                'completed_at' => now(),
                'approved_by' => $userId ?: auth()->id(),
            ]);
        });
    }

    /**
     * Receive goods from Purchase Order into warehouse.
     */
    public function receiveGoods(PurchaseOrder $po, array $receivedItems, ?string $notes = null, ?string $userId = null): GoodsReceipt
    {
        return DB::transaction(function () use ($po, $receivedItems, $notes, $userId) {
            $receiptNumber = 'GR-'.strtoupper(Str::random(8));

            $receipt = GoodsReceipt::create([
                'tenant_id' => $po->tenant_id,
                'receipt_number' => $receiptNumber,
                'purchase_order_id' => $po->id,
                'warehouse_id' => $po->warehouse_id,
                'received_date' => now()->toDateString(),
                'notes' => $notes,
                'user_id' => $userId ?: auth()->id(),
            ]);

            $po->load('items');
            $allFullyReceived = true;

            foreach ($receivedItems as $itemData) {
                $poItem = $po->items->firstWhere('id', $itemData['purchase_order_item_id']);
                if (! $poItem) {
                    continue;
                }

                $qtyReceived = (float) $itemData['quantity_received'];
                if ($qtyReceived <= 0) {
                    continue;
                }

                GoodsReceiptItem::create([
                    'tenant_id' => $po->tenant_id,
                    'goods_receipt_id' => $receipt->id,
                    'purchase_order_item_id' => $poItem->id,
                    'product_id' => $poItem->product_id,
                    'quantity_received' => $qtyReceived,
                    'unit_cost' => $poItem->unit_cost,
                ]);

                // Record inventory movement
                $this->recordMovement(
                    warehouseId: $po->warehouse_id,
                    productId: $poItem->product_id,
                    movementType: 'PURCHASE_RECEIPT',
                    quantityChange: $qtyReceived,
                    unitCost: (float) $poItem->unit_cost,
                    referenceType: GoodsReceipt::class,
                    referenceId: $receipt->id,
                    notes: "Penerimaan PO #{$po->po_number} (Tanda Terima: {$receiptNumber})",
                    userId: $userId
                );

                $newTotalReceived = (float) $poItem->quantity_received + $qtyReceived;
                $poItem->update(['quantity_received' => $newTotalReceived]);

                if ($newTotalReceived < (float) $poItem->quantity_ordered) {
                    $allFullyReceived = false;
                }
            }

            $po->update([
                'status' => $allFullyReceived ? 'received' : 'partially_received',
            ]);

            return $receipt;
        });
    }
}
