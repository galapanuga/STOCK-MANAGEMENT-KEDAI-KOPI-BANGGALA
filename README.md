# Banggala Stock v2

Sistem pencatatan **stok bahan**, **menu & resep**, dan **penjualan** untuk **Kedai Kopi Banggala**.
Aplikasi web lokal (berjalan di browser) — **tanpa server/database eksternal**, seluruh data di `localStorage`.

Fokus **stok saja**: tidak ada perhitungan harga, HPP, omzet, laba, atau margin. Penjualan mencatat item + jumlah dan otomatis memotong stok bahan sesuai resep.

---

## Fitur

| Modul | Deskripsi |
|-------|-----------|
| **Login** | Multi-user (Admin / Staf). Password di-hash PBKDF2 (SHA-256, salt per akun). |
| **Dashboard** | Status buka/tutup (WIB), statistik bahan/penjualan/mutasi hari ini, grafik 7 hari, daftar restock, transaksi terbaru. |
| **Bahan & Stok** | Tambah/ubah/arsip bahan; kategori & satuan kustom; stok minimum; status (Aman / Menipis / Habis). **Tanpa kolom harga/nilai.** |
| **Menu & Resep** | 28 menu katalog Kedai Kopi Banggala (dari web profil) + resep **estimasi** yang bisa diedit; menu tanpa resep boleh dijual (stok tidak terpotong, diberi peringatan); Export CSV. |
| **Penjualan** | Catat multi-item; **validasi stok real-time** (tolak jika tidak cukup); nomor otomatis `PJ-YYYYMMDD-XXX`; Admin bisa edit/hapus → stok dihitung ulang. |
| **Mutasi Stok** | Masuk/keluar manual (pembelian, rusak, sample, koreksi, dsb); validasi stok tidak negatif; tanpa harga satuan. |
| **Laporan** | Periode preset/kustom; ringkasan per bahan (stok awal → masuk → keluar → akhir); rekap menu terjual (qty + jumlah transaksi); detail mutasi; **Export 3 CSV** (ringkasan, detail, penjualan); **Cetak** (A4 landscape, tanpa tombol). |
| **Pengaturan** | Identitas kedai (nama, tagline, alamat, kota, tanggal berdiri, ID Halal, IG, TikTok, Maps, GoFood, GrabFood, situs profil — **tanpa telepon**); Jam operasional per hari (WIB, Jumat libur default); Kategori & satuan bahan/menu; Keamanan akun (ubah password); **Backup/Restore JSON**; Reset data operasional; Log aktivitas 25 terbaru. |
| **Responsif** | Desktop, tablet, HP. Print-friendly. |

---

## Menjalankan

Prasyarat: **Node.js 20+** dan npm.

```bash
npm install
npm run dev
```

Buka <http://localhost:5173> (atau port yang ditampilkan Vite).

### Akun awal

| Username | Password   | Role  |
| -------- | ---------- | ----- |
| `admin`  | `admin123` | Admin |

> Segera ubah password lewat **Pengaturan → Keamanan Akun** setelah login pertama.

### Build produksi

```bash
npm run build     # type-check + build ke folder dist/
npm run preview   # menjalankan hasil build di http://localhost:4173
```

Hasil build bisa di-host di hosting statis apa pun. Aplikasi memakai `HashRouter`, tidak butuh rewrite URL.

---

## Hak Akses

| Kemampuan | Admin | Staf |
|-----------|:----:|:----:|
| Dashboard, stok, laporan | ✓ | ✓ |
| Catat stok masuk/keluar | ✓ | ✓ |
| Tambah/ubah bahan & menu | ✓ | ✓ |
| Arsipkan bahan/menu | ✓ | – |
| Ubah/hapus mutasi manual | ✓ | – |
| **Edit/hapus penjualan** | ✓ | – |
| Kelola pengguna | ✓ | – |
| Pengaturan, backup, reset | ✓ | – |

---

## Alur Pemakaian Disarankan

1. **Pengaturan** — isi identitas kedai, sesuaikan jam operasional, kategori & satuan.
2. **Menu & Resep** — periksa 28 menu katalog, sesuaikan resep estimasi ke praktik dapur.
3. **Bahan & Stok** — tambahkan bahan jika perlu; catat **stok awal** via form tambah bahan (otomatis mutasi masuk).
4. **Penjualan** — catat transaksi harian; stok otomatis terpotong.
5. **Dashboard** — pantau bahan perlu restock & status buka/tutup real-time.
6. **Laporan** — pilih periode, export CSV, atau cetak untuk arsip.
7. **Pengaturan → Data & Backup** — unduh backup JSON secara rutin.

---

## Perhitungan Stok

- **Stok saat ini** = Σ mutasi masuk − Σ mutasi keluar (seluruh waktu). Stok **tidak disimpan terpisah**, selalu konsisten dengan riwayat.
- **Status stok**:
  - `Habis` &nbsp;&nbsp; jika stok ≤ 0
  - `Menipis` jika 0 < stok ≤ stok minimum
  - `Aman` &nbsp;&nbsp;&nbsp; jika stok > stok minimum
- **Penjualan** memotong stok: Σ (resep per item × jumlah terjual).
- Menu **tanpa resep** boleh dicatat tapi **stok tidak dipotong** (ditandai “Sebagian” pada tabel).
- **Edit/hapus penjualan (admin)**: mutasi keluar lama dihapus, stok dihitung ulang dari histori bersih.
- Laporan ringkasan: `stokAkhir = stokAwal + masuk − keluar` pada periode.

---

## Penyimpanan Data & Backup

- Key localStorage: **`banggala_db_v1`** (nama sama v1 agar migrasi transparan).
- Data **melekat pada browser/perangkat**. Buka di HP lain = database terpisah.
- **Hapus data situs/browser = hapus seluruh catatan.** Backup rutin lewat **Pengaturan → Data & Backup → Unduh backup JSON**.
- Restore menimpa seluruh data dengan isi file backup.
- Dirancang untuk pemakaian lokal di satu komputer kedai, **bukan diekspos ke internet**.
- Sesi login bertahan 12 jam.

### Lupa password admin

Pulihkan backup yang masih punya akses, atau — jika tidak ada — hapus key `banggala_db_v1` di DevTools → Application → Local Storage (data kembali ke contoh awal, **seluruh catatan hilang**).

---

## Migrasi dari v1 (Otomatis)

Saat membuka aplikasi v2 dengan data v1 di localStorage:

1. **Pengaturan**: field `telepon` dibuang; field lain dipertahankan; jam operasional default terisi jika kosong.
2. **Katalog v2 ditambahkan**: 36 bahan & 28 menu web profil dimasukkan jika belum ada. Data bahan/menu lama **tidak dihapus**.
3. **Stok awal migrasi**: hanya bahan **baru** dari katalog v2 mendapat mutasi masuk sesuai seed pembelian. Bahan lama **tidak** mendapat stok ganda.
4. **Mutasi & penjualan lama utuh**: seluruh riwayat mutasi (termasuk harga satuan warisan) dan transaksi penjualan (termasuk omzet/HPP/laba warisan) **dipertahankan** di storage, tapi **tidak ditampilkan** di UI.
5. **Item penjualan lama** tanpa snapshot nama dilengkapi otomatis dari katalog menu.
6. **Idempoten**: menjalankan migrasi berkali-kali tidak menggandakan data.

> Kolom warisan uang (`hargaSatuan` di mutasi, `harga`/`hppSatuan` di item penjualan, `omzet/hpp/laba` di penjualan, `harga` di menu, `hargaRataRata/nilai` di StokInfo) **masih ada di schema** agar backup lama valid, tapi **tidak pernah dibaca/ditampilkan** di v2.

---

## Struktur Proyek

```
.
├─ index.html
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
└─ src/
   ├─ main.tsx              # entry point + provider
   ├─ App.tsx               # routing (HashRouter)
   ├─ styles.css            # tema Tailwind v4 + font lokal + gaya cetak
   ├─ types.ts              # tipe data v2 (field uang opsional/legacy)
   ├─ context/
   │  ├─ AuthContext.tsx    # sesi, login, ganti password
   │  ├─ DataContext.tsx    # data kedai + seluruh aksi (stok-only)
   │  └─ ToastContext.tsx   # notifikasi
   ├─ lib/
   │  ├─ seed.ts            # data contoh & inisialisasi v2
   │  ├─ storage.ts         # localStorage + normalisasiDB (migrasi v1→v2)
   │  ├─ auth.ts            # PBKDF2 + sesi
   │  ├─ stock.ts           # hitungStok, ringkasanPeriode, aktivitasHarian, penjualanHarian
   │  ├─ menu.ts            # kebutuhanBahan, periksaKetersediaan, rincianKebutuhan, menuTanpaResep
   │  ├─ operasional.ts     # statusBukaSekarang (Asia/Jakarta), jadwal mingguan
   │  ├─ dataAwal.ts        # katalog 28 menu + 36 bahan + seed penjualan/mutasi
   │  ├─ format.ts          # format angka/tanggal (id-ID)
   │  ├─ csv.ts             # export CSV (titik koma, BOM UTF-8) & JSON
   │  └─ id.ts              # uid, keAngka, keDesimal, pangkas
   ├─ components/
   │  ├─ Layout.tsx, ProtectedRoute.tsx, Icons.tsx
   │  └─ ui/                # Modal, Badge, Field, ConfirmDialog, dll.
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

## Catatan Teknis

- **Font lokal** (bundled di `public/fonts/`): Epilogue (display), Plus Jakarta Sans (UI), Space Mono (angka/mono).
- **Palet resmi**: `#190e09` (espresso), `#2a1810` (coffee), `#a66a1e` (caramel), `#f4bd65` (gold), `#fef8f4` (cream), `#f2ede9` (sand), `#e7ddd6` (line).
- **Zona waktu**: Semua perhitungan jam operasional memakai **Asia/Jakarta (WIB)** via `Intl.DateTimeFormat`, bukan zona perangkat.
- **Jam operasional default**: Senin–Kamis & Sabtu–Minggu 09.00–23.59, **Jumat libur**.
- **CSV**: pemisah `;`, BOM UTF-8, langsung rapi di Excel Indonesia.
- **Print laporan**: A4 landscape, header kedai + periode, footer pencetakan, tombol/navigasi disembunyikan via `.no-print`.
- **Reset data** di Pengaturan: mengembalikan bahan, menu, penjualan, mutasi ke data contoh awal; **akun & identitas kedai dipertahankan**.

---

## QA Otomatis (skrip sementara)

```bash
npx esbuild qa-sementara.ts --bundle --platform=node --format=esm --outfile=/tmp/qa.mjs && node /tmp/qa.mjs
```

Menguji:
- Integritas seed (28 menu, 36 bahan, 3 penjualan seed, mutasi konsisten)
- Stok non-negatif (akhir & berjalan kronologis)
- Validitas resep (bahanId valid, jumlah > 0, tidak duplikat)
- Penolakan stok tidak cukup (`periksaKetersediaan`)
- Migrasi v1→v2 (data lama utuh, katalog v2 ditambah, stok awal hanya bahan baru, telepon dibuang, field uang warisan dipertahankan)
- Status buka/tutup WIB (Senin–Kamis/Sabtu–Minggu 09.00–23.59, Jumat libur, komputasi `Asia/Jakarta`)

---

## Lisensi

Internal — Kedai Kopi Banggala.