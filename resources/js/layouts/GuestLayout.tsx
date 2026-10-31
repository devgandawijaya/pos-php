import React, { PropsWithChildren } from 'react';
import { Store } from 'lucide-react';

interface Props {
    title?: string;
    subtitle?: string;
}

export default function GuestLayout({ children, title, subtitle }: PropsWithChildren<Props>) {
    return (
        <div className="min-h-screen flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-900 text-slate-100">
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/30 mb-4">
                    <Store className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                    {title || 'Enterprise SaaS POS'}
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                    {subtitle || 'Platform Point of Sale Multi-Tenant & Multi-Store'}
                </p>
            </div>

            <div className="w-full sm:max-w-md bg-slate-800/80 backdrop-blur-md border border-slate-700/60 shadow-2xl rounded-2xl p-8">
                {children}
            </div>

            <p className="mt-8 text-center text-xs text-slate-500">
                &copy; {new Date().getFullYear()} Enterprise SaaS POS System. All rights reserved.
            </p>
        </div>
    );
}

