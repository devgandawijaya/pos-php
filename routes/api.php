<?php

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;

Route::prefix('v1')->group(function () {
    // Health check
    Route::get('/health', function () {
        return response()->json([
            'status' => 'ok',
            'timestamp' => now()->toIso8601String(),
            'service' => config('app.name'),
        ]);
    });

    // Public API Login
    Route::post('/auth/login', function (Request $request) {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Kredensial yang diberikan tidak cocok dengan data kami.'],
            ]);
        }

        if ($user->status !== 'active') {
            return response()->json(['message' => 'Akun Anda dinonaktifkan.'], 403);
        }

        $token = $user->createToken('pos-api-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles->pluck('slug'),
                'tenant_id' => $user->tenant_id,
            ],
        ]);
    });

    // Protected API Endpoints
    Route::middleware(['auth:sanctum', 'tenant'])->group(function () {
        Route::get('/me', function (Request $request) {
            $user = $request->user();
            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'tenant' => $user->tenant,
                    'roles' => $user->roles->pluck('slug'),
                    'permissions' => $user->isSuperAdmin() ? ['*'] : $user->roles->flatMap->permissions->pluck('name')->unique()->values(),
                ],
            ]);
        });

        Route::post('/auth/logout', function (Request $request) {
            $request->user()->currentAccessToken()->delete();
            return response()->json(['message' => 'Berhasil logout.']);
        });
    });
});

