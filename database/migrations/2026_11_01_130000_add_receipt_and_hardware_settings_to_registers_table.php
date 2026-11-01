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
        Schema::table('registers', function (Blueprint $table) {
            $table->string('paper_size', 10)->default('80mm')->after('printer_type'); // '58mm' or '80mm'
            $table->text('header_text')->nullable()->after('paper_size');
            $table->text('footer_text')->nullable()->after('header_text');
            $table->boolean('show_logo')->default(true)->after('footer_text');
            $table->boolean('show_cashier')->default(true)->after('show_logo');
            $table->boolean('show_customer')->default(true)->after('show_cashier');
            $table->boolean('show_tax_details')->default(true)->after('show_customer');
            $table->boolean('show_barcode')->default(true)->after('show_tax_details');
            $table->boolean('auto_print')->default(false)->after('show_barcode');
            $table->boolean('open_cash_drawer')->default(true)->after('auto_print');
            $table->boolean('auto_cut')->default(true)->after('open_cash_drawer');
            $table->string('connection_type', 20)->default('browser')->after('auto_cut'); // 'browser', 'network', 'bluetooth'
            $table->string('printer_ip', 50)->nullable()->after('connection_type');
            $table->integer('printer_port')->default(9100)->after('printer_ip');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('registers', function (Blueprint $table) {
            $table->dropColumn([
                'paper_size',
                'header_text',
                'footer_text',
                'show_logo',
                'show_cashier',
                'show_customer',
                'show_tax_details',
                'show_barcode',
                'auto_print',
                'open_cash_drawer',
                'auto_cut',
                'connection_type',
                'printer_ip',
                'printer_port',
            ]);
        });
    }
};
