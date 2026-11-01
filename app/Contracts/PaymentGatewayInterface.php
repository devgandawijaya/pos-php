<?php

namespace App\Contracts;

use App\Models\Order;

interface PaymentGatewayInterface
{
    /**
     * Create payment charge/request (e.g. QRIS string, VA number, redirect URL).
     */
    public function createCharge(Order $order, float $amount, string $paymentMethod, array $params = []): array;

    /**
     * Verify incoming webhook signature.
     */
    public function verifyWebhookSignature(string $signature, string $payload, ?string $secret = null): bool;

    /**
     * Process incoming webhook and update relevant order/payment status.
     */
    public function processWebhook(array $payload): array;
}
