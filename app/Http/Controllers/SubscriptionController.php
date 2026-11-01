<?php

namespace App\Http\Controllers;

use App\Models\SubscriptionPlan;
use App\Services\SubscriptionService;
use DomainException;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SubscriptionController extends Controller
{
    public function __construct(
        protected SubscriptionService $subscriptionService
    ) {}

    /**
     * Display tenant's subscription status, usage quotas, and plan choices.
     */
    public function index(Request $request): Response
    {
        $tenant = $request->user()->tenant;
        if (! $tenant) {
            abort(403, 'Organisasi tenant tidak ditemukan.');
        }

        $usage = $this->subscriptionService->getSubscriptionUsage($tenant);

        $plans = SubscriptionPlan::where('is_active', true)
            ->orderBy('price_monthly')
            ->get();

        return Inertia::render('Subscription/Index', [
            'usage' => $usage,
            'plans' => $plans,
            'current_plan_id' => $usage['plan']?->id,
        ]);
    }

    /**
     * Process tenant subscription upgrade or plan change.
     */
    public function upgrade(Request $request)
    {
        $tenant = $request->user()->tenant;
        if (! $tenant) {
            abort(403, 'Organisasi tenant tidak ditemukan.');
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

            if ($request->wantsJson()) {
                return response()->json([
                    'status' => 'success',
                    'message' => "Paket langganan berhasil diperbarui ke {$plan->name}.",
                    'subscription' => $subscription,
                ]);
            }

            return redirect()->back()->with('success', "Paket langganan Anda berhasil diubah ke {$plan->name}.");
        } catch (DomainException $e) {
            if ($request->wantsJson()) {
                return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
            }

            return redirect()->back()->with('error', $e->getMessage());
        }
    }
}
