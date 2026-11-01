<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\Promotion;
use App\Models\PromotionUsage;
use DomainException;

class PromotionService
{
    /**
     * Validate coupon code against cart/order payload and compute discount deterministically.
     */
    public function validateCoupon(
        string $code,
        float $subtotal,
        array $cartItems = [],
        ?Customer $customer = null,
        ?string $tenantId = null
    ): array {
        $code = strtoupper(trim($code));
        $tenantId = $tenantId ?? auth()->user()?->tenant_id;

        $promotion = Promotion::where('tenant_id', $tenantId)
            ->whereRaw('UPPER(code) = ?', [$code])
            ->first();

        if (! $promotion) {
            throw new DomainException("Kupon atau kode promo '{$code}' tidak ditemukan.");
        }

        if (! $promotion->isValidNow()) {
            if (! $promotion->is_active) {
                throw new DomainException("Kode promo '{$code}' sudah tidak aktif.");
            }
            if ($promotion->usage_limit !== null && $promotion->usage_count >= $promotion->usage_limit) {
                throw new DomainException("Batas kuota penggunaan promo '{$code}' sudah habis.");
            }
            throw new DomainException("Kode promo '{$code}' belum berlaku atau sudah kedaluwarsa.");
        }

        // Minimum order purchase requirement
        if ($subtotal < (float) $promotion->min_order_amount) {
            throw new DomainException(
                "Minimal pembelanjaan untuk promo '{$code}' adalah Rp ".number_format($promotion->min_order_amount, 0, ',', '.').' (Subtotal saat ini: Rp '.number_format($subtotal, 0, ',', '.').').'
            );
        }

        // Target validation
        if ($promotion->target_type === 'customer_group' && $promotion->target_id) {
            if (! $customer || $customer->customer_group_id !== $promotion->target_id) {
                throw new DomainException("Promo '{$code}' khusus untuk grup pelanggan tertentu.");
            }
        }

        $discountAmount = 0;

        switch ($promotion->type) {
            case 'percentage':
                $discountAmount = round($subtotal * ((float) $promotion->discount_value / 100), 2);
                if ($promotion->max_discount_amount !== null) {
                    $discountAmount = min($discountAmount, (float) $promotion->max_discount_amount);
                }
                break;

            case 'fixed':
                $discountAmount = min($subtotal, (float) $promotion->discount_value);
                break;

            case 'buy_x_get_y':
                // Buy X get Y: check eligible product in cart items
                $buyQty = $promotion->buy_quantity ?: 1;
                $getQty = $promotion->get_quantity ?: 1;

                foreach ($cartItems as $item) {
                    if ($promotion->target_id && ($item['product_id'] ?? null) !== $promotion->target_id) {
                        continue;
                    }
                    $qty = (float) ($item['quantity'] ?? 0);
                    $unitPrice = (float) ($item['unit_price'] ?? 0);

                    if ($qty >= ($buyQty + $getQty)) {
                        $freeItems = floor($qty / ($buyQty + $getQty)) * $getQty;
                        $discountAmount += round($freeItems * $unitPrice, 2);
                    }
                }

                if ($discountAmount <= 0) {
                    throw new DomainException("Syarat kuantitas beli {$buyQty} gratis {$getQty} belum terpenuhi dalam keranjang.");
                }
                break;

            default:
                $discountAmount = 0;
        }

        return [
            'valid' => true,
            'promotion' => $promotion,
            'discount_amount' => $discountAmount,
            'message' => "Kode promo '{$promotion->name}' berhasil diterapkan.",
        ];
    }

    /**
     * Record usage of promotion upon order completion.
     */
    public function recordUsage(Promotion $promotion, Order $order, float $discountAmount, ?Customer $customer = null): PromotionUsage
    {
        $usage = PromotionUsage::create([
            'tenant_id' => $order->tenant_id,
            'promotion_id' => $promotion->id,
            'order_id' => $order->id,
            'customer_id' => $customer?->id ?? $order->customer_id,
            'discount_amount' => $discountAmount,
        ]);

        $promotion->increment('usage_count');

        return $usage;
    }
}
