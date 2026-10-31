import React from 'react';
import { Head, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import {
    Store,
    ShoppingBag,
    Warehouse,
    Users,
    ShieldAlert,
    CheckCircle2,
    Database,
    Clock,
    DollarSign,
    Sparkles
} from 'lucide-react';

interface Props {
    stats: {
        stores_count: number;
        registers_count: number;
        warehouses_count: number;
        users_count: number;
    };
}

export default function Dashboard({ stats }: Props) {
    const { auth } = usePage<PageProps>().props;

    return (
        <AuthenticatedLayout>
            <Head title="Dashboard Manajemen" />

            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-blue-900/60 via-slate-800 to-indigo-950/60 border border-slate-700/60 rounded-2xl p-6 mb-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30 mb-2">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Enterprise SaaS POS Foundation - Phase 1</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                            Selamat Datang, {auth.user?.name}!
                        </h1>
                        <p className="mt-1 text-sm text-slate-300">
                            {auth.tenant
                                ? `Mengelola organisasi ${auth.tenant.name} (${auth.tenant.slug})`
                                : 'Platform Host Administration'}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {auth.activeStore && (
                            <div className="bg-slate-900/70 border border-slate-700/70 rounded-xl px-4 py-2.5 text-right">
                                <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                                    Toko Saat Ini
                                </span>
                                <span className="text-sm font-bold text-white">
                                    {auth.activeStore.name}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Metrics KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Stores Card */}
                <div className="bg-slate-800 border border-slate-700/60 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-slate-400">Total Toko / Cabang</p>
                            <h3 className="text-2xl font-bold text-white mt-1">
                                {stats.stores_count}
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                            <Store className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="mt-3 text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Isolasi Tenant Terverifikasi</span>
                    </p>
                </div>

                {/* Registers Card */}
                <div className="bg-slate-800 border border-slate-700/60 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-slate-400">Register Kasir POS</p>
                            <h3 className="text-2xl font-bold text-white mt-1">
                                {stats.registers_count}
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                            <ShoppingBag className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="mt-3 text-[11px] text-slate-400">
                        Mesin kasir siap integrasi
                    </p>
                </div>

                {/* Warehouses Card */}
                <div className="bg-slate-800 border border-slate-700/60 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-slate-400">Gudang Inventaris</p>
                            <h3 className="text-2xl font-bold text-white mt-1">
                                {stats.warehouses_count}
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                            <Warehouse className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="mt-3 text-[11px] text-slate-400">
                        Multi-warehouse ready
                    </p>
                </div>

                {/* Users Card */}
                <div className="bg-slate-800 border border-slate-700/60 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-slate-400">Staf & Karyawan</p>
                            <h3 className="text-2xl font-bold text-white mt-1">
                                {stats.users_count}
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="mt-3 text-[11px] text-slate-400">
                        RBAC Granular Aktif
                    </p>
                </div>
            </div>

            {/* Architecture & Tenant System Specs Card */}
            <div className="bg-slate-800 border border-slate-700/60 rounded-xl p-6 shadow-sm mb-6">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Database className="w-4 h-4 text-blue-400" />
                    <span>Status Arsitektur Multi-Tenancy & Lingkungan Operasional</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
                        <span className="text-slate-400 block mb-1">Skema Isolasi Data:</span>
                        <span className="font-semibold text-white block text-sm">
                            Shared PostgreSQL + Scoping Otomatis
                        </span>
                        <p className="mt-1 text-slate-400 text-[11px]">
                            Setiap query dievaluasi melalui global scope <code className="text-blue-300">BelongsToTenant</code>.
                        </p>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
                        <span className="text-slate-400 block mb-1">Timezone & Mata Uang:</span>
                        <span className="font-semibold text-white block text-sm">
                            {auth.tenant?.timezone || 'Asia/Jakarta'} | {auth.tenant?.currency || 'IDR'}
                        </span>
                        <p className="mt-1 text-slate-400 text-[11px]">
                            Presisi mata uang NUMERIC(15,2) tanpa risiko floating point.
                        </p>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
                        <span className="text-slate-400 block mb-1">Kredensial Aktif:</span>
                        <span className="font-semibold text-white block text-sm">
                            {auth.user?.email}
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                            {auth.user?.roles.map((r) => (
                                <span key={r} className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-mono">
                                    {r}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

