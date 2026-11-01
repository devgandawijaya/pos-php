<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderRefund;
use App\Models\OrderRefundItem;
use App\Models\Store;
use App\Services\RefundService;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class RefundController extends Controller
{
    /**
     * Display a listing of sales refunds and returns.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $tenantId = $user->tenant_id;

        $query = OrderRefund::where('tenant_id', $tenantId)
            ->with(['order:id,order_number,created_at,total_amount', 'store:id,name,code', 'cashier:id,name', 'items.product:id,name,sku']);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('refund_number', 'ilike', "%{$search}%")
                    ->orWhereHas('order', function ($oq) use ($search) {
                        $oq->where('order_number', 'ilike', "%{$search}%");
                    });
            });
        }

        if ($storeId = $request->query('store_id')) {
            $query->where('store_id', $storeId);
        }

        if ($date = $request->query('date')) {
            $query->whereDate('created_at', $date);
        }

        $refunds = $query->orderByDesc('created_at')->paginate(15)->withQueryString();

        // KPIs
        $totalRefundsCount = OrderRefund::where('tenant_id', $tenantId)->count();
        $totalRefundAmount = (float) OrderRefund::where('tenant_id', $tenantId)->sum('total_refund_amount');
        $totalRestockedItems = (float) OrderRefundItem::where('tenant_id', $tenantId)->where('restock', true)->sum('quantity');

        $stores = Store::where('tenant_id', $tenantId)->where('is_active', true)->select('id', 'name', 'code')->get();

        return Inertia::render('Refunds/Index', [
            'refunds' => $refunds,
            'stores' => $stores,
            'filters' => [
                'search' => $request->query('search', ''),
                'store_id' => $request->query('store_id', ''),
                'date' => $request->query('date', ''),
            ],
            'kpis' => [
                'total_refunds' => $totalRefundsCount,
                'total_refund_amount' => $totalRefundAmount,
                'total_restocked_items' => $totalRestockedItems,
            ],
        ]);
    }

    /**
     * Lookup an existing order by invoice number to prepare refund.
     */
    public function lookupOrder(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $orderNumber = trim($request->query('order_number', ''));

        if (empty($orderNumber)) {
            return response()->json(['status' => 'error', 'message' => 'Nomor faktur wajib diisi.'], 422);
        }

        $order = Order::where('tenant_id', $tenantId)
            ->where(function ($q) use ($orderNumber) {
                $q->where('order_number', $orderNumber);
                if (Str::isUuid($orderNumber)) {
                    $q->orWhere('id', $orderNumber);
                }
            })
            ->with(['items.product:id,name,sku,unit_id,selling_price', 'store:id,name,code', 'customer:id,name,phone'])
            ->first();

        if (! $order) {
            return response()->json([
                'status' => 'error',
                'message' => "Faktur pesanan '{$orderNumber}' tidak ditemukan.",
            ], 404);
        }

        // Map items with remaining refundable quantities
        $items = $order->items->map(function ($item) {
            $refundedQty = (float) OrderRefundItem::where('order_item_id', $item->id)->sum('quantity');
            $availableQty = max(0, (float) $item->quantity - $refundedQty);

            return [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'product_name' => $item->product_name,
                'product_sku' => $item->product_sku,
                'original_quantity' => (float) $item->quantity,
                'already_refunded_quantity' => $refundedQty,
                'available_quantity' => $availableQty,
                'unit_price' => (float) $item->unit_price,
                'subtotal' => (float) $item->subtotal,
            ];
        });

        return response()->json([
            'status' => 'success',
            'order' => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'created_at' => $order->created_at->format('Y-m-d H:i:s'),
                'total_amount' => (float) $order->total_amount,
                'payment_method' => $order->payment_method,
                'status' => $order->status,
                'store' => $order->store,
                'customer' => $order->customer,
                'items' => $items,
            ],
        ]);
    }

    /**
     * Store a new refund / return.
     */
    public function store(Request $request, RefundService $refundService)
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'order_id' => ['required', 'uuid', 'exists:orders,id'],
            'type' => ['required', 'string', 'in:full_refund,partial_refund,exchange'],
            'refund_method' => ['required', 'string', 'in:cash,original_method,store_credit'],
            'reason' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:500'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.order_item_id' => ['required', 'uuid', 'exists:order_items,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.01'],
            'items.*.restock' => ['boolean'],
            'items.*.condition' => ['required', 'string', 'in:good,damaged,expired'],
        ]);

        $order = Order::where('tenant_id', $tenantId)->findOrFail($validated['order_id']);

        try {
            $refund = $refundService->processRefund($order, $validated, $request->user());

            if ($request->wantsJson()) {
                return response()->json([
                    'status' => 'success',
                    'message' => "Refund nomor {$refund->refund_number} berhasil diproses.",
                    'refund' => $refund,
                ]);
            }

            return redirect()->back()->with('success', "Refund nomor {$refund->refund_number} berhasil diproses.");
        } catch (DomainException $e) {
            if ($request->wantsJson()) {
                return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
            }

            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Show refund details for slip / credit note printing.
     */
    public function show(OrderRefund $refund): JsonResponse
    {
        $tenantId = auth()->user()->tenant_id;
        if ($refund->tenant_id !== $tenantId) {
            abort(403);
        }

        $refund->load(['order.customer', 'store', 'cashier', 'supervisor', 'items.product']);

        return response()->json([
            'status' => 'success',
            'refund' => $refund,
        ]);
    }
}
