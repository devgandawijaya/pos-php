import React, { useState, useEffect, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import {
    ShoppingBag,
    Search,
    Barcode,
    Plus,
    Minus,
    Trash2,
    PauseCircle,
    PlayCircle,
    RotateCcw,
    CreditCard,
    DollarSign,
    QrCode,
    CheckCircle2,
    X,
    User,
    ArrowLeft,
    Printer,
    Layers,
    AlertCircle,
    Maximize2,
    Receipt,
    Percent
} from 'lucide-react';

interface CatalogProduct {
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
    category_id: string;
    category_name: string;
    unit_code: string;
    selling_price: number;
    stock: number;
    track_inventory: boolean;
}

interface CartItem {
    product_id: string;
    name: string;
    sku: string;
    unit_price: number;
    quantity: number;
    unit_code: string;
    discount_amount: number;
    stock: number;
    notes?: string;
}

interface CustomerOption {
    id: string;
    code: string;
    name: string;
    phone: string | null;
    loyalty_points: number;
}

interface CategoryOption {
    id: string;
    name: string;
}

interface HeldOrderOption {
    id: string;
    reference_note: string | null;
    cart_payload: {
        items: CartItem[];
        customer_id?: string;
    };
    created_at: string;
    customer?: { id: string; name: string };
}

interface Props {
    store: {
        id: string;
        name: string;
        code: string;
        tax_percentage?: number;
    } | null;
    register: {
        id: string;
        name: string;
        code: string;
    } | null;
    warehouse: {
        id: string;
        name: string;
        code: string;
    } | null;
    catalog: CatalogProduct[];
    categories: CategoryOption[];
    customers: CustomerOption[];
    heldOrders: HeldOrderOption[];
}

export default function PosTerminal({ store, register, warehouse, catalog, categories, customers, heldOrders: initialHeldOrders }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
    const [transactionDiscount, setTransactionDiscount] = useState<number>(0);
    const [heldOrders, setHeldOrders] = useState<HeldOrderOption[]>(initialHeldOrders);

    // Modals
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [heldModalOpen, setHeldModalOpen] = useState(false);
    const [receiptModalOpen, setReceiptModalOpen] = useState(false);
    const [completedOrder, setCompletedOrder] = useState<any>(null);

    // Payment State
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'debit' | 'credit'>('cash');
    const [paidAmount, setPaidAmount] = useState<number>(0);
    const [paymentReference, setPaymentReference] = useState('');
    const [processingCheckout, setProcessingCheckout] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const searchInputRef = useRef<HTMLInputElement>(null);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(val);
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F2') {
                e.preventDefault();
                searchInputRef.current?.focus();
            } else if (e.key === 'F4') {
                e.preventDefault();
                if (cart.length > 0 && !paymentModalOpen) {
                    openPaymentModal();
                }
            } else if (e.key === 'Escape') {
                if (paymentModalOpen) setPaymentModalOpen(false);
                if (heldModalOpen) setHeldModalOpen(false);
                if (receiptModalOpen) setReceiptModalOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart, paymentModalOpen, heldModalOpen, receiptModalOpen]);

    // Filter Products
    const filteredCatalog = catalog.filter((p) => {
        const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
        const q = searchQuery.toLowerCase().trim();
        const matchesSearch = !q ||
            p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q) ||
            (p.barcode && p.barcode.toLowerCase().includes(q));
        return matchesCategory && matchesSearch;
    });

    // Barcode auto-add on Enter
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const q = searchQuery.trim();
        if (!q) return;

        const exactMatch = catalog.find(
            (p) => (p.barcode && p.barcode.toLowerCase() === q.toLowerCase()) || p.sku.toLowerCase() === q.toLowerCase()
        );

        if (exactMatch) {
            addToCart(exactMatch);
            setSearchQuery('');
        }
    };

    // Add to Cart Logic
    const addToCart = (product: CatalogProduct) => {
        setCart((prev) => {
            const existingIndex = prev.findIndex((item) => item.product_id === product.id);

            if (existingIndex > -1) {
                const currentQty = prev[existingIndex].quantity;
                const newQty = currentQty + 1;

                if (product.track_inventory && newQty > product.stock) {
                    setErrorMessage(`Stok ${product.name} tidak mencukupi (sisa: ${product.stock}).`);
                    setTimeout(() => setErrorMessage(null), 3000);
                    return prev;
                }

                const updated = [...prev];
                updated[existingIndex] = {
                    ...updated[existingIndex],
                    quantity: newQty,
                };
                return updated;
            }

            if (product.track_inventory && product.stock <= 0) {
                setErrorMessage(`Produk ${product.name} telah habis.`);
                setTimeout(() => setErrorMessage(null), 3000);
                return prev;
            }

            return [
                ...prev,
                {
                    product_id: product.id,
                    name: product.name,
                    sku: product.sku,
                    unit_price: product.selling_price,
                    quantity: 1,
                    unit_code: product.unit_code,
                    discount_amount: 0,
                    stock: product.stock,
                },
            ];
        });
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart((prev) => {
            return prev.map((item) => {
                if (item.product_id === productId) {
                    const newQty = Math.max(1, item.quantity + delta);
                    return { ...item, quantity: newQty };
                }
                return item;
            });
        });
    };

    const setDirectQuantity = (productId: string, qty: number) => {
        const validQty = Math.max(1, isNaN(qty) ? 1 : qty);
        setCart((prev) =>
            prev.map((item) => (item.product_id === productId ? { ...item, quantity: validQty } : item))
        );
    };

    const removeFromCart = (productId: string) => {
        setCart((prev) => prev.filter((item) => item.product_id !== productId));
    };

    const clearCart = () => {
        if (cart.length === 0) return;
        if (confirm('Kosongkan keranjang belanja kasir saat ini?')) {
            setCart([]);
            setTransactionDiscount(0);
        }
    };

    // Financial calculations
    const subtotal = cart.reduce((acc, item) => acc + (item.quantity * item.unit_price) - item.discount_amount, 0);
    const taxPercentage = store?.tax_percentage ?? 11;
    const taxAmount = Math.round(subtotal * (taxPercentage / 100));
    const grandTotal = Math.max(0, subtotal - transactionDiscount + taxAmount);

    const openPaymentModal = () => {
        setPaidAmount(grandTotal);
        setPaymentModalOpen(true);
    };

    const handleQuickCash = (amount: number) => {
        setPaidAmount(amount);
    };

    const changeAmount = Math.max(0, paidAmount - grandTotal);

    // Process Checkout
    const handleCheckoutSubmit = async () => {
        if (!store) {
            alert('Toko aktif tidak ditemukan.');
            return;
        }

        if (paymentMethod === 'cash' && paidAmount < grandTotal) {
            alert('Jumlah uang tunai kurang dari total belanja.');
            return;
        }

        setProcessingCheckout(true);
        setErrorMessage(null);

        const idempotencyKey = `pos_${store.id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        try {
            const res = await fetch('/pos/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    store_id: store.id,
                    register_id: register?.id,
                    customer_id: selectedCustomerId || null,
                    payment_method: paymentMethod,
                    paid_amount: paidAmount,
                    discount_amount: transactionDiscount,
                    idempotency_key: idempotencyKey,
                    items: cart.map((item) => ({
                        product_id: item.product_id,
                        quantity: item.quantity,
                        discount_amount: item.discount_amount,
                    })),
                }),
            });

            const result = await res.json();

            if (!res.ok || result.status !== 'success') {
                throw new Error(result.message || 'Gagal memproses transaksi.');
            }

            // Success
            setCompletedOrder(result.order);
            setPaymentModalOpen(false);
            setReceiptModalOpen(true);
            setCart([]);
            setTransactionDiscount(0);
        } catch (err: any) {
            setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
        } finally {
            setProcessingCheckout(false);
        }
    };

    // Hold Cart
    const handleHoldCart = async () => {
        if (cart.length === 0) return;
        const note = prompt('Masukkan nama pelanggan / catatan antrean:', 'Antrean ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
        if (note === null) return;

        try {
            const res = await fetch('/pos/hold', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    store_id: store?.id,
                    register_id: register?.id,
                    customer_id: selectedCustomerId || null,
                    reference_note: note,
                    cart_payload: {
                        items: cart,
                        customer_id: selectedCustomerId,
                    },
                }),
            });

            const result = await res.json();
            if (result.status === 'success') {
                setHeldOrders([result.held_order, ...heldOrders]);
                setCart([]);
            }
        } catch (err) {
            alert('Gagal menahan antrean.');
        }
    };

    // Resume Held Cart
    const handleResumeCart = async (held: HeldOrderOption) => {
        try {
            const res = await fetch(`/pos/resume/${held.id}`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
            });
            const result = await res.json();
            if (result.status === 'success' && result.cart_payload?.items) {
                setCart(result.cart_payload.items);
                if (result.cart_payload.customer_id) {
                    setSelectedCustomerId(result.cart_payload.customer_id);
                }
                setHeldOrders(heldOrders.filter((h) => h.id !== held.id));
                setHeldModalOpen(false);
            }
        } catch (err) {
            alert('Gagal mengambil keranjang tertahan.');
        }
    };

    const handlePrintReceipt = () => {
        window.print();
    };

    return (
        <div className="h-screen w-screen overflow-hidden bg-slate-900 text-slate-100 flex flex-col font-sans select-none">
            <Head title={`POS Terminal - ${store?.name || 'Kasir'}`} />

            {/* Error Notification Toast */}
            {errorMessage && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-semibold animate-bounce">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{errorMessage}</span>
                </div>
            )}

            {/* Topbar (Compact Fixed 52px) */}
            <header className="h-[52px] bg-slate-800 border-b border-slate-700/80 px-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard"
                        className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Kembali ke Dashboard"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-blue-500/20">
                            POS
                        </div>
                        <div>
                            <span className="font-bold text-sm text-white leading-none block">
                                {store?.name || 'Toko Retail'}
                            </span>
                            <span className="text-[11px] text-blue-400 font-mono leading-none">
                                {register?.code || 'POS-01'} • {warehouse?.code || 'WH'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Held Orders Trigger */}
                    <button
                        onClick={() => setHeldModalOpen(true)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
                            heldOrders.length > 0
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-lg shadow-amber-500/10'
                                : 'bg-slate-700/50 text-slate-400 hover:text-white'
                        }`}
                    >
                        <PauseCircle className="w-3.5 h-3.5" />
                        <span>Antrean Tertahan</span>
                        {heldOrders.length > 0 && (
                            <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-900 text-[10px] font-bold flex items-center justify-center">
                                {heldOrders.length}
                            </span>
                        )}
                    </button>

                    <div className="text-right hidden sm:block">
                        <div className="text-xs font-semibold text-slate-200">
                            {new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                            Shortcut: F2 (Cari), F4 (Bayar)
                        </div>
                    </div>
                </div>
            </header>

            {/* Main POS Screen Split */}
            <div className="flex-1 flex overflow-hidden">
                {/* LEFT AREA: Catalog & Search (62% width) */}
                <div className="w-[62%] flex flex-col h-full bg-slate-900 border-r border-slate-700/70 overflow-hidden">
                    {/* Search Bar & Scanner Input */}
                    <div className="p-3 bg-slate-800/60 border-b border-slate-700/70">
                        <form onSubmit={handleSearchSubmit} className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Scan Barcode atau ketik nama / SKU produk... (F2)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-24 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-inner"
                            />
                            <div className="absolute right-3 top-2.5 flex items-center gap-1.5 text-slate-400">
                                <Barcode className="w-4 h-4" />
                                <span className="text-[10px] font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                                    AUTO
                                </span>
                            </div>
                        </form>

                        {/* Category Filter Chips */}
                        <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-1 scrollbar-none">
                            <button
                                onClick={() => setSelectedCategory('all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                                    selectedCategory === 'all'
                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                            >
                                Semua Produk ({catalog.length})
                            </button>
                            {categories.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                                        selectedCategory === cat.id
                                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    }`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Product Grid Area with Self-Contained Scroll */}
                    <div className="flex-1 p-3 overflow-y-auto">
                        {filteredCatalog.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500">
                                <Search className="w-10 h-10 mb-2 opacity-40" />
                                <p className="text-sm font-medium">Tidak ada produk yang cocok dengan pencarian.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                {filteredCatalog.map((product) => {
                                    const isOut = product.track_inventory && product.stock <= 0;
                                    const isLow = product.track_inventory && product.stock > 0 && product.stock <= 10;

                                    return (
                                        <button
                                            key={product.id}
                                            onClick={() => addToCart(product)}
                                            disabled={isOut}
                                            className={`p-3 rounded-2xl text-left border flex flex-col justify-between transition-all active:scale-95 ${
                                                isOut
                                                    ? 'bg-slate-800/40 border-slate-800 opacity-60 cursor-not-allowed'
                                                    : 'bg-slate-800/90 border-slate-700/70 hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/5'
                                            }`}
                                        >
                                            <div>
                                                <div className="flex items-start justify-between gap-1 mb-1.5">
                                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900/60 px-1.5 py-0.5 rounded">
                                                        {product.sku}
                                                    </span>
                                                    {product.track_inventory && (
                                                        <span
                                                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                                isOut
                                                                    ? 'bg-rose-500/20 text-rose-400'
                                                                    : isLow
                                                                    ? 'bg-amber-500/20 text-amber-400'
                                                                    : 'bg-emerald-500/20 text-emerald-400'
                                                            }`}
                                                        >
                                                            {isOut ? 'Habis' : `${product.stock} ${product.unit_code}`}
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="font-semibold text-white text-xs line-clamp-2 leading-tight">
                                                    {product.name}
                                                </h3>
                                            </div>

                                            <div className="mt-3 pt-2 border-t border-slate-700/50 flex items-center justify-between">
                                                <span className="font-bold text-sm text-emerald-400 font-mono">
                                                    {formatCurrency(product.selling_price)}
                                                </span>
                                                <div className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors">
                                                    <Plus className="w-3.5 h-3.5" />
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT AREA: Cart & Financial Summary (38% width) */}
                <div className="w-[38%] flex flex-col h-full bg-slate-800/95 overflow-hidden">
                    {/* Customer Selection Header */}
                    <div className="p-3 bg-slate-900/50 border-b border-slate-700/70 flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <select
                            value={selectedCustomerId}
                            onChange={(e) => setSelectedCustomerId(e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                        >
                            {customers.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name} {c.loyalty_points > 0 ? `(${c.loyalty_points} Poin)` : ''}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={clearCart}
                            title="Kosongkan Keranjang"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Cart Items List with Self-Contained Scroll */}
                    <div className="flex-1 px-3 py-2 overflow-y-auto divide-y divide-slate-700/40">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-6">
                                <ShoppingBag className="w-12 h-12 mb-2 opacity-30" />
                                <p className="text-sm font-semibold text-slate-400">Keranjang Masih Kosong</p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Klik produk di sebelah kiri atau scan barcode untuk menambahkan item.
                                </p>
                            </div>
                        ) : (
                            cart.map((item) => (
                                <div key={item.product_id} className="py-2.5 flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="font-semibold text-xs text-white truncate">
                                            {item.name}
                                        </div>
                                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                            {formatCurrency(item.unit_price)} × {item.quantity} {item.unit_code}
                                        </div>
                                    </div>

                                    {/* Stepper Buttons */}
                                    <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-700/80">
                                        <button
                                            onClick={() => updateQuantity(item.product_id, -1)}
                                            className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                                        >
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => setDirectQuantity(item.product_id, parseFloat(e.target.value))}
                                            className="w-10 bg-transparent text-center font-mono font-bold text-xs text-white focus:outline-none"
                                            min="1"
                                        />
                                        <button
                                            onClick={() => updateQuantity(item.product_id, 1)}
                                            className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
                                        >
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>

                                    <div className="text-right min-w-[75px]">
                                        <div className="font-mono font-bold text-xs text-white">
                                            {formatCurrency((item.quantity * item.unit_price) - item.discount_amount)}
                                        </div>
                                        <button
                                            onClick={() => removeFromCart(item.product_id)}
                                            className="text-[10px] text-slate-500 hover:text-rose-400 mt-0.5"
                                        >
                                            Hapus
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Financial Summary & Checkout Footer */}
                    <div className="p-3 bg-slate-900 border-t border-slate-700/80 space-y-2">
                        {/* Subtotal, Discount, Tax Rows */}
                        <div className="space-y-1 text-xs">
                            <div className="flex justify-between text-slate-400">
                                <span>Subtotal Belanja</span>
                                <span className="font-mono text-white">{formatCurrency(subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-slate-400 items-center">
                                <span className="flex items-center gap-1">
                                    Diskon Faktur
                                    <button
                                        onClick={() => {
                                            const d = prompt('Masukkan nominal diskon (Rp):', transactionDiscount.toString());
                                            if (d !== null) setTransactionDiscount(parseFloat(d) || 0);
                                        }}
                                        className="text-[10px] text-blue-400 underline hover:text-blue-300"
                                    >
                                        Ubah
                                    </button>
                                </span>
                                <span className="font-mono text-amber-400">
                                    {transactionDiscount > 0 ? `-${formatCurrency(transactionDiscount)}` : 'Rp 0'}
                                </span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                                <span>PPN ({taxPercentage}%)</span>
                                <span className="font-mono text-white">{formatCurrency(taxAmount)}</span>
                            </div>
                        </div>

                        {/* Grand Total */}
                        <div className="pt-2 border-t border-slate-700/80 flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                                Total Tagihan
                            </span>
                            <span className="text-xl font-black text-emerald-400 font-mono tracking-tight">
                                {formatCurrency(grandTotal)}
                            </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-3 gap-2 pt-1">
                            <button
                                onClick={handleHoldCart}
                                disabled={cart.length === 0}
                                className="py-2.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30 disabled:opacity-40 text-amber-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95"
                            >
                                <PauseCircle className="w-3.5 h-3.5" />
                                <span>Hold</span>
                            </button>

                            <button
                                onClick={openPaymentModal}
                                disabled={cart.length === 0}
                                className="col-span-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                <span>Bayar (F4)</span>
                                <span className="font-mono text-xs font-normal opacity-90">
                                    {formatCurrency(grandTotal)}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {paymentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-bold text-white flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-emerald-400" />
                                    <span>Penyelesaian Pembayaran</span>
                                </h2>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Faktur POS • {cart.length} Jenis Barang
                                </p>
                            </div>
                            <button
                                onClick={() => setPaymentModalOpen(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Total Due Banner */}
                            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-700 flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Total Yang Harus Dibayar
                                </span>
                                <span className="text-2xl font-black text-emerald-400 font-mono">
                                    {formatCurrency(grandTotal)}
                                </span>
                            </div>

                            {/* Payment Method Selector */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                                    Metode Pembayaran
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    <button
                                        onClick={() => setPaymentMethod('cash')}
                                        className={`py-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 border transition-all ${
                                            paymentMethod === 'cash'
                                                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                                                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-700/50'
                                        }`}
                                    >
                                        <DollarSign className="w-4 h-4" />
                                        <span>Tunai</span>
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('qris')}
                                        className={`py-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 border transition-all ${
                                            paymentMethod === 'qris'
                                                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                                                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-700/50'
                                        }`}
                                    >
                                        <QrCode className="w-4 h-4" />
                                        <span>QRIS</span>
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('debit')}
                                        className={`py-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 border transition-all ${
                                            paymentMethod === 'debit'
                                                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                                                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-700/50'
                                        }`}
                                    >
                                        <CreditCard className="w-4 h-4" />
                                        <span>Debit</span>
                                    </button>
                                    <button
                                        onClick={() => setPaymentMethod('credit')}
                                        className={`py-2 rounded-xl text-xs font-semibold flex flex-col items-center gap-1 border transition-all ${
                                            paymentMethod === 'credit'
                                                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                                                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-700/50'
                                        }`}
                                    >
                                        <CreditCard className="w-4 h-4" />
                                        <span>Kredit</span>
                                    </button>
                                </div>
                            </div>

                            {/* Cash Input & Suggestions */}
                            {paymentMethod === 'cash' ? (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                            Uang Diterima Dari Pelanggan
                                        </label>
                                        <input
                                            type="number"
                                            value={paidAmount}
                                            onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xl font-bold font-mono text-white text-right focus:outline-none focus:border-emerald-500"
                                            autoFocus
                                        />
                                    </div>

                                    {/* Quick Cash Buttons */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleQuickCash(grandTotal)}
                                            className="py-1.5 bg-slate-700 hover:bg-slate-600 text-xs font-bold text-emerald-400 rounded-lg transition-colors"
                                        >
                                            Uang Pas
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleQuickCash(Math.ceil(grandTotal / 50000) * 50000)}
                                            className="py-1.5 bg-slate-700 hover:bg-slate-600 text-xs font-medium text-slate-200 rounded-lg transition-colors"
                                        >
                                            {formatCurrency(Math.ceil(grandTotal / 50000) * 50000)}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleQuickCash(Math.ceil(grandTotal / 100000) * 100000)}
                                            className="py-1.5 bg-slate-700 hover:bg-slate-600 text-xs font-medium text-slate-200 rounded-lg transition-colors"
                                        >
                                            {formatCurrency(Math.ceil(grandTotal / 100000) * 100000)}
                                        </button>
                                    </div>

                                    {/* Change (Kembalian) Box */}
                                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700 flex items-center justify-between">
                                        <span className="text-xs font-medium text-slate-400">Kembalian</span>
                                        <span className="text-lg font-bold font-mono text-emerald-400">
                                            {formatCurrency(changeAmount)}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                        No. Referensi / Approval Code EDC (Opsional)
                                    </label>
                                    <input
                                        type="text"
                                        value={paymentReference}
                                        onChange={(e) => setPaymentReference(e.target.value)}
                                        placeholder="Contoh: REF-88129302"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            )}

                            {/* Submit Button */}
                            <div className="pt-2 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setPaymentModalOpen(false)}
                                    className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold rounded-xl transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCheckoutSubmit}
                                    disabled={processingCheckout || (paymentMethod === 'cash' && paidAmount < grandTotal)}
                                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
                                >
                                    {processingCheckout ? 'Memproses Transaksi...' : 'Konfirmasi & Selesai'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Thermal Receipt Modal */}
            {receiptModalOpen && completedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col">
                        <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
                            <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                <Receipt className="w-4 h-4 text-emerald-400" />
                                <span>Struk Transaksi Pembayaran</span>
                            </h3>
                            <button
                                onClick={() => setReceiptModalOpen(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Thermal Paper Look */}
                        <div className="p-6 bg-white text-slate-900 font-mono text-xs space-y-2 select-text" id="printable-receipt">
                            <div className="text-center pb-2 border-b border-dashed border-slate-400">
                                <h2 className="font-bold text-sm tracking-tight">{store?.name}</h2>
                                <p className="text-[10px] text-slate-600">POS Enterprise Multi-Store</p>
                                <p className="text-[10px] text-slate-600">{completedOrder.order_number}</p>
                            </div>

                            <div className="text-[10px] space-y-0.5 text-slate-700">
                                <div className="flex justify-between">
                                    <span>Waktu:</span>
                                    <span>{new Date(completedOrder.completed_at || completedOrder.created_at).toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Kasir:</span>
                                    <span>{completedOrder.cashier?.name || 'Kasir'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Pelanggan:</span>
                                    <span>{completedOrder.customer?.name || 'Walk-in'}</span>
                                </div>
                            </div>

                            {/* Item Lines */}
                            <div className="py-2 border-t border-b border-dashed border-slate-400 space-y-1">
                                {completedOrder.items?.map((item: any) => (
                                    <div key={item.id} className="space-y-0.5">
                                        <div className="font-bold">{item.product_name}</div>
                                        <div className="flex justify-between text-[11px] text-slate-600">
                                            <span>{item.quantity} × {formatCurrency(item.unit_price)}</span>
                                            <span className="font-bold text-slate-900">{formatCurrency(item.subtotal)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Financial totals */}
                            <div className="text-xs space-y-1 pt-1">
                                <div className="flex justify-between">
                                    <span>Subtotal:</span>
                                    <span>{formatCurrency(completedOrder.subtotal)}</span>
                                </div>
                                {parseFloat(completedOrder.discount_amount) > 0 && (
                                    <div className="flex justify-between text-rose-600">
                                        <span>Diskon:</span>
                                        <span>-{formatCurrency(completedOrder.discount_amount)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span>PPN (11%):</span>
                                    <span>{formatCurrency(completedOrder.tax_amount)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-sm pt-1 border-t border-slate-800">
                                    <span>TOTAL:</span>
                                    <span>{formatCurrency(completedOrder.total_amount)}</span>
                                </div>
                                <div className="flex justify-between pt-1 text-[11px]">
                                    <span>Metode:</span>
                                    <span className="uppercase">{completedOrder.payment_method}</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                    <span>Dibayar:</span>
                                    <span>{formatCurrency(completedOrder.paid_amount)}</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                    <span>Kembali:</span>
                                    <span>{formatCurrency(completedOrder.change_amount)}</span>
                                </div>
                            </div>

                            <div className="text-center pt-3 text-[10px] text-slate-500 border-t border-dashed border-slate-400">
                                Terima kasih atas kunjungan Anda!
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-slate-900 border-t border-slate-700 flex items-center justify-between gap-3">
                            <button
                                onClick={handlePrintReceipt}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                            >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Cetak Struk</span>
                            </button>
                            <button
                                onClick={() => {
                                    setReceiptModalOpen(false);
                                    setCompletedOrder(null);
                                }}
                                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all"
                            >
                                Transaksi Baru
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Held Orders Modal */}
            {heldModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-800 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <PauseCircle className="w-5 h-5 text-amber-400" />
                                <span>Daftar Transaksi Tertahan (Held Carts)</span>
                            </h2>
                            <button
                                onClick={() => setHeldModalOpen(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 max-h-80 overflow-y-auto space-y-2">
                            {heldOrders.length === 0 ? (
                                <p className="text-center text-sm text-slate-400 py-8">
                                    Tidak ada transaksi tertahan saat ini.
                                </p>
                            ) : (
                                heldOrders.map((h) => (
                                    <div
                                        key={h.id}
                                        className="p-3 bg-slate-900 rounded-2xl border border-slate-700 flex items-center justify-between"
                                    >
                                        <div>
                                            <div className="font-semibold text-white text-xs">
                                                {h.reference_note || 'Antrean'}
                                            </div>
                                            <div className="text-[11px] text-slate-400 mt-0.5">
                                                {h.cart_payload?.items?.length || 0} Barang • {new Date(h.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleResumeCart(h)}
                                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1 transition-all"
                                            >
                                                <PlayCircle className="w-3.5 h-3.5" />
                                                <span>Lanjutkan</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
