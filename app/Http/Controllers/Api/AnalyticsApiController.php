<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsApiController extends Controller
{
    public function __construct(
        protected AnalyticsService $analyticsService
    ) {}

    /**
     * Get Executive Sales KPI Summary.
     */
    public function summary(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $period = $request->query('period', '7_days');
        $customStart = $request->query('start_date');
        $customEnd = $request->query('end_date');
        $storeId = $request->query('store_id') ?: null;

        $range = $this->analyticsService->resolveDateRange($period, $customStart, $customEnd);

        $kpis = $this->analyticsService->getSummaryKpis(
            tenantId: $tenantId,
            storeId: $storeId,
            startDate: $range['start'],
            endDate: $range['end'],
            prevStartDate: $range['prev_start'],
            prevEndDate: $range['prev_end']
        );

        return response()->json([
            'status' => 'success',
            'period' => $range['period'],
            'start_date' => $range['start']->toIso8601String(),
            'end_date' => $range['end']->toIso8601String(),
            'data' => $kpis,
        ]);
    }

    /**
     * Get Sales & Profit Time Series Trend.
     */
    public function salesTrend(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $period = $request->query('period', '7_days');
        $customStart = $request->query('start_date');
        $customEnd = $request->query('end_date');
        $storeId = $request->query('store_id') ?: null;

        $range = $this->analyticsService->resolveDateRange($period, $customStart, $customEnd);

        $trend = $this->analyticsService->getSalesTrend(
            tenantId: $tenantId,
            storeId: $storeId,
            startDate: $range['start'],
            endDate: $range['end']
        );

        return response()->json([
            'status' => 'success',
            'data' => $trend,
        ]);
    }

    /**
     * Get Top Selling Products.
     */
    public function topProducts(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $period = $request->query('period', '7_days');
        $customStart = $request->query('start_date');
        $customEnd = $request->query('end_date');
        $storeId = $request->query('store_id') ?: null;
        $limit = (int) $request->query('limit', 5);

        $range = $this->analyticsService->resolveDateRange($period, $customStart, $customEnd);

        $products = $this->analyticsService->getTopProducts(
            tenantId: $tenantId,
            storeId: $storeId,
            startDate: $range['start'],
            endDate: $range['end'],
            limit: $limit
        );

        return response()->json([
            'status' => 'success',
            'data' => $products,
        ]);
    }

    /**
     * Get Payment Methods Breakdown.
     */
    public function paymentMethods(Request $request): JsonResponse
    {
        $tenantId = $request->user()->tenant_id;
        $period = $request->query('period', '7_days');
        $customStart = $request->query('start_date');
        $customEnd = $request->query('end_date');
        $storeId = $request->query('store_id') ?: null;

        $range = $this->analyticsService->resolveDateRange($period, $customStart, $customEnd);

        $methods = $this->analyticsService->getPaymentMethodBreakdown(
            tenantId: $tenantId,
            storeId: $storeId,
            startDate: $range['start'],
            endDate: $range['end']
        );

        return response()->json([
            'status' => 'success',
            'data' => $methods,
        ]);
    }
}
