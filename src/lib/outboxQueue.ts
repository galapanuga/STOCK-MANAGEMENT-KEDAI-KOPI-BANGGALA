import type { Bahan, LogAktivitas, Menu, Mutasi, Pengaturan, Penjualan, User } from '../types'
import {
  hapusBahanCloud,
  hapusMenuCloud,
  hapusMutasiCloud,
  hapusPenggunaCloud,
  hapusPenjualanCloud,
  simpanBahanCloud,
  simpanMenuCloud,
  simpanMutasiCloud,
  simpanPengaturanCloud,
  simpanPenggunaCloud,
  simpanPenjualanCloud,
} from './cloudDb'
import { uid } from './id'
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
  | 'pengguna'
  | 'hapus_pengguna'

export interface OutboxItem {
  id: string
  aksi: OutboxAksi
  tipeOperasi: 'insert' | 'update' | 'delete'
  payload: unknown
  createdAt: string
  retryCount: number
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
// PENYIARAN STATUS ANTREAN (REAKTIF KE UI)
// ==============================================================================

type OutboxListener = (jumlah: number, sedangProses: boolean) => void
const listeners = new Set<OutboxListener>()
let sedangMemproses = false

function beriTahuListeners(jumlah: number) {
  listeners.forEach((listener) => {
    try {
      listener(jumlah, sedangMemproses)
    } catch (e) {
      console.error('Error pada outbox listener:', e)
    }
  })
}

export function langgananStatusAntrean(cb: OutboxListener): () => void {
  listeners.add(cb)
  // Segera kirim nilai awal
  hitungAntrean().then((n) => cb(n, sedangMemproses))
  return () => {
    listeners.delete(cb)
  }
}

// ==============================================================================
// OPERASI INDEXEDDB
// ==============================================================================

export async function hitungAntrean(): Promise<number> {
  try {
    const db = await bukaDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const countReq = store.count()
      countReq.onsuccess = () => resolve(countReq.result)
      countReq.onerror = () => reject(countReq.error)
    })
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
        // Urutkan berdasarkan createdAt naik (FIFO)
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
  item: Omit<OutboxItem, 'id' | 'createdAt' | 'retryCount'>,
): Promise<void> {
  const entri: OutboxItem = {
    id: uid('outbox'),
    ...item,
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

  const total = await hitungAntrean()
  beriTahuListeners(total)
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
    const total = await hitungAntrean()
    beriTahuListeners(total)
  }
}

// ==============================================================================
// PEMROSESAN ANTREAN OUTBOX
// ==============================================================================

/**
 * Memproses seluruh antrean outbox secara berurutan ke Supabase.
 * Berhenti jika jaringan offline atau terjadi gangguan koneksi server.
 */
export async function prosesAntreanOutbox(): Promise<{
  berhasil: number
  tertunda: number
}> {
  if (sedangMemproses) {
    const tertunda = await hitungAntrean()
    return { berhasil: 0, tertunda }
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const tertunda = await hitungAntrean()
    return { berhasil: 0, tertunda }
  }

  if (!apakahSupabaseAktif) {
    const tertunda = await hitungAntrean()
    return { berhasil: 0, tertunda }
  }

  sedangMemproses = true
  let berhasil = 0

  try {
    const antrean = await ambilSemuaAntrean()
    if (antrean.length === 0) {
      return { berhasil: 0, tertunda: 0 }
    }

    for (const item of antrean) {
      // Periksa koneksi sebelum tiap item
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        break
      }

      try {
        await kirimItemKeCloud(item)
        await hapusAntrean(item.id)
        berhasil++
      } catch (err) {
        const pesan = err instanceof Error ? err.message : String(err)
        console.warn(`[Outbox] Gagal sinkronisasi item ${item.id} (${item.aksi}):`, pesan)

        // Jika error koneksi internet/network, hentikan proses agar FIFO terjaga
        const isNetworkError =
          pesan.includes('Failed to fetch') ||
          pesan.includes('NetworkError') ||
          pesan.includes('AbortError') ||
          pesan.includes('timeout') ||
          (typeof navigator !== 'undefined' && !navigator.onLine)

        item.retryCount += 1
        item.lastError = pesan

        if (isNetworkError) {
          await perbaruiAntrean(item)
          break // Tunggu koneksi pulih kembali
        }

        // Jika error data (misal duplikasi id atau validasi), lewati setelah 5x coba
        if (item.retryCount >= 5) {
          console.error(`[Outbox] Item ${item.id} dilewati setelah 5x gagal:`, item)
          await hapusAntrean(item.id)
        } else {
          await perbaruiAntrean(item)
        }
      }
    }
  } finally {
    sedangMemproses = false
    const sisa = await hitungAntrean()
    beriTahuListeners(sisa)
  }

  const sisa = await hitungAntrean()
  return { berhasil, tertunda: sisa }
}

async function kirimItemKeCloud(item: OutboxItem): Promise<void> {
  const p = item.payload as Record<string, unknown>

  switch (item.aksi) {
    case 'penjualan': {
      const { penjualan, mutasiList, log } = p as {
        penjualan: Penjualan
        mutasiList: Mutasi[]
        log?: LogAktivitas
      }
      await simpanPenjualanCloud(penjualan, mutasiList, log)
      break
    }
    case 'hapus_penjualan': {
      const { id, log } = p as { id: string; log?: LogAktivitas }
      await hapusPenjualanCloud(id, log)
      break
    }
    case 'mutasi': {
      const { mutasi, log } = p as { mutasi: Mutasi; log?: LogAktivitas }
      await simpanMutasiCloud(mutasi, log)
      break
    }
    case 'hapus_mutasi': {
      const { id, log } = p as { id: string; log?: LogAktivitas }
      await hapusMutasiCloud(id, log)
      break
    }
    case 'bahan': {
      const { bahan, log } = p as { bahan: Bahan; log?: LogAktivitas }
      await simpanBahanCloud(bahan, log)
      break
    }
    case 'hapus_bahan': {
      const { id, log } = p as { id: string; log?: LogAktivitas }
      await hapusBahanCloud(id, log)
      break
    }
    case 'menu': {
      const { menu, log } = p as { menu: Menu; log?: LogAktivitas }
      await simpanMenuCloud(menu, log)
      break
    }
    case 'hapus_menu': {
      const { id, log } = p as { id: string; log?: LogAktivitas }
      await hapusMenuCloud(id, log)
      break
    }
    case 'pengaturan': {
      const { pengaturan, log } = p as {
        pengaturan: Pengaturan
        log?: LogAktivitas
      }
      await simpanPengaturanCloud(pengaturan, log)
      break
    }
    case 'pengguna': {
      const { user, log } = p as { user: User; log?: LogAktivitas }
      await simpanPenggunaCloud(user, log)
      break
    }
    case 'hapus_pengguna': {
      const { id, log } = p as { id: string; log?: LogAktivitas }
      await hapusPenggunaCloud(id, log)
      break
    }
    default:
      console.warn('Aksi outbox tidak dikenal:', item.aksi)
  }
}

// Inisialisasi otomatis listener window online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    prosesAntreanOutbox().catch(console.error)
  })
}
