# Banggala Stock

Sistem pencatatan **stok bahan**, **menu & resep**, dan **penjualan** untuk
**Kedai Kopi Banggala**.

Aplikasi web multi-perangkat dengan dua mode:

1. **Mode Online (disarankan)** — Supabase Cloud (PostgreSQL + Auth + Realtime),
   dapat dipakai beberapa perangkat sekaligus dengan data stok yang sama.
2. **Mode Lokal** — tanpa konfigurasi apa pun; data tersimpan di browser
   perangkat (`localStorage`) dengan login PBKDF2.

Keduanya **offline-first**: perubahan langsung tampil di layar, lalu disinkronkan
saat internet tersedia. Fokus **stok saja** — tidak ada harga, HPP, margin,
omzet, laba, atau nilai inventaris. Penjualan mencatat item + jumlah dan
memotong stok bahan sesuai resep.

> Panduan setup online lengkap: [`supabase/PANDUAN.md`](supabase/PANDUAN.md).

---

## Fitur

| Modul | Deskripsi |
| --- | --- |
| **Multi-perangkat & realtime** | Data yang sama di semua perangkat; perubahan tampil otomatis via Supabase Realtime. |
| **Offline-first** | Cache lokal untuk startup instan; transaksi offline masuk antrean IndexedDB dan dikirim otomatis saat online. |
| **PWA** | Bisa dipasang ke home screen dan dibuka tanpa internet setelah pernah dibuka. |
| **Indikator koneksi** | Online / Offline (N tertunda) / Menyinkronkan / Mode Lokal, plus panel **Konflik**. |
| **Login aman** | Online: Supabase Auth (`username@banggala.local`) + profil ber-RLS. Lokal: PBKDF2. |
| **Kelola staf** | Admin dapat menambah akun, ubah nama/role, menonaktifkan, dan reset password (via Edge Function). |
| **Dashboard** | Status buka/tutup kedai (WIB), ringkasan bahan/penjualan/mutasi hari ini, grafik 7 hari, restock, transaksi terbaru. |
| **Bahan & stok** | Tambah/ubah/arsip bahan; kategori & satuan kustom; stok minimum; status Aman/Menipis/Habis. |
| **Menu & resep** | Katalog menu + resep estimasi yang bisa diedit; menu tanpa resep tetap bisa dijual tetapi stok tidak terpotong dan diberi penanda. |
| **Penjualan** | Multi-item; server menolak bila stok tidak cukup; nomor otomatis `PJ-YYYYMMDD-XXX`; admin bisa edit/hapus dan stok dihitung ulang. |
| **Mutasi stok** | Masuk/keluar manual; stok tidak boleh negatif. |
| **Laporan** | Periode preset/kustom, rekap bahan & menu, detail mutasi, ekspor CSV, cetak. |
| **Pengaturan & backup** | Identitas kedai, jam operasional, keamanan akun, backup/restore JSON, reset data, log aktivitas. |

---

## Menjalankan Cepat

Prasyarat: **Node.js 20+**.

```bash
npm install
npm run dev
```

Buka <http://localhost:5173>.

### Mode lokal (tanpa Supabase)

Biarkan `.env` kosong. Login awal:

| Username | Password | Role |
| --- | --- | --- |
| `admin` | `admin123` | Admin |

> Segera ganti password lewat **Pengaturan → Keamanan Akun**.
> Data lokal tersimpan di `localStorage` browser perangkat itu saja.

### Mode online (Supabase)

1. Buat proyek Supabase.
2. Jalankan [`supabase/schema.sql`](supabase/schema.sql) di SQL Editor.
3. Atur Auth (matikan sign up & konfirmasi email, set Site URL).
4. Buat admin pertama, lalu deploy Edge Function `admin-pengguna`.
5. Salin `.env.example` → `.env` dan isi:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

6. Jalankan `npm run dev`, lalu login memakai akun cloud.

Detail langkah, migrasi data lokal, dan troubleshooting ada di
**[`supabase/PANDUAN.md`](supabase/PANDUAN.md)**.

---

## Deployment

Aplikasi memakai `HashRouter`, sehingga cocok untuk hosting statis tanpa rewrite.

**Vercel**

- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Setelah domain jadi, perbarui **Site URL** di Supabase Auth.
- Service worker hanya aktif pada build produksi.

Tanpa environment variable, hasil build otomatis berjalan dalam mode lokal.

---

## Hak Akses

Tabel berikut adalah hak akses **mode online** (ditegakkan server oleh RLS).
Mode lokal tetap berjalan tanpa Supabase dan menggunakan pemeriksaan aplikasi
lokal.

| Kemampuan | Admin | Staf |
| --- | :---: | :---: |
| Dashboard, stok, laporan | ✓ | ✓ |
| Catat stok masuk/keluar | ✓ | ✓ |
| Catat penjualan | ✓ | ✓ |
| Tambah/ubah bahan & menu | ✓ | – |
| Arsipkan bahan/menu | ✓ | – |
| Ubah/hapus mutasi manual | ✓ | – |
| Edit/hapus penjualan | ✓ | – |
| Kelola pengguna & reset password | ✓ | – |
| Pengaturan kedai, migrasi, reset data | ✓ | – |

Pada mode online, aturan ini juga ditegakkan di server melalui RLS dan RPC.
Transaksi (`penjualan`, `mutasi`, counter nomor) **tidak dapat ditulis langsung**
oleh klien; semuanya lewat RPC yang memvalidasi stok dan identitas.

---

## Arsitektur Sinkronisasi

```
        Aksi pengguna
             │
             ▼
   State lokal + localStorage   ← tampilan langsung (optimistic)
             │
      ┌──────┴───────┐
      │              │
   Online         Offline
      │              │
      ▼              ▼
 RPC Supabase   Outbox IndexedDB
 (nomor & stok  (tidak pernah
  dari server)   dibuang)
      │              │
      └──────┬───────┘
             ▼
   Realtime → perangkat lain
```

Urutan startup:

1. Tampilkan cache lokal.
2. Kirim antrean outbox yang tertunda.
3. Tarik snapshot cloud (agar data offline tidak tertimpa).

Bila server menolak transaksi (mis. stok sudah habis di perangkat lain), item
**tidak dihapus** dari outbox. Item ditandai **konflik** dan admin dapat memilih
**Coba lagi** atau **Buang** dari panel di navbar.

---

## Struktur Proyek

```
.
├─ .env.example                 # Template kredensial Supabase
├─ index.html                   # Meta PWA
├─ vite.config.ts               # Vite + PWA (manifest, precache, NetworkOnly Supabase)
├─ supabase/
│  ├─ schema.sql                # Tabel, RLS, RPC, trigger, realtime
│  ├─ PANDUAN.md                # Panduan setup online
│  └─ functions/
│     └─ admin-pengguna/
│        └─ index.ts            # Edge Function kelola akun staf
└─ src/
   ├─ main.tsx                  # Entry point + registrasi PWA
   ├─ App.tsx                   # HashRouter
   ├─ types.ts
   ├─ context/
   │  ├─ AuthContext.tsx        # Auth dual-mode, cache sesi, realtime, outbox
   │  ├─ DataContext.tsx        # Aksi data + RPC/outbox + konflik
   │  └─ ToastContext.tsx       # Notifikasi + penolakan server
   ├─ lib/
   │  ├─ supabase.ts            # Klien Supabase & deteksi mode
   │  ├─ cloudDb.ts             # Mapper snake_case ↔ camelCase + snapshot
   │  ├─ rpc.ts                 # Wrapper RPC + pemetaan error Indonesia
   │  ├─ outboxQueue.ts         # Antrean IndexedDB, retry, konflik
   │  ├─ sinkron.ts             # Orkestrasi startup & sinkronisasi
   │  ├─ peristiwa.ts           # Event bus sinkronisasi
   │  ├─ edgeAdmin.ts           # Klien Edge Function admin
   │  ├─ seed.ts                # Data awal
   │  ├─ storage.ts             # Cache localStorage + normalisasi
   │  ├─ auth.ts                # PBKDF2 (mode lokal)
   │  ├─ stock.ts               # Perhitungan stok
   │  ├─ menu.ts                # Resep & ketersediaan bahan
   │  ├─ operasional.ts         # Jam operasional kedai
   │  ├─ dataAwal.ts            # Katalog menu & bahan bawaan
   │  ├─ format.ts              # Format angka & tanggal Indonesia
   │  ├─ csv.ts                 # Ekspor CSV/JSON
   │  └─ id.ts                  # Generator ID
   ├─ components/
   │  ├─ Layout.tsx
   │  ├─ StatusKoneksi.tsx      # Status online/offline + panel konflik
   │  ├─ PembaruanAplikasi.tsx  # Prompt versi baru & siap offline
   │  ├─ ProtectedRoute.tsx
   │  ├─ Icons.tsx
   │  └─ ui/
   └─ pages/
      ├─ LoginPage.tsx
      ├─ DashboardPage.tsx
      ├─ BahanPage.tsx
      ├─ MenuPage.tsx
      ├─ PenjualanPage.tsx
      ├─ MutasiPage.tsx
      ├─ LaporanPage.tsx
      ├─ PenggunaPage.tsx
      └─ PengaturanPage.tsx
```

---

## Perintah

```bash
npm run dev        # server pengembangan (PWA nonaktif)
npm run typecheck  # cek TypeScript
npm run build      # typecheck + build produksi (dist + service worker)
npm run preview    # pratinjau hasil build (PWA aktif)
```

---

## Catatan Keamanan

- **anon key** memang publik; keamanan data dijaga oleh RLS ketat.
- **service_role key** hanya ada di Edge Function, tidak pernah dikirim ke browser.
- Hash password tidak pernah disimpan di cloud; autentikasi ditangani Supabase Auth.
- Akun yang dinonaktifkan tidak bisa login dan sesinya diputus.
- Backup JSON berisi data bisnis, bukan password.

---

## Lisensi

Internal — Kedai Kopi Banggala.
