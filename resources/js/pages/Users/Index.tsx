import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import {
    Users,
    UserPlus,
    Search,
    Shield,
    Store as StoreIcon,
    Mail,
    Phone,
    CheckCircle2,
    XCircle,
    Edit2,
    Trash2,
    Lock,
    X,
    Filter,
    KeyRound,
    UserCheck,
    AlertCircle,
} from 'lucide-react';

interface RoleItem {
    id: string;
    name: string;
    slug: string;
    description: string;
}

interface StoreItem {
    id: string;
    name: string;
    code: string;
}

interface UserItem {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    status: 'active' | 'inactive';
    created_at: string;
    roles: RoleItem[];
    stores: Array<{
        id: string;
        name: string;
        code: string;
        pivot?: { is_default: boolean };
    }>;
}

interface Props {
    users: {
        data: UserItem[];
        current_page: number;
        last_page: number;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    roles: RoleItem[];
    stores: StoreItem[];
    filters: {
        search?: string;
        role?: string;
        store_id?: string;
        status?: string;
    };
}

export default function UsersIndex({ users, roles, stores, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [selectedRole, setSelectedRole] = useState(filters.role || '');
    const [selectedStore, setSelectedStore] = useState(filters.store_id || '');
    const [selectedStatus, setSelectedStatus] = useState(filters.status || '');

    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserItem | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm<{
        name: string;
        email: string;
        phone: string;
        password: string;
        role_id: string;
        store_ids: string[];
        default_store_id: string;
        status: 'active' | 'inactive';
    }>({
        name: '',
        email: '',
        phone: '',
        password: '',
        role_id: roles[0]?.id || '',
        store_ids: stores.length > 0 ? [stores[0].id] : [],
        default_store_id: stores[0]?.id || '',
        status: 'active',
    });

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/users',
            {
                search: search || undefined,
                role: selectedRole || undefined,
                store_id: selectedStore || undefined,
                status: selectedStatus || undefined,
            },
            { preserveState: true }
        );
    };

    const handleFilterChange = (key: string, value: string) => {
        const nextFilters = {
            search: search || undefined,
            role: key === 'role' ? (value || undefined) : (selectedRole || undefined),
            store_id: key === 'store_id' ? (value || undefined) : (selectedStore || undefined),
            status: key === 'status' ? (value || undefined) : (selectedStatus || undefined),
        };
        if (key === 'role') setSelectedRole(value);
        if (key === 'store_id') setSelectedStore(value);
        if (key === 'status') setSelectedStatus(value);

        router.get('/users', nextFilters, { preserveState: true });
    };

    const openCreateModal = () => {
        setEditingUser(null);
        clearErrors();
        reset();
        setData({
            name: '',
            email: '',
            phone: '',
            password: '',
            role_id: roles.find((r) => r.slug === 'cashier')?.id || roles[0]?.id || '',
            store_ids: stores.map((s) => s.id),
            default_store_id: stores[0]?.id || '',
            status: 'active',
        });
        setModalOpen(true);
    };

    const openEditModal = (user: UserItem) => {
        setEditingUser(user);
        clearErrors();
        const userRole = user.roles[0]?.id || roles[0]?.id || '';
        const userStoreIds = user.stores.map((s) => s.id);
        const defaultStore = user.stores.find((s) => s.pivot?.is_default)?.id || userStoreIds[0] || '';

        setData({
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            password: '',
            role_id: userRole,
            store_ids: userStoreIds,
            default_store_id: defaultStore,
            status: user.status,
        });
        setModalOpen(true);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser) {
            put(`/users/${editingUser.id}`, {
                onSuccess: () => {
                    setModalOpen(false);
                    reset();
                },
            });
        } else {
            post('/users', {
                onSuccess: () => {
                    setModalOpen(false);
                    reset();
                },
            });
        }
    };

    const confirmDelete = (user: UserItem) => {
        setUserToDelete(user);
        setDeleteModalOpen(true);
    };

    const handleDeleteSubmit = () => {
        if (!userToDelete) return;
        router.delete(`/users/${userToDelete.id}`, {
            onSuccess: () => {
                setDeleteModalOpen(false);
                setUserToDelete(null);
            },
        });
    };

    const toggleStoreSelection = (storeId: string) => {
        const current = [...data.store_ids];
        const index = current.indexOf(storeId);
        if (index > -1) {
            if (current.length > 1) {
                current.splice(index, 1);
                setData('store_ids', current);
                if (data.default_store_id === storeId) {
                    setData('default_store_id', current[0]);
                }
            }
        } else {
            current.push(storeId);
            setData('store_ids', current);
        }
    };

    const getRoleBadge = (roleSlug: string, roleName: string) => {
        switch (roleSlug) {
            case 'owner':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>Owner (Pemilik)</span>
                    </span>
                );
            case 'company-admin':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Admin Perusahaan</span>
                    </span>
                );
            case 'store-manager':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <StoreIcon className="w-3.5 h-3.5" />
                        <span>Manajer Toko</span>
                    </span>
                );
            case 'supervisor':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Supervisor Kasir (SPV)</span>
                    </span>
                );
            case 'inventory-staff':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Staf Gudang & Logistik</span>
                    </span>
                );
            case 'cashier':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Users className="w-3.5 h-3.5" />
                        <span>Kasir (Cashier)</span>
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">
                        <span>{roleName}</span>
                    </span>
                );
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Manajemen Pengguna & Hak Akses" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                            <Users className="w-7 h-7 text-blue-400" />
                            <span>Manajemen Pengguna & Staf</span>
                        </h1>
                        <p className="text-sm text-slate-400 mt-1">
                            Kelola pengguna di berbagai level: Kasir, Supervisor (SPV), Staf Gudang, Manajer Cabang, dan Administrator.
                        </p>
                    </div>

                    <button
                        onClick={openCreateModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition-all active:scale-95"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>Tambah Pengguna Baru</span>
                    </button>
                </div>

                {/* Filter Toolbar */}
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm space-y-3">
                    <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1 relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari nama pengguna, email, atau no telepon..."
                                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Filter Role */}
                        <div className="w-full md:w-56">
                            <select
                                value={selectedRole}
                                onChange={(e) => handleFilterChange('role', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Semua Level Peran</option>
                                {roles.map((r) => (
                                    <option key={r.id} value={r.slug}>
                                        {r.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Filter Store */}
                        <div className="w-full md:w-56">
                            <select
                                value={selectedStore}
                                onChange={(e) => handleFilterChange('store_id', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Semua Cabang Toko</option>
                                {stores.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Filter Status */}
                        <div className="w-full md:w-36">
                            <select
                                value={selectedStatus}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Semua Status</option>
                                <option value="active">Aktif</option>
                                <option value="inactive">Non-Aktif</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                        >
                            <Filter className="w-4 h-4" />
                            <span>Terapkan</span>
                        </button>
                    </form>
                </div>

                {/* Users Table */}
                <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-300">
                            <thead className="bg-slate-900/60 text-xs uppercase font-semibold text-slate-400 tracking-wider border-b border-slate-700">
                                <tr>
                                    <th className="px-6 py-4">Pengguna</th>
                                    <th className="px-6 py-4">Kontak</th>
                                    <th className="px-6 py-4">Level / Peran</th>
                                    <th className="px-6 py-4">Cabang Penugasan</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/60 font-normal">
                                {users.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                            <Users className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                                            <p className="text-base font-semibold text-slate-300">Tidak ada data pengguna.</p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Coba sesuaikan kata kunci pencarian atau filter yang dipilih.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    users.data.map((user) => {
                                        const role = user.roles[0];
                                        return (
                                            <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-sm font-bold text-blue-400">
                                                            {user.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-white">{user.name}</div>
                                                            <div className="text-xs text-slate-400">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-xs">
                                                    {user.phone ? (
                                                        <div className="flex items-center gap-1.5 text-slate-300">
                                                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                            <span>{user.phone}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-500">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {role ? (
                                                        getRoleBadge(role.slug, role.name)
                                                    ) : (
                                                        <span className="text-xs text-slate-500">Tanpa Peran</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-xs">
                                                    {user.stores.length === 0 ? (
                                                        <span className="text-slate-500">Semua Toko</span>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1 max-w-xs">
                                                            {user.stores.map((s) => (
                                                                <span
                                                                    key={s.id}
                                                                    className={`px-2 py-0.5 rounded text-[11px] ${
                                                                        s.pivot?.is_default
                                                                            ? 'bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30'
                                                                            : 'bg-slate-700 text-slate-300'
                                                                    }`}
                                                                >
                                                                    {s.name} {s.pivot?.is_default && '(Utama)'}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {user.status === 'active' ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            <span>AKTIF</span>
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-700/60 text-slate-400">
                                                            <XCircle className="w-3.5 h-3.5" />
                                                            <span>NON-AKTIF</span>
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-2">
                                                    <button
                                                        onClick={() => openEditModal(user)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-700/60 transition-colors"
                                                        title="Ubah Pengguna"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => confirmDelete(user)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 transition-colors"
                                                        title="Hapus Pengguna"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {users.total > users.data.length && (
                        <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between text-xs text-slate-400">
                            <span>
                                Menampilkan {users.data.length} dari total {users.total} pengguna
                            </span>
                            <div className="flex gap-1">
                                {users.links.map((link, idx) => (
                                    <button
                                        key={idx}
                                        disabled={!link.url}
                                        onClick={() => link.url && router.get(link.url)}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                                            link.active
                                                ? 'bg-blue-600 text-white'
                                                : link.url
                                                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                : 'text-slate-600 cursor-not-allowed'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Form Modal (Create / Edit) */}
                {modalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800 z-10">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    {editingUser ? <Edit2 className="w-5 h-5 text-blue-400" /> : <UserPlus className="w-5 h-5 text-blue-400" />}
                                    <span>{editingUser ? 'Ubah Profil Pengguna' : 'Tambah Pengguna Baru'}</span>
                                </h2>
                                <button
                                    onClick={() => setModalOpen(false)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
                                {/* Error banner if any */}
                                {Object.keys(errors).length > 0 && (
                                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                                        <div>
                                            <p className="font-semibold">Mohon perbaiki data berikut:</p>
                                            <ul className="list-disc list-inside mt-1 space-y-0.5">
                                                {Object.entries(errors).map(([key, msg]) => (
                                                    <li key={key}>{msg}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                            Nama Lengkap <span className="text-rose-400">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            placeholder="cth: Siti Rahmawati"
                                            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                            Alamat Email <span className="text-rose-400">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            placeholder="siti@retail.test"
                                            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                            No Telepon / WhatsApp
                                        </label>
                                        <input
                                            type="text"
                                            value={data.phone}
                                            onChange={(e) => setData('phone', e.target.value)}
                                            placeholder="08123456789"
                                            className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                            Kata Sandi {editingUser ? '(Kosongkan jika tidak diubah)' : <span className="text-rose-400">*</span>}
                                        </label>
                                        <div className="relative">
                                            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                                            <input
                                                type="password"
                                                value={data.password}
                                                onChange={(e) => setData('password', e.target.value)}
                                                placeholder={editingUser ? '••••••••' : 'Minimal 6 karakter'}
                                                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                required={!editingUser}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Role Selection */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                                        Level Peran & Hak Akses <span className="text-rose-400">*</span>
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {roles.map((role) => (
                                            <label
                                                key={role.id}
                                                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                                    data.role_id === role.id
                                                        ? 'bg-blue-600/10 border-blue-500 ring-1 ring-blue-500/40'
                                                        : 'bg-slate-900/60 border-slate-700 hover:border-slate-600'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="role_id"
                                                    value={role.id}
                                                    checked={data.role_id === role.id}
                                                    onChange={(e) => setData('role_id', e.target.value)}
                                                    className="mt-1 text-blue-600 focus:ring-blue-500"
                                                />
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-white text-xs">{role.name}</div>
                                                    <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                                                        {role.description}
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Store Assignment */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                            Cabang Toko yang Dapat Diakses
                                        </label>
                                        <span className="text-[11px] text-slate-400">
                                            Pilih minimal 1 toko
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-900/60 border border-slate-700 rounded-xl">
                                        {stores.map((store) => {
                                            const isSelected = data.store_ids.includes(store.id);
                                            return (
                                                <label
                                                    key={store.id}
                                                    className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleStoreSelection(store.id)}
                                                        className="rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="font-medium text-white">{store.name}</span>
                                                    <span className="text-[10px] text-slate-500 font-mono">({store.code})</span>
                                                </label>
                                            );
                                        })}
                                    </div>

                                    {/* Default Store Selector */}
                                    {data.store_ids.length > 1 && (
                                        <div className="mt-2.5 flex items-center gap-3">
                                            <label className="text-xs text-slate-400 whitespace-nowrap">
                                                Toko Utama (Default Login):
                                            </label>
                                            <select
                                                value={data.default_store_id}
                                                onChange={(e) => setData('default_store_id', e.target.value)}
                                                className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                {stores
                                                    .filter((s) => data.store_ids.includes(s.id))
                                                    .map((s) => (
                                                        <option key={s.id} value={s.id}>
                                                            {s.name}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                        Status Akun
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                                            <input
                                                type="radio"
                                                name="status"
                                                value="active"
                                                checked={data.status === 'active'}
                                                onChange={(e) => setData('status', 'active')}
                                                className="text-blue-600 focus:ring-blue-500"
                                            />
                                            <span>Aktif</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                                            <input
                                                type="radio"
                                                name="status"
                                                value="inactive"
                                                checked={data.status === 'inactive'}
                                                onChange={(e) => setData('status', 'inactive')}
                                                className="text-blue-600 focus:ring-blue-500"
                                            />
                                            <span>Non-Aktif</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Modal Actions */}
                                <div className="pt-4 border-t border-slate-700 flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setModalOpen(false)}
                                        className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-xl transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all disabled:opacity-50"
                                    >
                                        {processing ? 'Menyimpan...' : editingUser ? 'Simpan Perubahan' : 'Buat Pengguna'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {deleteModalOpen && userToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
                            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                                <Trash2 className="w-6 h-6" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-base font-bold text-white">Hapus Pengguna?</h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    Apakah Anda yakin ingin menghapus akun <span className="text-white font-semibold">{userToDelete.name}</span> ({userToDelete.email})? Tindakan ini akan menonaktifkan akses staf terkait.
                                </p>
                            </div>
                            <div className="flex items-center justify-center gap-3 pt-2">
                                <button
                                    onClick={() => setDeleteModalOpen(false)}
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-xl transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleDeleteSubmit}
                                    className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/20 transition-all"
                                >
                                    Hapus Sekarang
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}

