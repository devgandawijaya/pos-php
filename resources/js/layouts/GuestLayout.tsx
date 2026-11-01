import React, { PropsWithChildren } from 'react';
import { Store, Globe } from 'lucide-react';

interface Props {
    title?: string;
    subtitle?: string;
}

export default function GuestLayout({ children, title, subtitle }: PropsWithChildren<Props>) {
    return (
        <div className="min-h-screen flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-900 text-slate-100">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
                <a
                    href="https://phoebehub.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold hover:bg-blue-500/20 transition-colors"
                >
                    <Globe className="w-3.5 h-3.5" />
                    <span>phoebehub.com</span>
                </a>

                <div className="flex justify-center mb-3">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/30">
                        <Store className="w-8 h-8 text-white" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
                    <span>{title || 'RIPos'}</span>
                </h1>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-red-400">
                    Republik Indonesia POS
                </p>
                <p className="mt-1 text-xs text-slate-400">
                    {subtitle || 'Platform Point of Sale Modern dari phoebehub.com'}
                </p>
            </div>

            <div className="w-full sm:max-w-md bg-slate-800/80 backdrop-blur-md border border-slate-700/60 shadow-2xl rounded-2xl p-8">
                {children}
            </div>

            <p className="mt-8 text-center text-xs text-slate-500 flex items-center justify-center gap-1">
                <span>&copy; {new Date().getFullYear()}</span>
                <span className="text-slate-300 font-semibold">RIPos (Republik Indonesia POS)</span>
                <span>•</span>
                <a
                    href="https://phoebehub.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-blue-400 font-medium transition-colors"
                >
                    phoebehub.com
                </a>
                <span>• Hak cipta dilindungi.</span>
            </p>
        </div>
    );
}
