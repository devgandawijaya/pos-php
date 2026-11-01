<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Promotion extends Model
{
    use BelongsToTenant, HasFactory, HasUuids;

    protected $fillable = [
        'tenant_id',
        'name',
        'code',
        'type',
        'discount_value',
        'min_order_amount',
        'max_discount_amount',
        'buy_quantity',
        'get_quantity',
        'target_type',
        'target_id',
        'start_date',
        'end_date',
        'usage_limit',
        'usage_count',
        'is_active',
        'description',
    ];

    protected $casts = [
        'discount_value' => 'decimal:2',
        'min_order_amount' => 'decimal:2',
        'max_discount_amount' => 'decimal:2',
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'is_active' => 'boolean',
        'buy_quantity' => 'integer',
        'get_quantity' => 'integer',
        'usage_limit' => 'integer',
        'usage_count' => 'integer',
    ];

    public function usages(): HasMany
    {
        return $this->hasMany(PromotionUsage::class);
    }

    public function isValidNow(): bool
    {
        if (! $this->is_active) {
            return false;
        }

        if ($this->usage_limit !== null && $this->usage_count >= $this->usage_limit) {
            return false;
        }

        $now = now();
        if ($this->start_date && $now->lt($this->start_date)) {
            return false;
        }

        if ($this->end_date && $now->gt($this->end_date)) {
            return false;
        }

        return true;
    }
}
