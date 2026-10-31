import type { Bahan, Mutasi, StokInfo } from '../types'

const bulatkan = (n: number) => Math.round(n * 1000) / 1000

export function hitungStok(bahan: Bahan[], mutasi: Mutasi[]): Map<string, StokInfo> {
  const peta = new Map<string, StokInfo>()

  for (const b of bahan) {
    peta.set(b.id, {
      bahanId: b.id,
      stok: 0,
      totalMasuk: 0,
      totalKeluar: 0,
      hargaRataRata: 0,
      nilai: 0,
      status: b.stokMin > 0 ? 'habis' : 'aman',
    })
  }

  const nilaiMasuk = new Map<string, number>()
  const qtyMasukBerharga = new Map<string, number>()

  for (const m of mutasi) {
    const info = peta.get(m.bahanId)
    if (!info) continue

    if (m.tipe === 'masuk') {
      info.stok += m.jumlah
      info.totalMasuk += m.jumlah
      if (m.hargaSatuan && m.hargaSatuan > 0) {
        nilaiMasuk.set(
          m.bahanId,
          (nilaiMasuk.get(m.bahanId) ?? 0) + m.jumlah * m.hargaSatuan,
        )
        qtyMasukBerharga.set(
          m.bahanId,
          (qtyMasukBerharga.get(m.bahanId) ?? 0) + m.jumlah,
        )
      }
    } else {
      info.stok -= m.jumlah
      info.totalKeluar += m.jumlah
    }
  }

  for (const b of bahan) {
    const info = peta.get(b.id)!
    const qty = qtyMasukBerharga.get(b.id) ?? 0
    info.hargaRataRata = qty > 0 ? (nilaiMasuk.get(b.id) ?? 0) / qty : 0
    info.stok = bulatkan(info.stok)
    info.totalMasuk = bulatkan(info.totalMasuk)
    info.totalKeluar = bulatkan(info.totalKeluar)
    info.nilai = Math.max(0, info.stok) * info.hargaRataRata
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
  hargaRataRata: number
  nilaiMasuk: number
  nilaiKeluar: number
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
  semuaStok: Map<string, StokInfo>,
): BarisLaporan[] {
  const awal = new Map<string, number>()
  const masuk = new Map<string, number>()
  const keluar = new Map<string, number>()
  const nilaiMasuk = new Map<string, number>()

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
        if (m.hargaSatuan && m.hargaSatuan > 0) {
          nilaiMasuk.set(
            m.bahanId,
            (nilaiMasuk.get(m.bahanId) ?? 0) + m.jumlah * m.hargaSatuan,
          )
        }
      } else {
        keluar.set(m.bahanId, (keluar.get(m.bahanId) ?? 0) + m.jumlah)
      }
    }
  }

  return bahan.map((b) => {
    const info = semuaStok.get(b.id)
    const stokAwal = bulatkan(awal.get(b.id) ?? 0)
    const jumlahMasuk = bulatkan(masuk.get(b.id) ?? 0)
    const jumlahKeluar = bulatkan(keluar.get(b.id) ?? 0)
    const harga = info?.hargaRataRata ?? 0
    const totalNilaiMasuk = nilaiMasuk.get(b.id)

    return {
      bahan: b,
      stokAwal,
      masuk: jumlahMasuk,
      keluar: jumlahKeluar,
      stokAkhir: bulatkan(stokAwal + jumlahMasuk - jumlahKeluar),
      hargaRataRata: harga,
      nilaiMasuk:
        totalNilaiMasuk !== undefined ? totalNilaiMasuk : jumlahMasuk * harga,
      nilaiKeluar: jumlahKeluar * harga,
    }
  })
}

/** Nilai pemakaian (keluar) per hari selama `jumlahHari` terakhir, dalam rupiah. */
export function pemakaianHarian(
  mutasi: Mutasi[],
  stok: Map<string, StokInfo>,
  jumlahHari = 7,
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
  for (const m of mutasi) {
    if (m.tipe !== 'keluar') continue
    const d = new Date(m.tanggal)
    if (Number.isNaN(d.getTime())) continue
    d.setHours(0, 0, 0, 0)
    const baris = peta.get(d.getTime())
    if (baris) {
      baris.total += m.jumlah * (stok.get(m.bahanId)?.hargaRataRata ?? 0)
    }
  }

  return hasil
}
