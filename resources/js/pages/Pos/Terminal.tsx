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
    Percent,
    Clock,
    Lock,
    ArrowDownLeft,
    ArrowUpRight,
    ShieldCheck,
    RefreshCw,
    Tag
} from 'lucide-react';

interface CatalogProduct {
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
    category_id: string;
    category_name: string;
    unit_code: string;
    image_url: string | null;
    selling_price: number;
    stock: number;
    track_inventory: boolean;
}

interface CartItem {
    product_id: string;
    name: string;
    sku: string;
    image_url?: string | null;
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
        paper_size?: '58mm' | '80mm';
        header_text?: string | null;
        footer_text?: string | null;
        show_logo?: boolean;
        show_cashier?: boolean;
        show_customer?: boolean;
        show_tax_details?: boolean;
        show_barcode?: boolean;
        auto_print?: boolean;
        open_cash_drawer?: boolean;
        auto_cut?: boolean;
        connection_type?: string;
    } | null;
    warehouse: {
        id: string;
        name: string;
        code: string;
    } | null;
    activeShift?: any | null;
    shiftSummary?: any | null;
    catalog: CatalogProduct[];
    categories: CategoryOption[];
    customers: CustomerOption[];
    heldOrders: HeldOrderOption[];
}

export default function PosTerminal({ store, register, warehouse, activeShift: initialActiveShift, shiftSummary: initialShiftSummary, catalog, categories, customers, heldOrders: initialHeldOrders }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
    const [transactionDiscount, setTransactionDiscount] = useState<number>(0);
    const [heldOrders, setHeldOrders] = useState<HeldOrderOption[]>(initialHeldOrders);

    // Shift States
    const [activeShift, setActiveShift] = useState<any>(initialActiveShift);
    const [shiftSummary, setShiftSummary] = useState<any>(initialShiftSummary);
    const [openShiftModalOpen, setOpenShiftModalOpen] = useState(false);
    const [movementModalOpen, setMovementModalOpen] = useState(false);
    const [closeShiftModalOpen, setCloseShiftModalOpen] = useState(false);
    const [shiftReportModalOpen, setShiftReportModalOpen] = useState(false);
    const [shiftReportData, setShiftReportData] = useState<any>(null);
    const [loadingReport, setLoadingReport] = useState(false);

    // Shift Form Inputs
    const [openingCashInput, setOpeningCashInput] = useState<number>(200000);
    const [openingNotes, setOpeningNotes] = useState('');
    const [movementType, setMovementType] = useState<'cash_in' | 'cash_out'>('cash_in');
    const [movementAmount, setMovementAmount] = useState<number>(0);
    const [movementReason, setMovementReason] = useState('Modal Tambahan');
    const [movementNotes, setMovementNotes] = useState('');
    const [actualCashCount, setActualCashCount] = useState<number>(0);
    const [closingNotes, setClosingNotes] = useState('');

    // Modals
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [heldModalOpen, setHeldModalOpen] = useState(false);
    const [receiptModalOpen, setReceiptModalOpen] = useState(false);
    const [completedOrder, setCompletedOrder] = useState<any>(null);

    // Payment State (Single & Split)
    const [isSplitPayment, setIsSplitPayment] = useState(false);
    const [splitRows, setSplitRows] = useState<Array<{
        id: string;
        payment_method: 'cash' | 'qris' | 'debit' | 'credit' | 'transfer';
        amount: number;
        paid_amount: number;
        reference_number: string;
    }>>([]);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'debit' | 'credit'>('cash');
    const [paidAmount, setPaidAmount] = useState<number>(0);
    const [paymentReference, setPaymentReference] = useState('');
    const [processingCheckout, setProcessingCheckout] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Coupon & Promotion State
    const [couponInput, setCouponInput] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<{
        promotion: { id: string; name: string; code: string; type: string };
        discount_amount: number;
        description?: string;
    } | null>(null);
    const [validatingCoupon, setValidatingCoupon] = useState(false);
    const [couponMessage, setCouponMessage] = useState<string | null>(null);

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
                    image_url: product.image_url,
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
            setAppliedCoupon(null);
            setCouponInput('');
            setCouponMessage(null);
        }
    };

    // Financial calculations
    const subtotal = cart.reduce((acc, item) => acc + (item.quantity * item.unit_price) - item.discount_amount, 0);
    const couponDiscount = appliedCoupon ? appliedCoupon.discount_amount : 0;
    const totalDiscount = transactionDiscount + couponDiscount;
    const taxPercentage = store?.tax_percentage ?? 11;
    const taxAmount = Math.round(Math.max(0, subtotal - totalDiscount) * (taxPercentage / 100));
    const grandTotal = Math.max(0, subtotal - totalDiscount + taxAmount);

    // Coupon Actions
    const handleApplyCoupon = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = couponInput.trim();
        if (!code) return;

        if (cart.length === 0) {
            setCouponMessage('Keranjang belanja masih kosong.');
            return;
        }

        setValidatingCoupon(true);
        setCouponMessage(null);

        try {
            const res = await fetch('/promotions/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    code: code,
                    subtotal: subtotal,
                    items: cart.map(i => ({
                        product_id: i.product_id,
                        quantity: i.quantity,
                        unit_price: i.unit_price,
                    })),
                    customer_id: selectedCustomerId || null,
                }),
            });

            const data = await res.json();
            if (res.ok && data.status === 'success') {
                setAppliedCoupon(data.data);
                setCouponMessage(`Kupon ${data.data.promotion.code} aktif: Hemat ${formatCurrency(data.data.discount_amount)}`);
            } else {
                setAppliedCoupon(null);
                setCouponMessage(data.message || 'Kupon tidak dapat digunakan.');
            }
        } catch (err: any) {
            setCouponMessage('Gagal memvalidasi kupon.');
        } finally {
            setValidatingCoupon(false);
        }
    };

    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponInput('');
        setCouponMessage(null);
    };

    const openPaymentModal = () => {
        setPaidAmount(grandTotal);
        setIsSplitPayment(false);
        setSplitRows([
            { id: '1', payment_method: 'cash', amount: Math.floor(grandTotal / 2), paid_amount: Math.floor(grandTotal / 2), reference_number: '' },
            { id: '2', payment_method: 'qris', amount: Math.ceil(grandTotal / 2), paid_amount: Math.ceil(grandTotal / 2), reference_number: '' },
        ]);
        setPaymentModalOpen(true);
    };

    const handleQuickCash = (amount: number) => {
        setPaidAmount(amount);
    };

    const changeAmount = Math.max(0, paidAmount - grandTotal);

    // Split Calculations
    const splitTotalAllocated = splitRows.reduce((acc, row) => acc + (row.amount || 0), 0);
    const splitRemaining = Math.max(0, grandTotal - splitTotalAllocated);
    const splitChange = splitRows.reduce((acc, row) => {
        if (row.payment_method === 'cash') {
            return acc + Math.max(0, (row.paid_amount || row.amount) - row.amount);
        }
        return acc;
    }, 0);

    // Refresh active shift
    const refreshActiveShift = async () => {
        if (!store) return;
        try {
            const res = await fetch(`/shifts/active?store_id=${store.id}&register_id=${register?.id || ''}`);
            const data = await res.json();
            setActiveShift(data.active_shift);
            setShiftSummary(data.summary);
        } catch (e) {
            console.error('Failed to refresh active shift', e);
        }
    };

    // Open Shift Submit
    const handleOpenShiftSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!store || !register) return;
        try {
            const res = await fetch('/shifts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    store_id: store.id,
                    register_id: register.id,
                    opening_cash: openingCashInput,
                    notes: openingNotes,
                }),
            });
            const data = await res.json();
            if (data.status === 'success') {
                setActiveShift(data.shift);
                setOpenShiftModalOpen(false);
                refreshActiveShift();
            } else {
                setErrorMessage(data.message || 'Gagal membuka shift kasir.');
            }
        } catch (err: any) {
            setErrorMessage(err.message || 'Gagal membuka shift kasir.');
        }
    };

    // Cash Movement Submit
    const handleCashMovementSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeShift) return;
        try {
            const res = await fetch(`/shifts/${activeShift.id}/cash-movement`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    type: movementType,
                    amount: movementAmount,
                    reason: movementReason,
                    notes: movementNotes,
                }),
            });
            const data = await res.json();
            if (data.status === 'success') {
                setMovementModalOpen(false);
                setMovementAmount(0);
                setMovementNotes('');
                refreshActiveShift();
            } else {
                setErrorMessage(data.message || 'Gagal mencatat mutasi kas.');
            }
        } catch (err: any) {
            setErrorMessage(err.message || 'Gagal mencatat mutasi kas.');
        }
    };

    // Close Shift Submit
    const handleCloseShiftSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeShift) return;
        try {
            const res = await fetch(`/shifts/${activeShift.id}/close`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({
                    actual_cash: actualCashCount,
                    notes: closingNotes,
                }),
            });
            const data = await res.json();
            if (data.status === 'success') {
                setCloseShiftModalOpen(false);
                setShiftReportData(data.report);
                setShiftReportModalOpen(true);
                setActiveShift(null);
                setShiftSummary(null);
            } else {
                setErrorMessage(data.message || 'Gagal menutup shift kasir.');
            }
        } catch (err: any) {
            setErrorMessage(err.message || 'Gagal menutup shift kasir.');
        }
    };

    // Process Checkout
    const handleCheckoutSubmit = async () => {
        if (!store) {
            setErrorMessage('Cabang toko aktif tidak ditemukan. Silakan pilih toko terlebih dahulu.');
            return;
        }

        if (isSplitPayment) {
            if (splitTotalAllocated < grandTotal) {
                setErrorMessage(`Total pembayaran gabungan (${formatCurrency(splitTotalAllocated)}) kurang dari total belanja (${formatCurrency(grandTotal)}). Kurang: ${formatCurrency(grandTotal - splitTotalAllocated)}`);
                return;
            }
        } else {
            if (paymentMethod === 'cash' && paidAmount < grandTotal) {
                setErrorMessage('Jumlah uang tunai yang diterima kurang dari total belanja.');
                return;
            }
        }

        setProcessingCheckout(true);
        setErrorMessage(null);

        const idempotencyKey = `pos_${store.id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        const checkoutPayload: any = {
            store_id: store.id,
            register_id: register?.id,
            shift_id: activeShift?.id || null,
            customer_id: selectedCustomerId || null,
            discount_amount: transactionDiscount,
            coupon_code: appliedCoupon ? appliedCoupon.promotion.code : null,
            idempotency_key: idempotencyKey,
            items: cart.map((item) => ({
                product_id: item.product_id,
                quantity: item.quantity,
                discount_amount: item.discount_amount,
            })),
        };

        if (isSplitPayment) {
            checkoutPayload.payment_method = 'split';
            checkoutPayload.paid_amount = splitTotalAllocated;
            checkoutPayload.payments = splitRows.map((r) => ({
                payment_method: r.payment_method,
                amount: r.amount,
                paid_amount: r.paid_amount || r.amount,
                reference_number: r.reference_number || null,
            }));
        } else {
            checkoutPayload.payment_method = paymentMethod;
            checkoutPayload.paid_amount = paidAmount;
            checkoutPayload.payment_reference = paymentReference || null;
        }

        try {
            const res = await fetch('/pos/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify(checkoutPayload),
            });

            let result: any = null;
            try {
                result = await res.json();
            } catch {
                throw new Error('Terjadi kendala koneksi server saat memproses transaksi.');
            }

            if (!res.ok || result.status !== 'success') {
                throw new Error(result.message || 'Gagal memproses transaksi kasir.');
            }

            // Success
            setCompletedOrder(result.order);
            setPaymentModalOpen(false);
            setReceiptModalOpen(true);
            setCart([]);
            setTransactionDiscount(0);
            setAppliedCoupon(null);
            setCouponInput('');
            setCouponMessage(null);
            refreshActiveShift();
            if (register?.auto_print) {
                setTimeout(() => {
                    window.print();
                }, 400);
            }
        } catch (err: any) {
            setErrorMessage(err.message || 'Terjadi kesalahan sistem saat transaksi.');
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
            setErrorMessage('Gagal menahan antrean keranjang.');
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
            setErrorMessage('Gagal mengambil keranjang yang ditahan.');
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
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-rose-600/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-semibold border border-rose-400/40">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1">{errorMessage}</span>
                    <button
                        onClick={() => setErrorMessage(null)}
                        className="p-1 hover:bg-rose-700/80 rounded-lg transition-colors ml-2"
                        title="Tutup pesan"
                    >
                        <X className="w-4 h-4" />
                    </button>
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
                        <div className="px-2 h-7 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 flex items-center justify-center font-black text-white text-xs shadow-md shadow-red-500/20">
                            RIPos
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

                {/* Center: Shift Status & Quick Actions */}
                <div className="flex items-center gap-2">
                    {activeShift ? (
                        <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700/80 px-2.5 py-1 rounded-xl">
                            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                <span className="font-semibold">{activeShift.cashier?.name ?? 'Shift Aktif'}</span>
                                <span className="text-slate-500">|</span>
                                <span className="font-mono text-emerald-300 font-bold">
                                    Kas: {formatCurrency(shiftSummary?.expected_cash ?? activeShift.opening_cash)}
                                </span>
                            </div>

                            <button
                                onClick={() => {
                                    setMovementAmount(0);
                                    setMovementModalOpen(true);
                                }}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium flex items-center gap-1 border border-slate-700 transition-colors"
                                title="Catat Kas Masuk / Kas Keluar"
                            >
                                <DollarSign className="w-3 h-3 text-emerald-400" />
                                <span>Kas In/Out</span>
                            </button>

                            <button
                                onClick={() => {
                                    setActualCashCount(shiftSummary?.expected_cash ?? activeShift.opening_cash);
                                    setCloseShiftModalOpen(true);
                                }}
                                className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-[11px] font-semibold flex items-center gap-1 border border-amber-500/30 transition-colors"
                                title="Tutup Shift Kasir"
                            >
                                <Lock className="w-3 h-3 text-amber-400" />
                                <span>Tutup Shift</span>
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setOpenShiftModalOpen(true)}
                            className="px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all animate-pulse"
                        >
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Shift Belum Dibuka • Klik Buka Shift</span>
                        </button>
                    )}
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
                                            className={`group rounded-2xl text-left border flex flex-col justify-between transition-all duration-150 active:scale-95 overflow-hidden ${
                                                isOut
                                                    ? 'bg-slate-800/40 border-slate-800 opacity-60 cursor-not-allowed'
                                                    : 'bg-slate-800/90 border-slate-700/70 hover:border-blue-500/60 hover:shadow-xl hover:shadow-blue-500/10'
                                            }`}
                                        >
                                            {/* Product Image Thumbnail */}
                                            <div className="relative w-full h-32 bg-slate-900 overflow-hidden flex items-center justify-center">
                                                <img
                                                    src={product.image_url || '/images/default-product.svg'}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    onError={(e) => {
                                                        const target = e.currentTarget;
                                                        if (!target.src.includes('default-product.svg')) {
                                                            target.src = '/images/default-product.svg';
                                                        }
                                                    }}
                                                    loading="lazy"
                                                />

                                                {/* SKU Overlay */}
                                                <div className="absolute top-2 left-2 z-10">
                                                    <span className="text-[10px] font-mono text-slate-200 bg-slate-950/80 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-slate-700/60 shadow-sm">
                                                        {product.sku}
                                                    </span>
                                                </div>

                                                {/* Stock Overlay */}
                                                {product.track_inventory && (
                                                    <div className="absolute top-2 right-2 z-10">
                                                        <span
                                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md shadow-sm border ${
                                                                isOut
                                                                    ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                                                                    : isLow
                                                                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                                                                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                                                            }`}
                                                        >
                                                            {isOut ? 'Habis' : `${product.stock} ${product.unit_code}`}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Product Info */}
                                            <div className="p-3 flex-1 flex flex-col justify-between w-full">
                                                <div>
                                                    <div className="text-[10px] text-blue-400 font-medium uppercase tracking-wider mb-0.5 truncate">
                                                        {product.category_name}
                                                    </div>
                                                    <h3 className="font-semibold text-white text-xs line-clamp-2 leading-snug group-hover:text-blue-300 transition-colors">
                                                        {product.name}
                                                    </h3>
                                                </div>

                                                <div className="mt-2.5 pt-2 border-t border-slate-700/50 flex items-center justify-between">
                                                    <span className="font-bold text-sm text-emerald-400 font-mono">
                                                        {formatCurrency(product.selling_price)}
                                                    </span>
                                                    <div className="w-7 h-7 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </div>
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
                                    {/* Cart Item Thumbnail */}
                                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-slate-700/60 flex-shrink-0">
                                        <img
                                            src={item.image_url || '/images/default-product.svg'}
                                            alt={item.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                const target = e.currentTarget;
                                                if (!target.src.includes('default-product.svg')) {
                                                    target.src = '/images/default-product.svg';
                                                }
                                            }}
                                            loading="lazy"
                                        />
                                    </div>

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
                        {/* Coupon / Voucher Section */}
                        <div className="bg-slate-800/80 border border-slate-700/70 rounded-xl p-2">
                            {appliedCoupon ? (
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <div className="p-1 bg-pink-500/10 rounded-md text-pink-400">
                                            <Tag className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="truncate">
                                            <span className="font-bold text-white font-mono">{appliedCoupon.promotion.code}</span>
                                            <span className="text-slate-400 text-[10px] ml-1.5 truncate">
                                                (-{formatCurrency(appliedCoupon.discount_amount)})
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRemoveCoupon}
                                        className="text-slate-400 hover:text-rose-400 p-1 rounded transition-colors"
                                        title="Hapus Kupon"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleApplyCoupon} className="flex gap-1.5">
                                    <div className="relative flex-1">
                                        <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            placeholder="Kode Promo / Kupon..."
                                            value={couponInput}
                                            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                                            className="w-full pl-7 pr-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 uppercase font-mono"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={validatingCoupon || !couponInput.trim()}
                                        className="px-2.5 py-1 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
                                    >
                                        {validatingCoupon ? 'Cek...' : 'Terapkan'}
                                    </button>
                                </form>
                            )}

                            {couponMessage && (
                                <p className={`text-[10px] mt-1.5 ${appliedCoupon ? 'text-emerald-400 font-medium' : 'text-rose-400'}`}>
                                    {couponMessage}
                                </p>
                            )}
                        </div>

                        {/* Subtotal, Discount, Tax Rows */}
                        <div className="space-y-1 text-xs">
                            <div className="flex justify-between text-slate-400">
                                <span>Subtotal Belanja</span>
                                <span className="font-mono text-white">{formatCurrency(subtotal)}</span>
                            </div>
                            {appliedCoupon && (
                                <div className="flex justify-between text-slate-400 items-center">
                                    <span className="flex items-center gap-1 text-pink-400">
                                        <span>Diskon Kupon ({appliedCoupon.promotion.code})</span>
                                    </span>
                                    <span className="font-mono text-pink-400 font-semibold">
                                        -{formatCurrency(couponDiscount)}
                                    </span>
                                </div>
                            )}
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
                            {/* Inline Modal Error */}
                            {errorMessage && (
                                <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-medium flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                                        <span>{errorMessage}</span>
                                    </div>
                                    <button type="button" onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}

                            {/* Total Due Banner */}
                            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-700 flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Total Yang Harus Dibayar
                                </span>
                                <span className="text-2xl font-black text-emerald-400 font-mono">
                                    {formatCurrency(grandTotal)}
                                </span>
                            </div>

                            {/* Payment Mode Selector (Single vs Split) */}
                            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900 rounded-xl border border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setIsSplitPayment(false)}
                                    className={`py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                        !isSplitPayment
                                            ? 'bg-blue-600 text-white shadow'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    Pembayaran Tunggal
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsSplitPayment(true);
                                        if (splitRows.length === 0) {
                                            setSplitRows([
                                                { id: '1', payment_method: 'cash', amount: Math.floor(grandTotal / 2), paid_amount: Math.floor(grandTotal / 2), reference_number: '' },
                                                { id: '2', payment_method: 'qris', amount: Math.ceil(grandTotal / 2), paid_amount: Math.ceil(grandTotal / 2), reference_number: '' },
                                            ]);
                                        }
                                    }}
                                    className={`py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                        isSplitPayment
                                            ? 'bg-blue-600 text-white shadow'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    Bagi Pembayaran (Split Multi-Metode)
                                </button>
                            </div>

                            {!isSplitPayment ? (
                                <>
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
                                </>
                            ) : (
                                /* Split Payment Mode */
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                            Rincian Split Payment
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const rem = Math.max(0, grandTotal - splitTotalAllocated);
                                                setSplitRows([
                                                    ...splitRows,
                                                    {
                                                        id: Date.now().toString(),
                                                        payment_method: 'qris',
                                                        amount: rem,
                                                        paid_amount: rem,
                                                        reference_number: '',
                                                    },
                                                ]);
                                            }}
                                            className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>+ Tambah Metode</span>
                                        </button>
                                    </div>

                                    {/* Rows */}
                                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                        {splitRows.map((row, index) => (
                                            <div key={row.id} className="p-2.5 bg-slate-900 rounded-xl border border-slate-700 flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={row.payment_method}
                                                        onChange={(e) => {
                                                            const newRows = [...splitRows];
                                                            newRows[index].payment_method = e.target.value as any;
                                                            setSplitRows(newRows);
                                                        }}
                                                        className="w-32 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white"
                                                    >
                                                        <option value="cash">Tunai (Cash)</option>
                                                        <option value="qris">QRIS</option>
                                                        <option value="debit">Kartu Debit</option>
                                                        <option value="credit">Kartu Kredit</option>
                                                        <option value="transfer">Transfer Bank</option>
                                                    </select>

                                                    <div className="flex-1 relative">
                                                        <span className="absolute left-2.5 top-1 text-[11px] text-slate-400">Rp</span>
                                                        <input
                                                            type="number"
                                                            value={row.amount || ''}
                                                            onChange={(e) => {
                                                                const newRows = [...splitRows];
                                                                const val = parseFloat(e.target.value) || 0;
                                                                newRows[index].amount = val;
                                                                newRows[index].paid_amount = val;
                                                                setSplitRows(newRows);
                                                            }}
                                                            placeholder="0"
                                                            className="w-full pl-8 pr-2 py-1 bg-slate-800 border border-slate-600 rounded-lg text-xs font-mono font-bold text-white text-right"
                                                        />
                                                    </div>

                                                    {splitRows.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setSplitRows(splitRows.filter((_, i) => i !== index))}
                                                            className="p-1 rounded text-slate-400 hover:text-rose-400"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="No. Referensi / EDC (Opsional)"
                                                        value={row.reference_number}
                                                        onChange={(e) => {
                                                            const newRows = [...splitRows];
                                                            newRows[index].reference_number = e.target.value;
                                                            setSplitRows(newRows);
                                                        }}
                                                        className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-[11px] text-slate-200 placeholder-slate-500"
                                                    />

                                                    {splitRemaining > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newRows = [...splitRows];
                                                                newRows[index].amount += splitRemaining;
                                                                newRows[index].paid_amount = newRows[index].amount;
                                                                setSplitRows(newRows);
                                                            }}
                                                            className="px-2 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 rounded text-[10px] font-semibold"
                                                        >
                                                            + Sisa {formatCurrency(splitRemaining)}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Split Summary Footer */}
                                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-700 space-y-1 text-xs">
                                        <div className="flex justify-between text-slate-400">
                                            <span>Total Terbayar:</span>
                                            <span className="font-mono text-white font-bold">{formatCurrency(splitTotalAllocated)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Sisa Tagihan:</span>
                                            <span className={`font-mono font-bold ${splitRemaining > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                {splitRemaining > 0 ? formatCurrency(splitRemaining) : 'LUNAS (Rp 0)'}
                                            </span>
                                        </div>
                                        {splitChange > 0 && (
                                            <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                                                <span>Kembalian Tunai:</span>
                                                <span className="font-mono text-emerald-400 font-bold">{formatCurrency(splitChange)}</span>
                                            </div>
                                        )}
                                    </div>
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
                                    disabled={
                                        processingCheckout ||
                                        (isSplitPayment && splitTotalAllocated < grandTotal) ||
                                        (!isSplitPayment && paymentMethod === 'cash' && paidAmount < grandTotal)
                                    }
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
                        <div
                            className={`p-6 bg-white text-slate-900 font-mono space-y-2 select-text mx-auto transition-all ${
                                register?.paper_size === '58mm' ? 'max-w-[270px] text-[11px]' : 'max-w-sm text-xs'
                            }`}
                            id="printable-receipt"
                        >
                            {(register?.show_logo ?? true) && (
                                <div className="text-center pb-2 border-b border-dashed border-slate-400 space-y-0.5">
                                    <h2 className="font-bold text-sm tracking-tight uppercase">{store?.name}</h2>
                                    {store?.address && <p className="text-[10px] text-slate-600">{store.address}</p>}
                                    {register?.header_text && (
                                        <p className="text-[10px] text-slate-700 italic font-medium">{register.header_text}</p>
                                    )}
                                    <p className="text-[10px] text-slate-600 font-bold">{completedOrder.order_number}</p>
                                </div>
                            )}

                            <div className="text-[10px] space-y-0.5 text-slate-700">
                                <div className="flex justify-between">
                                    <span>Waktu:</span>
                                    <span>{new Date(completedOrder.completed_at || completedOrder.created_at).toLocaleString('id-ID')}</span>
                                </div>
                                {(register?.show_cashier ?? true) && (
                                    <div className="flex justify-between">
                                        <span>Kasir:</span>
                                        <span>{completedOrder.cashier?.name || 'Kasir'}</span>
                                    </div>
                                )}
                                {(register?.show_customer ?? true) && (
                                    <div className="flex justify-between">
                                        <span>Pelanggan:</span>
                                        <span>{completedOrder.customer?.name || 'Umum'}</span>
                                    </div>
                                )}
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
                                {(register?.show_tax_details ?? true) && (
                                    <div className="flex justify-between">
                                        <span>PPN (11%):</span>
                                        <span>{formatCurrency(completedOrder.tax_amount)}</span>
                                    </div>
                                )}
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

                            <div className="text-center pt-3 text-[10px] text-slate-600 border-t border-dashed border-slate-400 leading-tight space-y-1">
                                <div>{register?.footer_text || 'Terima kasih atas kunjungan Anda!'}</div>
                                <div className="text-[9px] text-slate-400 font-sans tracking-tight">
                                    Powered by RIPos (Republik Indonesia POS) • phoebehub.com
                                </div>
                            </div>

                            {(register?.show_barcode ?? true) && (
                                <div className="text-center pt-2 border-t border-dashed border-slate-300">
                                    <div className="inline-block tracking-[0.25em] font-mono font-bold text-xs">
                                        ||| | || |||| | || | |||
                                    </div>
                                    <div className="text-[9px] text-slate-500 font-mono">
                                        {completedOrder.order_number}
                                    </div>
                                </div>
                            )}
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

            {/* MODAL 1: BUKA SHIFT KASIR (POS) */}
            {openShiftModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5 text-blue-400" />
                                <h3 className="text-base font-bold text-white">Buka Shift Kasir Baru</h3>
                            </div>
                            <button
                                onClick={() => setOpenShiftModalOpen(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleOpenShiftSubmit} className="space-y-4">
                            <div className="p-3 bg-slate-900 rounded-2xl border border-slate-700 space-y-1 text-xs">
                                <div className="flex justify-between text-slate-400">
                                    <span>Toko / Cabang:</span>
                                    <span className="text-white font-medium">{store?.name}</span>
                                </div>
                                <div className="flex justify-between text-slate-400">
                                    <span>Register / Terminal:</span>
                                    <span className="text-blue-400 font-mono font-semibold">{register?.name} ({register?.code})</span>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1">
                                    Modal Kas Awal di Laci (IDR)
                                </label>
                                <input
                                    type="number"
                                    value={openingCashInput || ''}
                                    onChange={(e) => setOpeningCashInput(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-lg text-white font-mono font-bold focus:outline-none focus:border-blue-500"
                                    min="0"
                                    required
                                    autoFocus
                                />
                                <div className="flex gap-2 mt-2">
                                    {[100000, 200000, 300000, 500000].map((amt) => (
                                        <button
                                            key={amt}
                                            type="button"
                                            onClick={() => setOpeningCashInput(amt)}
                                            className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-200 font-mono transition-colors"
                                        >
                                            {amt / 1000}k
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1">
                                    Catatan Pembukaan (Opsional)
                                </label>
                                <textarea
                                    value={openingNotes}
                                    onChange={(e) => setOpeningNotes(e.target.value)}
                                    rows={2}
                                    placeholder="Catatan serah terima kas modal awal..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setOpenShiftModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20"
                                >
                                    Buka Shift Sekarang
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 2: CASH MOVEMENT (IN/OUT) (POS) */}
            {movementModalOpen && activeShift && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                            <div className="flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-emerald-400" />
                                <h3 className="text-base font-bold text-white">Mutasi Kas Laci</h3>
                            </div>
                            <button
                                onClick={() => setMovementModalOpen(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCashMovementSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl border border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMovementType('cash_in');
                                        setMovementReason('Modal Tambahan');
                                    }}
                                    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors ${
                                        movementType === 'cash_in'
                                            ? 'bg-emerald-600 text-white shadow'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <ArrowDownLeft className="w-4 h-4" />
                                    <span>Kas Masuk (+ Kas)</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setMovementType('cash_out');
                                        setMovementReason('Beli Operasional/Konsumsi');
                                    }}
                                    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors ${
                                        movementType === 'cash_out'
                                            ? 'bg-rose-600 text-white shadow'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <ArrowUpRight className="w-4 h-4" />
                                    <span>Kas Keluar (- Kas)</span>
                                </button>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1">
                                    Nominal Uang (IDR)
                                </label>
                                <input
                                    type="number"
                                    value={movementAmount || ''}
                                    onChange={(e) => setMovementAmount(parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-lg text-white font-mono font-bold focus:outline-none focus:border-blue-500"
                                    min="1"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1">
                                    Alasan Mutasi
                                </label>
                                <select
                                    value={movementReason}
                                    onChange={(e) => setMovementReason(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                                >
                                    {movementType === 'cash_in' ? (
                                        <>
                                            <option value="Modal Tambahan">Modal Kembalian Tambahan</option>
                                            <option value="Tukar Pecahan">Tukar Pecahan Uang</option>
                                            <option value="Koreksi Kas">Koreksi Kelebihan Kas</option>
                                            <option value="Lainnya">Lainnya</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="Beli Operasional/Konsumsi">Beli Konsumsi / Operasional Toko</option>
                                            <option value="Beli ATK/Perlengkapan">Beli ATK / Kertas Thermal Struk</option>
                                            <option value="Setor Kas ke Brankas">Setor Kas Tengah Shift ke Brankas</option>
                                            <option value="Lainnya">Lainnya</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1">
                                    Keterangan Detail (Opsional)
                                </label>
                                <textarea
                                    value={movementNotes}
                                    onChange={(e) => setMovementNotes(e.target.value)}
                                    rows={2}
                                    placeholder="Catatan keperluan mutasi uang kas..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setMovementModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20"
                                >
                                    Simpan Mutasi
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 3: TUTUP SHIFT KASIR (POS) */}
            {closeShiftModalOpen && activeShift && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                            <div className="flex items-center gap-2">
                                <Lock className="w-5 h-5 text-amber-400" />
                                <h3 className="text-base font-bold text-white">Tutup Shift Kasir</h3>
                            </div>
                            <button
                                onClick={() => setCloseShiftModalOpen(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCloseShiftSubmit} className="space-y-4">
                            {/* Live Shift Financials Breakdown */}
                            <div className="p-3 bg-slate-900 rounded-2xl border border-slate-700 space-y-1.5 text-xs">
                                <div className="flex justify-between text-slate-400">
                                    <span>Kas Awal Modal:</span>
                                    <span className="font-mono text-slate-200">{formatCurrency(activeShift.opening_cash)}</span>
                                </div>
                                <div className="flex justify-between text-slate-400">
                                    <span>Penjualan Tunai:</span>
                                    <span className="font-mono text-emerald-400 font-semibold">{formatCurrency(shiftSummary?.cash_sales ?? 0)}</span>
                                </div>
                                <div className="flex justify-between text-slate-400">
                                    <span>Mutasi Kas In / Out:</span>
                                    <span className="font-mono text-slate-200">
                                        +{formatCurrency(shiftSummary?.cash_in ?? 0)} / -{formatCurrency(shiftSummary?.cash_out ?? 0)}
                                    </span>
                                </div>
                                <div className="flex justify-between pt-1 border-t border-slate-800 text-slate-300 font-bold">
                                    <span>Kas Laci Diharapkan (Expected):</span>
                                    <span className="font-mono text-blue-400">{formatCurrency(shiftSummary?.expected_cash ?? activeShift.opening_cash)}</span>
                                </div>
                                <div className="flex justify-between text-[11px] text-slate-500 pt-0.5">
                                    <span>Non-Tunai (QRIS/EDC/Transfer):</span>
                                    <span className="font-mono text-purple-400">{formatCurrency(shiftSummary?.total_non_cash_sales ?? 0)}</span>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1">
                                    Hitungan Uang Fisik Kasir di Laci (Actual Cash)
                                </label>
                                <input
                                    type="number"
                                    value={actualCashCount || ''}
                                    onChange={(e) => setActualCashCount(parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xl text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                                    min="0"
                                    required
                                    autoFocus
                                />

                                {/* Live Difference Preview */}
                                <div className="mt-2 flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-700 text-xs">
                                    <span className="text-slate-400">Estimasi Selisih:</span>
                                    {(() => {
                                        const exp = shiftSummary?.expected_cash ?? activeShift.opening_cash;
                                        const diff = actualCashCount - exp;
                                        if (diff === 0) {
                                            return <span className="text-emerald-400 font-bold font-mono">Rp 0 (Cocok / Seimbang)</span>;
                                        } else if (diff > 0) {
                                            return <span className="text-blue-400 font-bold font-mono">+{formatCurrency(diff)} (Surplus)</span>;
                                        } else {
                                            return <span className="text-rose-400 font-bold font-mono">{formatCurrency(diff)} (Defisit)</span>;
                                        }
                                    })()}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1">
                                    Catatan Penutupan Shift (Opsional)
                                </label>
                                <textarea
                                    value={closingNotes}
                                    onChange={(e) => setClosingNotes(e.target.value)}
                                    rows={2}
                                    placeholder="Catatan penjelasan serah terima atau alasan selisih..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                                />
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCloseShiftModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-500/20"
                                >
                                    Finalisasi & Tutup Shift
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 4: Z-REPORT MODAL (POS) */}
            {shiftReportModalOpen && shiftReportData && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-lg bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                            <div className="flex items-center gap-2">
                                <Receipt className="w-5 h-5 text-emerald-400" />
                                <h3 className="text-base font-bold text-white">Laporan Kasir Selesai (Z-Report)</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => window.print()}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-colors"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    <span>Cetak Slip</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setShiftReportModalOpen(false);
                                        setShiftReportData(null);
                                    }}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Thermal Slip Content */}
                        <div className="bg-white text-slate-900 font-mono text-xs p-5 rounded-2xl space-y-3 select-text shadow-inner">
                            <div className="text-center border-b border-dashed border-slate-400 pb-2">
                                <h4 className="font-bold text-sm tracking-tight">{shiftReportData.shift.store_name}</h4>
                                <p className="text-[11px] text-slate-600">SLIP PENUTUPAN SHIFT (Z-REPORT)</p>
                                <p className="text-[10px] text-slate-500">Register: {shiftReportData.shift.register_name} ({shiftReportData.shift.register_code})</p>
                                <p className="text-[10px] text-slate-500">Kasir: {shiftReportData.shift.cashier_name}</p>
                                <p className="text-[10px] text-slate-500">Waktu Buka: {shiftReportData.shift.opened_at}</p>
                                <p className="text-[10px] text-slate-500">Waktu Tutup: {shiftReportData.shift.closed_at}</p>
                            </div>

                            <div className="space-y-1 border-b border-dashed border-slate-400 pb-2">
                                <div className="flex justify-between">
                                    <span>Kas Awal:</span>
                                    <span>{formatCurrency(shiftReportData.financials.opening_cash)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Penjualan Tunai:</span>
                                    <span className="font-bold">{formatCurrency(shiftReportData.financials.cash_sales)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Kas Masuk (In):</span>
                                    <span>+{formatCurrency(shiftReportData.financials.cash_in)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Kas Keluar (Out):</span>
                                    <span>-{formatCurrency(shiftReportData.financials.cash_out)}</span>
                                </div>
                                <div className="flex justify-between font-bold border-t border-slate-300 pt-1">
                                    <span>Total Kas Diharapkan:</span>
                                    <span>{formatCurrency(shiftReportData.financials.expected_cash)}</span>
                                </div>
                            </div>

                            <div className="space-y-1 border-b border-dashed border-slate-400 pb-2">
                                <div className="flex justify-between">
                                    <span>Uang Fisik Dihitung:</span>
                                    <span className="font-bold">{formatCurrency(shiftReportData.shift.actual_cash)}</span>
                                </div>
                                <div className="flex justify-between font-bold">
                                    <span>Selisih Kas:</span>
                                    <span>
                                        {shiftReportData.shift.cash_difference === 0
                                            ? 'Rp 0 (COCOK)'
                                            : formatCurrency(shiftReportData.shift.cash_difference)}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1 text-[11px] text-slate-600">
                                <div className="flex justify-between">
                                    <span>Total Non-Tunai:</span>
                                    <span>{formatCurrency(shiftReportData.financials.total_non_cash_sales)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-slate-900">
                                    <span>Total Penjualan Shift:</span>
                                    <span>{formatCurrency(shiftReportData.financials.total_sales)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Jumlah Transaksi:</span>
                                    <span>{shiftReportData.financials.order_count} Struk</span>
                                </div>
                            </div>

                            {shiftReportData.shift.notes && (
                                <p className="text-[10px] italic text-slate-500 border-t border-dashed border-slate-300 pt-2">
                                    Catatan: {shiftReportData.shift.notes}
                                </p>
                            )}

                            <div className="text-center pt-2 text-[9px] text-slate-400 font-sans border-t border-dashed border-slate-300">
                                RIPos (Republik Indonesia POS) • phoebehub.com
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

