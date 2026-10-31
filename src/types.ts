export type Role = 'admin' | 'staf'

export interface User {
  id: string
  username: string
  nama: string
  role: Role
  passwordHash: string
  salt: string
  aktif: boolean
  createdAt: string
  passwordChangedAt?: string
}

export type MutasiTipe = 'masuk' | 'keluar'

export interface Mutasi {
  id: string
  bahanId: string
  tipe: MutasiTipe
  jumlah: number
  hargaSatuan?: number
  alasan?: string
  keterangan?: string
  /** ISO string (datetime lokal) */
  tanggal: string
  userId: string
  userName: string
  createdAt: string
  /** Diisi bila mutasi ini dibuat otomatis oleh pencatatan penjualan. */
  penjualanId?: string
}

export interface Bahan {
  id: string
  nama: string
  kategori: string
  satuan: string
  stokMin: number
  arsip: boolean
  createdAt: string
}

export interface ResepItem {
  bahanId: string
  jumlah: number
}

export interface Menu {
  id: string
  nama: string
  kategori: string
  harga: number
  deskripsi?: string
  resep: ResepItem[]
  /** Resep contoh/estimasi, bukan resep resmi kedai. */
  resepEstimasi: boolean
  arsip: boolean
  createdAt: string
}

export interface ItemPenjualan {
  menuId: string
  /** Snapshot nama saat transaksi dibuat. */
  nama: string
  /** Snapshot harga jual saat transaksi dibuat. */
  harga: number
  jumlah: number
  /** Snapshot HPP per unit saat transaksi dibuat. */
  hppSatuan: number
}

export interface Penjualan {
  id: string
  nomor: string
  /** ISO string */
  tanggal: string
  items: ItemPenjualan[]
  omzet: number
  hpp: number
  laba: number
  catatan?: string
  /** false bila ada item menu tanpa resep (stok tidak terpotong penuh). */
  stokTerpotong: boolean
  userId: string
  userName: string
  createdAt: string
}

export type HariKey =
  | 'senin'
  | 'selasa'
  | 'rabu'
  | 'kamis'
  | 'jumat'
  | 'sabtu'
  | 'minggu'

export interface JamHari {
  buka: boolean
  /** format HH:MM */
  mulai: string
  /** format HH:MM */
  selesai: string
}

export type JamOperasional = Record<HariKey, JamHari>

export interface Pengaturan {
  namaKedai: string
  tagline: string
  alamat: string
  telepon: string
  kota: string
  /** yyyy-mm-dd */
  tanggalBerdiri: string
  halalId: string
  instagram: string
  tiktok: string
  mapsUrl: string
  gofoodUrl: string
  grabfoodUrl: string
  situsUrl: string
  jamOperasional: JamOperasional
  kategoriBahan: string[]
  satuanBahan: string[]
  kategoriMenu: string[]
}

export interface LogAktivitas {
  id: string
  at: string
  userId: string
  userName: string
  aksi: string
  detail: string
}

export interface DB {
  version: number
  users: User[]
  bahan: Bahan[]
  mutasi: Mutasi[]
  menu: Menu[]
  penjualan: Penjualan[]
  pengaturan: Pengaturan
  log: LogAktivitas[]
}

export interface Sesi {
  userId: string
  expiresAt: number
}

export type StatusStok = 'habis' | 'menipis' | 'aman'

export interface StokInfo {
  bahanId: string
  stok: number
  totalMasuk: number
  totalKeluar: number
  hargaRataRata: number
  nilai: number
  status: StatusStok
}
