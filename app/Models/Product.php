<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use BelongsToTenant, HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'tenant_id',
        'category_id',
        'brand_id',
        'unit_id',
        'sku',
        'barcode',
        'name',
        'description',
        'image_url',
        'purchase_cost',
        'selling_price',
        'track_inventory',
        'min_stock',
        'max_stock',
        'status',
    ];

    protected $casts = [
        'purchase_cost' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'track_inventory' => 'boolean',
        'min_stock' => 'decimal:2',
        'max_stock' => 'decimal:2',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(ProductCategory::class, 'category_id');
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class, 'brand_id');
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'unit_id');
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function storePrices(): HasMany
    {
        return $this->hasMany(ProductPrice::class);
    }

    /**
     * Get effective price for a specific store if override exists, otherwise default selling price.
     */
    public function getPriceForStore(?string $storeId = null): string
    {
        if ($storeId) {
            $storePrice = $this->storePrices->firstWhere('store_id', $storeId);
            if ($storePrice) {
                return (string) $storePrice->selling_price;
            }
        }

        return (string) $this->selling_price;
    }
}
