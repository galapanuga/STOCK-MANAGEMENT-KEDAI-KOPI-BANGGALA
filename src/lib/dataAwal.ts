import type {
  Bahan,
  Menu,
  Mutasi,
  Pengaturan,
  Penjualan,
  User,
} from '../types'
import { JAM_OPERASIONAL_RESMI } from './operasional'

export const KATEGORI_BAHAN_BAWAAN = [
  'Biji Kopi',
  'Dairy',
  'Sirup & Gula',
  'Bubuk',
  'Bahan Makanan',
  'Frozen & Camilan',
  'Sachet',
  'Kemasan',
  'Lainnya',
]

export const SATUAN_BAHAN_BAWAAN = [
  'kg',
  'gram',
  'liter',
  'ml',
  'pcs',
  'botol',
  'pack',
  'butir',
  'porsi',
]

export const KATEGORI_MENU_BAWAAN = [
  'Kopi & Minuman',
  'Makanan Hangat',
  'Camilan / Snack',
  'Minuman Sachet',
  'Tambahan',
]

export const PENGATURAN_RESMI: Pengaturan = {
  namaKedai: 'Kedai Kopi Banggala',
  tagline: 'Sedikit, tapi terus berjalan.',
  alamat:
    'Jl. Serbaguna, Jadimulya, Kec. Gunungjati, Kabupaten Cirebon, Jawa Barat 45151',
  kota: 'Gunungjati, Cirebon',
  tanggalBerdiri: '2024-01-15',
  halalId: 'ID31410022479980525',
  instagram: 'kedaikopibanggala',
  tiktok: 'kopibanggala',
  mapsUrl:
    'https://maps.google.com/?q=Kedai+Kopi+Banggala+Gunungjati+Cirebon',
  gofoodUrl:
    'https://gofood.co.id/cirebon/restaurant/kedai-kopi-banggala-kel-jadimulya-kec-gunungjati-9048bf6a-2cc8-4167-807d-259a52373f27',
  grabfoodUrl:
    'https://food.grab.com/id/en/restaurant/kedai-kopi-banggala-jadimulya-delivery/6-C7NHDGBWGBU3T6?sourceID=20260624_202846_5e816fccf79f4ff783c2f6569262d197_MEXMPS',
  situsUrl: 'https://kedaikopibanggala.vercel.app',
  jamOperasional: JAM_OPERASIONAL_RESMI,
  kategoriBahan: KATEGORI_BAHAN_BAWAAN,
  satuanBahan: SATUAN_BAHAN_BAWAAN,
  kategoriMenu: KATEGORI_MENU_BAWAAN,
}

export function waktuRelatif(hariLalu: number, jam: number, menit = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - hariLalu)
  d.setHours(jam, menit, 0, 0)
  return d.toISOString()
}

/**
 * Seluruh daftar bahan kedai v2 (minuman + makanan dapur + sachet + kemasan).
 */
export function daftarBahanV2(): Bahan[] {
  const t = waktuRelatif(30, 8, 0)
  return [
    // Kopi & Minuman
    { id: 'bhn_arabika', nama: 'Biji Kopi Arabika', kategori: 'Biji Kopi', satuan: 'kg', stokMin: 2, arsip: false, createdAt: t },
    { id: 'bhn_robusta', nama: 'Biji Kopi Robusta', kategori: 'Biji Kopi', satuan: 'kg', stokMin: 2, arsip: false, createdAt: t },
    { id: 'bhn_susu', nama: 'Susu UHT Full Cream', kategori: 'Dairy', satuan: 'liter', stokMin: 6, arsip: false, createdAt: t },
    { id: 'bhn_oat', nama: 'Susu Oat', kategori: 'Dairy', satuan: 'liter', stokMin: 2, arsip: false, createdAt: t },
    { id: 'bhn_gulaaren', nama: 'Gula Aren Cair', kategori: 'Sirup & Gula', satuan: 'liter', stokMin: 3, arsip: false, createdAt: t },
    { id: 'bhn_gulapasir', nama: 'Gula Pasir', kategori: 'Sirup & Gula', satuan: 'kg', stokMin: 5, arsip: false, createdAt: t },
    { id: 'bhn_vanila', nama: 'Sirup Vanila', kategori: 'Sirup & Gula', satuan: 'botol', stokMin: 2, arsip: false, createdAt: t },
    { id: 'bhn_matcha', nama: 'Bubuk Matcha', kategori: 'Bubuk', satuan: 'gram', stokMin: 300, arsip: false, createdAt: t },
    { id: 'bhn_cokelat', nama: 'Bubuk Cokelat', kategori: 'Bubuk', satuan: 'gram', stokMin: 500, arsip: false, createdAt: t },
    { id: 'bhn_teh', nama: 'Teh Celup', kategori: 'Lainnya', satuan: 'pcs', stokMin: 50, arsip: false, createdAt: t },
    { id: 'bhn_es', nama: 'Es Batu Kristal', kategori: 'Lainnya', satuan: 'kg', stokMin: 10, arsip: false, createdAt: t },
    { id: 'bhn_airmineral', nama: 'Air Mineral Botol 600ml', kategori: 'Lainnya', satuan: 'pcs', stokMin: 24, arsip: false, createdAt: t },

    // Dapur & Makanan Hangat
    { id: 'bhn_beras', nama: 'Beras Pulen', kategori: 'Bahan Makanan', satuan: 'kg', stokMin: 5, arsip: false, createdAt: t },
    { id: 'bhn_telur', nama: 'Telur Ayam', kategori: 'Bahan Makanan', satuan: 'butir', stokMin: 30, arsip: false, createdAt: t },
    { id: 'bhn_mie', nama: 'Indomie (Goreng/Rebus)', kategori: 'Bahan Makanan', satuan: 'pcs', stokMin: 30, arsip: false, createdAt: t },
    { id: 'bhn_ayam', nama: 'Daging Ayam Potong', kategori: 'Bahan Makanan', satuan: 'kg', stokMin: 4, arsip: false, createdAt: t },
    { id: 'bhn_minyak', nama: 'Minyak Goreng', kategori: 'Bahan Makanan', satuan: 'liter', stokMin: 4, arsip: false, createdAt: t },
    { id: 'bhn_kecap', nama: 'Kecap Manis', kategori: 'Bahan Makanan', satuan: 'botol', stokMin: 2, arsip: false, createdAt: t },
    { id: 'bhn_sambal', nama: 'Bumbu & Sambal Kedai', kategori: 'Bahan Makanan', satuan: 'porsi', stokMin: 30, arsip: false, createdAt: t },
    { id: 'bhn_lalapan', nama: 'Sayur & Lalapan Segar', kategori: 'Bahan Makanan', satuan: 'porsi', stokMin: 20, arsip: false, createdAt: t },

    // Camilan & Frozen
    { id: 'bhn_kentang', nama: 'Kentang Goreng Frozen', kategori: 'Frozen & Camilan', satuan: 'kg', stokMin: 3, arsip: false, createdAt: t },
    { id: 'bhn_sempol', nama: 'Sempol Ayam', kategori: 'Frozen & Camilan', satuan: 'pcs', stokMin: 30, arsip: false, createdAt: t },
    { id: 'bhn_otakotak', nama: 'Otak-Otak Ikan', kategori: 'Frozen & Camilan', satuan: 'pcs', stokMin: 30, arsip: false, createdAt: t },
    { id: 'bhn_kebab', nama: 'Kebab Mini Frozen', kategori: 'Frozen & Camilan', satuan: 'pcs', stokMin: 15, arsip: false, createdAt: t },
    { id: 'bhn_roticane', nama: 'Roti Cane', kategori: 'Frozen & Camilan', satuan: 'pcs', stokMin: 15, arsip: false, createdAt: t },
    { id: 'bhn_rotimaryam', nama: 'Roti Maryam', kategori: 'Frozen & Camilan', satuan: 'pcs', stokMin: 15, arsip: false, createdAt: t },
    { id: 'bhn_skm', nama: 'Susu Kental Manis', kategori: 'Sirup & Gula', satuan: 'botol', stokMin: 3, arsip: false, createdAt: t },
    { id: 'bhn_sosis', nama: 'Sosis Sapi/Ayam', kategori: 'Frozen & Camilan', satuan: 'pcs', stokMin: 20, arsip: false, createdAt: t },
    { id: 'bhn_nugget', nama: 'Nugget Ayam', kategori: 'Frozen & Camilan', satuan: 'pcs', stokMin: 30, arsip: false, createdAt: t },

    // Minuman Sachet
    { id: 'bhn_sachet_nutrisari', nama: 'Nutrisari Sachet', kategori: 'Sachet', satuan: 'pcs', stokMin: 20, arsip: false, createdAt: t },
    { id: 'bhn_sachet_goodday', nama: 'Goodday Sachet', kategori: 'Sachet', satuan: 'pcs', stokMin: 20, arsip: false, createdAt: t },
    { id: 'bhn_sachet_indocafe', nama: 'Indocafe Sachet', kategori: 'Sachet', satuan: 'pcs', stokMin: 20, arsip: false, createdAt: t },
    { id: 'bhn_sachet_maxtea', nama: 'Max Tea Sachet', kategori: 'Sachet', satuan: 'pcs', stokMin: 15, arsip: false, createdAt: t },
    { id: 'bhn_sachet_dancow', nama: 'Dancow Sachet', kategori: 'Sachet', satuan: 'pcs', stokMin: 15, arsip: false, createdAt: t },

    // Kemasan
    { id: 'bhn_cup12', nama: 'Cup 12 oz', kategori: 'Kemasan', satuan: 'pcs', stokMin: 100, arsip: false, createdAt: t },
    { id: 'bhn_cup16', nama: 'Cup 16 oz', kategori: 'Kemasan', satuan: 'pcs', stokMin: 100, arsip: false, createdAt: t },
    { id: 'bhn_lid', nama: 'Lid Cup', kategori: 'Kemasan', satuan: 'pcs', stokMin: 150, arsip: false, createdAt: t },
    { id: 'bhn_sedotan', nama: 'Sedotan Kertas', kategori: 'Kemasan', satuan: 'pcs', stokMin: 100, arsip: false, createdAt: t },
  ]
}

/**
 * 28 Menu dari web profil Kedai Kopi Banggala + resep estimasi.
 * Kategori: Kopi & Minuman, Makanan Hangat, Camilan / Snack, Minuman Sachet, Tambahan.
 */
export function daftarMenuAwal(): Menu[] {
  const t = waktuRelatif(20, 8, 0)
  return [
    // 1-8: Kopi & Minuman
    {
      id: 'mnu_teh',
      nama: 'Teh',
      kategori: 'Kopi & Minuman',
      deskripsi: 'Teh untuk dinikmati hangat maupun dingin.',
      resep: [
        { bahanId: 'bhn_teh', jumlah: 1 },
        { bahanId: 'bhn_gulapasir', jumlah: 0.015 },
        { bahanId: 'bhn_cup12', jumlah: 1 },
        { bahanId: 'bhn_lid', jumlah: 1 },
        { bahanId: 'bhn_sedotan', jumlah: 1 },
        { bahanId: 'bhn_es', jumlah: 0.1 },
      ],
      resepEstimasi: true,
      arsip: false,
      createdAt: t,
    },
    {
      id: 'mnu_airmineral',
      nama: 'Air Mineral',
      kategori: 'Kopi & Minuman',
      deskripsi: 'Air mineral kemasan botol 600ml.',
      resep: [{ bahanId: 'bhn_airmineral', jumlah: 1 }],
      resepEstimasi: false,
      arsip: false,
      createdAt: t,
    },
    {
      id: 'mnu_kopiracik',
      nama: 'Kopi Racik',
      kategori: 'Kopi & Minuman',
      deskripsi: 'Kopi racik seduh khas kedai.',
      resep: [
        { bahanId: 'bhn_robusta', jumlah: 0.015 },
        { bahanId: 'bhn_gulapasir', jumlah: 0.015 },
        { bahanId: 'bhn_cup12', jumlah: 1 },
        { bahanId: 'bhn_lid', jumlah: 1 },
      ],
      resepEstimasi: true,
      arsip: false,
      createdAt: t,
    },
    {
      id: 'mnu_kopisusugaoel',
      nama: 'Kopi Susu Gaoel',
      kategori: 'Kopi & Minuman',
      deskripsi: 'Kopi susu andalan khas Kedai Kopi Banggala.',
      resep: [
        { bahanId: 'bhn_arabika', jumlah: 0.018 },
        { bahanId: 'bhn_susu', jumlah: 0.12 },
        { bahanId: 'bhn_gulaaren', jumlah: 0.025 },
        { bahanId: 'bhn_es', jumlah: 0.15 },
        { bahanId: 'bhn_cup16', jumlah: 1 },
        { bahanId: 'bhn_lid', jumlah: 1 },
        { bahanId: 'bhn_sedotan', jumlah: 1 },
      ],
      resepEstimasi: true,
      arsip: false,
      createdAt: t,
    },
    {
      id: 'mnu_kopisusukedai',
      nama: 'Kopi Susu Kedai',
      kategori: 'Kopi & Minuman',
      deskripsi: 'Kopi susu racikan kedai yang creamy dan mantap.',
      resep: [
        { bahanId: 'bhn_robusta', jumlah: 0.012 },
        { bahanId: 'bhn_arabika', jumlah: 0.008 },
        { bahanId: 'bhn_susu', jumlah: 0.14 },
        { bahanId: 'bhn_gulaaren', jumlah: 0.02 },
        { bahanId: 'bhn_es', jumlah: 0.15 },
        { bahanId: 'bhn_cup16', jumlah: 1 },
        { bahanId: 'bhn_lid', jumlah: 1 },
        { bahanId: 'bhn_sedotan', jumlah: 1 },
      ],
      resepEstimasi: true,
      arsip: false,
      createdAt: t,
    },
    {
      id: 'mnu_soklat',
      nama: 'Soklat',
      kategori: 'Kopi & Minuman',
      deskripsi: 'Minuman cokelat kental dan legit.',
      resep: [
        { bahanId: 'bhn_cokelat', jumlah: 25 },
        { bahanId: 'bhn_susu', jumlah: 0.15 },
        { bahanId: 'bhn_gulapasir', jumlah: 0.015 },
        { bahanId: 'bhn_es', jumlah: 0.15 },
        { bahanId: 'bhn_cup16', jumlah: 1 },
        { bahanId: 'bhn_lid', jumlah: 1 },
        { bahanId: 'bhn_sedotan', jumlah: 1 },
      ],
      resepEstimasi: true,
      arsip: false,
      createdAt: t,
    },
    {
      id: 'mnu_matchacih',
      nama: 'Matchacih',
      kategori: 'Kopi & Minuman',
      deskripsi: 'Minuman matcha lembut dengan aroma wangi khas.',
      resep: [
        { bahanId: 'bhn_matcha', jumlah: 12 },
        { bahanId: 'bhn_susu', jumlah: 0.15 },
        { bahanId: 'bhn_gulapasir', jumlah: 0.02 },
        { bahanId: 'bhn_es', jumlah: 0.15 },
        { bahanId: 'bhn_cup16', jumlah: 1 },
        { bahanId: 'bhn_lid', jumlah: 1 },
        { bahanId: 'bhn_sedotan', jumlah: 1 },
      ],
      resepEstimasi: true,
      arsip: false,
      createdAt: t,
    },
    {
      id: 'mnu_americano',
      nama: 'Americano',
      kategori: 'Kopi & Minuman',
      deskripsi: 'Espresso double shot dipadu air segar, hangat atau dingin.',
      resep: [
        { bahanId: 'bhn_arabika', jumlah: 0.02 },
        { bahanId: 'bhn_es', jumlah: 0.15 },
        { bahanId: 'bhn_cup16', jumlah: 1 },
        { bahanId: 'bhn_lid', jumlah: 1 },
        { bahanId: 'bhn_sedotan', jumlah: 1 },
      ],
      resepEstimasi: true,
      arsip: false,
      createdAt: t,
    },

    // 9-13: Makanan Hangat (Biar Galaper)
    {
      id: 'mnu_indomie',
      nama: 'Indomie Goreng / Rebus',
      kategori: 'Makanan Hangat',
      deskripsi: 'Indomie goreng atau rebus racikan dapur kedai.',
      resep: [
        { bahanId: 'bhn_mie', jumlah: 1 },
        { bahanId: 'bhn_minyak', jumlah: 0.01 },
      ],
      resepEstimasi: true,
      arsip: false,
      createdAt: t,
    },
    {
      id: 'mnu_telurbarendo',
      nama: 'Nasi Telur Barendo',
      kategori: 'Makanan Hangat',
      deskripsi: 'Nasi hangat disajikan dengan telur dadar barendo kribo gurih.',
      resep: [
        { bahanId: 'bhn_beras', jumlah: 0.12 },
        { bahanId: 'bhn_telur', jumlah: 2 },
        { bahanId: 'bhn_minyak', jumlah: 0.04 },
        { bahanId: 'bhn_sambal', jumlah: 1 },
        { bahanId: 'bhn_lalapan', jumlah: 1 },
      ],
      resepEstimasi: true,
      arsip: false,
      createdAt: t,
    },
    {
      id: 'mnu_mienyemek',
      nama: 'Mie Nyemek',
      kategori: 'Makanan Hangat',
      deskripsi: 'Mie nyemek kuah kental gurih dengan telur dan bumbu racik kedai.',
      resep: [
        { bahanId: 'bhn_mie', jumlah: 1 },
        { bahanId: 'bhn_telur', jumlah: 1 },
        { bahanId: 'bhn_kecap', jumlah: 0.02 },
        { bahanId: 'bhn_minyak', jumlah: 0.015 },
        { bahanId: 'bhn_lalapan', jumlah: 1 },
      ],
      resepEstimasi: true,
      arsip: false,
      createdAt: t,
    },
    {
      id: 'mnu_ayampenyet',
      nama: 'Nasi Ayam Penyet',
      kategori: 'Makanan Hangat',
      deskripsi: 'Nasi hangat dengan ayam goreng gurih dan sambal penyet pedas nikmat.',
      resep: [
        { bahanId: 'bhn_beras', jumlah: 0.12 },
        { bahanId: 'bhn_ayam', jumlah: 0.2 },
        { bahanId: 'bhn_minyak', jumlah: 0.05 },
        { bahanId: 'bhn_sambal', jumlah: 1 },
        { bahanId: 'bhn_lalapan', jumlah: 1 },
      ],
      resepEstimasi: true,
      arsip: false,
      createdAt: t,
    },
    {
      id: 'mnu_bisakenyang',
      nama: 'Bisa Kenyang',
      kategori: 'Makanan Hangat',
      deskripsi: 'Porsi komplit nasi, ayam goreng, telur dadar, lalapan & sambal mantap.',
      resep: [
        { bahanId: 'bhn_beras', jumlah: 0.15 },
        { bahanId: 'bhn_ayam', jumlah: 0.2 },
        { bahanId: 'bhn_telur', jumlah: 1 },
        { bahanId: 'bhn_minyak', jumlah: 0.06 },
        { bahanId: 'bhn_sambal', jumlah: 1 },
        { bahanId: 'bhn_lalapan', jumlah: 1 },
      ],
      resepEstimasi: true,
      arsip: false,
      createdAt: t,
    },

    // 14-19: Camilan / Snack (Biar Gabosen)
    {
      id: 'mnu_kentang',
      nama: 'Kentang Goreng',
      kategori: 'Camilan / Snack',
      deskripsi: 'French fries renyah dengan taburan bumbu gurih.',
      resep: [
        { bahanId: 'bhn_kentang', jumlah: 0.15 },
        { bahanId: 'bhn_minyak', jumlah: 0.03 },
      ],
      resepEstimasi: true,
      arsip: false,
      createdAt: t,
    },
    {
      id: 'mnu_sempol',
      nama: 'Sempol Ayam',
      kategori: 'Camilan / Snack',
      deskripsi: 'Sempol ayam goreng renyah disajikan dengan saus cocolan.',
      resep: [
        { bahanId: 'bhn_sempol', jumlah: 5 },
        { bahanId: 'bhn_telur', jumlah: 0.5 },
        { bahanId: 'bhn_minyak', jumlah: 0.03 },
      ],
      resepEstimasi: true,
      arsip: false,
      createdAt: t,
    },
    {
      id: 'mnu_otakotak',
      nama: 'Otak-Otak',
      kategori: 'Camilan / Snack',
      deskripsi: 'Otak-otak ikan goreng gurih.',
      resep: [
        { bahanId: 'bhn_otakotak', jumlah: 6 },
        { bahanId: 'bhn_minyak', jumlah: 0.03 },
      ],
      resepEstimasi: true,
      arsip: false,
      createdAt: t,
    },
    {
      id: 'mnu_kebab',
      nama: 'Kebab Mini',
      kategori: 'Camilan / Snack',
      deskripsi: 'Kebab mini isi daging olahan dan saus spesial.',
      resep: [
        { bahanId: 'bhn_kebab', jumlah: 2 },
        { bahanId: 'bhn_minyak', jumlah: 0.01 },
      ],
      resepEstimasi: true,
      arsip: false,
      createdAt: t,
    },
    {
      id: 'mnu_canesusu',
      nama: 'Cane Susu',
      kategori: 'Camilan / Snack',
      deskripsi: 'Roti cane panggang disiram susu kental manis lezat.',
      resep: [
        { bahanId: 'bhn_roticane', jumlah: 1 },
        { bahanId: 'bhn_skm', jumlah: 0.05 },
      ],
      resepEstimasi: true,
      arsip: false,
      createdAt: t,
    },
    {
      id: 'mnu_rotimaryam',
      nama: 'Roti Maryam',
      kategori: 'Camilan / Snack',
      deskripsi: 'Roti Maryam panggang empuk dengan aroma gurih.',
      resep: [
        { bahanId: 'bhn_rotimaryam', jumlah: 1 },
        { bahanId: 'bhn_minyak', jumlah: 0.01 },
      ],
      resepEstimasi: true,
      arsip: false,
      createdAt: t,
    },

    // 20-24: Minuman Sachet
    {
      id: 'mnu_nutrisari',
      nama: 'Nutrisari',
      kategori: 'Minuman Sachet',
      deskripsi: 'Minuman sari buah Nutrisari segar dingin/hangat.',
      resep: [
        { bahanId: 'bhn_sachet_nutrisari', jumlah: 1 },
        { bahanId: 'bhn_es', jumlah: 0.1 },
        { bahanId: 'bhn_cup12', jumlah: 1 },
        { bahanId: 'bhn_lid', jumlah: 1 },
        { bahanId: 'bhn_sedotan', jumlah: 1 },
      ],
      resepEstimasi: true,
      arsip: false,
      createdAt: t,
    },
    {
      id: 'mnu_goodday',
      nama: 'Goodday',
      kategori: 'Minuman Sachet',
      deskripsi: 'Kopi sachet Goodday seduh dingin/hangat.',
      resep: [
        { bahanId: 'bhn_sachet_goodday', jumlah: 1 },
        { bahanId: 'bhn_es', jumlah: 0.1 },
        { bahanId: 'bhn_cup12', jumlah: 1 },
        { bahanId: 'bhn_lid', jumlah: 1 },
        { bahanId: 'bhn_sedotan', jumlah: 1 },
      ],
      resepEstimasi: true,
      arsip: false,
      createdAt: t,
    },
    {
      id: 'mnu_indocafe',
      nama: 'Indocafe',
      kategori: 'Minuman Sachet',
      deskripsi: 'Kopi sachet Indocafe Coffeemix seduh.',
      resep: [
        { bahanId: 'bhn_sachet_indocafe', jumlah: 1 },
        { bahanId: 'bhn_es', jumlah: 0.1 },
        { bahanId: 'bhn_cup12', jumlah: 1 },
        { bahanId: 'bhn_lid', jumlah: 1 },
        { bahanId: 'bhn_sedotan', jumlah: 1 },
      ],
      resepEstimasi: true,
      arsip: false,
      createdAt: t,
    },
    {
      id: 'mnu_maxtea',
      nama: 'Max Tea',
      kategori: 'Minuman Sachet',
      deskripsi: 'Max Tea Tarik creamy khas Malaysia seduh.',
      resep: [
        { bahanId: 'bhn_sachet_maxtea', jumlah: 1 },
        { bahanId: 'bhn_es', jumlah: 0.1 },
        { bahanId: 'bhn_cup12', jumlah: 1 },
        { bahanId: 'bhn_lid', jumlah: 1 },
        { bahanId: 'bhn_sedotan', jumlah: 1 },
      ],
      resepEstimasi: true,
      arsip: false,
      createdAt: t,
    },
    {
      id: 'mnu_dancow',
      nama: 'Dancow',
      kategori: 'Minuman Sachet',
      deskripsi: 'Susu bubuk Dancow hangat atau dingin.',
      resep: [
        { bahanId: 'bhn_sachet_dancow', jumlah: 1 },
        { bahanId: 'bhn_es', jumlah: 0.1 },
        { bahanId: 'bhn_cup12', jumlah: 1 },
        { bahanId: 'bhn_lid', jumlah: 1 },
        { bahanId: 'bhn_sedotan', jumlah: 1 },
      ],
      resepEstimasi: true,
      arsip: false,
      createdAt: t,
    },

    // 25-28: Tambahan (Additional)
    {
      id: 'mnu_add_nasi',
      nama: 'Nasi',
      kategori: 'Tambahan',
      deskripsi: 'Tambahan satu porsi nasi putih pulen.',
      resep: [{ bahanId: 'bhn_beras', jumlah: 0.12 }],
      resepEstimasi: true,
      arsip: false,
      createdAt: t,
    },
    {
      id: 'mnu_add_telur',
      nama: 'Telur',
      kategori: 'Tambahan',
      deskripsi: 'Tambahan satu butir telur (ceplok / dadar).',
      resep: [
        { bahanId: 'bhn_telur', jumlah: 1 },
        { bahanId: 'bhn_minyak', jumlah: 0.015 },
      ],
      resepEstimasi: true,
      arsip: false,
      createdAt: t,
    },
    {
      id: 'mnu_add_sosis',
      nama: 'Sosis',
      kategori: 'Tambahan',
      deskripsi: 'Tambahan sosis goreng gurih.',
      resep: [
        { bahanId: 'bhn_sosis', jumlah: 1 },
        { bahanId: 'bhn_minyak', jumlah: 0.01 },
      ],
      resepEstimasi: true,
      arsip: false,
      createdAt: t,
    },
    {
      id: 'mnu_add_nugget',
      nama: 'Nugget',
      kategori: 'Tambahan',
      deskripsi: 'Tambahan nugget ayam goreng 3 pcs.',
      resep: [
        { bahanId: 'bhn_nugget', jumlah: 3 },
        { bahanId: 'bhn_minyak', jumlah: 0.015 },
      ],
      resepEstimasi: true,
      arsip: false,
      createdAt: t,
    },
  ]
}

/**
 * Daftar pembelian bahan awal untuk data demo v2.
 */
export function mutasiPembelianV2(user: User): Mutasi[] {
  const pembelian = [
    // Biji & Dairy & Sirup
    { bahanId: 'bhn_arabika', jumlah: 8, ket: 'Pembelian Biji Arabika', hari: 14, jam: 9 },
    { bahanId: 'bhn_robusta', jumlah: 6, ket: 'Pembelian Biji Robusta', hari: 14, jam: 9 },
    { bahanId: 'bhn_susu', jumlah: 24, ket: 'Pembelian Susu UHT Diamond', hari: 14, jam: 9 },
    { bahanId: 'bhn_oat', jumlah: 4, ket: 'Pembelian Susu Oat', hari: 13, jam: 9 },
    { bahanId: 'bhn_gulaaren', jumlah: 8, ket: 'Pembelian Gula Aren Cair', hari: 13, jam: 10 },
    { bahanId: 'bhn_gulapasir', jumlah: 20, ket: 'Pembelian Gula Pasir 20kg', hari: 13, jam: 10 },
    { bahanId: 'bhn_vanila', jumlah: 4, ket: 'Pembelian Sirup Vanila', hari: 13, jam: 10 },
    { bahanId: 'bhn_matcha', jumlah: 1000, ket: 'Bubuk Matcha Premium', hari: 13, jam: 10 },
    { bahanId: 'bhn_cokelat', jumlah: 2000, ket: 'Bubuk Cokelat Murni', hari: 12, jam: 11 },
    { bahanId: 'bhn_teh', jumlah: 200, ket: 'Teh Celup Melati', hari: 10, jam: 9 },
    { bahanId: 'bhn_es', jumlah: 50, ket: 'Es Batu Kristal Higienis', hari: 11, jam: 9 },
    { bahanId: 'bhn_airmineral', jumlah: 48, ket: 'Air Mineral 2 Dus', hari: 12, jam: 10 },

    // Dapur & Makanan Hangat
    { bahanId: 'bhn_beras', jumlah: 25, ket: 'Beras Pulen 25kg', hari: 12, jam: 9 },
    { bahanId: 'bhn_telur', jumlah: 90, ket: 'Telur Ayam 90 butir', hari: 12, jam: 9 },
    { bahanId: 'bhn_mie', jumlah: 80, ket: 'Indomie 2 Dus', hari: 12, jam: 9 },
    { bahanId: 'bhn_ayam', jumlah: 10, ket: 'Ayam Potong Segar 10kg', hari: 12, jam: 9 },
    { bahanId: 'bhn_minyak', jumlah: 12, ket: 'Minyak Goreng 12L', hari: 12, jam: 9 },
    { bahanId: 'bhn_kecap', jumlah: 6, ket: 'Kecap Manis Botol Besar', hari: 12, jam: 9 },
    { bahanId: 'bhn_sambal', jumlah: 80, ket: 'Bumbu & Sambal Racikan', hari: 12, jam: 9 },
    { bahanId: 'bhn_lalapan', jumlah: 60, ket: 'Sayur & Lalapan Pasar', hari: 12, jam: 9 },

    // Camilan & Frozen
    { bahanId: 'bhn_kentang', jumlah: 8, ket: 'Kentang Frozen 8kg', hari: 11, jam: 10 },
    { bahanId: 'bhn_sempol', jumlah: 80, ket: 'Sempol Ayam 80 tusuk', hari: 11, jam: 10 },
    { bahanId: 'bhn_otakotak', jumlah: 80, ket: 'Otak-Otak Ikan', hari: 11, jam: 10 },
    { bahanId: 'bhn_kebab', jumlah: 30, ket: 'Kebab Mini Frozen 30 pcs', hari: 11, jam: 10 },
    { bahanId: 'bhn_roticane', jumlah: 30, ket: 'Roti Cane Frozen 30 pcs', hari: 11, jam: 10 },
    { bahanId: 'bhn_rotimaryam', jumlah: 30, ket: 'Roti Maryam Frozen 30 pcs', hari: 11, jam: 10 },
    { bahanId: 'bhn_skm', jumlah: 8, ket: 'Susu Kental Manis 8 botol', hari: 11, jam: 10 },
    { bahanId: 'bhn_sosis', jumlah: 50, ket: 'Sosis Ayam/Sapi 50 pcs', hari: 11, jam: 10 },
    { bahanId: 'bhn_nugget', jumlah: 90, ket: 'Nugget Ayam 90 pcs', hari: 11, jam: 10 },

    // Sachet
    { bahanId: 'bhn_sachet_nutrisari', jumlah: 50, ket: 'Nutrisari Jeruk 5 renceng', hari: 10, jam: 9 },
    { bahanId: 'bhn_sachet_goodday', jumlah: 50, ket: 'Goodday Mocacinno 5 renceng', hari: 10, jam: 9 },
    { bahanId: 'bhn_sachet_indocafe', jumlah: 50, ket: 'Indocafe Coffeemix 5 renceng', hari: 10, jam: 9 },
    { bahanId: 'bhn_sachet_maxtea', jumlah: 40, ket: 'Max Tea Tarik 4 renceng', hari: 10, jam: 9 },
    { bahanId: 'bhn_sachet_dancow', jumlah: 40, ket: 'Dancow Sachet 4 renceng', hari: 10, jam: 9 },

    // Kemasan
    { bahanId: 'bhn_cup12', jumlah: 1000, ket: 'Cup 12 oz 1000 pcs', hari: 12, jam: 11 },
    { bahanId: 'bhn_cup16', jumlah: 1000, ket: 'Cup 16 oz 1000 pcs', hari: 12, jam: 11 },
    { bahanId: 'bhn_lid', jumlah: 1000, ket: 'Lid Cup 1000 pcs', hari: 12, jam: 11 },
    { bahanId: 'bhn_sedotan', jumlah: 500, ket: 'Sedotan Kertas 500 pcs', hari: 11, jam: 9 },

    // Restock susu
    { bahanId: 'bhn_susu', jumlah: 12, ket: 'Restock Susu Diamond', hari: 5, jam: 10 },
  ]

  return pembelian.map((p, idx) => {
    const tanggal = waktuRelatif(p.hari, p.jam, idx % 60)
    return {
      id: `mut_beli_${idx + 1}`,
      bahanId: p.bahanId,
      tipe: 'masuk',
      jumlah: p.jumlah,
      keterangan: p.ket,
      tanggal,
      userId: user.id,
      userName: user.nama,
      createdAt: tanggal,
    }
  })
}

/**
 * Mutasi pemakaian harian historis (non-penjualan / sampling / operasional harian).
 */
export function mutasiPemakaianHistoris(user: User): Mutasi[] {
  const pemakaian = [
    { bahanId: 'bhn_arabika', jumlah: 1, hari: 8, jam: 14, ket: 'Produksi cold brew' },
    { bahanId: 'bhn_arabika', jumlah: 0.8, hari: 4, jam: 14, ket: 'Espresso quality check' },
    { bahanId: 'bhn_robusta', jumlah: 0.5, hari: 6, jam: 13, ket: 'Seduh internal' },
    { bahanId: 'bhn_susu', jumlah: 2, hari: 7, jam: 15, ket: 'Trial latte art' },
    { bahanId: 'bhn_es', jumlah: 2, hari: 2, jam: 10, ket: 'Mencair saat listrik turun', alasan: 'Rusak' },
    { bahanId: 'bhn_telur', jumlah: 2, hari: 3, jam: 11, ket: 'Telur retak saat diterima', alasan: 'Rusak' },
  ]

  return pemakaian.map((p, idx) => {
    const tanggal = waktuRelatif(p.hari, p.jam, 0)
    return {
      id: `mut_pakai_${idx + 1}`,
      bahanId: p.bahanId,
      tipe: 'keluar',
      jumlah: p.jumlah,
      alasan: p.alasan ?? 'Pemakaian',
      keterangan: p.ket,
      tanggal,
      userId: user.id,
      userName: user.nama,
      createdAt: tanggal,
    }
  })
}

/**
 * 3 Penjualan contoh yang merepresentasikan transaksi nyata.
 * Penjualan 1 & 2 hari ini; Penjualan 3 kemarin.
 */
export function daftarPenjualanAwal(user: User): {
  penjualan: Penjualan[]
  mutasiPenjualan: Mutasi[]
} {
  const menuMap = new Map(daftarMenuAwal().map((m) => [m.id, m]))

  interface SeedPJ {
    nomor: string
    hariLalu: number
    jam: number
    menit: number
    catatan?: string
    items: { menuId: string; jumlah: number }[]
  }

  const seedPJ: SeedPJ[] = [
    {
      nomor: 'PJ-20261031-001',
      hariLalu: 0,
      jam: 10,
      menit: 25,
      catatan: 'Dine-in meja 3',
      items: [
        { menuId: 'mnu_kopisusugaoel', jumlah: 2 },
        { menuId: 'mnu_telurbarendo', jumlah: 1 },
        { menuId: 'mnu_kentang', jumlah: 1 },
      ],
    },
    {
      nomor: 'PJ-20261031-002',
      hariLalu: 0,
      jam: 14,
      menit: 10,
      catatan: 'Takeaway GrabFood',
      items: [
        { menuId: 'mnu_kopisusukedai', jumlah: 2 },
        { menuId: 'mnu_matchacih', jumlah: 1 },
        { menuId: 'mnu_ayampenyet', jumlah: 2 },
      ],
    },
    {
      nomor: 'PJ-20261030-001',
      hariLalu: 1,
      jam: 16,
      menit: 45,
      catatan: 'Dine-in area outdoor',
      items: [
        { menuId: 'mnu_kopisusugaoel', jumlah: 3 },
        { menuId: 'mnu_mienyemek', jumlah: 2 },
        { menuId: 'mnu_sempol', jumlah: 1 },
        { menuId: 'mnu_teh', jumlah: 1 },
      ],
    },
  ]

  const daftarPJ: Penjualan[] = []
  const mutasiPJ: Mutasi[] = []
  let mutCounter = 1

  for (const s of seedPJ) {
    const tanggal = waktuRelatif(s.hariLalu, s.jam, s.menit)
    const id = `pj_seed_${daftarPJ.length + 1}`

    const items = s.items.map((it) => {
      const menu = menuMap.get(it.menuId)!
      return {
        menuId: it.menuId,
        nama: menu.nama,
        jumlah: it.jumlah,
      }
    })

    daftarPJ.push({
      id,
      nomor: s.nomor,
      tanggal,
      items,
      catatan: s.catatan,
      stokTerpotong: true,
      userId: user.id,
      userName: user.nama,
      createdAt: tanggal,
    })

    // Agregasi mutasi stok keluar untuk transaksi ini
    const kebutuhan = new Map<string, number>()
    for (const it of s.items) {
      const menu = menuMap.get(it.menuId)
      if (!menu) continue
      for (const r of menu.resep) {
        kebutuhan.set(
          r.bahanId,
          (kebutuhan.get(r.bahanId) ?? 0) + r.jumlah * it.jumlah,
        )
      }
    }

    for (const [bahanId, qty] of kebutuhan.entries()) {
      mutasiPJ.push({
        id: `mut_pj_${mutCounter++}`,
        bahanId,
        tipe: 'keluar',
        jumlah: Math.round(qty * 1000) / 1000,
        alasan: 'Penjualan',
        keterangan: `Penjualan ${s.nomor}`,
        tanggal,
        userId: user.id,
        userName: user.nama,
        createdAt: tanggal,
        penjualanId: id,
      })
    }
  }

  return { penjualan: daftarPJ, mutasiPenjualan: mutasiPJ }
}