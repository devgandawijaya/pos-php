<?php

namespace App\Http\Controllers;

use App\Models\Store;
use App\Services\AnalyticsService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DashboardController extends Controller
{
    public function __construct(
        protected AnalyticsService $analyticsService
    ) {}

    /**
     * Display the Executive Analytics Dashboard.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $tenantId = $user->tenant_id;

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

        $salesTrend = $this->analyticsService->getSalesTrend(
            tenantId: $tenantId,
            storeId: $storeId,
            startDate: $range['start'],
            endDate: $range['end']
        );

        $topProducts = $this->analyticsService->getTopProducts(
            tenantId: $tenantId,
            storeId: $storeId,
            startDate: $range['start'],
            endDate: $range['end'],
            limit: 5
        );

        $paymentMethods = $this->analyticsService->getPaymentMethodBreakdown(
            tenantId: $tenantId,
            storeId: $storeId,
            startDate: $range['start'],
            endDate: $range['end']
        );

        $storeComparison = $this->analyticsService->getStoreComparison(
            tenantId: $tenantId,
            startDate: $range['start'],
            endDate: $range['end']
        );

        $hourlyTraffic = $this->analyticsService->getHourlyDistribution(
            tenantId: $tenantId,
            storeId: $storeId,
            startDate: $range['start'],
            endDate: $range['end']
        );

        $stores = Store::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->select('id', 'name', 'code')
            ->get();

        return Inertia::render('Dashboard', [
            'kpis' => $kpis,
            'sales_trend' => $salesTrend,
            'top_products' => $topProducts,
            'payment_methods' => $paymentMethods,
            'store_comparison' => $storeComparison,
            'hourly_traffic' => $hourlyTraffic,
            'stores' => $stores,
            'filters' => [
                'period' => $range['period'],
                'start_date' => $range['start']->format('Y-m-d'),
                'end_date' => $range['end']->format('Y-m-d'),
                'store_id' => $storeId,
            ],
        ]);
    }

    /**
     * Export Sales Report as CSV.
     */
    public function export(Request $request): StreamedResponse
    {
        $user = $request->user();
        $tenantId = $user->tenant_id;

        $period = $request->query('period', '7_days');
        $customStart = $request->query('start_date');
        $customEnd = $request->query('end_date');
        $storeId = $request->query('store_id') ?: null;

        $range = $this->analyticsService->resolveDateRange($period, $customStart, $customEnd);

        $csv = $this->analyticsService->generateSalesReportCsv(
            tenantId: $tenantId,
            storeId: $storeId,
            startDate: $range['start'],
            endDate: $range['end']
        );

        $fileName = 'laporan-penjualan-'.now()->format('Ymd_His').'.csv';

        return response()->streamDownload(function () use ($csv) {
            echo $csv;
        }, $fileName, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }
}
