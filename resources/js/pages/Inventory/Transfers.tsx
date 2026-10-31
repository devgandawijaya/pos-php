import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import {
    ArrowLeftRight,
    Plus,
    Search,
    Truck,
    CheckCircle2,
    Clock,
    AlertCircle,
    X,
    Send,
    PackageCheck,
    FileText
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
}

interface TransferItemDetail {
    id: string;
    product_id: string;
    quantity_requested: string;
    quantity_dispatched: string;
    quantity_received: string;
    product?: {
        id: string;
        name: string;
        sku: string;
        unit?: { id: string; code: string };
    };
}

interface StockTransferRecord {
    id: string;
    transfer_number: string;
    status: 'draft' | 'in_transit' | 'completed' | 'cancelled';
    notes: string | null;
    dispatched_at: string | null;
    received_at: string | null;
    created_at: string;
    source_warehouse?: WarehouseItem;
    destination_warehouse?: WarehouseItem;
    user?: { id: string; name: string };
    items: TransferItemDetail[];
}

interface Props {
    transfers: {
        data: StockTransferRecord[];
        current_page: number;
        last_page: number;
        total: number;
    };
    warehouses: WarehouseItem[];
    products: ProductItem[];
    filters: {
        status?: string;
    };
}

export default function TransfersIndex({ transfers, warehouses, products, filters }: Props) {
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [receiveModalOpen, setReceiveModalOpen] = useState(false);
    const [activeTransfer, setActiveTransfer] = useState<StockTransferRecord | null>(null);

    // Form for new transfer
    const { data: createData, setData: setCreateData, post: postCreate, processing: createProcessing, errors: createErrors, reset: resetCreate } = useForm({
        source_warehouse_id: warehouses[0]?.id || '',
        destination_warehouse_id: warehouses[1]?.id || '',
        notes: '',
        items: [{ product_id: products[0]?.id || '', quantity: 1 }],
    });

    // Form for receiving transfer
    const { data: receiveData, setData: setReceiveData, post: postReceive, processing: receiveProcessing, reset: resetReceive } = useForm<{
        received_quantities: Record<string, number>;
    }>({
        received_quantities: {},
    });

    const addItemRow = () => {
        setCreateData('items', [
            ...createData.items,
            { product_id: products[0]?.id || '', quantity: 1 },
        ]);
    };

    const removeItemRow = (index: number) => {
        if (createData.items.length > 1) {
            setCreateData(
                'items',
                createData.items.filter((_, i) => i !== index)
            );
        }
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postCreate('/stock-transfers', {
            onSuccess: () => {
                setCreateModalOpen(false);
                resetCreate();
            },
        });
    };

    const handleDispatch = (transfer: StockTransferRecord) => {
        if (confirm(`Kirim transfer #${transfer.transfer_number} dari ${transfer.source_warehouse?.name}? Stok di gudang asal akan otomatis berkurang.`)) {
            router.post(`/stock-transfers/${transfer.id}/dispatch`);
        }
    };

    const openReceiveModal = (transfer: StockTransferRecord) => {
        setActiveTransfer(transfer);
        const initialMap: Record<string, number> = {};
        transfer.items.forEach((item) => {
            initialMap[item.id] = parseFloat(item.quantity_dispatched || item.quantity_requested);
        });
        setReceiveData({ received_quantities: initialMap });
        setReceiveModalOpen(true);
    };

    const handleReceiveSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeTransfer) return;

        postReceive(`/stock-transfers/${activeTransfer.id}/receive`, {
            onSuccess: () => {
                setReceiveModalOpen(false);
                setActiveTransfer(null);
                resetReceive();
            },
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'draft':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">
                        <Clock className="w-3.5 h-3.5" />
                        Draft
                    </span>
                );
            case 'in_transit':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <Truck className="w-3.5 h-3.5" />
                        Dalam Pengiriman
                    </span>
                );
            case 'completed':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Selesai Diterima
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400">
                        {status}
                    </span>
                );
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Transfer Stok Antar Cabang" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                            <ArrowLeftRight className="w-7 h-7 text-cyan-400" />
                            <span>Transfer Stok Antar Gudang / Cabang</span>
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Distribusi produk antar lokasi dengan audit status Draft → In Transit → Selesai.
                        </p>
                    </div>

                    <button
                        onClick={() => setCreateModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-cyan-600/20 transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Buat Permintaan Transfer</span>
                    </button>
                </div>

                {/* Table */}
                <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-900/50 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-700/70">
                                <tr>
                                    <th className="px-6 py-3.5">No. Dokumen</th>
                                    <th className="px-6 py-3.5">Rute Lokasi</th>
                                    <th className="px-6 py-3.5">Item Barang</th>
                                    <th className="px-6 py-3.5">Petugas / Waktu</th>
                                    <th className="px-6 py-3.5 text-center">Status</th>
                                    <th className="px-6 py-3.5 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {transfers.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                            Belum ada dokumen transfer stok yang tercatat.
                                        </td>
                                    </tr>
                                ) : (
                                    transfers.data.map((t) => (
                                        <tr key={t.id} className="hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4 font-mono font-bold text-white">
                                                {t.transfer_number}
                                                {t.notes && (
                                                    <div className="text-xs font-normal text-slate-400 mt-0.5 truncate max-w-xs">
                                                        {t.notes}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-slate-200">
                                                        {t.source_warehouse?.name}
                                                    </span>
                                                    <span className="text-slate-500">→</span>
                                                    <span className="font-semibold text-cyan-400">
                                                        {t.destination_warehouse?.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs">
                                                <div className="space-y-1">
                                                    {t.items.map((i) => (
                                                        <div key={i.id} className="flex items-center gap-2">
                                                            <span className="font-medium text-white">{i.product?.name}</span>
                                                            <span className="text-slate-400 font-mono">
                                                                ({Number(i.quantity_requested)} {i.product?.unit?.code || 'PCS'})
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-400">
                                                <div>{t.user?.name || 'Sistem'}</div>
                                                <div className="text-[11px] font-mono text-slate-500">
                                                    {new Date(t.created_at).toLocaleDateString('id-ID')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {getStatusBadge(t.status)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {t.status === 'draft' && (
                                                    <button
                                                        onClick={() => handleDispatch(t)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 text-xs font-semibold rounded-lg border border-cyan-500/30 transition-colors"
                                                    >
                                                        <Send className="w-3.5 h-3.5" />
                                                        <span>Kirim (Dispatch)</span>
                                                    </button>
                                                )}
                                                {t.status === 'in_transit' && (
                                                    <button
                                                        onClick={() => openReceiveModal(t)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold rounded-lg border border-emerald-500/30 transition-colors"
                                                    >
                                                        <PackageCheck className="w-3.5 h-3.5" />
                                                        <span>Terima di Tujuan</span>
                                                    </button>
                                                )}
                                                {t.status === 'completed' && (
                                                    <span className="text-xs text-emerald-400 font-medium">
                                                        Selesai
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Create Modal */}
                {createModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
                            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <ArrowLeftRight className="w-5 h-5 text-cyan-400" />
                                    <span>Buat Permintaan Transfer Stok</span>
                                </h2>
                                <button
                                    onClick={() => setCreateModalOpen(false)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                            Gudang Asal (Pengirim)
                                        </label>
                                        <select
                                            value={createData.source_warehouse_id}
                                            onChange={(e) => setCreateData('source_warehouse_id', e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                                        >
                                            {warehouses.map((wh) => (
                                                <option key={wh.id} value={wh.id}>
                                                    {wh.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                            Gudang Tujuan (Penerima)
                                        </label>
                                        <select
                                            value={createData.destination_warehouse_id}
                                            onChange={(e) => setCreateData('destination_warehouse_id', e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                                        >
                                            {warehouses.map((wh) => (
                                                <option key={wh.id} value={wh.id}>
                                                    {wh.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Items List */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                            Daftar Barang Transfer
                                        </label>
                                        <button
                                            type="button"
                                            onClick={addItemRow}
                                            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                                        >
                                            + Tambah Item
                                        </button>
                                    </div>

                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {createData.items.map((row, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <select
                                                    value={row.product_id}
                                                    onChange={(e) => {
                                                        const copy = [...createData.items];
                                                        copy[idx].product_id = e.target.value;
                                                        setCreateData('items', copy);
                                                    }}
                                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                                                >
                                                    {products.map((p) => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.name} ({p.sku})
                                                        </option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={row.quantity}
                                                    onChange={(e) => {
                                                        const copy = [...createData.items];
                                                        copy[idx].quantity = parseFloat(e.target.value) || 1;
                                                        setCreateData('items', copy);
                                                    }}
                                                    placeholder="Qty"
                                                    className="w-20 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                                                />
                                                {createData.items.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeItemRow(idx)}
                                                        className="p-1 text-slate-400 hover:text-rose-400"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                        Catatan / Instruksi Pengiriman
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={createData.notes}
                                        onChange={(e) => setCreateData('notes', e.target.value)}
                                        placeholder="Keterangan transfer..."
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                                    />
                                </div>

                                <div className="pt-2 flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setCreateModalOpen(false)}
                                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-xl transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createProcessing}
                                        className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-cyan-600/20 transition-all"
                                    >
                                        {createProcessing ? 'Membuat...' : 'Buat Dokumen Draft'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Receive Modal */}
                {receiveModalOpen && activeTransfer && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <PackageCheck className="w-5 h-5 text-emerald-400" />
                                    <span>Penerimaan Transfer di Gudang Tujuan</span>
                                </h2>
                                <button
                                    onClick={() => setReceiveModalOpen(false)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleReceiveSubmit} className="p-6 space-y-4">
                                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/60 text-xs text-slate-300">
                                    Transfer: <span className="font-mono font-bold text-white">{activeTransfer.transfer_number}</span>
                                    <div className="mt-1 text-slate-400">
                                        Dari {activeTransfer.source_warehouse?.name} ke {activeTransfer.destination_warehouse?.name}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                                        Konfirmasi Jumlah Fisik Diterima
                                    </label>
                                    {activeTransfer.items.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-700">
                                            <div>
                                                <div className="text-sm font-semibold text-white">
                                                    {item.product?.name}
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    Dikirim: {item.quantity_dispatched} {item.product?.unit?.code || 'PCS'}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    step="any"
                                                    min="0"
                                                    value={receiveData.received_quantities[item.id] ?? item.quantity_dispatched}
                                                    onChange={(e) => {
                                                        setReceiveData('received_quantities', {
                                                            ...receiveData.received_quantities,
                                                            [item.id]: parseFloat(e.target.value) || 0,
                                                        });
                                                    }}
                                                    className="w-24 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-right font-mono text-white text-sm focus:outline-none focus:border-emerald-500"
                                                />
                                                <span className="text-xs text-slate-400">
                                                    {item.product?.unit?.code || 'PCS'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-2 flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setReceiveModalOpen(false)}
                                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-xl transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={receiveProcessing}
                                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
                                    >
                                        {receiveProcessing ? 'Memproses...' : 'Konfirmasi Masuk Stok'}
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
