<?php

namespace App\Http\Controllers;

use App\Services\Payment\MockPaymentGatewayService;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentWebhookController extends Controller
{
    /**
     * Handle incoming payment gateway webhooks with signature verification and idempotency.
     */
    public function handle(Request $request, MockPaymentGatewayService $gateway): JsonResponse
    {
        $signature = $request->header('X-Signature') ?: $request->header('X-Callback-Signature');
        $rawPayload = $request->getContent();

        // If signature is provided, verify authenticity
        if ($signature && ! $gateway->verifyWebhookSignature($signature, $rawPayload)) {
            Log::warning('Payment Webhook: Invalid signature rejected.', [
                'signature' => $signature,
                'ip' => $request->ip(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Signature webhook tidak valid.',
            ], 401);
        }

        try {
            $result = $gateway->processWebhook($request->all());

            return response()->json([
                'status' => 'success',
                'result' => $result,
            ]);
        } catch (DomainException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Throwable $e) {
            Log::error('Payment Webhook Error: '.$e->getMessage(), [
                'exception' => $e,
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Internal server error processing webhook.',
            ], 500);
        }
    }
}
