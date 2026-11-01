<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SalesCommission extends Model
{
    use BelongsToTenant, HasFactory, HasUuids;

    protected $fillable = [
        'tenant_id',
        'order_id',
        'user_id',
        'order_refund_id',
        'rate_percentage',
        'commission_amount',
        'status',
        'approved_by_id',
        'approved_at',
    ];

    protected $casts = [
        'rate_percentage' => 'decimal:2',
        'commission_amount' => 'decimal:2',
        'approved_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function refund(): BelongsTo
    {
        return $this->belongsTo(OrderRefund::class, 'order_refund_id');
    }

    public function supervisor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_id');
    }
}
