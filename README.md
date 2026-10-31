# Banggala Stock

Sistem pencatatan stok bahan untuk **Kedai Kopi Banggala**. Aplikasi web lokal
(berjalan di browser) untuk mencatat bahan masuk/keluar, memantau sisa stok,
memberi peringatan stok menipis, serta membuat laporan harian/bulanan.

Dibangun dengan React 19 + TypeScript + Vite + Tailwind CSS v4. Tidak memerlukan
server atau database eksternal — seluruh data disimpan di `localStorage` browser.

---

## Fitur

- **Login multi-user** dengan role **Admin** dan **Staf**. Password di-hash
  memakai PBKDF2 (SHA-256, salt per akun), bukan disimpan sebagai teks biasa.
- **Dashboard**: nilai persediaan, daftar bahan yang perlu restock, grafik nilai
  pemakaian 7 hari, dan aktivitas mutasi terbaru.
- **Bahan & stok**: tambah/ubah/arsip bahan, kategori, satuan, stok minimum,
  harga rata-rata, nilai persediaan, dan status (Aman / Menipis / Habis).
- **Mutasi stok**: catat stok masuk (dengan harga beli) dan stok keluar
  (pemakaian, rusak, tumpah, sample, koreksi). Stok dihitung otomatis dari
  seluruh riwayat mutasi.
- **Validasi**: stok keluar tidak bisa melebihi stok tersedia; nama bahan
  duplikat ditolak; minimal satu admin harus tetap aktif.
- **Laporan**: filter periode (hari ini, 7 hari, bulan ini, bulan lalu, kustom),
  ringkasan per bahan (stok awal → masuk → keluar → stok akhir), detail mutasi,
  **export CSV**, dan **cetak** (A4 landscape).
- **Pengguna**: kelola akun, role, status aktif, dan reset password.
- **Pengaturan**: identitas kedai, master kategori/satuan, ubah password sendiri,
  **backup/restore JSON**, reset data, dan log aktivitas.
- **Responsif** untuk desktop, tablet, dan HP.

---

## Menjalankan

Prasyarat: **Node.js 20+** dan npm.

```bash
npm install
npm run dev
```

Buka <http://localhost:5173>.

### Akun awal

| Username | Password   | Role  |
| -------- | ---------- | ----- |
| `admin`  | `admin123` | Admin |

> Segera ubah password melalui **Pengaturan → Keamanan Akun** setelah login
> pertama. Hint akun awal di halaman login hanya berlaku selama password belum
> diubah.

### Build produksi

```bash
npm run build     # type-check + build ke folder dist/
npm run preview   # menjalankan hasil build di http://localhost:4173
```

Hasil build dapat di-host di hosting statis apa pun. Aplikasi memakai
`HashRouter`, jadi tidak memerlukan konfigurasi rewrite URL.

---

## Hak Akses

| Kemampuan                       | Admin | Staf |
| ------------------------------- | :---: | :--: |
| Melihat dashboard & stok        |   ✓   |  ✓   |
| Mencatat stok masuk/keluar      |   ✓   |  ✓   |
| Melihat & export laporan        |   ✓   |  ✓   |
| Tambah/ubah bahan               |   ✓   |  ✓   |
| Arsipkan bahan                  |   ✓   |  –   |
| Ubah/hapus mutasi               |   ✓   |  –   |
| Kelola pengguna                 |   ✓   |  –   |
| Pengaturan, backup, reset data  |   ✓   |  –   |

---

## Alur Pemakaian yang Disarankan

1. **Pengaturan** — isi identitas kedai, sesuaikan kategori dan satuan.
2. **Bahan & Stok** — tambahkan seluruh bahan. Isi stok awal dan harga satuan
   pada form tambah bahan (otomatis tercatat sebagai mutasi masuk).
3. **Mutasi Stok** — catat pembelian bahan setiap restock, dan catat pemakaian
   atau bahan rusak setiap hari.
4. **Dashboard** — pantau bahan berstatus *Menipis*/*Habis* dan nilai persediaan.
5. **Laporan** — pilih periode, export CSV ke Excel, atau cetak untuk arsip.
6. **Pengaturan → Data & Backup** — unduh backup JSON secara rutin.

---

## Perhitungan Stok

- **Stok saat ini** = total mutasi masuk − total mutasi keluar (seluruh waktu).
  Stok tidak disimpan sebagai angka terpisah, sehingga selalu konsisten dengan
  riwayat.
- **Harga rata-rata** = total nilai pembelian ÷ total kuantitas pembelian
  (weighted average). Harga ini dipakai untuk menilai persediaan dan estimasi
  nilai pemakaian.
- **Status stok**:
  - `Habis` jika stok ≤ 0
  - `Menipis` jika 0 < stok ≤ stok minimum
  - `Aman` jika stok > stok minimum
- **Nilai persediaan** = Σ (stok × harga rata-rata).
- **Nilai keluar** pada laporan adalah estimasi: kuantitas keluar × harga
  rata-rata bahan.

CSV memakai pemisah titik koma (`;`) dan BOM UTF-8 agar langsung rapi saat
dibuka di Excel dengan format Indonesia.

---

## Penyimpanan Data & Backup

- Data disimpan di `localStorage` dengan key **`banggala_db_v1`**.
- Data **melekat pada browser/perangkat**. Membuka aplikasi di HP lain akan
  memakai database terpisah, bukan data yang sama.
- Menghapus data situs/browser akan menghilangkan seluruh catatan. **Lakukan
  backup rutin** melalui **Pengaturan → Data & Backup → Unduh backup JSON**.
- Restore akan menimpa seluruh data saat ini dengan isi file backup.
- Aplikasi ini dirancang untuk pemakaian lokal di satu komputer kedai, bukan
  untuk diekspos ke internet. Sesi login disimpan di browser selama 12 jam.

### Jika lupa password admin

Pulihkan backup yang masih memiliki akses, atau — jika tidak ada — hapus key
`banggala_db_v1` di DevTools → Application → Local Storage (data akan kembali ke
contoh awal dan seluruh catatan hilang).

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
   ├─ App.tsx               # routing
   ├─ styles.css            # tema Tailwind + gaya cetak
   ├─ types.ts              # tipe data
   ├─ context/
   │  ├─ AuthContext.tsx    # sesi, login, ganti password
   │  ├─ DataContext.tsx    # data kedai + seluruh aksi
   │  └─ ToastContext.tsx   # notifikasi
   ├─ lib/
   │  ├─ seed.ts            # data contoh & inisialisasi
   │  ├─ storage.ts         # localStorage
   │  ├─ auth.ts            # PBKDF2 + sesi
   │  ├─ stock.ts           # perhitungan stok & laporan
   │  ├─ format.ts          # format Rupiah/tanggal
   │  ├─ csv.ts             # export CSV/JSON
   │  └─ id.ts              # util id & angka
   ├─ components/
   │  ├─ Layout.tsx, ProtectedRoute.tsx, Icons.tsx
   │  └─ ui/                # Modal, Badge, Field, dll.
   └─ pages/
      ├─ LoginPage.tsx
      ├─ DashboardPage.tsx
      ├─ BahanPage.tsx
      ├─ MutasiPage.tsx
      ├─ LaporanPage.tsx
      ├─ PenggunaPage.tsx
      └─ PengaturanPage.tsx
```

---

## Catatan Teknis

- Format mata uang: `Rp 1.234.567`; tanggal: `31 Okt 2026` (locale `id-ID`).
- Akses dari HP dalam jaringan yang sama: jalankan `npm run dev -- --host`,
  lalu buka alamat IP komputer (mis. `http://192.168.1.10:5173`). Ingat bahwa
  data tetap terpisah per perangkat.
- PDF/print laporan diatur ke A4 landscape.
- Reset data di Pengaturan hanya mengembalikan **bahan & mutasi** ke data contoh;
  akun dan identitas kedai dipertahankan.
