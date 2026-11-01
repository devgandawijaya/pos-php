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
        // 1. Shifts table
        Schema::create('shifts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('store_id')->constrained('stores')->cascadeOnDelete();
            $table->foreignUuid('register_id')->constrained('registers')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete(); // Cashier
            $table->foreignUuid('approved_by_id')->nullable()->constrained('users')->nullOnDelete(); // Supervisor
            $table->string('status', 30)->default('open'); // open, closed
            $table->timestamp('opened_at');
            $table->timestamp('closed_at')->nullable();
            $table->decimal('opening_cash', 15, 2)->default(0);
            $table->decimal('expected_cash', 15, 2)->nullable();
            $table->decimal('actual_cash', 15, 2)->nullable();
            $table->decimal('cash_difference', 15, 2)->nullable();
            $table->text('notes')->nullable();
            $table->string('approval_status', 30)->default('not_required'); // not_required, pending, approved, rejected
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'store_id', 'status']);
            $table->index(['tenant_id', 'register_id', 'status']);
            $table->index(['tenant_id', 'user_id']);
        });

        // 2. Shift Cash Movements table (Cash In / Cash Out)
        Schema::create('shift_cash_movements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('shift_id')->constrained('shifts')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('type', 20); // cash_in, cash_out
            $table->decimal('amount', 15, 2);
            $table->string('reason', 255);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'shift_id']);
            $table->index(['tenant_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('shift_cash_movements');
        Schema::dropIfExists('shifts');
    }
};
