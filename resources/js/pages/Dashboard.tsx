import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    ShoppingBag,
    Percent,
    RotateCcw,
    Calendar,
    Filter,
    Download,
    Store as StoreIcon,
    Award,
    Clock,
    CreditCard,
    QrCode,
    Banknote,
    Layers,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    CheckCircle2
} from 'lucide-react';

interface KpiData {
    net_sales: number;
    gross_sales: number;
    total_discounts: number;
    total_cogs: number;
    gross_profit: number;
    profit_margin: number;
    total_orders: number;
    aov: number;
    refund_count: number;
    total_refund_amount: number;
    growth: {
        net_sales: number;
        orders: number;
        profit: number;
    };
}

interface TrendItem {
    date: string;
    label: string;
    sales: number;
    cogs: number;
    profit: number;
    orders: number;
}

interface TopProductItem {
    rank: number;
    product_id: string;
    name: string;
    sku: string;
    quantity_sold: number;
    revenue: number;
    profit: number;
    margin: number;
}

interface PaymentMethodItem {
    method: string;
    label: string;
    amount: number;
    count: number;
    percentage: number;
}

interface StoreComparisonItem {
    store_id: string;
    name: string;
    code: string;
    sales: number;
    orders_count: number;
    profit: number;
}

interface HourlyTrafficItem {
    hour: number;
    label: string;
    sales: number;
    orders: number;
}

interface Props {
    kpis: KpiData;
    sales_trend: TrendItem[];
    top_products: TopProductItem[];
    payment_methods: PaymentMethodItem[];
    store_comparison: StoreComparisonItem[];
    hourly_traffic: HourlyTrafficItem[];
    stores: Array<{ id: string; name: string; code: string }>;
    filters: {
        period: string;
        start_date: string;
        end_date: string;
        store_id: string | null;
    };
}

export default function Dashboard({
    kpis,
    sales_trend,
    top_products,
    payment_methods,
    store_comparison,
    hourly_traffic,
    stores,
    filters,
}: Props) {
    const { auth } = usePage<PageProps>().props;

    const [activePeriod, setActivePeriod] = useState(filters.period || '7_days');
    const [selectedStore, setSelectedStore] = useState(filters.store_id || '');
    const [customStartDate, setCustomStartDate] = useState(filters.start_date || '');
    const [customEndDate, setCustomEndDate] = useState(filters.end_date || '');
    const [hoveredTrend, setHoveredTrend] = useState<TrendItem | null>(null);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(val);
    };

    const handlePeriodChange = (period: string) => {
        setActivePeriod(period);
        router.get('/dashboard', {
            period,
            store_id: selectedStore,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleStoreChange = (storeId: string) => {
        setSelectedStore(storeId);
        router.get('/dashboard', {
            period: activePeriod,
            store_id: storeId,
            start_date: activePeriod === 'custom' ? customStartDate : undefined,
            end_date: activePeriod === 'custom' ? customEndDate : undefined,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleApplyCustomDate = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/dashboard', {
            period: 'custom',
            start_date: customStartDate,
            end_date: customEndDate,
            store_id: selectedStore,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleExport = () => {
        const queryParams = new URLSearchParams({
            period: activePeriod,
            store_id: selectedStore,
            start_date: activePeriod === 'custom' ? customStartDate : '',
            end_date: activePeriod === 'custom' ? customEndDate : '',
        });
        window.location.href = `/analytics/export?${queryParams.toString()}`;
    };

    // Calculate maximum sales for chart scaling
    const maxSales = Math.max(...sales_trend.map(t => t.sales), 100000);
    const maxHourlyOrders = Math.max(...hourly_traffic.map(h => h.orders), 1);

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard & Analitik Bisnis" />

            <div className="p-6 max-w-7xl mx-auto space-y-6">
                {/* Header & Filter Controls */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl shadow-sm">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {auth.tenant?.name || 'Enterprise'}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                                {filters.start_date} s/d {filters.end_date}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white mt-1 flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-blue-400" />
                            Ringkasan Performa & Penjualan
                        </h1>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Period Quick Select */}
                        <div className="flex bg-slate-900 border border-slate-700 rounded-xl p-1 text-xs">
                            {[
                                { key: 'today', label: 'Hari Ini' },
                                { key: '7_days', label: '7 Hari' },
                                { key: 'this_month', label: 'Bulan Ini' },
                                { key: '30_days', label: '30 Hari' },
                                { key: 'custom', label: 'Kustom' },
                            ].map((btn) => (
                                <button
                                    key={btn.key}
                                    onClick={() => handlePeriodChange(btn.key)}
                                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                                        activePeriod === btn.key
                                            ? 'bg-blue-600 text-white font-bold shadow-sm'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>

                        {/* Store Filter */}
                        <select
                            value={selectedStore}
                            onChange={(e) => handleStoreChange(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                        >
                            <option value="">Semua Cabang Toko</option>
                            {stores.map((s) => (
                                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                            ))}
                        </select>

                        {/* Export Button */}
                        <button
                            onClick={handleExport}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                            title="Unduh Data CSV"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>Export CSV</span>
                        </button>

                        {/* Quick POS Terminal Button */}
                        <Link
                            href="/pos"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all active:scale-95"
                            title="Buka Mesin Kasir POS"
                        >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Buka Mesin POS</span>
                        </Link>
                    </div>
                </div>

                {/* Custom Date Inputs (Conditional) */}
                {activePeriod === 'custom' && (
                    <form onSubmit={handleApplyCustomDate} className="bg-slate-800/60 border border-slate-700/60 p-3 rounded-xl flex flex-wrap items-center gap-3 text-xs">
                        <span className="text-slate-300 font-medium">Rentang Tanggal Kustom:</span>
                        <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500"
                            required
                        />
                        <span className="text-slate-500">sampai</span>
                        <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500"
                            required
                        />
                        <button
                            type="submit"
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                        >
                            Terapkan
                        </button>
                    </form>
                )}

                {/* Executive KPI Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Net Sales */}
                    <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-400">Total Penjualan Bersih</span>
                            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                                <DollarSign className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="mt-3 text-2xl font-bold text-white">
                            {formatCurrency(kpis.net_sales)}
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-xs">
                            {kpis.growth.net_sales >= 0 ? (
                                <span className="inline-flex items-center text-emerald-400 font-semibold">
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                    +{kpis.growth.net_sales}%
                                </span>
                            ) : (
                                <span className="inline-flex items-center text-rose-400 font-semibold">
                                    <ArrowDownRight className="w-3.5 h-3.5" />
                                    {kpis.growth.net_sales}%
                                </span>
                            )}
                            <span className="text-slate-500">vs periode lalu</span>
                        </div>
                    </div>

                    {/* Gross Profit & Margin */}
                    <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-400">Estimasi Laba Kotor</span>
                            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                                <TrendingUp className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="mt-3 text-2xl font-bold text-emerald-400">
                            {formatCurrency(kpis.gross_profit)}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-slate-400">Margin Laba: <strong className="text-white">{kpis.profit_margin}%</strong></span>
                            {kpis.growth.profit >= 0 ? (
                                <span className="text-emerald-400 font-semibold flex items-center">
                                    <ArrowUpRight className="w-3.5 h-3.5" />+{kpis.growth.profit}%
                                </span>
                            ) : (
                                <span className="text-rose-400 font-semibold flex items-center">
                                    <ArrowDownRight className="w-3.5 h-3.5" />{kpis.growth.profit}%
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Transactions & AOV */}
                    <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-400">Total Transaksi Selesai</span>
                            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
                                <ShoppingBag className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="mt-3 text-2xl font-bold text-white">
                            {kpis.total_orders.toLocaleString('id-ID')} <span className="text-sm font-normal text-slate-400">Struk</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-slate-400">AOV: <strong className="text-purple-300">{formatCurrency(kpis.aov)}</strong></span>
                            {kpis.growth.orders >= 0 ? (
                                <span className="text-emerald-400 font-semibold flex items-center">
                                    <ArrowUpRight className="w-3.5 h-3.5" />+{kpis.growth.orders}%
                                </span>
                            ) : (
                                <span className="text-rose-400 font-semibold flex items-center">
                                    <ArrowDownRight className="w-3.5 h-3.5" />{kpis.growth.orders}%
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Discounts & Refunds */}
                    <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-400">Diskon & Retur Barang</span>
                            <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400">
                                <RotateCcw className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="mt-3 text-xl font-bold text-slate-200">
                            {formatCurrency(kpis.total_discounts)}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs">
                            <span className="text-slate-400">Hemat Promo</span>
                            <span className="text-rose-400 font-medium">
                                Retur: {formatCurrency(kpis.total_refund_amount)} ({kpis.refund_count}x)
                            </span>
                        </div>
                    </div>
                </div>

                {/* Primary Chart: Sales & Profit Daily Trend */}
                <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                        <div>
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-blue-400" />
                                Grafik Tren Penjualan & Laba Kotor Harian
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Pergerakan omzet vs profitabilitas selama periode terpilih.
                            </p>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                                <span className="text-slate-300">Penjualan Bersih</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                                <span className="text-slate-300">Laba Kotor</span>
                            </div>
                        </div>
                    </div>

                    {/* Visual Bar / Area Trend representation */}
                    {sales_trend.length === 0 ? (
                        <div className="py-16 text-center text-slate-500 text-sm">
                            Tidak ada transaksi pada periode yang dipilih.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Hover info badge */}
                            <div className="h-6 text-xs text-slate-300 flex items-center gap-3">
                                {hoveredTrend ? (
                                    <>
                                        <span className="font-bold text-white">{hoveredTrend.label} ({hoveredTrend.date}):</span>
                                        <span className="text-blue-400">Penjualan: {formatCurrency(hoveredTrend.sales)}</span>
                                        <span className="text-emerald-400">Laba: {formatCurrency(hoveredTrend.profit)}</span>
                                        <span className="text-purple-300">Transaksi: {hoveredTrend.orders} struk</span>
                                    </>
                                ) : (
                                    <span className="text-slate-500 italic">Arahkan kursor pada batang grafik untuk melihat detail harian.</span>
                                )}
                            </div>

                            {/* Chart Columns Container */}
                            <div className="h-56 flex items-end gap-1.5 sm:gap-3 pt-6 pb-2 border-b border-slate-700/80 overflow-x-auto">
                                {sales_trend.map((point, idx) => {
                                    const salesHeightPct = maxSales > 0 ? Math.round((point.sales / maxSales) * 100) : 0;
                                    const profitHeightPct = maxSales > 0 ? Math.round((point.profit / maxSales) * 100) : 0;

                                    return (
                                        <div
                                            key={idx}
                                            className="flex-1 min-w-[28px] max-w-[60px] h-full flex flex-col justify-end items-center group relative cursor-pointer"
                                            onMouseEnter={() => setHoveredTrend(point)}
                                            onMouseLeave={() => setHoveredTrend(null)}
                                        >
                                            {/* Bar Columns */}
                                            <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-full">
                                                {/* Sales Bar */}
                                                <div
                                                    style={{ height: `${Math.max(salesHeightPct, 4)}%` }}
                                                    className="w-1/2 bg-blue-500/80 group-hover:bg-blue-400 rounded-t-md transition-all duration-150 shadow-sm"
                                                />
                                                {/* Profit Bar */}
                                                <div
                                                    style={{ height: `${Math.max(profitHeightPct, 2)}%` }}
                                                    className="w-1/2 bg-emerald-500/80 group-hover:bg-emerald-400 rounded-t-md transition-all duration-150 shadow-sm"
                                                />
                                            </div>

                                            {/* Date Label */}
                                            <span className="text-[10px] text-slate-400 group-hover:text-white mt-2 truncate w-full text-center">
                                                {point.label}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Secondary Grid: Top Products & Payment Methods */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Top 5 Products Leaderboard (2 cols) */}
                    <div className="lg:col-span-2 bg-slate-800/80 border border-slate-700/70 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-white text-base flex items-center gap-2">
                                <Award className="w-5 h-5 text-amber-400" />
                                5 Produk Terlaris (Best Sellers)
                            </h3>
                            <span className="text-xs text-slate-400">Berdasarkan volume penjualan</span>
                        </div>

                        {top_products.length === 0 ? (
                            <div className="py-12 text-center text-slate-500 text-xs">
                                Belum ada produk terjual pada rentang waktu ini.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-slate-300">
                                    <thead className="bg-slate-900/60 text-[11px] uppercase text-slate-400 font-semibold border-b border-slate-700">
                                        <tr>
                                            <th className="py-3 px-3 text-center">Rank</th>
                                            <th className="py-3 px-3">Produk & SKU</th>
                                            <th className="py-3 px-3 text-center">Terjual</th>
                                            <th className="py-3 px-3 text-right">Omzet</th>
                                            <th className="py-3 px-3 text-right">Laba Bersih</th>
                                            <th className="py-3 px-3 text-center">Margin</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/50">
                                        {top_products.map((item) => (
                                            <tr key={item.product_id} className="hover:bg-slate-700/20 transition-colors">
                                                <td className="py-3 px-3 text-center">
                                                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                                                        item.rank === 1
                                                            ? 'bg-amber-400 text-slate-900 shadow-sm'
                                                            : item.rank === 2
                                                            ? 'bg-slate-300 text-slate-900'
                                                            : item.rank === 3
                                                            ? 'bg-amber-700 text-white'
                                                            : 'bg-slate-700 text-slate-300'
                                                    }`}>
                                                        {item.rank}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-3">
                                                    <div className="font-semibold text-white">{item.name}</div>
                                                    <div className="text-[10px] text-slate-500 font-mono">{item.sku}</div>
                                                </td>
                                                <td className="py-3 px-3 text-center font-bold text-white">
                                                    {item.quantity_sold.toLocaleString('id-ID')} unit
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono text-slate-200">
                                                    {formatCurrency(item.revenue)}
                                                </td>
                                                <td className="py-3 px-3 text-right font-mono text-emerald-400 font-medium">
                                                    {formatCurrency(item.profit)}
                                                </td>
                                                <td className="py-3 px-3 text-center font-mono text-slate-300">
                                                    {item.margin}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Payment Methods Distribution (1 col) */}
                    <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-white text-base flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-cyan-400" />
                                    Metode Pembayaran
                                </h3>
                                <span className="text-xs text-slate-400">Pangsa Omzet</span>
                            </div>

                            {payment_methods.length === 0 ? (
                                <div className="py-12 text-center text-slate-500 text-xs">
                                    Belum ada data pembayaran.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {payment_methods.map((method) => (
                                        <div key={method.method} className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                                                    {method.method === 'cash' ? (
                                                        <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                                                    ) : method.method === 'qris' ? (
                                                        <QrCode className="w-3.5 h-3.5 text-blue-400" />
                                                    ) : (
                                                        <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                                                    )}
                                                    {method.label}
                                                </span>
                                                <span className="font-bold text-white">
                                                    {method.percentage}%
                                                </span>
                                            </div>
                                            {/* Progress Bar */}
                                            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                                                <div
                                                    style={{ width: `${method.percentage}%` }}
                                                    className={`h-full rounded-full ${
                                                        method.method === 'cash'
                                                            ? 'bg-emerald-500'
                                                            : method.method === 'qris'
                                                            ? 'bg-blue-500'
                                                            : 'bg-purple-500'
                                                    }`}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[10px] text-slate-500">
                                                <span>{method.count} transaksi</span>
                                                <span>{formatCurrency(method.amount)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-700/60 text-xs text-slate-400 flex items-center justify-between">
                            <span>Total Metode:</span>
                            <span className="font-bold text-white">{payment_methods.length} kanal</span>
                        </div>
                    </div>
                </div>

                {/* Tertiary Grid: Store Comparison & Hourly Traffic */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Store / Branch Performance */}
                    <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-white text-base flex items-center gap-2">
                                <StoreIcon className="w-5 h-5 text-indigo-400" />
                                Performa Antar Cabang Toko
                            </h3>
                            <span className="text-xs text-slate-400">Omzet & Kontribusi</span>
                        </div>

                        {store_comparison.length === 0 ? (
                            <div className="py-10 text-center text-slate-500 text-xs">
                                Belum ada data cabang aktif.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {store_comparison.map((branch) => {
                                    const maxBranchSales = Math.max(...store_comparison.map(b => b.sales), 1);
                                    const pct = Math.round((branch.sales / maxBranchSales) * 100);

                                    return (
                                        <div key={branch.store_id} className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3.5 space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="font-bold text-white flex items-center gap-2">
                                                    <span>{branch.name}</span>
                                                    <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                                                        {branch.code}
                                                    </span>
                                                </div>
                                                <div className="font-bold text-emerald-400 font-mono">
                                                    {formatCurrency(branch.sales)}
                                                </div>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    style={{ width: `${pct}%` }}
                                                    className="h-full bg-indigo-500 rounded-full"
                                                />
                                            </div>
                                            <div className="flex justify-between text-[11px] text-slate-400">
                                                <span>{branch.orders_count} transaksi struk</span>
                                                <span>Laba: {formatCurrency(branch.profit)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Hourly Traffic / Peak Hours */}
                    <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-white text-base flex items-center gap-2">
                                <Clock className="w-5 h-5 text-amber-400" />
                                Distribusi Jam Ramai (Peak Hours)
                            </h3>
                            <span className="text-xs text-slate-400">08:00 - 22:00</span>
                        </div>

                        {/* Peak hours bar chart */}
                        <div className="h-44 flex items-end gap-1 pt-4 pb-2 border-b border-slate-700/80">
                            {hourly_traffic.filter(h => h.hour >= 8 && h.hour <= 22).map((item) => {
                                const heightPct = maxHourlyOrders > 0 ? Math.round((item.orders / maxHourlyOrders) * 100) : 0;

                                return (
                                    <div
                                        key={item.hour}
                                        className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                                        title={`${item.label}: ${item.orders} transaksi (${formatCurrency(item.sales)})`}
                                    >
                                        <div
                                            style={{ height: `${Math.max(heightPct, 4)}%` }}
                                            className="w-full bg-amber-500/70 group-hover:bg-amber-400 rounded-t-sm transition-all shadow-sm"
                                        />
                                        <span className="text-[9px] text-slate-500 group-hover:text-slate-300 mt-1">
                                            {item.hour}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-3 flex justify-between text-xs text-slate-400">
                            <span>Pagi (Buka)</span>
                            <span>Siang (Peak)</span>
                            <span>Malam (Tutup)</span>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
