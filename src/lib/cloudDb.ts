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
import { DB_VERSION } from './storage'
import { supabase } from './supabase'

// ==============================================================================
// TIPE ROW SUPABASE (SNAKE_CASE)
// ==============================================================================

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

export interface PenggunaRow {
  id: string
  username: string
  nama: string
  role: Role
  password_hash: string
  salt: string
  aktif: boolean
  created_at: string
  password_changed_at: string | null
}

export interface BahanRow {
  id: string
  nama: string
  kategori: string
  satuan: string
  stok_min: number
  arsip: boolean
  created_at: string
}

export interface MenuRow {
  id: string
  nama: string
  kategori: string
  harga: number | null
  deskripsi: string | null
  resep: ResepItem[]
  resep_estimasi: boolean
  arsip: boolean
  created_at: string
}

export interface MutasiRow {
  id: string
  bahan_id: string
  tipe: MutasiTipe
  jumlah: number
  harga_satuan: number | null
  alasan: string | null
  keterangan: string | null
  tanggal: string
  user_id: string
  user_name: string
  penjualan_id: string | null
  created_at: string
}

export interface PenjualanRow {
  id: string
  nomor: string
  tanggal: string
  items: ItemPenjualan[]
  omzet: number | null
  hpp: number | null
  laba: number | null
  catatan: string | null
  stok_terpotong: boolean
  user_id: string
  user_name: string
  created_at: string
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
// MAPPER FUNGSI (DATABASE <-> TYPESCRIPT)
// ==============================================================================

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

export function mapPengaturanToRow(
  p: Pengaturan,
  id = 'utama',
): PengaturanRow {
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

export function mapPenggunaFromRow(r: PenggunaRow): User {
  return {
    id: r.id,
    username: r.username,
    nama: r.nama,
    role: r.role,
    passwordHash: r.password_hash,
    salt: r.salt,
    aktif: r.aktif,
    createdAt: r.created_at,
    passwordChangedAt: r.password_changed_at ?? undefined,
  }
}

export function mapPenggunaToRow(u: User): PenggunaRow {
  return {
    id: u.id,
    username: u.username,
    nama: u.nama,
    role: u.role,
    password_hash: u.passwordHash,
    salt: u.salt,
    aktif: u.aktif,
    created_at: u.createdAt,
    password_changed_at: u.passwordChangedAt ?? null,
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
    harga: r.harga != null ? Number(r.harga) : undefined,
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
    harga: m.harga ?? null,
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
    hargaSatuan: r.harga_satuan != null ? Number(r.harga_satuan) : undefined,
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
    harga_satuan: m.hargaSatuan ?? null,
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
    omzet: r.omzet != null ? Number(r.omzet) : undefined,
    hpp: r.hpp != null ? Number(r.hpp) : undefined,
    laba: r.laba != null ? Number(r.laba) : undefined,
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
    omzet: p.omzet ?? null,
    hpp: p.hpp ?? null,
    laba: p.laba ?? null,
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
// OPERASI DATA CLOUD (SUPABASE)
// ==============================================================================

/**
 * Mengambil seluruh database dari tabel Supabase.
 * Mengembalikan null jika Supabase belum aktif atau basis data cloud masih kosong.
 */
export async function muatDBSupabase(): Promise<DB | null> {
  if (!supabase) return null

  const [
    resPengaturan,
    resPengguna,
    resBahan,
    resMenu,
    resMutasi,
    resPenjualan,
    resLog,
  ] = await Promise.all([
    supabase.from('pengaturan').select('*').limit(1).maybeSingle(),
    supabase.from('pengguna').select('*').order('created_at', { ascending: true }),
    supabase.from('bahan').select('*').order('nama', { ascending: true }),
    supabase.from('menu').select('*').order('nama', { ascending: true }),
    supabase.from('mutasi').select('*').order('tanggal', { ascending: false }),
    supabase.from('penjualan').select('*').order('tanggal', { ascending: false }),
    supabase.from('log_aktivitas').select('*').order('at', { ascending: false }).limit(200),
  ])

  if (resPengaturan.error) {
    throw new Error(`Gagal memuat pengaturan cloud: ${resPengaturan.error.message}`)
  }
  if (resPengguna.error) {
    throw new Error(`Gagal memuat data pengguna cloud: ${resPengguna.error.message}`)
  }
  if (resBahan.error) {
    throw new Error(`Gagal memuat data bahan cloud: ${resBahan.error.message}`)
  }
  if (resMenu.error) {
    throw new Error(`Gagal memuat katalog menu cloud: ${resMenu.error.message}`)
  }
  if (resMutasi.error) {
    throw new Error(`Gagal memuat mutasi stok cloud: ${resMutasi.error.message}`)
  }
  if (resPenjualan.error) {
    throw new Error(`Gagal memuat riwayat penjualan cloud: ${resPenjualan.error.message}`)
  }
  if (resLog.error) {
    throw new Error(`Gagal memuat log aktivitas cloud: ${resLog.error.message}`)
  }

  // Jika tabel pengaturan belum diisi dan pengguna masih kosong, anggap belum diinisialisasi
  if (!resPengaturan.data && (!resPengguna.data || resPengguna.data.length === 0)) {
    return null
  }

  const pengaturan: Pengaturan = resPengaturan.data
    ? mapPengaturanFromRow(resPengaturan.data as PengaturanRow)
    : {
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
        gofoodUrl: '',
        grabfoodUrl: '',
        situsUrl: 'https://kedaikopibanggala.vercel.app/',
        jamOperasional: {} as JamOperasional,
        kategoriBahan: [],
        satuanBahan: [],
        kategoriMenu: [],
      }

  return {
    version: DB_VERSION,
    pengaturan,
    users: (resPengguna.data as PenggunaRow[]).map(mapPenggunaFromRow),
    bahan: (resBahan.data as BahanRow[]).map(mapBahanFromRow),
    menu: (resMenu.data as MenuRow[]).map(mapMenuFromRow),
    mutasi: (resMutasi.data as MutasiRow[]).map(mapMutasiFromRow),
    penjualan: (resPenjualan.data as PenjualanRow[]).map(mapPenjualanFromRow),
    log: (resLog.data as LogAktivitasRow[]).map(mapLogFromRow),
  }
}

/**
 * Menyimpan penjualan dan mutasi terkait ke Supabase secara terkoordinasi.
 */
export async function simpanPenjualanCloud(
  penjualan: Penjualan,
  mutasiList: Mutasi[],
  log?: LogAktivitas,
): Promise<void> {
  if (!supabase) return

  // 1. Simpan Penjualan
  const rowPenjualan = mapPenjualanToRow(penjualan)
  const { error: errP } = await supabase.from('penjualan').upsert(rowPenjualan)
  if (errP) throw errP

  // 2. Simpan Mutasi terkait
  if (mutasiList.length > 0) {
    const rowsMutasi = mutasiList.map(mapMutasiToRow)
    const { error: errM } = await supabase.from('mutasi').upsert(rowsMutasi)
    if (errM) throw errM
  }

  // 3. Simpan Log aktivitas
  if (log) {
    const { error: errL } = await supabase.from('log_aktivitas').insert(mapLogToRow(log))
    if (errL) console.warn('Gagal mencatat log cloud:', errL)
  }
}

/**
 * Menghapus penjualan dan mutasi terkait dari Supabase.
 */
export async function hapusPenjualanCloud(
  id: string,
  log?: LogAktivitas,
): Promise<void> {
  if (!supabase) return

  // Mutasi dengan penjualan_id = id akan dihapus
  const { error: errM } = await supabase
    .from('mutasi')
    .delete()
    .eq('penjualan_id', id)
  if (errM) throw errM

  const { error: errP } = await supabase
    .from('penjualan')
    .delete()
    .eq('id', id)
  if (errP) throw errP

  if (log) {
    await supabase.from('log_aktivitas').insert(mapLogToRow(log))
  }
}

export async function simpanMutasiCloud(
  mutasi: Mutasi,
  log?: LogAktivitas,
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('mutasi').upsert(mapMutasiToRow(mutasi))
  if (error) throw error

  if (log) {
    await supabase.from('log_aktivitas').insert(mapLogToRow(log))
  }
}

export async function hapusMutasiCloud(
  id: string,
  log?: LogAktivitas,
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('mutasi').delete().eq('id', id)
  if (error) throw error

  if (log) {
    await supabase.from('log_aktivitas').insert(mapLogToRow(log))
  }
}

export async function simpanBahanCloud(
  bahan: Bahan,
  log?: LogAktivitas,
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('bahan').upsert(mapBahanToRow(bahan))
  if (error) throw error

  if (log) {
    await supabase.from('log_aktivitas').insert(mapLogToRow(log))
  }
}

export async function hapusBahanCloud(
  id: string,
  log?: LogAktivitas,
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('bahan').delete().eq('id', id)
  if (error) throw error

  if (log) {
    await supabase.from('log_aktivitas').insert(mapLogToRow(log))
  }
}

export async function simpanMenuCloud(
  menu: Menu,
  log?: LogAktivitas,
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('menu').upsert(mapMenuToRow(menu))
  if (error) throw error

  if (log) {
    await supabase.from('log_aktivitas').insert(mapLogToRow(log))
  }
}

export async function hapusMenuCloud(
  id: string,
  log?: LogAktivitas,
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('menu').delete().eq('id', id)
  if (error) throw error

  if (log) {
    await supabase.from('log_aktivitas').insert(mapLogToRow(log))
  }
}

export async function simpanPengaturanCloud(
  pengaturan: Pengaturan,
  log?: LogAktivitas,
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase
    .from('pengaturan')
    .upsert(mapPengaturanToRow(pengaturan, 'utama'))
  if (error) throw error

  if (log) {
    await supabase.from('log_aktivitas').insert(mapLogToRow(log))
  }
}

export async function simpanPenggunaCloud(
  user: User,
  log?: LogAktivitas,
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('pengguna').upsert(mapPenggunaToRow(user))
  if (error) throw error

  if (log) {
    await supabase.from('log_aktivitas').insert(mapLogToRow(log))
  }
}

export async function hapusPenggunaCloud(
  id: string,
  log?: LogAktivitas,
): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('pengguna').delete().eq('id', id)
  if (error) throw error

  if (log) {
    await supabase.from('log_aktivitas').insert(mapLogToRow(log))
  }
}

export async function simpanLogCloud(log: LogAktivitas): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.from('log_aktivitas').insert(mapLogToRow(log))
  if (error) throw error
}

/**
 * Fungsi utilitas migrasi batch: mendorong seluruh data lokal ke Supabase.
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
    onProgress?.('Menyimpan pengaturan kedai...', 10)
    const { error: errP } = await supabase
      .from('pengaturan')
      .upsert(mapPengaturanToRow(db.pengaturan, 'utama'))
    if (errP) throw errP

    onProgress?.('Menyimpan data pengguna...', 25)
    if (db.users.length > 0) {
      const { error: errU } = await supabase
        .from('pengguna')
        .upsert(db.users.map(mapPenggunaToRow))
      if (errU) throw errU
    }

    onProgress?.('Menyimpan master data bahan baku...', 45)
    if (db.bahan.length > 0) {
      // Chunk per 100 baris
      for (let i = 0; i < db.bahan.length; i += 100) {
        const slice = db.bahan.slice(i, i + 100).map(mapBahanToRow)
        const { error } = await supabase.from('bahan').upsert(slice)
        if (error) throw error
      }
    }

    onProgress?.('Menyimpan katalog menu & resep...', 65)
    if (db.menu.length > 0) {
      for (let i = 0; i < db.menu.length; i += 100) {
        const slice = db.menu.slice(i, i + 100).map(mapMenuToRow)
        const { error } = await supabase.from('menu').upsert(slice)
        if (error) throw error
      }
    }

    onProgress?.('Menyimpan riwayat penjualan...', 80)
    if (db.penjualan.length > 0) {
      for (let i = 0; i < db.penjualan.length; i += 100) {
        const slice = db.penjualan.slice(i, i + 100).map(mapPenjualanToRow)
        const { error } = await supabase.from('penjualan').upsert(slice)
        if (error) throw error
      }
    }

    onProgress?.('Menyimpan riwayat mutasi stok...', 92)
    if (db.mutasi.length > 0) {
      for (let i = 0; i < db.mutasi.length; i += 100) {
        const slice = db.mutasi.slice(i, i + 100).map(mapMutasiToRow)
        const { error } = await supabase.from('mutasi').upsert(slice)
        if (error) throw error
      }
    }

    onProgress?.('Menyimpan log audit aktivitas...', 98)
    if (db.log.length > 0) {
      const sliceLog = db.log.slice(0, 100).map(mapLogToRow)
      const { error } = await supabase.from('log_aktivitas').upsert(sliceLog)
      if (error) console.warn('Peringatan simpan log:', error)
    }

    onProgress?.('Migrasi selesai!', 100)
    return {
      sukses: true,
      pesan: 'Seluruh data lokal berhasil dimigrasikan ke database Supabase Cloud!',
    }
  } catch (err) {
    const pesan = err instanceof Error ? err.message : String(err)
    return {
      sukses: false,
      pesan: `Gagal migrasi ke Supabase: ${pesan}`,
    }
  }
}
