# Enterprise SaaS Point of Sale (POS) Multi-Tenant

Sistem Point of Sale (POS) Enterprise SaaS Multi-Tenant berbasis **Laravel 12**, **PostgreSQL 16**, **React 19**, **Inertia.js**, dan **Docker Compose**. Dirancang untuk operasional retail modern dengan dukungan multi-tenant, multi-store (cabang), multi-warehouse (gudang), dan multi-register (mesin kasir) yang aman, konsisten, dan scalable.

---

## 1. Quick Start dengan Docker Compose

Pastikan Docker Desktop sudah aktif, lalu jalankan:

```bash
# 1. Jalankan seluruh container (PHP-FPM, Nginx, PostgreSQL, Redis, Worker, Scheduler, Mailpit)
docker compose up -d --build

# 2. Periksa status container
docker compose ps

# 3. Jalankan migrasi dan seeder awal di dalam container
docker compose exec app php artisan migrate --seed

# 4. Build asset frontend (React + Tailwind)
npm run build
```

Buka di browser:
- **Web App**: [http://localhost:8008](http://localhost:8008)
- **Mailpit Web UI**: [http://localhost:8025](http://localhost:8025)
- **PostgreSQL Database Port Host**: `5433` (menghindari konflik dengan container lokal lain)
- **Redis Port Host**: `6381`

---

## 2. Kredensial Demo Awal (Seeded Accounts)

Semua akun menggunakan kata sandi default: `password`

| Peran / Role | Email | Organisasi / Tenant | Akses Utama |
|---|---|---|---|
| **Platform Super Admin** | `superadmin@pos.test` | Platform Host (Global) | Pengelolaan seluruh tenant & langganan |
| **Tenant Owner A** | `owner@retailjaya.test` | PT Retail Jaya Abadi | Manajemen toko, karyawan, dan finansial |
| **Store Manager A** | `manager@retailjaya.test`| PT Retail Jaya Abadi | Operasional Toko Central Jakarta |
| **Kasir POS A** | `cashier@retailjaya.test`| PT Retail Jaya Abadi | Terminal Kasir (STR-CENTRAL) |
| **Tenant Owner B** | `owner@majubersama.test` | CV Maju Bersama | Tenant terisolasi (Pembuktian Multi-Tenancy) |

---

## 3. Menjalankan Automated Tests

Aplikasi dilengkapi test suite komprehensif untuk memastikan isolasi tenant dan keamanan hak akses:

```bash
# Menjalankan seluruh test
php artisan test

# Menjalankan dengan format deskriptif (TestDox)
php artisan test --testdox
```

### Skenario Uji Kritis yang Diverifikasi:
1. **Tenant Isolation**: Tenant A tidak dapat membaca atau memodifikasi data milik Tenant B, bahkan saat ID diketahui.
2. **Auto Scoping**: Model otomatis menyuntikkan `tenant_id` user yang sedang login saat pembuatan data baru.
3. **Super Admin Access**: Super Admin memiliki visibilitas lintas tenant untuk keperluan platform.
4. **RBAC & Policies**: Kasir atau user tanpa izin diblokir saat mengakses endpoint administratif (HTTP 403).
5. **Authentication & Session**: Login gagal pada kredensial salah atau akun non-aktif; logout membersihkan sesi secara aman.

---

## 4. Dokumentasi Arsitektur & Teknis

- [Arsitektur Sistem & Multi-Tenancy](docs/architecture.md)
- [Diagram Relasi Database (ERD)](docs/database-erd.md)
- [Matriks Role & Permission (RBAC)](docs/role-permission-matrix.md)
- [Roadmap & Progres Pengerjaan](DEVELOPMENT_PROGRESS.md)
- [Spesifikasi Induk Master Prompt](master-prompt-saas-pos-laravel-postgresql.md)

---

## 5. Ringkasan Port Host & Layanan

Untuk mencegah bentrok dengan container database/web lain di mesin pengembang, port host default telah disesuaikan:

| Layanan | Container Name | Port Internal | Port Host |
|---|---|---|---|
| **Nginx Web Server** | `pos_nginx` | `80` | `8008` |
| **PostgreSQL 16** | `pos_postgres` | `5432` | `5433` |
| **Redis 7** | `pos_redis` | `6379` | `6381` |
| **Mailpit Web UI** | `pos_mailpit` | `8025` | `8025` |
| **Laravel App (PHP-FPM)** | `pos_app` | `9000` | (Internal) |
| **Queue Worker** | `pos_queue_worker`| - | (Background) |
| **Cron Scheduler** | `pos_scheduler` | - | (Background) |
