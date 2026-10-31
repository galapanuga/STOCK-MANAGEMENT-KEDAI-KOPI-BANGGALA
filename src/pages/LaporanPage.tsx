import { useMemo, useState, type ReactNode } from 'react'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import type { Mutasi } from '../types'
import {
  IconArrowDown,
  IconArrowUp,
  IconCalendar,
  IconChart,
  IconDownload,
  IconInfo,
  IconPrint,
  IconWallet,
} from '../components/Icons'
import { EmptyState, PageHeader } from '../components/ui/Field'
import { BadgeTipe } from '../components/ui/Badge'
import { unduhCSV } from '../lib/csv'
import {
  akhirBulan,
  akhirHari,
  awalBulan,
  awalHari,
  formatAngka,
  formatRupiah,
  formatTanggal,
  formatTanggalPanjang,
  formatTanggalWaktu,
  formatWaktu,
  keTanggalInput,
  tambahHari,
} from '../lib/format'
import { ringkasanPeriode } from '../lib/stock'

type Preset = 'hari-ini' | '7hari' | 'bulan-ini' | 'bulan-lalu' | 'kustom'

const PRESETS: { id: Preset; label: string }[] = [
  { id: 'hari-ini', label: 'Hari ini' },
  { id: '7hari', label: '7 hari' },
  { id: 'bulan-ini', label: 'Bulan ini' },
  { id: 'bulan-lalu', label: 'Bulan lalu' },
  { id: 'kustom', label: 'Kustom' },
]

export function LaporanPage() {
  const { db, stok, bahanMap } = useData()
  const toast = useToast()
  const hariIni = new Date()

  const [preset, setPreset] = useState<Preset>('bulan-ini')
  const [dari, setDari] = useState(keTanggalInput(awalBulan(hariIni)))
  const [sampai, setSampai] = useState(keTanggalInput(hariIni))
  const [hanyaAktivitas, setHanyaAktivitas] = useState(false)

  const pilihPreset = (p: Preset) => {
    setPreset(p)
    const sekarang = new Date()
    if (p === 'hari-ini') {
      setDari(keTanggalInput(sekarang))
      setSampai(keTanggalInput(sekarang))
    } else if (p === '7hari') {
      setDari(keTanggalInput(tambahHari(sekarang, -6)))
      setSampai(keTanggalInput(sekarang))
    } else if (p === 'bulan-ini') {
      setDari(keTanggalInput(awalBulan(sekarang)))
      setSampai(keTanggalInput(sekarang))
    } else if (p === 'bulan-lalu') {
      const lalu = new Date(sekarang.getFullYear(), sekarang.getMonth() - 1, 15)
      setDari(keTanggalInput(awalBulan(lalu)))
      setSampai(keTanggalInput(akhirBulan(lalu)))
    }
  }

  const periodeValid =
    Boolean(dari) &&
    Boolean(sampai) &&
    new Date(`${dari}T00:00:00`).getTime() <= new Date(`${sampai}T23:59:59`).getTime()

  const mulai = useMemo(
    () => (dari ? awalHari(new Date(`${dari}T00:00:00`)) : new Date()),
    [dari],
  )
  const selesai = useMemo(
    () => (sampai ? akhirHari(new Date(`${sampai}T00:00:00`)) : new Date()),
    [sampai],
  )

  const semuaBaris = useMemo(
    () => ringkasanPeriode(db.bahan, db.mutasi, mulai, selesai, stok),
    [db.bahan, db.mutasi, mulai, selesai, stok],
  )

  const baris = useMemo(
    () =>
      semuaBaris
        .filter((r) => !r.bahan.arsip)
        .filter((r) => (hanyaAktivitas ? r.masuk > 0 || r.keluar > 0 : true))
        .sort((a, b) => a.bahan.nama.localeCompare(b.bahan.nama, 'id')),
    [hanyaAktivitas, semuaBaris],
  )

  const detail = useMemo(() => {
    const a = mulai.getTime()
    const b = selesai.getTime()
    return db.mutasi
      .filter((m) => {
        const t = new Date(m.tanggal).getTime()
        return t >= a && t <= b
      })
      .sort(
        (x, y) => new Date(y.tanggal).getTime() - new Date(x.tanggal).getTime(),
      )
  }, [db.mutasi, mulai, selesai])

  const totalMasuk = baris.reduce((t, r) => t + r.nilaiMasuk, 0)
  const totalKeluar = baris.reduce((t, r) => t + r.nilaiKeluar, 0)
  const nilaiAkhir = baris.reduce(
    (t, r) => t + Math.max(0, r.stokAkhir) * r.hargaRataRata,
    0,
  )

  const eksporRingkasan = () => {
    if (!periodeValid || baris.length === 0) {
      toast.error('Tidak ada data untuk diekspor.')
      return
    }
    unduhCSV(
      `Laporan-Stok-Banggala_${dari}_${sampai}.csv`,
      [
        'Bahan',
        'Kategori',
        'Satuan',
        'Stok Awal',
        'Masuk',
        'Keluar',
        'Stok Akhir',
        'Harga Rata-rata',
        'Nilai Masuk',
        'Nilai Keluar',
      ],
      baris.map((r) => [
        r.bahan.nama,
        r.bahan.kategori,
        r.bahan.satuan,
        r.stokAwal,
        r.masuk,
        r.keluar,
        r.stokAkhir,
        Math.round(r.hargaRataRata),
        Math.round(r.nilaiMasuk),
        Math.round(r.nilaiKeluar),
      ]),
    )
    toast.sukses('Ringkasan laporan berhasil diunduh.')
  }

  const eksporDetail = () => {
    if (!periodeValid || detail.length === 0) {
      toast.error('Tidak ada mutasi untuk diekspor.')
      return
    }
    unduhCSV(
      `Mutasi-Banggala_${dari}_${sampai}.csv`,
      [
        'Tanggal',
        'Bahan',
        'Satuan',
        'Tipe',
        'Jumlah',
        'Harga Satuan',
        'Nilai',
        'Alasan',
        'Keterangan',
        'Dicatat oleh',
      ],
      detail.map((m) => {
        const bahan = bahanMap.get(m.bahanId)
        const harga = m.hargaSatuan ?? stok.get(m.bahanId)?.hargaRataRata ?? 0
        return [
          formatTanggalWaktu(m.tanggal),
          bahan?.nama ?? '-',
          bahan?.satuan ?? '',
          m.tipe === 'masuk' ? 'Masuk' : 'Keluar',
          m.jumlah,
          Math.round(harga),
          Math.round(m.jumlah * harga),
          m.alasan ?? '',
          m.keterangan ?? '',
          m.userName,
        ]
      }),
    )
    toast.sukses('Detail mutasi berhasil diunduh.')
  }

  return (
    <div className="animate-rise">
      <div className="no-print">
        <PageHeader
          judul="Laporan Stok"
          deskripsi="Ringkasan pemakaian dan pergerakan stok bahan per periode."
          aksi={
            <>
              <button
                className="btn btn-outline"
                onClick={eksporRingkasan}
                disabled={!periodeValid || baris.length === 0}
              >
                <IconDownload className="size-4" />
                Export Ringkasan
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <IconPrint className="size-4" />
                Cetak
              </button>
            </>
          }
        />
      </div>

      <div className="card no-print mb-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => pilihPreset(p.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                preset === p.id
                  ? 'bg-espresso text-cream'
                  : 'border border-line bg-white text-mocha hover:bg-sand'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <label className="label" htmlFor="laporan-dari">
              Dari tanggal
            </label>
            <input
              id="laporan-dari"
              type="date"
              className="input"
              value={dari}
              onChange={(e) => {
                setDari(e.target.value)
                setPreset('kustom')
              }}
            />
          </div>
          <div>
            <label className="label" htmlFor="laporan-sampai">
              Sampai tanggal
            </label>
            <input
              id="laporan-sampai"
              type="date"
              className="input"
              value={sampai}
              onChange={(e) => {
                setSampai(e.target.value)
                setPreset('kustom')
              }}
            />
          </div>
          <label className="flex cursor-pointer items-end gap-2 pb-2 text-xs font-medium text-mocha sm:justify-self-end">
            <input
              type="checkbox"
              checked={hanyaAktivitas}
              onChange={(e) => setHanyaAktivitas(e.target.checked)}
              className="size-3.5 accent-espresso"
            />
            Hanya bahan dengan mutasi
          </label>
        </div>
        {!periodeValid && (
          <p className="mt-2 text-xs font-medium text-danger">
            Tanggal awal tidak boleh melebihi tanggal akhir.
          </p>
        )}
      </div>

      <div className="mb-5 hidden print:block">
        <h1 className="font-display text-2xl font-bold text-espresso">
          {db.pengaturan.namaKedai}
        </h1>
        <p className="text-xs text-muted">{db.pengaturan.alamat}</p>
        <p className="mt-3 text-sm font-semibold text-ink">
          Laporan Stok · {formatTanggal(mulai)} – {formatTanggal(selesai)}
        </p>
      </div>

      {!periodeValid ? (
        <div className="card">
          <EmptyState
            judul="Periode belum valid"
            pesan="Periksa kembali tanggal awal dan akhir laporan."
            ikon={<IconCalendar className="size-5" />}
          />
        </div>
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 print:grid-cols-4">
            <RingkasanCard
              label="Nilai Stok Akhir"
              nilai={formatRupiah(nilaiAkhir)}
              ket={`${baris.length} bahan · per ${formatTanggal(selesai)}`}
              ikon={<IconWallet className="size-5" />}
              warna="bg-sand text-coffee"
            />
            <RingkasanCard
              label="Nilai Stok Masuk"
              nilai={formatRupiah(totalMasuk)}
              ket="Sesuai harga beli tercatat"
              ikon={<IconArrowDown className="size-5" />}
              warna="bg-success-soft text-success"
            />
            <RingkasanCard
              label="Estimasi Nilai Keluar"
              nilai={formatRupiah(totalKeluar)}
              ket="Qty keluar × harga rata-rata"
              ikon={<IconArrowUp className="size-5" />}
              warna="bg-latte/50 text-coffee"
            />
            <RingkasanCard
              label="Transaksi"
              nilai={String(detail.length)}
              ket={`${detail.filter((m) => m.tipe === 'masuk').length} masuk · ${
                detail.filter((m) => m.tipe === 'keluar').length
              } keluar`}
              ikon={<IconChart className="size-5" />}
              warna="bg-warning-soft text-warning"
            />
          </div>

          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-espresso">
              Ringkasan per Bahan
            </h2>
            <p className="text-xs text-muted">
              {formatTanggal(mulai)} – {formatTanggal(selesai)}
            </p>
          </div>

          <div className="card overflow-hidden">
            {baris.length === 0 ? (
              <EmptyState
                judul="Belum ada data"
                pesan="Tidak ada bahan atau mutasi pada periode ini."
                ikon={<IconChart className="size-5" />}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="table-banggala min-w-[860px]">
                  <thead>
                    <tr>
                      <th>Bahan</th>
                      <th className="text-right">Stok Awal</th>
                      <th className="text-right">Masuk</th>
                      <th className="text-right">Keluar</th>
                      <th className="text-right">Stok Akhir</th>
                      <th className="text-right">Harga Rata-rata</th>
                      <th className="text-right">Nilai Keluar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {baris.map((r) => (
                      <tr key={r.bahan.id}>
                        <td>
                          <p className="font-semibold text-ink">{r.bahan.nama}</p>
                          <p className="text-[10px] text-muted">
                            {r.bahan.kategori} · {r.bahan.satuan}
                          </p>
                        </td>
                        <td className="text-right text-xs whitespace-nowrap text-mocha">
                          {formatAngka(r.stokAwal)}
                        </td>
                        <td className="text-right text-xs font-semibold whitespace-nowrap text-success">
                          {r.masuk > 0 ? `+${formatAngka(r.masuk)}` : '—'}
                        </td>
                        <td className="text-right text-xs font-semibold whitespace-nowrap text-coffee">
                          {r.keluar > 0 ? `−${formatAngka(r.keluar)}` : '—'}
                        </td>
                        <td className="text-right text-sm font-bold whitespace-nowrap text-ink">
                          {formatAngka(r.stokAkhir)}{' '}
                          <span className="text-[10px] font-normal text-muted">
                            {r.bahan.satuan}
                          </span>
                        </td>
                        <td className="text-right text-xs whitespace-nowrap text-mocha">
                          {formatRupiah(r.hargaRataRata)}
                        </td>
                        <td className="text-right text-xs font-semibold whitespace-nowrap text-ink">
                          {formatRupiah(r.nilaiKeluar)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-cream">
                      <td colSpan={6} className="px-4 py-3 text-right text-xs font-bold tracking-wide text-mocha uppercase">
                        Total nilai keluar
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold whitespace-nowrap text-espresso">
                        {formatRupiah(totalKeluar)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold text-espresso">
              Detail Mutasi
              <span className="ml-2 text-xs font-normal text-muted">
                {detail.length} transaksi
              </span>
            </h2>
            <button
              className="btn btn-outline btn-sm no-print"
              onClick={eksporDetail}
              disabled={detail.length === 0}
            >
              <IconDownload className="size-3.5" />
              Export Detail
            </button>
          </div>

          <div className="card mt-2 overflow-hidden">
            {detail.length === 0 ? (
              <EmptyState
                judul="Tidak ada mutasi"
                pesan="Belum ada pergerakan stok pada periode ini."
                ikon={<IconCalendar className="size-5" />}
              />
            ) : (
              <div className="scroll-thin max-h-[520px] overflow-auto print:max-h-none">
                <table className="table-banggala min-w-[760px]">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th>Waktu</th>
                      <th>Bahan</th>
                      <th>Tipe</th>
                      <th className="text-right">Jumlah</th>
                      <th className="text-right">Nilai</th>
                      <th>Keterangan</th>
                      <th>Oleh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.map((m: Mutasi) => {
                      const bahan = bahanMap.get(m.bahanId)
                      const harga =
                        m.hargaSatuan ?? stok.get(m.bahanId)?.hargaRataRata ?? 0
                      return (
                        <tr key={m.id}>
                          <td className="whitespace-nowrap text-xs text-muted">
                            {formatTanggal(m.tanggal)}{' '}
                            <span className="text-muted/70">
                              {formatWaktu(m.tanggal)}
                            </span>
                          </td>
                          <td className="font-medium whitespace-nowrap text-ink">
                            {bahan?.nama ?? '-'}
                          </td>
                          <td>
                            <BadgeTipe tipe={m.tipe} />
                          </td>
                          <td
                            className={`text-right text-xs font-semibold whitespace-nowrap ${
                              m.tipe === 'masuk' ? 'text-success' : 'text-coffee'
                            }`}
                          >
                            {m.tipe === 'masuk' ? '+' : '−'}
                            {formatAngka(m.jumlah)}{' '}
                            <span className="font-normal text-muted">
                              {bahan?.satuan}
                            </span>
                          </td>
                          <td className="text-right text-xs whitespace-nowrap text-ink">
                            {formatRupiah(m.jumlah * harga)}
                          </td>
                          <td className="max-w-56 truncate text-xs text-mocha">
                            {m.keterangan || '—'}
                          </td>
                          <td className="text-xs whitespace-nowrap text-muted">
                            {m.userName}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-muted">
            <IconInfo className="mt-0.5 size-3.5 shrink-0" />
            Nilai keluar dihitung sebagai estimasi memakai harga rata-rata
            pembelian per bahan. Stok akhir adalah akumulasi seluruh mutasi
            sampai tanggal akhir periode.
          </p>

          <div className="mt-6 hidden text-[10px] text-muted print:block">
            Dicetak {formatTanggalPanjang(new Date())} ·{' '}
            {db.pengaturan.namaKedai} · Banggala Stock
          </div>
        </>
      )}
    </div>
  )
}

function RingkasanCard({
  label,
  nilai,
  ket,
  ikon,
  warna,
}: {
  label: string
  nilai: string
  ket: string
  ikon: ReactNode
  warna: string
}) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold tracking-[0.14em] text-muted uppercase">
          {label}
        </p>
        <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${warna}`}>
          {ikon}
        </span>
      </div>
      <p className="mt-2 font-display text-xl font-bold text-espresso">{nilai}</p>
      <p className="mt-1 text-[10px] text-muted">{ket}</p>
    </div>
  )
}
