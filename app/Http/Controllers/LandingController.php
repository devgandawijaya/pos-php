<?php

namespace App\Http\Controllers;

use App\Models\SubscriptionPlan;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LandingController extends Controller
{
    /**
     * Render the public landing page.
     */
    public function index(Request $request): Response
    {
        $plans = SubscriptionPlan::where('is_active', true)
            ->orderBy('price_monthly')
            ->get(['id', 'name', 'slug', 'description', 'price_monthly', 'price_annual', 'max_stores', 'max_registers', 'max_users', 'features']);

        return Inertia::render('Landing/Index', [
            'plans' => $plans,
        ]);
    }
}
