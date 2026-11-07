import type { ItemPenjualan, LogAktivitas, Mutasi, Penjualan } from '../types'
import {
  mapLogToRow,
  mapMutasiFromRow,
  mapPenjualanFromRow,
  mapProfilFromRow,
  type MutasiRow,
  type PenjualanRow,
  type ProfilRow,
} from './cloudDb'
import { supabase } from './supabase'

// ==============================================================================
// TIPE & GALAT
// ==============================================================================

export interface KekuranganStokCloud {
  bahanId: string
  nama: string
  satuan: string
  dibutuhkan: number
  tersedia: number
}

export class GalatRpc extends Error {
  kode: string
  kekurangan?: KekuranganStokCloud[]

  constructor(pesan: string, kode = 'RPC_GAGAL', kekurangan?: KekuranganStokCloud[]) {
    super(pesan)
    this.name = 'GalatRpc'
    this.kode = kode
    this.kekurangan = kekurangan
  }
}

const PESAN: Record<string, string> = {
  STOK_KURANG: 'Stok bahan tidak mencukupi di server.',
  STOK_AKAN_NEGATIF: 'Perubahan ini akan membuat stok bahan menjadi negatif.',
  HANYA_ADMIN: 'Tindakan ini hanya boleh dilakukan admin.',
  AKUN_TIDAK_AKTIF: 'Akun Anda tidak aktif. Hubungi admin.',
  ITEM_KOSONG: 'Penjualan harus memiliki minimal satu item.',
  MENU_TIDAK_VALID: 'Ada menu yang tidak ditemukan di server.',
  BAHAN_TIDAK_DITEMUKAN: 'Bahan tidak ditemukan di server.',
  PENJUALAN_TIDAK_DITEMUKAN: 'Penjualan tidak ditemukan di server.',
  MUTASI_TIDAK_DITEMUKAN: 'Mutasi tidak ditemukan di server.',
  MUTASI_PENJUALAN: 'Mutasi ini terhubung ke penjualan. Ubah lewat transaksi penjualan.',
  JUMLAH_TIDAK_VALID: 'Jumlah harus lebih dari nol.',
  TIPE_MUTASI_TIDAK_VALID: 'Tipe mutasi tidak valid.',
}

function kodeDariPesan(pesan: string): string {
  const bersih = (pesan ?? '').toUpperCase()
  for (const kode of Object.keys(PESAN)) {
    if (bersih.includes(kode)) return kode
  }
  return 'RPC_GAGAL'
}

function bacaKekurangan(detail: string | null | undefined): KekuranganStokCloud[] | undefined {
  if (!detail) return undefined
  try {
    const parsed = JSON.parse(detail)
    if (Array.isArray(parsed)) {
      return parsed as KekuranganStokCloud[]
    }
  } catch {
    // detail bukan JSON
  }
  return undefined
}

function galatDari(error: { message?: string; details?: string | null; hint?: string | null }): GalatRpc {
  const kode = kodeDariPesan(`${error.message ?? ''} ${error.details ?? ''}`)
  const kekurangan = bacaKekurangan(error.details)
  const pesanDasar = PESAN[kode] ?? error.message ?? 'Terjadi kesalahan pada server.'
  const pesan =
    kode === 'STOK_KURANG' && kekurangan?.length
      ? `${pesanDasar} ${kekurangan
          .map(
            (k) =>
              `${k.nama}: butuh ${k.dibutuhkan} ${k.satuan}, tersedia ${k.tersedia} ${k.satuan}`,
          )
          .join('; ')}`
      : kode === 'STOK_AKAN_NEGATIF' && error.details
        ? `${pesanDasar} (${error.details})`
        : pesanDasar
  return new GalatRpc(pesan, kode, kekurangan)
}

function pastikanKlien() {
  if (!supabase) {
    throw new GalatRpc('Supabase belum dikonfigurasi.', 'TANPA_SUPABASE')
  }
  return supabase
}

// ==============================================================================
// PENJUALAN
// ==============================================================================

interface HasilPenjualanRpc {
  penjualan: PenjualanRow
  mutasi: MutasiRow[] | null
}

export interface HasilPenjualanCloud {
  penjualan: Penjualan
  mutasi: Mutasi[]
}

function petakanHasilPenjualan(data: HasilPenjualanRpc): HasilPenjualanCloud {
  return {
    penjualan: mapPenjualanFromRow(data.penjualan),
    mutasi: (data.mutasi ?? []).map(mapMutasiFromRow),
  }
}

function barisLog(log?: LogAktivitas) {
  return log ? mapLogToRow(log) : null
}

export async function catatPenjualanCloud(input: {
  id: string
  tanggal: string
  items: { menuId: string; jumlah: number }[]
  catatan?: string
  log?: LogAktivitas
}): Promise<HasilPenjualanCloud> {
  const klien = pastikanKlien()
  const { data, error } = await klien.rpc('catat_penjualan', {
    p_id: input.id,
    p_tanggal: input.tanggal,
    p_items: input.items,
    p_catatan: input.catatan ?? null,
    p_log: barisLog(input.log),
  })
  if (error) throw galatDari(error)
  return petakanHasilPenjualan(data as HasilPenjualanRpc)
}

export async function ubahPenjualanCloud(input: {
  id: string
  tanggal: string
  items: { menuId: string; jumlah: number }[]
  catatan?: string
  log?: LogAktivitas
}): Promise<HasilPenjualanCloud> {
  const klien = pastikanKlien()
  const { data, error } = await klien.rpc('ubah_penjualan', {
    p_id: input.id,
    p_tanggal: input.tanggal,
    p_items: input.items,
    p_catatan: input.catatan ?? null,
    p_log: barisLog(input.log),
  })
  if (error) throw galatDari(error)
  return petakanHasilPenjualan(data as HasilPenjualanRpc)
}

export async function hapusPenjualanCloud(
  id: string,
  log?: LogAktivitas,
): Promise<void> {
  const klien = pastikanKlien()
  const { error } = await klien.rpc('hapus_penjualan', {
    p_id: id,
    p_log: barisLog(log),
  })
  if (error) throw galatDari(error)
}

// ==============================================================================
// MUTASI MANUAL
// ==============================================================================

export async function catatMutasiCloud(
  mutasi: Mutasi,
  log?: LogAktivitas,
): Promise<Mutasi> {
  const klien = pastikanKlien()
  const { data, error } = await klien.rpc('catat_mutasi', {
    p_id: mutasi.id,
    p_bahan_id: mutasi.bahanId,
    p_tipe: mutasi.tipe,
    p_jumlah: mutasi.jumlah,
    p_alasan: mutasi.alasan ?? null,
    p_keterangan: mutasi.keterangan ?? null,
    p_tanggal: mutasi.tanggal,
    p_log: barisLog(log),
  })
  if (error) throw galatDari(error)
  return mapMutasiFromRow(data as MutasiRow)
}

export async function ubahMutasiCloud(
  mutasi: Mutasi,
  log?: LogAktivitas,
): Promise<Mutasi> {
  const klien = pastikanKlien()
  const { data, error } = await klien.rpc('ubah_mutasi', {
    p_id: mutasi.id,
    p_bahan_id: mutasi.bahanId,
    p_tipe: mutasi.tipe,
    p_jumlah: mutasi.jumlah,
    p_alasan: mutasi.alasan ?? null,
    p_keterangan: mutasi.keterangan ?? null,
    p_tanggal: mutasi.tanggal,
    p_log: barisLog(log),
  })
  if (error) throw galatDari(error)
  return mapMutasiFromRow(data as MutasiRow)
}

export async function hapusMutasiCloud(
  id: string,
  log?: LogAktivitas,
): Promise<void> {
  const klien = pastikanKlien()
  const { error } = await klien.rpc('hapus_mutasi', {
    p_id: id,
    p_log: barisLog(log),
  })
  if (error) throw galatDari(error)
}

// ==============================================================================
// PROFIL
// ==============================================================================

export async function ambilProfilCloud(id: string) {
  const klien = pastikanKlien()
  const { data, error } = await klien
    .from('profiles')
    .select('id, username, nama, role, aktif, created_at, updated_at, password_changed_at')
    .eq('id', id)
    .maybeSingle()
  if (error) throw galatDari(error)
  return data ? mapProfilFromRow(data as ProfilRow) : null
}

export async function ambilProfilSendiri() {
  const klien = pastikanKlien()
  const { data: userData, error: userError } = await klien.auth.getUser()
  if (userError || !userData.user) return null
  return ambilProfilCloud(userData.user.id)
}

/** Validasi item penjualan untuk dipakai sebagai tipe payload outbox. */
export type ItemPenjualanSederhana = Pick<ItemPenjualan, 'menuId' | 'jumlah'>
