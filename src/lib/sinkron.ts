import type { DB } from '../types'
import { muatDBSupabase } from './cloudDb'
import { ambilSemuaAntrean, prosesAntreanOutbox } from './outboxQueue'
import { apakahSupabaseAktif } from './supabase'

/**
 * Urutan startup yang benar:
 *   1. Cache lokal sudah ditampilkan lebih dulu (instan).
 *   2. Kirim antrean outbox yang tertunda.
 *   3. Baru tarik snapshot cloud, agar perubahan offline tidak tertimpa.
 */
export async function sinkronkanAwal(): Promise<DB | null> {
  if (!apakahSupabaseAktif) return null
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null

  try {
    const hasil = await prosesAntreanOutbox()
    // Jangan timpa data optimistis di perangkat dengan snapshot cloud selama
    // masih ada perubahan yang belum terkirim.
    if (hasil.tertunda > 0) return null
  } catch (error) {
    console.warn('[Sinkron] Gagal memproses antrean saat startup:', error)
    return null
  }

  return muatDBSupabase()
}

/** Tarik ulang snapshot cloud tanpa menyentuh antrean. */
export async function tarikSnapshotCloud(): Promise<DB | null> {
  if (!apakahSupabaseAktif) return null
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null
  const semua = await ambilSemuaAntrean()
  if (semua.some((item) => item.status !== 'konflik')) return null
  return muatDBSupabase()
}
