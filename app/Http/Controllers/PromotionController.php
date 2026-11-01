<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\CustomerGroup;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Promotion;
use App\Models\PromotionUsage;
use App\Services\PromotionService;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PromotionController extends Controller
{
    /**
     * Display a listing of promotions and coupon vouchers.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $tenantId = $user->tenant_id;

        $query = Promotion::where('tenant_id', $tenantId);

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('code', 'ilike', "%{$search}%");
            });
        }

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        if ($status = $request->query('status')) {
            if ($status === 'active') {
                $query->where('is_active', true);
            } elseif ($status === 'inactive') {
                $query->where('is_active', false);
            }
        }

        $promotions = $query->orderByDesc('created_at')->paginate(15)->withQueryString();

        // KPIs
        $activePromosCount = Promotion::where('tenant_id', $tenantId)->where('is_active', true)->count();
        $totalUsagesCount = (int) PromotionUsage::where('tenant_id', $tenantId)->count();
        $totalDiscountGiven = (float) PromotionUsage::where('tenant_id', $tenantId)->sum('discount_amount');

        // Master data options for targets
        $categories = ProductCategory::where('tenant_id', $tenantId)->where('is_active', true)->select('id', 'name')->get();
        $products = Product::where('tenant_id', $tenantId)->where('status', 'active')->select('id', 'name', 'sku')->limit(50)->get();
        $customerGroups = CustomerGroup::where('tenant_id', $tenantId)->select('id', 'name')->get();

        return Inertia::render('Promotions/Index', [
            'promotions' => $promotions,
            'filters' => [
                'search' => $request->query('search', ''),
                'type' => $request->query('type', ''),
                'status' => $request->query('status', ''),
            ],
            'kpis' => [
                'active_promos' => $activePromosCount,
                'total_usages' => $totalUsagesCount,
                'total_discount_given' => $totalDiscountGiven,
            ],
            'categories' => $categories,
            'products' => $products,
            'customerGroups' => $customerGroups,
        ]);
    }

    /**
     * Store a newly created promotion in storage.
     */
    public function store(Request $request)
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'type' => ['required', 'string', 'in:percentage,fixed,buy_x_get_y'],
            'discount_value' => ['required', 'numeric', 'min:0'],
            'min_order_amount' => ['nullable', 'numeric', 'min:0'],
            'max_discount_amount' => ['nullable', 'numeric', 'min:0'],
            'buy_quantity' => ['nullable', 'integer', 'min:1'],
            'get_quantity' => ['nullable', 'integer', 'min:1'],
            'target_type' => ['required', 'string', 'in:all,product,category,customer_group'],
            'target_id' => ['nullable', 'uuid'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'is_active' => ['boolean'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $validated['tenant_id'] = $tenantId;
        if (! empty($validated['code'])) {
            $validated['code'] = strtoupper(trim($validated['code']));
        }

        $promotion = Promotion::create($validated);

        if ($request->wantsJson()) {
            return response()->json([
                'status' => 'success',
                'message' => 'Promosi berhasil dibuat.',
                'promotion' => $promotion,
            ]);
        }

        return redirect()->back()->with('success', 'Promosi berhasil ditambahkan.');
    }

    /**
     * Update an existing promotion.
     */
    public function update(Request $request, Promotion $promotion)
    {
        $tenantId = $request->user()->tenant_id;
        if ($promotion->tenant_id !== $tenantId) {
            abort(403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'code' => ['nullable', 'string', 'max:50'],
            'type' => ['required', 'string', 'in:percentage,fixed,buy_x_get_y'],
            'discount_value' => ['required', 'numeric', 'min:0'],
            'min_order_amount' => ['nullable', 'numeric', 'min:0'],
            'max_discount_amount' => ['nullable', 'numeric', 'min:0'],
            'buy_quantity' => ['nullable', 'integer', 'min:1'],
            'get_quantity' => ['nullable', 'integer', 'min:1'],
            'target_type' => ['required', 'string', 'in:all,product,category,customer_group'],
            'target_id' => ['nullable', 'uuid'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'usage_limit' => ['nullable', 'integer', 'min:1'],
            'is_active' => ['boolean'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        if (! empty($validated['code'])) {
            $validated['code'] = strtoupper(trim($validated['code']));
        }

        $promotion->update($validated);

        if ($request->wantsJson()) {
            return response()->json([
                'status' => 'success',
                'message' => 'Promosi berhasil diperbarui.',
                'promotion' => $promotion,
            ]);
        }

        return redirect()->back()->with('success', 'Promosi berhasil diperbarui.');
    }

    /**
     * Toggle or delete promotion.
     */
    public function destroy(Promotion $promotion)
    {
        $tenantId = auth()->user()->tenant_id;
        if ($promotion->tenant_id !== $tenantId) {
            abort(403);
        }

        $promotion->delete();

        return redirect()->back()->with('success', 'Promosi berhasil dihapus.');
    }

    /**
     * Validate coupon code for POS Checkout.
     */
    public function validateCoupon(Request $request, PromotionService $promotionService): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string'],
            'subtotal' => ['required', 'numeric', 'min:0'],
            'items' => ['nullable', 'array'],
            'customer_id' => ['nullable', 'uuid'],
        ]);

        try {
            $customer = ! empty($validated['customer_id'])
                ? Customer::find($validated['customer_id'])
                : null;

            $result = $promotionService->validateCoupon(
                code: $validated['code'],
                subtotal: (float) $validated['subtotal'],
                cartItems: $validated['items'] ?? [],
                customer: $customer,
                tenantId: $request->user()->tenant_id
            );

            return response()->json([
                'status' => 'success',
                'data' => $result,
            ]);
        } catch (DomainException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
