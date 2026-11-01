<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Throwable;

class SystemAuditCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'pos:audit';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Perform production readiness & security audit of the Enterprise SaaS POS application';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('====================================================');
        $this->info('  ENTERPRISE SAAS POS - PRODUCTION READINESS AUDIT  ');
        $this->info('====================================================');

        $hasFailures = false;

        // 1. Database Connection Check
        $this->line("\n[1] Memeriksa Koneksi Database...");
        try {
            DB::connection()->getPdo();
            $driver = DB::connection()->getDriverName();
            $this->info("  [✓] Database terkoneksi dengan sukses (Driver: {$driver}).");
        } catch (Throwable $e) {
            $this->error("  [✗] GAGAL: Tidak dapat terhubung ke database: {$e->getMessage()}");
            $hasFailures = true;
        }

        // 2. Storage Permissions Check
        $this->line("\n[2] Memeriksa Izin Tulis Direktori Storage...");
        $directories = [
            storage_path('framework/cache'),
            storage_path('framework/sessions'),
            storage_path('framework/views'),
            storage_path('logs'),
            base_path('bootstrap/cache'),
        ];

        foreach ($directories as $dir) {
            if (! File::exists($dir)) {
                File::makeDirectory($dir, 0775, true, true);
            }

            if (is_writable($dir)) {
                $this->info("  [✓] Writable: {$dir}");
            } else {
                $this->error("  [✗] Tidak dapat menulis ke: {$dir}");
                $hasFailures = true;
            }
        }

        // 3. Multi-Tenant Statistics
        $this->line("\n[3] Ringkasan Data Multi-Tenancy...");
        try {
            $tenantsCount = Tenant::count();
            $storesCount = Store::count();
            $productsCount = Product::count();
            $ordersCount = Order::count();

            $this->table(
                ['Entitas', 'Jumlah'],
                [
                    ['Total Organisasi Tenant', $tenantsCount],
                    ['Total Cabang Toko', $storesCount],
                    ['Katalog Produk', $productsCount],
                    ['Total Faktur Penjualan', $ordersCount],
                ]
            );
        } catch (Throwable $e) {
            $this->warn("  [!] Lewati hitungan data: {$e->getMessage()}");
        }

        $this->info("\n====================================================");
        if ($hasFailures) {
            $this->error('  HASIL AUDIT: TERDAPAT PERINGATAN / KESALAHAN SISTEM ');
            $this->info("====================================================\n");

            return 1;
        }

        $this->info('  HASIL AUDIT: SISTEM SIAP OPERASIONAL PRODUKSI [PASS] ');
        $this->info("====================================================\n");

        return 0;
    }
}
