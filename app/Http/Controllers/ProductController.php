<?php

namespace App\Http\Controllers;

use App\Models\Brand;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Unit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $query = Product::with(['category:id,name', 'brand:id,name', 'unit:id,code,name']);

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                  ->orWhere('sku', 'ilike', "%{$search}%")
                  ->orWhere('barcode', 'ilike', "%{$search}%");
            });
        }

        if ($categoryId = $request->input('category_id')) {
            $query->where('category_id', $categoryId);
        }

        if ($brandId = $request->input('brand_id')) {
            $query->where('brand_id', $brandId);
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $products = $query->orderBy('name')->paginate(15)->withQueryString();

        return Inertia::render('Products/Index', [
            'products' => $products,
            'categories' => ProductCategory::where('is_active', true)->select('id', 'name')->orderBy('name')->get(),
            'brands' => Brand::where('is_active', true)->select('id', 'name')->orderBy('name')->get(),
            'units' => Unit::where('is_active', true)->select('id', 'code', 'name')->orderBy('code')->get(),
            'filters' => $request->only(['search', 'category_id', 'brand_id', 'status']),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $tenantId = auth()->user()->tenant_id;

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'sku' => ['required', 'string', 'max:50', 'unique:products,sku,NULL,id,tenant_id,' . $tenantId],
            'barcode' => ['nullable', 'string', 'max:100'],
            'category_id' => ['nullable', 'uuid', 'exists:product_categories,id'],
            'brand_id' => ['nullable', 'uuid', 'exists:brands,id'],
            'unit_id' => ['required', 'uuid', 'exists:units,id'],
            'purchase_cost' => ['required', 'numeric', 'min:0'],
            'selling_price' => ['required', 'numeric', 'min:0'],
            'track_inventory' => ['boolean'],
            'min_stock' => ['numeric', 'min:0'],
            'max_stock' => ['numeric', 'min:0'],
            'description' => ['nullable', 'string'],
        ]);

        Product::create($validated);

        return back()->with('success', 'Produk berhasil ditambahkan.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Product $product): RedirectResponse
    {
        $tenantId = auth()->user()->tenant_id;

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'sku' => ['required', 'string', 'max:50', 'unique:products,sku,' . $product->id . ',id,tenant_id,' . $tenantId],
            'barcode' => ['nullable', 'string', 'max:100'],
            'category_id' => ['nullable', 'uuid', 'exists:product_categories,id'],
            'brand_id' => ['nullable', 'uuid', 'exists:brands,id'],
            'unit_id' => ['required', 'uuid', 'exists:units,id'],
            'purchase_cost' => ['required', 'numeric', 'min:0'],
            'selling_price' => ['required', 'numeric', 'min:0'],
            'track_inventory' => ['boolean'],
            'min_stock' => ['numeric', 'min:0'],
            'max_stock' => ['numeric', 'min:0'],
            'description' => ['nullable', 'string'],
            'status' => ['required', 'string', 'in:active,draft,archived'],
        ]);

        $product->update($validated);

        return back()->with('success', 'Produk berhasil diperbarui.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Product $product): RedirectResponse
    {
        $product->delete();

        return back()->with('success', 'Produk berhasil diarsipkan.');
    }
}
