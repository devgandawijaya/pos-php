<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class UserStoreAccess extends Pivot
{
    protected $table = 'user_store_access';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'store_id',
        'is_default',
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];
}
