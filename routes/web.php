<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\LandingController;
use App\Http\Controllers\PosController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\PromotionController;
use App\Http\Controllers\PurchaseOrderController;
use App\Http\Controllers\RefundController;
use App\Http\Controllers\RegisterSettingController;
use App\Http\Controllers\ShiftController;
use App\Http\Controllers\StockTransferController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\SuperAdmin\TenantManagementController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/', [LandingController::class, 'index'])->name('landing');

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth-login');
    Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth-login')->name('register.submit');
});

Route::middleware(['auth', 'tenant'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::post('/stores/switch', [AuthController::class, 'switchStore'])->name('stores.switch');

    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/analytics/export', [DashboardController::class, 'export'])->name('analytics.export');

    // Phase 2: Master Data
    Route::resource('products', ProductController::class)->except(['create', 'show', 'edit']);
    Route::resource('customers', CustomerController::class)->except(['create', 'show', 'edit']);
    Route::resource('suppliers', SupplierController::class)->except(['create', 'show', 'edit']);

    // Phase 3: Inventory & Purchasing
    Route::get('/inventory', [InventoryController::class, 'index'])->name('inventory.index');
    Route::post('/inventory/adjust', [InventoryController::class, 'adjust'])->name('inventory.adjust');

    Route::get('/stock-transfers', [StockTransferController::class, 'index'])->name('stock-transfers.index');
    Route::post('/stock-transfers', [StockTransferController::class, 'store'])->name('stock-transfers.store');
    Route::post('/stock-transfers/{transfer}/dispatch', [StockTransferController::class, 'dispatchTransfer'])->name('stock-transfers.dispatch');
    Route::post('/stock-transfers/{transfer}/receive', [StockTransferController::class, 'receiveTransfer'])->name('stock-transfers.receive');

    Route::get('/purchase-orders', [PurchaseOrderController::class, 'index'])->name('purchase-orders.index');
    Route::post('/purchase-orders', [PurchaseOrderController::class, 'store'])->name('purchase-orders.store');
    Route::post('/purchase-orders/{po}/receive', [PurchaseOrderController::class, 'receive'])->name('purchase-orders.receive');

    // Phase 4: Core POS Engine
    Route::get('/pos', [PosController::class, 'terminal'])->name('pos.terminal');
    Route::post('/pos/checkout', [PosController::class, 'checkout'])->middleware('throttle:pos-checkout')->name('pos.checkout');
    Route::post('/pos/hold', [PosController::class, 'hold'])->name('pos.hold');
    Route::post('/pos/resume/{id}', [PosController::class, 'resume'])->name('pos.resume');
    Route::delete('/pos/held/{id}', [PosController::class, 'destroyHeld'])->name('pos.held.destroy');
    Route::get('/pos/receipt/{order}', [PosController::class, 'receipt'])->name('pos.receipt');

    // Phase 5: Payment & Shift Management
    Route::get('/shifts', [ShiftController::class, 'index'])->name('shifts.index');
    Route::post('/shifts', [ShiftController::class, 'store'])->name('shifts.store');
    Route::get('/shifts/active', [ShiftController::class, 'active'])->name('shifts.active');
    Route::post('/shifts/{shift}/cash-movement', [ShiftController::class, 'cashMovement'])->name('shifts.cash-movement');
    Route::post('/shifts/{shift}/close', [ShiftController::class, 'close'])->name('shifts.close');
    Route::post('/shifts/{shift}/approve', [ShiftController::class, 'approve'])->name('shifts.approve');
    Route::get('/shifts/{shift}/report', [ShiftController::class, 'report'])->name('shifts.report');

    // Phase 6: Promotions & After-Sales
    Route::resource('promotions', PromotionController::class)->except(['create', 'show', 'edit']);
    Route::post('/promotions/validate', [PromotionController::class, 'validateCoupon'])->name('promotions.validate');

    Route::get('/refunds', [RefundController::class, 'index'])->name('refunds.index');
    Route::get('/refunds/lookup-order', [RefundController::class, 'lookupOrder'])->name('refunds.lookup');
    Route::post('/refunds', [RefundController::class, 'store'])->name('refunds.store');
    Route::get('/refunds/{refund}', [RefundController::class, 'show'])->name('refunds.show');

    // Phase 8: SaaS Subscriptions & Billing
    Route::get('/subscription', [SubscriptionController::class, 'index'])->name('subscription.index');
    Route::post('/subscription/upgrade', [SubscriptionController::class, 'upgrade'])->name('subscription.upgrade');

    // User & Staff Management
    Route::resource('users', UserController::class)->except(['create', 'show', 'edit']);

    // Cash Register & Receipt Settings
    Route::get('/settings/registers', [RegisterSettingController::class, 'index'])->name('settings.registers.index');
    Route::put('/settings/registers/{register}', [RegisterSettingController::class, 'update'])->name('settings.registers.update');

    // Platform Super Admin
    Route::prefix('admin')->name('admin.')->group(function () {
        Route::get('/tenants', [TenantManagementController::class, 'index'])->name('tenants.index');
        Route::post('/tenants/switch', [TenantManagementController::class, 'switchTenant'])->name('tenants.switch');
        Route::post('/tenants/{tenant}/plan', [TenantManagementController::class, 'updatePlan'])->name('tenants.plan');
        Route::post('/tenants/{tenant}/status', [TenantManagementController::class, 'updateStatus'])->name('tenants.status');
    });
});
