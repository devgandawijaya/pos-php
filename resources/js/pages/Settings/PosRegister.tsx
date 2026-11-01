import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import {
    Printer,
    Store as StoreIcon,
    Settings,
    CheckCircle2,
    Sliders,
    Receipt,
    Scissors,
    Wifi,
    Bluetooth,
    Monitor,
    DollarSign,
    Save,
    QrCode,
    Barcode,
    FileText,
    Sparkles,
    AlertCircle,
} from 'lucide-react';

interface StoreItem {
    id: string;
    name: string;
    code: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    tax_percentage: string | number;
}

interface RegisterItem {
    id: string;
    store_id: string;
    code: string;
    name: string;
    printer_type: string;
    paper_size: '58mm' | '80mm';
    header_text: string | null;
    footer_text: string | null;
    show_logo: boolean;
    show_cashier: boolean;
    show_customer: boolean;
    show_tax_details: boolean;
    show_barcode: boolean;
    auto_print: boolean;
    open_cash_drawer: boolean;
    auto_cut: boolean;
    connection_type: 'browser' | 'network' | 'bluetooth';
    printer_ip: string | null;
    printer_port: number;
    is_active: boolean;
}

interface Props {
    stores: StoreItem[];
    selectedStore: StoreItem;
    registers: RegisterItem[];
}

export default function PosRegisterSettings({ stores, selectedStore, registers }: Props) {
    const [activeRegisterIndex, setActiveRegisterIndex] = useState(0);
    const activeRegister = registers[activeRegisterIndex] || registers[0];

    const { data, setData, put, processing, errors, recentlySuccessful } = useForm({
        name: activeRegister?.name || 'Mesin Kasir Utama',
        printer_type: activeRegister?.printer_type || 'thermal_80mm',
        paper_size: (activeRegister?.paper_size || '80mm') as '58mm' | '80mm',
        header_text: activeRegister?.header_text || 'Selamat Datang di Toko Kami',
        footer_text: activeRegister?.footer_text || 'Barang yang sudah dibeli dapat ditukar maksimal 2x24 jam dengan membawa struk asli. Terima kasih!',
        show_logo: activeRegister?.show_logo ?? true,
        show_cashier: activeRegister?.show_cashier ?? true,
        show_customer: activeRegister?.show_customer ?? true,
        show_tax_details: activeRegister?.show_tax_details ?? true,
        show_barcode: activeRegister?.show_barcode ?? true,
        auto_print: activeRegister?.auto_print ?? false,
        open_cash_drawer: activeRegister?.open_cash_drawer ?? true,
        auto_cut: activeRegister?.auto_cut ?? true,
        connection_type: (activeRegister?.connection_type || 'browser') as 'browser' | 'network' | 'bluetooth',
        printer_ip: activeRegister?.printer_ip || '',
        printer_port: activeRegister?.printer_port || 9100,
        is_active: activeRegister?.is_active ?? true,
    });

    const handleStoreChange = (storeId: string) => {
        router.get('/settings/registers', { store_id: storeId }, { preserveState: false });
    };

    const handleSelectRegister = (idx: number) => {
        setActiveRegisterIndex(idx);
        const reg = registers[idx];
        if (reg) {
            setData({
                name: reg.name,
                printer_type: reg.printer_type,
                paper_size: reg.paper_size,
                header_text: reg.header_text || '',
                footer_text: reg.footer_text || '',
                show_logo: reg.show_logo,
                show_cashier: reg.show_cashier,
                show_customer: reg.show_customer,
                show_tax_details: reg.show_tax_details,
                show_barcode: reg.show_barcode,
                auto_print: reg.auto_print,
                open_cash_drawer: reg.open_cash_drawer,
                auto_cut: reg.auto_cut,
                connection_type: reg.connection_type,
                printer_ip: reg.printer_ip || '',
                printer_port: reg.printer_port || 9100,
                is_active: reg.is_active,
            });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeRegister) return;
        put(`/settings/registers/${activeRegister.id}`, {
            preserveScroll: true,
        });
    };

    const handleTestPrint = () => {
        window.print();
    };

    return (
        <AuthenticatedLayout>
            <Head title="Pengaturan Mesin Kasir & Format Struk" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                            <Printer className="w-7 h-7 text-emerald-400" />
                            <span>Pengaturan Mesin Kasir & Format Struk</span>
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Sesuaikan format kertas thermal (58mm/80mm), kontrol laci kasir (drawer kick), auto-cut, dan tampilan struk belanja.
                        </p>
                    </div>

                    {/* Store Selector */}
                    <div className="flex items-center gap-2 bg-slate-800 border border-slate-700/80 rounded-xl px-3 py-1.5 self-start sm:self-auto">
                        <StoreIcon className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-slate-400">Toko:</span>
                        <select
                            value={selectedStore?.id || ''}
                            onChange={(e) => handleStoreChange(e.target.value)}
                            className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
                        >
                            {stores.map((s) => (
                                <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                                    {s.name} ({s.code})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Register Tabs */}
                {registers.length > 1 && (
                    <div className="flex items-center gap-2 border-b border-slate-700 pb-2">
                        {registers.map((reg, idx) => (
                            <button
                                key={reg.id}
                                onClick={() => handleSelectRegister(idx)}
                                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                                    activeRegisterIndex === idx
                                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                                }`}
                            >
                                <Monitor className="w-3.5 h-3.5" />
                                <span>{reg.name}</span>
                                <span className="font-mono text-[10px] opacity-75">({reg.code})</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Main Content Grid: Settings on Left, Live Preview on Right */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Settings Form */}
                    <div className="lg:col-span-7 space-y-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Success Notification */}
                            {recentlySuccessful && (
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-400 text-sm">
                                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                                    <span>Pengaturan mesin kasir dan format struk berhasil disimpan!</span>
                                </div>
                            )}

                            {/* Section 1: Mesin Kasir & Hardware */}
                            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl space-y-5">
                                <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                                    <h3 className="font-bold text-white text-base flex items-center gap-2.5">
                                        <Sliders className="w-5 h-5 text-emerald-400" />
                                        <span>Perangkat Keras & Mesin Kasir</span>
                                    </h3>
                                    <span className="text-xs font-mono text-slate-400">
                                        Kode: {activeRegister?.code}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                            Nama Register Kasir
                                        </label>
                                        <input
                                            type="text"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                            Ukuran Kertas Thermal
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setData('paper_size', '58mm')}
                                                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                                                    data.paper_size === '58mm'
                                                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                                                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                                                }`}
                                            >
                                                58mm (Kecil/Mini)
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setData('paper_size', '80mm')}
                                                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                                                    data.paper_size === '80mm'
                                                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
                                                        : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                                                }`}
                                            >
                                                80mm (Standar POS)
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Connection Type */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                                        Metode Koneksi Printer
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <label
                                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                                data.connection_type === 'browser'
                                                    ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/30'
                                                    : 'bg-slate-900/60 border-slate-700 hover:border-slate-600'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="connection_type"
                                                value="browser"
                                                checked={data.connection_type === 'browser'}
                                                onChange={(e) => setData('connection_type', 'browser')}
                                                className="text-emerald-500 focus:ring-emerald-500"
                                            />
                                            <div>
                                                <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                                                    <Monitor className="w-3.5 h-3.5 text-blue-400" />
                                                    <span>Web Print OS</span>
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">Dialog bawaan browser/driver</div>
                                            </div>
                                        </label>

                                        <label
                                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                                data.connection_type === 'network'
                                                    ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/30'
                                                    : 'bg-slate-900/60 border-slate-700 hover:border-slate-600'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="connection_type"
                                                value="network"
                                                checked={data.connection_type === 'network'}
                                                onChange={(e) => setData('connection_type', 'network')}
                                                className="text-emerald-500 focus:ring-emerald-500"
                                            />
                                            <div>
                                                <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                                                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                                                    <span>LAN / WiFi IP</span>
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">Socket ESC/POS Port 9100</div>
                                            </div>
                                        </label>

                                        <label
                                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                                data.connection_type === 'bluetooth'
                                                    ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/30'
                                                    : 'bg-slate-900/60 border-slate-700 hover:border-slate-600'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="connection_type"
                                                value="bluetooth"
                                                checked={data.connection_type === 'bluetooth'}
                                                onChange={(e) => setData('connection_type', 'bluetooth')}
                                                className="text-emerald-500 focus:ring-emerald-500"
                                            />
                                            <div>
                                                <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                                                    <Bluetooth className="w-3.5 h-3.5 text-cyan-400" />
                                                    <span>Bluetooth</span>
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">Mobile ESC/POS printer</div>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {data.connection_type === 'network' && (
                                    <div className="grid grid-cols-2 gap-3 p-3 bg-slate-900/70 border border-slate-700 rounded-xl">
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                                                Alamat IP Printer
                                            </label>
                                            <input
                                                type="text"
                                                value={data.printer_ip}
                                                onChange={(e) => setData('printer_ip', e.target.value)}
                                                placeholder="192.168.1.200"
                                                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                                                Port Raw Socket
                                            </label>
                                            <input
                                                type="number"
                                                value={data.printer_port}
                                                onChange={(e) => setData('printer_port', parseInt(e.target.value) || 9100)}
                                                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Hardware Toggles: Drawer Kick, Auto Cut, Auto Print */}
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-700/60">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                                                <DollarSign className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-white">
                                                    Buka Laci Kasir Otomatis (Drawer Kick)
                                                </div>
                                                <div className="text-[11px] text-slate-400">
                                                    Kirim perintah pulsa RJ-11 untuk membuka laci kasir saat pembayaran tunai
                                                </div>
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={data.open_cash_drawer}
                                            onChange={(e) => setData('open_cash_drawer', e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-700/60">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                                                <Scissors className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-white">
                                                    Potong Kertas Otomatis (Auto-Cut)
                                                </div>
                                                <div className="text-[11px] text-slate-400">
                                                    Kirim sinyal GS V untuk memotong kertas otomatis di akhir struk
                                                </div>
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={data.auto_cut}
                                            onChange={(e) => setData('auto_cut', e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-700/60">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                                                <Printer className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-white">
                                                    Auto-Print Saat Transaksi Berhasil
                                                </div>
                                                <div className="text-[11px] text-slate-400">
                                                    Langsung cetak struk tanpa perlu kasir menekan tombol "Cetak Struk"
                                                </div>
                                            </div>
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={data.auto_print}
                                            onChange={(e) => setData('auto_print', e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Format Struk Belanja */}
                            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl space-y-5">
                                <div className="pb-3 border-b border-slate-700">
                                    <h3 className="font-bold text-white text-base flex items-center gap-2.5">
                                        <Receipt className="w-5 h-5 text-emerald-400" />
                                        <span>Kustomisasi Format Struk Belanja</span>
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Atur teks header, catatan kaki garansi retur, dan komponen yang ingin ditampilkan.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                        Teks Header Tambahan (Slogan / NPWP / Izin Usaha)
                                    </label>
                                    <input
                                        type="text"
                                        value={data.header_text}
                                        onChange={(e) => setData('header_text', e.target.value)}
                                        placeholder="cth: NPWP: 01.234.567.8-901.000 / Senyum, Sapa, Melayani"
                                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                        Teks Footer / Kebijakan Penukaran Barang
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={data.footer_text}
                                        onChange={(e) => setData('footer_text', e.target.value)}
                                        placeholder="cth: Barang yang sudah dibeli dapat ditukar maksimal 2x24 jam dengan membawa struk asli. Terima kasih atas kunjungan Anda!"
                                        className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>

                                {/* Visibility Toggles */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    <label className="flex items-center gap-2.5 p-2.5 bg-slate-900/60 rounded-xl border border-slate-700/60 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={data.show_logo}
                                            onChange={(e) => setData('show_logo', e.target.checked)}
                                            className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                                        />
                                        <span className="text-xs text-slate-200">Tampilkan Nama & Logo Toko</span>
                                    </label>

                                    <label className="flex items-center gap-2.5 p-2.5 bg-slate-900/60 rounded-xl border border-slate-700/60 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={data.show_cashier}
                                            onChange={(e) => setData('show_cashier', e.target.checked)}
                                            className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                                        />
                                        <span className="text-xs text-slate-200">Tampilkan Nama Kasir</span>
                                    </label>

                                    <label className="flex items-center gap-2.5 p-2.5 bg-slate-900/60 rounded-xl border border-slate-700/60 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={data.show_customer}
                                            onChange={(e) => setData('show_customer', e.target.checked)}
                                            className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                                        />
                                        <span className="text-xs text-slate-200">Tampilkan Info Pelanggan</span>
                                    </label>

                                    <label className="flex items-center gap-2.5 p-2.5 bg-slate-900/60 rounded-xl border border-slate-700/60 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={data.show_tax_details}
                                            onChange={(e) => setData('show_tax_details', e.target.checked)}
                                            className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                                        />
                                        <span className="text-xs text-slate-200">Tampilkan Rincian Pajak (PPN)</span>
                                    </label>

                                    <label className="flex items-center gap-2.5 p-2.5 bg-slate-900/60 rounded-xl border border-slate-700/60 cursor-pointer sm:col-span-2">
                                        <input
                                            type="checkbox"
                                            checked={data.show_barcode}
                                            onChange={(e) => setData('show_barcode', e.target.checked)}
                                            className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                                        />
                                        <span className="text-xs text-slate-200">
                                            Cetak Barcode Faktur di Bawah Struk (Untuk Scan Retur Cepat)
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Save Button */}
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/25 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    <span>{processing ? 'Menyimpan...' : 'Simpan Pengaturan Mesin Kasir'}</span>
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Right Column: Interactive Live Thermal Paper Preview */}
                    <div className="lg:col-span-5 sticky top-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-400" />
                                <span>Simulasi Tampilan Kertas Struk</span>
                            </span>
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                                Lebar: {data.paper_size}
                            </span>
                        </div>

                        {/* Thermal Paper Card */}
                        <div
                            id="printable-receipt"
                            className={`mx-auto bg-white text-slate-900 font-mono shadow-2xl rounded-sm p-5 border-t-8 border-b-8 border-dashed border-slate-300 transition-all duration-200 select-text ${
                                data.paper_size === '58mm' ? 'max-w-[270px] text-[11px]' : 'max-w-[340px] text-xs'
                            }`}
                        >
                            {/* Store Header */}
                            {data.show_logo && (
                                <div className="text-center pb-2 border-b border-dashed border-slate-400 space-y-0.5">
                                    <div className="font-black text-sm tracking-tight uppercase">
                                        {selectedStore?.name || 'TOKO RETAIL UTAMA'}
                                    </div>
                                    <div className="text-[10px] text-slate-600">
                                        {selectedStore?.address || 'Jl. Jenderal Sudirman No. 88, Jakarta'}
                                    </div>
                                    {selectedStore?.phone && (
                                        <div className="text-[10px] text-slate-600">
                                            Telp: {selectedStore.phone}
                                        </div>
                                    )}
                                    {data.header_text && (
                                        <div className="text-[10px] text-slate-700 italic pt-0.5 font-medium">
                                            {data.header_text}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Meta Info */}
                            <div className="py-2 space-y-0.5 text-[10px] text-slate-700">
                                <div className="flex justify-between">
                                    <span>No: INV-20261101-0088</span>
                                    <span>{activeRegister?.code || 'POS-01'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Tgl: 01/11/2026 13:00</span>
                                </div>
                                {data.show_cashier && (
                                    <div className="flex justify-between">
                                        <span>Kasir:</span>
                                        <span className="font-semibold">Siti Kasir</span>
                                    </div>
                                )}
                                {data.show_customer && (
                                    <div className="flex justify-between">
                                        <span>Pelanggan:</span>
                                        <span className="font-semibold">Budi Santoso (120 Poin)</span>
                                    </div>
                                )}
                            </div>

                            {/* Items Table */}
                            <div className="py-2 border-t border-b border-dashed border-slate-400 space-y-1.5">
                                <div className="space-y-0.5">
                                    <div className="font-bold">Kopi Espresso Blend 250g</div>
                                    <div className="flex justify-between text-[10px] text-slate-600">
                                        <span>2 x Rp 22.000</span>
                                        <span className="font-bold text-slate-900">Rp 44.000</span>
                                    </div>
                                </div>

                                <div className="space-y-0.5">
                                    <div className="font-bold">Roti Bakar Keju Coklat</div>
                                    <div className="flex justify-between text-[10px] text-slate-600">
                                        <span>1 x Rp 18.000</span>
                                        <span className="font-bold text-slate-900">Rp 18.000</span>
                                    </div>
                                </div>
                            </div>

                            {/* Financial Totals */}
                            <div className="py-2 space-y-1 text-xs">
                                <div className="flex justify-between text-slate-700">
                                    <span>Subtotal:</span>
                                    <span>Rp 62.000</span>
                                </div>
                                <div className="flex justify-between text-rose-600 text-[11px]">
                                    <span>Diskon Promo (10%):</span>
                                    <span>-Rp 6.200</span>
                                </div>
                                {data.show_tax_details && (
                                    <div className="flex justify-between text-slate-700 text-[11px]">
                                        <span>PPN (11%):</span>
                                        <span>Rp 6.138</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-800">
                                    <span>TOTAL:</span>
                                    <span>Rp 61.938</span>
                                </div>
                                <div className="flex justify-between text-[11px] pt-1">
                                    <span>Pembayaran (TUNAI):</span>
                                    <span>Rp 100.000</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                    <span>Kembalian:</span>
                                    <span className="font-bold">Rp 38.062</span>
                                </div>
                            </div>

                            {/* Footer & Return Policy */}
                            {data.footer_text && (
                                <div className="pt-2 pb-1 text-center text-[10px] text-slate-600 border-t border-dashed border-slate-400 leading-tight">
                                    {data.footer_text}
                                </div>
                            )}

                            {/* Barcode Section */}
                            {data.show_barcode && (
                                <div className="pt-2 pb-1 text-center border-t border-dashed border-slate-300">
                                    <div className="inline-block tracking-[0.25em] font-mono font-bold text-xs">
                                        ||| | || |||| | || | |||
                                    </div>
                                    <div className="text-[9px] text-slate-500 font-mono">
                                        INV-20261101-0088
                                    </div>
                                </div>
                            )}

                            {/* Powered by PhoebeHub */}
                            <div className="pt-1 text-center text-[9px] text-slate-400 font-sans border-t border-dashed border-slate-300">
                                Powered by PhoebeHub • phoebehub.com
                            </div>
                        </div>

                        {/* Test Print Button */}
                        <div className="text-center pt-2">
                            <button
                                type="button"
                                onClick={handleTestPrint}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-2 mx-auto transition-colors"
                            >
                                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Cetak Contoh Struk ke Printer</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

