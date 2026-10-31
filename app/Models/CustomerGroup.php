<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CustomerGroup extends Model
{
    use BelongsToTenant, HasFactory, HasUuids;

    protected $fillable = [
        'tenant_id',
        'name',
        'discount_percentage',
    ];

    protected $casts = [
        'discount_percentage' => 'decimal:2',
    ];

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class);
    }
}
