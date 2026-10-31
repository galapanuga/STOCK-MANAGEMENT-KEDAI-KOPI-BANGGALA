import type { DB } from '../types'
import { PENGATURAN_RESMI } from './dataAwal'

export const KUNCI_DB = 'banggala_db_v1'

export function muatDB(): DB | null {
  try {
    const mentah = localStorage.getItem(KUNCI_DB)
    if (!mentah) return null
    const db = JSON.parse(mentah) as DB
    if (!db || !Array.isArray(db.users) || !Array.isArray(db.bahan)) return null
    return {
      version: db.version ?? 1,
      users: db.users,
      bahan: db.bahan,
      mutasi: Array.isArray(db.mutasi) ? db.mutasi : [],
      menu: Array.isArray(db.menu) ? db.menu : [],
      penjualan: Array.isArray(db.penjualan) ? db.penjualan : [],
      log: Array.isArray(db.log) ? db.log : [],
      pengaturan: {
        ...PENGATURAN_RESMI,
        ...db.pengaturan,
      },
    }
  } catch {
    return null
  }
}

export function simpanDB(db: DB): void {
  try {
    localStorage.setItem(KUNCI_DB, JSON.stringify(db))
  } catch (error) {
    console.error('Gagal menyimpan data', error)
    throw new Error(
      'Penyimpanan browser penuh. Unduh backup lalu hapus data lama.',
    )
  }
}

export function hapusDB(): void {
  localStorage.removeItem(KUNCI_DB)
}
