<?php

namespace App\Traits;

use App\Models\Store;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToStore
{
    /**
     * Relationship to the Store.
     */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'store_id');
    }

    /**
     * Scope query to a specific store.
     */
    public function scopeForStore(Builder $query, string $storeId): Builder
    {
        return $query->where($this->getTable() . '.store_id', $storeId);
    }
}

