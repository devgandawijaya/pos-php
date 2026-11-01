<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\Store;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    /**
     * Display a listing of tenant users with filters.
     */
    public function index(Request $request): Response
    {
        $tenantId = $request->user()->tenant_id;

        $query = User::where('tenant_id', $tenantId)
            ->with(['roles:id,name,slug,description', 'stores:id,name,code'])
            ->latest();

        // Search filter
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%")
                    ->orWhere('phone', 'ilike', "%{$search}%");
            });
        }

        // Role filter
        if ($roleSlug = $request->input('role')) {
            $query->whereHas('roles', function ($q) use ($roleSlug) {
                $q->where('slug', $roleSlug);
            });
        }

        // Store filter
        if ($storeId = $request->input('store_id')) {
            $query->whereHas('stores', function ($q) use ($storeId) {
                $q->where('stores.id', $storeId);
            });
        }

        // Status filter
        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $users = $query->paginate(15)->withQueryString();

        // Available roles for selection (excluding super-admin)
        $roles = Role::where(function ($q) use ($tenantId) {
            $q->where('tenant_id', $tenantId)
                ->orWhereNull('tenant_id');
        })
            ->where('slug', '!=', 'super-admin')
            ->orderBy('name')
            ->get(['id', 'name', 'slug', 'description']);

        // Available stores for selection
        $stores = Store::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name', 'code']);

        return Inertia::render('Users/Index', [
            'users' => $users,
            'roles' => $roles,
            'stores' => $stores,
            'filters' => $request->only(['search', 'role', 'store_id', 'status']),
        ]);
    }

    /**
     * Store a newly created user in storage.
     */
    public function store(Request $request): RedirectResponse
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->where(fn ($q) => $q->whereNull('deleted_at')),
            ],
            'phone' => ['nullable', 'string', 'max:30'],
            'password' => ['required', 'string', 'min:6'],
            'role_id' => ['required', 'uuid', 'exists:roles,id'],
            'store_ids' => ['nullable', 'array'],
            'store_ids.*' => ['uuid', 'exists:stores,id'],
            'default_store_id' => ['nullable', 'uuid', 'exists:stores,id'],
            'status' => ['required', 'in:active,inactive'],
        ]);

        $user = User::create([
            'tenant_id' => $tenantId,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'password' => Hash::make($validated['password']),
            'status' => $validated['status'],
        ]);

        // Assign Role
        $user->roles()->sync([$validated['role_id']]);

        // Assign Stores
        $storeIds = $validated['store_ids'] ?? [];
        $defaultStoreId = $validated['default_store_id'] ?? ($storeIds[0] ?? null);

        $storeSyncData = [];
        foreach ($storeIds as $storeId) {
            $storeSyncData[$storeId] = [
                'tenant_id' => $tenantId,
                'is_default' => ($storeId === $defaultStoreId),
            ];
        }

        if (! empty($storeSyncData)) {
            $user->stores()->sync($storeSyncData);
        }

        return back()->with('success', "Pengguna {$user->name} berhasil ditambahkan.");
    }

    /**
     * Update the specified user in storage.
     */
    public function update(Request $request, User $user): RedirectResponse
    {
        $tenantId = $request->user()->tenant_id;

        if ($user->tenant_id !== $tenantId) {
            abort(403, 'Akses tidak diizinkan.');
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')
                    ->ignore($user->id)
                    ->where(fn ($q) => $q->whereNull('deleted_at')),
            ],
            'phone' => ['nullable', 'string', 'max:30'],
            'password' => ['nullable', 'string', 'min:6'],
            'role_id' => ['required', 'uuid', 'exists:roles,id'],
            'store_ids' => ['nullable', 'array'],
            'store_ids.*' => ['uuid', 'exists:stores,id'],
            'default_store_id' => ['nullable', 'uuid', 'exists:stores,id'],
            'status' => ['required', 'in:active,inactive'],
        ]);

        // Prevent self-deactivation
        if ($user->id === $request->user()->id && $validated['status'] === 'inactive') {
            return back()->withErrors(['error' => 'Anda tidak dapat menonaktifkan akun Anda sendiri yang sedang aktif.']);
        }

        $userData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'status' => $validated['status'],
        ];

        if (! empty($validated['password'])) {
            $userData['password'] = Hash::make($validated['password']);
        }

        $user->update($userData);

        // Update Role
        $user->roles()->sync([$validated['role_id']]);

        // Update Stores
        $storeIds = $validated['store_ids'] ?? [];
        $defaultStoreId = $validated['default_store_id'] ?? ($storeIds[0] ?? null);

        $storeSyncData = [];
        foreach ($storeIds as $storeId) {
            $storeSyncData[$storeId] = [
                'tenant_id' => $tenantId,
                'is_default' => ($storeId === $defaultStoreId),
            ];
        }

        $user->stores()->sync($storeSyncData);

        return back()->with('success', "Data pengguna {$user->name} berhasil diperbarui.");
    }

    /**
     * Remove the specified user from storage.
     */
    public function destroy(Request $request, User $user): RedirectResponse
    {
        $tenantId = $request->user()->tenant_id;

        if ($user->tenant_id !== $tenantId) {
            abort(403, 'Akses tidak diizinkan.');
        }

        if ($user->id === $request->user()->id) {
            return back()->withErrors(['error' => 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.']);
        }

        $userName = $user->name;
        $user->delete();

        return back()->with('success', "Pengguna {$userName} berhasil dihapus.");
    }
}
