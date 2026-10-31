<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\PosController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\PurchaseOrderController;
use App\Http\Controllers\StockTransferController;
use App\Http\Controllers\SupplierController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return auth()->check() ? redirect()->route('dashboard') : redirect()->route('login');
});

Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);
});

Route::middleware(['auth', 'tenant'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
    Route::post('/stores/switch', [AuthController::class, 'switchStore'])->name('stores.switch');

    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

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
    Route::post('/pos/checkout', [PosController::class, 'checkout'])->name('pos.checkout');
    Route::post('/pos/hold', [PosController::class, 'hold'])->name('pos.hold');
    Route::post('/pos/resume/{id}', [PosController::class, 'resume'])->name('pos.resume');
    Route::delete('/pos/held/{id}', [PosController::class, 'destroyHeld'])->name('pos.held.destroy');
    Route::get('/pos/receipt/{order}', [PosController::class, 'receipt'])->name('pos.receipt');
});
