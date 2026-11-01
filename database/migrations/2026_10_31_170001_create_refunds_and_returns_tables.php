<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Order Refunds
        Schema::create('order_refunds', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignUuid('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete(); // Cashier/staff
            $table->foreignUuid('approved_by_id')->nullable()->constrained('users')->nullOnDelete(); // Supervisor
            $table->foreignUuid('shift_id')->nullable()->constrained('shifts')->nullOnDelete();
            $table->string('refund_number', 50);
            $table->string('type', 30)->default('full_refund'); // full_refund, partial_refund, exchange
            $table->string('status', 30)->default('completed'); // pending_approval, completed, rejected
            $table->decimal('total_refund_amount', 15, 2);
            $table->string('refund_method', 50)->default('cash'); // cash, original_method, store_credit
            $table->string('reason', 255); // defective, wrong_item, customer_change_mind, expired, other
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'refund_number']);
            $table->index(['tenant_id', 'order_id']);
            $table->index(['tenant_id', 'store_id', 'created_at']);
        });

        // 2. Order Refund Items
        Schema::create('order_refund_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('order_refund_id')->constrained('order_refunds')->cascadeOnDelete();
            $table->foreignUuid('order_item_id')->constrained('order_items')->cascadeOnDelete();
            $table->foreignUuid('product_id')->constrained('products')->cascadeOnDelete();
            $table->decimal('quantity', 12, 2);
            $table->decimal('unit_price', 15, 2);
            $table->decimal('refund_amount', 15, 2);
            $table->boolean('restock')->default(true);
            $table->string('condition', 30)->default('good'); // good, damaged, expired
            $table->timestamps();

            $table->index(['tenant_id', 'order_refund_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_refund_items');
        Schema::dropIfExists('order_refunds');
    }
};
