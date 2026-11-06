import type { DB, LogAktivitas, User } from '../types'
import { buatPassword } from './auth'
import { DB_VERSION, muatDB, simpanDB } from './storage'
import {
  daftarBahanV2,
  daftarMenuAwal,
  daftarPenjualanAwal,
  mutasiPembelianV2,
  mutasiPemakaianHistoris,
  PENGATURAN_RESMI,
  waktuRelatif,
} from './dataAwal'

const seedMenu = daftarMenuAwal()
const seedMenuMap = new Map(seedMenu.map((m) => [m.id, m]))

function daftarLog(user: User): LogAktivitas[] {
  return [
    {
      id: 'log_seed_1',
      at: waktuRelatif(3, 9, 0),
      userId: user.id,
      userName: user.nama,
      aksi: 'Tambah menu',
      detail: 'Menambahkan menu contoh dari katalog Kedai Kopi Banggala',
    },
    {
      id: 'log_seed_2',
      at: waktuRelatif(5, 10, 30),
      userId: user.id,
      userName: user.nama,
      aksi: 'Stok masuk',
      detail: 'Susu UHT Full Cream +12 liter',
    },
    {
      id: 'log_seed_3',
      at: waktuRelatif(14, 9, 15),
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
    createdAt: waktuRelatif(30, 8, 0),
  }

  const penjualanAwal = daftarPenjualanAwal(admin)

  // Pastikan semua nama item penjualan sesuai katalog menu.
  const penjualan = penjualanAwal.penjualan.map((p) => ({
    ...p,
    items: p.items.map((item) => ({
      ...item,
      nama: item.nama || seedMenuMap.get(item.menuId)?.nama || item.menuId,
    })),
  }))

  return {
    version: DB_VERSION,
    users: [admin],
    bahan: daftarBahanV2(),
    mutasi: [
      ...mutasiPembelianV2(admin),
      ...mutasiPemakaianHistoris(admin),
      ...penjualanAwal.mutasiPenjualan,
    ],
    menu: seedMenu,
    penjualan,
    pengaturan: PENGATURAN_RESMI,
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
