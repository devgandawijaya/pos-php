<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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

