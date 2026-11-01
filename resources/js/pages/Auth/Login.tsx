import React from 'react';
import { useForm, Head, Link } from '@inertiajs/react';
import GuestLayout from '@/layouts/GuestLayout';
import { LogIn, Key, Mail, Sparkles } from 'lucide-react';

export default function Login() {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: 'owner@retailjaya.test',
        password: 'password',
        remember: true,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/login', {
            onFinish: () => reset('password'),
        });
    };

    const fillAccount = (email: string) => {
        setData({
            ...data,
            email,
            password: 'password',
        });
    };

    return (
        <GuestLayout
            title="Masuk ke RIPos"
            subtitle="Republik Indonesia POS — Sistem Kasir Pintar dari phoebehub.com"
        >
            <Head title="Login Akun - RIPos (Republik Indonesia POS)" />

            <form onSubmit={submit} className="space-y-4">
                {/* Email Field */}
                <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Alamat Email
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
                            placeholder="nama@perusahaan.com"
                            required
                        />
                    </div>
                    {errors.email && (
                        <p className="mt-1 text-xs text-rose-400">{errors.email}</p>
                    )}
                </div>

                {/* Password Field */}
                <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Kata Sandi
                    </label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                            <Key className="w-4 h-4" />
                        </div>
                        <input
                            type="password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 text-sm bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    {errors.password && (
                        <p className="mt-1 text-xs text-rose-400">{errors.password}</p>
                    )}
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-400">
                        <input
                            type="checkbox"
                            checked={data.remember}
                            onChange={(e) => setData('remember', e.target.checked)}
                            className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-blue-500"
                        />
                        <span>Ingat saya di perangkat ini</span>
                    </label>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={processing}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
                >
                    <LogIn className="w-4 h-4" />
                    <span>{processing ? 'Memproses Masuk...' : 'Masuk ke Sistem'}</span>
                </button>

                {/* Register Link */}
                <div className="text-center pt-2 text-xs text-slate-400">
                    Belum punya akun usaha?{' '}
                    <Link
                        href="/register"
                        className="font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                    >
                        Daftar Uji Coba Gratis 14 Hari
                    </Link>
                </div>

                <div className="text-center pt-1 text-[11px] text-slate-500">
                    <Link href="/" className="hover:text-slate-300 transition-colors">
                        ← Kembali ke Beranda
                    </Link>
                </div>
            </form>

            {/* Quick Demo Credentials */}
            <div className="mt-6 pt-6 border-t border-slate-700/60">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Akun Demo (Klik untuk autofill):</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => fillAccount('owner@retailjaya.test')}
                        className="p-2 text-left rounded-lg bg-slate-900/50 hover:bg-slate-700/50 border border-slate-700/50 text-[11px] transition-colors"
                    >
                        <span className="font-semibold text-blue-400 block">Tenant Owner A</span>
                        <span className="text-slate-400 text-[10px]">PT Retail Jaya</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => fillAccount('cashier@retailjaya.test')}
                        className="p-2 text-left rounded-lg bg-slate-900/50 hover:bg-slate-700/50 border border-slate-700/50 text-[11px] transition-colors"
                    >
                        <span className="font-semibold text-emerald-400 block">Kasir POS</span>
                        <span className="text-slate-400 text-[10px]">Siti Kasir</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => fillAccount('owner@majubersama.test')}
                        className="p-2 text-left rounded-lg bg-slate-900/50 hover:bg-slate-700/50 border border-slate-700/50 text-[11px] transition-colors"
                    >
                        <span className="font-semibold text-purple-400 block">Tenant Owner B</span>
                        <span className="text-slate-400 text-[10px]">CV Maju Bersama</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => fillAccount('superadmin@pos.test')}
                        className="p-2 text-left rounded-lg bg-slate-900/50 hover:bg-slate-700/50 border border-slate-700/50 text-[11px] transition-colors"
                    >
                        <span className="font-semibold text-amber-400 block">Super Admin</span>
                        <span className="text-slate-400 text-[10px]">Platform Host</span>
                    </button>
                </div>
            </div>
        </GuestLayout>
    );
}

