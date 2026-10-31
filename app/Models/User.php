<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasUuids, Notifiable, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'name',
        'email',
        'phone',
        'password',
        'status',
        'avatar_url',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function roles(): BelongsToMany
    {
        return $this->belongsToMany(Role::class, 'user_roles');
    }

    public function stores(): BelongsToMany
    {
        return $this->belongsToMany(Store::class, 'user_store_access')
            ->withPivot('is_default')
            ->withTimestamps();
    }

    public function defaultStore(): ?Store
    {
        return $this->stores()->wherePivot('is_default', true)->first() ?? $this->stores()->first();
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole('super-admin');
    }

    public function isTenantOwner(): bool
    {
        return $this->hasRole('owner');
    }

    public function hasRole(string|array $roles): bool
    {
        if (is_array($roles)) {
            return $this->roles->pluck('slug')->intersect($roles)->isNotEmpty();
        }

        return $this->roles->contains('slug', $roles);
    }

    public function hasPermissionTo(string $permissionName): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        foreach ($this->roles as $role) {
            if ($role->permissions->contains('name', $permissionName)) {
                return true;
            }
        }

        return false;
    }

    public function assignRole(Role|string $role): void
    {
        if (is_string($role)) {
            $role = Role::where('slug', $role)
                ->where(function ($q) {
                    $q->whereNull('tenant_id')
                      ->orWhere('tenant_id', $this->tenant_id);
                })
                ->firstOrFail();
        }

        $this->roles()->syncWithoutDetaching([$role->id]);
    }

    public function canAccessStore(string $storeId): bool
    {
        if ($this->isSuperAdmin() || $this->hasRole(['owner', 'company-admin'])) {
            return true;
        }

        return $this->stores->contains('id', $storeId);
    }
}
