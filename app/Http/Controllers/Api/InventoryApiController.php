<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InventoryMovement;
use App\Models\PurchaseOrder;
use App\Models\StockBalance;
use App\Models\StockTransfer;
use App\Services\InventoryService;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryApiController extends Controller
{
    /**
     * Get stock balances.
     */
    public function balances(Request $request): JsonResponse
    {
        $query = StockBalance::with([
            'product:id,name,sku,barcode,unit_id,selling_price,purchase_cost',
            'product.unit:id,code',
            'warehouse:id,name,code',
        ]);

        if ($warehouseId = $request->input('warehouse_id')) {
            $query->where('warehouse_id', $warehouseId);
        }

        if ($request->boolean('low_stock')) {
            $query->whereColumn('quantity', '<=', 'min_stock_alert');
        }

        $balances = $query->paginate($request->input('per_page', 20));

        return response()->json([
            'status' => 'success',
            'data' => $balances->items(),
            'meta' => [
                'current_page' => $balances->currentPage(),
                'total' => $balances->total(),
                'last_page' => $balances->lastPage(),
            ],
        ]);
    }

    /**
     * Get immutable inventory ledger movements.
     */
    public function movements(Request $request): JsonResponse
    {
        $query = InventoryMovement::with([
            'product:id,name,sku',
            'warehouse:id,name,code',
            'user:id,name',
        ]);

        if ($warehouseId = $request->input('warehouse_id')) {
            $query->where('warehouse_id', $warehouseId);
        }

        if ($productId = $request->input('product_id')) {
            $query->where('product_id', $productId);
        }

        $movements = $query->orderByDesc('created_at')->paginate($request->input('per_page', 25));

        return response()->json([
            'status' => 'success',
            'data' => $movements->items(),
            'meta' => [
                'current_page' => $movements->currentPage(),
                'total' => $movements->total(),
            ],
        ]);
    }

    /**
     * Get list of stock transfers.
     */
    public function transfers(Request $request): JsonResponse
    {
        $query = StockTransfer::with([
            'sourceWarehouse:id,name,code',
            'destinationWarehouse:id,name,code',
            'items.product:id,name,sku',
        ]);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $transfers = $query->orderByDesc('created_at')->paginate($request->input('per_page', 15));

        return response()->json([
            'status' => 'success',
            'data' => $transfers->items(),
        ]);
    }

    /**
     * Get list of purchase orders.
     */
    public function purchaseOrders(Request $request): JsonResponse
    {
        $query = PurchaseOrder::with([
            'supplier:id,name,code',
            'warehouse:id,name,code',
            'items.product:id,name,sku',
        ]);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $pos = $query->orderByDesc('created_at')->paginate($request->input('per_page', 15));

        return response()->json([
            'status' => 'success',
            'data' => $pos->items(),
        ]);
    }

    /**
     * Perform stock adjustment via API.
     */
    public function adjust(Request $request, InventoryService $inventoryService): JsonResponse
    {
        $validated = $request->validate([
            'warehouse_id' => ['required', 'uuid', 'exists:warehouses,id'],
            'product_id' => ['required', 'uuid', 'exists:products,id'],
            'type' => ['required', 'in:in,out'],
            'quantity' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['required', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $quantityChange = $validated['type'] === 'in'
            ? (float) $validated['quantity']
            : -(float) $validated['quantity'];

        try {
            $movement = $inventoryService->recordMovement(
                warehouseId: $validated['warehouse_id'],
                productId: $validated['product_id'],
                movementType: 'MANUAL_ADJUSTMENT',
                quantityChange: $quantityChange,
                notes: "API Adjustment ({$validated['reason']}): ".($validated['notes'] ?? '-'),
                userId: auth()->id()
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Penyesuaian stok berhasil disimpan.',
                'data' => $movement,
            ]);
        } catch (DomainException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
