# Banggala Stock

Sistem pencatatan **stok bahan**, **menu & resep**, dan **penjualan** untuk **Kedai Kopi Banggala**.
Aplikasi web multi-perangkat berbasis **Supabase Cloud (PostgreSQL + Realtime WebSocket)** dengan arsitektur **Hybrid Offline-First**. Kasir di kedai tetap dapat mencatat penjualan saat internet putus sementara melalui antrean sinkronisasi lokal (IndexedDB outbox queue), sementara pemilik dapat memantau pergerakan stok dan transaksi secara real-time dari perangkat mana pun.

Fokus **stok saja**: tidak ada perhitungan harga, HPP, omzet, laba, atau margin. Penjualan mencatat item + jumlah dan otomatis memotong stok bahan sesuai resep.

---

## Fitur Utama

| Modul | Deskripsi |
|-------|-----------|
| **Multi-Perangkat & Realtime** | Terhubung ke cloud database Supabase; perubahan stok dan transaksi tersinkronisasi otomatis antar-perangkat secara instan via WebSocket. |
| **Hybrid Offline-First** | Startup instan (< 50ms) dari cache lokal browser; transaksi offline tersimpan di antrean IndexedDB (`banggala_outbox_db`) dan otomatis terkirim saat internet pulih. |
| **Indikator Koneksi** | Status koneksi di navbar: 🟢 *Online (Tersinkron)*, 🟡 *Offline (N Tertunda)*, 🔄 *Menyinkronkan…*, atau ⚪ *Mode Lokal*. |
| **Migrasi 1-Klik** | Tombol di Pengaturan untuk memindahkan seluruh data katalog, bahan, stok, dan riwayat transaksi lokal ke database Supabase Cloud. |
| **Login & Keamanan** | Multi-user (Admin / Staf). Password di-hash aman dengan algoritma PBKDF2 (SHA-256, salt per akun). |
| **Dashboard** | Status buka/tutup kedai (WIB), statistik bahan/penjualan/mutasi hari ini, grafik 7 hari, daftar restock, transaksi terbaru. |
| **Bahan & Stok** | Tambah/ubah/arsip bahan; kategori & satuan kustom; stok minimum; status stok (Aman / Menipis / Habis). |
| **Menu & Resep** | 28 menu katalog Kedai Kopi Banggala + resep estimasi yang bisa diedit; menu tanpa resep boleh dijual (stok tidak terpotong, diberi peringatan); Export CSV. |
| **Penjualan** | Catat multi-item; validasi stok real-time (tolak jika tidak cukup); nomor otomatis `PJ-YYYYMMDD-XXX`; Admin bisa edit/hapus → stok dihitung ulang. |
| **Mutasi Stok** | Masuk/keluar manual (pembelian, rusak, sample, koreksi, dsb); validasi stok tidak negatif. |
| **Laporan** | Periode preset/kustom; ringkasan per bahan; rekap menu terjual; detail mutasi; Export 3 CSV (titik koma); Cetak (A4 landscape). |
| **Pengaturan & Backup** | Identitas kedai; jam operasional mingguan; keamanan akun; Backup/Restore JSON; Reset data operasional; Log aktivitas audit. |

---

## Konfigurasi Supabase Cloud

Aplikasi dapat dijalankan dalam **Mode Lokal** (tanpa konfigurasi apa pun) atau dalam **Mode Cloud Multi-Perangkat** menggunakan Supabase BaaS (tersedia tier gratis).

### 1. Buat Proyek di Supabase
1. Buka [supabase.com](https://supabase.com) dan buat proyek baru (misal: `banggala-stock`).
2. Tentukan password basis data dan pilih region terdekat (misal: `Singapore`).

### 2. Jalankan Skema SQL Basis Data
1. Di dashboard Supabase, buka menu **SQL Editor**.
2. Buka file [`supabase/schema.sql`](supabase/schema.sql) dari repositori ini, salin seluruh kodenya, dan tempelkan ke SQL Editor Supabase.
3. Klik tombol **Run**. Seluruh tabel (`pengaturan`, `pengguna`, `bahan`, `menu`, `mutasi`, `penjualan`, `log_aktivitas`), indeks, kebijakan RLS, dan publikasi Realtime akan dibuat otomatis.

### 3. Salin API Credentials
1. Buka **Project Settings** → **API**.
2. Salin **Project URL** dan **Project API Keys** (`anon` public key).

---

## Menjalankan di Komputer Lokal

Prasyarat: **Node.js 20+** dan npm.

### 1. Salin File Environment
```bash
cp .env.example .env
```
Buka file `.env` dan isi dengan kredensial Supabase Anda:
```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
*(Catatan: Jika `.env` dibiarkan kosong atau belum diisi, aplikasi otomatis berjalan dalam mode demo offline-lokal).*

### 2. Instalasi & Menjalankan Server Dev
```bash
npm install
npm run dev
```
Buka <http://localhost:5173> di browser.

### 3. Akun Awal
| Username | Password   | Role  |
| -------- | ---------- | ----- |
| `admin`  | `admin123` | Admin |

> Segera ubah password lewat **Pengaturan → Keamanan Akun** setelah login pertama.

### 4. Migrasi Data Lokal ke Cloud (1-Klik)
Jika Anda memiliki data katalog atau transaksi di browser lokal dan ingin mengunggahnya ke Supabase:
1. Masuk sebagai akun **Admin**.
2. Masuk ke halaman **Pengaturan** → bagian **Data & Backup**.
3. Di kartu **Supabase Cloud Database**, klik tombol **"Migrasikan Data Lokal ke Cloud"**.
4. Tunggu progress bar selesai (100%). Seluruh data lokal kini aktif di Supabase dan siap diakses dari perangkat lain!

---

## Deployment ke Cloud (Vercel / Cloudflare Pages)

Aplikasi dibangun menggunakan **HashRouter** (`/#/`), sehingga dapat di-deploy ke platform hosting statis apa pun tanpa memerlukan konfigurasi URL rewrite server.

### Deploy ke Vercel
1. Hubungkan repositori GitHub ke [vercel.com](https://vercel.com).
2. Konfigurasi proyek:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Tambahkan **Environment Variables**:
   - `VITE_SUPABASE_URL` = `https://your-project.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your-anon-key`
4. Klik **Deploy**.

### Deploy ke Cloudflare Pages
1. Di dashboard Cloudflare Pages, pilih **Create a project** → **Connect to Git**.
2. Konfigurasi build:
   - **Framework preset**: None / Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
3. Di bagian **Environment variables**, tambahkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.
4. Klik **Save and Deploy**.

---

## Hak Akses

| Kemampuan | Admin | Staf |
|-----------|:----:|:----:|
| Dashboard, stok, laporan | ✓ | ✓ |
| Catat stok masuk/keluar | ✓ | ✓ |
| Tambah/ubah bahan & menu | ✓ | ✓ |
| Catat transaksi penjualan | ✓ | ✓ |
| Arsipkan bahan/menu | ✓ | – |
| Ubah/hapus mutasi manual | ✓ | – |
| **Edit/hapus penjualan** | ✓ | – |
| Kelola pengguna & staf | ✓ | – |
| Pengaturan kedai, migrasi cloud, reset data | ✓ | – |

---

## Arsitektur Hybrid Offline-First

```
┌────────────────────────────────────────────────────────┐
│                   Aplikasi React UI                   │
│  (Optimistic Update seketika: State memori + Storage)  │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
       [Jika Online]               [Jika Offline]
                │                        │
                ▼                        ▼
     ┌─────────────────────┐   ┌──────────────────────┐
     │   Supabase Client   │   │  IndexedDB Outbox    │
     │  (Postgres Cloud)   │   │ (banggala_outbox_db) │
     └──────────▲──────────┘   └──────────┬───────────┘
                │                         │
                │        Auto Sync saat   │
                └──────── koneksi pulih ──┘
```

1. **Local-First Speed**: Setiap pencatatan penjualan atau mutasi stok langsung memperbarui tampilan antarmuka seketika tanpa menunggu latensi jaringan server.
2. **Resilience**: Jika internet kedai mati, transaksi masuk ke antrean IndexedDB (`banggala_outbox_db`) dan ditandai dengan badge *Offline (N Tertunda)* di navbar.
3. **Auto Recovery**: Begitu koneksi internet tersambung kembali (`online` event), antrean outbox secara otomatis dikirim berurutan (FIFO) ke Supabase dan navbar kembali hijau *Online (Tersinkron)*.
4. **Realtime Multi-Device**: Menggunakan Supabase Realtime channel WebSocket. Saat kasir mencatat transaksi di laptop kedai, pemilik yang membuka aplikasi di smartphone otomatis melihat mutasi stok terpotong tanpa perlu me-refresh halaman.

---

## Struktur Proyek

```
.
├─ .env.example              # Template variabel lingkungan Supabase
├─ index.html
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
├─ supabase/
│  └─ schema.sql             # DDL PostgreSQL + RLS + Realtime Publication
└─ src/
   ├─ main.tsx               # Entry point
   ├─ App.tsx                # HashRouter routing
   ├─ styles.css             # Tema Tailwind CSS v4
   ├─ types.ts               # Interface TypeScript
   ├─ context/
   │  ├─ AuthContext.tsx     # Hybrid startup, login PBKDF2, Supabase Realtime
   │  ├─ DataContext.tsx     # Operasi data bisnis + sync cloud + outbox
   │  └─ ToastContext.tsx    # Notifikasi toast
   ├─ lib/
   │  ├─ supabase.ts         # Inisialisasi klien Supabase & graceful fallback
   │  ├─ cloudDb.ts          # Lapisan konversi schema (snake_case ↔ camelCase)
   │  ├─ outboxQueue.ts      # IndexedDB offline outbox queue & auto-processor
   │  ├─ seed.ts             # Data inisialisasi awal
   │  ├─ storage.ts          # Cache localStorage
   │  ├─ auth.ts             # Enkripsi password PBKDF2
   │  ├─ stock.ts            # Logika kalkulasi stok
   │  ├─ menu.ts             # Logika resep & ketersediaan bahan
   │  ├─ operasional.ts      # Jam operasional resmi kedai
   │  ├─ dataAwal.ts         # 28 menu katalog & 36 bahan bawaan kedai
   │  ├─ format.ts           # Format angka & tanggal Indonesia
   │  ├─ csv.ts              # Ekspor CSV & JSON
   │  └─ id.ts               # Generator ID acak aman
   ├─ components/
   │  ├─ Layout.tsx          # Shell navigasi & header bar
   │  ├─ StatusKoneksi.tsx   # Indikator status koneksi online/offline/sync
   │  ├─ ProtectedRoute.tsx  # Proteksi otentikasi rute
   │  ├─ Icons.tsx           # Ikon SVG
   │  └─ ui/                 # Komponen modal, form, badge
   └─ pages/
      ├─ LoginPage.tsx
      ├─ DashboardPage.tsx
      ├─ BahanPage.tsx
      ├─ MenuPage.tsx
      ├─ PenjualanPage.tsx
      ├─ MutasiPage.tsx
      ├─ LaporanPage.tsx
      ├─ PenggunaPage.tsx
      └─ PengaturanPage.tsx  # Pengaturan kedai & kartu migrasi cloud
```

---

## Lisensi

Internal — Kedai Kopi Banggala.
