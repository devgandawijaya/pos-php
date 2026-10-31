<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Supplier;
use App\Models\Warehouse;
use App\Services\InventoryService;
use DomainException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class PurchaseOrderController extends Controller
{
    /**
     * Display a listing of purchase orders.
     */
    public function index(Request $request): Response
    {
        $query = PurchaseOrder::with([
            'supplier:id,name,code',
            'warehouse:id,name,code',
            'user:id,name',
            'items.product:id,name,sku,unit_id',
            'items.product.unit:id,code',
        ]);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($supplierId = $request->input('supplier_id')) {
            $query->where('supplier_id', $supplierId);
        }

        $orders = $query->orderByDesc('created_at')->paginate(15)->withQueryString();

        $suppliers = Supplier::where('is_active', true)->select('id', 'name', 'code')->orderBy('name')->get();
        $warehouses = Warehouse::where('is_active', true)->select('id', 'name', 'code')->orderBy('name')->get();
        $products = Product::where('status', 'active')->select('id', 'name', 'sku', 'purchase_cost')->orderBy('name')->get();

        return Inertia::render('Purchasing/Index', [
            'orders' => $orders,
            'suppliers' => $suppliers,
            'warehouses' => $warehouses,
            'products' => $products,
            'filters' => $request->only(['status', 'supplier_id']),
        ]);
    }

    /**
     * Store a newly created purchase order.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'supplier_id' => ['required', 'uuid', 'exists:suppliers,id'],
            'warehouse_id' => ['required', 'uuid', 'exists:warehouses,id'],
            'order_date' => ['required', 'date'],
            'expected_date' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'uuid', 'exists:products,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'items.*.unit_cost' => ['required', 'numeric', 'min:0'],
        ]);

        $tenantId = auth()->user()->tenant_id;

        DB::transaction(function () use ($validated, $tenantId) {
            $poNumber = 'PO-' . date('Ymd') . '-' . strtoupper(Str::random(4));

            $subtotal = 0;
            foreach ($validated['items'] as $item) {
                $subtotal += ((float) $item['quantity']) * ((float) $item['unit_cost']);
            }
            $taxAmount = round($subtotal * 0.11, 2);
            $totalAmount = $subtotal + $taxAmount;

            $po = PurchaseOrder::create([
                'tenant_id' => $tenantId,
                'po_number' => $poNumber,
                'supplier_id' => $validated['supplier_id'],
                'warehouse_id' => $validated['warehouse_id'],
                'status' => 'approved',
                'order_date' => $validated['order_date'],
                'expected_date' => $validated['expected_date'] ?? null,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'total_amount' => $totalAmount,
                'notes' => $validated['notes'] ?? null,
                'user_id' => auth()->id(),
                'approved_by' => auth()->id(),
            ]);

            foreach ($validated['items'] as $item) {
                $lineSubtotal = ((float) $item['quantity']) * ((float) $item['unit_cost']);

                PurchaseOrderItem::create([
                    'tenant_id' => $tenantId,
                    'purchase_order_id' => $po->id,
                    'product_id' => $item['product_id'],
                    'quantity_ordered' => $item['quantity'],
                    'quantity_received' => 0,
                    'unit_cost' => $item['unit_cost'],
                    'subtotal' => $lineSubtotal,
                ]);
            }
        });

        return back()->with('success', 'Purchase Order berhasil dibuat.');
    }

    /**
     * Receive goods against a purchase order.
     */
    public function receive(Request $request, PurchaseOrder $po, InventoryService $inventoryService): RedirectResponse
    {
        $validated = $request->validate([
            'notes' => ['nullable', 'string', 'max:255'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.purchase_order_item_id' => ['required', 'uuid', 'exists:purchase_order_items,id'],
            'items.*.quantity_received' => ['required', 'numeric', 'min:0'],
        ]);

        try {
            $inventoryService->receiveGoods(
                po: $po,
                receivedItems: $validated['items'],
                notes: $validated['notes'] ?? null,
                userId: auth()->id()
            );

            return back()->with('success', "Penerimaan barang untuk PO #{$po->po_number} berhasil diproses.");
        } catch (DomainException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }
}
