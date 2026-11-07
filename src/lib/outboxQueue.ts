import type { DB, LogAktivitas, Mutasi, Pengaturan } from '../types'
import {
  hapusBahanCloud,
  hapusMenuCloud,
  gantiSemuaDataCloud,
  simpanBahanCloud,
  simpanLogCloud,
  simpanMenuCloud,
  simpanPengaturanCloud,
} from './cloudDb'
import { uid } from './id'
import { siarkanPeristiwa } from './peristiwa'
import {
  GalatRpc,
  catatMutasiCloud,
  catatPenjualanCloud,
  hapusMutasiCloud,
  hapusPenjualanCloud,
  ubahMutasiCloud,
  ubahPenjualanCloud,
} from './rpc'
import { apakahSupabaseAktif } from './supabase'

const NAMA_DB = 'banggala_outbox_db'
const VERSI_DB = 1
const STORE_NAME = 'outbox'

export type OutboxAksi =
  | 'penjualan'
  | 'hapus_penjualan'
  | 'mutasi'
  | 'hapus_mutasi'
  | 'bahan'
  | 'hapus_bahan'
  | 'menu'
  | 'hapus_menu'
  | 'pengaturan'
  | 'log'
  | 'ganti_data'

export type OutboxStatus = 'tertunda' | 'konflik'

export interface OutboxItem {
  id: string
  aksi: OutboxAksi
  tipeOperasi: 'insert' | 'update' | 'delete'
  payload: unknown
  createdAt: string
  retryCount: number
  status?: OutboxStatus
  lastError?: string
}

let dbInstance: IDBDatabase | null = null

function bukaDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance)

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB tidak didukung di lingkungan ini.'))
      return
    }

    const request = indexedDB.open(NAMA_DB, VERSI_DB)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }

    request.onsuccess = () => {
      dbInstance = request.result
      dbInstance.onclose = () => {
        dbInstance = null
      }
      resolve(dbInstance)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

// ==============================================================================
// PENYIARAN STATUS ANTREAN
// ==============================================================================

type OutboxListener = (
  jumlahTertunda: number,
  sedangProses: boolean,
  jumlahKonflik: number,
) => void

const listeners = new Set<OutboxListener>()
let sedangMemproses = false

export interface StatusAntrean {
  tertunda: number
  konflik: number
  total: number
}

async function bacaStatusAntrean(): Promise<StatusAntrean> {
  const semua = await ambilSemuaAntrean()
  const konflik = semua.filter((i) => i.status === 'konflik').length
  return {
    total: semua.length,
    konflik,
    tertunda: semua.length - konflik,
  }
}

function beriTahuListeners(status: StatusAntrean) {
  listeners.forEach((listener) => {
    try {
      listener(status.tertunda, sedangMemproses, status.konflik)
    } catch (e) {
      console.error('Error pada outbox listener:', e)
    }
  })
}

export function langgananStatusAntrean(cb: OutboxListener): () => void {
  listeners.add(cb)
  bacaStatusAntrean().then((s) => cb(s.tertunda, sedangMemproses, s.konflik))
  return () => {
    listeners.delete(cb)
  }
}

// ==============================================================================
// OPERASI INDEXEDDB
// ==============================================================================

export async function hitungAntrean(): Promise<number> {
  try {
    const status = await bacaStatusAntrean()
    return status.tertunda
  } catch {
    return 0
  }
}

export async function ambilSemuaAntrean(): Promise<OutboxItem[]> {
  try {
    const db = await bukaDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.getAll()
      req.onsuccess = () => {
        const hasil = (req.result as OutboxItem[]) || []
        hasil.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        resolve(hasil)
      }
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

export async function antrekanAksi(
  item: Omit<OutboxItem, 'id' | 'createdAt' | 'retryCount' | 'status'>,
): Promise<void> {
  const entri: OutboxItem = {
    id: uid('outbox'),
    ...item,
    status: 'tertunda',
    createdAt: new Date().toISOString(),
    retryCount: 0,
  }
  const db = await bukaDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.add(entri)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })

  beriTahuListeners(await bacaStatusAntrean())
  siarkanPeristiwa({ tipe: 'antrean-berubah' })
}

export async function perbaruiAntrean(item: OutboxItem): Promise<void> {
  const db = await bukaDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const req = store.put(item)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function hapusAntrean(id: string): Promise<void> {
  try {
    const db = await bukaDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.delete(id)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    })
  } finally {
    beriTahuListeners(await bacaStatusAntrean())
    siarkanPeristiwa({ tipe: 'antrean-berubah' })
  }
}

/**
 * Pastikan tidak ada perubahan tertunda/konflik sebelum operasi destruktif
 * (reset, restore, migrasi) yang menimpa seluruh data cloud.
 */
export async function pastikanAntreanKosong(): Promise<void> {
  await prosesAntreanOutbox()
  const semua = await ambilSemuaAntrean()
  if (semua.length === 0) return

  const konflik = semua.filter((item) => item.status === 'konflik').length
  if (konflik > 0) {
    throw new Error(
      `Masih ada ${konflik} transaksi berstatus konflik. Selesaikan dulu lewat panel Konflik di navbar sebelum mengganti seluruh data.`,
    )
  }
  throw new Error(
    `Masih ada ${semua.length} perubahan yang belum tersinkron. Sambungkan internet dan tunggu hingga antrean kosong sebelum mengganti seluruh data.`,
  )
}

/** Admin dapat membuang item konflik setelah memutuskan tindakannya. */
export async function abaikanKonflik(id: string): Promise<void> {
  await hapusAntrean(id)
  siarkanPeristiwa({ tipe: 'perlu-sinkron-ulang' })
}

/** Coba kirim ulang satu item yang berstatus konflik. */
export async function cobaUlangKonflik(id: string): Promise<void> {
  const semua = await ambilSemuaAntrean()
  const item = semua.find((i) => i.id === id)
  if (!item) return
  item.status = 'tertunda'
  item.retryCount = 0
  item.lastError = undefined
  await perbaruiAntrean(item)
  beriTahuListeners(await bacaStatusAntrean())
  await prosesAntreanOutbox()
}

// ==============================================================================
// PEMROSESAN ANTREAN
// ==============================================================================

function apakahGalatJaringan(pesan: string): boolean {
  const teks = pesan.toLowerCase()
  return (
    teks.includes('failed to fetch') ||
    teks.includes('fetch failed') ||
    teks.includes('networkerror') ||
    teks.includes('network request failed') ||
    teks.includes('load failed') ||
    teks.includes('aborterror') ||
    teks.includes('timeout') ||
    teks.includes('offline') ||
    (typeof navigator !== 'undefined' && !navigator.onLine)
  )
}

function apakahGalatValidasi(error: unknown): error is GalatRpc {
  if (!(error instanceof GalatRpc)) return false
  return (
    error.kode === 'STOK_KURANG' ||
    error.kode === 'STOK_AKAN_NEGATIF' ||
    error.kode === 'HANYA_ADMIN' ||
    error.kode === 'AKUN_TIDAK_AKTIF' ||
    error.kode === 'ITEM_KOSONG' ||
    error.kode === 'MENU_TIDAK_VALID' ||
    error.kode === 'BAHAN_TIDAK_DITEMUKAN' ||
    error.kode === 'PENJUALAN_TIDAK_DITEMUKAN' ||
    error.kode === 'MUTASI_TIDAK_DITEMUKAN' ||
    error.kode === 'MUTASI_PENJUALAN' ||
    error.kode === 'JUMLAH_TIDAK_VALID' ||
    error.kode === 'TIPE_MUTASI_TIDAK_VALID'
  )
}

export async function prosesAntreanOutbox(): Promise<{
  berhasil: number
  tertunda: number
  konflik: number
}> {
  if (sedangMemproses) {
    const status = await bacaStatusAntrean()
    return { berhasil: 0, tertunda: status.tertunda, konflik: status.konflik }
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const status = await bacaStatusAntrean()
    return { berhasil: 0, tertunda: status.tertunda, konflik: status.konflik }
  }

  if (!apakahSupabaseAktif) {
    const status = await bacaStatusAntrean()
    return { berhasil: 0, tertunda: status.tertunda, konflik: status.konflik }
  }

  sedangMemproses = true
  beriTahuListeners(await bacaStatusAntrean())
  let berhasil = 0

  try {
    const antrean = await ambilSemuaAntrean()

    for (const item of antrean) {
      if (item.status === 'konflik') continue
      if (typeof navigator !== 'undefined' && !navigator.onLine) break

      try {
        await kirimItemKeCloud(item)
        await hapusAntrean(item.id)
        berhasil++
      } catch (err) {
        const pesan = err instanceof Error ? err.message : String(err)
        console.warn(`[Outbox] Gagal sinkronisasi ${item.aksi} (${item.id}):`, pesan)

        item.retryCount += 1
        item.lastError = pesan

        if (apakahGalatJaringan(pesan)) {
          await perbaruiAntrean(item)
          break
        }

        if (apakahGalatValidasi(err)) {
          // Jangan pernah membuang transaksi. Tandai konflik untuk admin.
          item.status = 'konflik'
          await perbaruiAntrean(item)
          siarkanPeristiwa({
            tipe: 'penolakan',
            pesan,
            kode: err.kode,
            kekurangan: err.kekurangan,
          })
          siarkanPeristiwa({ tipe: 'perlu-sinkron-ulang' })
          continue
        }

        // Error server lain: simpan, coba lagi nanti, jangan hilangkan data.
        if (item.retryCount >= 5) {
          item.status = 'konflik'
          siarkanPeristiwa({
            tipe: 'penolakan',
            pesan: `Sinkronisasi ${item.aksi} gagal: ${pesan}`,
            kode: 'RETRY_HABIS',
          })
        }
        await perbaruiAntrean(item)
      }
    }
  } finally {
    sedangMemproses = false
    beriTahuListeners(await bacaStatusAntrean())
    siarkanPeristiwa({ tipe: 'antrean-berubah' })
  }

  const status = await bacaStatusAntrean()
  return { berhasil, tertunda: status.tertunda, konflik: status.konflik }
}

async function tulisLog(log?: LogAktivitas) {
  if (!log) return
  try {
    await simpanLogCloud(log)
  } catch (error) {
    console.warn('[Outbox] Gagal menyimpan log:', error)
  }
}

async function kirimItemKeCloud(item: OutboxItem): Promise<void> {
  const p = item.payload as Record<string, unknown>

  switch (item.aksi) {
    case 'penjualan': {
      const payload = p as {
        mode: 'insert' | 'update'
        id: string
        tanggal: string
        items: { menuId: string; jumlah: number }[]
        catatan?: string
        log?: LogAktivitas
      }
      const kirim =
        payload.mode === 'update' ? ubahPenjualanCloud : catatPenjualanCloud
      const hasil = await kirim({
        id: payload.id,
        tanggal: payload.tanggal,
        items: payload.items,
        catatan: payload.catatan,
        log: payload.log,
      })
      siarkanPeristiwa({
        tipe: 'penjualan-tersimpan',
        idLokal: payload.id,
        penjualan: hasil.penjualan,
        mutasi: hasil.mutasi,
      })
      break
    }

    case 'hapus_penjualan': {
      const payload = p as { id: string; log?: LogAktivitas }
      await hapusPenjualanCloud(payload.id, payload.log)
      break
    }

    case 'mutasi': {
      const payload = p as {
        mode: 'insert' | 'update'
        mutasi: Mutasi
        log?: LogAktivitas
      }
      if (payload.mode === 'update') {
        await ubahMutasiCloud(payload.mutasi, payload.log)
      } else {
        await catatMutasiCloud(payload.mutasi, payload.log)
      }
      break
    }

    case 'hapus_mutasi': {
      const payload = p as { id: string; log?: LogAktivitas }
      await hapusMutasiCloud(payload.id, payload.log)
      break
    }

    case 'bahan': {
      const payload = p as {
        bahan: Parameters<typeof simpanBahanCloud>[0]
        log?: LogAktivitas
        mutasiAwal?: Mutasi
      }
      await simpanBahanCloud(payload.bahan)
      await tulisLog(payload.log)
      if (payload.mutasiAwal) {
        await catatMutasiCloud(payload.mutasiAwal)
      }
      break
    }

    case 'hapus_bahan': {
      const payload = p as { id: string; log?: LogAktivitas }
      await hapusBahanCloud(payload.id)
      await tulisLog(payload.log)
      break
    }

    case 'menu': {
      const payload = p as { menu: Parameters<typeof simpanMenuCloud>[0]; log?: LogAktivitas }
      await simpanMenuCloud(payload.menu)
      await tulisLog(payload.log)
      break
    }

    case 'hapus_menu': {
      const payload = p as { id: string; log?: LogAktivitas }
      await hapusMenuCloud(payload.id)
      await tulisLog(payload.log)
      break
    }

    case 'pengaturan': {
      const payload = p as { pengaturan: Pengaturan; log?: LogAktivitas }
      await simpanPengaturanCloud(payload.pengaturan)
      await tulisLog(payload.log)
      break
    }

    case 'log': {
      const payload = p as { log: LogAktivitas }
      await simpanLogCloud(payload.log)
      break
    }

    case 'ganti_data': {
      const payload = p as { db: DB; log?: LogAktivitas }
      await gantiSemuaDataCloud(payload.db, payload.log)
      break
    }

    default:
      console.warn('Aksi outbox tidak dikenal:', item.aksi)
  }
}

// Proses otomatis saat koneksi pulih.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    prosesAntreanOutbox().catch(console.error)
  })
}

/** Tipe payload penjualan untuk membantu type-safety di DataContext. */
export interface PayloadPenjualanOutbox {
  mode: 'insert' | 'update'
  id: string
  tanggal: string
  items: { menuId: string; jumlah: number }[]
  catatan?: string
  log?: LogAktivitas
}
