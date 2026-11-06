import type { Bahan, Mutasi, Penjualan, StokInfo } from '../types'

const bulatkan = (n: number) => Math.round(n * 1000) / 1000

export function hitungStok(bahan: Bahan[], mutasi: Mutasi[]): Map<string, StokInfo> {
  const peta = new Map<string, StokInfo>()

  for (const b of bahan) {
    peta.set(b.id, {
      bahanId: b.id,
      stok: 0,
      totalMasuk: 0,
      totalKeluar: 0,
      status: b.stokMin > 0 ? 'habis' : 'aman',
    })
  }

  for (const m of mutasi) {
    const info = peta.get(m.bahanId)
    if (!info) continue

    if (m.tipe === 'masuk') {
      info.stok += m.jumlah
      info.totalMasuk += m.jumlah
    } else {
      info.stok -= m.jumlah
      info.totalKeluar += m.jumlah
    }
  }

  for (const b of bahan) {
    const info = peta.get(b.id)!
    info.stok = bulatkan(info.stok)
    info.totalMasuk = bulatkan(info.totalMasuk)
    info.totalKeluar = bulatkan(info.totalKeluar)
    info.status = info.stok <= 0 ? 'habis' : info.stok <= b.stokMin ? 'menipis' : 'aman'
  }

  return peta
}

export interface BarisLaporan {
  bahan: Bahan
  stokAwal: number
  masuk: number
  keluar: number
  stokAkhir: number
}

/**
 * Hitung ringkasan stok per bahan pada rentang [mulai, selesai].
 * stokAwal = akumulasi seluruh mutasi sebelum `mulai`.
 */
export function ringkasanPeriode(
  bahan: Bahan[],
  mutasi: Mutasi[],
  mulai: Date,
  selesai: Date,
): BarisLaporan[] {
  const awal = new Map<string, number>()
  const masuk = new Map<string, number>()
  const keluar = new Map<string, number>()

  for (const m of mutasi) {
    const t = new Date(m.tanggal).getTime()
    if (Number.isNaN(t)) continue

    if (t < mulai.getTime()) {
      awal.set(
        m.bahanId,
        (awal.get(m.bahanId) ?? 0) + (m.tipe === 'masuk' ? m.jumlah : -m.jumlah),
      )
    } else if (t <= selesai.getTime()) {
      if (m.tipe === 'masuk') {
        masuk.set(m.bahanId, (masuk.get(m.bahanId) ?? 0) + m.jumlah)
      } else {
        keluar.set(m.bahanId, (keluar.get(m.bahanId) ?? 0) + m.jumlah)
      }
    }
  }

  return bahan.map((b) => {
    const stokAwal = bulatkan(awal.get(b.id) ?? 0)
    const jumlahMasuk = bulatkan(masuk.get(b.id) ?? 0)
    const jumlahKeluar = bulatkan(keluar.get(b.id) ?? 0)

    return {
      bahan: b,
      stokAwal,
      masuk: jumlahMasuk,
      keluar: jumlahKeluar,
      stokAkhir: bulatkan(stokAwal + jumlahMasuk - jumlahKeluar),
    }
  })
}

/** Jumlah aktivitas mutasi per hari selama `jumlahHari` terakhir. */
export function aktivitasHarian(
  mutasi: Mutasi[],
  jumlahHari = 7,
): { label: string; tanggal: Date; total: number }[] {
  return hitungHarian(
    mutasi.map((m) => m.tanggal),
    jumlahHari,
  )
}

/** Jumlah item terjual per hari selama `jumlahHari` terakhir. */
export function penjualanHarian(
  penjualan: Penjualan[],
  jumlahHari = 7,
): { label: string; tanggal: Date; total: number }[] {
  return hitungHarian(
    penjualan.map((p) => ({
      tanggal: p.tanggal,
      bobot: p.items.reduce((total, item) => total + item.jumlah, 0),
    })),
    jumlahHari,
  )
}

function hitungHarian(
  data: (string | { tanggal: string; bobot: number })[],
  jumlahHari: number,
): { label: string; tanggal: Date; total: number }[] {
  const hasil: { label: string; tanggal: Date; total: number }[] = []
  const hariIni = new Date()
  hariIni.setHours(0, 0, 0, 0)

  for (let i = jumlahHari - 1; i >= 0; i--) {
    const d = new Date(hariIni)
    d.setDate(d.getDate() - i)
    hasil.push({
      label: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][d.getDay()],
      tanggal: d,
      total: 0,
    })
  }

  const peta = new Map(hasil.map((h) => [h.tanggal.getTime(), h]))
  for (const item of data) {
    const teks = typeof item === 'string' ? item : item.tanggal
    const bobot = typeof item === 'string' ? 1 : item.bobot
    const d = new Date(teks)
    if (Number.isNaN(d.getTime())) continue
    d.setHours(0, 0, 0, 0)
    const baris = peta.get(d.getTime())
    if (baris) baris.total += bobot
  }

  return hasil
}
