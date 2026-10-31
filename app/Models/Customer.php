<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Customer extends Model
{
    use BelongsToTenant, HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'customer_group_id',
        'code',
        'name',
        'phone',
        'email',
        'address',
        'loyalty_points',
        'credit_limit',
        'balance',
        'status',
        'notes',
    ];

    protected $casts = [
        'loyalty_points' => 'integer',
        'credit_limit' => 'decimal:2',
        'balance' => 'decimal:2',
    ];

    public function customerGroup(): BelongsTo
    {
        return $this->belongsTo(CustomerGroup::class, 'customer_group_id');
    }
}
