import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import {
    Warehouse,
    Search,
    AlertTriangle,
    CheckCircle2,
    ArrowUpRight,
    ArrowDownRight,
    SlidersHorizontal,
    Plus,
    X,
    History,
    ShieldAlert,
    TrendingDown,
    PackageCheck
} from 'lucide-react';

interface WarehouseItem {
    id: string;
    name: string;
    code: string;
}

interface ProductItem {
    id: string;
    name: string;
    sku: string;
    purchase_cost: string;
}

interface StockBalanceItem {
    id: string;
    warehouse_id: string;
    product_id: string;
    quantity: string;
    reserved_quantity: string;
    min_stock_alert: string;
    product?: {
        id: string;
        name: string;
        sku: string;
        barcode: string | null;
        purchase_cost: string;
        selling_price: string;
        unit?: { id: string; code: string };
    };
    warehouse?: {
        id: string;
        name: string;
        code: string;
    };
}

interface InventoryMovementItem {
    id: string;
    movement_type: string;
    quantity_change: string;
    balance_before: string;
    balance_after: string;
    unit_cost: string;
    notes: string | null;
    created_at: string;
    product?: { id: string; name: string; sku: string };
    warehouse?: { id: string; name: string; code: string };
    user?: { id: string; name: string };
}

interface Props {
    balances: {
        data: StockBalanceItem[];
        current_page: number;
        last_page: number;
        total: number;
    };
    movements: InventoryMovementItem[];
    warehouses: WarehouseItem[];
    products: ProductItem[];
    filters: {
        warehouse_id?: string;
        search?: string;
        low_stock?: boolean;
    };
}

export default function InventoryIndex({ balances, movements, warehouses, products, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [activeTab, setActiveTab] = useState<'balances' | 'movements'>('balances');
    const [adjustModalOpen, setAdjustModalOpen] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        warehouse_id: filters.warehouse_id || warehouses[0]?.id || '',
        product_id: products[0]?.id || '',
        type: 'in',
        quantity: 1,
        reason: 'correction',
        notes: '',
    });

    const formatCurrency = (amount: number | string) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(Number(amount));
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/inventory', {
            warehouse_id: filters.warehouse_id,
            search,
            low_stock: filters.low_stock ? '1' : undefined,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleWarehouseChange = (warehouseId: string) => {
        router.get('/inventory', {
            warehouse_id: warehouseId,
            search,
            low_stock: filters.low_stock ? '1' : undefined,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleLowStockToggle = () => {
        router.get('/inventory', {
            warehouse_id: filters.warehouse_id,
            search,
            low_stock: !filters.low_stock ? '1' : undefined,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const openAdjustModal = (balance?: StockBalanceItem) => {
        reset();
        if (balance) {
            setData({
                warehouse_id: balance.warehouse_id,
                product_id: balance.product_id,
                type: 'in',
                quantity: 1,
                reason: 'correction',
                notes: '',
            });
        }
        setAdjustModalOpen(true);
    };

    const handleAdjustSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/inventory/adjust', {
            onSuccess: () => {
                setAdjustModalOpen(false);
                reset();
            },
        });
    };

    // Calculate total valuation of listed balances
    const totalValuation = balances.data.reduce((acc, curr) => {
        const qty = parseFloat(curr.quantity || '0');
        const cost = parseFloat(curr.product?.purchase_cost || '0');
        return acc + (qty * cost);
    }, 0);

    const lowStockCount = balances.data.filter(b => parseFloat(b.quantity) <= parseFloat(b.min_stock_alert)).length;

    return (
        <AuthenticatedLayout>
            <Head title="Inventaris & Manajemen Stok" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                            <Warehouse className="w-7 h-7 text-amber-400" />
                            <span>Stok & Mutasi Gudang</span>
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Double-entry inventory ledger dengan audit saldo real-time dan isolasi multi-gudang.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => openAdjustModal()}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-amber-600/20 transition-all active:scale-95"
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            <span>Sesuaikan Stok</span>
                        </button>
                    </div>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                                Total SKU Terdaftar
                            </span>
                            <PackageCheck className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="mt-2 text-2xl font-bold text-white">
                            {balances.total} SKU
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Pada lokasi terpilih</p>
                    </div>

                    <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                                Stok Menipis / Kritis
                            </span>
                            <TrendingDown className="w-5 h-5 text-rose-400" />
                        </div>
                        <div className="mt-2 text-2xl font-bold text-rose-400">
                            {lowStockCount} Item
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Di bawah batas minimum peringatan</p>
                    </div>

                    <div className="bg-slate-800/80 border border-slate-700/70 p-5 rounded-2xl">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                                Estimasi Nilai Stok (HPP)
                            </span>
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                Valuasi
                            </span>
                        </div>
                        <div className="mt-2 text-2xl font-bold text-white">
                            {formatCurrency(totalValuation)}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Berdasarkan harga beli produk</p>
                    </div>
                </div>

                {/* Tabs & Controls */}
                <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-700/70 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Tab Toggle */}
                        <div className="flex items-center gap-2 bg-slate-900/60 p-1 rounded-xl border border-slate-700/50">
                            <button
                                onClick={() => setActiveTab('balances')}
                                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                                    activeTab === 'balances'
                                        ? 'bg-amber-600 text-white shadow-md'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Saldo Stok Saat Ini
                            </button>
                            <button
                                onClick={() => setActiveTab('movements')}
                                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                                    activeTab === 'movements'
                                        ? 'bg-amber-600 text-white shadow-md'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <History className="w-3.5 h-3.5" />
                                <span>Buku Besar Mutasi (Ledger)</span>
                            </button>
                        </div>

                        {/* Warehouse selector & Filters */}
                        <div className="flex flex-wrap items-center gap-3">
                            <select
                                value={filters.warehouse_id || warehouses[0]?.id || ''}
                                onChange={(e) => handleWarehouseChange(e.target.value)}
                                className="bg-slate-900/80 border border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-amber-500"
                            >
                                {warehouses.map((wh) => (
                                    <option key={wh.id} value={wh.id}>
                                        {wh.name} ({wh.code})
                                    </option>
                                ))}
                            </select>

                            <button
                                onClick={handleLowStockToggle}
                                className={`px-3 py-2 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                                    filters.low_stock
                                        ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                                        : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-600'
                                }`}
                            >
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Stok Rendah</span>
                            </button>

                            <form onSubmit={handleSearch} className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Cari SKU atau nama..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9 pr-4 py-2 bg-slate-900/80 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500 w-48 sm:w-60"
                                />
                            </form>
                        </div>
                    </div>

                    {/* Tab 1: Current Stock Balances Table */}
                    {activeTab === 'balances' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="bg-slate-900/50 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-700/70">
                                    <tr>
                                        <th className="px-6 py-3.5">Produk & SKU</th>
                                        <th className="px-6 py-3.5">Gudang / Lokasi</th>
                                        <th className="px-6 py-3.5 text-right">Stok Fisik</th>
                                        <th className="px-6 py-3.5 text-right">Teralokasi</th>
                                        <th className="px-6 py-3.5 text-right">Tersedia</th>
                                        <th className="px-6 py-3.5 text-center">Status</th>
                                        <th className="px-6 py-3.5 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {balances.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                                Tidak ada saldo stok yang ditemukan untuk filter ini.
                                            </td>
                                        </tr>
                                    ) : (
                                        balances.data.map((item) => {
                                            const qty = parseFloat(item.quantity);
                                            const reserved = parseFloat(item.reserved_quantity || '0');
                                            const available = qty - reserved;
                                            const minAlert = parseFloat(item.min_stock_alert);
                                            const isLow = qty <= minAlert;
                                            const isOut = qty <= 0;

                                            return (
                                                <tr key={item.id} className="hover:bg-slate-700/30 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-semibold text-white">
                                                            {item.product?.name}
                                                        </div>
                                                        <div className="text-xs font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                                                            <span>SKU: {item.product?.sku}</span>
                                                            {item.product?.barcode && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span>BC: {item.product.barcode}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-medium text-slate-300">
                                                        {item.warehouse?.name}
                                                        <span className="block text-[11px] text-slate-500 font-mono">
                                                            {item.warehouse?.code}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono font-bold text-white">
                                                        {Number(item.quantity).toLocaleString('id-ID')}
                                                        <span className="text-xs font-normal text-slate-400 ml-1">
                                                            {item.product?.unit?.code || 'PCS'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono text-slate-400 text-xs">
                                                        {Number(reserved).toLocaleString('id-ID')}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono font-semibold text-emerald-400">
                                                        {Number(available).toLocaleString('id-ID')}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {isOut ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                                                Habis
                                                            </span>
                                                        ) : isLow ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                                Menipis
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                                Aman
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button
                                                            onClick={() => openAdjustModal(item)}
                                                            className="text-xs font-medium text-amber-400 hover:text-amber-300 hover:underline"
                                                        >
                                                            Sesuaikan
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Tab 2: Recent Ledger Movements */}
                    {activeTab === 'movements' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-300">
                                <thead className="bg-slate-900/50 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-700/70">
                                    <tr>
                                        <th className="px-6 py-3.5">Waktu</th>
                                        <th className="px-6 py-3.5">Tipe Mutasi</th>
                                        <th className="px-6 py-3.5">Produk</th>
                                        <th className="px-6 py-3.5 text-right">Perubahan Qty</th>
                                        <th className="px-6 py-3.5 text-right">Saldo (Sebelum → Sesudah)</th>
                                        <th className="px-6 py-3.5">Petugas / Keterangan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {movements.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                                Belum ada mutasi stok yang tercatat di buku besar.
                                            </td>
                                        </tr>
                                    ) : (
                                        movements.map((m) => {
                                            const change = parseFloat(m.quantity_change);
                                            const isPositive = change > 0;

                                            return (
                                                <tr key={m.id} className="hover:bg-slate-700/30 transition-colors">
                                                    <td className="px-6 py-4 text-xs font-mono text-slate-400 whitespace-nowrap">
                                                        {new Date(m.created_at).toLocaleString('id-ID')}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-700 text-slate-200">
                                                            {m.movement_type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-semibold text-white text-xs">
                                                            {m.product?.name}
                                                        </div>
                                                        <div className="text-[11px] font-mono text-slate-400">
                                                            {m.product?.sku}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono font-bold">
                                                        <span
                                                            className={`inline-flex items-center gap-1 ${
                                                                isPositive ? 'text-emerald-400' : 'text-rose-400'
                                                            }`}
                                                        >
                                                            {isPositive ? (
                                                                <ArrowUpRight className="w-3.5 h-3.5" />
                                                            ) : (
                                                                <ArrowDownRight className="w-3.5 h-3.5" />
                                                            )}
                                                            {isPositive ? `+${change}` : change}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono text-xs text-slate-300">
                                                        {m.balance_before} → <span className="font-bold text-white">{m.balance_after}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs">
                                                        <div className="text-slate-200 font-medium">{m.user?.name || 'Sistem'}</div>
                                                        <div className="text-slate-400 text-[11px] truncate max-w-xs">{m.notes || '-'}</div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Quick Adjustment Modal */}
                {adjustModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <SlidersHorizontal className="w-5 h-5 text-amber-400" />
                                    <span>Penyesuaian Stok Cepat</span>
                                </h2>
                                <button
                                    onClick={() => setAdjustModalOpen(false)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleAdjustSubmit} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                        Lokasi Gudang
                                    </label>
                                    <select
                                        value={data.warehouse_id}
                                        onChange={(e) => setData('warehouse_id', e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                                    >
                                        {warehouses.map((wh) => (
                                            <option key={wh.id} value={wh.id}>
                                                {wh.name} ({wh.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                        Pilih Produk
                                    </label>
                                    <select
                                        value={data.product_id}
                                        onChange={(e) => setData('product_id', e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                                    >
                                        {products.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} ({p.sku})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                            Arah Penyesuaian
                                        </label>
                                        <select
                                            value={data.type}
                                            onChange={(e) => setData('type', e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                                        >
                                            <option value="in">+ Tambah Stok (Masuk)</option>
                                            <option value="out">- Kurangi Stok (Keluar)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                            Jumlah
                                        </label>
                                        <input
                                            type="number"
                                            step="any"
                                            min="0.01"
                                            value={data.quantity}
                                            onChange={(e) => setData('quantity', parseFloat(e.target.value) || 0)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                                            required
                                        />
                                        {errors.quantity && (
                                            <p className="text-xs text-rose-400 mt-1">{errors.quantity}</p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                        Alasan Penyesuaian
                                    </label>
                                    <select
                                        value={data.reason}
                                        onChange={(e) => setData('reason', e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                                    >
                                        <option value="correction">Koreksi Saldo Fisik</option>
                                        <option value="damage">Barang Rusak / Cacat</option>
                                        <option value="expired">Kadaluarsa</option>
                                        <option value="lost">Barang Hilang / Selisih</option>
                                        <option value="found">Barang Ditemukan</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                        Catatan Audit Tambahan
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={data.notes}
                                        onChange={(e) => setData('notes', e.target.value)}
                                        placeholder="Contoh: Hasil audit mingguan rak B2..."
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                                    />
                                </div>

                                <div className="pt-2 flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setAdjustModalOpen(false)}
                                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-xl transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-amber-600/20 transition-all"
                                    >
                                        {processing ? 'Menyimpan...' : 'Simpan Mutasi'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}

