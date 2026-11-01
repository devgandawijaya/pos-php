import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import {
    Tag,
    Percent,
    DollarSign,
    Gift,
    PlusCircle,
    Calendar,
    Search,
    Edit2,
    Trash2,
    X,
    CheckCircle2,
    Clock,
    AlertCircle,
    Users
} from 'lucide-react';

interface PromotionItem {
    id: string;
    name: string;
    code: string | null;
    type: 'percentage' | 'fixed' | 'buy_x_get_y';
    discount_value: number;
    min_order_amount: number;
    max_discount_amount: number | null;
    buy_quantity: number | null;
    get_quantity: number | null;
    target_type: 'all' | 'product' | 'category' | 'customer_group';
    target_id: string | null;
    start_date: string | null;
    end_date: string | null;
    usage_limit: number | null;
    usage_count: number;
    is_active: boolean;
    description: string | null;
}

interface Props {
    promotions: {
        data: PromotionItem[];
        current_page: number;
        last_page: number;
        total: number;
        links: any[];
    };
    filters: {
        search?: string;
        type?: string;
        status?: string;
    };
    kpis: {
        active_promos: number;
        total_usages: number;
        total_discount_given: number;
    };
    categories: Array<{ id: string; name: string }>;
    products: Array<{ id: string; name: string; sku: string }>;
    customerGroups: Array<{ id: string; name: string }>;
}

export default function PromotionsIndex({ promotions, filters, kpis, categories, products, customerGroups }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [typeFilter, setTypeFilter] = useState(filters.type || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPromo, setEditingPromo] = useState<PromotionItem | null>(null);

    // Form inputs
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [type, setType] = useState<'percentage' | 'fixed' | 'buy_x_get_y'>('percentage');
    const [discountValue, setDiscountValue] = useState<number>(10);
    const [minOrderAmount, setMinOrderAmount] = useState<number>(0);
    const [maxDiscountAmount, setMaxDiscountAmount] = useState<number | ''>('');
    const [buyQty, setBuyQty] = useState<number | ''>(1);
    const [getQty, setGetQty] = useState<number | ''>(1);
    const [targetType, setTargetType] = useState<'all' | 'product' | 'category' | 'customer_group'>('all');
    const [targetId, setTargetId] = useState<string>('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [usageLimit, setUsageLimit] = useState<number | ''>('');
    const [isActive, setIsActive] = useState(true);
    const [description, setDescription] = useState('');

    const formatCurrency = (val: number | null | undefined) => {
        if (val === null || val === undefined) return '-';
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(val);
    };

    const handleFilterChange = (newOverrides: Partial<typeof filters> = {}) => {
        router.get('/promotions', {
            search: newOverrides.search !== undefined ? newOverrides.search : search,
            type: newOverrides.type !== undefined ? newOverrides.type : typeFilter,
            status: newOverrides.status !== undefined ? newOverrides.status : statusFilter,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const openCreateModal = () => {
        setEditingPromo(null);
        setName('');
        setCode('');
        setType('percentage');
        setDiscountValue(10);
        setMinOrderAmount(0);
        setMaxDiscountAmount('');
        setBuyQty(1);
        setGetQty(1);
        setTargetType('all');
        setTargetId('');
        setStartDate('');
        setEndDate('');
        setUsageLimit('');
        setIsActive(true);
        setDescription('');
        setModalOpen(true);
    };

    const openEditModal = (p: PromotionItem) => {
        setEditingPromo(p);
        setName(p.name);
        setCode(p.code || '');
        setType(p.type);
        setDiscountValue(p.discount_value);
        setMinOrderAmount(p.min_order_amount);
        setMaxDiscountAmount(p.max_discount_amount !== null ? p.max_discount_amount : '');
        setBuyQty(p.buy_quantity !== null ? p.buy_quantity : '');
        setGetQty(p.get_quantity !== null ? p.get_quantity : '');
        setTargetType(p.target_type);
        setTargetId(p.target_id || '');
        setStartDate(p.start_date ? p.start_date.substring(0, 10) : '');
        setEndDate(p.end_date ? p.end_date.substring(0, 10) : '');
        setUsageLimit(p.usage_limit !== null ? p.usage_limit : '');
        setIsActive(p.is_active);
        setDescription(p.description || '');
        setModalOpen(true);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload: any = {
            name,
            code: code.trim() || null,
            type,
            discount_value: discountValue,
            min_order_amount: minOrderAmount || 0,
            max_discount_amount: maxDiscountAmount !== '' ? maxDiscountAmount : null,
            buy_quantity: type === 'buy_x_get_y' ? (buyQty || 1) : null,
            get_quantity: type === 'buy_x_get_y' ? (getQty || 1) : null,
            target_type: targetType,
            target_id: targetType !== 'all' && targetId ? targetId : null,
            start_date: startDate || null,
            end_date: endDate || null,
            usage_limit: usageLimit !== '' ? usageLimit : null,
            is_active: isActive,
            description: description || null,
        };

        if (editingPromo) {
            router.put(`/promotions/${editingPromo.id}`, payload, {
                onSuccess: () => setModalOpen(false),
            });
        } else {
            router.post('/promotions', payload, {
                onSuccess: () => setModalOpen(false),
            });
        }
    };

    const handleDelete = (p: PromotionItem) => {
        if (confirm(`Yakin ingin menghapus promosi "${p.name}"?`)) {
            router.delete(`/promotions/${p.id}`);
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Promosi & Kupon Diskon" />

            <div className="p-6 max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <Tag className="w-7 h-7 text-pink-400" />
                            <h1 className="text-2xl font-bold text-white tracking-tight">
                                Promosi, Kupon & Voucher
                            </h1>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">
                            Kelola program promosi belanja, kupon diskon persentase/nominal, promo Buy X Get Y, batas kuota, dan masa berlaku.
                        </p>
                    </div>

                    <button
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-colors"
                    >
                        <PlusCircle className="w-4 h-4" />
                        <span>Tambah Promo Baru</span>
                    </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                                Promosi Aktif
                            </span>
                            <span className="text-2xl font-bold text-emerald-400 mt-1 block">
                                {kpis.active_promos}
                            </span>
                            <span className="text-xs text-slate-500">
                                Siap digunakan di kasir POS
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <Tag className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                                Total Penggunaan Kupon
                            </span>
                            <span className="text-2xl font-bold text-blue-400 mt-1 block">
                                {kpis.total_usages}
                            </span>
                            <span className="text-xs text-slate-500">
                                Transaksi terpotong diskon promo
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                                Total Diskon Diberikan
                            </span>
                            <span className="text-2xl font-bold text-pink-400 mt-1 block font-mono">
                                {formatCurrency(kpis.total_discount_given)}
                            </span>
                            <span className="text-xs text-slate-500">
                                Akumulasi nilai hemat pelanggan
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                            <Percent className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex flex-wrap items-center gap-3 flex-1">
                        {/* Search */}
                        <div className="w-64 relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                            <input
                                type="text"
                                placeholder="Cari nama atau kode kupon..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleFilterChange({ search })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        {/* Type Filter */}
                        <div className="w-44">
                            <select
                                value={typeFilter}
                                onChange={(e) => {
                                    setTypeFilter(e.target.value);
                                    handleFilterChange({ type: e.target.value });
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="">Semua Tipe Diskon</option>
                                <option value="percentage">Persentase (%)</option>
                                <option value="fixed">Nominal Tetap (Rp)</option>
                                <option value="buy_x_get_y">Buy X Get Y Free</option>
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div className="w-36">
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    handleFilterChange({ status: e.target.value });
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="">Semua Status</option>
                                <option value="active">Aktif</option>
                                <option value="inactive">Nonaktif</option>
                            </select>
                        </div>
                    </div>

                    {(search || typeFilter || statusFilter) && (
                        <button
                            onClick={() => {
                                setSearch('');
                                setTypeFilter('');
                                setStatusFilter('');
                                router.get('/promotions');
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 transition-colors"
                        >
                            Reset Filter
                        </button>
                    )}
                </div>

                {/* Promotions Table */}
                <div className="bg-slate-800/80 rounded-xl border border-slate-700/60 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-slate-700 bg-slate-900/50 text-slate-400 uppercase text-[10px] tracking-wider">
                                    <th className="py-3 px-4">Nama Promo & Kode</th>
                                    <th className="py-3 px-4">Tipe & Nilai Diskon</th>
                                    <th className="py-3 px-4">Min. Belanja</th>
                                    <th className="py-3 px-4">Target Berlaku</th>
                                    <th className="py-3 px-4">Masa Berlaku</th>
                                    <th className="py-3 px-4 text-center">Penggunaan</th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                    <th className="py-3 px-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {promotions.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-slate-400">
                                            <Tag className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                                            <p className="font-medium text-slate-300">Belum ada promosi atau kupon</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Buat promo diskon pertama untuk meningkatkan penjualan.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    promotions.data.map((promo) => (
                                        <tr key={promo.id} className="hover:bg-slate-700/30 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-white">
                                                    {promo.name}
                                                </div>
                                                {promo.code ? (
                                                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300 font-mono text-[11px] font-bold">
                                                        {promo.code}
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-slate-500 italic">Otomatis / Tanpa Kode</span>
                                                )}
                                            </td>

                                            <td className="py-3 px-4">
                                                {promo.type === 'percentage' ? (
                                                    <div className="font-semibold text-emerald-400">
                                                        {promo.discount_value}% Diskon
                                                        {promo.max_discount_amount && (
                                                            <span className="text-[10px] text-slate-400 block font-normal">
                                                                Maks. {formatCurrency(promo.max_discount_amount)}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : promo.type === 'fixed' ? (
                                                    <div className="font-semibold text-blue-400 font-mono">
                                                        Potongan {formatCurrency(promo.discount_value)}
                                                    </div>
                                                ) : (
                                                    <div className="font-semibold text-purple-400">
                                                        Beli {promo.buy_quantity} Gratis {promo.get_quantity}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="py-3 px-4 font-mono text-slate-300">
                                                {promo.min_order_amount > 0 ? formatCurrency(promo.min_order_amount) : 'Tanpa Min.'}
                                            </td>

                                            <td className="py-3 px-4">
                                                <span className="capitalize text-slate-300">
                                                    {promo.target_type === 'all'
                                                        ? 'Semua Produk'
                                                        : promo.target_type === 'customer_group'
                                                        ? 'Grup Pelanggan'
                                                        : promo.target_type === 'category'
                                                        ? 'Kategori Khusus'
                                                        : 'Produk Tertentu'}
                                                </span>
                                            </td>

                                            <td className="py-3 px-4">
                                                <div className="text-slate-300 text-[11px]">
                                                    {promo.start_date ? new Date(promo.start_date).toLocaleDateString('id-ID') : 'Sekarang'}
                                                    {' s/d '}
                                                    {promo.end_date ? new Date(promo.end_date).toLocaleDateString('id-ID') : 'Selamanya'}
                                                </div>
                                            </td>

                                            <td className="py-3 px-4 text-center font-mono">
                                                <span className="text-white font-semibold">{promo.usage_count}</span>
                                                <span className="text-slate-500"> / {promo.usage_limit ?? '∞'}</span>
                                            </td>

                                            <td className="py-3 px-4 text-center">
                                                {promo.is_active ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        AKTIF
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-700/60 text-slate-400">
                                                        NONAKTIF
                                                    </span>
                                                )}
                                            </td>

                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => openEditModal(promo)}
                                                        className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                                                        title="Edit Promosi"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(promo)}
                                                        className="p-1.5 rounded-lg text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                                        title="Hapus Promosi"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* MODAL: CREATE / EDIT PROMOTION */}
                {modalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
                        <div className="w-full max-w-xl bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                                <div className="flex items-center gap-2">
                                    <Tag className="w-5 h-5 text-blue-400" />
                                    <h3 className="text-base font-bold text-white">
                                        {editingPromo ? 'Edit Promosi & Kupon' : 'Tambah Promosi & Kupon Baru'}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setModalOpen(false)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleFormSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                                            Nama Promosi *
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Contoh: Promo Gajian Super Hemat"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>

                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                                            Kode Kupon (Opsional)
                                        </label>
                                        <input
                                            type="text"
                                            value={code}
                                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                                            placeholder="Contoh: HEMAT10, GAJIAN50"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                                            Tipe Diskon *
                                        </label>
                                        <select
                                            value={type}
                                            onChange={(e) => setType(e.target.value as any)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="percentage">Persentase (%)</option>
                                            <option value="fixed">Nominal Tetap (Rp)</option>
                                            <option value="buy_x_get_y">Buy X Get Y</option>
                                        </select>
                                    </div>

                                    {type !== 'buy_x_get_y' ? (
                                        <>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-300 block mb-1">
                                                    Nilai Diskon ({type === 'percentage' ? '%' : 'Rp'}) *
                                                </label>
                                                <input
                                                    type="number"
                                                    value={discountValue}
                                                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    min="0"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="text-xs font-semibold text-slate-300 block mb-1">
                                                    Maks. Diskon (IDR)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={maxDiscountAmount}
                                                    onChange={(e) => setMaxDiscountAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                                    placeholder="Opsional"
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <label className="text-xs font-semibold text-slate-300 block mb-1">
                                                    Beli Kuantitas (X)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={buyQty}
                                                    onChange={(e) => setBuyQty(parseInt(e.target.value) || 1)}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                                                    min="1"
                                                />
                                            </div>

                                            <div>
                                                <label className="text-xs font-semibold text-slate-300 block mb-1">
                                                    Gratis Kuantitas (Y)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={getQty}
                                                    onChange={(e) => setGetQty(parseInt(e.target.value) || 1)}
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                                                    min="1"
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                                            Minimal Belanja (IDR)
                                        </label>
                                        <input
                                            type="number"
                                            value={minOrderAmount}
                                            onChange={(e) => setMinOrderAmount(parseFloat(e.target.value) || 0)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            min="0"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                                            Batas Kuota Penggunaan
                                        </label>
                                        <input
                                            type="number"
                                            value={usageLimit}
                                            onChange={(e) => setUsageLimit(e.target.value === '' ? '' : parseInt(e.target.value))}
                                            placeholder="Tak terbatas (kosongkan)"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                                            Target Penerapan
                                        </label>
                                        <select
                                            value={targetType}
                                            onChange={(e) => {
                                                setTargetType(e.target.value as any);
                                                setTargetId('');
                                            }}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="all">Semua Produk & Pelanggan</option>
                                            <option value="customer_group">Khusus Grup Pelanggan (CRM)</option>
                                            <option value="category">Khusus Kategori Produk</option>
                                            <option value="product">Khusus Produk Tertentu</option>
                                        </select>
                                    </div>

                                    {targetType !== 'all' && (
                                        <div>
                                            <label className="text-xs font-semibold text-slate-300 block mb-1">
                                                Pilih Target Spesifik
                                            </label>
                                            <select
                                                value={targetId}
                                                onChange={(e) => setTargetId(e.target.value)}
                                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required
                                            >
                                                <option value="">Pilih Target...</option>
                                                {targetType === 'customer_group' && customerGroups.map((cg) => (
                                                    <option key={cg.id} value={cg.id}>{cg.name}</option>
                                                ))}
                                                {targetType === 'category' && categories.map((cat) => (
                                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                ))}
                                                {targetType === 'product' && products.map((prod) => (
                                                    <option key={prod.id} value={prod.id}>{prod.name} ({prod.sku})</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                                            Tanggal Mulai Berlaku
                                        </label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                                            Tanggal Selesai Berlaku
                                        </label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                                        Deskripsi / Catatan Promo (Opsional)
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={2}
                                        placeholder="Syarat dan ketentuan promo..."
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    <input
                                        type="checkbox"
                                        id="is_active_toggle"
                                        checked={isActive}
                                        onChange={(e) => setIsActive(e.target.checked)}
                                        className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label htmlFor="is_active_toggle" className="text-xs text-slate-300 select-none">
                                        Promosi aktif dan dapat digunakan di kasir POS
                                    </label>
                                </div>

                                <div className="pt-2 flex justify-end gap-2 border-t border-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => setModalOpen(false)}
                                        className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20"
                                    >
                                        {editingPromo ? 'Simpan Perubahan' : 'Buat Promosi'}
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

