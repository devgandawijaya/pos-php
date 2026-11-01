import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import {
    RotateCcw,
    Search,
    Filter,
    Plus,
    Calendar,
    Store as StoreIcon,
    AlertCircle,
    CheckCircle2,
    DollarSign,
    PackageCheck,
    Receipt,
    Printer,
    X,
    Eye,
    ArrowRight,
    HelpCircle,
    Ban
} from 'lucide-react';

interface RefundItem {
    id: string;
    product_name?: string;
    product_sku?: string;
    quantity: number;
    refund_subtotal: number;
    restock: boolean;
    condition: 'good' | 'damaged' | 'expired';
    product?: {
        id: string;
        name: string;
        sku: string;
    };
}

interface Refund {
    id: string;
    refund_number: string;
    type: 'full_refund' | 'partial_refund' | 'exchange';
    total_refund_amount: number;
    refund_method: 'cash' | 'original_method' | 'store_credit';
    reason: string;
    notes?: string;
    created_at: string;
    order: {
        id: string;
        order_number: string;
        created_at: string;
        total_amount: number;
    };
    store: {
        id: string;
        name: string;
        code: string;
    };
    cashier?: {
        id: string;
        name: string;
    };
    items: RefundItem[];
}

interface LookupOrderItem {
    id: string;
    product_id: string;
    product_name: string;
    product_sku: string;
    original_quantity: number;
    already_refunded_quantity: number;
    available_quantity: number;
    unit_price: number;
    subtotal: number;
}

interface LookupOrderData {
    id: string;
    order_number: string;
    created_at: string;
    total_amount: number;
    payment_method: string;
    status: string;
    store: { id: string; name: string; code: string };
    customer?: { id: string; name: string; phone?: string };
    items: LookupOrderItem[];
}

interface Props {
    refunds: {
        data: Refund[];
        links: any[];
        current_page: number;
        last_page: number;
        total: number;
    };
    stores: Array<{ id: string; name: string; code: string }>;
    filters: {
        search: string;
        store_id: string;
        date: string;
    };
    kpis: {
        total_refunds: number;
        total_refund_amount: number;
        total_restocked_items: number;
    };
}

export default function RefundsIndex({ refunds, stores, filters, kpis }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedStore, setSelectedStore] = useState(filters.store_id || '');
    const [selectedDate, setSelectedDate] = useState(filters.date || '');

    // Modal Create Refund
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [orderNumberInput, setOrderNumberInput] = useState('');
    const [isSearchingOrder, setIsSearchingOrder] = useState(false);
    const [lookupError, setLookupError] = useState('');
    const [lookupOrder, setLookupOrder] = useState<LookupOrderData | null>(null);

    // Form items selection
    interface RefundFormItem {
        order_item_id: string;
        quantity: number;
        max_quantity: number;
        unit_price: number;
        condition: 'good' | 'damaged' | 'expired';
        restock: boolean;
        product_name: string;
        product_sku: string;
        selected: boolean;
    }
    const [formItems, setFormItems] = useState<RefundFormItem[]>([]);
    const [refundType, setRefundType] = useState<'full_refund' | 'partial_refund' | 'exchange'>('partial_refund');
    const [refundMethod, setRefundMethod] = useState<'cash' | 'original_method' | 'store_credit'>('cash');
    const [refundReason, setRefundReason] = useState('Barang Rusak/Cacat');
    const [refundNotes, setRefundNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formSubmitError, setFormSubmitError] = useState('');

    // Modal View Detail / Credit Note
    const [viewRefund, setViewRefund] = useState<Refund | null>(null);

    const handleFilter = () => {
        router.get('/refunds', {
            search: searchTerm,
            store_id: selectedStore,
            date: selectedDate,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleReset = () => {
        setSearchTerm('');
        setSelectedStore('');
        setSelectedDate('');
        router.get('/refunds');
    };

    // Lookup Order
    const handleSearchOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!orderNumberInput.trim()) return;

        setIsSearchingOrder(true);
        setLookupError('');
        setLookupOrder(null);
        setFormItems([]);

        try {
            const res = await fetch(`/refunds/lookup-order?order_number=${encodeURIComponent(orderNumberInput.trim())}`, {
                headers: {
                    'Accept': 'application/json',
                }
            });
            const data = await res.json();

            if (!res.ok || data.status !== 'success') {
                setLookupError(data.message || 'Faktur pesanan tidak ditemukan.');
                return;
            }

            const order: LookupOrderData = data.order;
            setLookupOrder(order);

            // Populate form items
            const initialFormItems: RefundFormItem[] = order.items.map(item => ({
                order_item_id: item.id,
                quantity: item.available_quantity > 0 ? 1 : 0,
                max_quantity: item.available_quantity,
                unit_price: item.unit_price,
                condition: 'good',
                restock: true,
                product_name: item.product_name,
                product_sku: item.product_sku,
                selected: item.available_quantity > 0,
            }));

            setFormItems(initialFormItems);
        } catch (err: any) {
            setLookupError('Terjadi kesalahan saat mencari nota pesanan.');
        } finally {
            setIsSearchingOrder(false);
        }
    };

    const calculateEstimatedRefund = () => {
        return formItems
            .filter(item => item.selected && item.quantity > 0)
            .reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    };

    const handleSubmitRefund = (e: React.FormEvent) => {
        e.preventDefault();
        setFormSubmitError('');
        if (!lookupOrder) return;

        const selectedItems = formItems.filter(i => i.selected && i.quantity > 0);
        if (selectedItems.length === 0) {
            setFormSubmitError('Pilih setidaknya 1 item yang akan diretur dengan kuantitas lebih dari 0.');
            return;
        }

        // Validate quantities
        for (const item of selectedItems) {
            if (item.quantity > item.max_quantity) {
                setFormSubmitError(`Kuantitas retur ${item.product_name} (${item.quantity}) melebihi sisa yang dapat diretur (${item.max_quantity}).`);
                return;
            }
        }

        setIsSubmitting(true);
        router.post('/refunds', {
            order_id: lookupOrder.id,
            type: refundType,
            refund_method: refundMethod,
            reason: refundReason,
            notes: refundNotes,
            items: selectedItems.map(item => ({
                order_item_id: item.order_item_id,
                quantity: item.quantity,
                restock: item.condition === 'good' ? item.restock : false,
                condition: item.condition,
            })),
        }, {
            onSuccess: () => {
                setIsCreateOpen(false);
                setLookupOrder(null);
                setOrderNumberInput('');
                setFormItems([]);
                setFormSubmitError('');
            },
            onError: (err) => {
                const msg = Object.values(err)[0] || 'Gagal memproses refund.';
                setFormSubmitError(msg);
            },
            onFinish: () => {
                setIsSubmitting(false);
            }
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Retur & Refund Penjualan" />

            <div className="p-6 max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                            <RotateCcw className="w-6 h-6 text-rose-400" />
                            Retur & Refund Penjualan
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Kelola pengembalian barang, nota kredit retur (Credit Note), serta penyesuaian stok dan kas.
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setIsCreateOpen(true);
                            setLookupOrder(null);
                            setLookupError('');
                            setOrderNumberInput('');
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-medium shadow-lg shadow-rose-600/20 transition-all duration-150"
                    >
                        <Plus className="w-4 h-4" />
                        Proses Retur Baru
                    </button>
                </div>

                {/* KPI Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-400">Total Transaksi Retur</span>
                            <div className="p-2 bg-rose-500/10 rounded-xl">
                                <RotateCcw className="w-5 h-5 text-rose-400" />
                            </div>
                        </div>
                        <div className="mt-3 text-3xl font-bold text-white">
                            {kpis.total_refunds.toLocaleString('id-ID')}
                        </div>
                        <span className="text-xs text-slate-500 mt-1 block">Seluruh riwayat retur cabang</span>
                    </div>

                    <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-400">Dana Dikembalikan</span>
                            <div className="p-2 bg-amber-500/10 rounded-xl">
                                <DollarSign className="w-5 h-5 text-amber-400" />
                            </div>
                        </div>
                        <div className="mt-3 text-3xl font-bold text-amber-400">
                            Rp {kpis.total_refund_amount.toLocaleString('id-ID')}
                        </div>
                        <span className="text-xs text-slate-500 mt-1 block">Akumulasi pengembalian uang</span>
                    </div>

                    <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-400">Barang Kembali ke Gudang</span>
                            <div className="p-2 bg-emerald-500/10 rounded-xl">
                                <PackageCheck className="w-5 h-5 text-emerald-400" />
                            </div>
                        </div>
                        <div className="mt-3 text-3xl font-bold text-emerald-400">
                            {kpis.total_restocked_items.toLocaleString('id-ID')} <span className="text-base font-normal text-slate-400">Unit</span>
                        </div>
                        <span className="text-xs text-slate-500 mt-1 block">Kondisi bagus & dapat dijual kembali</span>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Cari No. Retur atau No. Faktur..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
                                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                            />
                        </div>

                        <select
                            value={selectedStore}
                            onChange={(e) => setSelectedStore(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                        >
                            <option value="">Semua Cabang Toko</option>
                            {stores.map((s) => (
                                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                            ))}
                        </select>

                        <div className="relative">
                            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-rose-500"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleFilter}
                                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition-colors"
                            >
                                Filter
                            </button>
                            <button
                                onClick={handleReset}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors border border-slate-700"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table Data */}
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-900/60 text-xs uppercase text-slate-400 font-semibold border-b border-slate-700/80">
                                <tr>
                                    <th className="px-5 py-4">No. Retur & Tanggal</th>
                                    <th className="px-5 py-4">Faktur Asal</th>
                                    <th className="px-5 py-4">Cabang</th>
                                    <th className="px-5 py-4">Item Diretur</th>
                                    <th className="px-5 py-4">Metode & Alasan</th>
                                    <th className="px-5 py-4 text-right">Nilai Refund</th>
                                    <th className="px-5 py-4 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {refunds.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <RotateCcw className="w-10 h-10 text-slate-600 mb-2" />
                                                <p className="text-base font-medium text-slate-400">Belum ada transaksi retur barang</p>
                                                <p className="text-xs text-slate-500">Gunakan tombol "Proses Retur Baru" untuk memulai pengembalian.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    refunds.data.map((refund) => (
                                        <tr key={refund.id} className="hover:bg-slate-700/20 transition-colors">
                                            <td className="px-5 py-4">
                                                <div className="font-semibold text-white">{refund.refund_number}</div>
                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    {new Date(refund.created_at).toLocaleString('id-ID', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="font-mono text-xs px-2 py-1 rounded bg-slate-900 text-blue-400 border border-slate-700">
                                                    {refund.order?.order_number || '-'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="text-white text-xs font-medium">{refund.store?.name}</div>
                                                <div className="text-[11px] text-slate-500">{refund.store?.code}</div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs text-slate-300">
                                                        {refund.items?.length || 0} jenis barang
                                                    </span>
                                                    <div className="text-[11px] text-slate-400">
                                                        {refund.items?.map(i => `${i.product?.name || i.product_name || 'Barang'} (${i.quantity}x)`).join(', ')}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                                                        refund.refund_method === 'cash'
                                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                            : refund.refund_method === 'original_method'
                                                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                                    }`}>
                                                        {refund.refund_method === 'cash' ? 'Tunai' : refund.refund_method === 'original_method' ? 'Metode Asal' : 'Store Credit'}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1 truncate max-w-[160px]" title={refund.reason}>
                                                    {refund.reason}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="font-bold text-rose-400">
                                                    Rp {Number(refund.total_refund_amount).toLocaleString('id-ID')}
                                                </div>
                                                <span className="text-[10px] text-slate-500 uppercase">
                                                    {refund.type.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <button
                                                    onClick={() => setViewRefund(refund)}
                                                    className="p-1.5 bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors title='Lihat Credit Note'"
                                                >
                                                    <Receipt className="w-4 h-4 text-blue-400" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {refunds.total > refunds.data.length && (
                        <div className="p-4 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
                            <span>Menampilkan {refunds.data.length} dari {refunds.total} retur</span>
                            <div className="flex gap-1">
                                {refunds.links.map((link, idx) => (
                                    <button
                                        key={idx}
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url)}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-3 py-1 rounded-md ${
                                            link.active
                                                ? 'bg-rose-600 text-white font-bold'
                                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                        } ${!link.url ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL PROSES RETUR BARU */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl my-8">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-rose-500/10 rounded-lg">
                                    <RotateCcw className="w-5 h-5 text-rose-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg">Proses Retur & Pengembalian Dana</h3>
                                    <p className="text-xs text-slate-400">Pilih nota pesanan dan tentukan barang yang dikembalikan.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                            {formSubmitError && (
                                <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-medium flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                                        <span>{formSubmitError}</span>
                                    </div>
                                    <button type="button" onClick={() => setFormSubmitError('')} className="text-rose-400 hover:text-white">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}

                            {/* Step 1: Search Order */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                                    Cari Faktur / Nota Pembelian
                                </label>
                                <form onSubmit={handleSearchOrder} className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            placeholder="Masukkan Nomor Faktur (Contoh: ORD-2026...)"
                                            value={orderNumberInput}
                                            onChange={(e) => setOrderNumberInput(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 font-mono"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isSearchingOrder || !orderNumberInput.trim()}
                                        className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
                                    >
                                        {isSearchingOrder ? 'Mencari...' : 'Cari Faktur'}
                                    </button>
                                </form>

                                {lookupError && (
                                    <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                        <span>{lookupError}</span>
                                    </div>
                                )}
                            </div>

                            {/* Step 2: Order Info Found */}
                            {lookupOrder && (
                                <div className="space-y-6">
                                    {/* Order summary card */}
                                    <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-4">
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                            <div>
                                                <span className="text-slate-400 block">No. Faktur:</span>
                                                <span className="font-mono font-bold text-white text-sm">{lookupOrder.order_number}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block">Waktu Belanja:</span>
                                                <span className="text-slate-200">{lookupOrder.created_at}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block">Pelanggan:</span>
                                                <span className="text-slate-200 font-medium">{lookupOrder.customer?.name || 'Walk-in Customer'}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400 block">Total Belanja:</span>
                                                <span className="text-emerald-400 font-bold text-sm">
                                                    Rp {lookupOrder.total_amount.toLocaleString('id-ID')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Items Table for Return */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                                Pilih Barang yang Diretur
                                            </label>
                                            <span className="text-xs text-slate-400">
                                                Centang barang dan tentukan kuantitas & kondisi
                                            </span>
                                        </div>

                                        <div className="border border-slate-700 rounded-xl overflow-hidden">
                                            <table className="w-full text-left text-xs text-slate-300">
                                                <thead className="bg-slate-900/80 text-[11px] text-slate-400 uppercase border-b border-slate-700">
                                                    <tr>
                                                        <th className="p-3 w-10 text-center">Pilih</th>
                                                        <th className="p-3">Produk</th>
                                                        <th className="p-3 text-center">Tersedia</th>
                                                        <th className="p-3 text-center">Qty Retur</th>
                                                        <th className="p-3">Kondisi</th>
                                                        <th className="p-3 text-center">Masuk Stok?</th>
                                                        <th className="p-3 text-right">Subtotal Retur</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-700/60">
                                                    {formItems.map((item, index) => {
                                                        const isAvailable = item.max_quantity > 0;
                                                        return (
                                                            <tr key={item.order_item_id} className={`hover:bg-slate-700/30 ${!isAvailable ? 'opacity-50 bg-slate-900/40' : ''}`}>
                                                                <td className="p-3 text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        disabled={!isAvailable}
                                                                        checked={item.selected}
                                                                        onChange={(e) => {
                                                                            const updated = [...formItems];
                                                                            updated[index].selected = e.target.checked;
                                                                            setFormItems(updated);
                                                                        }}
                                                                        className="rounded border-slate-600 text-rose-600 focus:ring-rose-500 bg-slate-900"
                                                                    />
                                                                </td>
                                                                <td className="p-3">
                                                                    <div className="font-medium text-white">{item.product_name}</div>
                                                                    <div className="text-[10px] text-slate-400 font-mono">{item.product_sku}</div>
                                                                </td>
                                                                <td className="p-3 text-center font-mono">
                                                                    {item.max_quantity} unit
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        max={item.max_quantity}
                                                                        step="1"
                                                                        disabled={!item.selected || !isAvailable}
                                                                        value={item.quantity}
                                                                        onChange={(e) => {
                                                                            const val = parseFloat(e.target.value) || 0;
                                                                            const updated = [...formItems];
                                                                            updated[index].quantity = Math.min(val, item.max_quantity);
                                                                            setFormItems(updated);
                                                                        }}
                                                                        className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-center text-white focus:outline-none focus:border-rose-500"
                                                                    />
                                                                </td>
                                                                <td className="p-3">
                                                                    <select
                                                                        disabled={!item.selected || !isAvailable}
                                                                        value={item.condition}
                                                                        onChange={(e) => {
                                                                            const cond = e.target.value as 'good' | 'damaged' | 'expired';
                                                                            const updated = [...formItems];
                                                                            updated[index].condition = cond;
                                                                            // Auto-uncheck restock if damaged/expired
                                                                            if (cond !== 'good') {
                                                                                updated[index].restock = false;
                                                                            } else {
                                                                                updated[index].restock = true;
                                                                            }
                                                                            setFormItems(updated);
                                                                        }}
                                                                        className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-rose-500"
                                                                    >
                                                                        <option value="good">Bagus (Layak Jual)</option>
                                                                        <option value="damaged">Rusak / Cacat</option>
                                                                        <option value="expired">Expired</option>
                                                                    </select>
                                                                </td>
                                                                <td className="p-3 text-center">
                                                                    <input
                                                                        type="checkbox"
                                                                        disabled={!item.selected || item.condition !== 'good' || !isAvailable}
                                                                        checked={item.restock}
                                                                        onChange={(e) => {
                                                                            const updated = [...formItems];
                                                                            updated[index].restock = e.target.checked;
                                                                            setFormItems(updated);
                                                                        }}
                                                                        className="rounded border-slate-600 text-emerald-600 focus:ring-emerald-500 bg-slate-900"
                                                                    />
                                                                </td>
                                                                <td className="p-3 text-right font-medium text-rose-400">
                                                                    Rp {(item.selected ? item.quantity * item.unit_price : 0).toLocaleString('id-ID')}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Step 3: Refund Options */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                                Tipe Pengembalian
                                            </label>
                                            <select
                                                value={refundType}
                                                onChange={(e) => setRefundType(e.target.value as any)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                                            >
                                                <option value="partial_refund">Retur Sebagian (Parsial)</option>
                                                <option value="full_refund">Retur Penuh (Full Refund)</option>
                                                <option value="exchange">Tukar Barang (Exchange)</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                                Metode Pengembalian Uang
                                            </label>
                                            <select
                                                value={refundMethod}
                                                onChange={(e) => setRefundMethod(e.target.value as any)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                                            >
                                                <option value="cash">Tunai (Cash Drawer)</option>
                                                <option value="original_method">Metode Asal (Transfer/Gateway)</option>
                                                <option value="store_credit">Saldo Toko / Store Credit</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                                Alasan Retur
                                            </label>
                                            <select
                                                value={refundReason}
                                                onChange={(e) => setRefundReason(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-500"
                                            >
                                                <option value="Barang Rusak/Cacat">Barang Rusak / Cacat</option>
                                                <option value="Salah Beli / Tidak Cocok">Salah Beli / Tidak Cocok</option>
                                                <option value="Kedaluwarsa / Expired">Kedaluwarsa / Expired</option>
                                                <option value="Kemasan Rusak">Kemasan Rusak</option>
                                                <option value="Komplain Pelanggan">Komplain Pelanggan</option>
                                                <option value="Lainnya">Lainnya</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                            Catatan Tambahan
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={refundNotes}
                                            onChange={(e) => setRefundNotes(e.target.value)}
                                            placeholder="Catatan inspeksi fisik, kronologi pengembalian..."
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                                        />
                                    </div>

                                    {/* Estimated Total Card */}
                                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-center justify-between">
                                        <div>
                                            <span className="text-xs text-rose-300 uppercase font-semibold block">Total Nilai Pengembalian</span>
                                            <span className="text-xs text-slate-400">Akan dikeluarkan dari laci kas atau dikembalikan ke pelanggan</span>
                                        </div>
                                        <div className="text-2xl font-bold text-rose-400">
                                            Rp {calculateEstimatedRefund().toLocaleString('id-ID')}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-5 border-t border-slate-700 flex items-center justify-end gap-3 bg-slate-900/50">
                            <button
                                type="button"
                                onClick={() => setIsCreateOpen(false)}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors border border-slate-700"
                            >
                                Batal
                            </button>
                            {lookupOrder && (
                                <button
                                    type="button"
                                    disabled={isSubmitting || calculateEstimatedRefund() <= 0}
                                    onClick={handleSubmitRefund}
                                    className="px-6 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium shadow-lg shadow-rose-600/20 transition-colors flex items-center gap-2"
                                >
                                    {isSubmitting ? 'Memproses...' : 'Konfirmasi & Terbitkan Retur'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL VIEW / CREDIT NOTE SLIP */}
            {viewRefund && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
                            <h3 className="font-bold text-white text-base flex items-center gap-2">
                                <Receipt className="w-5 h-5 text-blue-400" />
                                Nota Retur Penjualan (Credit Note)
                            </h3>
                            <button
                                onClick={() => setViewRefund(null)}
                                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div id="credit-note-slip" className="p-6 bg-slate-900 text-slate-200 text-xs font-mono space-y-4">
                            <div className="text-center pb-3 border-b border-dashed border-slate-700">
                                <h4 className="text-sm font-bold text-white uppercase">{viewRefund.store?.name}</h4>
                                <p className="text-[11px] text-slate-400">{viewRefund.store?.code}</p>
                                <p className="text-[10px] text-slate-400 mt-1">SLIP RETUR / CREDIT NOTE</p>
                            </div>

                            <div className="space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">No. Retur:</span>
                                    <span className="font-bold text-white">{viewRefund.refund_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Ref. Faktur:</span>
                                    <span className="text-blue-400 font-bold">{viewRefund.order?.order_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Waktu:</span>
                                    <span>{new Date(viewRefund.created_at).toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Kasir:</span>
                                    <span>{viewRefund.cashier?.name || 'Kasir'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Metode:</span>
                                    <span className="capitalize">{viewRefund.refund_method.replace('_', ' ')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Alasan:</span>
                                    <span className="text-slate-300">{viewRefund.reason}</span>
                                </div>
                            </div>

                            <div className="border-t border-b border-dashed border-slate-700 py-2 space-y-2">
                                {viewRefund.items?.map((item, idx) => (
                                    <div key={idx} className="space-y-0.5">
                                        <div className="flex justify-between text-white font-medium">
                                            <span>{item.product?.name || item.product_name || 'Barang'}</span>
                                            <span>Rp {Number(item.refund_subtotal).toLocaleString('id-ID')}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] text-slate-400">
                                            <span>
                                                {item.quantity} unit @ Kondisi: {item.condition}
                                            </span>
                                            <span>{item.restock ? 'Restock Gudang' : 'Barang Reject'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-1 space-y-1 text-sm font-bold">
                                <div className="flex justify-between text-rose-400">
                                    <span>TOTAL REFUND:</span>
                                    <span>Rp {Number(viewRefund.total_refund_amount).toLocaleString('id-ID')}</span>
                                </div>
                            </div>

                            <div className="pt-4 text-center text-[10px] text-slate-500 border-t border-dashed border-slate-700">
                                Dokumen ini merupakan bukti sah pengembalian barang dan penyesuaian kasir.
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-700 flex items-center justify-end gap-2 bg-slate-900/50">
                            <button
                                onClick={() => window.print()}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
                            >
                                <Printer className="w-4 h-4" />
                                Cetak Nota Retur
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}

