import React, { useState, PropsWithChildren } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import {
    LayoutDashboard,
    ShoppingBag,
    Store as StoreIcon,
    Package,
    Warehouse,
    Users,
    BarChart3,
    LogOut,
    ChevronDown,
    Menu,
    X,
    Building2,
    ShieldCheck,
    Truck,
    ArrowLeftRight,
    ClipboardList
} from 'lucide-react';
import { PageProps } from '@/types';

export default function AuthenticatedLayout({ children }: PropsWithChildren) {
    const { auth, flash } = usePage<PageProps>().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleStoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const storeId = e.target.value;
        if (storeId && storeId !== auth.activeStore?.id) {
            router.post('/stores/switch', { store_id: storeId }, {
                preserveScroll: true,
            });
        }
    };

    const handleLogout = () => {
        router.post('/logout');
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex">
            {/* Mobile backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-800 border-r border-slate-700/70 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {/* Brand */}
                <div className="h-16 flex items-center justify-between px-6 border-b border-slate-700/70">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                            <StoreIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <span className="font-bold text-white text-base tracking-tight leading-tight block">
                                SaaS POS
                            </span>
                            <span className="text-[10px] text-blue-400 font-medium uppercase tracking-wider block">
                                Enterprise
                            </span>
                        </div>
                    </div>
                    <button
                        className="lg:hidden text-slate-400 hover:text-white"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tenant Info Card */}
                {auth.tenant && (
                    <div className="p-4 mx-3 my-3 rounded-xl bg-slate-900/60 border border-slate-700/50">
                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                            <Building2 className="w-3.5 h-3.5 text-blue-400" />
                            <span>Organisasi Tenant</span>
                        </div>
                        <div className="text-sm font-semibold text-white truncate">
                            {auth.tenant.name}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {auth.tenant.status.toUpperCase()}
                            </span>
                            <span className="text-[11px] text-slate-400">
                                {auth.tenant.currency}
                            </span>
                        </div>
                    </div>
                )}

                {/* Nav Links */}
                <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-slate-700/60 hover:text-white transition-colors"
                    >
                        <LayoutDashboard className="w-4 h-4 text-blue-400" />
                        <span>Dashboard</span>
                    </Link>

                    <div className="pt-4 pb-1 px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Operasional Kasir
                    </div>

                    <Link
                        href="/pos"
                        className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <ShoppingBag className="w-4 h-4 text-white" />
                            <span>POS Terminal</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-700/60 text-blue-100 font-mono">
                            F4
                        </span>
                    </Link>

                    <div className="pt-4 pb-1 px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Master Data & CRM
                    </div>

                    <Link
                        href="/products"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-700/60 hover:text-white transition-colors"
                    >
                        <Package className="w-4 h-4 text-blue-400" />
                        <span>Katalog Produk</span>
                    </Link>

                    <Link
                        href="/customers"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-700/60 hover:text-white transition-colors"
                    >
                        <Users className="w-4 h-4 text-emerald-400" />
                        <span>Pelanggan & CRM</span>
                    </Link>

                    <Link
                        href="/suppliers"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-700/60 hover:text-white transition-colors"
                    >
                        <Truck className="w-4 h-4 text-purple-400" />
                        <span>Mitra Supplier</span>
                    </Link>

                    <div className="pt-4 pb-1 px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Inventaris & Pengadaan
                    </div>

                    <Link
                        href="/inventory"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-700/60 hover:text-white transition-colors"
                    >
                        <Warehouse className="w-4 h-4 text-amber-400" />
                        <span>Stok & Mutasi Gudang</span>
                    </Link>

                    <Link
                        href="/stock-transfers"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-700/60 hover:text-white transition-colors"
                    >
                        <ArrowLeftRight className="w-4 h-4 text-cyan-400" />
                        <span>Transfer Antar Cabang</span>
                    </Link>

                    <Link
                        href="/purchase-orders"
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-700/60 hover:text-white transition-colors"
                    >
                        <ClipboardList className="w-4 h-4 text-emerald-400" />
                        <span>Purchase Order & Masuk</span>
                    </Link>

                    <div className="pt-4 pb-1 px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Laporan & Analitik
                    </div>

                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 cursor-not-allowed">
                        <BarChart3 className="w-4 h-4 text-slate-500" />
                        <span>Laporan Penjualan (Phase 7)</span>
                    </div>

                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 cursor-not-allowed">
                        <Users className="w-4 h-4 text-slate-500" />
                        <span>Karyawan & Akses</span>
                    </div>
                </nav>

                {/* User footer */}
                <div className="p-4 border-t border-slate-700/70">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
                                {auth.user?.name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-semibold text-white truncate">
                                    {auth.user?.name}
                                </p>
                                <p className="text-[11px] text-slate-400 truncate">
                                    {auth.user?.roles?.[0] || 'User'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            title="Logout"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700/50 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Topbar */}
                <header className="h-16 bg-slate-800/80 backdrop-blur-md border-b border-slate-700/70 px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            className="lg:hidden text-slate-400 hover:text-white"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu className="w-6 h-6" />
                        </button>

                        {/* Store Switcher */}
                        {auth.availableStores && auth.availableStores.length > 0 && (
                            <div className="flex items-center gap-2 bg-slate-900/60 border border-slate-700/70 px-3 py-1.5 rounded-xl">
                                <StoreIcon className="w-4 h-4 text-blue-400" />
                                <span className="text-xs text-slate-400 hidden sm:inline">Toko Aktif:</span>
                                <select
                                    value={auth.activeStore?.id || ''}
                                    onChange={handleStoreChange}
                                    className="bg-transparent text-xs font-medium text-white focus:outline-none cursor-pointer pr-4"
                                >
                                    {auth.availableStores.map((store) => (
                                        <option key={store.id} value={store.id} className="bg-slate-800 text-white">
                                            {store.code} - {store.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {auth.user?.isSuperAdmin && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Super Admin
                            </span>
                        )}
                    </div>
                </header>

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-400 px-6 py-2.5 text-xs font-medium">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="bg-rose-500/10 border-b border-rose-500/20 text-rose-400 px-6 py-2.5 text-xs font-medium">
                        {flash.error}
                    </div>
                )}

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}

