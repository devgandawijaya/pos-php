import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import {
    Clock,
    DollarSign,
    CheckCircle2,
    AlertTriangle,
    ShieldCheck,
    PlusCircle,
    ArrowDownLeft,
    ArrowUpRight,
    Printer,
    X,
    Filter,
    Calendar,
    Eye,
    Lock,
    Receipt,
    RefreshCw,
    Building2
} from 'lucide-react';

interface ShiftItem {
    id: string;
    store_id: string;
    register_id: string;
    user_id: string;
    approved_by_id: string | null;
    status: 'open' | 'closed';
    opened_at: string;
    closed_at: string | null;
    opening_cash: number;
    expected_cash: number | null;
    actual_cash: number | null;
    cash_difference: number | null;
    notes: string | null;
    approval_status: 'not_required' | 'pending' | 'approved' | 'rejected';
    approved_at: string | null;
    store?: { id: string; name: string; code: string };
    register?: { id: string; name: string; code: string };
    cashier?: { id: string; name: string; email: string };
    supervisor?: { id: string; name: string };
}

interface Props {
    shifts: {
        data: ShiftItem[];
        current_page: number;
        last_page: number;
        total: number;
        links: any[];
    };
    currentStore: { id: string; name: string; code: string } | null;
    stores: Array<{ id: string; name: string; code: string }>;
    registers: Array<{ id: string; store_id: string; name: string; code: string }>;
    filters: {
        store_id?: string;
        status?: string;
        approval_status?: string;
        date?: string;
    };
    kpis: {
        active_shifts: number;
        pending_approvals: number;
        today_closed: number;
    };
}

export default function ShiftsIndex({ shifts, currentStore, stores, registers, filters, kpis }: Props) {
    // Filter State
    const [selectedStore, setSelectedStore] = useState(filters.store_id || currentStore?.id || '');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || '');
    const [selectedApproval, setSelectedApproval] = useState(filters.approval_status || '');
    const [selectedDate, setSelectedDate] = useState(filters.date || '');

    // Modals
    const [openShiftModal, setOpenShiftModal] = useState(false);
    const [movementModal, setMovementModal] = useState(false);
    const [closeModal, setCloseModal] = useState(false);
    const [reportModal, setReportModal] = useState(false);
    const [approveModal, setApproveModal] = useState(false);

    // Selected Shift for Action
    const [targetShift, setTargetShift] = useState<ShiftItem | null>(null);
    const [shiftReportData, setShiftReportData] = useState<any>(null);
    const [loadingReport, setLoadingReport] = useState(false);

    // Form inputs
    const [newShiftStoreId, setNewShiftStoreId] = useState(currentStore?.id || (stores[0]?.id || ''));
    const [newShiftRegisterId, setNewShiftRegisterId] = useState(registers.filter(r => r.store_id === (currentStore?.id || stores[0]?.id))[0]?.id || '');
    const [newShiftOpeningCash, setNewShiftOpeningCash] = useState<number>(200000);
    const [newShiftNotes, setNewShiftNotes] = useState('');

    const [movementType, setMovementType] = useState<'cash_in' | 'cash_out'>('cash_in');
    const [movementAmount, setMovementAmount] = useState<number>(0);
    const [movementReason, setMovementReason] = useState('Modal Tambahan');
    const [movementNotes, setMovementNotes] = useState('');

    const [actualCashInput, setActualCashInput] = useState<number>(0);
    const [closeNotes, setCloseNotes] = useState('');
    const [approvalNotes, setApprovalNotes] = useState('');

    const formatCurrency = (val: number | null | undefined) => {
        if (val === null || val === undefined) return '-';
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(val);
    };

    const handleFilterChange = (overrides: Partial<typeof filters> = {}) => {
        router.get('/shifts', {
            store_id: overrides.store_id !== undefined ? overrides.store_id : selectedStore,
            status: overrides.status !== undefined ? overrides.status : selectedStatus,
            approval_status: overrides.approval_status !== undefined ? overrides.approval_status : selectedApproval,
            date: overrides.date !== undefined ? overrides.date : selectedDate,
        }, {
            preserveState: true,
            replace: true,
        });
    };

    // Open Shift Form Submit
    const handleOpenShiftSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/shifts', {
            store_id: newShiftStoreId,
            register_id: newShiftRegisterId,
            opening_cash: newShiftOpeningCash,
            notes: newShiftNotes,
        }, {
            onSuccess: () => {
                setOpenShiftModal(false);
                setNewShiftNotes('');
            },
        });
    };

    // Movement Submit
    const handleMovementSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetShift) return;
        router.post(`/shifts/${targetShift.id}/cash-movement`, {
            type: movementType,
            amount: movementAmount,
            reason: movementReason,
            notes: movementNotes,
        }, {
            onSuccess: () => {
                setMovementModal(false);
                setMovementAmount(0);
                setMovementNotes('');
            },
        });
    };

    // Close Shift Submit
    const handleCloseShiftSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetShift) return;
        router.post(`/shifts/${targetShift.id}/close`, {
            actual_cash: actualCashInput,
            notes: closeNotes,
        }, {
            onSuccess: () => {
                setCloseModal(false);
                setCloseNotes('');
            },
        });
    };

    // Approve Discrepancy Submit
    const handleApproveSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetShift) return;
        router.post(`/shifts/${targetShift.id}/approve`, {
            notes: approvalNotes,
        }, {
            onSuccess: () => {
                setApproveModal(false);
                setApprovalNotes('');
            },
        });
    };

    // Open Z-Report Modal
    const handleViewReport = async (shift: ShiftItem) => {
        setTargetShift(shift);
        setReportModal(true);
        setLoadingReport(true);
        try {
            const res = await fetch(`/shifts/${shift.id}/report`);
            const data = await res.json();
            if (data.status === 'success') {
                setShiftReportData(data.report);
            }
        } catch (err) {
            console.error('Failed to load report:', err);
        } finally {
            setLoadingReport(false);
        }
    };

    const availableRegisters = registers.filter(r => r.store_id === newShiftStoreId);

    return (
        <AuthenticatedLayout>
            <Head title="Manajemen Shift & Kas Kasir" />

            <div className="p-6 max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-7 h-7 text-amber-400" />
                            <h1 className="text-2xl font-bold text-white tracking-tight">
                                Manajemen Shift & Kas Kasir
                            </h1>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">
                            Pantau pembukaan shift, mutasi kas laci (cash in/out), hitungan uang fisik penutupan, dan approval selisih kas.
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            setNewShiftStoreId(currentStore?.id || stores[0]?.id || '');
                            setOpenShiftModal(true);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-colors"
                    >
                        <PlusCircle className="w-4 h-4" />
                        <span>Buka Shift Baru</span>
                    </button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                                Shift Kasir Aktif
                            </span>
                            <span className="text-2xl font-bold text-emerald-400 mt-1 block">
                                {kpis.active_shifts}
                            </span>
                            <span className="text-xs text-slate-500">
                                Kasir sedang melayani di register
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <Clock className="w-6 h-6 animate-pulse" />
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                                Butuh Approval Supervisor
                            </span>
                            <span className="text-2xl font-bold text-amber-400 mt-1 block">
                                {kpis.pending_approvals}
                            </span>
                            <span className="text-xs text-slate-500">
                                Shift dengan selisih kas fisik
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                                Shift Ditutup Hari Ini
                            </span>
                            <span className="text-2xl font-bold text-blue-400 mt-1 block">
                                {kpis.today_closed}
                            </span>
                            <span className="text-xs text-slate-500">
                                Selesai rekonsiliasi & Z-Report
                            </span>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex flex-wrap items-center gap-3 flex-1">
                        {/* Store Selector */}
                        <div className="w-48">
                            <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">
                                Toko / Cabang
                            </label>
                            <select
                                value={selectedStore}
                                onChange={(e) => {
                                    setSelectedStore(e.target.value);
                                    handleFilterChange({ store_id: e.target.value });
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="">Semua Toko</option>
                                {stores.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} ({s.code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div className="w-36">
                            <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">
                                Status Shift
                            </label>
                            <select
                                value={selectedStatus}
                                onChange={(e) => {
                                    setSelectedStatus(e.target.value);
                                    handleFilterChange({ status: e.target.value });
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="">Semua Status</option>
                                <option value="open">Sedang Aktif (Open)</option>
                                <option value="closed">Ditutup (Closed)</option>
                            </select>
                        </div>

                        {/* Approval Filter */}
                        <div className="w-44">
                            <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">
                                Status Approval
                            </label>
                            <select
                                value={selectedApproval}
                                onChange={(e) => {
                                    setSelectedApproval(e.target.value);
                                    handleFilterChange({ approval_status: e.target.value });
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                                <option value="">Semua Approval</option>
                                <option value="pending">Butuh Approval</option>
                                <option value="approved">Disetujui</option>
                                <option value="not_required">Tidak Perlu</option>
                            </select>
                        </div>

                        {/* Date Filter */}
                        <div className="w-40">
                            <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">
                                Tanggal Shift
                            </label>
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => {
                                    setSelectedDate(e.target.value);
                                    handleFilterChange({ date: e.target.value });
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {(selectedStatus || selectedApproval || selectedDate) && (
                        <button
                            onClick={() => {
                                setSelectedStatus('');
                                setSelectedApproval('');
                                setSelectedDate('');
                                router.get('/shifts', { store_id: selectedStore });
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 transition-colors"
                        >
                            Reset Filter
                        </button>
                    )}
                </div>

                {/* Shift Table */}
                <div className="bg-slate-800/80 rounded-xl border border-slate-700/60 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="border-b border-slate-700 bg-slate-900/50 text-slate-400 uppercase text-[10px] tracking-wider">
                                    <th className="py-3 px-4">Register & Toko</th>
                                    <th className="py-3 px-4">Kasir</th>
                                    <th className="py-3 px-4">Waktu Buka / Tutup</th>
                                    <th className="py-3 px-4 text-right">Kas Awal</th>
                                    <th className="py-3 px-4 text-right">Kas Diharapkan</th>
                                    <th className="py-3 px-4 text-right">Uang Fisik</th>
                                    <th className="py-3 px-4 text-right">Selisih</th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                    <th className="py-3 px-4 text-center">Approval</th>
                                    <th className="py-3 px-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {shifts.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="py-12 text-center text-slate-400">
                                            <Clock className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                                            <p className="font-medium text-slate-300">Belum ada data shift kasir</p>
                                            <p className="text-xs text-slate-500 mt-0.5">Buka shift baru untuk memulai operasional register.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    shifts.data.map((shift) => {
                                        const diff = shift.cash_difference;
                                        return (
                                            <tr key={shift.id} className="hover:bg-slate-700/30 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="font-semibold text-white">
                                                        {shift.register?.name ?? 'Register'}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400">
                                                        {shift.store?.name} ({shift.register?.code ?? '-'})
                                                    </div>
                                                </td>

                                                <td className="py-3 px-4">
                                                    <div className="font-medium text-slate-200">
                                                        {shift.cashier?.name ?? 'Kasir'}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400">
                                                        {shift.cashier?.email}
                                                    </div>
                                                </td>

                                                <td className="py-3 px-4">
                                                    <div className="text-slate-200">
                                                        Buka: {new Date(shift.opened_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} ({new Date(shift.opened_at).toLocaleDateString('id-ID')})
                                                    </div>
                                                    <div className="text-[11px] text-slate-400">
                                                        {shift.closed_at
                                                            ? `Tutup: ${new Date(shift.closed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                                                            : 'Masih Berlangsung'}
                                                    </div>
                                                </td>

                                                <td className="py-3 px-4 text-right font-mono text-slate-300">
                                                    {formatCurrency(shift.opening_cash)}
                                                </td>

                                                <td className="py-3 px-4 text-right font-mono text-slate-300">
                                                    {shift.expected_cash !== null ? formatCurrency(shift.expected_cash) : '-'}
                                                </td>

                                                <td className="py-3 px-4 text-right font-mono text-white font-medium">
                                                    {shift.actual_cash !== null ? formatCurrency(shift.actual_cash) : '-'}
                                                </td>

                                                <td className="py-3 px-4 text-right font-mono font-medium">
                                                    {diff === null ? (
                                                        <span className="text-slate-500">-</span>
                                                    ) : diff === 0 ? (
                                                        <span className="text-emerald-400 font-semibold">Rp 0 (Cocok)</span>
                                                    ) : diff > 0 ? (
                                                        <span className="text-blue-400 font-semibold">+{formatCurrency(diff)}</span>
                                                    ) : (
                                                        <span className="text-rose-400 font-semibold">{formatCurrency(diff)}</span>
                                                    )}
                                                </td>

                                                <td className="py-3 px-4 text-center">
                                                    {shift.status === 'open' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                                            AKTIF
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-700/60 text-slate-300">
                                                            DITUTUP
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="py-3 px-4 text-center">
                                                    {shift.approval_status === 'pending' ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                            MENUNGGU PERSETUJUAN
                                                        </span>
                                                    ) : shift.approval_status === 'approved' ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                            DISETUJUI
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-500 text-[10px]">
                                                            -
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {/* View Report */}
                                                        <button
                                                            onClick={() => handleViewReport(shift)}
                                                            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                                                            title="Lihat Z-Report / Ringkasan Shift"
                                                        >
                                                            <Receipt className="w-4 h-4 text-blue-400" />
                                                        </button>

                                                        {/* If open: Cash Movement */}
                                                        {shift.status === 'open' && (
                                                            <button
                                                                onClick={() => {
                                                                    setTargetShift(shift);
                                                                    setMovementAmount(0);
                                                                    setMovementModal(true);
                                                                }}
                                                                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                                                                title="Catat Kas In / Kas Out"
                                                            >
                                                                <DollarSign className="w-4 h-4 text-emerald-400" />
                                                            </button>
                                                        )}

                                                        {/* If open: Close Shift */}
                                                        {shift.status === 'open' && (
                                                            <button
                                                                onClick={() => {
                                                                    setTargetShift(shift);
                                                                    setActualCashInput(shift.opening_cash);
                                                                    setCloseModal(true);
                                                                }}
                                                                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                                                                title="Tutup Shift Kasir"
                                                            >
                                                                <Lock className="w-4 h-4 text-amber-400" />
                                                            </button>
                                                        )}

                                                        {/* If discrepancy pending: Supervisor Approve */}
                                                        {shift.status === 'closed' && shift.approval_status === 'pending' && (
                                                            <button
                                                                onClick={() => {
                                                                    setTargetShift(shift);
                                                                    setApproveModal(true);
                                                                }}
                                                                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                                                                title="Setujui Selisih Kas"
                                                            >
                                                                <ShieldCheck className="w-4 h-4 text-purple-400" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* MODAL 1: BUKA SHIFT BARU */}
                {openShiftModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className="w-full max-w-md bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-blue-400" />
                                    <h3 className="text-base font-bold text-white">Buka Shift Kasir Baru</h3>
                                </div>
                                <button
                                    onClick={() => setOpenShiftModal(false)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleOpenShiftSubmit} className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                                        Pilih Toko / Cabang
                                    </label>
                                    <select
                                        value={newShiftStoreId}
                                        onChange={(e) => {
                                            setNewShiftStoreId(e.target.value);
                                            const firstReg = registers.find(r => r.store_id === e.target.value);
                                            if (firstReg) setNewShiftRegisterId(firstReg.id);
                                        }}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        {stores.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.name} ({s.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                                        Pilih Register / Mesin Kasir
                                    </label>
                                    <select
                                        value={newShiftRegisterId}
                                        onChange={(e) => setNewShiftRegisterId(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    >
                                        {availableRegisters.map((r) => (
                                            <option key={r.id} value={r.id}>
                                                {r.name} ({r.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                                        Modal Kas Awal di Laci (IDR)
                                    </label>
                                    <input
                                        type="number"
                                        value={newShiftOpeningCash}
                                        onChange={(e) => setNewShiftOpeningCash(parseFloat(e.target.value) || 0)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        min="0"
                                        required
                                    />
                                    {/* Quick Amount Pills */}
                                    <div className="flex gap-2 mt-2">
                                        {[100000, 200000, 300000, 500000].map((amt) => (
                                            <button
                                                key={amt}
                                                type="button"
                                                onClick={() => setNewShiftOpeningCash(amt)}
                                                className="px-2.5 py-1 rounded bg-slate-700/60 hover:bg-slate-700 text-[11px] text-slate-200 font-mono transition-colors"
                                            >
                                                {amt / 1000}k
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                                        Catatan Pembukaan (Opsional)
                                    </label>
                                    <textarea
                                        value={newShiftNotes}
                                        onChange={(e) => setNewShiftNotes(e.target.value)}
                                        rows={2}
                                        placeholder="Misal: Uang kembalian pecahan 2rb, 5rb, 10rb lengkap."
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="pt-2 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setOpenShiftModal(false)}
                                        className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-slate-700/40 hover:bg-slate-700"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20"
                                    >
                                        Konfirmasi Buka Shift
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL 2: CASH IN / CASH OUT MOVEMENT */}
                {movementModal && targetShift && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className="w-full max-w-md bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-5 h-5 text-emerald-400" />
                                    <h3 className="text-base font-bold text-white">Mutasi Kas Laci (In / Out)</h3>
                                </div>
                                <button
                                    onClick={() => setMovementModal(false)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleMovementSubmit} className="space-y-4">
                                {/* Type toggle */}
                                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl border border-slate-700">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMovementType('cash_in');
                                            setMovementReason('Modal Tambahan');
                                        }}
                                        className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors ${
                                            movementType === 'cash_in'
                                                ? 'bg-emerald-600 text-white shadow'
                                                : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <ArrowDownLeft className="w-4 h-4" />
                                        <span>Kas Masuk (Cash In)</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setMovementType('cash_out');
                                            setMovementReason('Beli Operasional/Konsumsi');
                                        }}
                                        className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors ${
                                            movementType === 'cash_out'
                                                ? 'bg-rose-600 text-white shadow'
                                                : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <ArrowUpRight className="w-4 h-4" />
                                        <span>Kas Keluar (Cash Out)</span>
                                    </button>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                                        Nominal Uang (IDR)
                                    </label>
                                    <input
                                        type="number"
                                        value={movementAmount || ''}
                                        onChange={(e) => setMovementAmount(parseFloat(e.target.value) || 0)}
                                        placeholder="0"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        min="1"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                                        Alasan Mutasi
                                    </label>
                                    <select
                                        value={movementReason}
                                        onChange={(e) => setMovementReason(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {movementType === 'cash_in' ? (
                                            <>
                                                <option value="Modal Tambahan">Modal Kembalian Tambahan</option>
                                                <option value="Tukar Pecahan">Tukar Pecahan Uang</option>
                                                <option value="Koreksi Kas">Koreksi Kelebihan Kas</option>
                                                <option value="Lainnya">Lainnya</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="Beli Operasional/Konsumsi">Beli Konsumsi / Operasional Toko</option>
                                                <option value="Beli ATK/Perlengkapan">Beli ATK / Kertas Thermal</option>
                                                <option value="Setor Kas ke Brankas">Setor Kas Tengah Shift ke Brankas</option>
                                                <option value="Lainnya">Lainnya</option>
                                            </>
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                                        Keterangan Rinci (Opsional)
                                    </label>
                                    <textarea
                                        value={movementNotes}
                                        onChange={(e) => setMovementNotes(e.target.value)}
                                        rows={2}
                                        placeholder="Catatan tambahan untuk audit..."
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="pt-2 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setMovementModal(false)}
                                        className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-slate-700/40 hover:bg-slate-700"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-500/20"
                                    >
                                        Simpan Mutasi Kas
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL 3: TUTUP SHIFT KASIR */}
                {closeModal && targetShift && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className="w-full max-w-lg bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                                <div className="flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-amber-400" />
                                    <h3 className="text-base font-bold text-white">
                                        Tutup Shift: {targetShift.register?.name}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setCloseModal(false)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleCloseShiftSubmit} className="space-y-4">
                                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700/60 space-y-1.5 text-xs">
                                    <div className="flex justify-between text-slate-400">
                                        <span>Kas Awal Dibuka:</span>
                                        <span className="font-mono text-slate-200">{formatCurrency(targetShift.opening_cash)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-400">
                                        <span>Kasir Bertugas:</span>
                                        <span className="text-slate-200">{targetShift.cashier?.name}</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                                        Hitungan Uang Fisik Kasir di Laci (Actual Cash)
                                    </label>
                                    <input
                                        type="number"
                                        value={actualCashInput || ''}
                                        onChange={(e) => setActualCashInput(parseFloat(e.target.value) || 0)}
                                        placeholder="0"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-base text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        min="0"
                                        required
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Hitung seluruh uang kertas dan koin fisik yang ada di dalam cash drawer saat ini.
                                    </p>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                                        Catatan Penutupan Shift (Opsional)
                                    </label>
                                    <textarea
                                        value={closeNotes}
                                        onChange={(e) => setCloseNotes(e.target.value)}
                                        rows={2}
                                        placeholder="Penjelasan jika terdapat selisih atau catatan serah terima shift..."
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="pt-2 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCloseModal(false)}
                                        className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-slate-700/40 hover:bg-slate-700"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 shadow-md shadow-amber-500/20"
                                    >
                                        Finalisasi & Tutup Shift
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL 4: Z-REPORT / SHIFT SUMMARY */}
                {reportModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
                        <div className="w-full max-w-xl bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                                <div className="flex items-center gap-2">
                                    <Receipt className="w-5 h-5 text-blue-400" />
                                    <h3 className="text-base font-bold text-white">Laporan Kasir (Z-Report)</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => window.print()}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700 hover:bg-slate-600 text-white transition-colors"
                                    >
                                        <Printer className="w-3.5 h-3.5" />
                                        <span>Cetak Slip</span>
                                    </button>
                                    <button
                                        onClick={() => setReportModal(false)}
                                        className="text-slate-400 hover:text-white"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {loadingReport ? (
                                <div className="py-12 text-center text-slate-400">
                                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
                                    <p className="text-xs">Memuat data Z-Report...</p>
                                </div>
                            ) : shiftReportData ? (
                                <div className="space-y-4 text-xs font-mono bg-slate-900 p-5 rounded-xl border border-slate-700/60 print:bg-white print:text-black print:border-none">
                                    {/* Receipt Header */}
                                    <div className="text-center border-b border-dashed border-slate-700 pb-3">
                                        <h4 className="text-sm font-bold text-white tracking-wider uppercase">
                                            {shiftReportData.shift.store_name}
                                        </h4>
                                        <p className="text-[11px] text-slate-400">
                                            LAPORAN PENUTUPAN KASIR (Z-REPORT)
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            Register: {shiftReportData.shift.register_name} ({shiftReportData.shift.register_code})
                                        </p>
                                        <p className="text-[10px] text-slate-500">
                                            Kasir: {shiftReportData.shift.cashier_name}
                                        </p>
                                        <p className="text-[10px] text-slate-500">
                                            Waktu: {shiftReportData.shift.opened_at} s/d {shiftReportData.shift.closed_at || 'Sekarang'}
                                        </p>
                                    </div>

                                    {/* Physical Cash Movements */}
                                    <div className="space-y-1.5 border-b border-dashed border-slate-700 pb-3">
                                        <div className="font-bold text-slate-300 uppercase text-[10px]">
                                            1. Rekapitulasi Kas Laci (Physical Cash)
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">(+) Kas Awal Modal:</span>
                                            <span className="text-slate-200">{formatCurrency(shiftReportData.financials.opening_cash)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">(+) Penjualan Tunai:</span>
                                            <span className="text-emerald-400 font-semibold">{formatCurrency(shiftReportData.financials.cash_sales)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">(+) Kas Masuk (Cash In):</span>
                                            <span className="text-slate-200">{formatCurrency(shiftReportData.financials.cash_in)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">(-) Kas Keluar (Cash Out):</span>
                                            <span className="text-rose-400">-{formatCurrency(shiftReportData.financials.cash_out)}</span>
                                        </div>
                                        <div className="flex justify-between pt-1 border-t border-slate-800 font-bold text-white">
                                            <span>(=) Total Kas Diharapkan:</span>
                                            <span className="text-blue-400">{formatCurrency(shiftReportData.financials.expected_cash)}</span>
                                        </div>
                                    </div>

                                    {/* Non-Cash Sales Breakdown */}
                                    <div className="space-y-1.5 border-b border-dashed border-slate-700 pb-3">
                                        <div className="font-bold text-slate-300 uppercase text-[10px]">
                                            2. Penjualan Non-Tunai (Digital & EDC)
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">QRIS:</span>
                                            <span className="text-slate-200">{formatCurrency(shiftReportData.financials.non_cash_sales.qris)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Kartu Debit:</span>
                                            <span className="text-slate-200">{formatCurrency(shiftReportData.financials.non_cash_sales.debit)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Kartu Kredit:</span>
                                            <span className="text-slate-200">{formatCurrency(shiftReportData.financials.non_cash_sales.credit)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Transfer Bank:</span>
                                            <span className="text-slate-200">{formatCurrency(shiftReportData.financials.non_cash_sales.transfer)}</span>
                                        </div>
                                        <div className="flex justify-between pt-1 border-t border-slate-800 font-bold text-white">
                                            <span>(=) Total Non-Tunai:</span>
                                            <span className="text-purple-400">{formatCurrency(shiftReportData.financials.total_non_cash_sales)}</span>
                                        </div>
                                        <div className="flex justify-between pt-1 font-bold text-white">
                                            <span>Grand Total Penjualan:</span>
                                            <span className="text-emerald-400">{formatCurrency(shiftReportData.financials.total_sales)}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-400 text-[11px]">
                                            <span>Total Transaksi Selesai:</span>
                                            <span>{shiftReportData.financials.order_count} Struk</span>
                                        </div>
                                    </div>

                                    {/* Reconciliation & Variance */}
                                    <div className="space-y-1.5 border-b border-dashed border-slate-700 pb-3">
                                        <div className="font-bold text-slate-300 uppercase text-[10px]">
                                            3. Hasil Rekonsiliasi Kas Fisik
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Uang Fisik Dihitung:</span>
                                            <span className="text-white font-bold">{formatCurrency(shiftReportData.shift.actual_cash)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Kas Diharapkan Sistem:</span>
                                            <span className="text-slate-200">{formatCurrency(shiftReportData.shift.expected_cash)}</span>
                                        </div>
                                        <div className="flex justify-between pt-1 font-bold text-sm">
                                            <span>Selisih (Variance):</span>
                                            {shiftReportData.shift.cash_difference === null ? (
                                                <span className="text-slate-500">-</span>
                                            ) : shiftReportData.shift.cash_difference === 0 ? (
                                                <span className="text-emerald-400">Rp 0 (Cocok)</span>
                                            ) : shiftReportData.shift.cash_difference > 0 ? (
                                                <span className="text-blue-400">+{formatCurrency(shiftReportData.shift.cash_difference)} (Lebih)</span>
                                            ) : (
                                                <span className="text-rose-400">{formatCurrency(shiftReportData.shift.cash_difference)} (Kurang)</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Notes and Supervisor Approval */}
                                    <div className="space-y-1 text-[11px] text-slate-400">
                                        <p>Status Approval: <span className="font-semibold text-slate-200 uppercase">{shiftReportData.shift.approval_status}</span></p>
                                        {shiftReportData.shift.supervisor_name && (
                                            <p>Disetujui Oleh: <span className="text-slate-200">{shiftReportData.shift.supervisor_name}</span></p>
                                        )}
                                        {shiftReportData.shift.notes && (
                                            <p className="mt-1 italic text-slate-500">Catatan: {shiftReportData.shift.notes}</p>
                                        )}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                )}

                {/* MODAL 5: APPROVE DISCREPANCY */}
                {approveModal && targetShift && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className="w-full max-w-md bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="w-5 h-5 text-purple-400" />
                                    <h3 className="text-base font-bold text-white">Approval Selisih Kas</h3>
                                </div>
                                <button
                                    onClick={() => setApproveModal(false)}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleApproveSubmit} className="space-y-4">
                                <div className="p-3 bg-slate-900 rounded-xl border border-slate-700/60 space-y-1 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Kasir:</span>
                                        <span className="text-white font-medium">{targetShift.cashier?.name}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Selisih Kas Fisik:</span>
                                        <span className={`font-mono font-bold ${(targetShift.cash_difference ?? 0) < 0 ? 'text-rose-400' : 'text-blue-400'}`}>
                                            {formatCurrency(targetShift.cash_difference)}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                                        Catatan Persetujuan Supervisor (Opsional)
                                    </label>
                                    <textarea
                                        value={approvalNotes}
                                        onChange={(e) => setApprovalNotes(e.target.value)}
                                        rows={3}
                                        placeholder="Misal: Selisih Rp 5.000 disebabkan kesalahan pecahan receh kembalian, telah diverifikasi."
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>

                                <div className="pt-2 flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setApproveModal(false)}
                                        className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-slate-700/40 hover:bg-slate-700"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 shadow-md shadow-purple-500/20"
                                    >
                                        Setujui Selisih Kas
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

