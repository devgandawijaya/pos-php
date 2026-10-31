import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import {
    Users,
    Plus,
    Search,
    Edit2,
    Trash2,
    X,
    Award,
    CreditCard,
    Phone,
    Mail
} from 'lucide-react';

interface CustomerGroup {
    id: string;
    name: string;
    discount_percentage: string;
}

interface CustomerItem {
    id: string;
    code: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    loyalty_points: number;
    credit_limit: string;
    balance: string;
    status: string;
    customer_group?: CustomerGroup;
}

interface Props {
    customers: {
        data: CustomerItem[];
        current_page: number;
        last_page: number;
        total: number;
    };
    groups: CustomerGroup[];
    filters: {
        search?: string;
    };
}

export default function CustomersIndex({ customers, groups, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);

    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: '',
        code: '',
        phone: '',
        email: '',
        address: '',
        customer_group_id: '',
        credit_limit: 0,
        status: 'active',
        notes: '',
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/customers', { search }, { preserveState: true, replace: true });
    };

    const openCreateModal = () => {
        setEditingCustomer(null);
        reset();
        setData('code', 'CUST-' + Math.floor(1000 + Math.random() * 9000));
        setModalOpen(true);
    };

    const openEditModal = (c: CustomerItem) => {
        setEditingCustomer(c);
        setData({
            name: c.name,
            code: c.code,
            phone: c.phone || '',
            email: c.email || '',
            address: c.address || '',
            customer_group_id: c.customer_group?.id || '',
            credit_limit: parseFloat(c.credit_limit),
            status: c.status,
            notes: '',
        });
        setModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCustomer) {
            put(`/customers/${editingCustomer.id}`, {
                onSuccess: () => setModalOpen(false),
            });
        } else {
            post('/customers', {
                onSuccess: () => {
                    setModalOpen(false);
                    reset();
                },
            });
        }
    };

    const handleDelete = (id: string, name: string) => {
        if (confirm(`Hapus pelanggan "${name}"?`)) {
            router.delete(`/customers/${id}`);
        }
    };

    const formatCurrency = (amount: string | number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(Number(amount));
    };

    return (
        <AuthenticatedLayout>
            <Head title="Manajemen Pelanggan & CRM" />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        <Users className="w-6 h-6 text-blue-400" />
                        <span>Pelanggan & CRM Loyalty</span>
                    </h1>
                    <p className="mt-1 text-xs text-slate-400">
                        Kelola data pelanggan, tiering diskon, dan riwayat poin loyalitas kasir
                    </p>
                </div>

                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Pelanggan</span>
                </button>
            </div>

            {/* Filter Search */}
            <div className="bg-slate-800 border border-slate-700/60 rounded-xl p-4 mb-6 shadow-sm">
                <form onSubmit={handleSearch} className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari berdasarkan nama, nomor telepon, atau kode pelanggan..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-xs font-medium text-white rounded-lg transition-colors"
                    >
                        Cari
                    </button>
                </form>
            </div>

            {/* Customers Table */}
            <div className="bg-slate-800 border border-slate-700/60 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-700/60">
                            <tr>
                                <th className="py-3 px-4">Kode</th>
                                <th className="py-3 px-4">Nama Pelanggan</th>
                                <th className="py-3 px-4">Kontak</th>
                                <th className="py-3 px-4">Grup / Tier</th>
                                <th className="py-3 px-4 text-center">Poin Loyalitas</th>
                                <th className="py-3 px-4 text-right">Limit Kredit</th>
                                <th className="py-3 px-4 text-center">Status</th>
                                <th className="py-3 px-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {customers.data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-slate-400">
                                        <Users className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                                        <span>Tidak ada data pelanggan yang sesuai.</span>
                                    </td>
                                </tr>
                            ) : (
                                customers.data.map((customer) => (
                                    <tr key={customer.id} className="hover:bg-slate-700/30 transition-colors">
                                        <td className="py-3 px-4 font-mono font-semibold text-blue-400">
                                            {customer.code}
                                        </td>
                                        <td className="py-3 px-4 font-medium text-white">
                                            {customer.name}
                                        </td>
                                        <td className="py-3 px-4 text-slate-300">
                                            {customer.phone && (
                                                <div className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3 text-slate-400" />
                                                    <span>{customer.phone}</span>
                                                </div>
                                            )}
                                            {customer.email && (
                                                <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                                                    <Mail className="w-3 h-3" />
                                                    <span>{customer.email}</span>
                                                </div>
                                            )}
                                            {!customer.phone && !customer.email && <span className="text-slate-500">-</span>}
                                        </td>
                                        <td className="py-3 px-4">
                                            {customer.customer_group ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                    <Award className="w-3 h-3" />
                                                    {customer.customer_group.name} ({customer.customer_group.discount_percentage}%)
                                                </span>
                                            ) : (
                                                <span className="text-slate-500">Reguler</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-bold bg-amber-500/10 text-amber-400">
                                                {customer.loyalty_points.toLocaleString()} PTS
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                                            {formatCurrency(customer.credit_limit)}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                                customer.status === 'active'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                    : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                            }`}>
                                                {customer.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right space-x-2">
                                            <button
                                                onClick={() => openEditModal(customer)}
                                                className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-700 transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(customer.id, customer.name)}
                                                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-colors"
                                                title="Hapus"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-slate-700/60 text-xs text-slate-400 flex items-center justify-between">
                    <span>Total {customers.total} pelanggan</span>
                    <span>Halaman {customers.current_page} dari {customers.last_page || 1}</span>
                </div>
            </div>

            {/* Modal Customer */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-4">
                            <h3 className="text-base font-semibold text-white">
                                {editingCustomer ? 'Ubah Data Pelanggan' : 'Daftarkan Pelanggan Baru'}
                            </h3>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Kode Pelanggan *</label>
                                    <input
                                        type="text"
                                        required
                                        value={data.code}
                                        onChange={(e) => setData('code', e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    {errors.code && <p className="text-rose-400 mt-1">{errors.code}</p>}
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Nama Pelanggan *</label>
                                    <input
                                        type="text"
                                        required
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    {errors.name && <p className="text-rose-400 mt-1">{errors.name}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">No. Telepon / WhatsApp</label>
                                    <input
                                        type="text"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        placeholder="0812xxxxxxxx"
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Alamat Email</label>
                                    <input
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        placeholder="pelanggan@email.com"
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Grup Pelanggan / Tier</label>
                                    <select
                                        value={data.customer_group_id}
                                        onChange={(e) => setData('customer_group_id', e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Reguler (Tanpa Diskon)</option>
                                        {groups.map((g) => (
                                            <option key={g.id} value={g.id}>
                                                {g.name} (Diskon {g.discount_percentage}%)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Limit Kredit (Piutang)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.credit_limit}
                                        onChange={(e) => setData('credit_limit', parseFloat(e.target.value) || 0)}
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-300 font-medium mb-1">Alamat Lengkap</label>
                                <textarea
                                    rows={2}
                                    value={data.address}
                                    onChange={(e) => setData('address', e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
                                >
                                    {processing ? 'Menyimpan...' : 'Simpan Pelanggan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}

