import type {
  Bahan,
  DB,
  ItemPenjualan,
  JamOperasional,
  LogAktivitas,
  Menu,
  Mutasi,
  MutasiTipe,
  Pengaturan,
  Penjualan,
  ResepItem,
  Role,
  User,
} from '../types'
import { PENGATURAN_RESMI } from './dataAwal'
import { DB_VERSION } from './storage'
import { DOMAIN_EMAIL, supabase } from './supabase'

// ==============================================================================
// TIPE ROW SUPABASE (SNAKE_CASE)
// ==============================================================================

export interface ProfilRow {
  id: string
  username: string
  nama: string
  role: Role
  aktif: boolean
  created_at: string
  updated_at?: string
  password_changed_at: string | null
}

export interface PengaturanRow {
  id: string
  nama_kedai: string
  tagline: string | null
  alamat: string | null
  kota: string | null
  tanggal_berdiri: string | null
  halal_id: string | null
  instagram: string | null
  tiktok: string | null
  maps_url: string | null
  gofood_url: string | null
  grabfood_url: string | null
  situs_url: string | null
  jam_operasional: JamOperasional
  kategori_bahan: string[]
  satuan_bahan: string[]
  kategori_menu: string[]
  updated_at?: string
}

export interface BahanRow {
  id: string
  nama: string
  kategori: string
  satuan: string
  stok_min: number
  arsip: boolean
  created_at: string
  updated_at?: string
}

export interface MenuRow {
  id: string
  nama: string
  kategori: string
  deskripsi: string | null
  resep: ResepItem[]
  resep_estimasi: boolean
  arsip: boolean
  created_at: string
  updated_at?: string
}

export interface MutasiRow {
  id: string
  bahan_id: string
  tipe: MutasiTipe
  jumlah: number
  alasan: string | null
  keterangan: string | null
  tanggal: string
  user_id: string
  user_name: string
  penjualan_id: string | null
  created_at: string
  updated_at?: string
}

export interface PenjualanRow {
  id: string
  nomor: string
  tanggal: string
  items: ItemPenjualan[]
  catatan: string | null
  stok_terpotong: boolean
  user_id: string
  user_name: string
  created_at: string
  updated_at?: string
}

export interface LogAktivitasRow {
  id: string
  at: string
  user_id: string
  user_name: string
  aksi: string
  detail: string
}

// ==============================================================================
// MAPPER (DATABASE <-> TYPESCRIPT)
// ==============================================================================

export function mapProfilFromRow(r: ProfilRow): User {
  return {
    id: r.id,
    username: r.username,
    nama: r.nama,
    role: r.role,
    email: `${r.username}@${DOMAIN_EMAIL}`,
    aktif: Boolean(r.aktif),
    createdAt: r.created_at,
    passwordChangedAt: r.password_changed_at ?? undefined,
  }
}

export function mapPengaturanFromRow(r: PengaturanRow): Pengaturan {
  return {
    namaKedai: r.nama_kedai,
    tagline: r.tagline ?? '',
    alamat: r.alamat ?? '',
    kota: r.kota ?? '',
    tanggalBerdiri: r.tanggal_berdiri ?? '2024-01-15',
    halalId: r.halal_id ?? '',
    instagram: r.instagram ?? '',
    tiktok: r.tiktok ?? '',
    mapsUrl: r.maps_url ?? '',
    gofoodUrl: r.gofood_url ?? '',
    grabfoodUrl: r.grabfood_url ?? '',
    situsUrl: r.situs_url ?? '',
    jamOperasional: r.jam_operasional,
    kategoriBahan: r.kategori_bahan ?? [],
    satuanBahan: r.satuan_bahan ?? [],
    kategoriMenu: r.kategori_menu ?? [],
  }
}

export function mapPengaturanToRow(p: Pengaturan, id = 'utama'): PengaturanRow {
  return {
    id,
    nama_kedai: p.namaKedai,
    tagline: p.tagline || null,
    alamat: p.alamat || null,
    kota: p.kota || null,
    tanggal_berdiri: p.tanggalBerdiri || null,
    halal_id: p.halalId || null,
    instagram: p.instagram || null,
    tiktok: p.tiktok || null,
    maps_url: p.mapsUrl || null,
    gofood_url: p.gofoodUrl || null,
    grabfood_url: p.grabfoodUrl || null,
    situs_url: p.situsUrl || null,
    jam_operasional: p.jamOperasional,
    kategori_bahan: p.kategoriBahan,
    satuan_bahan: p.satuanBahan,
    kategori_menu: p.kategoriMenu,
  }
}

export function mapBahanFromRow(r: BahanRow): Bahan {
  return {
    id: r.id,
    nama: r.nama,
    kategori: r.kategori,
    satuan: r.satuan,
    stokMin: Number(r.stok_min) || 0,
    arsip: Boolean(r.arsip),
    createdAt: r.created_at,
  }
}

export function mapBahanToRow(b: Bahan): BahanRow {
  return {
    id: b.id,
    nama: b.nama,
    kategori: b.kategori,
    satuan: b.satuan,
    stok_min: b.stokMin,
    arsip: b.arsip,
    created_at: b.createdAt,
  }
}

export function mapMenuFromRow(r: MenuRow): Menu {
  return {
    id: r.id,
    nama: r.nama,
    kategori: r.kategori,
    deskripsi: r.deskripsi ?? undefined,
    resep: Array.isArray(r.resep) ? r.resep : [],
    resepEstimasi: Boolean(r.resep_estimasi),
    arsip: Boolean(r.arsip),
    createdAt: r.created_at,
  }
}

export function mapMenuToRow(m: Menu): MenuRow {
  return {
    id: m.id,
    nama: m.nama,
    kategori: m.kategori,
    deskripsi: m.deskripsi ?? null,
    resep: m.resep,
    resep_estimasi: m.resepEstimasi,
    arsip: m.arsip,
    created_at: m.createdAt,
  }
}

export function mapMutasiFromRow(r: MutasiRow): Mutasi {
  return {
    id: r.id,
    bahanId: r.bahan_id,
    tipe: r.tipe,
    jumlah: Number(r.jumlah),
    alasan: r.alasan ?? undefined,
    keterangan: r.keterangan ?? undefined,
    tanggal: r.tanggal,
    userId: r.user_id,
    userName: r.user_name,
    penjualanId: r.penjualan_id ?? undefined,
    createdAt: r.created_at,
  }
}

export function mapMutasiToRow(m: Mutasi): MutasiRow {
  return {
    id: m.id,
    bahan_id: m.bahanId,
    tipe: m.tipe,
    jumlah: m.jumlah,
    alasan: m.alasan ?? null,
    keterangan: m.keterangan ?? null,
    tanggal: m.tanggal,
    user_id: m.userId,
    user_name: m.userName,
    penjualan_id: m.penjualanId ?? null,
    created_at: m.createdAt,
  }
}

export function mapPenjualanFromRow(r: PenjualanRow): Penjualan {
  return {
    id: r.id,
    nomor: r.nomor,
    tanggal: r.tanggal,
    items: Array.isArray(r.items) ? r.items : [],
    catatan: r.catatan ?? undefined,
    stokTerpotong: Boolean(r.stok_terpotong),
    userId: r.user_id,
    userName: r.user_name,
    createdAt: r.created_at,
  }
}

export function mapPenjualanToRow(p: Penjualan): PenjualanRow {
  return {
    id: p.id,
    nomor: p.nomor,
    tanggal: p.tanggal,
    items: p.items,
    catatan: p.catatan ?? null,
    stok_terpotong: p.stokTerpotong,
    user_id: p.userId,
    user_name: p.userName,
    created_at: p.createdAt,
  }
}

export function mapLogFromRow(r: LogAktivitasRow): LogAktivitas {
  return {
    id: r.id,
    at: r.at,
    userId: r.user_id,
    userName: r.user_name,
    aksi: r.aksi,
    detail: r.detail,
  }
}

export function mapLogToRow(l: LogAktivitas): LogAktivitasRow {
  return {
    id: l.id,
    at: l.at,
    user_id: l.userId,
    user_name: l.userName,
    aksi: l.aksi,
    detail: l.detail,
  }
}

// ==============================================================================
// BACA SNAPSHOT CLOUD
// ==============================================================================

/**
 * Mengambil seluruh database dari Supabase.
 * `users` diisi dari tabel profiles (bukan lagi hash password).
 * Mengembalikan null jika cloud masih kosong.
 */
export async function muatDBSupabase(): Promise<DB | null> {
  if (!supabase) return null

  const [resPengaturan, resProfil, resBahan, resMenu, resMutasi, resPenjualan, resLog] =
    await Promise.all([
      supabase.from('pengaturan').select('*').limit(1).maybeSingle(),
      supabase
        .from('profiles')
        .select('id, username, nama, role, aktif, created_at, updated_at, password_changed_at')
        .order('created_at', { ascending: true }),
      supabase.from('bahan').select('*').order('nama', { ascending: true }),
      supabase.from('menu').select('*').order('nama', { ascending: true }),
      supabase.from('mutasi').select('*').order('tanggal', { ascending: false }),
      supabase.from('penjualan').select('*').order('tanggal', { ascending: false }),
      supabase.from('log_aktivitas').select('*').order('at', { ascending: false }).limit(200),
    ])

  if (resPengaturan.error) {
    throw new Error(`Gagal memuat pengaturan cloud: ${resPengaturan.error.message}`)
  }
  if (resProfil.error) {
    throw new Error(`Gagal memuat profil pengguna: ${resProfil.error.message}`)
  }
  if (resBahan.error) {
    throw new Error(`Gagal memuat bahan cloud: ${resBahan.error.message}`)
  }
  if (resMenu.error) {
    throw new Error(`Gagal memuat menu cloud: ${resMenu.error.message}`)
  }
  if (resMutasi.error) {
    throw new Error(`Gagal memuat mutasi cloud: ${resMutasi.error.message}`)
  }
  if (resPenjualan.error) {
    throw new Error(`Gagal memuat penjualan cloud: ${resPenjualan.error.message}`)
  }
  if (resLog.error) {
    throw new Error(`Gagal memuat log cloud: ${resLog.error.message}`)
  }

  const kosong =
    !resPengaturan.data &&
    (resBahan.data?.length ?? 0) === 0 &&
    (resMenu.data?.length ?? 0) === 0

  if (kosong) return null

  return {
    version: DB_VERSION,
    // Bila baris pengaturan belum pernah dibuat (mis. cloud baru diisi bahan
    // langsung tanpa migrasi), pakai nilai bawaan agar UI tidak kosong.
    pengaturan: resPengaturan.data
      ? mapPengaturanFromRow(resPengaturan.data as PengaturanRow)
      : PENGATURAN_RESMI,
    users: ((resProfil.data ?? []) as ProfilRow[]).map(mapProfilFromRow),
    bahan: ((resBahan.data ?? []) as BahanRow[]).map(mapBahanFromRow),
    menu: ((resMenu.data ?? []) as MenuRow[]).map(mapMenuFromRow),
    mutasi: ((resMutasi.data ?? []) as MutasiRow[]).map(mapMutasiFromRow),
    penjualan: ((resPenjualan.data ?? []) as PenjualanRow[]).map(mapPenjualanFromRow),
    log: ((resLog.data ?? []) as LogAktivitasRow[]).map(mapLogFromRow),
  }
}

// ==============================================================================
// TULIS MASTER DATA (RLS: hanya admin)
// ==============================================================================

export async function simpanBahanCloud(bahan: Bahan): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('bahan').upsert(mapBahanToRow(bahan))
  if (error) throw error
}

export async function hapusBahanCloud(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('bahan').delete().eq('id', id)
  if (error) throw error
}

export async function simpanMenuCloud(menu: Menu): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('menu').upsert(mapMenuToRow(menu))
  if (error) throw error
}

export async function hapusMenuCloud(id: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('menu').delete().eq('id', id)
  if (error) throw error
}

export async function simpanPengaturanCloud(pengaturan: Pengaturan): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('pengaturan')
    .upsert(mapPengaturanToRow(pengaturan, 'utama'))
  if (error) throw error
}

export async function simpanLogCloud(log: LogAktivitas): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('log_aktivitas').insert(mapLogToRow(log))
  if (error) throw error
}

// ==============================================================================
// GANTI SELURUH DATA (reset / restore / migrasi awal)
// ==============================================================================

export interface DBCloud {
  pengaturan: PengaturanRow | null
  bahan: BahanRow[]
  menu: MenuRow[]
  penjualan: PenjualanRow[]
  mutasi: MutasiRow[]
  log: LogAktivitasRow[]
}

export function dbKeBarisCloud(db: DB): DBCloud {
  return {
    pengaturan: db.pengaturan?.namaKedai ? mapPengaturanToRow(db.pengaturan, 'utama') : null,
    bahan: db.bahan.map(mapBahanToRow),
    menu: db.menu.map(mapMenuToRow),
    penjualan: db.penjualan.map(mapPenjualanToRow),
    mutasi: db.mutasi.map(mapMutasiToRow),
    log: db.log.map(mapLogToRow),
  }
}

/**
 * Menimpa seluruh data bisnis di cloud dengan snapshot lokal.
 * Hanya admin (dicek ulang di server). Dipakai untuk migrasi, reset, dan restore.
 */
export async function gantiSemuaDataCloud(
  db: DB,
  log?: LogAktivitas,
): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase belum dikonfigurasi.')
  }

  const { error } = await supabase.rpc('ganti_semua_data', {
    p_db: dbKeBarisCloud(db),
    p_log: log ? mapLogToRow(log) : null,
  })

  if (error) {
    throw new Error(error.message || 'Gagal mengganti data cloud.')
  }
}

/**
 * Kompatibilitas: dulu mendorong tabel satu per satu, sekarang satu RPC atomik.
 */
export async function migrasiSemuaKeCloud(
  db: DB,
  onProgress?: (pesan: string, persen: number) => void,
): Promise<{ sukses: boolean; pesan: string }> {
  if (!supabase) {
    return {
      sukses: false,
      pesan: 'Supabase belum dikonfigurasi. Periksa file .env Anda.',
    }
  }

  try {
    onProgress?.('Memeriksa sesi admin…', 10)
    onProgress?.('Mengirim katalog bahan & menu…', 35)
    onProgress?.('Mengirim riwayat penjualan & mutasi…', 65)
    onProgress?.('Menyimpan log aktivitas…', 85)
    await gantiSemuaDataCloud(db)
    onProgress?.('Migrasi selesai!', 100)
    return {
      sukses: true,
      pesan: 'Seluruh data lokal berhasil dimigrasikan ke Supabase Cloud.',
    }
  } catch (err) {
    const pesan = err instanceof Error ? err.message : String(err)
    return { sukses: false, pesan: `Gagal migrasi ke Supabase: ${pesan}` }
  }
}
