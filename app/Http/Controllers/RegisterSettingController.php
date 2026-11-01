<?php

namespace App\Http\Controllers;

use App\Models\Register;
use App\Models\Store;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RegisterSettingController extends Controller
{
    /**
     * Display cash register and receipt printout settings.
     */
    public function index(Request $request): Response
    {
        $tenantId = $request->user()->tenant_id;

        $stores = Store::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'address', 'phone', 'email', 'tax_percentage']);

        $selectedStoreId = $request->input('store_id') ?: $request->session()->get('active_store_id') ?: $stores->first()?->id;

        $selectedStore = $stores->firstWhere('id', $selectedStoreId) ?? $stores->first();

        // Get or create default register for the store
        $registers = [];
        if ($selectedStore) {
            $registers = Register::where('store_id', $selectedStore->id)
                ->where('tenant_id', $tenantId)
                ->orderBy('code')
                ->get();

            if ($registers->isEmpty()) {
                $defaultRegister = Register::create([
                    'tenant_id' => $tenantId,
                    'store_id' => $selectedStore->id,
                    'code' => 'POS-01',
                    'name' => 'Mesin Kasir Utama 01',
                    'printer_type' => 'thermal_80mm',
                    'paper_size' => '80mm',
                    'header_text' => 'Selamat Datang di Toko Kami',
                    'footer_text' => 'Barang yang sudah dibeli dapat ditukar maksimal 2x24 jam dengan membawa struk asli. Terima kasih!',
                    'show_logo' => true,
                    'show_cashier' => true,
                    'show_customer' => true,
                    'show_tax_details' => true,
                    'show_barcode' => true,
                    'auto_print' => false,
                    'open_cash_drawer' => true,
                    'auto_cut' => true,
                    'connection_type' => 'browser',
                    'is_active' => true,
                ]);
                $registers = collect([$defaultRegister]);
            }
        }

        return Inertia::render('Settings/PosRegister', [
            'stores' => $stores,
            'selectedStore' => $selectedStore,
            'registers' => $registers,
        ]);
    }

    /**
     * Update register and receipt settings.
     */
    public function update(Request $request, Register $register): RedirectResponse
    {
        $tenantId = $request->user()->tenant_id;

        if ($register->tenant_id !== $tenantId) {
            abort(403, 'Akses tidak diizinkan.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'printer_type' => ['required', 'string', 'max:50'],
            'paper_size' => ['required', 'in:58mm,80mm'],
            'header_text' => ['nullable', 'string', 'max:1000'],
            'footer_text' => ['nullable', 'string', 'max:1000'],
            'show_logo' => ['boolean'],
            'show_cashier' => ['boolean'],
            'show_customer' => ['boolean'],
            'show_tax_details' => ['boolean'],
            'show_barcode' => ['boolean'],
            'auto_print' => ['boolean'],
            'open_cash_drawer' => ['boolean'],
            'auto_cut' => ['boolean'],
            'connection_type' => ['required', 'in:browser,network,bluetooth'],
            'printer_ip' => ['nullable', 'string', 'max:50'],
            'printer_port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'is_active' => ['boolean'],
        ]);

        $register->update($validated);

        return back()->with('success', "Pengaturan mesin kasir {$register->name} berhasil disimpan.");
    }
}
