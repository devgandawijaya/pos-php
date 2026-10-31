<?php

namespace App\Models;

use App\Traits\BelongsToStore;
use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Register extends Model
{
    use BelongsToStore, BelongsToTenant, HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'store_id',
        'code',
        'name',
        'printer_type',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}

