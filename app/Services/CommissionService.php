<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderRefund;
use App\Models\SalesCommission;
use App\Models\User;

class CommissionService
{
    /**
     * Calculate and record sales commission for cashier/sales rep upon order completion.
     */
    public function calculateAndRecordCommission(
        Order $order,
        ?User $salesRep = null,
        float $ratePercentage = 2.00
    ): ?SalesCommission {
        $repUser = $salesRep ?: $order->cashier;
        if (! $repUser) {
            return null;
        }

        $netSales = max(0, (float) $order->subtotal - (float) $order->discount_amount);
        if ($netSales <= 0) {
            return null;
        }

        $commissionAmount = round($netSales * ($ratePercentage / 100), 2);

        return SalesCommission::create([
            'tenant_id' => $order->tenant_id,
            'order_id' => $order->id,
            'user_id' => $repUser->id,
            'rate_percentage' => $ratePercentage,
            'commission_amount' => $commissionAmount,
            'status' => 'approved',
            'approved_by_id' => auth()->id(),
            'approved_at' => now(),
        ]);
    }

    /**
     * Reverse or adjust sales commission when an order is refunded.
     */
    public function reverseCommissionOnRefund(OrderRefund $refund): ?SalesCommission
    {
        $existingCommission = SalesCommission::where('order_id', $refund->order_id)
            ->where('commission_amount', '>', 0)
            ->first();

        if (! $existingCommission) {
            return null;
        }

        $rate = (float) $existingCommission->rate_percentage;
        $refundAmount = (float) $refund->total_refund_amount;
        $reversalAmount = -round($refundAmount * ($rate / 100), 2);

        return SalesCommission::create([
            'tenant_id' => $refund->tenant_id,
            'order_id' => $refund->order_id,
            'user_id' => $existingCommission->user_id,
            'order_refund_id' => $refund->id,
            'rate_percentage' => $rate,
            'commission_amount' => $reversalAmount,
            'status' => 'reversed',
            'approved_by_id' => auth()->id(),
            'approved_at' => now(),
        ]);
    }
}
