<?php

namespace App\Http\Controllers;

use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\StockBalance;
use App\Models\Warehouse;
use App\Services\InventoryService;
use DomainException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class InventoryController extends Controller
{
    /**
     * Display stock balances and movement ledger.
     */
    public function index(Request $request): Response
    {
        $warehouses = Warehouse::where('is_active', true)->select('id', 'name', 'code')->orderBy('name')->get();
        $selectedWarehouseId = $request->input('warehouse_id', $warehouses->first()?->id);

        $balanceQuery = StockBalance::with([
            'product:id,name,sku,barcode,unit_id,purchase_cost,selling_price',
            'product.unit:id,code',
            'warehouse:id,name,code',
        ]);

        if ($selectedWarehouseId) {
            $balanceQuery->where('warehouse_id', $selectedWarehouseId);
        }

        if ($search = $request->input('search')) {
            $balanceQuery->whereHas('product', function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('sku', 'ilike', "%{$search}%")
                  ->orWhere('barcode', 'ilike', "%{$search}%");
            });
        }

        if ($request->boolean('low_stock')) {
            $balanceQuery->whereColumn('quantity', '<=', 'min_stock_alert');
        }

        $balances = $balanceQuery->orderBy('product_id')->paginate(15)->withQueryString();

        // Recent immutable stock ledger movements
        $movements = InventoryMovement::with([
            'product:id,name,sku',
            'warehouse:id,name,code',
            'user:id,name',
        ])
        ->when($selectedWarehouseId, fn ($q) => $q->where('warehouse_id', $selectedWarehouseId))
        ->orderByDesc('created_at')
        ->limit(20)
        ->get();

        $products = Product::where('status', 'active')
            ->select('id', 'name', 'sku', 'purchase_cost')
            ->orderBy('name')
            ->get();

        return Inertia::render('Inventory/Index', [
            'balances' => $balances,
            'movements' => $movements,
            'warehouses' => $warehouses,
            'products' => $products,
            'filters' => [
                'warehouse_id' => $selectedWarehouseId,
                'search' => $request->input('search'),
                'low_stock' => $request->boolean('low_stock'),
            ],
        ]);
    }

    /**
     * Perform quick manual stock adjustment.
     */
    public function adjust(Request $request, InventoryService $inventoryService): RedirectResponse
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
            $inventoryService->recordMovement(
                warehouseId: $validated['warehouse_id'],
                productId: $validated['product_id'],
                movementType: 'MANUAL_ADJUSTMENT',
                quantityChange: $quantityChange,
                notes: "Penyesuaian manual ({$validated['reason']}): " . ($validated['notes'] ?? '-'),
                userId: auth()->id()
            );

            return back()->with('success', 'Penyesuaian stok berhasil disimpan.');
        } catch (DomainException $e) {
            return back()->withErrors(['quantity' => $e->getMessage()]);
        }
    }
}
