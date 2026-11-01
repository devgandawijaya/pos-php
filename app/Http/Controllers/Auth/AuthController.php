<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Register;
use App\Models\Role;
use App\Models\Store;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\Tenant;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    /**
     * Display the login view.
     */
    public function showLogin(): Response
    {
        return Inertia::render('Auth/Login');
    }

    /**
     * Display the registration view.
     */
    public function showRegister(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Handle business tenant and owner user registration.
     */
    public function register(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'business_name' => ['required', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:30'],
            'password' => ['required', 'string', 'min:6'],
        ]);

        $createdUser = null;

        DB::transaction(function () use ($validated, &$createdUser, $request) {
            $baseSlug = Str::slug($validated['business_name']) ?: 'toko-ritel';
            $slug = $baseSlug;
            $counter = 1;
            while (Tenant::where('slug', $slug)->exists()) {
                $slug = "{$baseSlug}-{$counter}";
                $counter++;
            }

            // 1. Create Tenant
            $tenant = Tenant::create([
                'name' => $validated['business_name'],
                'slug' => $slug,
                'email' => $validated['email'],
                'phone' => $validated['phone'],
                'currency' => 'IDR',
                'timezone' => 'Asia/Jakarta',
                'status' => 'trial',
                'is_active' => true,
            ]);

            // 2. Attach Free Trial (Starter Plan)
            $starterPlan = SubscriptionPlan::where('slug', 'starter')->first();
            if ($starterPlan) {
                Subscription::create([
                    'tenant_id' => $tenant->id,
                    'plan_id' => $starterPlan->id,
                    'status' => 'trial',
                    'billing_interval' => 'monthly',
                    'starts_at' => now(),
                    'ends_at' => now()->addDays(14),
                    'auto_renew' => true,
                ]);
            }

            // 3. Create Default Store
            $store = Store::create([
                'tenant_id' => $tenant->id,
                'code' => 'STR-01',
                'name' => 'Toko Utama '.$validated['business_name'],
                'timezone' => 'Asia/Jakarta',
                'tax_percentage' => 11.00,
                'is_active' => true,
            ]);

            // 4. Create Default Warehouse
            Warehouse::create([
                'tenant_id' => $tenant->id,
                'store_id' => $store->id,
                'code' => 'GDG-01',
                'name' => 'Gudang Toko Utama',
                'is_active' => true,
            ]);

            // 5. Create Default Register
            Register::create([
                'tenant_id' => $tenant->id,
                'store_id' => $store->id,
                'code' => 'POS-01',
                'name' => 'Mesin Kasir Utama',
                'printer_type' => 'thermal_80mm',
                'paper_size' => '80mm',
                'header_text' => 'Selamat Datang di '.$validated['business_name'],
                'footer_text' => 'Barang yang sudah dibeli dapat ditukar maksimal 2x24 jam dengan membawa struk asli. Terima kasih!',
                'show_logo' => true,
                'show_cashier' => true,
                'show_customer' => true,
                'show_tax_details' => true,
                'show_barcode' => true,
                'auto_print' => false,
                'open_cash_drawer' => true,
                'auto_cut' => true,
                'is_active' => true,
            ]);

            // 6. Create Owner User
            $roleOwner = Role::where('slug', 'owner')->first();

            $createdUser = User::create([
                'tenant_id' => $tenant->id,
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'],
                'password' => Hash::make($validated['password']),
                'status' => 'active',
            ]);

            if ($roleOwner) {
                $createdUser->roles()->sync([$roleOwner->id]);
            }

            $createdUser->stores()->sync([
                $store->id => ['tenant_id' => $tenant->id, 'is_default' => true],
            ]);

            // Set active store in session
            $request->session()->put('active_store_id', $store->id);
        });

        Auth::login($createdUser);
        $request->session()->regenerate();

        return redirect()->route('dashboard')->with('success', 'Selamat datang! Akun usaha Anda berhasil didaftarkan dengan paket uji coba gratis 14 hari.');
    }

    /**
     * Handle an incoming authentication request.
     */
    public function login(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $remember = $request->boolean('remember');

        if (! Auth::attempt($credentials, $remember)) {
            throw ValidationException::withMessages([
                'email' => __('auth.failed', [], 'id') ?: 'Kredensial yang diberikan tidak cocok dengan data kami.',
            ]);
        }

        $request->session()->regenerate();

        $user = Auth::user();

        if ($user->status !== 'active') {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            throw ValidationException::withMessages([
                'email' => 'Akun pengguna ini dinonaktifkan.',
            ]);
        }

        // Set default store in session
        if ($user->tenant_id && $defaultStore = $user->defaultStore()) {
            $request->session()->put('active_store_id', $defaultStore->id);
        }

        // If user is pure cashier, redirect directly to POS (when POS route is available) or dashboard
        return redirect()->intended(route('dashboard'));
    }

    /**
     * Destroy an authenticated session.
     */
    public function logout(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }

    /**
     * Switch active store in session.
     */
    public function switchStore(Request $request): RedirectResponse
    {
        $request->validate([
            'store_id' => ['required', 'uuid', 'exists:stores,id'],
        ]);

        $user = $request->user();

        if (! $user->canAccessStore($request->store_id)) {
            abort(403, 'Anda tidak memiliki akses ke toko ini.');
        }

        $request->session()->put('active_store_id', $request->store_id);

        return back()->with('success', 'Toko aktif berhasil diubah.');
    }
}
