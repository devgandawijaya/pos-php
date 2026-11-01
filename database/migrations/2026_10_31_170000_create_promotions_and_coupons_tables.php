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
        // 1. Promotions
        Schema::create('promotions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('name', 255);
            $table->string('code', 50)->nullable(); // coupon/voucher code
            $table->string('type', 30); // percentage, fixed, buy_x_get_y
            $table->decimal('discount_value', 15, 2)->default(0);
            $table->decimal('min_order_amount', 15, 2)->default(0);
            $table->decimal('max_discount_amount', 15, 2)->nullable();
            $table->integer('buy_quantity')->nullable(); // for Buy X Get Y
            $table->integer('get_quantity')->nullable();
            $table->string('target_type', 30)->default('all'); // all, product, category, customer_group
            $table->uuid('target_id')->nullable();
            $table->timestamp('start_date')->nullable();
            $table->timestamp('end_date')->nullable();
            $table->integer('usage_limit')->nullable();
            $table->integer('usage_count')->default(0);
            $table->boolean('is_active')->default(true);
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'code']);
            $table->index(['tenant_id', 'is_active', 'start_date', 'end_date']);
        });

        // 2. Promotion Usages (Tracking history)
        Schema::create('promotion_usages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('promotion_id')->constrained('promotions')->cascadeOnDelete();
            $table->foreignUuid('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignUuid('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->decimal('discount_amount', 15, 2);
            $table->timestamps();

            $table->index(['tenant_id', 'promotion_id']);
            $table->index(['tenant_id', 'order_id']);
        });

        // Add promo snapshot to orders
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignUuid('promotion_id')->nullable()->after('customer_id')->constrained('promotions')->nullOnDelete();
            $table->string('coupon_code', 50)->nullable()->after('promotion_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['promotion_id']);
            $table->dropColumn(['promotion_id', 'coupon_code']);
        });
        Schema::dropIfExists('promotion_usages');
        Schema::dropIfExists('promotions');
    }
};
