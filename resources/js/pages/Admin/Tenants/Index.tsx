import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import {
    Building2,
    Search,
    Filter,
    ShieldCheck,
    CreditCard,
    DollarSign,
    Users,
    Store,
    ShoppingBag,
    AlertCircle,
    CheckCircle2,
    Ban,
    X,
    Settings,
    Layers,
    ArrowUpRight
} from 'lucide-react';

interface TenantItem {
    id: string;
    name: string;
    slug: string;
    email: string;
    status: 'active' | 'suspended' | 'cancelled' | 'trial';
    created_at: string;
    stores_count: number;
    users_count: number;
    registers_count: number;
    warehouses_count: number;
    latest_subscription?: {
        id: string;
        status: string;
        billing_interval: string;
        starts_at: string;
        ends_at: string | null;
        plan?: {
            id: string;
            name: string;
            slug: string;
            price_monthly: number;
            max_stores: number;
            max_registers: number;
            max_users: number;
        };
    };
}

interface PlanOption {
    id: string;
    name: string;
    slug: string;
    price_monthly: number;
    price_annual: number;
    max_stores: number;
    max_registers: number;
    max_users: number;
}

interface Props {
    tenants: {
        data: TenantItem[];
        links: any[];
        current_page: number;
        last_page: number;
        total: number;
    };
    plans: PlanOption[];
    filters: {
        search: string;
        status: string;
    };
    kpis: {
        total_tenants: number;
        active_tenants: number;
        suspended_tenants: number;
        mrr_estimate: number;
    };
}

export default function SuperAdminTenantsIndex({ tenants, plans, filters, kpis }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || '');

    // Modals
    const [editingTenant, setEditingTenant] = useState<TenantItem | null>(null);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'annual'>('monthly');

    const [statusModalTenant, setStatusModalTenant] = useState<TenantItem | null>(null);
    const [targetStatus, setTargetStatus] = useState<'active' | 'suspended' | 'cancelled'>('active');

    const [isSubmitting, setIsSubmitting] = useState(false);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(val);
    };

    const handleFilter = () => {
        router.get('/admin/tenants', {
            search: searchTerm,
            status: selectedStatus,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    const handleReset = () => {
        setSearchTerm('');
        setSelectedStatus('');
        router.get('/admin/tenants');
    };

    const handleOpenPlanModal = (tenant: TenantItem) => {
        setEditingTenant(tenant);
        setSelectedPlanId(tenant.latest_subscription?.plan?.id || plans[0]?.id || '');
        setSelectedInterval((tenant.latest_subscription?.billing_interval as any) || 'monthly');
    };

    const handleSubmitPlanChange = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTenant || !selectedPlanId) return;

        setIsSubmitting(true);
        router.post(`/admin/tenants/${editingTenant.id}/plan`, {
            plan_id: selectedPlanId,
            billing_interval: selectedInterval,
        }, {
            onSuccess: () => setEditingTenant(null),
            onFinish: () => setIsSubmitting(false),
        });
    };

    const handleOpenStatusModal = (tenant: TenantItem) => {
        setStatusModalTenant(tenant);
        setTargetStatus(tenant.status as any);
    };

    const handleSubmitStatusChange = (e: React.FormEvent) => {
        e.preventDefault();
        if (!statusModalTenant) return;

        setIsSubmitting(true);
        router.post(`/admin/tenants/${statusModalTenant.id}/status`, {
            status: targetStatus,
        }, {
            onSuccess: () => setStatusModalTenant(null),
            onFinish: () => setIsSubmitting(false),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Manajemen Seluruh Tenant Platform" />

            <div className="p-6 max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Platform Super Administration</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                            <Building2 className="w-6 h-6 text-indigo-400" />
                            Direktori & Manajemen Organisasi Tenant
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Pantau seluruh tenant bisnis terdaftar, status langganan, kuota, dan kontrol akun platform.
                        </p>
                    </div>
                </div>

                {/* Platform KPI Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-400">Total Organisasi Tenant</span>
                            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                                <Building2 className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="mt-3 text-2xl font-bold text-white">
                            {kpis.total_tenants.toLocaleString('id-ID')}
                        </div>
                        <span className="text-xs text-slate-500 mt-1 block">Terdaftar pada database SaaS</span>
                    </div>

                    <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-400">Tenant Aktif</span>
                            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="mt-3 text-2xl font-bold text-emerald-400">
                            {kpis.active_tenants.toLocaleString('id-ID')}
                        </div>
                        <span className="text-xs text-slate-500 mt-1 block">Operasional aktif tanpa suspensi</span>
                    </div>

                    <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-400">Ditangguhkan / Suspended</span>
                            <div className="p-2 bg-rose-500/10 rounded-xl text-rose-400">
                                <Ban className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="mt-3 text-2xl font-bold text-rose-400">
                            {kpis.suspended_tenants.toLocaleString('id-ID')}
                        </div>
                        <span className="text-xs text-slate-500 mt-1 block">Akses login dibekukan</span>
                    </div>

                    <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-400">Estimasi MRR Platform</span>
                            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
                                <DollarSign className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="mt-3 text-xl font-bold text-amber-400 font-mono">
                            {formatCurrency(kpis.mrr_estimate)}
                        </div>
                        <span className="text-xs text-slate-500 mt-1 block">Pendapatan langganan bulanan</span>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Cari nama tenant, slug, email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
                                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                        >
                            <option value="">Semua Status Operasional</option>
                            <option value="active">Active (Aktif)</option>
                            <option value="trial">Trial (Masa Percobaan)</option>
                            <option value="suspended">Suspended (Ditangguhkan)</option>
                            <option value="cancelled">Cancelled (Dibatalkan)</option>
                        </select>

                        <div className="flex gap-2">
                            <button
                                onClick={handleFilter}
                                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors"
                            >
                                Terapkan Filter
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

                {/* Tenants Table */}
                <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-900/60 text-xs uppercase text-slate-400 font-semibold border-b border-slate-700/80">
                                <tr>
                                    <th className="px-5 py-4">Organisasi Tenant</th>
                                    <th className="px-5 py-4">Paket Langganan</th>
                                    <th className="px-5 py-4">Status</th>
                                    <th className="px-5 py-4 text-center">Toko</th>
                                    <th className="px-5 py-4 text-center">POS</th>
                                    <th className="px-5 py-4 text-center">User</th>
                                    <th className="px-5 py-4">Tgl Bergabung</th>
                                    <th className="px-5 py-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {tenants.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                                            Tidak ada tenant ditemukan.
                                        </td>
                                    </tr>
                                ) : (
                                    tenants.data.map((t) => {
                                        const subPlan = t.latest_subscription?.plan;
                                        return (
                                            <tr key={t.id} className="hover:bg-slate-700/20 transition-colors">
                                                <td className="px-5 py-4">
                                                    <div className="font-bold text-white text-base">{t.name}</div>
                                                    <div className="text-xs text-indigo-400 font-mono mt-0.5">{t.slug}</div>
                                                    <div className="text-[11px] text-slate-500">{t.email}</div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="font-semibold text-white">
                                                        {subPlan?.name || 'Paket Dasar'}
                                                    </div>
                                                    <div className="text-xs text-slate-400">
                                                        {subPlan ? formatCurrency(subPlan.price_monthly) + '/bln' : 'Gratis'}
                                                    </div>
                                                    <span className="text-[10px] text-slate-500">
                                                        ({t.latest_subscription?.billing_interval === 'annual' ? 'Tahunan' : 'Bulanan'})
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                                        t.status === 'active'
                                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                            : t.status === 'trial'
                                                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                                    }`}>
                                                        {t.status === 'active' ? 'AKTIF' : t.status === 'trial' ? 'UJI COBA' : t.status === 'suspended' ? 'DITANGGUHKAN' : 'DIBATALKAN'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-center font-mono">
                                                    <span className="text-white font-bold">{t.stores_count}</span>
                                                    <span className="text-slate-500 text-xs"> / {subPlan?.max_stores ?? '1'}</span>
                                                </td>
                                                <td className="px-5 py-4 text-center font-mono">
                                                    <span className="text-white font-bold">{t.registers_count}</span>
                                                    <span className="text-slate-500 text-xs"> / {subPlan?.max_registers ?? '2'}</span>
                                                </td>
                                                <td className="px-5 py-4 text-center font-mono">
                                                    <span className="text-white font-bold">{t.users_count}</span>
                                                    <span className="text-slate-500 text-xs"> / {subPlan?.max_users ?? '5'}</span>
                                                </td>
                                                <td className="px-5 py-4 text-xs text-slate-400">
                                                    {new Date(t.created_at).toLocaleDateString('id-ID', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })}
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => handleOpenPlanModal(t)}
                                                            className="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold transition-colors"
                                                            title="Ganti Paket"
                                                        >
                                                            Ubah Paket
                                                        </button>
                                                        <button
                                                            onClick={() => handleOpenStatusModal(t)}
                                                            className="p-1.5 bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                                                            title="Ubah Status Tenant"
                                                        >
                                                            <Settings className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {tenants.total > tenants.data.length && (
                        <div className="p-4 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
                            <span>Menampilkan {tenants.data.length} dari {tenants.total} tenant</span>
                            <div className="flex gap-1">
                                {tenants.links.map((link, idx) => (
                                    <button
                                        key={idx}
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url)}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-3 py-1 rounded-md ${
                                            link.active
                                                ? 'bg-indigo-600 text-white font-bold'
                                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                        } ${!link.url ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL GANTI PAKET TENANT */}
            {editingTenant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-5 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
                            <h3 className="font-bold text-white text-base flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-indigo-400" />
                                Ubah Paket Langganan Tenant
                            </h3>
                            <button
                                onClick={() => setEditingTenant(null)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitPlanChange} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                    Organisasi Tenant
                                </label>
                                <div className="text-white font-bold text-base bg-slate-900 p-3 rounded-xl border border-slate-700">
                                    {editingTenant.name} ({editingTenant.slug})
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                    Pilih Paket Langganan Baru
                                </label>
                                <select
                                    value={selectedPlanId}
                                    onChange={(e) => setSelectedPlanId(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                                >
                                    {plans.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} - {formatCurrency(p.price_monthly)}/bln (Max {p.max_stores} Toko, {p.max_registers} POS, {p.max_users} Staf)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                    Siklus Penagihan
                                </label>
                                <select
                                    value={selectedInterval}
                                    onChange={(e) => setSelectedInterval(e.target.value as any)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="monthly">Bulanan (Monthly)</option>
                                    <option value="annual">Tahunan (Annual)</option>
                                </select>
                            </div>

                            <div className="pt-4 border-t border-slate-700 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditingTenant(null)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors border border-slate-700"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium shadow-md transition-colors"
                                >
                                    {isSubmitting ? 'Menyimpan...' : 'Perbarui Paket'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL UBAH STATUS TENANT */}
            {statusModalTenant && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-5 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
                            <h3 className="font-bold text-white text-base flex items-center gap-2">
                                <Settings className="w-5 h-5 text-indigo-400" />
                                Ubah Status Operasional Tenant
                            </h3>
                            <button
                                onClick={() => setStatusModalTenant(null)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitStatusChange} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                    Organisasi Tenant
                                </label>
                                <div className="text-white font-bold text-base bg-slate-900 p-3 rounded-xl border border-slate-700">
                                    {statusModalTenant.name}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                    Status Operasional
                                </label>
                                <select
                                    value={targetStatus}
                                    onChange={(e) => setTargetStatus(e.target.value as any)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="active">Active - Beroperasi Normal</option>
                                    <option value="suspended">Suspended - Bekukan Akses Login</option>
                                    <option value="cancelled">Cancelled - Berhenti Langganan</option>
                                </select>
                            </div>

                            <p className="text-xs text-slate-400">
                                Mengubah status menjadi <strong>Suspended</strong> akan otomatis menonaktifkan kemampuan login staf pada tenant ini.
                            </p>

                            <div className="pt-4 border-t border-slate-700 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setStatusModalTenant(null)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors border border-slate-700"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium shadow-md transition-colors"
                                >
                                    {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}

