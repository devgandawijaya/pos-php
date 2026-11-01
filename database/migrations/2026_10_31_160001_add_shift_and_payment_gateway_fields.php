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
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignUuid('shift_id')->nullable()->after('register_id')->constrained('shifts')->nullOnDelete();
            $table->index(['tenant_id', 'shift_id']);
        });

        Schema::table('order_payments', function (Blueprint $table) {
            $table->foreignUuid('shift_id')->nullable()->after('order_id')->constrained('shifts')->nullOnDelete();
            $table->string('gateway_transaction_id', 100)->nullable()->after('reference_number');
            $table->string('payment_channel', 50)->nullable()->after('gateway_transaction_id');
            $table->string('approval_code', 50)->nullable()->after('payment_channel');
            $table->jsonb('metadata')->nullable()->after('approval_code');
            $table->index(['tenant_id', 'shift_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_payments', function (Blueprint $table) {
            $table->dropForeign(['shift_id']);
            $table->dropColumn(['shift_id', 'gateway_transaction_id', 'payment_channel', 'approval_code', 'metadata']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['shift_id']);
            $table->dropColumn(['shift_id']);
        });
    }
};
