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
        // 1. Stores
        Schema::create('stores', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('code', 30);
            $table->string('name');
            $table->text('address')->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('email')->nullable();
            $table->string('timezone', 50)->default('Asia/Jakarta');
            $table->decimal('tax_percentage', 5, 2)->default(11.00); // Default PPN 11%
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'code']);
            $table->index(['tenant_id', 'is_active']);
        });

        // 2. Warehouses
        Schema::create('warehouses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('store_id')->nullable()->constrained('stores')->nullOnDelete();
            $table->string('code', 30);
            $table->string('name');
            $table->text('address')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'code']);
            $table->index(['tenant_id', 'is_active']);
        });

        // 3. Registers (Cashier POS Terminals)
        Schema::create('registers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('store_id')->constrained('stores')->cascadeOnDelete();
            $table->string('code', 30);
            $table->string('name');
            $table->string('printer_type', 30)->default('thermal_80mm');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['store_id', 'code']);
            $table->index(['tenant_id', 'store_id', 'is_active']);
        });

        // 4. User Store Assignment Pivot
        Schema::create('user_store_access', function (Blueprint $table) {
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('store_id')->constrained('stores')->cascadeOnDelete();
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->primary(['user_id', 'store_id']);
            $table->index(['tenant_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_store_access');
        Schema::dropIfExists('registers');
        Schema::dropIfExists('warehouses');
        Schema::dropIfExists('stores');
    }
};
