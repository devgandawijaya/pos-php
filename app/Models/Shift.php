<?php

namespace App\Models;

use App\Traits\BelongsToStore;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shift extends Model
{
    use BelongsToStore, BelongsToTenant, HasFactory, HasUuids;

    protected $fillable = [
        'tenant_id',
        'store_id',
        'register_id',
        'user_id',
        'approved_by_id',
        'status',
        'opened_at',
        'closed_at',
        'opening_cash',
        'expected_cash',
        'actual_cash',
        'cash_difference',
        'notes',
        'approval_status',
        'approved_at',
    ];

    protected $casts = [
        'opening_cash' => 'decimal:2',
        'expected_cash' => 'decimal:2',
        'actual_cash' => 'decimal:2',
        'cash_difference' => 'decimal:2',
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
        'approved_at' => 'datetime',
    ];

    public function register(): BelongsTo
    {
        return $this->belongsTo(Register::class);
    }

    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_id');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(ShiftCashMovement::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(OrderPayment::class);
    }

    public function isOpen(): bool
    {
        return $this->status === 'open';
    }

    public function isClosed(): bool
    {
        return $this->status === 'closed';
    }
}
