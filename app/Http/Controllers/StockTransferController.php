<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\StockTransfer;
use App\Models\StockTransferItem;
use App\Models\Warehouse;
use App\Services\InventoryService;
use DomainException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class StockTransferController extends Controller
{
    /**
     * Display a listing of stock transfers.
     */
    public function index(Request $request): Response
    {
        $query = StockTransfer::with([
            'sourceWarehouse:id,name,code',
            'destinationWarehouse:id,name,code',
            'user:id,name',
            'items.product:id,name,sku,unit_id',
            'items.product.unit:id,code',
        ]);

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $transfers = $query->orderByDesc('created_at')->paginate(15)->withQueryString();

        $warehouses = Warehouse::where('is_active', true)->select('id', 'name', 'code')->orderBy('name')->get();
        $products = Product::where('status', 'active')->select('id', 'name', 'sku')->orderBy('name')->get();

        return Inertia::render('Inventory/Transfers', [
            'transfers' => $transfers,
            'warehouses' => $warehouses,
            'products' => $products,
            'filters' => $request->only(['status']),
        ]);
    }

    /**
     * Store a newly created stock transfer.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'source_warehouse_id' => ['required', 'uuid', 'exists:warehouses,id'],
            'destination_warehouse_id' => ['required', 'uuid', 'exists:warehouses,id', 'different:source_warehouse_id'],
            'notes' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'uuid', 'exists:products,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
        ]);

        $tenantId = auth()->user()->tenant_id;

        DB::transaction(function () use ($validated, $tenantId) {
            $transferNumber = 'TRF-'.date('Ymd').'-'.strtoupper(Str::random(4));

            $transfer = StockTransfer::create([
                'tenant_id' => $tenantId,
                'transfer_number' => $transferNumber,
                'source_warehouse_id' => $validated['source_warehouse_id'],
                'destination_warehouse_id' => $validated['destination_warehouse_id'],
                'status' => 'draft',
                'notes' => $validated['notes'] ?? null,
                'user_id' => auth()->id(),
            ]);

            foreach ($validated['items'] as $item) {
                StockTransferItem::create([
                    'tenant_id' => $tenantId,
                    'stock_transfer_id' => $transfer->id,
                    'product_id' => $item['product_id'],
                    'quantity_requested' => $item['quantity'],
                    'quantity_dispatched' => 0,
                    'quantity_received' => 0,
                ]);
            }
        });

        return back()->with('success', 'Permintaan transfer stok berhasil dibuat.');
    }

    /**
     * Dispatch stock transfer from source warehouse.
     */
    public function dispatchTransfer(StockTransfer $transfer, InventoryService $inventoryService): RedirectResponse
    {
        if ($transfer->status !== 'draft') {
            return back()->withErrors(['error' => 'Hanya transfer berstatus Draft yang dapat dikirim.']);
        }

        try {
            $inventoryService->dispatchTransfer($transfer, auth()->id());

            return back()->with('success', "Transfer #{$transfer->transfer_number} berhasil dikirim (In Transit).");
        } catch (DomainException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    /**
     * Receive stock transfer into destination warehouse.
     */
    public function receiveTransfer(Request $request, StockTransfer $transfer, InventoryService $inventoryService): RedirectResponse
    {
        if ($transfer->status !== 'in_transit') {
            return back()->withErrors(['error' => 'Hanya transfer Dalam Pengiriman (In Transit) yang dapat diterima.']);
        }

        $receivedQuantities = $request->input('received_quantities', []);

        try {
            $inventoryService->receiveTransfer($transfer, $receivedQuantities, auth()->id());

            return back()->with('success', "Transfer #{$transfer->transfer_number} telah selesai diterima di gudang tujuan.");
        } catch (DomainException $e) {
            return back()->withErrors(['error' => $e->getMessage()]);
        }
    }
}
