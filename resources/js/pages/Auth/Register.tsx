import React from 'react';
import { useForm, Head, Link } from '@inertiajs/react';
import GuestLayout from '@/layouts/GuestLayout';
import { Store, User, Mail, Phone, Lock, ArrowRight, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        business_name: '',
        name: '',
        email: '',
        phone: '',
        password: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/register', {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout
            title="Daftar Usaha Baru di RIPos"
            subtitle="Republik Indonesia POS — Uji coba gratis 14 hari dari phoebehub.com"
        >
            <Head title="Pendaftaran Akun Usaha Baru - RIPos (Republik Indonesia POS)" />

            <form onSubmit={submit} className="space-y-4">
                {/* Business Name */}
                <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Nama Toko / Usaha <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Store className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            value={data.business_name}
                            onChange={(e) => setData('business_name', e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 text-sm bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="cth: Kopi Nusantara / Toko Berkah"
                            required
                        />
                    </div>
                    {errors.business_name && (
                        <p className="mt-1 text-xs text-rose-400">{errors.business_name}</p>
                    )}
                </div>

                {/* Owner Name */}
                <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Nama Lengkap Pemilik <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <User className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 text-sm bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Nama Anda"
                            required
                        />
                    </div>
                    {errors.name && (
                        <p className="mt-1 text-xs text-rose-400">{errors.name}</p>
                    )}
                </div>

                {/* Email */}
                <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Alamat Email Akun <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Mail className="w-4 h-4" />
                        </div>
                        <input
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 text-sm bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="owner@tokoanda.com"
                            required
                        />
                    </div>
                    {errors.email && (
                        <p className="mt-1 text-xs text-rose-400">{errors.email}</p>
                    )}
                </div>

                {/* Phone */}
                <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Nomor Telepon / WhatsApp <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Phone className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 text-sm bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="081234567890"
                            required
                        />
                    </div>
                    {errors.phone && (
                        <p className="mt-1 text-xs text-rose-400">{errors.phone}</p>
                    )}
                </div>

                {/* Password */}
                <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Kata Sandi <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Lock className="w-4 h-4" />
                        </div>
                        <input
                            type="password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 text-sm bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="Minimal 6 karakter"
                            required
                        />
                    </div>
                    {errors.password && (
                        <p className="mt-1 text-xs text-rose-400">{errors.password}</p>
                    )}
                </div>

                {/* Feature highlight */}
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-300 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>
                        Paket Starter langsung aktif selama 14 hari: Termasuk 1 Toko Cabang, 1 Gudang, dan 1 Mesin Kasir POS.
                    </span>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={processing}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-150 disabled:opacity-50 active:scale-98 mt-2"
                >
                    <span>{processing ? 'Mendaftarkan Usaha...' : 'Mulai Uji Coba Gratis Sekarang'}</span>
                    <ArrowRight className="w-4 h-4" />
                </button>

                {/* Login Link */}
                <div className="text-center pt-3 border-t border-slate-700/60 text-xs text-slate-400">
                    Sudah memiliki akun toko?{' '}
                    <Link
                        href="/login"
                        className="font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        Masuk Kasir di sini
                    </Link>
                </div>
            </form>
        </GuestLayout>
    );
}

