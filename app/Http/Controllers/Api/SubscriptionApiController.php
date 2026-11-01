<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SubscriptionPlan;
use App\Services\SubscriptionService;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionApiController extends Controller
{
    public function __construct(
        protected SubscriptionService $subscriptionService
    ) {}

    /**
     * Get real-time subscription status and quota usages.
     */
    public function usage(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        if (! $tenant) {
            return response()->json(['message' => 'Tenant tidak ditemukan.'], 403);
        }

        $usage = $this->subscriptionService->getSubscriptionUsage($tenant);

        return response()->json([
            'status' => 'success',
            'data' => $usage,
        ]);
    }

    /**
     * List all public active subscription plans.
     */
    public function plans(): JsonResponse
    {
        $plans = SubscriptionPlan::where('is_active', true)
            ->orderBy('price_monthly')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $plans,
        ]);
    }

    /**
     * Process subscription upgrade via API.
     */
    public function upgrade(Request $request): JsonResponse
    {
        $tenant = $request->user()->tenant;
        if (! $tenant) {
            return response()->json(['message' => 'Tenant tidak ditemukan.'], 403);
        }

        $validated = $request->validate([
            'plan_id' => ['required', 'uuid', 'exists:subscription_plans,id'],
            'billing_interval' => ['required', 'string', 'in:monthly,annual'],
        ]);

        $plan = SubscriptionPlan::findOrFail($validated['plan_id']);

        try {
            $subscription = $this->subscriptionService->upgradeOrChangePlan(
                tenant: $tenant,
                newPlan: $plan,
                billingInterval: $validated['billing_interval']
            );

            return response()->json([
                'status' => 'success',
                'message' => "Paket langganan berhasil diperbarui ke {$plan->name}.",
                'data' => $subscription,
            ]);
        } catch (DomainException $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}
