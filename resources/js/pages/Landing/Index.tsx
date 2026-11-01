import React, { useState, useEffect } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    Store,
    ShoppingBag,
    Printer,
    Users,
    ShieldCheck,
    ArrowRight,
    ChevronRight,
    ChevronLeft,
    Sparkles,
    Clock,
    CreditCard,
    Package,
    Barcode,
    Warehouse,
    Zap,
    Check,
    CheckCircle2,
    HelpCircle,
    Phone,
    Mail,
    Sliders,
    Star,
    ArrowLeftRight,
    DollarSign,
    LogIn,
    UserPlus,
    LayoutDashboard,
    Scissors,
    Shield,
    Menu,
    X,
    ExternalLink,
    Globe,
} from 'lucide-react';
import { PageProps } from '@/types';

interface PlanItem {
    id: string;
    name: string;
    slug: string;
    description: string;
    price_monthly: number;
    price_annual: number;
    max_stores: number;
    max_registers: number;
    max_users: number;
    features: string[];
}

interface Props {
    plans: PlanItem[];
}

export default function LandingIndex({ plans }: Props) {
    const { auth } = usePage<PageProps>().props;
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

    // Banner Slider State
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isHovered, setIsHovered] = useState(false);

    // Interactive Demo State
    const [demoCart, setDemoCart] = useState<Array<{ name: string; price: number; qty: number }>>([
        { name: 'Kopi Espresso Blend', price: 22000, qty: 2 },
        { name: 'Roti Bakar Keju Coklat', price: 18000, qty: 1 },
    ]);
    const [demoPaid, setDemoPaid] = useState(false);

    const slides = [
        {
            tag: '⚡ KASIR KILAT & SPLIT PAYMENT',
            title: 'Terminal Kasir Tercepat: Transaksi Selesai dalam Hitungan Detik',
            description:
                'Antarmuka khusus kasir tanpa hambatan. Akses instan dengan tombol shortcut keyboard F4, pemindaian barcode responsif, dan pembayaran multi-metode (QRIS, Kartu Debit/Kredit, Tunai) tanpa antrean panjang.',
            badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            accentColor: 'from-emerald-500 to-teal-600',
            bgGlow: 'from-emerald-600/20 via-teal-600/10 to-transparent',
            ctaPrimary: 'Coba Terminal POS',
            ctaLink: auth.user ? '/pos' : '/register',
            metrics: [
                { label: 'Waktu Checkout', value: '< 1 Detik' },
                { label: 'Dukungan Pembayaran', value: 'Multi-Metode' },
                { label: 'Navigasi Cepat', value: 'Shortcut F4' },
            ],
        },
        {
            tag: '🏬 MULTI-CABANG & INVENTARIS',
            title: 'Kendali Penuh Seluruh Cabang Toko & Gudang Secara Real-Time',
            description:
                'Pantau pergerakan stok dari satu dashboard pusat. Dilengkapi transfer stok antar cabang toko, pencatatan pesanan pembelian (Purchase Order), dan stok opname fisik akurat dengan kartu stok ganda.',
            badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            accentColor: 'from-blue-500 to-indigo-600',
            bgGlow: 'from-blue-600/20 via-indigo-600/10 to-transparent',
            ctaPrimary: 'Kelola Multi-Cabang',
            ctaLink: auth.user ? '/dashboard' : '/register',
            metrics: [
                { label: 'Sinkronisasi Stok', value: 'Otomatis' },
                { label: 'Audit Trail', value: '100% Tercatat' },
                { label: 'Transfer Cabang', value: 'Sekali Klik' },
            ],
        },
        {
            tag: '🔒 REKONSILIASI KAS & SHIFT',
            title: 'Keuangan Kasir Terkunci Rapi dengan Audit Trail & Z-Report',
            description:
                'Cegah kebocoran dana operasional meja kasir. Wajibkan pencatatan modal awal kasir, pantau arus kas masuk dan keluar, serta cetak laporan tutup shift (Z-Report) otomatis dengan otorisasi Supervisor (SPV).',
            badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            accentColor: 'from-amber-500 to-orange-600',
            bgGlow: 'from-amber-600/20 via-orange-600/10 to-transparent',
            ctaPrimary: 'Lihat Kontrol Shift',
            ctaLink: auth.user ? '/shifts' : '/register',
            metrics: [
                { label: 'Selisih Kasir', value: 'Terdeteksi' },
                { label: 'Laporan Tutup', value: 'Auto Z-Report' },
                { label: 'Otorisasi', value: 'Tingkat SPV' },
            ],
        },
        {
            tag: '🖨️ HARDWARE MESIN KASIR',
            title: 'Kompatibel dengan Printer Thermal 58/80mm & Laci Uang Kasir',
            description:
                'Integrasi perangkat keras tanpa repot. Dukung printer thermal ukuran 58mm dan 80mm via Web Print, Bluetooth, atau LAN IP Socket, sinyal buka laci kasir otomatis (drawer kick), dan cetak barcode faktur.',
            badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
            accentColor: 'from-cyan-500 to-blue-600',
            bgGlow: 'from-cyan-600/20 via-blue-600/10 to-transparent',
            ctaPrimary: 'Format Struk Kustom',
            ctaLink: auth.user ? '/settings/registers' : '/register',
            metrics: [
                { label: 'Ukuran Kertas', value: '58mm / 80mm' },
                { label: 'Laci Uang Kasir', value: 'Auto Drawer Kick' },
                { label: 'Pemotong Kertas', value: 'Auto-Cut' },
            ],
        },
        {
            tag: '🌐 TEKNOLOGI CLOUD PHOEBEHUB.COM',
            title: 'Didukung Ekosistem Cloud Handal & Aman dari PhoebeHub',
            description:
                'Dibangun di atas arsitektur cloud teruji phoebehub.com. Menjamin kecepatan akses tinggi, perlindungan data berstandar enterprise, isolasi multi-tenant yang ketat, dan skalabilitas bisnis tanpa batas.',
            badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            accentColor: 'from-purple-500 to-indigo-600',
            bgGlow: 'from-purple-600/20 via-indigo-600/10 to-transparent',
            ctaPrimary: 'Jelajahi phoebehub.com',
            ctaLink: 'https://phoebehub.com',
            metrics: [
                { label: 'Ecosystem Provider', value: 'phoebehub.com' },
                { label: 'Cloud Uptime', value: '99.9%' },
                { label: 'Keamanan Data', value: 'Tingkat Enkripsi Bank' },
            ],
        },
    ];

    // Auto-advance banner slider
    useEffect(() => {
        if (isHovered) return;
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [isHovered, slides.length]);

    const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length);
    const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(val);
    };

    const demoTotal = demoCart.reduce((sum, i) => sum + i.price * i.qty, 0);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
            <Head title="PhoebeHub POS - Sistem Kasir Pintar & Manajemen Ritel dari phoebehub.com" />

            {/* PhoebeHub Ecosystem Top Ribbon */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-purple-700 py-1.5 px-4 text-center text-xs font-medium text-white flex items-center justify-center gap-2">
                <span>🚀 Produk Resmi dari Ekosistem Digital <strong>PhoebeHub</strong></span>
                <span className="text-blue-200 hidden sm:inline">•</span>
                <a
                    href="https://phoebehub.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold underline hover:text-blue-200 transition-colors"
                >
                    <span>Kunjungi phoebehub.com</span>
                    <ArrowRight className="w-3 h-3" />
                </a>
            </div>

            {/* Navigation Header */}
            <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    {/* Brand Logo */}
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
                            <Store className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <span className="font-extrabold text-white text-base tracking-tight leading-tight block">
                                PhoebeHub POS
                            </span>
                            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider block">
                                by phoebehub.com
                            </span>
                        </div>
                    </Link>

                    {/* Desktop Navigation Links */}
                    <nav className="hidden lg:flex items-center gap-8 text-xs font-semibold text-slate-300">
                        <a href="#fitur" className="hover:text-blue-400 transition-colors">
                            Fitur Kasir & Ritel
                        </a>
                        <a href="#demo" className="hover:text-blue-400 transition-colors">
                            Simulasi POS
                        </a>
                        <a href="#hardware" className="hover:text-blue-400 transition-colors">
                            Mesin Kasir & Struk
                        </a>
                        <a href="#harga" className="hover:text-blue-400 transition-colors">
                            Paket Harga
                        </a>
                        <a href="#faq" className="hover:text-blue-400 transition-colors">
                            Bantuan FAQ
                        </a>
                    </nav>

                    {/* Action Buttons (Login / Register / Dashboard) */}
                    <div className="hidden sm:flex items-center gap-3">
                        {auth.user ? (
                            <div className="flex items-center gap-2">
                                <Link
                                    href="/pos"
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition-all"
                                >
                                    <ShoppingBag className="w-3.5 h-3.5" />
                                    <span>Buka POS Kasir (F4)</span>
                                </Link>
                                <Link
                                    href="/dashboard"
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
                                >
                                    <LayoutDashboard className="w-3.5 h-3.5 text-blue-400" />
                                    <span>Dashboard</span>
                                </Link>
                            </div>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors flex items-center gap-1.5"
                                >
                                    <LogIn className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Masuk Kasir</span>
                                </Link>
                                <Link
                                    href="/register"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/25 flex items-center gap-1.5 transition-all active:scale-95"
                                >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    <span>Coba Gratis 14 Hari</span>
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Hamburger Toggle */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="sm:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>

                {/* Mobile Dropdown Menu */}
                {mobileMenuOpen && (
                    <div className="sm:hidden px-4 pt-2 pb-4 bg-slate-900 border-b border-slate-800 space-y-2 text-xs font-semibold text-slate-300">
                        <a
                            href="#fitur"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block py-2 hover:text-white"
                        >
                            Fitur Kasir & Ritel
                        </a>
                        <a
                            href="#demo"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block py-2 hover:text-white"
                        >
                            Simulasi POS
                        </a>
                        <a
                            href="#hardware"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block py-2 hover:text-white"
                        >
                            Mesin Kasir & Struk
                        </a>
                        <a
                            href="#harga"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block py-2 hover:text-white"
                        >
                            Paket Harga
                        </a>
                        <a
                            href="#faq"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block py-2 hover:text-white"
                        >
                            Bantuan FAQ
                        </a>

                        <div className="pt-3 border-t border-slate-800 space-y-2">
                            {auth.user ? (
                                <>
                                    <Link
                                        href="/pos"
                                        className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-center block font-bold"
                                    >
                                        Buka POS Terminal
                                    </Link>
                                    <Link
                                        href="/dashboard"
                                        className="w-full py-2.5 bg-slate-800 text-slate-200 rounded-xl text-center block font-semibold"
                                    >
                                        Masuk Dashboard
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href="/login"
                                        className="w-full py-2.5 bg-slate-800 text-white rounded-xl text-center block font-semibold"
                                    >
                                        Masuk Akun Kasir
                                    </Link>
                                    <Link
                                        href="/register"
                                        className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-center block font-bold"
                                    >
                                        Daftar Uji Coba Gratis
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </header>

            {/* HERO SECTION: Content Banner Slider */}
            <section
                className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Glow Background */}
                <div
                    className={`absolute inset-0 bg-gradient-to-b ${slides[currentSlide].bgGlow} transition-all duration-700 pointer-events-none`}
                />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    {/* Slider Container */}
                    <div className="relative min-h-[420px] sm:min-h-[380px] lg:min-h-[340px] flex flex-col justify-center">
                        <div className="max-w-3xl space-y-5">
                            {/* Slide Tag Badge */}
                            <span
                                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border tracking-wider uppercase transition-all duration-300 ${slides[currentSlide].badgeColor}`}
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>{slides[currentSlide].tag}</span>
                            </span>

                            {/* Slide Headline */}
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-[1.15] transition-all duration-300">
                                {slides[currentSlide].title}
                            </h1>

                            {/* Slide Description */}
                            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl transition-all duration-300">
                                {slides[currentSlide].description}
                            </p>

                            {/* Metrics Strip */}
                            <div className="grid grid-cols-3 gap-4 pt-2 pb-1 border-t border-slate-800/80 max-w-lg">
                                {slides[currentSlide].metrics.map((m, idx) => (
                                    <div key={idx} className="space-y-0.5">
                                        <div className="text-[11px] text-slate-400 font-medium">{m.label}</div>
                                        <div className="text-xs sm:text-sm font-bold text-white font-mono">{m.value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* CTA Action Buttons */}
                            <div className="flex flex-wrap items-center gap-3 pt-2">
                                {slides[currentSlide].ctaLink.startsWith('http') ? (
                                    <a
                                        href={slides[currentSlide].ctaLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all active:scale-95"
                                    >
                                        <span>{slides[currentSlide].ctaPrimary}</span>
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                ) : (
                                    <Link
                                        href={slides[currentSlide].ctaLink}
                                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all active:scale-95"
                                    >
                                        <span>{slides[currentSlide].ctaPrimary}</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                )}
                                <a
                                    href="#demo"
                                    className="px-5 py-3 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs sm:text-sm font-semibold rounded-xl border border-slate-700/80 flex items-center gap-2 transition-colors"
                                >
                                    <span>Simulasi POS Langsung</span>
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                </a>
                            </div>
                        </div>

                        {/* Slider Controls (Next/Prev Arrows) */}
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-2">
                            <button
                                onClick={prevSlide}
                                className="w-10 h-10 rounded-full bg-slate-900/80 border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-all shadow-md"
                                title="Slide Sebelumnya"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={nextSlide}
                                className="w-10 h-10 rounded-full bg-slate-900/80 border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-all shadow-md"
                                title="Slide Berikutnya"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Slide Indicators (Pills) */}
                    <div className="flex items-center gap-2 pt-8">
                        {slides.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentSlide(idx)}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                    currentSlide === idx ? 'w-10 bg-blue-500' : 'w-2.5 bg-slate-700 hover:bg-slate-600'
                                }`}
                                title={`Pindah ke Slide ${idx + 1}`}
                            />
                        ))}
                    </div>
                </div>

                {/* Quick Stats Bar */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 sm:p-6 bg-slate-900/80 border border-slate-800/80 rounded-2xl shadow-xl">
                        <div className="text-center sm:border-r border-slate-800/80 p-2">
                            <div className="text-2xl sm:text-3xl font-black text-white font-mono">99.9%</div>
                            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                                Ketersediaan Sistem
                            </div>
                        </div>
                        <div className="text-center sm:border-r border-slate-800/80 p-2">
                            <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">&lt; 1 Detik</div>
                            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                                Kecepatan Transaksi
                            </div>
                        </div>
                        <div className="text-center sm:border-r border-slate-800/80 p-2">
                            <div className="text-2xl sm:text-3xl font-black text-blue-400 font-mono">100+</div>
                            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                                Cabang Terkoneksi
                            </div>
                        </div>
                        <div className="text-center p-2">
                            <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">0%</div>
                            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                                Selisih Kasir Terlewat
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION: INTERACTIVE DEMO SIMULATOR */}
            <section id="demo" className="py-16 bg-slate-900/50 border-t border-b border-slate-800/80">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
                    <div className="text-center max-w-2xl mx-auto space-y-2">
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                            Simulasi Interaktif Meja Kasir
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                            Rasakan Langsung Kecepatan Transaksi POS
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-400">
                            Coba klik tombol tambah item di bawah untuk melihat kalkulasi otomatis, rincian PPN, dan simulasi struk belanja secara langsung.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* Left: Interactive Mini POS Screen */}
                        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                <div className="flex items-center gap-2 text-xs font-bold text-white">
                                    <ShoppingBag className="w-4 h-4 text-emerald-400" />
                                    <span>Terminal Kasir Utama (Register 01)</span>
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    Shift Aktif
                                </span>
                            </div>

                            {/* Catalog Quick Buttons */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Klik Item untuk Menambahkan ke Keranjang:
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {[
                                        { name: 'Kopi Espresso Blend', price: 22000, sku: 'KOP-01' },
                                        { name: 'Roti Bakar Keju Coklat', price: 18000, sku: 'ROT-02' },
                                        { name: 'Teh Melati Organik', price: 12000, sku: 'TEH-03' },
                                        { name: 'Air Mineral 600ml', price: 6000, sku: 'AIR-04' },
                                        { name: 'Croissant Butter', price: 25000, sku: 'CRS-05' },
                                        { name: 'Keripik Singkong Gurih', price: 15000, sku: 'KRP-06' },
                                    ].map((prod) => (
                                        <button
                                            key={prod.sku}
                                            onClick={() => {
                                                setDemoPaid(false);
                                                const existing = demoCart.find((i) => i.name === prod.name);
                                                if (existing) {
                                                    setDemoCart(
                                                        demoCart.map((i) =>
                                                            i.name === prod.name ? { ...i, qty: i.qty + 1 } : i
                                                        )
                                                    );
                                                } else {
                                                    setDemoCart([...demoCart, { name: prod.name, price: prod.price, qty: 1 }]);
                                                }
                                            }}
                                            className="p-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 hover:border-emerald-500/50 rounded-xl text-left transition-all group"
                                        >
                                            <div className="text-xs font-semibold text-white group-hover:text-emerald-300 truncate">
                                                {prod.name}
                                            </div>
                                            <div className="text-[11px] font-mono font-bold text-emerald-400 mt-0.5">
                                                {formatCurrency(prod.price)}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Current Cart Table */}
                            <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 space-y-2">
                                <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase pb-2 border-b border-slate-800">
                                    <span>Item</span>
                                    <span>Kuantitas / Subtotal</span>
                                </div>
                                {demoCart.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs py-1">
                                        <div>
                                            <div className="font-semibold text-white">{item.name}</div>
                                            <div className="text-[10px] text-slate-400">
                                                {item.qty} × {formatCurrency(item.price)}
                                            </div>
                                        </div>
                                        <div className="font-mono font-bold text-white">
                                            {formatCurrency(item.qty * item.price)}
                                        </div>
                                    </div>
                                ))}

                                <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-300">TOTAL BELANJA:</span>
                                    <span className="text-base font-black text-emerald-400 font-mono">
                                        {formatCurrency(demoTotal)}
                                    </span>
                                </div>
                            </div>

                            {/* Payment Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setDemoPaid(true)}
                                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Simulasi Pembayaran Selesai (Bayar Tunai)</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setDemoCart([
                                            { name: 'Kopi Espresso Blend', price: 22000, qty: 1 },
                                        ]);
                                        setDemoPaid(false);
                                    }}
                                    className="px-3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>

                        {/* Right: Live Generated Thermal Receipt */}
                        <div className="lg:col-span-5 space-y-3">
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                                <span>Hasil Cetak Struk Otomatis</span>
                                <span className="font-mono px-2 py-0.5 rounded bg-slate-800 text-[10px]">Thermal 80mm</span>
                            </div>

                            <div className="bg-white text-slate-900 font-mono text-xs p-5 rounded-2xl shadow-2xl border-t-8 border-b-8 border-dashed border-slate-300 space-y-2 select-text">
                                <div className="text-center pb-2 border-b border-dashed border-slate-400">
                                    <div className="font-black text-sm tracking-tight uppercase">TOKO RETAIL UTAMA</div>
                                    <div className="text-[10px] text-slate-600">Jl. Jenderal Sudirman No. 88, Jakarta</div>
                                    <div className="text-[10px] text-slate-700 italic font-medium pt-0.5">
                                        Senyum, Sapa, Melayani
                                    </div>
                                    <div className="text-[10px] text-slate-600 font-bold">INV-DEMO-20261101</div>
                                </div>

                                <div className="text-[10px] space-y-0.5 text-slate-700">
                                    <div className="flex justify-between">
                                        <span>Waktu:</span>
                                        <span>{new Date().toLocaleTimeString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Kasir:</span>
                                        <span>Siti Kasir (POS-01)</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Pelanggan:</span>
                                        <span>Pelanggan Walk-In</span>
                                    </div>
                                </div>

                                <div className="py-2 border-t border-b border-dashed border-slate-400 space-y-1">
                                    {demoCart.map((i, idx) => (
                                        <div key={idx} className="space-y-0.5">
                                            <div className="font-bold">{i.name}</div>
                                            <div className="flex justify-between text-[10px] text-slate-600">
                                                <span>{i.qty} × {formatCurrency(i.price)}</span>
                                                <span className="font-bold text-slate-900">{formatCurrency(i.qty * i.price)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="py-1 space-y-0.5 text-[11px]">
                                    <div className="flex justify-between font-bold text-xs pt-1 border-t border-slate-800">
                                        <span>TOTAL:</span>
                                        <span>{formatCurrency(demoTotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-600 text-[10px]">
                                        <span>Status:</span>
                                        <span className="font-bold text-emerald-700">
                                            {demoPaid ? 'LUNAS (TUNAI)' : 'MENUNGGU PEMBAYARAN'}
                                        </span>
                                    </div>
                                </div>

                                <div className="text-center pt-2 text-[9px] text-slate-600 border-t border-dashed border-slate-400 leading-tight">
                                    Barang yang sudah dibeli dapat ditukar maksimal 2x24 jam dengan membawa struk asli. Terima kasih!
                                </div>

                                <div className="text-center pt-1 border-t border-dashed border-slate-300">
                                    <div className="inline-block tracking-[0.25em] font-mono font-bold text-xs">
                                        ||| | || |||| | ||
                                    </div>
                                    <div className="text-[9px] text-slate-500 font-mono">INV-DEMO-20261101</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION: 6 FITUR UNGGULAN */}
            <section id="fitur" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
                <div className="text-center max-w-3xl mx-auto space-y-3">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                        Fitur Lengkap Ritel Modern
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                        Dirancang untuk Menjawab Kebutuhan Operasional Nyata
                    </h2>
                    <p className="text-sm text-slate-400">
                        Dari meja kasir depan hingga rantai pasok gudang belakang, seluruh modul saling terhubung secara otomatis tanpa perlu pencatatan ganda.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Feature 1 */}
                    <div className="bg-slate-900 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-6 transition-all duration-200 group">
                        <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Zap className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-white mb-2">Terminal Kasir Secepat Kilat</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Dilengkapi shortcut tombol keyboard (F4 untuk kasir), pemindaian barcode instan, custom harga/diskon per baris, dan penahanan transaksi (Hold & Resume).
                        </p>
                    </div>

                    {/* Feature 2 */}
                    <div className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-6 transition-all duration-200 group">
                        <div className="w-12 h-12 rounded-xl bg-emerald-600/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-white mb-2">Bagi Pembayaran (Split Payment)</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Terima pembayaran multi-metode sekaligus dalam 1 transaksi: gabungkan Tunai, Kartu Debit, Kartu Kredit, Transfer Bank, dan QRIS secara akurat.
                        </p>
                    </div>

                    {/* Feature 3 */}
                    <div className="bg-slate-900 border border-slate-800 hover:border-purple-500/40 rounded-2xl p-6 transition-all duration-200 group">
                        <div className="w-12 h-12 rounded-xl bg-purple-600/10 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Users className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-white mb-2">Manajemen Staf Multi-Level</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Hak akses berjenjang mulai dari Kasir, Supervisor (SPV), Staf Gudang, Manajer Cabang, hingga Owner dengan penugasan toko independen.
                        </p>
                    </div>

                    {/* Feature 4 */}
                    <div className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-6 transition-all duration-200 group">
                        <div className="w-12 h-12 rounded-xl bg-amber-600/10 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Clock className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-white mb-2">Shift Kasir & Z-Report Otomatis</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Hitung fisik uang kasir saat penutupan shift. Selisih kas terdeteksi otomatis dan wajib disetujui Supervisor sebelum cetak laporan Z-Report.
                        </p>
                    </div>

                    {/* Feature 5 */}
                    <div className="bg-slate-900 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-6 transition-all duration-200 group">
                        <div className="w-12 h-12 rounded-xl bg-cyan-600/10 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Warehouse className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-white mb-2">Stok Gudang & Transfer Cabang</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Kirim barang antar cabang dengan status kirim (dispatch) dan terima (receive). Lengkap dengan pesanan pengadaan PO dan penyesuaian stok opname.
                        </p>
                    </div>

                    {/* Feature 6 */}
                    <div className="bg-slate-900 border border-slate-800 hover:border-rose-500/40 rounded-2xl p-6 transition-all duration-200 group">
                        <div className="w-12 h-12 rounded-xl bg-rose-600/10 text-rose-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Printer className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-white mb-2">Fleksibilitas Mesin Kasir & Struk</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                            Dukungan printer thermal 58mm & 80mm, buka laci kasir otomatis (*drawer kick*), potong kertas otomatis (*auto-cut*), dan teks footer garansi.
                        </p>
                    </div>
                </div>
            </section>

            {/* SECTION: PRICING PLANS */}
            <section id="harga" className="py-20 bg-slate-900/40 border-t border-slate-800/80">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
                    <div className="text-center max-w-2xl mx-auto space-y-3">
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                            Paket Langganan Transparan
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                            Pilih Paket Sesuai Skala Usaha Anda
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-400">
                            Semua paket mendapatkan uji coba gratis 14 hari penuh fitur. Tanpa kontrak terikat, batalkan kapan saja.
                        </p>

                        {/* Toggle Billing Cycle */}
                        <div className="inline-flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs mt-2">
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className={`px-4 py-1.5 rounded-lg font-semibold transition-colors ${
                                    billingCycle === 'monthly'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Penagihan Bulanan
                            </button>
                            <button
                                onClick={() => setBillingCycle('annual')}
                                className={`px-4 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                                    billingCycle === 'annual'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <span>Penagihan Tahunan</span>
                                <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black text-[9px]">
                                    Hemat 20%
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {plans.map((plan) => {
                            const isPopular = plan.slug === 'pro';
                            const price = billingCycle === 'annual'
                                ? Math.round(plan.price_annual / 12)
                                : plan.price_monthly;

                            return (
                                <div
                                    key={plan.id}
                                    className={`bg-slate-900 border rounded-3xl p-7 flex flex-col justify-between shadow-2xl relative transition-all duration-200 ${
                                        isPopular
                                            ? 'border-blue-500 ring-2 ring-blue-500/30'
                                            : 'border-slate-800 hover:border-slate-700'
                                    }`}
                                >
                                    {isPopular && (
                                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black uppercase rounded-full shadow-lg tracking-wider">
                                            Paling Banyak Dipilih
                                        </div>
                                    )}

                                    <div className="space-y-5">
                                        <div>
                                            <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                                            <p className="text-xs text-slate-400 mt-1 min-h-[32px] leading-relaxed">
                                                {plan.description}
                                            </p>
                                        </div>

                                        <div className="border-t border-b border-slate-800 py-4">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-3xl font-black text-white">
                                                    {formatCurrency(price)}
                                                </span>
                                                <span className="text-xs text-slate-400">/ bulan</span>
                                            </div>
                                            {billingCycle === 'annual' && (
                                                <span className="text-[11px] text-amber-400 mt-0.5 block font-medium">
                                                    Ditagihkan {formatCurrency(plan.price_annual)} per tahun
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-2.5 text-xs text-slate-300">
                                            <div className="flex items-center gap-2">
                                                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                                <span>Maksimal <strong>{plan.max_stores} Cabang Toko</strong></span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                                <span>Maksimal <strong>{plan.max_registers} Mesin Kasir POS</strong></span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                                <span>Maksimal <strong>{plan.max_users} Pengguna Staf</strong></span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                                <span>Manajemen Multi-Level (Kasir, SPV, Manajer)</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                                <span>Cetak Struk Thermal 58mm & 80mm</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                                <span>Laporan Z-Report & Audit Trail Lengkap</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6">
                                        <Link
                                            href="/register"
                                            className={`w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                                                isPopular
                                                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
                                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                                            }`}
                                        >
                                            <span>Mulai Uji Coba Gratis</span>
                                            <ArrowRight className="w-3.5 h-3.5" />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* SECTION: FAQ ACCORDION */}
            <section id="faq" className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
                <div className="text-center space-y-2">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                        Pertanyaan Umum
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        Ada Pertanyaan Mengenai SaaS POS?
                    </h2>
                </div>

                <div className="space-y-4">
                    {[
                        {
                            q: 'Apakah saya membutuhkan perangkat keras khusus untuk menggunakan aplikasi ini?',
                            a: 'Tidak. SaaS POS dapat dijalankan langsung melalui web browser di laptop, PC kasir, tablet Android/iPad, maupun smartphone. Untuk mencetak struk, sistem mendukung printer thermal USB, Bluetooth, maupun IP LAN (58mm dan 80mm).',
                        },
                        {
                            q: 'Bagaimana sistem mengontrol kasir agar tidak terjadi kebocoran uang?',
                            a: 'Sistem menerapkan kontrol shift kasir yang ketat. Setiap kasir wajib menginput kas awal saat buka shift dan menghitung kas fisik saat tutup shift. Jika terdapat selisih, sistem otomatis menahan penutupan hingga disetujui Supervisor (SPV).',
                        },
                        {
                            q: 'Apakah saya bisa mengelola beberapa cabang toko sekaligus?',
                            a: 'Tentu saja. Anda dapat mengelola banyak cabang toko dan gudang dalam 1 akun organisasi. Stok dapat ditransfer antar cabang, dan laporan omzet dapat dipantau secara terpusat atau per cabang.',
                        },
                        {
                            q: 'Apakah saya bisa membagi metode pembayaran (Split Payment)?',
                            a: 'Bisa. Kasir dapat membagi tagihan belanja pelanggan menjadi beberapa metode sekaligus (misalnya sebagian bayar tunai dan sisanya menggunakan QRIS atau kartu debit).',
                        },
                        {
                            q: 'Bagaimana jika saya ingin mencoba terlebih dahulu sebelum berlangganan?',
                            a: 'Setiap pendaftaran baru otomatis mendapatkan masa uji coba gratis selama 14 hari dengan seluruh fitur aktif, tanpa perlu memasukkan kartu kredit.',
                        },
                    ].map((item, idx) => (
                        <div key={idx} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <HelpCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                <span>{item.q}</span>
                            </h3>
                            <p className="text-xs text-slate-400 leading-relaxed pl-6">
                                {item.a}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA CALLOUT */}
            <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-gradient-to-r from-blue-900/60 via-indigo-900/50 to-slate-900 border border-blue-500/30 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden">
                    <div className="max-w-2xl mx-auto space-y-3">
                        <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                            Siap Mengembangkan Bisnis Ritel Anda?
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-300">
                            Daftarkan usaha Anda dalam waktu kurang dari 2 menit dan nikmati kemudahan operasional kasir modern.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <Link
                            href="/register"
                            className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-xl shadow-blue-600/30 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <span>Daftar Uji Coba Gratis 14 Hari</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            href="/login"
                            className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-sm rounded-xl border border-slate-700 transition-colors"
                        >
                            Masuk Akun Kasir
                        </Link>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="border-t border-slate-800 bg-slate-950 py-12 text-xs text-slate-500">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                                <Store className="w-4 h-4" />
                            </div>
                            <div>
                                <span className="font-extrabold text-white text-sm block">PhoebeHub POS</span>
                                <a
                                    href="https://phoebehub.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[10px] text-blue-400 font-semibold hover:underline block"
                                >
                                    phoebehub.com
                                </a>
                            </div>
                        </div>
                        <p className="text-slate-400 text-xs leading-relaxed">
                            Solusi Point of Sale dan manajemen ritel multi-cabang terintegrasi dari ekosistem{' '}
                            <a
                                href="https://phoebehub.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 font-semibold hover:underline"
                            >
                                phoebehub.com
                            </a>{' '}
                            untuk pelaku usaha modern di Indonesia.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <div className="font-bold text-white text-xs uppercase tracking-wider">Modul Aplikasi</div>
                        <ul className="space-y-1.5 text-slate-400">
                            <li><a href="#fitur" className="hover:text-white">Terminal Kasir POS</a></li>
                            <li><a href="#fitur" className="hover:text-white">Manajemen Stok Gudang</a></li>
                            <li><a href="#fitur" className="hover:text-white">Shift & Rekonsiliasi Kas</a></li>
                            <li><a href="#hardware" className="hover:text-white">Setting Printer Thermal</a></li>
                        </ul>
                    </div>

                    <div className="space-y-2">
                        <div className="font-bold text-white text-xs uppercase tracking-wider">Ekosistem PhoebeHub</div>
                        <ul className="space-y-1.5 text-slate-400">
                            <li>
                                <a
                                    href="https://phoebehub.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-white flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium"
                                >
                                    <span>Website phoebehub.com</span>
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </li>
                            <li><Link href="/login" className="hover:text-white">Masuk Kasir / Login</Link></li>
                            <li><Link href="/register" className="hover:text-white">Daftar Akun Baru (Trial 14 Hari)</Link></li>
                            <li><a href="#harga" className="hover:text-white">Paket & Biaya Langganan</a></li>
                            <li><a href="#faq" className="hover:text-white">Pusat Bantuan & FAQ</a></li>
                        </ul>
                    </div>

                    <div className="space-y-2">
                        <div className="font-bold text-white text-xs uppercase tracking-wider">Hubungi Kami</div>
                        <div className="space-y-1 text-slate-400 text-xs">
                            <p className="flex items-center gap-1.5">
                                <Globe className="w-3.5 h-3.5 text-blue-400" />
                                <a
                                    href="https://phoebehub.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-white text-slate-300"
                                >
                                    phoebehub.com
                                </a>
                            </p>
                            <p className="flex items-center gap-1.5">
                                <Mail className="w-3.5 h-3.5 text-slate-500" />
                                <a href="mailto:support@phoebehub.com" className="hover:text-white text-slate-300">
                                    support@phoebehub.com
                                </a>
                            </p>
                            <p className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-slate-500" />
                                <span>+62 21 555 1234 (WhatsApp Bantuan)</span>
                            </p>
                            <p className="text-[11px] text-slate-500 pt-1">
                                Layanan Operasional: 24/7 Monitoring Server Cloud
                            </p>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 mt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
                    <div>
                        &copy; {new Date().getFullYear()}{' '}
                        <a
                            href="https://phoebehub.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-blue-400 font-semibold underline"
                        >
                            PhoebeHub (phoebehub.com)
                        </a>
                        . Seluruh hak cipta dilindungi undang-undang.
                    </div>
                    <div className="flex gap-4 text-slate-400">
                        <span>Privasi & Keamanan</span>
                        <span>Syarat & Ketentuan Layanan</span>
                        <span>Kebijakan SLA Server</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}

