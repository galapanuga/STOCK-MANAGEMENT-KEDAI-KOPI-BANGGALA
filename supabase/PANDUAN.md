# Panduan Setup Online — Banggala Stock

Panduan ini menjelaskan cara menyiapkan **mode online multi-perangkat** dengan
**Supabase Cloud** + **Vercel**. Aplikasi tetap bisa berjalan **tanpa Supabase**
(mode lokal), tetapi mode online dibutuhkan untuk:

- login staf dari beberapa perangkat,
- stok yang sama di semua perangkat (real-time),
- kelola akun staf dari dalam aplikasi,
- akses offline setelah aplikasi pernah dibuka (PWA + cache lokal).

> **Penting:** seluruh langkah di bawah dilakukan **satu kali** saat pertama kali
> menyiapkan proyek. Setelah itu, staf hanya perlu login seperti biasa.

---

## 0. Ringkasan Arsitektur

| Bagian | Teknologi | Catatan |
| --- | --- | --- |
| Frontend | React + Vite + PWA | Dideploy ke Vercel |
| Login | Supabase Auth | Email sintetis `username@banggala.local` |
| Profil & role | tabel `profiles` | Tanpa hash password di cloud |
| Data bisnis | PostgreSQL + RLS ketat | Bahan, menu, penjualan, mutasi, log |
| Transaksi | RPC `security definer` | Nomor penjualan & validasi stok atomik di server |
| Kelola staf | Edge Function `admin-pengguna` | Memakai service role, hanya admin |
| Offline | IndexedDB outbox + cache localStorage | Transaksi tidak pernah dibuang |
| Realtime | Supabase Realtime | Perubahan tampil di perangkat lain |

---

## 1. Prasyarat

- Akun [Supabase](https://supabase.com) (tier gratis cukup).
- Akun [Vercel](https://vercel.com) yang terhubung ke repositori GitHub
  `STOCK-MANAGEMENT-KEDAI-KOPI-BANGGALA`.
- **Node.js 20+** dan npm untuk menjalankan/membangun aplikasi secara lokal.
- (Disarankan) Supabase CLI untuk deploy Edge Function:
  ```bash
  npm install -g supabase
  supabase --version
  ```

---

## 2. Buat Proyek Supabase

1. Masuk ke [supabase.com/dashboard](https://supabase.com/dashboard).
2. **New project** → isi:
   - **Name:** `banggala-stock`
   - **Database Password:** simpan di tempat aman (tidak dipakai aplikasi).
   - **Region:** `Southeast Asia (Singapore)` (terdekat).
3. Tunggu hingga proyek selesai disiapkan (± 2 menit).
4. Catat dari **Project Settings → API**:
   - **Project URL** → `https://xxxx.supabase.co`
   - **anon public key** → kunci panjang `eyJ...`

> Jangan pernah memakai **service_role key** di frontend atau di Vercel.
> service_role hanya dipakai di dalam Edge Function (sudah diset otomatis oleh
> Supabase).

---

## 3. Jalankan Skema Database

1. Buka **SQL Editor** di dashboard Supabase.
2. Buka file [`schema.sql`](./schema.sql) dari repositori ini.
3. Salin **seluruh** isinya, tempel ke SQL Editor, lalu klik **Run**.
4. Pastikan tidak ada error. Skema ini membuat:
   - tabel `profiles`, `pengaturan`, `bahan`, `menu`, `penjualan`, `mutasi`,
     `log_aktivitas`, `penjualan_counter`;
   - RLS dan grant yang ketat;
   - RPC: `catat_penjualan`, `ubah_penjualan`, `hapus_penjualan`,
     `catat_mutasi`, `ubah_mutasi`, `hapus_mutasi`, `ganti_semua_data`,
     `reset_operasional`;
   - trigger profil otomatis dari `auth.users`;
   - publikasi Realtime.

> **Peringatan:** skema ini menghapus tabel lama bernama `pengguna` bila ada.
> Jangan jalankan pada proyek yang sudah berisi data produksi tanpa backup.

Untuk memverifikasi, jalankan di SQL Editor:

```sql
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

---

## 4. Konfigurasi Supabase Auth

Buka **Authentication** di dashboard.

### 4.1 Matikan pendaftaran publik

- **Sign In / Providers → Email**: matikan **Enable sign ups**
  (atau **Authentication → Settings → Allow new users to sign up** → OFF).

Akun hanya dibuat oleh admin melalui aplikasi. Ini mencegah orang luar membuat
akun sendiri.

### 4.2 Matikan konfirmasi email

- **Sign In / Providers → Email → Confirm email** → **OFF**.

Email akun bersifat sintetis (`@banggala.local`) dan tidak bisa menerima pesan.
Akun yang dibuat lewat Edge Function sudah otomatis dikonfirmasi
(`email_confirm: true`).

### 4.3 Atur URL aplikasi

- **Authentication → URL Configuration**:
  - **Site URL:** `https://<domain-vercel-anda>`
  - **Redirect URLs:** tambahkan `https://<domain-vercel-anda>/**`
  - Untuk pengembangan lokal, tambahkan juga `http://localhost:5173/**`.

### 4.4 Password minimal

- **Authentication → Settings → Password strength**: minimal **6 karakter**
  (sesuai validasi aplikasi dan Edge Function).

---

## 5. Buat Admin Pertama

Admin pertama harus dibuat manual sekali, karena Edge Function hanya bisa
dipanggil oleh admin yang sudah ada.

1. Buka **Authentication → Users → Add user → Create new user**.
2. Isi:
   - **Email:** `admin@banggala.local`
   - **Password:** password kuat pilihan Anda (min. 6 karakter).
   - **Auto Confirm User:** aktif.
3. Klik **Create user**.
4. Trigger `on_auth_user_created` otomatis membuat baris di `profiles` dengan
   username `admin` dan role `staf`.
5. Naikkan menjadi admin lewat **SQL Editor**:

```sql
update profiles
set nama = 'Admin Banggala',
    role = 'admin',
    aktif = true
where username = 'admin';
```

6. Cek hasilnya:

```sql
select id, username, nama, role, aktif from profiles;
```

**Login aplikasi memakai username, bukan email.** Untuk akun di atas:
username `admin`, email `admin@banggala.local`.

> Bila Anda memakai email lokal lain, misalnya `pemilik@banggala.local`,
> username login adalah `pemilik`.

---

## 6. Deploy Edge Function `admin-pengguna`

Edge Function ini menangani pembuatan akun, ubah profil/role, menonaktifkan akun,
dan reset password. Service role key tidak pernah dikirim ke browser.

### 6.1 Lewat Supabase CLI (disarankan)

```bash
supabase login
supabase link --project-ref <PROJECT_REF>
supabase functions deploy admin-pengguna
```

`<PROJECT_REF>` adalah bagian sebelum `.supabase.co` pada Project URL.

Supabase otomatis menyediakan variabel berikut di dalam function:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Tidak perlu menyetel secret tambahan. Bila ingin memastikan:

```bash
supabase secrets list
```

### 6.2 Lewat Dashboard (alternatif)

1. **Edge Functions → Deploy a new function**.
2. Nama: `admin-pengguna`.
3. Tempel isi file [`functions/admin-pengguna/index.ts`](./functions/admin-pengguna/index.ts).
4. Deploy.
5. Biarkan **Verify JWT** aktif (default). Function tetap memeriksa role admin
   sendiri.

### 6.3 Uji cepat

Dari aplikasi (setelah login sebagai admin), buka **Pengguna**. Bila daftar
pengguna muncul, Edge Function sudah aktif. Bila muncul error 401/403, periksa
langkah 5 (role admin) dan sesi login.

---

## 7. Siapkan File `.env` Lokal

```bash
cp .env.example .env
```

Isi `.env`:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Lalu:

```bash
npm install
npm run dev
```

Buka <http://localhost:5173> dan login dengan akun admin dari langkah 5.

> `.env` **jangan di-commit** (sudah masuk `.gitignore`).
> Bila `.env` kosong atau tidak ada, aplikasi otomatis memakai mode lokal
> (`admin` / `admin123`).

---

## 8. Deploy ke Vercel

1. Buka [vercel.com/new](https://vercel.com/new), impor repositori GitHub
   `STOCK-MANAGEMENT-KEDAI-KOPI-BANGGALA`.
2. Konfigurasi:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
3. **Environment Variables** (Production, Preview, Development):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Klik **Deploy**.
5. Setelah dapat domain, kembali ke langkah **4.3** dan ganti **Site URL**
   Supabase ke domain Vercel tersebut.
6. Deploy ulang bila Anda mengubah environment variable (nilai `VITE_*`
   ditanam saat build).

> Aplikasi memakai `HashRouter` (`/#/...`), jadi tidak perlu rewrite khusus.
> Service worker hanya aktif di build produksi, bukan `npm run dev`.

---

## 9. Migrasi Data Lokal ke Cloud

Gunakan ini bila Anda sudah memakai aplikasi dalam mode lokal dan ingin
memindahkan data ke cloud.

**Sebelum mulai:**

1. Buka **Pengaturan → Data & Backup → Unduh Backup JSON** di mode lokal.
2. Pastikan proyek Supabase masih **kosong** (baru dibuat). RPC migrasi
   **menimpa seluruh data cloud**.
3. Pastikan akun admin cloud sudah dibuat (langkah 5) dan username-nya diingat.

**Langkah migrasi:**

1. Isi `.env` (langkah 7) dan jalankan aplikasi.
2. Login dengan **akun cloud** (bukan akun lokal).
3. Buka **Pengaturan → Data & Backup**.
4. Klik **Migrasikan Data Lokal ke Cloud** dan tunggu hingga 100%.
5. Login dari perangkat lain; data akan muncul setelah sinkronisasi.

**Yang ikut dimigrasikan:** pengaturan kedai, bahan, menu & resep, penjualan,
mutasi, dan log aktivitas.
**Yang tidak ikut:** akun/password lokal. Akun cloud dikelola lewat halaman
**Pengguna**.

> Jika data lokal sudah terlanjur tertimpa snapshot cloud kosong, pulihkan dari
> backup JSON lewat **Pulihkan Backup** (mode online) — data bisnis akan
> ditulis ulang ke cloud, sedangkan akun tetap memakai akun cloud.

---

## 10. Cara Kerja Multi-Perangkat & Offline

### Startup

1. Cache lokal (`localStorage`) langsung ditampilkan agar aplikasi cepat.
2. Antrean outbox (`IndexedDB`) dikirim lebih dulu.
3. Baru snapshot cloud ditarik, sehingga transaksi offline tidak tertimpa.

### Saat online

- Penjualan/mutasi dikirim lewat RPC. Server menentukan nomor penjualan dan
  memvalidasi stok secara atomik.
- Jika server menolak (mis. stok habis karena perangkat lain lebih dulu),
  transaksi **tidak dihapus**. Muncul toast penolakan dan item masuk daftar
  **Konflik** di navbar.
- Perubahan data tampil di perangkat lain lewat Realtime.

### Saat offline

- Login baru tidak bisa (butuh internet), tetapi **sesi yang tersimpan tetap
  bisa membuka aplikasi** dan mencatat transaksi.
- Penjualan/mutasi masuk outbox dan otomatis dikirim saat internet pulih.
- Badge navbar: **Offline (N Tertunda)**.
- PWA: aplikasi bisa dipasang ke home screen dan dibuka tanpa internet setelah
  pernah dibuka minimal sekali.

### Menyelesaikan konflik

1. Klik badge **Konflik** di navbar.
2. Baca pesan (mis. stok tidak cukup di server).
3. Pilih:
   - **Coba lagi** — kirim ulang setelah stok diperbaiki, atau
   - **Buang** — hapus dari antrean bila transaksi memang batal.
4. Data lokal akan disegarkan dari server setelahnya.

> Hanya admin yang sebaiknya memutuskan konflik. Jangan pernah menghapus
> database browser secara manual sebelum outbox kosong.

---

## 11. Hak Akses (RLS)

| Aksi | Admin | Staf |
| --- | :---: | :---: |
| Baca bahan, menu, penjualan, mutasi | ✓ | ✓ |
| Catat penjualan | ✓ | ✓ |
| Catat mutasi masuk/keluar | ✓ | ✓ |
| Tambah/ubah/arsip bahan & menu | ✓ | – |
| Ubah/hapus penjualan | ✓ | – |
| Ubah/hapus mutasi manual | ✓ | – |
| Kelola pengguna & reset password | ✓ | – |
| Pengaturan kedai, migrasi, reset data | ✓ | – |
| Baca profil staf lain | ✓ | – (hanya profil sendiri) |

Staf **tidak bisa** menulis langsung ke tabel `penjualan`, `mutasi`, atau
`penjualan_counter`; semuanya lewat RPC yang memeriksa identitas dan stok.

Verifikasi cepat di SQL Editor:

```sql
-- Tidak boleh ada policy INSERT/UPDATE/DELETE langsung pada penjualan/mutasi
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and tablename in ('penjualan', 'mutasi');
```

---

## 12. Rutinitas Operasional

- **Backup JSON** tetap disarankan rutin: **Pengaturan → Data & Backup**.
  Backup online tidak berisi password (akun dikelola Supabase Auth).
- **Reset data operasional** mengembalikan bahan/menu/penjualan/mutasi ke contoh
  awal dan **menimpa cloud**. Hanya admin, dan membutuhkan internet.
- **Ganti password sendiri**: **Pengaturan → Keamanan Akun**. Di mode online,
  password lama tidak diminta karena sesi Supabase sudah terautentikasi.
- **Reset password staf**: **Pengguna → Reset Password**. Butuh internet.
- **Nonaktifkan staf**: **Pengguna → Ubah → Status nonaktif**. Staf yang sedang
  login akan otomatis keluar ketika profilnya berubah (Realtime).
- **Minimal satu admin aktif** selalu dijaga, baik di UI maupun server.

---

## 13. Troubleshooting

| Gejala | Kemungkinan penyebab | Solusi |
| --- | --- | --- |
| Login selalu "Username atau password salah" | Akun tidak ada / email bukan `username@banggala.local` | Buat akun di **Authentication → Users** atau lewat menu **Pengguna** |
| Login berhasil tetapi data kosong | Proyek baru, belum migrasi | Migrasikan data lokal (langkah 9) |
| "Akun ini sedang dinonaktifkan" | `profiles.aktif = false` atau user dibanned | Aktifkan kembali via **Pengguna** atau SQL |
| Error `row-level security policy` | Sesi tidak aktif / profil `aktif = false` | Cek `select * from profiles where id = auth.uid();` |
| Halaman **Pengguna** error 401/403 | Edge Function belum dideploy atau bukan admin | Deploy ulang function, cek role admin |
| Data tidak muncul di perangkat lain | Realtime belum aktif / offline | Cek badge koneksi, muat ulang, cek publication |
| Transaksi tertahan di **Konflik** | Stok server tidak cukup atau data master berubah | Perbaiki stok lalu **Coba lagi**, atau **Buang** |
| Aplikasi tidak bisa dibuka offline | Belum pernah dibuka di perangkat itu / SW belum aktif | Buka sekali saat online, tunggu indikator "Siap dipakai offline" |
| Perubahan `.env` tidak berefek di Vercel | Env var ditanam saat build | Deploy ulang setelah mengubah env |
| Badge tetap "Mode Lokal" | `VITE_SUPABASE_URL` / anon key tidak valid | Periksa `.env`, restart dev server / redeploy |

### Cek cepat koneksi & skema

```sql
-- 1. Profil & role
select id, username, role, aktif from profiles order by created_at;

-- 2. Apakah RPC ada?
select proname from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('catat_penjualan','ubah_penjualan','hapus_penjualan',
                  'catat_mutasi','ubah_mutasi','hapus_mutasi',
                  'ganti_semua_data','reset_operasional');

-- 3. Publikasi realtime
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime';
```

---

## 14. Checklist Go-Live

- [ ] Proyek Supabase dibuat, region Singapore.
- [ ] `schema.sql` dijalankan tanpa error.
- [ ] Sign up publik dimatikan; konfirmasi email dimatikan.
- [ ] Site URL & Redirect URL mengarah ke domain Vercel.
- [ ] Admin pertama dibuat dan `role = 'admin'`.
- [ ] Edge Function `admin-pengguna` berhasil dideploy.
- [ ] `.env` lokal terisi; login cloud berhasil.
- [ ] Environment Variables Vercel diisi; build sukses.
- [ ] Migrasi data lokal selesai (bila ada data lama).
- [ ] Uji: catat penjualan di perangkat A → muncul di perangkat B.
- [ ] Uji: matikan internet perangkat A → catat penjualan → nyalakan → tersinkron.
- [ ] Uji: staf tidak bisa membuka halaman Pengguna/Pengaturan.
- [ ] Backup JSON pertama diunduh dan disimpan.

---

## 15. Struktur Folder Supabase

```
supabase/
├─ schema.sql                    # Skema + RLS + RPC + Realtime (jalankan sekali)
├─ PANDUAN.md                    # Dokumen ini
└─ functions/
   └─ admin-pengguna/
      └─ index.ts                # Edge Function kelola akun staf
```
