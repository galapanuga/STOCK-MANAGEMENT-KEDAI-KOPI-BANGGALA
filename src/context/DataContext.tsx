import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import type {
  Bahan,
  DB,
  ItemPenjualan,
  LogAktivitas,
  Menu,
  Mutasi,
  MutasiTipe,
  Pengaturan,
  Penjualan,
  ResepItem,
  Role,
  StokInfo,
  User,
} from '../types'
import { buatPassword } from '../lib/auth'
import { uid } from '../lib/id'
import { formatAngka } from '../lib/format'
import { hitungStok } from '../lib/stock'
import { kebutuhanBahan, menuTanpaResep, periksaKetersediaan } from '../lib/menu'
import { buatDatabaseAwal } from '../lib/seed'
import { normalisasiDB } from '../lib/storage'
import { useAuth } from './AuthContext'
import {
  hapusBahanCloud,
  hapusMenuCloud,
  hapusMutasiCloud,
  hapusPenggunaCloud,
  hapusPenjualanCloud,
  migrasiSemuaKeCloud,
  simpanBahanCloud,
  simpanLogCloud,
  simpanMenuCloud,
  simpanMutasiCloud,
  simpanPengaturanCloud,
  simpanPenggunaCloud,
  simpanPenjualanCloud,
} from '../lib/cloudDb'
import { antrekanAksi, type OutboxAksi } from '../lib/outboxQueue'
import { apakahSupabaseAktif } from '../lib/supabase'

function kirimAtauAntrekan(
  aksi: OutboxAksi,
  tipeOperasi: 'insert' | 'update' | 'delete',
  payload: unknown,
  fnCloud: () => Promise<void>,
) {
  if (!apakahSupabaseAktif) return

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    fnCloud().catch((err) => {
      console.warn(`[CloudSync] Gagal mengirim langsung (${aksi}), masuk antrean:`, err)
      antrekanAksi({ aksi, tipeOperasi, payload }).catch(console.error)
    })
  } else {
    antrekanAksi({ aksi, tipeOperasi, payload }).catch(console.error)
  }
}
export interface InputBahan {
  nama: string
  kategori: string
  satuan: string
  stokMin: number
  stokAwal?: number
  keteranganAwal?: string
}

export interface InputMutasi {
  bahanId: string
  tipe: MutasiTipe
  jumlah: number
  alasan?: string
  keterangan?: string
  tanggal: string
}

export interface InputMenu {
  nama: string
  kategori: string
  deskripsi?: string
  resep: ResepItem[]
  resepEstimasi: boolean
}

export interface InputPenjualan {
  tanggal: string
  items: { menuId: string; jumlah: number }[]
  catatan?: string
}

export interface InputUser {
  username: string
  nama: string
  role: Role
  password: string
  aktif?: boolean
}

interface DataContextValue {
  db: DB
  stok: Map<string, StokInfo>
  bahanMap: Map<string, Bahan>
  menuMap: Map<string, Menu>
  tambahBahan: (input: InputBahan) => Bahan
  ubahBahan: (id: string, input: InputBahan) => void
  arsipBahan: (id: string, arsip: boolean) => void
  tambahMutasi: (input: InputMutasi) => Mutasi
  ubahMutasi: (id: string, input: InputMutasi) => void
  hapusMutasi: (id: string) => void
  tambahMenu: (input: InputMenu) => Menu
  ubahMenu: (id: string, input: InputMenu) => void
  arsipMenu: (id: string, arsip: boolean) => void
  catatPenjualan: (input: InputPenjualan) => Penjualan
  ubahPenjualan: (id: string, input: InputPenjualan) => void
  hapusPenjualan: (id: string) => void
  tambahUser: (input: InputUser) => Promise<void>
  ubahUser: (
    id: string,
    patch: { nama?: string; role?: Role; aktif?: boolean },
  ) => void
  resetPassword: (id: string, password: string) => Promise<void>
  simpanPengaturan: (patch: Partial<Pengaturan>) => void
  tambahKategori: (nama: string) => void
  hapusKategori: (nama: string) => void
  tambahSatuan: (nama: string) => void
  hapusSatuan: (nama: string) => void
  pulihkanBackup: (data: DB) => void
  resetStok: () => Promise<void>
  catatLog: (aksi: string, detail: string) => void
}

const DataContext = createContext<DataContextValue | null>(null)

function kodeTanggal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
}

function buatNomorPenjualan(penjualan: Penjualan[], tanggal: Date): string {
  const awalan = `PJ-${kodeTanggal(tanggal)}-`
  let maks = 0
  for (const p of penjualan) {
    if (!p.nomor?.startsWith(awalan)) continue
    const urut = Number(p.nomor.slice(awalan.length))
    if (Number.isFinite(urut) && urut > maks) maks = urut
  }
  return `${awalan}${String(maks + 1).padStart(3, '0')}`
}

function bersihkanResep(
  resep: ResepItem[],
  bahanMap: Map<string, Bahan>,
): ResepItem[] {
  const peta = new Map<string, number>()
  for (const item of resep) {
    if (!bahanMap.has(item.bahanId)) {
      throw new Error('Ada bahan resep yang tidak ditemukan.')
    }
    if (!(item.jumlah > 0)) {
      throw new Error('Jumlah setiap bahan resep harus lebih dari 0.')
    }
    peta.set(item.bahanId, (peta.get(item.bahanId) ?? 0) + item.jumlah)
  }
  return [...peta.entries()].map(([bahanId, jumlah]) => ({
    bahanId,
    jumlah: Math.round(jumlah * 1000) / 1000,
  }))
}

interface HasilPenjualan {
  items: ItemPenjualan[]
  mutasi: Mutasi[]
  stokTerpotong: boolean
}

function siapkanPenjualan(
  input: InputPenjualan,
  db: DB,
  stokDasar: Map<string, StokInfo>,
  penjualanId: string,
  nomor: string,
  userId: string,
  userName: string,
  menuArsipDiizinkan?: Set<string>,
): HasilPenjualan {
  const menuMap = new Map(db.menu.map((m) => [m.id, m]))
  const bahanMap = new Map(db.bahan.map((b) => [b.id, b]))

  const itemBersih = input.items
    .filter((it) => it.jumlah > 0)
    .map((it) => {
      const menu = menuMap.get(it.menuId)
      if (!menu) throw new Error('Menu pada transaksi tidak ditemukan.')
      // Menu yang sudah ada di transaksi lama tetap boleh disimpan walau kini diarsipkan.
      if (menu.arsip && !menuArsipDiizinkan?.has(menu.id)) {
        throw new Error(`Menu "${menu.nama}" sudah diarsipkan.`)
      }
      return { menuId: it.menuId, jumlah: it.jumlah }
    })

  if (itemBersih.length === 0) {
    throw new Error('Tambahkan minimal satu menu dengan jumlah lebih dari 0.')
  }

  const kurang = periksaKetersediaan(itemBersih, menuMap, bahanMap, stokDasar)
  if (kurang.length > 0) {
    const detail = kurang
      .map(
        (k) =>
          `${k.nama} (butuh ${formatAngka(k.dibutuhkan)} ${k.satuan}, tersedia ${formatAngka(k.tersedia)} ${k.satuan})`,
      )
      .join('; ')
    throw new Error(`Stok tidak cukup: ${detail}.`)
  }

  const items: ItemPenjualan[] = itemBersih.map((it) => ({
    menuId: it.menuId,
    nama: menuMap.get(it.menuId)!.nama,
    jumlah: it.jumlah,
  }))

  const kebutuhan = kebutuhanBahan(itemBersih, menuMap)
  const mutasi: Mutasi[] = [...kebutuhan.entries()].map(
    ([bahanId, jumlah]) => ({
      id: uid('mut'),
      bahanId,
      tipe: 'keluar',
      jumlah,
      alasan: 'Penjualan',
      keterangan: `Penjualan ${nomor}`,
      tanggal: input.tanggal,
      userId,
      userName,
      createdAt: new Date().toISOString(),
      penjualanId,
    }),
  )

  const tanpaResep = menuTanpaResep(itemBersih, menuMap)
  const stokTerpotong = tanpaResep.length === 0

  return { items, mutasi, stokTerpotong }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { db: dbAuth, setDb, user, logout } = useAuth()
  const db = dbAuth as DB

  const stok = useMemo(
    () => (db ? hitungStok(db.bahan, db.mutasi) : new Map<string, StokInfo>()),
    [db],
  )

  const bahanMap = useMemo(
    () => new Map((db?.bahan ?? []).map((b) => [b.id, b])),
    [db],
  )

  const menuMap = useMemo(
    () => new Map((db?.menu ?? []).map((m) => [m.id, m])),
    [db],
  )

  const buatLog = useCallback(
    (aksi: string, detail: string): LogAktivitas => ({
      id: uid('log'),
      at: new Date().toISOString(),
      userId: user?.id ?? 'sistem',
      userName: user?.nama ?? 'Sistem',
      aksi,
      detail,
    }),
    [user],
  )

  const tambahBahan = useCallback(
    (input: InputBahan): Bahan => {
      const nama = input.nama.trim()
      if (!nama) throw new Error('Nama bahan wajib diisi.')
      if (!input.satuan.trim()) throw new Error('Satuan wajib diisi.')
      if (input.stokMin < 0) throw new Error('Stok minimum tidak boleh negatif.')
      if (
        db.bahan.some(
          (b) => !b.arsip && b.nama.trim().toLowerCase() === nama.toLowerCase(),
        )
      ) {
        throw new Error('Bahan dengan nama tersebut sudah ada.')
      }

      const sekarang = new Date().toISOString()
      const bahanBaru: Bahan = {
        id: uid('bhn'),
        nama,
        kategori: input.kategori.trim() || 'Lainnya',
        satuan: input.satuan.trim(),
        stokMin: input.stokMin,
        arsip: false,
        createdAt: sekarang,
      }

      const stokAwal = input.stokAwal ?? 0
      if (stokAwal < 0) throw new Error('Stok awal tidak boleh negatif.')

      const mutasiBaru: Mutasi | null =
        stokAwal > 0
          ? {
              id: uid('mut'),
              bahanId: bahanBaru.id,
              tipe: 'masuk',
              jumlah: stokAwal,
              keterangan: input.keteranganAwal?.trim() || 'Stok awal',
              tanggal: sekarang,
              userId: user?.id ?? 'sistem',
              userName: user?.nama ?? 'Sistem',
              createdAt: sekarang,
            }
          : null

      const log = buatLog(
        'Tambah bahan',
        `Menambahkan bahan "${nama}"${mutasiBaru ? ` dengan stok awal ${formatAngka(stokAwal)} ${bahanBaru.satuan}` : ''}`,
      )

      setDb((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          bahan: [...prev.bahan, bahanBaru],
          mutasi: mutasiBaru ? [...prev.mutasi, mutasiBaru] : prev.mutasi,
          log: [log, ...prev.log].slice(0, 250),
        }
      })

      kirimAtauAntrekan('bahan', 'insert', { bahan: bahanBaru, log }, () =>
        simpanBahanCloud(bahanBaru, log),
      )
      if (mutasiBaru) {
        kirimAtauAntrekan('mutasi', 'insert', { mutasi: mutasiBaru }, () =>
          simpanMutasiCloud(mutasiBaru),
        )
      }

      return bahanBaru
    },
    [buatLog, db.bahan, setDb, user],
  )

  const ubahBahan = useCallback(
    (id: string, input: InputBahan) => {
      const nama = input.nama.trim()
      if (!nama) throw new Error('Nama bahan wajib diisi.')
      if (input.stokMin < 0) throw new Error('Stok minimum tidak boleh negatif.')
      if (
        db.bahan.some(
          (b) =>
            b.id !== id &&
            !b.arsip &&
            b.nama.trim().toLowerCase() === nama.toLowerCase(),
        )
      ) {
        throw new Error('Bahan dengan nama tersebut sudah ada.')
      }

      const lama = db.bahan.find((b) => b.id === id)
      if (!lama) throw new Error('Bahan tidak ditemukan.')

      const log = buatLog('Ubah bahan', `Memperbarui bahan "${nama}"`)
      setDb((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          bahan: prev.bahan.map((b) =>
            b.id === id
              ? {
                  ...b,
                  nama,
                  kategori: input.kategori.trim() || 'Lainnya',
                  satuan: input.satuan.trim(),
                  stokMin: input.stokMin,
                }
              : b,
          ),
          log: [log, ...prev.log].slice(0, 250),
        }
      })

      const bahanDiperbarui: Bahan = {
        ...lama,
        nama,
        kategori: input.kategori.trim() || 'Lainnya',
        satuan: input.satuan.trim(),
        stokMin: input.stokMin,
      }
      kirimAtauAntrekan('bahan', 'update', { bahan: bahanDiperbarui, log }, () =>
        simpanBahanCloud(bahanDiperbarui, log),
      )
    },
    [buatLog, db.bahan, setDb],
  )

  const arsipBahan = useCallback(
    (id: string, arsip: boolean) => {
      const bahan = db.bahan.find((b) => b.id === id)
      if (!bahan) throw new Error('Bahan tidak ditemukan.')
      const log = buatLog(
        arsip ? 'Arsipkan bahan' : 'Aktifkan bahan',
        `${arsip ? 'Mengarsipkan' : 'Mengaktifkan'} bahan "${bahan.nama}"`,
      )
      setDb((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          bahan: prev.bahan.map((b) => (b.id === id ? { ...b, arsip } : b)),
          log: [log, ...prev.log].slice(0, 250),
        }
      })

      const bahanDiperbarui: Bahan = { ...bahan, arsip }
      kirimAtauAntrekan('bahan', 'update', { bahan: bahanDiperbarui, log }, () =>
        simpanBahanCloud(bahanDiperbarui, log),
      )
    },
    [buatLog, db.bahan, setDb],
  )

  const validasiMutasi = useCallback(
    (input: InputMutasi, abaikanMutasiId?: string) => {
      if (!input.bahanId) throw new Error('Pilih bahan terlebih dahulu.')
      if (!(input.jumlah > 0)) throw new Error('Jumlah harus lebih dari 0.')
      const bahan = db.bahan.find((b) => b.id === input.bahanId)
      if (!bahan) throw new Error('Bahan tidak ditemukan.')

      if (input.tipe === 'keluar') {
        let stokTersedia = stok.get(input.bahanId)?.stok ?? 0

        if (abaikanMutasiId) {
          const lama = db.mutasi.find((m) => m.id === abaikanMutasiId)
          if (lama && lama.bahanId === input.bahanId) {
            stokTersedia += lama.tipe === 'keluar' ? lama.jumlah : -lama.jumlah
          }
        }

        if (input.jumlah > stokTersedia + 1e-9) {
          throw new Error(
            `Stok tidak cukup. Tersedia ${formatAngka(stokTersedia)} ${bahan.satuan}.`,
          )
        }
      }

      return bahan
    },
    [db.bahan, db.mutasi, stok],
  )

  const tambahMutasi = useCallback(
    (input: InputMutasi): Mutasi => {
      const bahan = validasiMutasi(input)
      const sekarang = new Date().toISOString()
      const mutasi: Mutasi = {
        id: uid('mut'),
        bahanId: input.bahanId,
        tipe: input.tipe,
        jumlah: input.jumlah,
        alasan: input.alasan?.trim() || undefined,
        keterangan: input.keterangan?.trim() || undefined,
        tanggal: input.tanggal || sekarang,
        userId: user?.id ?? 'sistem',
        userName: user?.nama ?? 'Sistem',
        createdAt: sekarang,
      }

      const log = buatLog(
        input.tipe === 'masuk' ? 'Stok masuk' : 'Stok keluar',
        `${bahan.nama} ${input.tipe === 'masuk' ? '+' : '−'}${formatAngka(input.jumlah)} ${bahan.satuan}`,
      )

      setDb((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          mutasi: [...prev.mutasi, mutasi],
          log: [log, ...prev.log].slice(0, 250),
        }
      })

      kirimAtauAntrekan('mutasi', 'insert', { mutasi, log }, () =>
        simpanMutasiCloud(mutasi, log),
      )

      return mutasi
    },
    [buatLog, setDb, user, validasiMutasi],
  )

  const ubahMutasi = useCallback(
    (id: string, input: InputMutasi) => {
      const lama = db.mutasi.find((m) => m.id === id)
      if (!lama) throw new Error('Mutasi tidak ditemukan.')
      if (lama.penjualanId) {
        throw new Error('Mutasi ini berasal dari penjualan. Ubah melalui menu Penjualan.')
      }
      const bahan = validasiMutasi(input, id)

      const log = buatLog(
        'Ubah mutasi',
        `Memperbarui mutasi ${bahan.nama} menjadi ${formatAngka(input.jumlah)} ${bahan.satuan}`,
      )

      setDb((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          mutasi: prev.mutasi.map((m) =>
            m.id === id
              ? {
                  ...m,
                  bahanId: input.bahanId,
                  tipe: input.tipe,
                  jumlah: input.jumlah,
                  alasan: input.alasan?.trim() || undefined,
                  keterangan: input.keterangan?.trim() || undefined,
                  tanggal: input.tanggal || m.tanggal,
                }
              : m,
          ),
          log: [log, ...prev.log].slice(0, 250),
        }
      })

      const mutasiDiperbarui: Mutasi = {
        ...lama,
        bahanId: input.bahanId,
        tipe: input.tipe,
        jumlah: input.jumlah,
        alasan: input.alasan?.trim() || undefined,
        keterangan: input.keterangan?.trim() || undefined,
        tanggal: input.tanggal || lama.tanggal,
      }
      kirimAtauAntrekan('mutasi', 'update', { mutasi: mutasiDiperbarui, log }, () =>
        simpanMutasiCloud(mutasiDiperbarui, log),
      )
    },
    [buatLog, db.mutasi, setDb, validasiMutasi],
  )
  const hapusMutasi = useCallback(
    (id: string) => {
      const lama = db.mutasi.find((m) => m.id === id)
      if (!lama) return
      if (lama.penjualanId) {
        throw new Error('Mutasi ini berasal dari penjualan. Hapus melalui menu Penjualan.')
      }
      const bahan = db.bahan.find((b) => b.id === lama.bahanId)
      const log = buatLog(
        'Hapus mutasi',
        `Menghapus mutasi ${bahan?.nama ?? lama.bahanId} (${lama.tipe} ${formatAngka(lama.jumlah)})`,
      )
      setDb((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          mutasi: prev.mutasi.filter((m) => m.id !== id),
          log: [log, ...prev.log].slice(0, 250),
        }
      })

      kirimAtauAntrekan('hapus_mutasi', 'delete', { id, log }, () =>
        hapusMutasiCloud(id, log),
      )
    },
    [buatLog, db.bahan, db.mutasi, setDb],
  )

  const validasiMenu = useCallback(
    (input: InputMenu, id?: string) => {
      const nama = input.nama.trim()
      if (!nama) throw new Error('Nama menu wajib diisi.')
      if (!input.kategori.trim()) throw new Error('Kategori menu wajib dipilih.')
      if (
        db.menu.some(
          (m) =>
            m.id !== id &&
            !m.arsip &&
            m.nama.trim().toLowerCase() === nama.toLowerCase(),
        )
      ) {
        throw new Error('Menu dengan nama tersebut sudah ada.')
      }
      return {
        nama,
        kategori: input.kategori.trim(),
        deskripsi: input.deskripsi?.trim() || undefined,
        resep: bersihkanResep(input.resep, bahanMap),
        resepEstimasi: input.resepEstimasi,
      }
    },
    [bahanMap, db.menu],
  )

  const tambahMenu = useCallback(
    (input: InputMenu): Menu => {
      const data = validasiMenu(input)
      const menuBaru: Menu = {
        id: uid('mnu'),
        ...data,
        arsip: false,
        createdAt: new Date().toISOString(),
      }
      const log = buatLog(
        'Tambah menu',
        `Menambahkan menu "${menuBaru.nama}"${menuBaru.resep.length > 0 ? ` dengan ${menuBaru.resep.length} bahan resep` : ' tanpa resep'}`,
      )
      setDb((prev) =>
        prev
          ? {
              ...prev,
              menu: [...prev.menu, menuBaru],
              log: [log, ...prev.log].slice(0, 250),
            }
          : prev,
      )

      kirimAtauAntrekan('menu', 'insert', { menu: menuBaru, log }, () =>
        simpanMenuCloud(menuBaru, log),
      )
      return menuBaru
    },
    [buatLog, setDb, validasiMenu],
  )

  const ubahMenu = useCallback(
    (id: string, input: InputMenu) => {
      const lama = db.menu.find((m) => m.id === id)
      if (!lama) throw new Error('Menu tidak ditemukan.')
      const data = validasiMenu(input, id)
      const log = buatLog('Ubah menu', `Memperbarui menu "${data.nama}"`)
      setDb((prev) =>
        prev
          ? {
              ...prev,
              menu: prev.menu.map((m) => (m.id === id ? { ...m, ...data } : m)),
              log: [log, ...prev.log].slice(0, 250),
            }
          : prev,
      )

      const menuDiperbarui: Menu = { ...lama, ...data }
      kirimAtauAntrekan('menu', 'update', { menu: menuDiperbarui, log }, () =>
        simpanMenuCloud(menuDiperbarui, log),
      )
    },
    [buatLog, db.menu, setDb, validasiMenu],
  )

  const arsipMenu = useCallback(
    (id: string, arsip: boolean) => {
      const menu = db.menu.find((m) => m.id === id)
      if (!menu) throw new Error('Menu tidak ditemukan.')
      const log = buatLog(
        arsip ? 'Arsipkan menu' : 'Aktifkan menu',
        `${arsip ? 'Mengarsipkan' : 'Mengaktifkan'} menu "${menu.nama}"`,
      )
      setDb((prev) =>
        prev
          ? {
              ...prev,
              menu: prev.menu.map((m) => (m.id === id ? { ...m, arsip } : m)),
              log: [log, ...prev.log].slice(0, 250),
            }
          : prev,
      )

      const menuDiperbarui: Menu = { ...menu, arsip }
      kirimAtauAntrekan('menu', 'update', { menu: menuDiperbarui, log }, () =>
        simpanMenuCloud(menuDiperbarui, log),
      )
    },
    [buatLog, db.menu, setDb],
  )

  const catatPenjualan = useCallback(
    (input: InputPenjualan): Penjualan => {
      const tanggal = input.tanggal || new Date().toISOString()
      const waktu = new Date(tanggal)
      if (Number.isNaN(waktu.getTime())) throw new Error('Tanggal penjualan tidak valid.')

      const id = uid('pj')
      const nomor = buatNomorPenjualan(db.penjualan, waktu)
      const hasil = siapkanPenjualan(
        { ...input, tanggal: waktu.toISOString() },
        db,
        stok,
        id,
        nomor,
        user?.id ?? 'sistem',
        user?.nama ?? 'Sistem',
      )

      const penjualan: Penjualan = {
        id,
        nomor,
        tanggal: waktu.toISOString(),
        items: hasil.items,
        catatan: input.catatan?.trim() || undefined,
        stokTerpotong: hasil.stokTerpotong,
        userId: user?.id ?? 'sistem',
        userName: user?.nama ?? 'Sistem',
        createdAt: new Date().toISOString(),
      }

      const totalQty = hasil.items.reduce((t, it) => t + it.jumlah, 0)
      const log = buatLog(
        'Catat penjualan',
        `${nomor} · ${hasil.items.length} menu · ${formatAngka(totalQty)} item${hasil.stokTerpotong ? '' : ' (sebagian stok tidak terpotong)'}`,
      )

      setDb((prev) =>
        prev
          ? {
              ...prev,
              penjualan: [...prev.penjualan, penjualan],
              mutasi: [...prev.mutasi, ...hasil.mutasi],
              log: [log, ...prev.log].slice(0, 250),
            }
          : prev,
      )

      kirimAtauAntrekan(
        'penjualan',
        'insert',
        { penjualan, mutasiList: hasil.mutasi, log },
        () => simpanPenjualanCloud(penjualan, hasil.mutasi, log),
      )

      return penjualan
    },
    [buatLog, db, setDb, stok, user],
  )

  const ubahPenjualan = useCallback(
    (id: string, input: InputPenjualan) => {
      if (user?.role !== 'admin') {
        throw new Error('Hanya admin yang dapat mengubah penjualan.')
      }
      const lama = db.penjualan.find((p) => p.id === id)
      if (!lama) throw new Error('Penjualan tidak ditemukan.')

      const tanggal = input.tanggal || lama.tanggal
      const waktu = new Date(tanggal)
      if (Number.isNaN(waktu.getTime())) throw new Error('Tanggal penjualan tidak valid.')

      const stokDasar = hitungStok(
        db.bahan,
        db.mutasi.filter((m) => m.penjualanId !== id),
      )
      const hasil = siapkanPenjualan(
        { ...input, tanggal: waktu.toISOString() },
        db,
        stokDasar,
        id,
        lama.nomor,
        lama.userId,
        lama.userName,
        new Set(lama.items.map((it) => it.menuId)),
      )

      const penjualan: Penjualan = {
        ...lama,
        tanggal: waktu.toISOString(),
        items: hasil.items,
        catatan: input.catatan?.trim() || undefined,
        stokTerpotong: hasil.stokTerpotong,
      }

      const log = buatLog(
        'Ubah penjualan',
        `Memperbarui ${lama.nomor} · ${hasil.items.length} menu`,
      )

      setDb((prev) =>
        prev
          ? {
              ...prev,
              penjualan: prev.penjualan.map((p) => (p.id === id ? penjualan : p)),
              mutasi: [
                ...prev.mutasi.filter((m) => m.penjualanId !== id),
                ...hasil.mutasi,
              ],
              log: [log, ...prev.log].slice(0, 250),
            }
          : prev,
      )

      kirimAtauAntrekan(
        'penjualan',
        'update',
        { penjualan, mutasiList: hasil.mutasi, log },
        () => simpanPenjualanCloud(penjualan, hasil.mutasi, log),
      )
    },
    [buatLog, db, setDb, user],
  )

  const hapusPenjualan = useCallback(
    (id: string) => {
      if (user?.role !== 'admin') {
        throw new Error('Hanya admin yang dapat menghapus penjualan.')
      }
      const lama = db.penjualan.find((p) => p.id === id)
      if (!lama) return
      const log = buatLog(
        'Hapus penjualan',
        `Menghapus ${lama.nomor} dan mengembalikan stok bahan terkait`,
      )
      setDb((prev) =>
        prev
          ? {
              ...prev,
              penjualan: prev.penjualan.filter((p) => p.id !== id),
              mutasi: prev.mutasi.filter((m) => m.penjualanId !== id),
              log: [log, ...prev.log].slice(0, 250),
            }
          : prev,
      )

      kirimAtauAntrekan('hapus_penjualan', 'delete', { id, log }, () =>
        hapusPenjualanCloud(id, log),
      )
    },
    [buatLog, db.penjualan, setDb, user],
  )

  const tambahUser = useCallback(
    async (input: InputUser) => {
      const username = input.username.trim().toLowerCase()
      const nama = input.nama.trim()
      if (!username) throw new Error('Username wajib diisi.')
      if (!/^[a-z0-9._-]+$/.test(username)) {
        throw new Error('Username hanya boleh huruf, angka, titik, garis bawah, dan strip.')
      }
      if (!nama) throw new Error('Nama lengkap wajib diisi.')
      if (db.users.some((u) => u.username.toLowerCase() === username)) {
        throw new Error('Username sudah digunakan.')
      }
      if (input.password.length < 6) {
        throw new Error('Password minimal 6 karakter.')
      }

      const { salt, hash } = await buatPassword(input.password)
      const baru: User = {
        id: uid('usr'),
        username,
        nama,
        role: input.role,
        passwordHash: hash,
        salt,
        aktif: input.aktif ?? true,
        createdAt: new Date().toISOString(),
      }
      const log = buatLog(
        'Tambah pengguna',
        `Menambahkan pengguna "${nama}" (${input.role})`,
      )

      setDb((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          users: [...prev.users, baru],
          log: [log, ...prev.log].slice(0, 250),
        }
      })

      kirimAtauAntrekan('pengguna', 'insert', { user: baru, log }, () =>
        simpanPenggunaCloud(baru, log),
      )
    },
    [buatLog, db.users, setDb],
  )

  const ubahUser = useCallback(
    (id: string, patch: { nama?: string; role?: Role; aktif?: boolean }) => {
      const target = db.users.find((u) => u.id === id)
      if (!target) throw new Error('Pengguna tidak ditemukan.')

      if (id === user?.id && patch.aktif === false) {
        throw new Error('Tidak bisa menonaktifkan akun sendiri.')
      }
      if (id === user?.id && patch.role && patch.role !== target.role) {
        throw new Error('Tidak bisa mengubah role akun sendiri.')
      }

      const adminAktif = db.users.filter((u) => u.role === 'admin' && u.aktif)
      const kehilanganAdmin =
        target.role === 'admin' &&
        target.aktif &&
        adminAktif.length === 1 &&
        (patch.role === 'staf' || patch.aktif === false)
      if (kehilanganAdmin) {
        throw new Error('Harus ada minimal satu admin aktif.')
      }

      if (patch.nama !== undefined && !patch.nama.trim()) {
        throw new Error('Nama tidak boleh kosong.')
      }

      const log = buatLog(
        'Ubah pengguna',
        `Memperbarui akun "${target.username}"${patch.role ? ` · role ${patch.role}` : ''}${
          patch.aktif !== undefined ? ` · ${patch.aktif ? 'aktif' : 'nonaktif'}` : ''
        }`,
      )

      setDb((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          users: prev.users.map((u) =>
            u.id === id
              ? {
                  ...u,
                  nama: patch.nama?.trim() ?? u.nama,
                  role: patch.role ?? u.role,
                  aktif: patch.aktif ?? u.aktif,
                }
              : u,
          ),
          log: [log, ...prev.log].slice(0, 250),
        }
      })

      const userDiperbarui: User = {
        ...target,
        nama: patch.nama?.trim() ?? target.nama,
        role: patch.role ?? target.role,
        aktif: patch.aktif ?? target.aktif,
      }
      kirimAtauAntrekan('pengguna', 'update', { user: userDiperbarui, log }, () =>
        simpanPenggunaCloud(userDiperbarui, log),
      )
    },
    [buatLog, db.users, setDb, user],
  )

  const resetPassword = useCallback(
    async (id: string, password: string) => {
      if (password.length < 6) throw new Error('Password minimal 6 karakter.')
      const target = db.users.find((u) => u.id === id)
      if (!target) throw new Error('Pengguna tidak ditemukan.')
      const { salt, hash } = await buatPassword(password)
      const sekarang = new Date().toISOString()
      const log = buatLog(
        'Reset password',
        `Password akun "${target.username}" direset`,
      )
      setDb((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          users: prev.users.map((u) =>
            u.id === id
              ? { ...u, salt, passwordHash: hash, passwordChangedAt: sekarang }
              : u,
          ),
          log: [log, ...prev.log].slice(0, 250),
        }
      })

      const userDiperbarui: User = {
        ...target,
        salt,
        passwordHash: hash,
        passwordChangedAt: sekarang,
      }
      kirimAtauAntrekan('pengguna', 'update', { user: userDiperbarui, log }, () =>
        simpanPenggunaCloud(userDiperbarui, log),
      )
    },
    [buatLog, db.users, setDb],
  )

  const simpanPengaturan = useCallback(
    (patch: Partial<Pengaturan>) => {
      const log = buatLog('Ubah pengaturan', 'Memperbarui pengaturan kedai')
      setDb((prev) =>
        prev
          ? {
              ...prev,
              pengaturan: { ...prev.pengaturan, ...patch },
              log: [log, ...prev.log].slice(0, 250),
            }
          : prev,
      )

      const pengaturanBaru: Pengaturan = { ...db.pengaturan, ...patch }
      kirimAtauAntrekan('pengaturan', 'update', { pengaturan: pengaturanBaru, log }, () =>
        simpanPengaturanCloud(pengaturanBaru, log),
      )
    },
    [buatLog, db.pengaturan, setDb],
  )
  const tambahKategori = useCallback(
    (nama: string) => {
      const bersih = nama.trim()
      if (!bersih) throw new Error('Nama kategori wajib diisi.')
      if (db.pengaturan.kategoriBahan.some((k) => k.toLowerCase() === bersih.toLowerCase())) {
        throw new Error('Kategori sudah ada.')
      }
      simpanPengaturan({
        kategoriBahan: [...db.pengaturan.kategoriBahan, bersih],
      })
    },
    [db.pengaturan.kategoriBahan, simpanPengaturan],
  )

  const hapusKategori = useCallback(
    (nama: string) => {
      const dipakai = db.bahan.filter((b) => b.kategori === nama).length
      if (dipakai > 0) {
        throw new Error(`Kategori masih dipakai oleh ${dipakai} bahan.`)
      }
      simpanPengaturan({
        kategoriBahan: db.pengaturan.kategoriBahan.filter((k) => k !== nama),
      })
    },
    [db.bahan, db.pengaturan.kategoriBahan, simpanPengaturan],
  )

  const tambahSatuan = useCallback(
    (nama: string) => {
      const bersih = nama.trim()
      if (!bersih) throw new Error('Nama satuan wajib diisi.')
      if (db.pengaturan.satuanBahan.some((s) => s.toLowerCase() === bersih.toLowerCase())) {
        throw new Error('Satuan sudah ada.')
      }
      simpanPengaturan({ satuanBahan: [...db.pengaturan.satuanBahan, bersih] })
    },
    [db.pengaturan.satuanBahan, simpanPengaturan],
  )

  const hapusSatuan = useCallback(
    (nama: string) => {
      const dipakai = db.bahan.filter((b) => b.satuan === nama).length
      if (dipakai > 0) {
        throw new Error(`Satuan masih dipakai oleh ${dipakai} bahan.`)
      }
      simpanPengaturan({
        satuanBahan: db.pengaturan.satuanBahan.filter((s) => s !== nama),
      })
    },
    [db.bahan, db.pengaturan.satuanBahan, simpanPengaturan],
  )

  const pulihkanBackup = useCallback(
    (data: DB) => {
      if (!data || !Array.isArray(data.users) || !Array.isArray(data.bahan)) {
        throw new Error('File backup tidak valid.')
      }

      const bersih = normalisasiDB(data)
      const users = bersih.users.filter(
        (u) => u && u.id && u.username && u.salt && u.passwordHash,
      )
      if (users.length === 0) throw new Error('Backup tidak memiliki akun yang valid.')
      if (!users.some((u) => u.aktif)) {
        throw new Error('Backup tidak memiliki akun aktif.')
      }

      const hasil: DB = { ...bersih, users }
      const operatorId = user?.id
      setDb(hasil)
      if (operatorId && !hasil.users.some((u) => u.id === operatorId)) {
        logout()
      }
      if (apakahSupabaseAktif && typeof navigator !== 'undefined' && navigator.onLine) {
        migrasiSemuaKeCloud(hasil).catch(console.error)
      }
    },
    [logout, setDb, user],
  )
  const resetStok = useCallback(async () => {
    const seed = await buatDatabaseAwal()
    const log = buatLog(
      'Reset data',
      'Mengembalikan bahan, menu, penjualan, dan mutasi ke contoh awal',
    )
    setDb((prev) =>
      prev
        ? {
            ...prev,
            bahan: seed.bahan,
            mutasi: seed.mutasi,
            menu: seed.menu,
            penjualan: seed.penjualan,
            log: [log, ...prev.log].slice(0, 250),
          }
        : prev,
    )
    if (apakahSupabaseAktif && typeof navigator !== 'undefined' && navigator.onLine) {
      const resetDb: DB = {
        ...db,
        bahan: seed.bahan,
        mutasi: seed.mutasi,
        menu: seed.menu,
        penjualan: seed.penjualan,
        log: [log, ...db.log].slice(0, 250),
      }
      migrasiSemuaKeCloud(resetDb).catch(console.error)
    }
  },
  [buatLog, db, setDb],
)

  const catatLog = useCallback(
    (aksi: string, detail: string) => {
      const log = buatLog(aksi, detail)
      setDb((prev) =>
        prev
          ? { ...prev, log: [log, ...prev.log].slice(0, 250) }
          : prev,
      )
      if (apakahSupabaseAktif && typeof navigator !== 'undefined' && navigator.onLine) {
        simpanLogCloud(log).catch(console.error)
      }
    },
    [buatLog, setDb],
  )
  const nilai = useMemo<DataContextValue>(
    () => ({
      db,
      stok,
      bahanMap,
      menuMap,
      tambahBahan,
      ubahBahan,
      arsipBahan,
      tambahMutasi,
      ubahMutasi,
      hapusMutasi,
      tambahMenu,
      ubahMenu,
      arsipMenu,
      catatPenjualan,
      ubahPenjualan,
      hapusPenjualan,
      tambahUser,
      ubahUser,
      resetPassword,
      simpanPengaturan,
      tambahKategori,
      hapusKategori,
      tambahSatuan,
      hapusSatuan,
      pulihkanBackup,
      resetStok,
      catatLog,
    }),
    [
      db,
      stok,
      bahanMap,
      menuMap,
      tambahBahan,
      ubahBahan,
      arsipBahan,
      tambahMutasi,
      ubahMutasi,
      hapusMutasi,
      tambahMenu,
      ubahMenu,
      arsipMenu,
      catatPenjualan,
      ubahPenjualan,
      hapusPenjualan,
      tambahUser,
      ubahUser,
      resetPassword,
      simpanPengaturan,
      tambahKategori,
      hapusKategori,
      tambahSatuan,
      hapusSatuan,
      pulihkanBackup,
      resetStok,
      catatLog,
    ],
  )

  return <DataContext.Provider value={nilai}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData harus dipakai di dalam DataProvider')
  return ctx
}
