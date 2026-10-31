import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import {
    Truck,
    Plus,
    Search,
    Edit2,
    Trash2,
    X,
    Clock,
    Phone,
    Mail,
    Building
} from 'lucide-react';

interface SupplierItem {
    id: string;
    code: string;
    name: string;
    contact_person: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    payment_terms_days: number;
    balance: string;
    is_active: boolean;
}

interface Props {
    suppliers: {
        data: SupplierItem[];
        current_page: number;
        last_page: number;
        total: number;
    };
    filters: {
        search?: string;
    };
}

export default function SuppliersIndex({ suppliers, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);

    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: '',
        code: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        payment_terms_days: 30,
        is_active: true,
        notes: '',
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/suppliers', { search }, { preserveState: true, replace: true });
    };

    const openCreateModal = () => {
        setEditingSupplier(null);
        reset();
        setData('code', 'SUP-' + Math.floor(1000 + Math.random() * 9000));
        setModalOpen(true);
    };

    const openEditModal = (s: SupplierItem) => {
        setEditingSupplier(s);
        setData({
            name: s.name,
            code: s.code,
            contact_person: s.contact_person || '',
            phone: s.phone || '',
            email: s.email || '',
            address: s.address || '',
            payment_terms_days: s.payment_terms_days,
            is_active: s.is_active,
            notes: '',
        });
        setModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingSupplier) {
            put(`/suppliers/${editingSupplier.id}`, {
                onSuccess: () => setModalOpen(false),
            });
        } else {
            post('/suppliers', {
                onSuccess: () => {
                    setModalOpen(false);
                    reset();
                },
            });
        }
    };

    const handleDelete = (id: string, name: string) => {
        if (confirm(`Hapus data supplier "${name}"?`)) {
            router.delete(`/suppliers/${id}`);
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Manajemen Supplier" />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        <Truck className="w-6 h-6 text-blue-400" />
                        <span>Mitra Supplier & Pemasok</span>
                    </h1>
                    <p className="mt-1 text-xs text-slate-400">
                        Kelola data pemasok barang, PIC, syarat pembayaran, dan invoice purchasing
                    </p>
                </div>

                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    <span>Daftarkan Supplier</span>
                </button>
            </div>

            {/* Filter Search */}
            <div className="bg-slate-800 border border-slate-700/60 rounded-xl p-4 mb-6 shadow-sm">
                <form onSubmit={handleSearch} className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari berdasarkan nama supplier, kode, atau PIC..."
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

            {/* Suppliers Table */}
            <div className="bg-slate-800 border border-slate-700/60 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-700/60">
                            <tr>
                                <th className="py-3 px-4">Kode</th>
                                <th className="py-3 px-4">Nama Supplier</th>
                                <th className="py-3 px-4">Kontak PIC</th>
                                <th className="py-3 px-4">Telepon & Email</th>
                                <th className="py-3 px-4 text-center">Jatuh Tempo</th>
                                <th className="py-3 px-4 text-center">Status</th>
                                <th className="py-3 px-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {suppliers.data.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-400">
                                        <Truck className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                                        <span>Tidak ada data supplier yang ditemukan.</span>
                                    </td>
                                </tr>
                            ) : (
                                suppliers.data.map((supplier) => (
                                    <tr key={supplier.id} className="hover:bg-slate-700/30 transition-colors">
                                        <td className="py-3 px-4 font-mono font-semibold text-blue-400">
                                            {supplier.code}
                                        </td>
                                        <td className="py-3 px-4 font-medium text-white">
                                            {supplier.name}
                                        </td>
                                        <td className="py-3 px-4 text-slate-300">
                                            {supplier.contact_person || '-'}
                                        </td>
                                        <td className="py-3 px-4 text-slate-300">
                                            {supplier.phone && (
                                                <div className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3 text-slate-400" />
                                                    <span>{supplier.phone}</span>
                                                </div>
                                            )}
                                            {supplier.email && (
                                                <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                                                    <Mail className="w-3 h-3" />
                                                    <span>{supplier.email}</span>
                                                </div>
                                            )}
                                            {!supplier.phone && !supplier.email && <span className="text-slate-500">-</span>}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-medium bg-slate-700 text-slate-300">
                                                <Clock className="w-3 h-3 text-blue-400" />
                                                {supplier.payment_terms_days} Hari
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                                supplier.is_active
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                    : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                            }`}>
                                                {supplier.is_active ? 'AKTIF' : 'NON-AKTIF'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right space-x-2">
                                            <button
                                                onClick={() => openEditModal(supplier)}
                                                className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-700 transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(supplier.id, supplier.name)}
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
                    <span>Total {suppliers.total} supplier terdaftar</span>
                    <span>Halaman {suppliers.current_page} dari {suppliers.last_page || 1}</span>
                </div>
            </div>

            {/* Modal Supplier */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-4">
                            <h3 className="text-base font-semibold text-white">
                                {editingSupplier ? 'Ubah Data Supplier' : 'Daftarkan Supplier Baru'}
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
                                    <label className="block text-slate-300 font-medium mb-1">Kode Supplier *</label>
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
                                    <label className="block text-slate-300 font-medium mb-1">Nama Perusahaan / Supplier *</label>
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
                                    <label className="block text-slate-300 font-medium mb-1">Nama Kontak PIC</label>
                                    <input
                                        type="text"
                                        value={data.contact_person}
                                        onChange={(e) => setData('contact_person', e.target.value)}
                                        placeholder="Nama Sales / Account Manager"
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Syarat Bayar (Hari)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.payment_terms_days}
                                        onChange={(e) => setData('payment_terms_days', parseInt(e.target.value) || 0)}
                                        placeholder="30"
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">No. Telepon / Hotline</label>
                                    <input
                                        type="text"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        placeholder="021-xxxxxxx"
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Alamat Email Orders</label>
                                    <input
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        placeholder="orders@supplier.com"
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-300 font-medium mb-1">Alamat Kantor / Gudang Supplier</label>
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
                                    {processing ? 'Menyimpan...' : 'Simpan Supplier'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
