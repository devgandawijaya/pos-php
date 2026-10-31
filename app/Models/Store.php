<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Store extends Model
{
    use BelongsToTenant, HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'code',
        'name',
        'address',
        'phone',
        'email',
        'timezone',
        'tax_percentage',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'tax_percentage' => 'decimal:2',
    ];

    public function warehouses(): HasMany
    {
        return $this->hasMany(Warehouse::class);
    }

    public function registers(): HasMany
    {
        return $this->hasMany(Register::class);
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_store_access')
            ->withPivot('is_default')
            ->withTimestamps();
    }
}

