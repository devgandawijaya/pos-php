<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderPayment;
use App\Models\OrderRefund;
use App\Models\Store;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AnalyticsService
{
    /**
     * Resolve date range and preceding period for comparative analysis.
     *
     * @return array{start: Carbon, end: Carbon, prev_start: Carbon, prev_end: Carbon, period: string}
     */
    public function resolveDateRange(?string $period = '7_days', ?string $customStart = null, ?string $customEnd = null): array
    {
        $now = now();

        switch ($period) {
            case 'today':
                $start = $now->copy()->startOfDay();
                $end = $now->copy()->endOfDay();
                $prevStart = $start->copy()->subDay();
                $prevEnd = $end->copy()->subDay();
                break;

            case 'yesterday':
                $start = $now->copy()->subDay()->startOfDay();
                $end = $now->copy()->subDay()->endOfDay();
                $prevStart = $start->copy()->subDay();
                $prevEnd = $end->copy()->subDay();
                break;

            case 'this_month':
                $start = $now->copy()->startOfMonth();
                $end = $now->copy()->endOfDay();
                $prevStart = $now->copy()->subMonth()->startOfMonth();
                $prevEnd = $now->copy()->subMonth()->endOfMonth();
                break;

            case '30_days':
                $start = $now->copy()->subDays(29)->startOfDay();
                $end = $now->copy()->endOfDay();
                $prevStart = $start->copy()->subDays(30);
                $prevEnd = $start->copy()->subSecond();
                break;

            case 'custom':
                if ($customStart && $customEnd) {
                    $start = Carbon::parse($customStart)->startOfDay();
                    $end = Carbon::parse($customEnd)->endOfDay();
                    $daysDiff = max(1, $start->diffInDays($end) + 1);
                    $prevStart = $start->copy()->subDays($daysDiff);
                    $prevEnd = $start->copy()->subSecond();
                } else {
                    $start = $now->copy()->subDays(6)->startOfDay();
                    $end = $now->copy()->endOfDay();
                    $prevStart = $start->copy()->subDays(7);
                    $prevEnd = $start->copy()->subSecond();
                }
                break;

            case '7_days':
            default:
                $period = '7_days';
                $start = $now->copy()->subDays(6)->startOfDay();
                $end = $now->copy()->endOfDay();
                $prevStart = $start->copy()->subDays(7);
                $prevEnd = $start->copy()->subSecond();
                break;
        }

        return [
            'start' => $start,
            'end' => $end,
            'prev_start' => $prevStart,
            'prev_end' => $prevEnd,
            'period' => $period,
        ];
    }

    /**
     * Compute Executive Sales KPIs with growth rates.
     */
    public function getSummaryKpis(
        string $tenantId,
        ?string $storeId,
        Carbon $startDate,
        Carbon $endDate,
        ?Carbon $prevStartDate = null,
        ?Carbon $prevEndDate = null
    ): array {
        // Base Query current period
        $currentQuery = Order::where('tenant_id', $tenantId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->where('status', '!=', 'cancelled');

        if ($storeId) {
            $currentQuery->where('store_id', $storeId);
        }

        $currentOrders = $currentQuery->get(['id', 'subtotal', 'discount_amount', 'tax_amount', 'total_amount', 'created_at']);

        $totalOrdersCount = $currentOrders->count();
        $grossSales = (float) $currentOrders->sum('subtotal');
        $totalDiscounts = (float) $currentOrders->sum('discount_amount');
        $netSales = (float) $currentOrders->sum('total_amount');
        $averageOrderValue = $totalOrdersCount > 0 ? round($netSales / $totalOrdersCount, 2) : 0;

        // Calculate Cost of Goods Sold (COGS)
        $orderIds = $currentOrders->pluck('id');
        $totalCogs = 0;
        if ($orderIds->isNotEmpty()) {
            $cogsQuery = OrderItem::where('tenant_id', $tenantId)
                ->whereIn('order_id', $orderIds)
                ->select(DB::raw('SUM(quantity * unit_cost) as total_cogs'))
                ->first();
            $totalCogs = (float) ($cogsQuery->total_cogs ?? 0);
        }

        $grossProfit = max(0, $netSales - $totalCogs);
        $profitMargin = $netSales > 0 ? round(($grossProfit / $netSales) * 100, 1) : 0;

        // Calculate Refunds during period
        $refundQuery = OrderRefund::where('tenant_id', $tenantId)
            ->whereBetween('created_at', [$startDate, $endDate]);

        if ($storeId) {
            $refundQuery->where('store_id', $storeId);
        }

        $refundCount = $refundQuery->count();
        $totalRefundAmount = (float) $refundQuery->sum('total_refund_amount');

        // Comparative Growth
        $growth = [
            'net_sales' => 0,
            'orders' => 0,
            'profit' => 0,
        ];

        if ($prevStartDate && $prevEndDate) {
            $prevQuery = Order::where('tenant_id', $tenantId)
                ->whereBetween('created_at', [$prevStartDate, $prevEndDate])
                ->where('status', '!=', 'cancelled');

            if ($storeId) {
                $prevQuery->where('store_id', $storeId);
            }

            $prevOrders = $prevQuery->get(['id', 'total_amount']);
            $prevNetSales = (float) $prevOrders->sum('total_amount');
            $prevOrdersCount = $prevOrders->count();

            $prevOrderIds = $prevOrders->pluck('id');
            $prevCogs = 0;
            if ($prevOrderIds->isNotEmpty()) {
                $prevCogsQuery = OrderItem::where('tenant_id', $tenantId)
                    ->whereIn('order_id', $prevOrderIds)
                    ->select(DB::raw('SUM(quantity * unit_cost) as total_cogs'))
                    ->first();
                $prevCogs = (float) ($prevCogsQuery->total_cogs ?? 0);
            }
            $prevGrossProfit = max(0, $prevNetSales - $prevCogs);

            if ($prevNetSales > 0) {
                $growth['net_sales'] = round((($netSales - $prevNetSales) / $prevNetSales) * 100, 1);
            }
            if ($prevOrdersCount > 0) {
                $growth['orders'] = round((($totalOrdersCount - $prevOrdersCount) / $prevOrdersCount) * 100, 1);
            }
            if ($prevGrossProfit > 0) {
                $growth['profit'] = round((($grossProfit - $prevGrossProfit) / $prevGrossProfit) * 100, 1);
            }
        }

        return [
            'net_sales' => $netSales,
            'gross_sales' => $grossSales,
            'total_discounts' => $totalDiscounts,
            'total_cogs' => $totalCogs,
            'gross_profit' => $grossProfit,
            'profit_margin' => $profitMargin,
            'total_orders' => $totalOrdersCount,
            'aov' => $averageOrderValue,
            'refund_count' => $refundCount,
            'total_refund_amount' => $totalRefundAmount,
            'growth' => $growth,
        ];
    }

    /**
     * Get continuous time-series sales trend.
     */
    public function getSalesTrend(
        string $tenantId,
        ?string $storeId,
        Carbon $startDate,
        Carbon $endDate
    ): array {
        $query = Order::where('tenant_id', $tenantId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->where('status', '!=', 'cancelled');

        if ($storeId) {
            $query->where('store_id', $storeId);
        }

        $orders = $query->with('items:order_id,quantity,unit_cost')
            ->get(['id', 'total_amount', 'created_at']);

        // Group by Date Y-m-d
        $grouped = [];
        $cursor = $startDate->copy()->startOfDay();
        $endDay = $endDate->copy()->startOfDay();

        while ($cursor->lte($endDay)) {
            $key = $cursor->format('Y-m-d');
            $label = $cursor->translatedFormat('d M');
            $grouped[$key] = [
                'date' => $key,
                'label' => $label,
                'sales' => 0,
                'cogs' => 0,
                'profit' => 0,
                'orders' => 0,
            ];
            $cursor->addDay();
        }

        foreach ($orders as $order) {
            $dateKey = $order->created_at->format('Y-m-d');
            if (isset($grouped[$dateKey])) {
                $orderTotal = (float) $order->total_amount;
                $orderCogs = $order->items->sum(fn ($i) => (float) $i->quantity * (float) $i->unit_cost);

                $grouped[$dateKey]['sales'] += $orderTotal;
                $grouped[$dateKey]['cogs'] += $orderCogs;
                $grouped[$dateKey]['profit'] += max(0, $orderTotal - $orderCogs);
                $grouped[$dateKey]['orders'] += 1;
            }
        }

        return array_values($grouped);
    }

    /**
     * Get Top Selling Products by units sold and revenue.
     */
    public function getTopProducts(
        string $tenantId,
        ?string $storeId,
        Carbon $startDate,
        Carbon $endDate,
        int $limit = 5
    ): array {
        $orderQuery = Order::where('tenant_id', $tenantId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->where('status', '!=', 'cancelled');

        if ($storeId) {
            $orderQuery->where('store_id', $storeId);
        }

        $orderIds = $orderQuery->pluck('id');

        if ($orderIds->isEmpty()) {
            return [];
        }

        $items = OrderItem::where('tenant_id', $tenantId)
            ->whereIn('order_id', $orderIds)
            ->select(
                'product_id',
                'product_name',
                'product_sku',
                DB::raw('SUM(quantity) as total_qty'),
                DB::raw('SUM(subtotal) as total_revenue'),
                DB::raw('SUM(quantity * unit_cost) as total_cost')
            )
            ->groupBy('product_id', 'product_name', 'product_sku')
            ->orderByDesc('total_qty')
            ->limit($limit)
            ->get();

        return $items->map(function ($item, $index) {
            $revenue = (float) $item->total_revenue;
            $cost = (float) $item->total_cost;
            $profit = max(0, $revenue - $cost);

            return [
                'rank' => $index + 1,
                'product_id' => $item->product_id,
                'name' => $item->product_name,
                'sku' => $item->product_sku,
                'quantity_sold' => (float) $item->total_qty,
                'revenue' => $revenue,
                'profit' => $profit,
                'margin' => $revenue > 0 ? round(($profit / $revenue) * 100, 1) : 0,
            ];
        })->toArray();
    }

    /**
     * Get Payment Method Distribution.
     */
    public function getPaymentMethodBreakdown(
        string $tenantId,
        ?string $storeId,
        Carbon $startDate,
        Carbon $endDate
    ): array {
        $orderQuery = Order::where('tenant_id', $tenantId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->where('status', '!=', 'cancelled');

        if ($storeId) {
            $orderQuery->where('store_id', $storeId);
        }

        $orderIds = $orderQuery->pluck('id');

        if ($orderIds->isEmpty()) {
            return [];
        }

        // Aggregate from order_payments
        $payments = OrderPayment::where('tenant_id', $tenantId)
            ->whereIn('order_id', $orderIds)
            ->select('payment_method', DB::raw('SUM(amount) as total_amount'), DB::raw('COUNT(id) as count'))
            ->groupBy('payment_method')
            ->orderByDesc('total_amount')
            ->get();

        $grandTotal = $payments->sum('total_amount');

        $methodLabels = [
            'cash' => 'Tunai (Cash)',
            'qris' => 'QRIS Dinamis / Statis',
            'debit' => 'Kartu Debit EDC',
            'credit' => 'Kartu Kredit',
            'transfer' => 'Bank Transfer',
            'split' => 'Split Payment',
        ];

        return $payments->map(function ($p) use ($grandTotal, $methodLabels) {
            $amount = (float) $p->total_amount;
            $percentage = $grandTotal > 0 ? round(($amount / $grandTotal) * 100, 1) : 0;

            return [
                'method' => $p->payment_method,
                'label' => $methodLabels[$p->payment_method] ?? ucfirst($p->payment_method),
                'amount' => $amount,
                'count' => (int) $p->count,
                'percentage' => $percentage,
            ];
        })->toArray();
    }

    /**
     * Get Multi-Branch / Store Performance Comparison.
     */
    public function getStoreComparison(
        string $tenantId,
        Carbon $startDate,
        Carbon $endDate
    ): array {
        $stores = Store::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->get(['id', 'name', 'code']);

        $results = [];

        foreach ($stores as $store) {
            $orders = Order::where('tenant_id', $tenantId)
                ->where('store_id', $store->id)
                ->whereBetween('created_at', [$startDate, $endDate])
                ->where('status', '!=', 'cancelled')
                ->get(['id', 'total_amount']);

            $totalSales = (float) $orders->sum('total_amount');
            $ordersCount = $orders->count();

            $orderIds = $orders->pluck('id');
            $cogs = 0;
            if ($orderIds->isNotEmpty()) {
                $cogsQuery = OrderItem::where('tenant_id', $tenantId)
                    ->whereIn('order_id', $orderIds)
                    ->select(DB::raw('SUM(quantity * unit_cost) as total_cogs'))
                    ->first();
                $cogs = (float) ($cogsQuery->total_cogs ?? 0);
            }

            $profit = max(0, $totalSales - $cogs);

            $results[] = [
                'store_id' => $store->id,
                'name' => $store->name,
                'code' => $store->code,
                'sales' => $totalSales,
                'orders_count' => $ordersCount,
                'profit' => $profit,
            ];
        }

        // Sort by sales descending
        usort($results, fn ($a, $b) => $b['sales'] <=> $a['sales']);

        return $results;
    }

    /**
     * Hourly Sales Traffic Analysis (Peak Hours).
     */
    public function getHourlyDistribution(
        string $tenantId,
        ?string $storeId,
        Carbon $startDate,
        Carbon $endDate
    ): array {
        $query = Order::where('tenant_id', $tenantId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->where('status', '!=', 'cancelled');

        if ($storeId) {
            $query->where('store_id', $storeId);
        }

        $orders = $query->get(['id', 'total_amount', 'created_at']);

        // 24 hours buckets
        $hours = [];
        for ($h = 0; $h < 24; $h++) {
            $label = sprintf('%02d:00', $h);
            $hours[$h] = [
                'hour' => $h,
                'label' => $label,
                'sales' => 0,
                'orders' => 0,
            ];
        }

        foreach ($orders as $order) {
            $h = (int) $order->created_at->format('G');
            if (isset($hours[$h])) {
                $hours[$h]['sales'] += (float) $order->total_amount;
                $hours[$h]['orders'] += 1;
            }
        }

        return array_values($hours);
    }

    /**
     * Generate CSV content for sales report export.
     */
    public function generateSalesReportCsv(
        string $tenantId,
        ?string $storeId,
        Carbon $startDate,
        Carbon $endDate
    ): string {
        $query = Order::where('tenant_id', $tenantId)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->with(['store:id,name,code', 'cashier:id,name', 'customer:id,name,phone'])
            ->orderByDesc('created_at');

        if ($storeId) {
            $query->where('store_id', $storeId);
        }

        $orders = $query->get();

        $output = fopen('php://temp', 'r+');

        // CSV Header
        fputcsv($output, [
            'Nomor Faktur',
            'Waktu Transaksi',
            'Cabang Toko',
            'Kasir',
            'Pelanggan',
            'Metode Pembayaran',
            'Subtotal (Rp)',
            'Diskon (Rp)',
            'PPN (Rp)',
            'Total Tagihan (Rp)',
            'Status',
        ]);

        foreach ($orders as $order) {
            fputcsv($output, [
                $order->order_number,
                $order->created_at->format('Y-m-d H:i:s'),
                $order->store ? "{$order->store->name} ({$order->store->code})" : '-',
                $order->cashier ? $order->cashier->name : '-',
                $order->customer ? $order->customer->name : 'Walk-in Customer',
                ucfirst($order->payment_method),
                number_format((float) $order->subtotal, 2, '.', ''),
                number_format((float) $order->discount_amount, 2, '.', ''),
                number_format((float) $order->tax_amount, 2, '.', ''),
                number_format((float) $order->total_amount, 2, '.', ''),
                ucfirst($order->status),
            ]);
        }

        rewind($output);
        $csvContent = stream_get_contents($output);
        fclose($output);

        return $csvContent ?: '';
    }
}
