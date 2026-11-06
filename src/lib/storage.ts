import type { Bahan, DB, Menu, Mutasi, Pengaturan } from '../types'
import {
  daftarBahanV2,
  daftarMenuAwal,
  KATEGORI_BAHAN_BAWAAN,
  KATEGORI_MENU_BAWAAN,
  mutasiPembelianV2,
  SATUAN_BAHAN_BAWAAN,
} from './dataAwal'
import { JAM_OPERASIONAL_RESMI } from './operasional'

export const KUNCI_DB = 'banggala_db_v1'
export const DB_VERSION = 2

const PENGATURAN_DEFAULT: Pengaturan = {
  namaKedai: 'Kedai Kopi Banggala',
  tagline: 'Sedikit, tapi terus berjalan.',
  alamat:
    'Jl. Serbaguna, Jadimulya, Kec. Gunungjati, Kabupaten Cirebon, Jawa Barat 45151',
  kota: 'Gunungjati, Cirebon',
  tanggalBerdiri: '2024-01-15',
  halalId: 'ID31410022479980525',
  instagram: 'kedaikopibanggala',
  tiktok: 'kopibanggala',
  mapsUrl: 'https://maps.google.com/?q=Kedai+Kopi+Banggala+Gunungjati+Cirebon',
  gofoodUrl:
    'https://gofood.co.id/cirebon/restaurant/kedai-kopi-banggala-kel-jadimulya-kec-gunungjati-9048bf6a-2cc8-4167-807d-259a52373f27',
  grabfoodUrl:
    'https://food.grab.com/id/en/restaurant/kedai-kopi-banggala-jadimulya-delivery/6-C7NHDGBWGBU3T6?sourceID=20260624_202846_5e816fccf79f4ff783c2f6569262d197_MEXMPS',
  situsUrl: 'https://kedaikopibanggala.vercel.app/',
  jamOperasional: JAM_OPERASIONAL_RESMI,
  kategoriBahan: KATEGORI_BAHAN_BAWAAN,
  satuanBahan: SATUAN_BAHAN_BAWAAN,
  kategoriMenu: KATEGORI_MENU_BAWAAN,
}

function normalisasiPengaturan(p: Partial<Pengaturan>): Pengaturan {
  return {
    namaKedai: p.namaKedai ?? PENGATURAN_DEFAULT.namaKedai,
    tagline: p.tagline ?? PENGATURAN_DEFAULT.tagline,
    alamat: p.alamat ?? PENGATURAN_DEFAULT.alamat,
    kota: p.kota ?? PENGATURAN_DEFAULT.kota,
    tanggalBerdiri: p.tanggalBerdiri ?? PENGATURAN_DEFAULT.tanggalBerdiri,
    halalId: p.halalId ?? PENGATURAN_DEFAULT.halalId,
    instagram: p.instagram ?? PENGATURAN_DEFAULT.instagram,
    tiktok: p.tiktok ?? PENGATURAN_DEFAULT.tiktok,
    mapsUrl: p.mapsUrl ?? PENGATURAN_DEFAULT.mapsUrl,
    gofoodUrl: p.gofoodUrl ?? PENGATURAN_DEFAULT.gofoodUrl,
    grabfoodUrl: p.grabfoodUrl ?? PENGATURAN_DEFAULT.grabfoodUrl,
    situsUrl: p.situsUrl ?? PENGATURAN_DEFAULT.situsUrl,
    jamOperasional: p.jamOperasional ?? PENGATURAN_DEFAULT.jamOperasional,
    kategoriBahan:
      Array.isArray(p.kategoriBahan) && p.kategoriBahan.length > 0
        ? p.kategoriBahan
        : PENGATURAN_DEFAULT.kategoriBahan,
    satuanBahan:
      Array.isArray(p.satuanBahan) && p.satuanBahan.length > 0
        ? p.satuanBahan
        : PENGATURAN_DEFAULT.satuanBahan,
    kategoriMenu:
      Array.isArray(p.kategoriMenu) && p.kategoriMenu.length > 0
        ? p.kategoriMenu
        : PENGATURAN_DEFAULT.kategoriMenu,
  }
}

/**
 * Menyatukan database lama (v1) ke skema v2 tanpa menghapus data pengguna.
 * - Mengabaikan kolom telepon lama.
 * - Melengkapi pengaturan yang belum ada.
 * - Menambahkan bahan & menu katalog v2 yang belum dimiliki.
 * - Memberi stok awal hanya untuk bahan baru agar resep katalog bisa dipakai.
 */
export function normalisasiDB(db: Partial<DB>): DB {
  const ada = (x: unknown): x is Record<string, unknown> =>
    Boolean(x) && typeof x === 'object'

  const users = Array.isArray(db.users) ? db.users.filter(ada) : []
  const bahanLama = Array.isArray(db.bahan) ? db.bahan.filter(ada) : []
  const mutasi = Array.isArray(db.mutasi) ? db.mutasi.filter(ada) : []
  const log = Array.isArray(db.log) ? db.log.filter(ada) : []
  const menuLama = Array.isArray(db.menu) ? db.menu.filter(ada) : []
  const penjualan = Array.isArray(db.penjualan) ? db.penjualan.filter(ada) : []

  const idsBahan = new Set(bahanLama.map((b) => (b as unknown as Bahan).id))
  const idsMenu = new Set(menuLama.map((m) => (m as unknown as Menu).id))

  const bahanTambahan: Bahan[] = daftarBahanV2().filter((b) => !idsBahan.has(b.id))
  const menuTambahan: Menu[] = daftarMenuAwal().filter((m) => !idsMenu.has(m.id))

  const operator = (users[0] as { id?: string; nama?: string } | undefined) ?? {}
  const userId = operator.id ?? 'sistem'
  const userName = operator.nama ?? 'Sistem'

  // Stok awal untuk bahan yang baru masuk saat migrasi (tanpa data harga).
  let mutasiTambahan: Mutasi[] = []
  if (bahanTambahan.length > 0) {
    const idBaru = new Set(bahanTambahan.map((b) => b.id))
    const pembelian = mutasiPembelianV2({
      id: userId,
      nama: userName,
    } as Parameters<typeof mutasiPembelianV2>[0])

    const agregat = new Map<string, { jumlah: number; keterangan: string }>()
    for (const m of pembelian) {
      if (!idBaru.has(m.bahanId)) continue
      const lama = agregat.get(m.bahanId)
      agregat.set(m.bahanId, {
        jumlah: (lama?.jumlah ?? 0) + m.jumlah,
        keterangan: lama?.keterangan ?? m.keterangan ?? 'Stok awal migrasi',
      })
    }

    mutasiTambahan = [...agregat.entries()].map(([bahanId, info], i) => ({
      id: `mut_migrasi_${i + 1}`,
      bahanId,
      tipe: 'masuk' as const,
      jumlah: info.jumlah,
      keterangan: info.keterangan,
      tanggal: new Date().toISOString(),
      userId,
      userName,
      createdAt: new Date().toISOString(),
    }))
  }

  const semuaBahan = [...bahanLama, ...bahanTambahan] as Bahan[]
  const semuaMenu = [...menuLama, ...menuTambahan] as Menu[]

  // Lengkapi snapshot transaksi lama yang belum memiliki nama menu.
  const petaMenu = new Map(semuaMenu.map((m) => [m.id, m]))
  const penjualanLengkap = (penjualan as unknown as DB['penjualan']).map((p) => ({
    ...p,
    items: (p.items ?? []).map((it) => ({
      ...it,
      nama:
        typeof it.nama === 'string' && it.nama.trim()
          ? it.nama
          : (petaMenu.get(it.menuId)?.nama ?? it.menuId),
    })),
  }))

  return {
    version: DB_VERSION,
    users: users as unknown as DB['users'],
    bahan: semuaBahan,
    mutasi: [...(mutasi as unknown as DB['mutasi']), ...mutasiTambahan],
    menu: semuaMenu,
    penjualan: penjualanLengkap,
    pengaturan: normalisasiPengaturan(db.pengaturan ?? {}),
    log: log as unknown as DB['log'],
  }
}

export function muatDB(): DB | null {
  try {
    const mentah = localStorage.getItem(KUNCI_DB)
    if (!mentah) return null
    const db = JSON.parse(mentah) as Partial<DB>
    if (!db || !Array.isArray(db.users) || !Array.isArray(db.bahan)) return null
    return normalisasiDB(db)
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

export function buatDBKosong(): DB {
  return {
    version: DB_VERSION,
    users: [],
    bahan: [],
    mutasi: [],
    menu: [],
    penjualan: [],
    pengaturan: PENGATURAN_DEFAULT,
    log: [],
  }
}
