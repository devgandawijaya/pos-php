<?php

namespace App\Services;

use App\Models\Tenant;

class TenantManager
{
    protected ?Tenant $currentTenant = null;

    /**
     * Set the active tenant in context.
     */
    public function setTenant(?Tenant $tenant): void
    {
        $this->currentTenant = $tenant;
    }

    /**
     * Get the active tenant.
     */
    public function getTenant(): ?Tenant
    {
        return $this->currentTenant;
    }

    /**
     * Get the active tenant ID if available.
     */
    public function getTenantId(): ?string
    {
        return $this->currentTenant?->id;
    }

    /**
     * Check if a tenant is currently bound.
     */
    public function hasTenant(): bool
    {
        return $this->currentTenant !== null;
    }
}
