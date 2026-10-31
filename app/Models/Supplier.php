<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Supplier extends Model
{
    use BelongsToTenant, HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'code',
        'name',
        'contact_person',
        'phone',
        'email',
        'address',
        'payment_terms_days',
        'balance',
        'is_active',
        'notes',
    ];

    protected $casts = [
        'payment_terms_days' => 'integer',
        'balance' => 'decimal:2',
        'is_active' => 'boolean',
    ];
}
