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
        'paper_size',
        'header_text',
        'footer_text',
        'show_logo',
        'show_cashier',
        'show_customer',
        'show_tax_details',
        'show_barcode',
        'auto_print',
        'open_cash_drawer',
        'auto_cut',
        'connection_type',
        'printer_ip',
        'printer_port',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'show_logo' => 'boolean',
        'show_cashier' => 'boolean',
        'show_customer' => 'boolean',
        'show_tax_details' => 'boolean',
        'show_barcode' => 'boolean',
        'auto_print' => 'boolean',
        'open_cash_drawer' => 'boolean',
        'auto_cut' => 'boolean',
        'printer_port' => 'integer',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }
}
