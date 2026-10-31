<?php

use App\Http\Controllers\Api\InventoryApiController;
use App\Models\Brand;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;

Route::prefix('v1')->group(function () {
    // Health check
    Route::get('/health', function () {
        return response()->json([
            'status' => 'ok',
            'timestamp' => now()->toIso8601String(),
            'service' => config('app.name'),
        ]);
    });

    // Public API Login
    Route::post('/auth/login', function (Request $request) {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Kredensial yang diberikan tidak cocok dengan data kami.'],
            ]);
        }

        if ($user->status !== 'active') {
            return response()->json(['message' => 'Akun Anda dinonaktifkan.'], 403);
        }

        $token = $user->createToken('pos-api-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles->pluck('slug'),
                'tenant_id' => $user->tenant_id,
            ],
        ]);
    });

    // Protected API Endpoints
    Route::middleware(['auth:sanctum', 'tenant'])->group(function () {
        Route::get('/me', function (Request $request) {
            $user = $request->user();
            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'tenant' => $user->tenant,
                    'roles' => $user->roles->pluck('slug'),
                    'permissions' => $user->isSuperAdmin() ? ['*'] : $user->roles->flatMap->permissions->pluck('name')->unique()->values(),
                ],
            ]);
        });

        Route::post('/auth/logout', function (Request $request) {
            $request->user()->currentAccessToken()->delete();
            return response()->json(['message' => 'Berhasil logout.']);
        });

        // Phase 2: Master Data APIs
        Route::get('/products', function (Request $request) {
            $query = Product::with(['category:id,name', 'brand:id,name', 'unit:id,code,name']);
            if ($search = $request->query('search')) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'ilike', "%{$search}%")
                      ->orWhere('sku', 'ilike', "%{$search}%")
                      ->orWhere('barcode', 'ilike', "%{$search}%");
                });
            }
            return response()->json($query->paginate(20));
        });

        Route::get('/products/{id}', function (string $id) {
            $product = Product::with(['category', 'brand', 'unit', 'variants'])->findOrFail($id);
            return response()->json(['product' => $product]);
        });

        Route::get('/customers', function (Request $request) {
            $query = Customer::with('customerGroup:id,name,discount_percentage');
            if ($search = $request->query('search')) {
                $query->where('name', 'ilike', "%{$search}%")
                      ->orWhere('phone', 'ilike', "%{$search}%");
            }
            return response()->json($query->paginate(20));
        });

        Route::get('/suppliers', function (Request $request) {
            $query = Supplier::query();
            if ($search = $request->query('search')) {
                $query->where('name', 'ilike', "%{$search}%");
            }
            return response()->json($query->paginate(20));
        });

        Route::get('/categories', function () {
            return response()->json(['categories' => ProductCategory::where('is_active', true)->get()]);
        });

        Route::get('/brands', function () {
            return response()->json(['brands' => Brand::where('is_active', true)->get()]);
        });

        Route::get('/units', function () {
            return response()->json(['units' => Unit::where('is_active', true)->get()]);
        });

        // Phase 3: Inventory APIs
        Route::get('/inventory/balances', [InventoryApiController::class, 'balances']);
        Route::get('/inventory/movements', [InventoryApiController::class, 'movements']);
        Route::post('/inventory/adjust', [InventoryApiController::class, 'adjust']);
        Route::get('/inventory/transfers', [InventoryApiController::class, 'transfers']);
        Route::get('/inventory/purchase-orders', [InventoryApiController::class, 'purchaseOrders']);
    });
});
