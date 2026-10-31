import type { Bahan, DB, LogAktivitas, Mutasi, Pengaturan, User } from '../types'
import { buatPassword } from './auth'
import { muatDB, simpanDB } from './storage'

export const KATEGORI_BAWAAN = [
  'Biji Kopi',
  'Dairy',
  'Sirup & Gula',
  'Bubuk',
  'Kemasan',
  'Lainnya',
]

export const SATUAN_BAWAAN = [
  'kg',
  'gram',
  'liter',
  'ml',
  'pcs',
  'botol',
  'pack',
  'box',
]

const PENGATURAN_BAWAAN: Pengaturan = {
  namaKedai: 'Kedai Kopi Banggala',
  alamat: 'Jl. Kopi No. 17, Bandung',
  telepon: '0812-3456-7890',
  kategoriBahan: KATEGORI_BAWAAN,
  satuanBahan: SATUAN_BAWAAN,
}

function waktu(hariLalu: number, jam: number, menit = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - hariLalu)
  d.setHours(jam, menit, 0, 0)
  return d.toISOString()
}

function daftarBahan(): Bahan[] {
  const dibuat = waktu(30, 8, 0)
  return [
    { id: 'bhn_arabika', nama: 'Biji Kopi Arabika', kategori: 'Biji Kopi', satuan: 'kg', stokMin: 2, arsip: false, createdAt: dibuat },
    { id: 'bhn_robusta', nama: 'Biji Kopi Robusta', kategori: 'Biji Kopi', satuan: 'kg', stokMin: 2, arsip: false, createdAt: dibuat },
    { id: 'bhn_susu', nama: 'Susu UHT Full Cream', kategori: 'Dairy', satuan: 'liter', stokMin: 6, arsip: false, createdAt: dibuat },
    { id: 'bhn_gulaaren', nama: 'Gula Aren Cair', kategori: 'Sirup & Gula', satuan: 'liter', stokMin: 3, arsip: false, createdAt: dibuat },
    { id: 'bhn_vanila', nama: 'Sirup Vanila', kategori: 'Sirup & Gula', satuan: 'botol', stokMin: 2, arsip: false, createdAt: dibuat },
    { id: 'bhn_matcha', nama: 'Bubuk Matcha', kategori: 'Bubuk', satuan: 'gram', stokMin: 300, arsip: false, createdAt: dibuat },
    { id: 'bhn_cokelat', nama: 'Bubuk Cokelat', kategori: 'Bubuk', satuan: 'gram', stokMin: 500, arsip: false, createdAt: dibuat },
    { id: 'bhn_cup12', nama: 'Cup 12 oz', kategori: 'Kemasan', satuan: 'pcs', stokMin: 100, arsip: false, createdAt: dibuat },
    { id: 'bhn_cup16', nama: 'Cup 16 oz', kategori: 'Kemasan', satuan: 'pcs', stokMin: 100, arsip: false, createdAt: dibuat },
    { id: 'bhn_lid', nama: 'Lid Cup', kategori: 'Kemasan', satuan: 'pcs', stokMin: 150, arsip: false, createdAt: dibuat },
    { id: 'bhn_es', nama: 'Es Batu', kategori: 'Lainnya', satuan: 'kg', stokMin: 5, arsip: false, createdAt: dibuat },
    { id: 'bhn_sedotan', nama: 'Sedotan Kertas', kategori: 'Kemasan', satuan: 'pcs', stokMin: 100, arsip: false, createdAt: dibuat },
    { id: 'bhn_teh', nama: 'Teh Celup', kategori: 'Lainnya', satuan: 'pcs', stokMin: 50, arsip: false, createdAt: dibuat },
    { id: 'bhn_oat', nama: 'Susu Oat', kategori: 'Dairy', satuan: 'liter', stokMin: 2, arsip: false, createdAt: waktu(3, 9, 0) },
  ]
}

interface MutasiSeed {
  bahanId: string
  tipe: 'masuk' | 'keluar'
  jumlah: number
  harga?: number
  alasan?: string
  keterangan?: string
  hari: number
  jam: number
  menit?: number
}

function daftarMutasi(user: User): Mutasi[] {
  const seed: MutasiSeed[] = [
    // Pembelian / stok masuk
    { bahanId: 'bhn_arabika', tipe: 'masuk', jumlah: 8, harga: 180_000, keterangan: 'Pembelian dari Kopi Nusantara', hari: 14, jam: 9, menit: 15 },
    { bahanId: 'bhn_robusta', tipe: 'masuk', jumlah: 6, harga: 120_000, keterangan: 'Pembelian dari Kopi Nusantara', hari: 14, jam: 9, menit: 20 },
    { bahanId: 'bhn_susu', tipe: 'masuk', jumlah: 24, harga: 22_000, keterangan: 'Pembelian dari Toko Dairy Segar', hari: 14, jam: 9, menit: 30 },
    { bahanId: 'bhn_gulaaren', tipe: 'masuk', jumlah: 8, harga: 35_000, keterangan: 'Pembelian gula aren cair', hari: 13, jam: 10, menit: 0 },
    { bahanId: 'bhn_vanila', tipe: 'masuk', jumlah: 4, harga: 85_000, keterangan: 'Pembelian sirup vanila', hari: 13, jam: 10, menit: 10 },
    { bahanId: 'bhn_matcha', tipe: 'masuk', jumlah: 1000, harga: 300, keterangan: 'Matcha grade premium', hari: 13, jam: 10, menit: 20 },
    { bahanId: 'bhn_cokelat', tipe: 'masuk', jumlah: 2000, harga: 80, keterangan: 'Bubuk cokelat', hari: 12, jam: 11, menit: 0 },
    { bahanId: 'bhn_cup12', tipe: 'masuk', jumlah: 1000, harga: 700, keterangan: 'Kemasan cup 12 oz', hari: 12, jam: 11, menit: 10 },
    { bahanId: 'bhn_cup16', tipe: 'masuk', jumlah: 1000, harga: 850, keterangan: 'Kemasan cup 16 oz', hari: 12, jam: 11, menit: 20 },
    { bahanId: 'bhn_lid', tipe: 'masuk', jumlah: 1000, harga: 250, keterangan: 'Lid cup', hari: 12, jam: 11, menit: 30 },
    { bahanId: 'bhn_es', tipe: 'masuk', jumlah: 40, harga: 5_000, keterangan: 'Es batu kristal', hari: 11, jam: 9, menit: 0 },
    { bahanId: 'bhn_sedotan', tipe: 'masuk', jumlah: 500, harga: 300, keterangan: 'Sedotan kertas', hari: 11, jam: 9, menit: 10 },
    { bahanId: 'bhn_teh', tipe: 'masuk', jumlah: 200, harga: 1_000, keterangan: 'Teh celup', hari: 10, jam: 9, menit: 0 },
    { bahanId: 'bhn_susu', tipe: 'masuk', jumlah: 12, harga: 23_000, keterangan: 'Restock susu (harga naik)', hari: 5, jam: 10, menit: 30 },

    // Pemakaian harian
    { bahanId: 'bhn_arabika', tipe: 'keluar', jumlah: 1, alasan: 'Pemakaian', keterangan: 'Produksi espresso', hari: 12, jam: 14 },
    { bahanId: 'bhn_arabika', tipe: 'keluar', jumlah: 1.2, alasan: 'Pemakaian', keterangan: 'Produksi espresso', hari: 10, jam: 14 },
    { bahanId: 'bhn_arabika', tipe: 'keluar', jumlah: 1, alasan: 'Pemakaian', keterangan: 'Produksi espresso', hari: 8, jam: 14 },
    { bahanId: 'bhn_arabika', tipe: 'keluar', jumlah: 1, alasan: 'Pemakaian', keterangan: 'Produksi espresso', hari: 6, jam: 14 },
    { bahanId: 'bhn_arabika', tipe: 'keluar', jumlah: 1, alasan: 'Pemakaian', keterangan: 'Produksi espresso', hari: 4, jam: 14 },
    { bahanId: 'bhn_arabika', tipe: 'keluar', jumlah: 1, alasan: 'Pemakaian', keterangan: 'Produksi espresso', hari: 2, jam: 14 },

    { bahanId: 'bhn_robusta', tipe: 'keluar', jumlah: 0.5, alasan: 'Pemakaian', keterangan: 'Blend house', hari: 11, jam: 13 },
    { bahanId: 'bhn_robusta', tipe: 'keluar', jumlah: 0.5, alasan: 'Pemakaian', keterangan: 'Blend house', hari: 9, jam: 13 },
    { bahanId: 'bhn_robusta', tipe: 'keluar', jumlah: 0.5, alasan: 'Pemakaian', keterangan: 'Blend house', hari: 7, jam: 13 },
    { bahanId: 'bhn_robusta', tipe: 'keluar', jumlah: 0.5, alasan: 'Pemakaian', keterangan: 'Blend house', hari: 5, jam: 13 },
    { bahanId: 'bhn_robusta', tipe: 'keluar', jumlah: 0.5, alasan: 'Pemakaian', keterangan: 'Blend house', hari: 3, jam: 13 },

    { bahanId: 'bhn_susu', tipe: 'keluar', jumlah: 2, alasan: 'Pemakaian', keterangan: 'Latte & capuccino', hari: 12, jam: 15 },
    { bahanId: 'bhn_susu', tipe: 'keluar', jumlah: 2, alasan: 'Pemakaian', keterangan: 'Latte & capuccino', hari: 10, jam: 15 },
    { bahanId: 'bhn_susu', tipe: 'keluar', jumlah: 2, alasan: 'Pemakaian', keterangan: 'Latte & capuccino', hari: 8, jam: 15 },
    { bahanId: 'bhn_susu', tipe: 'keluar', jumlah: 2, alasan: 'Pemakaian', keterangan: 'Latte & capuccino', hari: 6, jam: 15 },
    { bahanId: 'bhn_susu', tipe: 'keluar', jumlah: 2, alasan: 'Pemakaian', keterangan: 'Latte & capuccino', hari: 4, jam: 15 },
    { bahanId: 'bhn_susu', tipe: 'keluar', jumlah: 2, alasan: 'Pemakaian', keterangan: 'Latte & capuccino', hari: 2, jam: 15 },
    { bahanId: 'bhn_susu', tipe: 'keluar', jumlah: 2, alasan: 'Pemakaian', keterangan: 'Latte & capuccino', hari: 1, jam: 15 },

    { bahanId: 'bhn_gulaaren', tipe: 'keluar', jumlah: 0.4, alasan: 'Pemakaian', keterangan: 'Kopi susu gula aren', hari: 11, jam: 16 },
    { bahanId: 'bhn_gulaaren', tipe: 'keluar', jumlah: 0.4, alasan: 'Pemakaian', keterangan: 'Kopi susu gula aren', hari: 9, jam: 16 },
    { bahanId: 'bhn_gulaaren', tipe: 'keluar', jumlah: 0.4, alasan: 'Pemakaian', keterangan: 'Kopi susu gula aren', hari: 7, jam: 16 },
    { bahanId: 'bhn_gulaaren', tipe: 'keluar', jumlah: 0.4, alasan: 'Pemakaian', keterangan: 'Kopi susu gula aren', hari: 5, jam: 16 },
    { bahanId: 'bhn_gulaaren', tipe: 'keluar', jumlah: 0.4, alasan: 'Pemakaian', keterangan: 'Kopi susu gula aren', hari: 3, jam: 16 },
    { bahanId: 'bhn_gulaaren', tipe: 'keluar', jumlah: 0.4, alasan: 'Pemakaian', keterangan: 'Kopi susu gula aren', hari: 1, jam: 16 },

    { bahanId: 'bhn_vanila', tipe: 'keluar', jumlah: 1, alasan: 'Pemakaian', keterangan: 'Sirup vanila latte', hari: 7, jam: 16 },

    { bahanId: 'bhn_matcha', tipe: 'keluar', jumlah: 60, alasan: 'Pemakaian', keterangan: 'Matcha latte', hari: 11, jam: 14 },
    { bahanId: 'bhn_matcha', tipe: 'keluar', jumlah: 60, alasan: 'Pemakaian', keterangan: 'Matcha latte', hari: 9, jam: 14 },
    { bahanId: 'bhn_matcha', tipe: 'keluar', jumlah: 60, alasan: 'Pemakaian', keterangan: 'Matcha latte', hari: 7, jam: 14 },
    { bahanId: 'bhn_matcha', tipe: 'keluar', jumlah: 60, alasan: 'Pemakaian', keterangan: 'Matcha latte', hari: 5, jam: 14 },
    { bahanId: 'bhn_matcha', tipe: 'keluar', jumlah: 60, alasan: 'Pemakaian', keterangan: 'Matcha latte', hari: 3, jam: 14 },
    { bahanId: 'bhn_matcha', tipe: 'keluar', jumlah: 60, alasan: 'Pemakaian', keterangan: 'Matcha latte', hari: 1, jam: 14 },

    { bahanId: 'bhn_cokelat', tipe: 'keluar', jumlah: 100, alasan: 'Pemakaian', keterangan: 'Cokelat panas', hari: 10, jam: 14 },
    { bahanId: 'bhn_cokelat', tipe: 'keluar', jumlah: 100, alasan: 'Pemakaian', keterangan: 'Cokelat panas', hari: 8, jam: 14 },
    { bahanId: 'bhn_cokelat', tipe: 'keluar', jumlah: 100, alasan: 'Pemakaian', keterangan: 'Cokelat panas', hari: 6, jam: 14 },
    { bahanId: 'bhn_cokelat', tipe: 'keluar', jumlah: 100, alasan: 'Pemakaian', keterangan: 'Cokelat panas', hari: 4, jam: 14 },
    { bahanId: 'bhn_cokelat', tipe: 'keluar', jumlah: 100, alasan: 'Pemakaian', keterangan: 'Cokelat panas', hari: 2, jam: 14 },

    { bahanId: 'bhn_cup12', tipe: 'keluar', jumlah: 60, alasan: 'Pemakaian', keterangan: 'Penjualan minuman', hari: 10, jam: 20 },
    { bahanId: 'bhn_cup12', tipe: 'keluar', jumlah: 60, alasan: 'Pemakaian', keterangan: 'Penjualan minuman', hari: 8, jam: 20 },
    { bahanId: 'bhn_cup12', tipe: 'keluar', jumlah: 60, alasan: 'Pemakaian', keterangan: 'Penjualan minuman', hari: 6, jam: 20 },
    { bahanId: 'bhn_cup12', tipe: 'keluar', jumlah: 60, alasan: 'Pemakaian', keterangan: 'Penjualan minuman', hari: 4, jam: 20 },
    { bahanId: 'bhn_cup12', tipe: 'keluar', jumlah: 60, alasan: 'Pemakaian', keterangan: 'Penjualan minuman', hari: 2, jam: 20 },
    { bahanId: 'bhn_cup12', tipe: 'keluar', jumlah: 60, alasan: 'Pemakaian', keterangan: 'Penjualan minuman', hari: 1, jam: 20 },

    { bahanId: 'bhn_cup16', tipe: 'keluar', jumlah: 50, alasan: 'Pemakaian', keterangan: 'Penjualan minuman', hari: 10, jam: 20 },
    { bahanId: 'bhn_cup16', tipe: 'keluar', jumlah: 50, alasan: 'Pemakaian', keterangan: 'Penjualan minuman', hari: 8, jam: 20 },
    { bahanId: 'bhn_cup16', tipe: 'keluar', jumlah: 50, alasan: 'Pemakaian', keterangan: 'Penjualan minuman', hari: 6, jam: 20 },
    { bahanId: 'bhn_cup16', tipe: 'keluar', jumlah: 50, alasan: 'Pemakaian', keterangan: 'Penjualan minuman', hari: 4, jam: 20 },
    { bahanId: 'bhn_cup16', tipe: 'keluar', jumlah: 50, alasan: 'Pemakaian', keterangan: 'Penjualan minuman', hari: 2, jam: 20 },
    { bahanId: 'bhn_cup16', tipe: 'keluar', jumlah: 50, alasan: 'Pemakaian', keterangan: 'Penjualan minuman', hari: 1, jam: 20 },

    { bahanId: 'bhn_lid', tipe: 'keluar', jumlah: 130, alasan: 'Pemakaian', keterangan: 'Lid untuk semua cup', hari: 10, jam: 20 },
    { bahanId: 'bhn_lid', tipe: 'keluar', jumlah: 130, alasan: 'Pemakaian', keterangan: 'Lid untuk semua cup', hari: 9, jam: 20 },
    { bahanId: 'bhn_lid', tipe: 'keluar', jumlah: 130, alasan: 'Pemakaian', keterangan: 'Lid untuk semua cup', hari: 8, jam: 20 },
    { bahanId: 'bhn_lid', tipe: 'keluar', jumlah: 130, alasan: 'Pemakaian', keterangan: 'Lid untuk semua cup', hari: 7, jam: 20 },
    { bahanId: 'bhn_lid', tipe: 'keluar', jumlah: 130, alasan: 'Pemakaian', keterangan: 'Lid untuk semua cup', hari: 6, jam: 20 },
    { bahanId: 'bhn_lid', tipe: 'keluar', jumlah: 130, alasan: 'Pemakaian', keterangan: 'Lid untuk semua cup', hari: 5, jam: 20 },
    { bahanId: 'bhn_lid', tipe: 'keluar', jumlah: 130, alasan: 'Pemakaian', keterangan: 'Lid untuk semua cup', hari: 2, jam: 20 },

    { bahanId: 'bhn_es', tipe: 'keluar', jumlah: 3, alasan: 'Pemakaian', keterangan: 'Minuman dingin', hari: 11, jam: 21 },
    { bahanId: 'bhn_es', tipe: 'keluar', jumlah: 3, alasan: 'Pemakaian', keterangan: 'Minuman dingin', hari: 9, jam: 21 },
    { bahanId: 'bhn_es', tipe: 'keluar', jumlah: 3, alasan: 'Pemakaian', keterangan: 'Minuman dingin', hari: 7, jam: 21 },
    { bahanId: 'bhn_es', tipe: 'keluar', jumlah: 3, alasan: 'Pemakaian', keterangan: 'Minuman dingin', hari: 5, jam: 21 },
    { bahanId: 'bhn_es', tipe: 'keluar', jumlah: 3, alasan: 'Pemakaian', keterangan: 'Minuman dingin', hari: 3, jam: 21 },
    { bahanId: 'bhn_es', tipe: 'keluar', jumlah: 3, alasan: 'Pemakaian', keterangan: 'Minuman dingin', hari: 1, jam: 21 },
    { bahanId: 'bhn_es', tipe: 'keluar', jumlah: 2, alasan: 'Rusak', keterangan: 'Es mencair saat pengiriman', hari: 2, jam: 10 },

    { bahanId: 'bhn_sedotan', tipe: 'keluar', jumlah: 30, alasan: 'Pemakaian', keterangan: 'Sedotan minuman', hari: 10, jam: 20 },
    { bahanId: 'bhn_sedotan', tipe: 'keluar', jumlah: 30, alasan: 'Pemakaian', keterangan: 'Sedotan minuman', hari: 8, jam: 20 },
    { bahanId: 'bhn_sedotan', tipe: 'keluar', jumlah: 30, alasan: 'Pemakaian', keterangan: 'Sedotan minuman', hari: 6, jam: 20 },
    { bahanId: 'bhn_sedotan', tipe: 'keluar', jumlah: 30, alasan: 'Pemakaian', keterangan: 'Sedotan minuman', hari: 4, jam: 20 },
    { bahanId: 'bhn_sedotan', tipe: 'keluar', jumlah: 30, alasan: 'Pemakaian', keterangan: 'Sedotan minuman', hari: 2, jam: 20 },
    { bahanId: 'bhn_sedotan', tipe: 'keluar', jumlah: 30, alasan: 'Pemakaian', keterangan: 'Sedotan minuman', hari: 1, jam: 20 },

    { bahanId: 'bhn_teh', tipe: 'keluar', jumlah: 8, alasan: 'Pemakaian', keterangan: 'Teh tubruk', hari: 9, jam: 17 },
    { bahanId: 'bhn_teh', tipe: 'keluar', jumlah: 8, alasan: 'Pemakaian', keterangan: 'Teh tubruk', hari: 7, jam: 17 },
    { bahanId: 'bhn_teh', tipe: 'keluar', jumlah: 8, alasan: 'Pemakaian', keterangan: 'Teh tubruk', hari: 5, jam: 17 },
    { bahanId: 'bhn_teh', tipe: 'keluar', jumlah: 8, alasan: 'Pemakaian', keterangan: 'Teh tubruk', hari: 3, jam: 17 },
    { bahanId: 'bhn_teh', tipe: 'keluar', jumlah: 8, alasan: 'Pemakaian', keterangan: 'Teh tubruk', hari: 1, jam: 17 },

    // Aktivitas pagi ini
    { bahanId: 'bhn_arabika', tipe: 'keluar', jumlah: 0.5, alasan: 'Pemakaian', keterangan: 'Produksi espresso pagi', hari: 0, jam: 7, menit: 15 },
    { bahanId: 'bhn_susu', tipe: 'keluar', jumlah: 2, alasan: 'Pemakaian', keterangan: 'Latte pagi', hari: 0, jam: 7, menit: 30 },
    { bahanId: 'bhn_cup12', tipe: 'keluar', jumlah: 40, alasan: 'Pemakaian', keterangan: 'Penjualan minuman', hari: 0, jam: 8, menit: 0 },
    { bahanId: 'bhn_lid', tipe: 'keluar', jumlah: 40, alasan: 'Pemakaian', keterangan: 'Lid untuk semua cup', hari: 0, jam: 8, menit: 5 },
    { bahanId: 'bhn_es', tipe: 'keluar', jumlah: 2, alasan: 'Pemakaian', keterangan: 'Minuman dingin', hari: 0, jam: 8, menit: 20 },
  ]

  return seed.map((s, i) => {
    const tanggal = waktu(s.hari, s.jam, s.menit ?? 0)
    return {
      id: `mut_seed_${i + 1}`,
      bahanId: s.bahanId,
      tipe: s.tipe,
      jumlah: s.jumlah,
      hargaSatuan: s.harga,
      alasan: s.alasan,
      keterangan: s.keterangan,
      tanggal,
      userId: user.id,
      userName: user.nama,
      createdAt: tanggal,
    }
  })
}

function daftarLog(user: User): LogAktivitas[] {
  return [
    {
      id: 'log_seed_1',
      at: waktu(3, 9, 0),
      userId: user.id,
      userName: user.nama,
      aksi: 'Tambah bahan',
      detail: 'Menambahkan bahan "Susu Oat"',
    },
    {
      id: 'log_seed_2',
      at: waktu(5, 10, 30),
      userId: user.id,
      userName: user.nama,
      aksi: 'Stok masuk',
      detail: 'Susu UHT Full Cream +12 liter',
    },
    {
      id: 'log_seed_3',
      at: waktu(14, 9, 15),
      userId: user.id,
      userName: user.nama,
      aksi: 'Stok masuk',
      detail: 'Biji Kopi Arabika +8 kg',
    },
  ]
}

export async function buatDatabaseAwal(): Promise<DB> {
  const { salt, hash } = await buatPassword('admin123')
  const admin: User = {
    id: 'usr_admin',
    username: 'admin',
    nama: 'Admin Banggala',
    role: 'admin',
    passwordHash: hash,
    salt,
    aktif: true,
    createdAt: waktu(30, 8, 0),
    passwordChangedAt: undefined,
  }

  return {
    version: 1,
    users: [admin],
    bahan: daftarBahan(),
    mutasi: daftarMutasi(admin),
    pengaturan: PENGATURAN_BAWAAN,
    log: daftarLog(admin),
  }
}

export async function inisialisasiDB(): Promise<DB> {
  const ada = muatDB()
  if (ada && ada.users.length > 0) return ada
  const db = await buatDatabaseAwal()
  simpanDB(db)
  return db
}
