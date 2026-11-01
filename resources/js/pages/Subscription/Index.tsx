import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import {
    CreditCard,
    CheckCircle2,
    Store,
    ShoppingBag,
    Warehouse,
    Users,
    Zap,
    Sparkles,
    ShieldCheck,
    AlertCircle,
    Calendar,
    ArrowRight
} from 'lucide-react';

interface QuotaItem {
    current: number;
    max: number;
    remaining: number;
    percentage: number;
}

interface SubscriptionPlan {
    id: string;
    name: string;
    slug: string;
    description: string;
    price_monthly: number;
    price_annual: number;
    max_stores: number;
    max_registers: number;
    max_warehouses: number;
    max_users: number;
    features: string[];
    is_active: boolean;
}

interface SubscriptionUsage {
    subscription: {
        id: string;
        status: string;
        billing_interval: string;
        starts_at: string;
        ends_at: string | null;
        auto_renew: boolean;
    } | null;
    plan: SubscriptionPlan | null;
    stores: QuotaItem;
    registers: QuotaItem;
    warehouses: QuotaItem;
    users: QuotaItem;
}

interface Props {
    usage: SubscriptionUsage;
    plans: SubscriptionPlan[];
    current_plan_id?: string;
}

export default function SubscriptionIndex({ usage, plans, current_plan_id }: Props) {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
    const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState<SubscriptionPlan | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(val);
    };

    const handleUpgradeSubmit = (plan: SubscriptionPlan) => {
        if (confirm(`Konfirmasi beralih ke paket ${plan.name} dengan penagihan ${billingCycle === 'monthly' ? 'Bulanan' : 'Tahunan'}?`)) {
            setIsSubmitting(true);
            router.post('/subscription/upgrade', {
                plan_id: plan.id,
                billing_interval: billingCycle,
            }, {
                onFinish: () => {
                    setIsSubmitting(false);
                    setSelectedPlanForUpgrade(null);
                }
            });
        }
    };

    const quotaCards = [
        {
            title: 'Cabang Toko',
            icon: Store,
            data: usage.stores,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            barColor: 'bg-blue-500',
        },
        {
            title: 'Mesin POS Register',
            icon: ShoppingBag,
            data: usage.registers,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            barColor: 'bg-purple-500',
        },
        {
            title: 'Gudang Inventaris',
            icon: Warehouse,
            data: usage.warehouses,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            barColor: 'bg-amber-500',
        },
        {
            title: 'Staf & Akun Kasir',
            icon: Users,
            data: usage.users,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            barColor: 'bg-emerald-500',
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Paket Langganan & Kuota Tenant" />

            <div className="p-6 max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <CreditCard className="w-6 h-6 text-indigo-400" />
                        Langganan SaaS & Kuota Kapasitas
                    </h1>
                    <p className="text-sm text-slate-400 mt-1">
                        Pantau batas kuota operasional cabang, mesin POS kasir, dan pilih paket langganan yang sesuai skala bisnis Anda.
                    </p>
                </div>

                {/* Current Active Plan Overview Card */}
                <div className="bg-gradient-to-r from-indigo-950/60 via-slate-800 to-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                                    Paket Langganan Aktif
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    usage.subscription?.status === 'active'
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : usage.subscription?.status === 'trial'
                                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                }`}>
                                    {usage.subscription?.status === 'trial' ? 'UJI COBA' : usage.subscription?.status === 'active' ? 'AKTIF' : 'NON-AKTIF'}
                                </span>
                            </div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <span>{usage.plan?.name || 'Paket Starter Dasar'}</span>
                                <Sparkles className="w-5 h-5 text-amber-400" />
                            </h2>
                            <p className="text-xs text-slate-400 max-w-xl">
                                {usage.plan?.description || 'Paket operasional toko retail standar.'}
                            </p>
                        </div>

                        <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-4 text-right">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                                Siklus Tagihan
                            </span>
                            <span className="text-base font-bold text-indigo-300 capitalize">
                                {usage.subscription?.billing_interval === 'annual' ? 'Tahunan (Hemat 20%)' : 'Bulanan'}
                            </span>
                            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-end gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                <span>
                                    Berlaku s/d:{' '}
                                    {usage.subscription?.ends_at
                                        ? new Date(usage.subscription.ends_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                                        : 'Tanpa Batas'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quota Usage Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quotaCards.map((qc, idx) => (
                        <div key={idx} className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-5 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-400">{qc.title}</span>
                                <div className={`p-2 rounded-xl ${qc.bg} ${qc.color}`}>
                                    <qc.icon className="w-4 h-4" />
                                </div>
                            </div>

                            <div className="flex items-baseline justify-between">
                                <span className="text-2xl font-bold text-white">
                                    {qc.data.current}
                                    <span className="text-xs font-normal text-slate-500 ml-1">/ {qc.data.max}</span>
                                </span>
                                <span className={`text-xs font-bold ${
                                    qc.data.percentage >= 100
                                        ? 'text-rose-400'
                                        : qc.data.percentage >= 80
                                        ? 'text-amber-400'
                                        : 'text-emerald-400'
                                }`}>
                                    {qc.data.percentage}%
                                </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                                <div
                                    style={{ width: `${Math.min(100, qc.data.percentage)}%` }}
                                    className={`h-full rounded-full transition-all duration-300 ${
                                        qc.data.percentage >= 100
                                            ? 'bg-rose-500'
                                            : qc.data.percentage >= 80
                                            ? 'bg-amber-500'
                                            : qc.barColor
                                    }`}
                                />
                            </div>

                            <div className="text-[11px] text-slate-400 flex items-center justify-between">
                                <span>Tersisa: {qc.data.remaining}</span>
                                {qc.data.remaining === 0 && (
                                    <span className="text-rose-400 font-medium">Batas Maksimal</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Plan Comparison & Upgrade Section */}
                <div className="space-y-4 pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Zap className="w-5 h-5 text-amber-400" />
                                Pilihan Paket Langganan SaaS
                            </h2>
                            <p className="text-xs text-slate-400">
                                Tingkatkan kapasitas toko dan pengguna tanpa henti seiring perkembangan bisnis.
                            </p>
                        </div>

                        {/* Monthly vs Annual Toggle */}
                        <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1 text-xs self-start sm:self-auto">
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className={`px-4 py-1.5 rounded-lg font-medium transition-colors ${
                                    billingCycle === 'monthly'
                                        ? 'bg-indigo-600 text-white font-bold shadow-sm'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Penagihan Bulanan
                            </button>
                            <button
                                onClick={() => setBillingCycle('annual')}
                                className={`px-4 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                                    billingCycle === 'annual'
                                        ? 'bg-indigo-600 text-white font-bold shadow-sm'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <span>Penagihan Tahunan</span>
                                <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-900 font-black text-[9px]">
                                    Hemat 20%
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Pricing Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                        {plans.map((plan) => {
                            const isCurrent = plan.id === current_plan_id;
                            const price = billingCycle === 'annual'
                                ? Math.round(plan.price_annual / 12)
                                : plan.price_monthly;

                            return (
                                <div
                                    key={plan.id}
                                    className={`bg-slate-800/80 border rounded-2xl p-6 flex flex-col justify-between shadow-lg relative transition-all duration-200 ${
                                        isCurrent
                                            ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                                            : 'border-slate-700/80 hover:border-slate-600'
                                    }`}
                                >
                                    {isCurrent && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold uppercase rounded-full shadow-md tracking-wider">
                                            Paket Anda Saat Ini
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                                            <p className="text-xs text-slate-400 mt-1 min-h-[32px]">
                                                {plan.description}
                                            </p>
                                        </div>

                                        <div className="border-t border-b border-slate-700/60 py-3">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-3xl font-black text-white">
                                                    {formatCurrency(price)}
                                                </span>
                                                <span className="text-xs text-slate-400">/ bulan</span>
                                            </div>
                                            {billingCycle === 'annual' && (
                                                <span className="text-[10px] text-amber-400 mt-0.5 block">
                                                    Ditagih {formatCurrency(plan.price_annual)} per tahun
                                                </span>
                                            )}
                                        </div>

                                        {/* Features & Quota list */}
                                        <div className="space-y-2.5 text-xs text-slate-300">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                                <span>Maksimal <strong>{plan.max_stores} Cabang Toko</strong></span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                                <span>Maksimal <strong>{plan.max_registers} Register Kasir</strong></span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                                <span>Maksimal <strong>{plan.max_warehouses} Gudang</strong></span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                                <span>Maksimal <strong>{plan.max_users} Staf & Karyawan</strong></span>
                                            </div>
                                            {Array.isArray(plan.features) && plan.features.map((feat, fidx) => (
                                                <div key={fidx} className="flex items-center gap-2 text-slate-400">
                                                    <CheckCircle2 className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                                    <span>{feat}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-6 mt-4 border-t border-slate-700/60">
                                        {isCurrent ? (
                                            <button
                                                disabled
                                                className="w-full py-2.5 bg-slate-700/60 text-slate-400 rounded-xl text-xs font-semibold cursor-default"
                                            >
                                                Sedang Aktif
                                            </button>
                                        ) : (
                                            <button
                                                disabled={isSubmitting}
                                                onClick={() => handleUpgradeSubmit(plan)}
                                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5"
                                            >
                                                <span>Beralih ke Paket {plan.name}</span>
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

