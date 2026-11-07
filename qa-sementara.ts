/**
 * QA sementara (tidak ikut build): bundle dengan esbuild lalu jalankan via node.
 * Menguji seed, stok non-negatif, validasi resep, migrasi v1→v2, dan status WIB.
 */
import type { Bahan, DB, Menu, Mutasi, User } from './src/types'
import {
  daftarBahanV2,
  daftarMenuAwal,
  daftarPenjualanAwal,
  mutasiPembelianV2,
  mutasiPemakaianHistoris,
  PENGATURAN_RESMI,
} from './src/lib/dataAwal'
import {
  kebutuhanBahan,
  menuTanpaResep,
  periksaKetersediaan,
  rincianKebutuhan,
  totalItem,
} from './src/lib/menu'
import { hitungStok, penjualanHarian, ringkasanPeriode } from './src/lib/stock'
import { normalisasiDB } from './src/lib/storage'
import { statusBukaSekarang } from './src/lib/operasional'
import { buatDatabaseAwal } from './src/lib/seed'

let jumlahCek = 0
const gagal: string[] = []

function cek(kondisi: unknown, pesan: string): void {
  jumlahCek++
  if (!kondisi) gagal.push(pesan)
}

function sama<T>(aktual: T, harapan: T, pesan: string): void {
  cek(
    Object.is(aktual, harapan),
    `${pesan} — harap ${JSON.stringify(harapan)}, dapat ${JSON.stringify(aktual)}`,
  )
}

function dekat(aktual: number, harapan: number, pesan: string, toleransi = 1e-6): void {
  cek(
    Math.abs(aktual - harapan) <= toleransi,
    `${pesan} — harap ${harapan}, dapat ${aktual}`,
  )
}

function ujiKatalog(): void {
  const bahan = daftarBahanV2()
  const menu = daftarMenuAwal()

  sama(new Set(bahan.map((b) => b.id)).size, bahan.length, 'ID bahan katalog unik')
  sama(new Set(menu.map((m) => m.id)).size, menu.length, 'ID menu katalog unik')
  sama(menu.length, 28, 'Jumlah menu katalog sesuai web profil')

  const bahanMap = new Map(bahan.map((b) => [b.id, b]))
  for (const m of menu) {
    cek(m.nama.trim().length > 0, `Menu ${m.id} punya nama`)
    cek(m.kategori.trim().length > 0, `Menu ${m.nama} punya kategori`)
    cek(typeof m.resepEstimasi === 'boolean', `Menu ${m.nama} punya penanda resep estimasi`)
    for (const r of m.resep) {
      cek(bahanMap.has(r.bahanId), `Resep ${m.nama} memakai bahan valid (${r.bahanId})`)
      cek(r.jumlah > 0, `Jumlah resep ${m.nama} > 0`)
    }
    cek(
      new Set(m.resep.map((r) => r.bahanId)).size === m.resep.length,
      `Resep ${m.nama} tidak duplikat bahan`,
    )
  }

  // Setiap bahan katalog (kecuali kemasan tertentu) sebaiknya dipakai minimal satu resep.
  const dipakai = new Set(menu.flatMap((m) => m.resep.map((r) => r.bahanId)))
  const takDipakai = bahan.filter((b) => !dipakai.has(b.id)).map((b) => b.nama)
  console.log(`   Bahan tanpa resep: ${takDipakai.length > 0 ? takDipakai.join(', ') : '—'}`)
}

async function ujiSeed(): Promise<DB> {
  const admin: User = {
    id: 'usr_admin',
    username: 'admin',
    nama: 'Admin',
    role: 'admin',
    passwordHash: 'x',
    salt: 'x',
    aktif: true,
    createdAt: new Date().toISOString(),
  }

  const resepMenu = new Map(daftarMenuAwal().map((m) => [m.id, m]))
  const pembelian = mutasiPembelianV2(admin)
  const pemakaian = mutasiPemakaianHistoris(admin)
  const { penjualan, mutasiPenjualan } = daftarPenjualanAwal(admin)
  const mutasi = [...pembelian, ...pemakaian, ...mutasiPenjualan]

  // Semua mutasi merujuk bahan valid.
  const idsBahan = new Set(daftarBahanV2().map((b) => b.id))
  for (const m of mutasi) {
    cek(idsBahan.has(m.bahanId), `Mutasi ${m.id} merujuk bahan valid`)
    cek(m.jumlah > 0, `Mutasi ${m.id} berjumlah positif`)
  }

  // Setiap mutasi penjualan cocok dengan kebutuhan resep transaksinya.
  for (const p of penjualan) {
    const daftar = mutasiPenjualan.filter((m) => m.penjualanId === p.id)
    const harapan = kebutuhanBahan(p.items, resepMenu)
    sama(daftar.length, harapan.size, `Jumlah baris mutasi penjualan ${p.nomor}`)
    for (const [bahanId, qty] of harapan) {
      const m = daftar.find((x) => x.bahanId === bahanId)
      cek(Boolean(m), `Mutasi ${p.nomor} punya bahan ${bahanId}`)
      if (m) dekat(m.jumlah, qty, `Jumlah mutasi ${p.nomor} untuk ${bahanId}`)
    }
    for (const it of p.items) {
      cek(resepMenu.has(it.menuId), `Item ${p.nomor} memakai menu valid`)
      cek(it.nama.length > 0, `Item ${p.nomor} punya snapshot nama`)
      cek(it.harga === undefined && it.hppSatuan === undefined, `Item ${p.nomor} tanpa data uang`)
    }
    cek(p.omzet === undefined && p.hpp === undefined && p.laba === undefined, `Penjualan ${p.nomor} tanpa omzet/hpp/laba`)
    cek(p.stokTerpotong === true, `Penjualan ${p.nomor} memotong stok`)
  }

  // Stok akhir tidak boleh negatif.
  const stok = hitungStok(daftarBahanV2(), mutasi)
  for (const b of daftarBahanV2()) {
    const info = stok.get(b.id)!
    cek(info.stok >= -1e-9, `Stok akhir ${b.nama} tidak negatif (${info.stok})`)
  }

  // Stok berjalan kronologis juga tidak boleh negatif.
  const urut = [...mutasi].sort(
    (a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime(),
  )
  const berjalan = new Map<string, number>()
  for (const m of urut) {
    const sekarang = (berjalan.get(m.bahanId) ?? 0) + (m.tipe === 'masuk' ? m.jumlah : -m.jumlah)
    berjalan.set(m.bahanId, sekarang)
    if (sekarang < -1e-9) {
      const nama = daftarBahanV2().find((b) => b.id === m.bahanId)?.nama ?? m.bahanId
      gagal.push(`Stok berjalan ${nama} negatif (${sekarang}) pada ${m.id}`)
    }
  }

  // DB seed lengkap.
  const db = await buatDatabaseAwal()
  sama(db.version, 2, 'Versi DB seed = 2')
  sama(db.menu.length, 28, 'DB seed berisi 28 menu')
  sama(db.bahan.length, daftarBahanV2().length, 'DB seed berisi seluruh bahan katalog')
  cek(db.users.length === 1 && db.users[0].username === 'admin', 'DB seed punya akun admin')
  cek(!('telepon' in (db.pengaturan as unknown as Record<string, unknown>)), 'Pengaturan seed tanpa telepon')
  cek(db.pengaturan.halalId === PENGATURAN_RESMI.halalId, 'Identitas halal seed sesuai')
  cek(db.log.length >= 1, 'DB seed punya log aktivitas')

  // Laporan: stok akhir ringkasan harus sama dengan hitungStok untuk rentang penuh.
  const akhir = new Date(Date.now() + 24 * 3600 * 1000)
  const mulai = new Date(0)
  const laporan = ringkasanPeriode(db.bahan, db.mutasi, mulai, akhir)
  for (const baris of laporan) {
    dekat(baris.stokAkhir, stok.get(baris.bahan.id)!.stok, `Stok akhir laporan ${baris.bahan.nama}`)
    dekat(baris.stokAwal + baris.masuk - baris.keluar, baris.stokAkhir, `Rumus stok ${baris.bahan.nama}`)
  }

  // Grafik penjualan 7 hari = total item dalam 7 hari terakhir.
  const grafik = penjualanHarian(db.penjualan, 7)
  const batas = new Date()
  batas.setHours(0, 0, 0, 0)
  batas.setDate(batas.getDate() - 6)
  const total7 = db.penjualan
    .filter((p) => new Date(p.tanggal).getTime() >= batas.getTime())
    .reduce((t, p) => t + totalItem(p.items), 0)
  dekat(
    grafik.reduce((t, g) => t + g.total, 0),
    total7,
    'Grafik penjualan 7 hari konsisten',
  )

  return db
}

function ujiValidasi(db: DB): void {
  const menuMap = new Map(db.menu.map((m) => [m.id, m]))
  const bahanMap = new Map(db.bahan.map((b) => [b.id, b]))
  const stok = hitungStok(db.bahan, db.mutasi)

  const contoh = db.menu.find((m) => m.resep.length > 0)!
  const rincian = rincianKebutuhan([{ menuId: contoh.id, jumlah: 1 }], menuMap, bahanMap, stok)
  sama(rincian.length, contoh.resep.length, `Rincian kebutuhan ${contoh.nama}`)
  for (const r of rincian) cek(r.cukup, `Stok ${r.nama} cukup untuk 1 porsi ${contoh.nama}`)

  // Pesan stok tidak cukup untuk permintaan besar.
  const kurang = periksaKetersediaan(
    [{ menuId: contoh.id, jumlah: 100000 }],
    menuMap,
    bahanMap,
    stok,
  )
  cek(kurang.length > 0, `Permintaan 100000 porsi ${contoh.nama} ditolak`)
  for (const k of kurang) {
    cek(k.dibutuhkan > k.tersedia, `Kekurangan ${k.nama} konsisten`)
  }

  // Menu tanpa resep tidak memotong stok dan terdeteksi.
  const tanpaResep: Menu = {
    id: 'mnu_uji_tanparesep',
    nama: 'Uji Tanpa Resep',
    kategori: 'Tambahan',
    resep: [],
    resepEstimasi: false,
    arsip: false,
    createdAt: new Date().toISOString(),
  }
  const mapUji = new Map(menuMap).set(tanpaResep.id, tanpaResep)
  sama(
    periksaKetersediaan([{ menuId: tanpaResep.id, jumlah: 5 }], mapUji, bahanMap, stok).length,
    0,
    'Menu tanpa resep tidak memicu kekurangan',
  )
  cek(
    menuTanpaResep([{ menuId: tanpaResep.id, jumlah: 5 }], mapUji).includes(tanpaResep.nama),
    'Menu tanpa resep terdeteksi',
  )
  cek(
    menuTanpaResep([{ menuId: contoh.id, jumlah: 1 }], mapUji).length === 0,
    'Menu dengan resep tidak ditandai tanpa resep',
  )

  // Permintaan tepat sebesar stok dianggap cukup (batas tidak boleh negatif).
  const bahanPembatas = rincian
    .slice()
    .sort((a, b) => a.tersedia / a.dibutuhkan - b.tersedia / b.dibutuhkan)[0]
  const jumlahPas = Math.floor(bahanPembatas.tersedia / (bahanPembatas.dibutuhkan || 1))
  if (jumlahPas > 0) {
    const pas = rincianKebutuhan(
      [{ menuId: contoh.id, jumlah: jumlahPas }],
      menuMap,
      bahanMap,
      stok,
    )
    cek(pas.every((r) => r.cukup), `Permintaan tepat stok (${jumlahPas} porsi) dianggap cukup`)
  }

  // menuMap tidak dipakai untuk validasi menu terarsip di helper; cukup pastikan tipe aman.
  const arsip = db.menu.filter((m) => m.arsip).length
  cek(arsip === 0, 'Seed tidak punya menu terarsip')
}

function ujiMigrasi(): void {
  const penggunaLama = {
    id: 'usr_lama',
    username: 'lama',
    nama: 'Pemilik Lama',
    role: 'admin' as const,
    passwordHash: 'hash',
    salt: 'salt',
    aktif: true,
    createdAt: '2024-02-01T03:00:00.000Z',
  }

  const bahanLama: Bahan = {
    id: 'bhn_lama',
    nama: 'Bahan Khusus Toko',
    kategori: 'Lainnya',
    satuan: 'pcs',
    stokMin: 1,
    arsip: false,
    createdAt: '2024-02-01T03:00:00.000Z',
  }

  const menuLama: Menu = {
    id: 'mnu_lama',
    nama: 'Menu Lama',
    kategori: 'Kopi & Minuman',
    harga: 15000,
    resep: [],
    resepEstimasi: false,
    arsip: false,
    createdAt: '2024-02-01T03:00:00.000Z',
  }

  const mutasiLama: Mutasi[] = [
    {
      id: 'mut_lama_1',
      bahanId: 'bhn_lama',
      tipe: 'masuk',
      jumlah: 5,
      hargaSatuan: 10000,
      tanggal: '2024-02-02T03:00:00.000Z',
      userId: penggunaLama.id,
      userName: penggunaLama.nama,
      createdAt: '2024-02-02T03:00:00.000Z',
    },
    {
      id: 'mut_lama_2',
      bahanId: 'bhn_lama',
      tipe: 'keluar',
      jumlah: 2,
      tanggal: '2024-02-03T03:00:00.000Z',
      userId: penggunaLama.id,
      userName: penggunaLama.nama,
      createdAt: '2024-02-03T03:00:00.000Z',
    },
  ]

  const dbV1 = {
    version: 1,
    users: [penggunaLama],
    bahan: [bahanLama],
    mutasi: mutasiLama,
    menu: [menuLama],
    penjualan: [
      {
        id: 'pj_lama',
        nomor: 'PJ-LAMA-001',
        tanggal: '2024-02-04T03:00:00.000Z',
        items: [{ menuId: 'mnu_lama', nama: '', jumlah: 2 }],
        omzet: 30000,
        hpp: 10000,
        laba: 20000,
        stokTerpotong: false,
        userId: penggunaLama.id,
        userName: penggunaLama.nama,
        createdAt: '2024-02-04T03:00:00.000Z',
      },
    ],
    pengaturan: {
      namaKedai: 'Kedai Lama',
      tagline: 'Tagline Lama',
      alamat: 'Alamat Lama',
      telepon: '0812-0000-0000',
      kota: 'Cirebon',
      tanggalBerdiri: '2023-01-01',
      halalId: 'HALAL-LAMA',
      instagram: 'lama',
      tiktok: 'lama',
      mapsUrl: 'https://maps.example',
      gofoodUrl: '',
      grabfoodUrl: '',
      situsUrl: '',
      jamOperasional: PENGATURAN_RESMI.jamOperasional,
      kategoriBahan: ['Lainnya'],
      satuanBahan: ['pcs'],
    },
    log: [
      {
        id: 'log_lama',
        at: '2024-02-04T03:00:00.000Z',
        userId: penggunaLama.id,
        userName: penggunaLama.nama,
        aksi: 'Aksi lama',
        detail: 'Detail lama',
      },
    ],
  } as unknown as DB

  const hasil = normalisasiDB(dbV1)
  sama(hasil.version, 2, 'Migrasi menaikkan versi ke 2')
  sama(hasil.users.length, 1, 'Migrasi mempertahankan pengguna lama')
  sama(hasil.users[0].id, 'usr_lama', 'ID pengguna lama tetap')
  cek(hasil.bahan.some((b) => b.id === 'bhn_lama'), 'Migrasi mempertahankan bahan lama')
  cek(hasil.menu.some((m) => m.id === 'mnu_lama'), 'Migrasi mempertahankan menu lama')
  sama(hasil.bahan.length, 1 + daftarBahanV2().length, 'Bahan katalog v2 ditambahkan')
  sama(hasil.menu.length, 1 + daftarMenuAwal().length, 'Menu katalog v2 ditambahkan')
  sama(hasil.mutasi.filter((m) => m.id.startsWith('mut_lama')).length, 2, 'Mutasi lama utuh')
  cek(
    hasil.mutasi.filter((m) => m.id.startsWith('mut_migrasi_')).length ===
      daftarBahanV2().length,
    'Stok awal migrasi hanya untuk bahan baru',
  )
  cek(
    hasil.mutasi.filter((m) => m.bahanId === 'bhn_lama').length === 2,
    'Bahan lama tidak menerima stok migrasi ganda',
  )

  const stok = hitungStok(hasil.bahan, hasil.mutasi)
  dekat(stok.get('bhn_lama')!.stok, 3, 'Stok bahan lama tetap 5 − 2 = 3')
  const arabika = hasil.mutasi
    .filter((m) => m.bahanId === 'bhn_arabika')
    .reduce((t, m) => t + (m.tipe === 'masuk' ? m.jumlah : -m.jumlah), 0)
  dekat(arabika, 8, 'Bahan baru mendapat stok awal dari pembelian seed (8 kg)')

  cek(hasil.penjualan[0].items[0].nama === 'Menu Lama', 'Snapshot nama item lama dilengkapi')
  cek(!('omzet' in hasil.penjualan[0]), 'Kolom omzet warisan dibuang pada migrasi stok-only')
  sama(hasil.pengaturan.namaKedai, 'Kedai Lama', 'Nama kedai lama dipertahankan')
  sama(hasil.pengaturan.halalId, 'HALAL-LAMA', 'Identitas halal lama dipertahankan')
  cek(
    !('telepon' in (hasil.pengaturan as unknown as Record<string, unknown>)),
    'Telepon lama dibuang dari pengaturan',
  )
  cek(hasil.pengaturan.jamOperasional.jumat.buka === false, 'Jam operasional default terisi')
  cek(hasil.pengaturan.kategoriMenu.length > 0, 'Kategori menu v2 terisi')

  // Idempoten: migrasi kedua tidak menggandakan katalog/mutasi.
  const lagi = normalisasiDB(hasil)
  sama(lagi.bahan.length, hasil.bahan.length, 'Migrasi kedua tidak menggandakan bahan')
  sama(lagi.menu.length, hasil.menu.length, 'Migrasi kedua tidak menggandakan menu')
  sama(lagi.mutasi.length, hasil.mutasi.length, 'Migrasi kedua tidak menggandakan mutasi')
}

function ujiStatusWib(): void {
  const jadwal = PENGATURAN_RESMI.jamOperasional

  const seninPagi = statusBukaSekarang(jadwal, new Date('2026-11-02T03:00:00.000Z')) // 10.00 WIB
  cek(seninPagi.buka, 'Senin 10.00 WIB dianggap buka')

  const seninDini = statusBukaSekarang(jadwal, new Date('2026-11-02T00:30:00.000Z')) // 07.30 WIB
  cek(!seninDini.buka, 'Senin 07.30 WIB dianggap tutup')
  cek(seninDini.keterangan.includes('09.00'), 'Keterangan menampilkan jam buka 09.00')

  const jumat = statusBukaSekarang(jadwal, new Date('2026-11-06T05:00:00.000Z')) // 12.00 WIB
  cek(!jumat.buka, 'Jumat 12.00 WIB dianggap tutup')
  cek(jumat.keterangan.includes('besok'), 'Keterangan Jumat mengarahkan ke buka besok')
  cek(jumat.keterangan.includes('09.00'), 'Keterangan Jumat menampilkan jam buka berikutnya')

  const sabtuDini = statusBukaSekarang(jadwal, new Date('2026-11-06T17:30:00.000Z')) // Sabtu 00.30 WIB
  cek(!sabtuDini.buka, 'Sabtu 00.30 WIB dianggap tutup')
  cek(sabtuDini.keterangan.includes('09.00'), 'Keterangan menampilkan buka 09.00')

  const seninMalam = statusBukaSekarang(jadwal, new Date('2026-11-02T16:30:00.000Z')) // 23.30 WIB
  cek(seninMalam.buka, 'Senin 23.30 WIB masih buka')
  cek(seninMalam.keterangan.includes('Tutup dalam'), 'Keterangan menyebut sisa waktu tutup')

  // Zona waktu perangkat tidak boleh mengubah hasil (fungsi memakai Asia/Jakarta).
  const malam = statusBukaSekarang(jadwal, new Date('2026-11-02T23:00:00.000Z')) // Selasa 06.00 WIB
  cek(!malam.buka, 'Perhitungan memakai WIB, bukan UTC perangkat')
}

async function main(): Promise<void> {
  ujiKatalog()
  const db = await ujiSeed()
  ujiValidasi(db)
  ujiMigrasi()
  ujiStatusWib()

  if (gagal.length > 0) {
    console.error(`\n✗ ${gagal.length} dari ${jumlahCek} cek GAGAL:`)
    for (const g of gagal) console.error(`  - ${g}`)
    process.exit(1)
  }
  console.log(`\n✓ QA selesai: ${jumlahCek} cek lulus.`)
}

main().catch((error) => {
  console.error('QA error tak terduga:', error)
  process.exit(1)
})
