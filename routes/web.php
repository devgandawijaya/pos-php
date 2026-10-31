<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProductController;
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
});
