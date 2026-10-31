# MASTER SPECIFICATION & PROMPT

# Enterprise SaaS Point of Sale (POS) --- Laravel, PostgreSQL, React, Docker Compose

> Dokumen ini adalah master prompt yang dapat langsung diberikan kepada
> AI Coding Assistant seperti Antigravity, Cursor, Claude Code,
> Windsurf, atau coding agent lain. Tujuannya membangun aplikasi SaaS
> POS multi-tenant yang benar-benar berfungsi, bukan sekadar prototype
> atau dashboard statis.

------------------------------------------------------------------------

## 1. Peran AI dan tujuan proyek

Bertindaklah sebagai tim engineering senior yang terdiri dari:

-   Software Architect
-   Senior Laravel/PHP Backend Engineer
-   Senior React/TypeScript Frontend Engineer
-   PostgreSQL Database Architect
-   UI/UX Designer
-   DevOps Engineer
-   QA dan Security Engineer

Tugas Anda adalah menganalisis repository, merancang arsitektur,
mengimplementasikan, menguji, dan mendokumentasikan aplikasi
**Enterprise SaaS POS** yang aman, scalable, maintainable, responsive,
dan siap dikembangkan untuk production.

Jangan hanya membuat mockup, halaman statis, atau tombol tanpa fungsi.
Setiap modul inti harus terhubung dengan database dan business logic
yang benar.

### Prinsip utama

1.  Multi-tenant: satu platform melayani banyak perusahaan/tenant.
2.  Multi-store: setiap tenant dapat memiliki banyak toko.
3.  Multi-warehouse: setiap tenant dapat memiliki banyak gudang.
4.  Multi-register: setiap toko dapat memiliki beberapa mesin/register
    kasir.
5.  Role-based access control dengan permission granular.
6.  Transaksi, stok, pembayaran, dan laporan harus konsisten.
7.  Semua perhitungan finansial penting dilakukan dan divalidasi di
    backend.
8.  Semua aktivitas penting dapat ditelusuri melalui audit log.
9.  Aplikasi harus responsive, mudah digunakan, dan memiliki pengalaman
    kasir yang cepat.
10. Kualitas implementasi dan keamanan lebih penting daripada sekadar
    banyaknya fitur.

------------------------------------------------------------------------

## 2. Technology stack

Gunakan stack berikut. Periksa kompatibilitas versi sebelum instalasi
dan gunakan versi stabil yang saling mendukung.

### Backend

-   Laravel versi stabil terbaru yang kompatibel dengan PHP yang
    dipilih.
-   PHP 8.3 atau versi stabil yang kompatibel.
-   REST API untuk integrasi eksternal dan kebutuhan client terpisah.
-   Laravel Sanctum untuk autentikasi API bila diperlukan.
-   Laravel Policies dan Gates untuk otorisasi.
-   Laravel Form Request untuk validasi.
-   Laravel Events, Listeners, Jobs, Queues, Notifications, dan
    Scheduler.
-   Service/action classes untuk business logic.
-   Laravel Storage untuk file dan gambar.
-   OpenAPI/Swagger untuk dokumentasi API.

### Frontend

-   React.
-   TypeScript dengan strict mode.
-   Inertia.js untuk integrasi Laravel dan React.
-   Tailwind CSS.
-   shadcn/ui.
-   Lucide icons.
-   React Hook Form dan Zod.
-   TanStack Table untuk data table.
-   Recharts untuk grafik.
-   Zustand hanya untuk state client yang memang perlu dibagikan.

Gunakan komponen reusable dan hindari duplikasi UI maupun business
logic.

### Database dan infrastruktur

-   PostgreSQL sebagai database utama.
-   Redis untuk cache, queue, dan kebutuhan locking yang sesuai.
-   Docker dan Docker Compose.
-   Nginx.
-   PHP-FPM.
-   Queue worker.
-   Scheduler.
-   Mailpit untuk development email bila diperlukan.
-   pgAdmin opsional untuk development.

### Prinsip data

-   Gunakan `NUMERIC/DECIMAL` atau integer minor units untuk uang;
    jangan gunakan floating point.
-   Gunakan UUID/ULID bila sesuai kebutuhan.
-   Gunakan foreign key, unique constraint, check constraint, dan index
    yang tepat.
-   Gunakan timestamp dan timezone secara konsisten.
-   Gunakan soft delete hanya untuk data yang memang layak
    di-soft-delete.
-   Data historis transaksi dan keuangan tidak boleh dihapus
    sembarangan.
-   Simpan waktu dalam UTC dan tampilkan sesuai timezone tenant/toko.

------------------------------------------------------------------------

## 3. Konsep SaaS dan multi-tenancy

Satu platform melayani banyak tenant/perusahaan. Setiap tenant dapat
mempunyai:

-   Banyak toko.
-   Banyak gudang.
-   Banyak karyawan.
-   Banyak kasir/register.
-   Banyak customer.
-   Banyak supplier.
-   Banyak produk.
-   Banyak metode pembayaran.
-   Banyak konfigurasi harga, pajak, dan promosi.

### Rekomendasi awal

Gunakan **shared PostgreSQL database dengan `tenant_id`** pada seluruh
tabel tenant-owned. Desain harus memungkinkan evolusi ke database
terpisah untuk tenant enterprise jika suatu saat diperlukan.

### Ketentuan isolasi tenant

-   Tenant tidak boleh membaca atau memodifikasi data tenant lain.
-   Jangan hanya mengandalkan filter di frontend.
-   Terapkan tenant context melalui middleware/service yang teruji.
-   Terapkan query scoping secara konsisten.
-   Gunakan authorization policy pada setiap operasi sensitif.
-   Validasi kepemilikan relasi, termasuk store, warehouse, product,
    customer, dan transaction.
-   Pertimbangkan PostgreSQL Row Level Security sebagai lapisan
    pertahanan tambahan, bukan pengganti authorization aplikasi.
-   Buat automated test yang membuktikan tenant A tidak dapat mengakses
    data tenant B.
-   Hindari menerima `tenant_id` dari client sebagai sumber kebenaran;
    ambil dari konteks user yang telah diautentikasi.

### Platform Super Admin

Super Admin platform dapat:

-   Melihat dan mengelola tenant.
-   Mengaktifkan atau menangguhkan tenant.
-   Mengelola paket dan subscription.
-   Melihat penggunaan layanan.
-   Melihat statistik platform.
-   Mengelola konfigurasi global.
-   Mengakses audit platform dengan pembatasan dan pencatatan yang
    jelas.

Akses Super Admin ke data tenant harus dibatasi, diaudit, dan tidak
menjadi jalan pintas untuk melewati keamanan.

------------------------------------------------------------------------

## 4. Role, user, dan permission

Implementasikan RBAC dengan permission granular dan pembatasan
berdasarkan tenant, toko, dan gudang.

### Role awal

1.  Platform Super Admin
2.  Tenant Owner
3.  Company Admin
4.  Store Manager / Kepala Toko
5.  Supervisor
6.  Cashier / Kasir
7.  Warehouse Staff
8.  Sales Representative
9.  Finance Staff
10. Auditor / Viewer

Role harus dapat dikonfigurasi sesuai kebutuhan tenant.

### Contoh permission

-   Dashboard: view.
-   POS: create transaction.
-   POS: hold/resume transaction.
-   Sales: cancel transaction.
-   Sales: refund/return.
-   Discount: apply.
-   Discount: approve.
-   Product: view/create/update/archive.
-   Inventory: view/adjust/transfer/opname.
-   Employee: view/create/update.
-   Shift: open/close/approve.
-   Reports: view/export.
-   Payment: configure/reconcile/refund.
-   Store: manage.
-   Warehouse: manage.
-   Promotion: manage.
-   Subscription: manage.
-   Settings: manage.
-   Audit log: view.

Permission harus bisa dibatasi berdasarkan toko/gudang yang ditugaskan.
Jangan hanya mengandalkan nama role di frontend.

------------------------------------------------------------------------

## 5. Alur aplikasi dan navigasi

### Alur umum

``` text
Landing Page
    |
    +--> Login
    |
    +--> Register Tenant / Join Tenant
              |
              v
        Authentication
              |
              v
        Resolve Tenant + Role + Store
              |
              +--> Platform Super Admin --> SaaS Dashboard
              |
              +--> Owner / Admin --> Management Dashboard
              |
              +--> Store Manager / Supervisor --> Store Dashboard
              |
              +--> Cashier --> POS / Cashier
              |
              +--> Warehouse Staff --> Warehouse Dashboard
              |
              +--> Sales Representative --> Sales Dashboard
```

User yang berwenang harus dapat berpindah dari dashboard manajemen ke
POS tanpa membuat akun terpisah. Kasir diarahkan langsung ke POS setelah
login, tetapi akses tambahan tetap mengikuti permission.

### Landing page

Buat landing page SaaS profesional dengan:

-   Hero section dan CTA.
-   Penjelasan manfaat produk.
-   Feature overview.
-   Preview halaman POS.
-   Preview dashboard analytics.
-   Pricing plans.
-   FAQ.
-   Testimonial placeholder yang tidak diklaim sebagai testimoni nyata.
-   Kontak.
-   Login dan register.

### Navigasi dashboard

-   Sidebar yang dapat collapse.
-   Topbar.
-   Breadcrumb.
-   Store selector.
-   Notification center.
-   User profile.
-   Search/navigation bila bermanfaat.
-   Menu tampil sesuai permission.

------------------------------------------------------------------------

## 6. Tenant onboarding dan subscription SaaS

### Tenant onboarding

-   Registrasi pemilik usaha.
-   Verifikasi email.
-   Pembuatan tenant.
-   Profil bisnis.
-   Logo dan identitas toko.
-   Alamat dan kontak.
-   Timezone.
-   Currency default IDR.
-   Konfigurasi pajak.
-   Pembuatan toko pertama.
-   Pembuatan gudang awal.
-   Pembuatan register kasir.
-   Undang karyawan.
-   Import produk awal.
-   Checklist onboarding.

### Subscription

-   Paket Free/Trial, Basic, Pro, Enterprise (nama dan harga dapat
    dikonfigurasi).
-   Monthly dan annual billing.
-   Trial period.
-   Status subscription.
-   Tanggal mulai dan berakhir.
-   Grace period.
-   Riwayat pembayaran.
-   Invoice subscription.
-   Pengingat masa berakhir.
-   Suspend/reactivate tenant.
-   Feature entitlements.
-   Batas jumlah toko, user, gudang, transaksi, atau fitur sesuai paket.
-   Usage monitoring.

Jangan mengunci data tenant saat subscription habis. Terapkan kebijakan
akses yang jelas, masa tenggang, dan kemampuan export data.

### Dashboard platform

-   Total tenant.
-   Tenant aktif/nonaktif.
-   Registrasi tenant baru.
-   Subscription aktif/kedaluwarsa.
-   MRR dan ARR berdasarkan transaksi subscription yang valid.
-   Pendapatan subscription.
-   Tingkat churn bila datanya tersedia.
-   Penggunaan resource dan fitur.

Jangan menyebut angka estimasi sebagai angka aktual. Definisikan rumus
metrik secara eksplisit.

------------------------------------------------------------------------

## 7. Store dan register management

### Store management

-   Store code dan nama.
-   Alamat, telepon, email.
-   Logo.
-   Jam operasional.
-   Manager.
-   Status.
-   Timezone.
-   Konfigurasi pajak.
-   Harga khusus toko.
-   Gudang default.
-   Karyawan yang ditugaskan.
-   Laporan khusus toko.

### Register management

-   Register code dan nama.
-   Store assignment.
-   Status aktif/nonaktif.
-   Printer configuration.
-   Cash drawer configuration bila didukung.
-   Shift aktif.
-   Riwayat penggunaan.
-   Pembatasan satu shift aktif per register sesuai kebijakan.

User yang memiliki akses ke beberapa toko dapat memilih toko aktif.
Semua transaksi harus menyimpan referensi tenant, store, register,
cashier, dan shift yang valid.

------------------------------------------------------------------------

## 8. Product management

### Data produk

-   Product name.
-   SKU unik sesuai scope yang ditentukan.
-   Barcode dan multiple barcode.
-   Product code.
-   Image.
-   Description.
-   Category dan subcategory.
-   Brand.
-   Unit/satuan.
-   Variant dan attributes.
-   Purchase cost.
-   Selling price.
-   Retail/wholesale price.
-   Tax category.
-   Minimum/maximum stock.
-   Product status.
-   Track inventory flag.
-   Batch/lot bila diperlukan.
-   Expiration date bila diperlukan.
-   Serial number bila diperlukan.
-   Composite/bundle product.
-   Product price history.
-   Cost history.

### Fitur

-   Create, read, update, archive.
-   Search nama, SKU, barcode, brand, kategori.
-   Filter dan sorting.
-   Bulk import/export CSV/XLSX.
-   Bulk price update.
-   Product image upload.
-   Variant management.
-   Multiple price lists.
-   Store-specific pricing.
-   Barcode label printing bila didukung.

Validasi SKU/barcode harus mempertimbangkan scope uniqueness yang
dipilih, misalnya per tenant atau global.

------------------------------------------------------------------------

## 9. Category, brand, unit, dan product bundle

Buat master data untuk:

-   Kategori bertingkat.
-   Brand.
-   Satuan.
-   Konversi satuan.
-   Product variant.
-   Attribute seperti ukuran/warna.
-   Bundle/composite product.
-   Paket produk.

Untuk bundle, definisikan apakah stok komponen dikurangi ketika
transaksi. Jangan membuat stok bundle dan komponen menjadi tidak
konsisten.

------------------------------------------------------------------------

## 10. Customer dan CRM

### Customer management

-   Customer code.
-   Nama.
-   Telepon.
-   Email.
-   Alamat.
-   Tanggal lahir opsional.
-   Kategori/segmentasi.
-   Membership level.
-   Loyalty points.
-   Purchase history.
-   Total spending.
-   Customer balance.
-   Credit limit jika fitur kredit diaktifkan.
-   Deposit/prepaid balance.
-   Notes.
-   Status.

### CRM

-   Segmentasi pelanggan.
-   Pelanggan baru dan pelanggan aktif.
-   Frekuensi pembelian.
-   Rata-rata nilai transaksi.
-   Produk favorit.
-   Riwayat komplain/retur bila diperlukan.
-   Loyalty point earn/redeem.
-   Voucher pelanggan.

Lindungi data pribadi customer dan batasi akses sesuai kebutuhan kerja.

------------------------------------------------------------------------

## 11. Supplier dan purchasing

### Supplier

-   Supplier code.
-   Nama dan kontak.
-   Alamat.
-   Email/telepon.
-   Tax information bila relevan.
-   Payment terms.
-   Outstanding balance.
-   Purchase history.
-   Status.

### Purchasing workflow

``` text
Purchase Request
    -> Approval
    -> Purchase Order
    -> Goods Receipt
    -> Inventory Update
    -> Supplier Invoice
    -> Supplier Payment
```

### Fitur purchasing

-   Purchase request.
-   Purchase order.
-   Approval workflow.
-   Partial receiving.
-   Goods receipt.
-   Purchase invoice.
-   Purchase return.
-   Supplier payment.
-   Purchase cost history.
-   Supplier balance.
-   Purchase reports.

Penerimaan barang harus mencatat kuantitas yang benar-benar diterima,
bukan otomatis menganggap seluruh PO diterima.

------------------------------------------------------------------------

## 12. Warehouse dan inventory management

### Warehouse

-   Multiple warehouse per tenant.
-   Warehouse code/name.
-   Address.
-   Warehouse manager.
-   Store association.
-   Status.
-   Warehouse location/bin bila dibutuhkan.

### Inventory

-   Stock per warehouse.
-   Stock per store.
-   Available stock.
-   Reserved stock.
-   Damaged stock.
-   Expired stock.
-   Stock movement.
-   Stock adjustment.
-   Stock opname.
-   Stock transfer.
-   Inventory valuation.
-   Minimum stock alert.
-   Stock history.
-   Batch/lot/serial tracking jika diaktifkan.

### Inventory ledger

Jangan hanya mengubah angka stok. Setiap perubahan wajib menghasilkan
inventory movement yang immutable atau hanya dapat dikoreksi melalui
reversal yang tercatat.

Jenis movement:

-   Opening balance.
-   Purchase receipt.
-   Sales issue.
-   Sales return.
-   Purchase return.
-   Transfer out.
-   Transfer in.
-   Adjustment in/out.
-   Stock opname adjustment.
-   Damage/expiry write-off.

### Transfer workflow

``` text
Create Transfer
    -> Select Source Warehouse
    -> Select Destination Warehouse
    -> Add Items
    -> Submit
    -> Approval (if required)
    -> Dispatch
    -> Receive
    -> Update Destination Stock
    -> Complete
```

Dukung partial shipment dan partial receipt jika diperlukan. Transfer
antar gudang harus menjaga konsistensi stok dan status barang dalam
perjalanan.

### Stock opname

-   Jadwal opname.
-   Snapshot stok sistem.
-   Input hasil hitung.
-   Variance.
-   Approval.
-   Adjustment movement.
-   Audit trail.
-   Export hasil opname.

------------------------------------------------------------------------

## 13. POS / cashier module

Modul POS adalah bagian paling penting dari aplikasi. Prioritaskan
kecepatan, kemudahan penggunaan, dan konsistensi transaksi.

### Layout desktop

-   Area kiri sekitar 60--70% untuk pencarian, filter, kategori, dan
    product grid.
-   Area kanan sekitar 30--40% untuk cart dan checkout.
-   Header tetap.
-   Product grid memiliki scroll sendiri.
-   Cart memiliki scroll sendiri.
-   Ringkasan total dan tombol checkout tetap terlihat.
-   Tidak ada page-level scrolling pada layar kasir desktop jika
    viewport memungkinkan.

### Product area kiri

-   Search input.
-   Search by product name.
-   Search by SKU.
-   Search by barcode.
-   Category filter.
-   Brand filter.
-   Product grid.
-   Product image.
-   Product name.
-   SKU.
-   Price.
-   Stock availability.
-   Variant selection.
-   Quick add to cart.

### Cart area kanan

-   Selected products.
-   Product variant.
-   Quantity increment/decrement.
-   Manual quantity entry dengan validasi.
-   Unit.
-   Unit price.
-   Item discount.
-   Remove item.
-   Cart note.
-   Customer selector.
-   Hold transaction.
-   Resume transaction.
-   Clear cart dengan konfirmasi.
-   Subtotal.
-   Total item discount.
-   Transaction discount.
-   Tax.
-   Service charge bila diaktifkan.
-   Grand total.

### POS UX

-   Touch-friendly.
-   Keyboard shortcuts.
-   Barcode scanner support (keyboard wedge).
-   Debounced search.
-   Product image fallback.
-   Loading skeleton.
-   Empty state.
-   Error state.
-   Confirmation dialog untuk tindakan berisiko.
-   Focus management.
-   Accessibility dasar.
-   Responsive untuk tablet dan mobile.

### Keyboard shortcuts

Sediakan shortcut yang dapat dikonfigurasi dan tampilkan daftar bantuan.
Contoh:

-   F2: fokus pencarian produk.
-   F4: buka pembayaran.
-   Esc: tutup dialog.
-   Ctrl/Cmd + Enter: aksi konfirmasi bila aman.
-   Shortcut lain tidak boleh mengganggu shortcut browser atau
    aksesibilitas.

### Hold/resume

-   Simpan transaksi sementara.
-   Beri nama/catatan opsional.
-   Simpan cashier, store, register, dan waktu.
-   Resume transaksi dengan validasi ulang harga, promo, dan stok.
-   Tentukan masa kedaluwarsa hold cart.

------------------------------------------------------------------------

## 14. Checkout dan sales transaction engine

### Alur checkout

1.  Validasi user, tenant, store, register, dan shift.
2.  Ambil ulang data produk dan harga dari server.
3.  Validasi status produk.
4.  Validasi stok dan aturan overselling.
5.  Validasi customer bila digunakan.
6.  Hitung ulang diskon.
7.  Hitung pajak.
8.  Hitung total.
9.  Validasi metode pembayaran.
10. Proses pembayaran atau buat payment pending sesuai metode.
11. Commit transaksi sesuai status pembayaran.
12. Buat inventory movement.
13. Buat payment records.
14. Buat receipt/invoice.
15. Publish event untuk laporan dan notifikasi.
16. Tampilkan hasil transaksi.

### Ketentuan penting

-   Semua total dihitung ulang di backend.
-   Jangan mempercayai total dari browser.
-   Gunakan database transaction.
-   Gunakan row-level locking pada stok yang relevan.
-   Gunakan idempotency key untuk mencegah checkout ganda.
-   Validasi shift masih aktif.
-   Validasi register dan store.
-   Cegah transaksi duplikat.
-   Tentukan aturan kapan stok dikurangi: saat pembayaran berhasil atau
    saat order dikonfirmasi, sesuai payment workflow.
-   Kegagalan payment tidak boleh menyebabkan stok terpotong tanpa
    aturan reservasi yang jelas.
-   Simpan snapshot nama, SKU, harga, tax, dan diskon pada sale item
    agar histori tidak berubah ketika master produk diubah.

### Nomor transaksi

Buat nomor transaksi yang unik dan mudah dibaca. Jangan menggunakan pola
yang rawan collision saat transaksi paralel. Nomor transaksi dapat
memiliki prefix toko/tanggal dengan sequence yang aman di database.

------------------------------------------------------------------------

## 15. Multiple payment management

Dukung metode pembayaran:

-   Cash.
-   Bank transfer.
-   Debit card.
-   Credit card.
-   QRIS.
-   E-wallet.
-   Virtual account.
-   Payment gateway.
-   Store credit.
-   Customer deposit.
-   Split/mixed payment.

### Fitur

-   Multiple payment methods per sale.
-   Split payment.
-   Partial payment jika jenis order mendukung.
-   Cash received.
-   Change calculation.
-   Payment reference.
-   Payment status.
-   Payment reconciliation.
-   Refund.
-   Payment history.
-   Gateway transaction ID.
-   Webhook event log.

### Contoh split payment

Total transaksi Rp150.000:

-   Cash Rp50.000.
-   QRIS Rp100.000.

Jumlah pembayaran yang tervalidasi harus sesuai dengan total yang harus
dibayar sebelum transaksi dianggap lunas.

### Payment gateway

-   Gunakan provider adapter/interface.
-   Jangan hardcode satu provider ke seluruh business logic.
-   Verifikasi signature webhook.
-   Idempotent webhook handling.
-   Simpan request/response penting dengan masking data sensitif.
-   Jangan menganggap pembayaran sukses berdasarkan redirect atau
    konfirmasi frontend.
-   Tangani pending, success, failed, expired, dan refunded.

------------------------------------------------------------------------

## 16. Tax, fee, dan rounding

-   Konfigurasi pajak per tenant/store sesuai kebutuhan.
-   Tax inclusive atau exclusive.
-   Tax category per produk.
-   Service charge opsional.
-   Rounding rule yang terdokumentasi.
-   Diskon sebelum atau sesudah pajak sesuai aturan yang dipilih.
-   Simpan snapshot perhitungan pada transaksi.
-   Jangan mengubah transaksi lama ketika konfigurasi pajak berubah.

Perhitungan harus konsisten antara receipt, laporan, dan payment.

------------------------------------------------------------------------

## 17. Shift dan cash management

### Shift management

-   Shift schedule.
-   Assign cashier.
-   Register assignment.
-   Open shift.
-   Opening cash.
-   Cash in.
-   Cash out.
-   Cash deposit/withdrawal.
-   Closing shift.
-   Expected cash.
-   Actual cash.
-   Cash variance.
-   Supervisor approval.
-   Shift report.
-   Shift history.

### Alur shift

1.  Kasir login.
2.  Memilih toko/register bila diizinkan.
3.  Membuka shift.
4.  Memasukkan opening cash.
5.  Melakukan transaksi.
6.  Mencatat cash in/out dengan alasan.
7.  Menutup shift.
8.  Sistem menghitung expected cash.
9.  Kasir memasukkan actual cash.
10. Sistem menghitung selisih.
11. Supervisor melakukan review/approval jika diwajibkan.

Expected cash harus memperhitungkan opening cash, cash sales, cash
refunds, cash in, cash out, dan koreksi yang sah. Jangan mencampur
pembayaran non-tunai dengan kas fisik.

Cegah dua shift aktif pada register yang sama kecuali kebijakan bisnis
secara eksplisit mengizinkan.

------------------------------------------------------------------------

## 18. Refund, return, exchange, dan cancellation

-   Full refund.
-   Partial refund.
-   Return item.
-   Exchange product.
-   Cancel transaction sebelum finalisasi sesuai aturan.
-   Approval untuk tindakan sensitif.
-   Refund ke metode pembayaran asal jika memungkinkan.
-   Refund manual dengan alasan dan referensi.
-   Restock atau tidak restock berdasarkan kondisi barang.
-   Return inventory movement.
-   Payment reversal/refund record.
-   Audit log.

Jangan menghapus sale yang sudah selesai. Gunakan status dan
reversal/credit note agar histori tetap utuh.

------------------------------------------------------------------------

## 19. Promotion, discount, coupon, dan voucher engine

Dukung:

-   Percentage discount.
-   Fixed amount discount.
-   Buy X Get Y.
-   Buy 1 Get 1.
-   Bundle promotion.
-   Product-specific discount.
-   Category discount.
-   Brand discount.
-   Customer-specific discount.
-   Membership discount.
-   Coupon code.
-   Voucher.
-   Minimum purchase.
-   Maximum discount.
-   Time-based promotion.
-   Day-of-week promotion.
-   Store-specific promotion.
-   Payment-method-specific promotion.

### Aturan promosi

-   Start/end date.
-   Time window.
-   Usage limit.
-   Per-customer usage limit.
-   Overall usage limit.
-   Priority.
-   Stacking rules.
-   Excluded products/categories.
-   Approval requirement.
-   Promotion usage history.

Promotion engine harus deterministik dan dapat diuji. Simpan snapshot
promosi/diskon pada transaksi. Validasi ulang semua aturan di backend.

------------------------------------------------------------------------

## 20. Sales management dan commission

-   Sales history.
-   Sales order.
-   Invoice.
-   Sales return.
-   Refund.
-   Sales by store.
-   Sales by cashier.
-   Sales by product/category.
-   Sales by customer.
-   Sales by payment method.
-   Sales by shift.
-   Sales representative.
-   Sales target.
-   Commission rules.
-   Commission calculation.
-   Commission approval.
-   Commission payout report.

Definisikan dasar komisi: omzet bruto, omzet neto, margin, produk
tertentu, atau target. Komisi harus memperhitungkan refund/cancel sesuai
kebijakan.

------------------------------------------------------------------------

## 21. Finance dan accounting foundation

### Cash/finance management

-   Cash account.
-   Bank account.
-   Cash inflow.
-   Cash outflow.
-   Expenses.
-   Income.
-   Cash transfer.
-   Daily cash report.
-   Payment reconciliation.
-   Accounts payable.
-   Accounts receivable.
-   Customer outstanding balance.
-   Supplier outstanding balance.

### Accounting-ready design

Siapkan struktur untuk pengembangan:

-   Chart of accounts.
-   Journal entries.
-   General ledger.
-   Trial balance.
-   Profit and loss.
-   Balance sheet.
-   Cash flow statement.

Jangan menyebut laporan laba bersih yang akurat jika cost, expense, tax,
dan accounting entries belum lengkap. Bedakan revenue, cash received,
gross profit, dan net profit.

Gunakan jurnal/reversal yang dapat ditelusuri untuk transaksi finansial
yang sudah diposting.

------------------------------------------------------------------------

## 22. Dashboard dan analytics

Dashboard harus mengikuti permission dan scope user. Kasir tidak boleh
melihat seluruh data tenant jika tidak diizinkan.

### Filter tanggal

-   Today.
-   Yesterday.
-   This week.
-   This month.
-   Last month.
-   Custom date range.

### KPI

-   Gross sales.
-   Net sales.
-   Gross profit.
-   Transaction count.
-   Average transaction value.
-   Products sold.
-   Customers.
-   Refund total.
-   Discount total.
-   Tax total.
-   Cash sales.
-   Non-cash sales.
-   Low stock.
-   Best-selling products.

### Grafik

-   Sales trend.
-   Revenue trend.
-   Sales by store.
-   Sales by payment method.
-   Sales by category.
-   Sales by product.
-   Top products.
-   Top customers.
-   Sales by cashier.
-   Sales by hour.
-   Gross profit trend.

Definisikan rumus tiap KPI dan gunakan timezone toko saat menentukan
batas hari. Hindari query N+1 dan optimalkan agregasi untuk dataset
besar.

------------------------------------------------------------------------

## 23. Reporting dan export

Buat laporan:

-   Daily/monthly/annual sales.
-   Sales by store.
-   Sales by cashier.
-   Sales by product.
-   Sales by category.
-   Sales by customer.
-   Sales by payment.
-   Gross profit.
-   Net profit jika accounting data memadai.
-   Inventory.
-   Stock movement.
-   Stock valuation.
-   Stock opname.
-   Purchase.
-   Supplier.
-   Customer.
-   Employee performance.
-   Shift closing.
-   Discount usage.
-   Refund.
-   Expenses.
-   Cash flow.
-   Tax.
-   Subscription usage.

Fitur:

-   Search.
-   Pagination.
-   Sorting.
-   Filtering.
-   Date range.
-   Store/warehouse selector.
-   Export CSV/XLSX/PDF.
-   Print.
-   Background export untuk data besar.
-   Permission check sebelum export.

------------------------------------------------------------------------

## 24. Employee management dan HR

### Employee

-   Employee ID.
-   Name.
-   Email.
-   Phone.
-   Address.
-   Position.
-   Department.
-   Store assignment.
-   Warehouse assignment.
-   Employment status.
-   Joining date.
-   Profile photo.
-   Emergency contact bila diperlukan.
-   User account.
-   Role/permission.

### HR operational features

-   Shift schedule.
-   Attendance integration-ready.
-   Employee activity.
-   Sales target.
-   Commission.
-   Productivity.
-   Performance report.
-   Training/skill record sebagai pengembangan.

Jangan membangun payroll penuh kecuali diminta; siapkan integrasi dan
batas modul yang jelas.

------------------------------------------------------------------------

## 25. Notification system

In-app notification untuk:

-   Low stock.
-   Out of stock.
-   Shift closing reminder.
-   Cash discrepancy.
-   Pending approval.
-   Purchase approval.
-   Subscription expiration.
-   Payment failure.
-   Sales target.
-   Transfer awaiting receipt.

Sediakan adapter untuk email dan WhatsApp di masa depan. Jangan
mengklaim integrasi aktif jika credential/provider belum dikonfigurasi.

------------------------------------------------------------------------

## 26. Audit log dan security

### Audit log

Catat minimal:

-   Actor/user.
-   Tenant.
-   Store.
-   Action.
-   Module.
-   Record type dan ID.
-   Previous value dan new value bila aman.
-   IP address.
-   User agent bila diperlukan.
-   Timestamp.
-   Reason/approval reference untuk tindakan sensitif.

Masking data rahasia dan pribadi. Jangan menyimpan password, token, atau
payment secrets ke audit log.

### Security requirements

-   Secure authentication.
-   Password hashing.
-   Authorization server-side.
-   Tenant isolation.
-   Store/warehouse scoping.
-   CSRF protection.
-   Rate limiting.
-   Input validation.
-   SQL injection prevention.
-   XSS protection.
-   Secure file upload.
-   Session management.
-   Login activity.
-   Secret management via environment.
-   HTTPS in production.
-   Backup encryption.
-   Least privilege for database/service accounts.
-   Dependency vulnerability checks.
-   Secure error handling tanpa membocorkan stack trace di production.

Tindakan sensitif seperti refund, void, stock adjustment, discount
override, dan cash correction harus dapat memerlukan approval.

------------------------------------------------------------------------

## 27. UI/UX design system

### Referensi visual

Ambil inspirasi dari kualitas pengalaman produk seperti Shopify POS,
Square POS, Stripe Dashboard, dan Linear. Jangan menyalin brand atau
layout secara mentah.

### Visual direction

-   Modern.
-   Premium.
-   Clean.
-   Minimalist.
-   Professional.
-   Clear typography.
-   Consistent spacing.
-   Responsive.
-   Light/dark mode.
-   Accessible contrast.

### Dashboard shell

-   Sidebar collapsible.
-   Top navigation.
-   Breadcrumb.
-   Store selector.
-   Notification.
-   Profile menu.
-   Main content.

### Reusable components

-   Data table.
-   Search.
-   Filters.
-   Forms.
-   Dialog.
-   Drawer.
-   Dropdown.
-   Chart.
-   KPI card.
-   Status badge.
-   Pagination.
-   Toast.
-   Confirmation dialog.
-   Date range picker.
-   Empty state.
-   Loading skeleton.
-   Error state.

Semua halaman harus memiliki loading, empty, success, dan error states.
Jangan membuat tombol dekoratif tanpa action.

------------------------------------------------------------------------

## 28. POS visual requirements secara khusus

Desktop POS harus mengikuti prinsip berikut:

``` text
+------------------------------------------------------------------+
| Store | Register | Cashier | Shift Status | Connection | Profile |
+--------------------------------------+---------------------------+
| Search product / SKU / Barcode       | Customer                  |
| Category filters                     |                           |
+--------------------------------------+---------------------------+
|                                      | Cart                      |
|             PRODUCT GRID             | Product A       Qty  2    |
|                                      | Product B       Qty  1    |
|             Product cards            | Product C       Qty  3    |
|                                      |                           |
|                                      |                           |
|                                      |                           |
+--------------------------------------+---------------------------+
| Product area scrolls independently  | Subtotal                  |
|                                      | Discount                  |
|                                      | Tax                       |
|                                      | GRAND TOTAL               |
|                                      | [ PAYMENT / CHECKOUT ]    |
+--------------------------------------+---------------------------+
```

Ketentuan:

-   Viewport desktop tetap.
-   Header tidak ikut scroll.
-   Grid kiri scroll independen.
-   Cart kanan scroll independen.
-   Total dan checkout tetap terlihat.
-   Layout responsif untuk tablet/mobile.
-   Pada layar kecil, gunakan mode tab/drawer atau layout adaptif tanpa
    menghilangkan fungsi penting.
-   Jangan memaksa layout desktop dua kolom pada layar sempit.

------------------------------------------------------------------------

## 29. Offline POS dan sinkronisasi

Offline mode dapat dijadikan fitur tahap lanjutan, tetapi arsitektur
sebaiknya disiapkan sejak awal.

Jika offline mode diaktifkan:

-   Gunakan IndexedDB untuk local data.
-   Cache product/catalog yang diperlukan.
-   Buat local transaction queue.
-   Gunakan UUID/idempotency key.
-   Tandai transaksi sebagai pending sync.
-   Sinkronkan saat koneksi kembali.
-   Tampilkan status online/offline/syncing/error.
-   Tangani konflik harga, promo, stok, dan customer.
-   Tetapkan aturan transaksi offline dan batas risiko.
-   Sediakan proses rekonsiliasi.
-   Jangan menganggap stok offline selalu real-time.
-   Jangan menyimpan data sensitif tanpa proteksi yang layak.

Offline payment gateway tidak boleh dianggap berhasil tanpa konfirmasi
provider. Metode pembayaran offline harus memiliki aturan bisnis
tersendiri.

------------------------------------------------------------------------

## 30. Hardware integration

Siapkan dukungan atau adapter untuk:

-   Barcode scanner USB/Bluetooth (keyboard wedge).
-   Thermal receipt printer 58 mm.
-   Thermal receipt printer 80 mm.
-   Cash drawer.
-   Customer display.
-   Label printer.
-   Barcode label.

Jelaskan batasan browser terhadap akses hardware. Untuk kebutuhan print
langsung atau cash drawer, evaluasi WebUSB/WebSerial, browser printing,
atau local print bridge berdasarkan kompatibilitas perangkat dan
keamanan. Jangan mengklaim hardware bekerja sebelum diuji pada perangkat
nyata.

------------------------------------------------------------------------

## 31. Database architecture

Buat ERD dan migration untuk minimal entitas berikut. Tambahkan tabel
lain jika dibutuhkan oleh desain yang benar.

### SaaS dan access control

-   tenants
-   subscription_plans
-   subscriptions
-   subscription_invoices
-   subscription_payments
-   tenant_usages
-   users
-   employees
-   roles
-   permissions
-   role_permissions
-   user_roles
-   user_store_access
-   user_warehouse_access

### Store dan operation

-   stores
-   warehouses
-   warehouse_locations
-   registers
-   shifts
-   shift_cash_movements

### Product master

-   products
-   product_variants
-   product_categories
-   brands
-   units
-   unit_conversions
-   product_barcodes
-   product_prices
-   product_images
-   product_bundles
-   product_bundle_items
-   tax_categories

### Customer dan supplier

-   customers
-   customer_addresses
-   customer_groups
-   loyalty_accounts
-   loyalty_transactions
-   suppliers

### Inventory dan purchasing

-   inventories atau stock_balances
-   inventory_movements
-   stock_reservations
-   stock_transfers
-   stock_transfer_items
-   stock_opnames
-   stock_opname_items
-   purchase_requests
-   purchase_orders
-   purchase_order_items
-   goods_receipts
-   goods_receipt_items
-   purchase_returns
-   purchase_return_items

### Sales dan payment

-   sales
-   sale_items
-   sale_item_taxes
-   sale_payments
-   payment_methods
-   payment_gateway_events
-   refunds
-   refund_items
-   held_sales
-   receipts

### Promotions

-   promotions
-   promotion_conditions
-   promotion_rewards
-   coupons
-   coupon_redemptions
-   discount_approvals

### Finance

-   cash_accounts
-   cash_transactions
-   expenses
-   expense_categories
-   bank_accounts
-   payment_reconciliations
-   accounts_payable
-   accounts_receivable
-   chart_of_accounts
-   journal_entries
-   journal_entry_lines

### System

-   notifications
-   audit_logs
-   idempotency_keys
-   integrations
-   webhook_events
-   settings
-   file records bila diperlukan.

### Database rules

-   Definisikan tenant ownership.
-   Definisikan unique constraints yang sesuai scope tenant/store.
-   Gunakan foreign key.
-   Gunakan composite indexes untuk query utama.
-   Gunakan check constraints untuk nilai yang harus non-negatif.
-   Simpan snapshot transaksi.
-   Jangan menghapus ledger transaksi.
-   Gunakan status transitions yang tervalidasi.
-   Buat migration rollback yang aman.
-   Buat ERD Mermaid di dokumentasi.

Jangan membuat semua tabel secara membabi buta. Rancang relasi,
normalisasi, lifecycle, dan ownership terlebih dahulu.

------------------------------------------------------------------------

## 32. API design

Gunakan RESTful API dengan versioning, misalnya `/api/v1`.

Contoh endpoint:

``` text
POST   /api/v1/auth/login
POST   /api/v1/auth/register
POST   /api/v1/auth/logout
GET    /api/v1/me

GET    /api/v1/dashboard
GET    /api/v1/stores
POST   /api/v1/stores
GET    /api/v1/products
POST   /api/v1/products
GET    /api/v1/warehouses
GET    /api/v1/inventory

POST   /api/v1/sales
GET    /api/v1/sales
GET    /api/v1/sales/{id}
POST   /api/v1/sales/{id}/refund

POST   /api/v1/shifts/open
POST   /api/v1/shifts/{id}/close

POST   /api/v1/stock-transfers
POST   /api/v1/stock-transfers/{id}/dispatch
POST   /api/v1/stock-transfers/{id}/receive

GET    /api/v1/reports/sales
GET    /api/v1/reports/inventory
```

Standarkan response dan error format. Gunakan pagination, filter,
sorting, validation, authorization, dan dokumentasi OpenAPI. Jangan
membuat endpoint yang melewati business service utama.

------------------------------------------------------------------------

## 33. Docker Compose dan environment

Buat konfigurasi Docker yang dapat dijalankan secara konsisten.

### Services wajib

1.  `app`: Laravel PHP-FPM.
2.  `nginx`: web server.
3.  `postgres`: PostgreSQL.
4.  `redis`: cache/queue.
5.  `queue-worker`: Laravel queue worker.
6.  `scheduler`: Laravel scheduler.

### Services opsional

7.  `pgadmin`: database UI untuk development.
8.  `mailpit`: email testing lokal.

### Deliverables Docker

-   `Dockerfile`
-   `docker-compose.yml`
-   `docker-compose.dev.yml` bila diperlukan
-   `.dockerignore`
-   `.env.example`
-   `docker/nginx/default.conf`
-   entrypoint script
-   health checks
-   persistent volumes
-   internal network
-   service dependencies
-   restart policy yang sesuai
-   non-root execution bila memungkinkan
-   production configuration terpisah

### Perintah dasar yang harus didokumentasikan

``` bash
docker compose up -d --build
docker compose ps
docker compose logs -f
docker compose exec app php artisan migrate
docker compose exec app php artisan db:seed
docker compose exec app php artisan optimize:clear
docker compose exec app php artisan test
docker compose down
```

Sertakan prosedur backup dan restore PostgreSQL. Jangan menggunakan
credential default yang lemah untuk production. Jangan expose
PostgreSQL/Redis ke publik tanpa alasan dan proteksi.

`docker compose up -d --build` harus menjadi jalur startup yang jelas
untuk development, dengan dokumentasi langkah inisialisasi environment
dan database.

------------------------------------------------------------------------

## 34. Testing dan quality assurance

### Backend tests

-   Unit tests.
-   Feature tests.
-   API tests.
-   Authentication tests.
-   Authorization tests.
-   Tenant isolation tests.
-   Store scoping tests.
-   Payment tests.
-   Inventory tests.
-   Shift tests.
-   Promotion tests.
-   Refund tests.
-   Subscription tests.
-   Concurrent checkout tests.

### Frontend tests

-   Component tests.
-   Form validation.
-   POS workflow.
-   Cart calculation display.
-   Responsive layout.
-   Permission-based navigation.
-   Error and loading states.

### Critical scenarios

1.  Tenant A tidak dapat membaca data Tenant B.
2.  Cashier tidak dapat membuka halaman admin tanpa permission.
3.  Checkout berhasil menghasilkan sale dan inventory movement yang
    konsisten.
4.  Payment gagal tidak mengurangi stok secara tidak semestinya.
5.  Duplicate request tidak membuat sale/payment ganda.
6.  Concurrent checkout tidak menyebabkan overselling di luar kebijakan.
7.  Refund membalikkan stok dan keuangan secara benar.
8.  Shift closing menghitung kas fisik secara benar.
9.  Promo invalid ditolak backend.
10. User tidak dapat mengubah harga/total dari browser untuk
    memanipulasi transaksi.
11. Transfer stok tidak menciptakan atau menghilangkan stok.
12. Subscription limit ditegakkan backend.

Jalankan test dan perbaiki kegagalan sebelum menyatakan fase selesai.

------------------------------------------------------------------------

## 35. Performance, reliability, dan operations

-   Pagination untuk list besar.
-   Eager loading untuk mencegah N+1.
-   Index berdasarkan query nyata.
-   Queue untuk email, export, dan pekerjaan berat.
-   Cache untuk data yang aman dicache.
-   Cache invalidation yang jelas.
-   Monitoring queue.
-   Structured logging.
-   Error tracking integration-ready.
-   Health endpoints.
-   Database backup.
-   Restore drill.
-   Retention policy.
-   Deployment rollback plan.
-   Migration strategy.
-   Load testing untuk alur checkout.
-   Monitoring latency dan error rate.

Jangan meng-cache data sensitif lintas tenant tanpa cache key yang
memuat tenant context.

------------------------------------------------------------------------

## 36. Development phases

Kerjakan secara bertahap. Setiap fase harus menghasilkan kode yang
berjalan, migration, test, dan dokumentasi.

### Phase 0 --- Repository audit dan architecture

-   Periksa repository yang sudah ada.
-   Periksa runtime dan dependency.
-   Identifikasi code yang bisa digunakan ulang.
-   Buat architecture decision records.
-   Buat system architecture.
-   Buat ERD.
-   Buat folder structure.
-   Buat `DEVELOPMENT_PROGRESS.md`.
-   Buat backlog dan acceptance criteria.

### Phase 1 --- Foundation

-   Laravel setup.
-   React + Inertia setup.
-   TypeScript.
-   Tailwind dan component system.
-   Docker Compose.
-   PostgreSQL.
-   Redis.
-   Authentication.
-   Tenant context.
-   RBAC.
-   Initial migrations.
-   Seed development.

### Phase 2 --- SaaS dan master data

-   Tenant onboarding.
-   Subscription foundation.
-   Store.
-   Register.
-   Warehouse.
-   Employee.
-   Product.
-   Category/brand/unit.
-   Customer.
-   Supplier.

### Phase 3 --- Inventory dan purchasing

-   Inventory ledger.
-   Stock balance.
-   Stock adjustment.
-   Stock opname.
-   Transfer.
-   Purchase request/order.
-   Goods receipt.
-   Purchase return.

### Phase 4 --- POS core

-   POS UI.
-   Product search.
-   Barcode input.
-   Cart.
-   Held sales.
-   Checkout.
-   Receipt.
-   Sales history.
-   Transaction idempotency.
-   Inventory integration.

### Phase 5 --- Payment dan shift

-   Payment methods.
-   Split payment.
-   Gateway adapter.
-   Webhook.
-   Shift open/close.
-   Cash movement.
-   Reconciliation.

### Phase 6 --- Promotion dan after-sales

-   Promotion engine.
-   Coupon/voucher.
-   Discount approval.
-   Return.
-   Refund.
-   Exchange.
-   Sales commission.

### Phase 7 --- Dashboard dan reporting

-   Dashboard KPI.
-   Sales analytics.
-   Inventory reports.
-   Finance reports.
-   Employee reports.
-   Export.

### Phase 8 --- SaaS billing

-   Plans.
-   Subscription lifecycle.
-   Usage limits.
-   Billing history.
-   Platform dashboard.
-   Tenant suspension/reactivation.

### Phase 9 --- Hardening dan production

-   Security review.
-   Performance tests.
-   Automated test coverage.
-   Backup/restore.
-   Monitoring.
-   Deployment documentation.
-   Production Docker setup.
-   UAT checklist.

### Phase 10 --- Optional expansion

-   Offline POS.
-   Hardware bridge.
-   Omnichannel.
-   Marketplace integrations.
-   WhatsApp integration.
-   Advanced accounting.
-   AI business intelligence.
-   Demand forecasting.

------------------------------------------------------------------------

## 37. Aturan kerja AI Coding Assistant

Ikuti aturan berikut:

1.  Selalu analisis repository sebelum mengubah file.
2.  Jangan menghapus atau mengganti konfigurasi existing tanpa alasan
    dan penjelasan.
3.  Jangan mengarang hasil test.
4.  Jangan menyatakan fitur selesai jika belum berfungsi.
5.  Jangan membuat tombol tanpa action.
6.  Jangan menggunakan dummy data untuk menggantikan backend production.
7.  Dummy data hanya boleh digunakan melalui seeder/factory untuk
    development dan testing.
8.  Jangan menaruh business logic penting di React.
9.  Jangan mempercayai input total, harga, diskon, tenant, atau
    permission dari client.
10. Gunakan database transaction untuk operasi kritis.
11. Gunakan locking dan idempotency untuk checkout/payment.
12. Gunakan policy dan validasi ownership.
13. Jangan menghapus transaksi finansial yang telah final.
14. Buat test untuk setiap business rule penting.
15. Dokumentasikan keputusan arsitektur.
16. Gunakan TypeScript strict.
17. Hindari overengineering dan abstraction yang tidak diperlukan.
18. Jangan menambahkan dependency tanpa alasan.
19. Jalankan formatter, linter, static analysis, dan test yang tersedia.
20. Update `DEVELOPMENT_PROGRESS.md` setelah setiap sesi/fase.
21. Jika konteks sesi habis, tuliskan instruksi kelanjutan yang
    spesifik.
22. Jika menemukan konflik requirement, jelaskan dan pilih solusi paling
    aman sebelum implementasi.
23. Jangan berhenti setelah membuat rencana; lanjutkan implementasi fase
    pertama.
24. Jangan mengklaim production-ready sebelum security, test,
    deployment, backup, dan operational checks terpenuhi.

------------------------------------------------------------------------

## 38. Struktur repository yang disarankan

Sesuaikan dengan Laravel conventions dan jangan memaksakan struktur yang
tidak dibutuhkan.

``` text
project-root/
├── app/
│   ├── Actions/
│   ├── Console/
│   ├── Enums/
│   ├── Events/
│   ├── Exceptions/
│   ├── Http/
│   │   ├── Controllers/
│   │   ├── Middleware/
│   │   └── Requests/
│   ├── Jobs/
│   ├── Listeners/
│   ├── Models/
│   ├── Notifications/
│   ├── Policies/
│   ├── Services/
│   └── Support/
├── bootstrap/
├── config/
├── database/
│   ├── factories/
│   ├── migrations/
│   └── seeders/
├── docker/
│   └── nginx/
├── public/
├── resources/
│   ├── js/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── types/
│   └── css/
├── routes/
├── storage/
├── tests/
│   ├── Feature/
│   └── Unit/
├── docs/
│   ├── architecture.md
│   ├── database-erd.md
│   ├── api.md
│   ├── security.md
│   └── deployment.md
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.example
├── README.md
└── DEVELOPMENT_PROGRESS.md
```

------------------------------------------------------------------------

## 39. Required documentation

Hasil akhir harus mencakup:

1.  `README.md`
2.  Architecture overview.
3.  ERD/database documentation.
4.  API documentation.
5.  Role and permission matrix.
6.  Tenant isolation strategy.
7.  POS checkout flow.
8.  Payment lifecycle.
9.  Inventory ledger rules.
10. Shift closing calculation.
11. Docker development guide.
12. Production deployment guide.
13. Backup and restore guide.
14. Testing guide.
15. Troubleshooting guide.
16. `DEVELOPMENT_PROGRESS.md`.

------------------------------------------------------------------------

## 40. Definition of Done

Sebuah modul hanya boleh dinyatakan selesai jika:

-   Migration berjalan.
-   Model dan relasi benar.
-   Backend validation berjalan.
-   Authorization berjalan.
-   Tenant/store scoping berjalan.
-   UI terhubung ke backend.
-   Loading/empty/error/success state tersedia.
-   Test penting lulus.
-   Tidak ada error kritis di log.
-   Dokumentasi diperbarui.
-   Acceptance criteria terpenuhi.

Aplikasi tidak boleh dinyatakan siap production hanya karena halaman
dapat dibuka.

------------------------------------------------------------------------

## 41. First action --- mulai sekarang

Lakukan langkah berikut secara berurutan:

1.  Analisis seluruh repository dan konfigurasi yang sudah ada.
2.  Identifikasi framework, versi PHP, Node, package manager, dan
    dependency.
3.  Identifikasi apakah proyek existing atau repository kosong.
4.  Buat `docs/architecture.md`.
5.  Buat `docs/database-erd.md` dengan Mermaid ERD awal.
6.  Buat `docs/role-permission-matrix.md`.
7.  Buat `DEVELOPMENT_PROGRESS.md`.
8.  Buat daftar fase dan acceptance criteria.
9.  Identifikasi risiko arsitektur dan keamanan.
10. Implementasikan Phase 1 secara nyata.
11. Jalankan Docker Compose.
12. Jalankan migration dan seeder.
13. Jalankan test.
14. Perbaiki error sebelum lanjut ke fase berikutnya.

Jangan hanya memberikan tutorial atau daftar langkah kepada saya.
Kerjakan perubahan langsung pada repository menggunakan tools yang
tersedia.

Jika ada keputusan yang belum ditentukan, gunakan rekomendasi default
berikut dan dokumentasikan:

-   Multi-tenant: shared PostgreSQL database dengan `tenant_id`.
-   Backend: Laravel.
-   Frontend: React + TypeScript + Inertia.
-   UI: Tailwind CSS + shadcn/ui.
-   Database: PostgreSQL.
-   Cache/queue: Redis.
-   Infrastructure: Docker Compose + Nginx + PHP-FPM.
-   Currency default: IDR.
-   Locale default: Bahasa Indonesia.
-   Timezone default tenant: Asia/Jakarta, dapat dikonfigurasi.
-   Target awal: retail umum, dengan desain yang dapat diperluas untuk
    F&B dan distributor.
-   Offline POS: siapkan arsitektur untuk tahap lanjutan;
    implementasikan hanya jika masuk scope fase yang disepakati.

Setelah Phase 1 selesai, laporkan: - Apa yang berhasil dibuat. - File
yang dibuat/diubah. - Perintah yang dijalankan. - Hasil migration. -
Hasil test. - Cara menjalankan aplikasi. - Kendala yang masih ada. -
Rencana fase berikutnya.

**Tujuan akhir: membangun SaaS POS multi-tenant yang benar-benar dapat
digunakan untuk operasional bisnis, memiliki transaksi dan inventory
yang konsisten, aman, mudah dikembangkan, serta dapat di-deploy
menggunakan Docker Compose.**
