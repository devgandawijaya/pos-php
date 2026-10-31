import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import {
    ClipboardList,
    Plus,
    Search,
    Truck,
    PackageCheck,
    CheckCircle2,
    Clock,
    X,
    FileText,
    Receipt,
    Calendar
} from 'lucide-react';

interface SupplierItem {
    id: string;
    name: string;
    code: string;
}

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

interface POItemRecord {
    id: string;
    product_id: string;
    quantity_ordered: string;
    quantity_received: string;
    unit_cost: string;
    subtotal: string;
    product?: {
        id: string;
        name: string;
        sku: string;
        unit?: { id: string; code: string };
    };
}

interface PurchaseOrderRecord {
    id: string;
    po_number: string;
    status: 'draft' | 'submitted' | 'approved' | 'partially_received' | 'received' | 'cancelled';
    order_date: string;
    expected_date: string | null;
    subtotal: string;
    tax_amount: string;
    total_amount: string;
    notes: string | null;
    supplier?: SupplierItem;
    warehouse?: WarehouseItem;
    user?: { id: string; name: string };
    items: POItemRecord[];
}

interface Props {
    orders: {
        data: PurchaseOrderRecord[];
        current_page: number;
        last_page: number;
        total: number;
    };
    suppliers: SupplierItem[];
    warehouses: WarehouseItem[];
    products: ProductItem[];
    filters: {
        status?: string;
        supplier_id?: string;
    };
}

export default function PurchasingIndex({ orders, suppliers, warehouses, products, filters }: Props) {
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [receiveModalOpen, setReceiveModalOpen] = useState(false);
    const [activePO, setActivePO] = useState<PurchaseOrderRecord | null>(null);

    const formatCurrency = (amount: number | string) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(Number(amount));
    };

    // Form for new PO
    const { data: createData, setData: setCreateData, post: postCreate, processing: createProcessing, errors: createErrors, reset: resetCreate } = useForm({
        supplier_id: suppliers[0]?.id || '',
        warehouse_id: warehouses[0]?.id || '',
        order_date: new Date().toISOString().split('T')[0],
        expected_date: '',
        notes: '',
        items: [{
            product_id: products[0]?.id || '',
            quantity: 10,
            unit_cost: parseFloat(products[0]?.purchase_cost || '0'),
        }],
    });

    // Form for Goods Receipt
    const { data: receiveData, setData: setReceiveData, post: postReceive, processing: receiveProcessing, reset: resetReceive } = useForm<{
        notes: string;
        items: { purchase_order_item_id: string; quantity_received: number }[];
    }>({
        notes: '',
        items: [],
    });

    const addItemRow = () => {
        setCreateData('items', [
            ...createData.items,
            {
                product_id: products[0]?.id || '',
                quantity: 1,
                unit_cost: parseFloat(products[0]?.purchase_cost || '0'),
            },
        ]);
    };

    const removeItemRow = (index: number) => {
        if (createData.items.length > 1) {
            setCreateData('items', createData.items.filter((_, i) => i !== index));
        }
    };

    const calculateSubtotal = () => {
        return createData.items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postCreate('/purchase-orders', {
            onSuccess: () => {
                setCreateModalOpen(false);
                resetCreate();
            },
        });
    };

    const openReceiveModal = (po: PurchaseOrderRecord) => {
        setActivePO(po);
        const receiptItems = po.items.map((item) => {
            const remaining = parseFloat(item.quantity_ordered) - parseFloat(item.quantity_received || '0');
            return {
                purchase_order_item_id: item.id,
                quantity_received: remaining > 0 ? remaining : 0,
            };
        });
        setReceiveData({
            notes: `Penerimaan barang dari PO #${po.po_number}`,
            items: receiptItems,
        });
        setReceiveModalOpen(true);
    };

    const handleReceiveSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activePO) return;

        postReceive(`/purchase-orders/${activePO.id}/receive`, {
            onSuccess: () => {
                setReceiveModalOpen(false);
                setActivePO(null);
                resetReceive();
            },
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'draft':
                return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">Draft</span>;
            case 'approved':
                return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">Disetujui</span>;
            case 'partially_received':
                return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Diterima Sebagian</span>;
            case 'received':
                return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Selesai Diterima</span>;
            default:
                return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400">{status}</span>;
        }
    };

    const subtotal = calculateSubtotal();
    const taxAmount = Math.round(subtotal * 0.11);
    const grandTotal = subtotal + taxAmount;

    return (
        <AuthenticatedLayout>
            <Head title="Pengadaan & Purchase Orders" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                            <ClipboardList className="w-7 h-7 text-emerald-400" />
                            <span>Purchase Orders & Penerimaan Barang</span>
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Pemesanan stok ke supplier dan pencatatan tanda terima barang (Goods Receipt) ke gudang.
                        </p>
                    </div>

                    <button
                        onClick={() => setCreateModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Buat Purchase Order</span>
                    </button>
                </div>

                {/* Table */}
                <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-900/50 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-700/70">
                                <tr>
                                    <th className="px-6 py-3.5">No. PO</th>
                                    <th className="px-6 py-3.5">Supplier & Lokasi</th>
                                    <th className="px-6 py-3.5">Tanggal</th>
                                    <th className="px-6 py-3.5 text-right">Nilai Total</th>
                                    <th className="px-6 py-3.5 text-center">Status</th>
                                    <th className="px-6 py-3.5 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {orders.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                            Belum ada Purchase Order yang tercatat.
                                        </td>
                                    </tr>
                                ) : (
                                    orders.data.map((po) => (
                                        <tr key={po.id} className="hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-mono font-bold text-white">
                                                    {po.po_number}
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    {po.items.length} Macam Barang
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs">
                                                <div className="font-semibold text-slate-200">
                                                    {po.supplier?.name}
                                                </div>
                                                <div className="text-slate-400 mt-0.5">
                                                    Tujuan: {po.warehouse?.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-slate-300">
                                                <div className="flex items-center gap-1 font-mono">
                                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                    {po.order_date}
                                                </div>
                                                {po.expected_date && (
                                                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                                        Est: {po.expected_date}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-white">
                                                {formatCurrency(po.total_amount)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {getStatusBadge(po.status)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {(po.status === 'approved' || po.status === 'partially_received') && (
                                                    <button
                                                        onClick={() => openReceiveModal(po)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold rounded-lg border border-emerald-500/30 transition-colors"
                                                    >
                                                        <PackageCheck className="w-3.5 h-3.5" />
                                                        <span>Terima Barang</span>
                                                    </button>
                                                )}
                                                {po.status === 'received' && (
                                                    <span className="text-xs text-emerald-400 font-medium">
                                                        Lengkap
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

                {/* Create PO Modal */}
                {createModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
                            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <ClipboardList className="w-5 h-5 text-emerald-400" />
                                    <span>Buat Purchase Order Baru</span>
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
                                            Pemasok (Supplier)
                                        </label>
                                        <select
                                            value={createData.supplier_id}
                                            onChange={(e) => setCreateData('supplier_id', e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                                        >
                                            {suppliers.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                            Gudang Penerima
                                        </label>
                                        <select
                                            value={createData.warehouse_id}
                                            onChange={(e) => setCreateData('warehouse_id', e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                                        >
                                            {warehouses.map((wh) => (
                                                <option key={wh.id} value={wh.id}>
                                                    {wh.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                            Tanggal Pesan
                                        </label>
                                        <input
                                            type="date"
                                            value={createData.order_date}
                                            onChange={(e) => setCreateData('order_date', e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                            Estimasi Tanggal Tiba
                                        </label>
                                        <input
                                            type="date"
                                            value={createData.expected_date}
                                            onChange={(e) => setCreateData('expected_date', e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                                        />
                                    </div>
                                </div>

                                {/* Items List */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                            Item Barang & Harga Beli
                                        </label>
                                        <button
                                            type="button"
                                            onClick={addItemRow}
                                            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                                        >
                                            + Tambah Baris
                                        </button>
                                    </div>

                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {createData.items.map((row, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <select
                                                    value={row.product_id}
                                                    onChange={(e) => {
                                                        const p = products.find(prod => prod.id === e.target.value);
                                                        const copy = [...createData.items];
                                                        copy[idx].product_id = e.target.value;
                                                        if (p) copy[idx].unit_cost = parseFloat(p.purchase_cost || '0');
                                                        setCreateData('items', copy);
                                                    }}
                                                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
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
                                                    className="w-20 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                                                />
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={row.unit_cost}
                                                    onChange={(e) => {
                                                        const copy = [...createData.items];
                                                        copy[idx].unit_cost = parseFloat(e.target.value) || 0;
                                                        setCreateData('items', copy);
                                                    }}
                                                    placeholder="Harga Satuan"
                                                    className="w-28 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
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

                                {/* Order Totals */}
                                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700 text-xs space-y-1">
                                    <div className="flex justify-between text-slate-400">
                                        <span>Subtotal Pesanan:</span>
                                        <span className="font-mono text-white">{formatCurrency(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-400">
                                        <span>PPN (11%):</span>
                                        <span className="font-mono text-white">{formatCurrency(taxAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-200 font-bold pt-1 border-t border-slate-700">
                                        <span>Total Nilai PO:</span>
                                        <span className="font-mono text-emerald-400 text-sm">{formatCurrency(grandTotal)}</span>
                                    </div>
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
                                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
                                    >
                                        {createProcessing ? 'Membuat...' : 'Terbitkan PO'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Goods Receipt Modal */}
                {receiveModalOpen && activePO && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <PackageCheck className="w-5 h-5 text-emerald-400" />
                                    <span>Penerimaan Barang (Goods Receipt)</span>
                                </h2>
                                <button
                                    onClick={() => setReceiveModalOpen(false)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleReceiveSubmit} className="p-6 space-y-4">
                                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700 text-xs">
                                    PO: <span className="font-mono font-bold text-white">{activePO.po_number}</span>
                                    <div className="text-slate-400 mt-0.5">
                                        Supplier: {activePO.supplier?.name} • Lokasi: {activePO.warehouse?.name}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                                        Kuantitas Barang Diterima Nyata
                                    </label>
                                    {activePO.items.map((item, idx) => {
                                        const remaining = parseFloat(item.quantity_ordered) - parseFloat(item.quantity_received || '0');
                                        return (
                                            <div key={item.id} className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-700">
                                                <div>
                                                    <div className="text-sm font-semibold text-white">
                                                        {item.product?.name}
                                                    </div>
                                                    <div className="text-xs text-slate-400">
                                                        Dipesan: {item.quantity_ordered} • Sudah Diterima: {item.quantity_received || 0}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        min="0"
                                                        max={remaining}
                                                        value={receiveData.items[idx]?.quantity_received ?? remaining}
                                                        onChange={(e) => {
                                                            const copy = [...receiveData.items];
                                                            copy[idx].quantity_received = parseFloat(e.target.value) || 0;
                                                            setReceiveData('items', copy);
                                                        }}
                                                        className="w-24 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-right font-mono text-white text-sm focus:outline-none focus:border-emerald-500"
                                                    />
                                                    <span className="text-xs text-slate-400">
                                                        {item.product?.unit?.code || 'PCS'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                        Catatan / No. Surat Jalan Supplier
                                    </label>
                                    <input
                                        type="text"
                                        value={receiveData.notes}
                                        onChange={(e) => setReceiveData('notes', e.target.value)}
                                        placeholder="No. SJ / Catatan..."
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                                    />
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
                                        {receiveProcessing ? 'Memproses...' : 'Konfirmasi Masuk Gudang'}
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
