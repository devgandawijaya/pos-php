<?php

namespace App\Services\Payment;

use App\Contracts\PaymentGatewayInterface;
use App\Models\Order;
use App\Models\OrderPayment;
use App\Models\PaymentWebhook;
use DomainException;
use Illuminate\Support\Str;

class MockPaymentGatewayService implements PaymentGatewayInterface
{
    /**
     * Create payment charge/request.
     */
    public function createCharge(Order $order, float $amount, string $paymentMethod, array $params = []): array
    {
        $transactionId = 'GW-'.str_replace(['/', '-'], '', $order->order_number).'-'.strtoupper(Str::random(6));

        $result = [
            'transaction_id' => $transactionId,
            'order_id' => $order->id,
            'order_number' => $order->order_number,
            'amount' => $amount,
            'payment_method' => $paymentMethod,
            'status' => 'pending',
            'created_at' => now()->toIso8601String(),
            'expires_at' => now()->addMinutes(15)->toIso8601String(),
        ];

        if ($paymentMethod === 'qris') {
            $result['qr_string'] = '00020101021226680016ID.CO.QRIS.WWW01189360050300000898230215'.$transactionId.'5802ID5303360540'.number_format($amount, 2, '.', '').'5913POS ENTERPRISE6007JAKARTA6304';
            $result['qr_image_url'] = 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data='.urlencode($result['qr_string']);
        } elseif ($paymentMethod === 'transfer' || str_contains($paymentMethod, 'va')) {
            $bank = $params['bank'] ?? 'bca';
            $result['va_number'] = '8800'.rand(10000000, 99999999);
            $result['bank'] = strtoupper($bank);
        }

        return $result;
    }

    /**
     * Verify incoming webhook signature using HMAC-SHA256.
     */
    public function verifyWebhookSignature(string $signature, string $payload, ?string $secret = null): bool
    {
        $secretKey = $secret ?: config('services.payment_gateway.secret', 'pos_default_secret_token_123');
        $computed = hash_hmac('sha256', $payload, $secretKey);

        return hash_equals($computed, $signature);
    }

    /**
     * Process incoming webhook payload idempotently.
     */
    public function processWebhook(array $payload): array
    {
        $eventId = $payload['event_id'] ?? $payload['transaction_id'] ?? null;
        $orderNumber = $payload['order_number'] ?? null;
        $transactionStatus = strtolower($payload['transaction_status'] ?? $payload['status'] ?? 'unknown');

        if (! $eventId) {
            throw new DomainException('Webhook payload tidak memiliki event_id atau transaction_id.');
        }

        // Idempotency check: avoid processing same webhook twice
        $existingLog = PaymentWebhook::where('provider', 'mock_gateway')
            ->where('event_id', $eventId)
            ->first();

        if ($existingLog) {
            return [
                'status' => 'already_processed',
                'message' => 'Event webhook ini sudah pernah diproses sebelumnya (Idempotent).',
                'webhook_id' => $existingLog->id,
            ];
        }

        // Locate order
        $order = null;
        if ($orderNumber) {
            $order = Order::where('order_number', $orderNumber)->first();
        }

        $paymentStatus = match ($transactionStatus) {
            'capture', 'settlement', 'success' => 'success',
            'deny', 'cancel', 'expire', 'failed' => 'failed',
            default => 'pending',
        };

        if ($order) {
            // Update or find order payment
            $payment = OrderPayment::where('order_id', $order->id)
                ->where(function ($q) use ($payload) {
                    if (! empty($payload['gateway_transaction_id'])) {
                        $q->where('gateway_transaction_id', $payload['gateway_transaction_id']);
                    }
                    if (! empty($payload['payment_method'])) {
                        $q->orWhere('payment_method', $payload['payment_method']);
                    }
                })
                ->first();

            if ($payment) {
                $payment->update([
                    'status' => $paymentStatus,
                    'reference_number' => $payload['reference_number'] ?? $payment->reference_number,
                    'approval_code' => $payload['approval_code'] ?? $payment->approval_code,
                ]);
            }
        }

        // Record webhook execution log
        $webhookLog = PaymentWebhook::create([
            'tenant_id' => $order?->tenant_id,
            'provider' => 'mock_gateway',
            'event_id' => $eventId,
            'event_type' => $payload['event_type'] ?? 'payment.notification',
            'payload' => $payload,
            'status' => 'processed',
        ]);

        return [
            'status' => 'processed',
            'payment_status' => $paymentStatus,
            'webhook_id' => $webhookLog->id,
            'order_id' => $order?->id,
        ];
    }
}
