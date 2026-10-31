<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\HeldOrder;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Register;
use App\Models\StockBalance;
use App\Models\Store;
use App\Models\Warehouse;
use App\Services\PosCheckoutService;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PosController extends Controller
{
    /**
     * Render the fixed-viewport POS Terminal screen.
     */
    public function terminal(Request $request): Response
    {
        $user = $request->user();
        $tenantId = $user->tenant_id;

        // Resolve active store
        $storeId = $request->session()->get('active_store_id');
        $store = null;
        if ($storeId) {
            $store = $user->stores()->where('stores.id', $storeId)->first();
        }
        if (! $store) {
            $store = $user->defaultStore() ?? $user->stores()->first() ?? Store::where('tenant_id', $tenantId)->first();
            if ($store) {
                $request->session()->put('active_store_id', $store->id);
            }
        }

        // Resolve register
        $register = Register::where('store_id', $store?->id)->where('is_active', true)->first();
        if (! $register && $store) {
            $register = Register::firstOrCreate(
                ['store_id' => $store->id, 'code' => 'POS-01'],
                [
                    'tenant_id' => $tenantId,
                    'name' => 'Register Kasir 01',
                    'printer_type' => 'thermal_80mm',
                    'is_active' => true,
                ]
            );
        }

        // Resolve warehouse for stock lookup
        $warehouse = Warehouse::where('store_id', $store?->id)->where('is_active', true)->first()
            ?: Warehouse::where('tenant_id', $tenantId)->where('is_active', true)->first();

        // Product Catalog with current warehouse stock
        $products = Product::where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->with(['category:id,name', 'unit:id,code'])
            ->select('id', 'name', 'sku', 'barcode', 'category_id', 'unit_id', 'selling_price', 'purchase_cost', 'track_inventory')
            ->orderBy('name')
            ->get();

        // Map stock balance per product
        $stockMap = [];
        if ($warehouse) {
            $balances = StockBalance::where('warehouse_id', $warehouse->id)
                ->whereIn('product_id', $products->pluck('id'))
                ->pluck('quantity', 'product_id');
            $stockMap = $balances->toArray();
        }

        $catalog = $products->map(function ($p) use ($stockMap) {
            return [
                'id' => $p->id,
                'name' => $p->name,
                'sku' => $p->sku,
                'barcode' => $p->barcode,
                'category_id' => $p->category_id,
                'category_name' => $p->category?->name ?? 'Umum',
                'unit_code' => $p->unit?->code ?? 'PCS',
                'selling_price' => (float) $p->selling_price,
                'stock' => (float) ($stockMap[$p->id] ?? 0),
                'track_inventory' => (bool) $p->track_inventory,
            ];
        });

        // Categories for filter chips
        $categories = ProductCategory::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        // Customers list
        $customers = Customer::where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->select('id', 'code', 'name', 'phone', 'loyalty_points')
            ->orderBy('name')
            ->get();

        // Held orders for this store
        $heldOrders = HeldOrder::where('tenant_id', $tenantId)
            ->where('store_id', $store?->id)
            ->with('customer:id,name')
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('Pos/Terminal', [
            'store' => $store,
            'register' => $register,
            'warehouse' => $warehouse,
            'catalog' => $catalog,
            'categories' => $categories,
            'customers' => $customers,
            'heldOrders' => $heldOrders,
        ]);
    }

    /**
     * Process checkout transaction.
     */
    public function checkout(Request $request, PosCheckoutService $checkoutService): JsonResponse
    {
        $validated = $request->validate([
            'store_id' => ['required', 'uuid', 'exists:stores,id'],
            'register_id' => ['nullable', 'uuid', 'exists:registers,id'],
            'customer_id' => ['nullable', 'uuid', 'exists:customers,id'],
            'payment_method' => ['required', 'string', 'in:cash,qris,debit,credit,transfer'],
            'paid_amount' => ['required', 'numeric', 'min:0'],
            'discount_amount' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:500'],
            'idempotency_key' => ['nullable', 'string', 'max:100'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'uuid', 'exists:products,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'items.*.discount_amount' => ['nullable', 'numeric', 'min:0'],
            'items.*.notes' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $order = $checkoutService->checkout(
                data: $validated,
                idempotencyKey: $validated['idempotency_key'] ?? null
            );

            return response()->json([
                'status' => 'success',
                'message' => 'Transaksi checkout berhasil diselesaikan.',
                'order' => $order,
            ]);
        } catch (DomainException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Hold the current cart.
     */
    public function hold(Request $request, PosCheckoutService $checkoutService): JsonResponse
    {
        $validated = $request->validate([
            'store_id' => ['required', 'uuid', 'exists:stores,id'],
            'register_id' => ['nullable', 'uuid'],
            'customer_id' => ['nullable', 'uuid'],
            'reference_note' => ['nullable', 'string', 'max:100'],
            'cart_payload' => ['required', 'array'],
        ]);

        $held = $checkoutService->holdCart($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Keranjang berhasil ditangguhkan (Hold).',
            'held_order' => $held,
        ]);
    }

    /**
     * Resume a held cart.
     */
    public function resume(string $id, PosCheckoutService $checkoutService): JsonResponse
    {
        $payload = $checkoutService->resumeCart($id);

        return response()->json([
            'status' => 'success',
            'cart_payload' => $payload,
        ]);
    }

    /**
     * Delete a held cart without resuming.
     */
    public function destroyHeld(string $id): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;
        HeldOrder::where('tenant_id', $tenantId)->where('id', $id)->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Keranjang hold berhasil dihapus.',
        ]);
    }

    /**
     * Get order details for thermal receipt printing.
     */
    public function receipt(Order $order): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;
        if ($order->tenant_id !== $tenantId) {
            abort(403);
        }

        $order->load(['items.product', 'payments', 'customer', 'store', 'cashier']);

        return response()->json([
            'status' => 'success',
            'order' => $order,
        ]);
    }
}
