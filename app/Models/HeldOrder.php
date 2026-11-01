<?php

namespace App\Models;

use App\Traits\BelongsToStore;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HeldOrder extends Model
{
    use BelongsToStore, BelongsToTenant, HasFactory, HasUuids;

    protected $fillable = [
        'tenant_id',
        'store_id',
        'register_id',
        'user_id',
        'customer_id',
        'reference_note',
        'cart_payload',
        'expires_at',
    ];

    protected $casts = [
        'cart_payload' => 'array',
        'expires_at' => 'datetime',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function register(): BelongsTo
    {
        return $this->belongsTo(Register::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
