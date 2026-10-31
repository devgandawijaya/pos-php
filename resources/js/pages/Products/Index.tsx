import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import {
    Package,
    Plus,
    Search,
    Filter,
    Edit2,
    Trash2,
    X,
    Barcode,
    Layers,
    DollarSign,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';

interface Category {
    id: string;
    name: string;
}

interface Brand {
    id: string;
    name: string;
}

interface Unit {
    id: string;
    code: string;
    name: string;
}

interface ProductItem {
    id: string;
    sku: string;
    barcode: string | null;
    name: string;
    purchase_cost: string;
    selling_price: string;
    status: string;
    min_stock: string;
    category?: { id: string; name: string };
    brand?: { id: string; name: string };
    unit?: { id: string; code: string; name: string };
}

interface Props {
    products: {
        data: ProductItem[];
        current_page: number;
        last_page: number;
        total: number;
    };
    categories: Category[];
    brands: Brand[];
    units: Unit[];
    filters: {
        search?: string;
        category_id?: string;
        brand_id?: string;
        status?: string;
    };
}

export default function ProductsIndex({ products, categories, brands, units, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: '',
        sku: '',
        barcode: '',
        category_id: '',
        brand_id: '',
        unit_id: units[0]?.id || '',
        purchase_cost: 0,
        selling_price: 0,
        min_stock: 5,
        status: 'active',
        description: '',
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/products', { search, category_id: filters.category_id, status: filters.status }, {
            preserveState: true,
            replace: true,
        });
    };

    const openCreateModal = () => {
        setEditingProduct(null);
        reset();
        if (units.length > 0) setData('unit_id', units[0].id);
        setModalOpen(true);
    };

    const openEditModal = (p: ProductItem) => {
        setEditingProduct(p);
        setData({
            name: p.name,
            sku: p.sku,
            barcode: p.barcode || '',
            category_id: p.category?.id || '',
            brand_id: p.brand?.id || '',
            unit_id: p.unit?.id || units[0]?.id || '',
            purchase_cost: parseFloat(p.purchase_cost),
            selling_price: parseFloat(p.selling_price),
            min_stock: parseFloat(p.min_stock),
            status: p.status,
            description: '',
        });
        setModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingProduct) {
            put(`/products/${editingProduct.id}`, {
                onSuccess: () => setModalOpen(false),
            });
        } else {
            post('/products', {
                onSuccess: () => {
                    setModalOpen(false);
                    reset();
                },
            });
        }
    };

    const handleDelete = (id: string, name: string) => {
        if (confirm(`Apakah Anda yakin ingin mengarsipkan produk "${name}"?`)) {
            router.delete(`/products/${id}`);
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
            <Head title="Katalog Produk" />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        <Package className="w-6 h-6 text-blue-400" />
                        <span>Katalog Produk & Master Item</span>
                    </h1>
                    <p className="mt-1 text-xs text-slate-400">
                        Kelola seluruh SKU, barcode, harga beli, dan harga jual produk tenant
                    </p>
                </div>

                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Produk Baru</span>
                </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-slate-800 border border-slate-700/60 rounded-xl p-4 mb-6 shadow-sm">
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari berdasarkan nama, SKU, atau barcode..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <select
                        value={filters.category_id || ''}
                        onChange={(e) =>
                            router.get('/products', { search, category_id: e.target.value }, { preserveState: true })
                        }
                        className="bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Semua Kategori</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>

                    <button
                        type="submit"
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-xs font-medium text-white rounded-lg transition-colors"
                    >
                        Cari
                    </button>
                </form>
            </div>

            {/* Product Table */}
            <div className="bg-slate-800 border border-slate-700/60 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-700/60">
                            <tr>
                                <th className="py-3 px-4">SKU / Barcode</th>
                                <th className="py-3 px-4">Nama Produk</th>
                                <th className="py-3 px-4">Kategori & Brand</th>
                                <th className="py-3 px-4">Satuan</th>
                                <th className="py-3 px-4 text-right">Harga Beli</th>
                                <th className="py-3 px-4 text-right">Harga Jual</th>
                                <th className="py-3 px-4 text-center">Status</th>
                                <th className="py-3 px-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {products.data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-slate-400">
                                        <Package className="w-8 h-8 mx-auto text-slate-500 mb-2" />
                                        <span>Tidak ada produk yang ditemukan.</span>
                                    </td>
                                </tr>
                            ) : (
                                products.data.map((product) => (
                                    <tr key={product.id} className="hover:bg-slate-700/30 transition-colors">
                                        <td className="py-3 px-4 font-mono">
                                            <div className="font-semibold text-blue-400">{product.sku}</div>
                                            {product.barcode && (
                                                <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                    <Barcode className="w-3 h-3" />
                                                    {product.barcode}
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 font-medium text-white">
                                            {product.name}
                                        </td>
                                        <td className="py-3 px-4 text-slate-300">
                                            <div>{product.category?.name || '-'}</div>
                                            <div className="text-[10px] text-slate-500">{product.brand?.name || '-'}</div>
                                        </td>
                                        <td className="py-3 px-4 text-slate-400 font-mono">
                                            {product.unit?.code || 'PCS'}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono text-slate-400">
                                            {formatCurrency(product.purchase_cost)}
                                        </td>
                                        <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-400">
                                            {formatCurrency(product.selling_price)}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                                product.status === 'active'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                    : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                            }`}>
                                                {product.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right space-x-2">
                                            <button
                                                onClick={() => openEditModal(product)}
                                                className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-700 transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(product.id, product.name)}
                                                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-colors"
                                                title="Arsipkan"
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
                    <span>Total {products.total} produk terdaftar</span>
                    <span>Halaman {products.current_page} dari {products.last_page || 1}</span>
                </div>
            </div>

            {/* Modal Form */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-4">
                            <h3 className="text-base font-semibold text-white">
                                {editingProduct ? 'Ubah Data Produk' : 'Tambah Produk Baru'}
                            </h3>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className="block text-slate-300 font-medium mb-1">Nama Produk *</label>
                                <input
                                    type="text"
                                    required
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {errors.name && <p className="text-rose-400 mt-1">{errors.name}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">SKU Unik *</label>
                                    <input
                                        type="text"
                                        required
                                        value={data.sku}
                                        onChange={(e) => setData('sku', e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    {errors.sku && <p className="text-rose-400 mt-1">{errors.sku}</p>}
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Barcode (EAN/UPC)</label>
                                    <input
                                        type="text"
                                        value={data.barcode}
                                        onChange={(e) => setData('barcode', e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Kategori</label>
                                    <select
                                        value={data.category_id}
                                        onChange={(e) => setData('category_id', e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Pilih Kategori</option>
                                        {categories.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Brand</label>
                                    <select
                                        value={data.brand_id}
                                        onChange={(e) => setData('brand_id', e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Pilih Brand</option>
                                        {brands.map((b) => (
                                            <option key={b.id} value={b.id}>
                                                {b.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Satuan *</label>
                                    <select
                                        required
                                        value={data.unit_id}
                                        onChange={(e) => setData('unit_id', e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {units.map((u) => (
                                            <option key={u.id} value={u.id}>
                                                {u.code} - {u.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Harga Beli (HPP) *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={data.purchase_cost}
                                        onChange={(e) => setData('purchase_cost', parseFloat(e.target.value) || 0)}
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Harga Jual *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={data.selling_price}
                                        onChange={(e) => setData('selling_price', parseFloat(e.target.value) || 0)}
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Minimum Stok</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={data.min_stock}
                                        onChange={(e) => setData('min_stock', parseFloat(e.target.value) || 0)}
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-medium mb-1">Status</label>
                                    <select
                                        value={data.status}
                                        onChange={(e) => setData('status', e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="active">Active</option>
                                        <option value="draft">Draft</option>
                                        <option value="archived">Archived</option>
                                    </select>
                                </div>
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
                                    {processing ? 'Menyimpan...' : 'Simpan Produk'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
