import type { DB } from '../types'

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
      log: Array.isArray(db.log) ? db.log : [],
      pengaturan: {
        namaKedai: db.pengaturan?.namaKedai ?? 'Kedai Kopi Banggala',
        alamat: db.pengaturan?.alamat ?? '',
        telepon: db.pengaturan?.telepon ?? '',
        kategoriBahan: db.pengaturan?.kategoriBahan ?? [],
        satuanBahan: db.pengaturan?.satuanBahan ?? [],
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
