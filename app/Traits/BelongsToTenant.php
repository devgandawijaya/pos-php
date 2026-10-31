<?php

namespace App\Traits;

use App\Models\Tenant;
use App\Services\TenantManager;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

trait BelongsToTenant
{
    /**
     * Boot the trait and apply tenant global scope and automatic assignment.
     */
    protected static function bootBelongsToTenant(): void
    {
        static::addGlobalScope('tenant_isolation', function (Builder $builder) {
            $tenantId = null;

            if (auth()->check() && auth()->user()->tenant_id) {
                $tenantId = auth()->user()->tenant_id;
            } elseif (app()->bound(TenantManager::class) && app(TenantManager::class)->getTenantId()) {
                $tenantId = app(TenantManager::class)->getTenantId();
            }

            if ($tenantId !== null) {
                $builder->where($builder->getModel()->getTable() . '.tenant_id', $tenantId);
            }
        });

        static::creating(function ($model) {
            if (empty($model->tenant_id)) {
                if (auth()->check() && auth()->user()->tenant_id) {
                    $model->tenant_id = auth()->user()->tenant_id;
                } elseif (app()->bound(TenantManager::class) && app(TenantManager::class)->getTenantId()) {
                    $model->tenant_id = app(TenantManager::class)->getTenantId();
                }
            }
        });
    }

    /**
     * Relationship to the Tenant owner.
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }
}

