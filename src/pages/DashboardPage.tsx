import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import {
  IconAlert,
  IconArrowDown,
  IconArrowRight,
  IconArrowUp,
  IconBox,
  IconCalendar,
  IconCoffee,
  IconPlus,
  IconSwap,
  IconTrend,
  IconWallet,
} from '../components/Icons'
import { BadgeStok, BadgeTipe } from '../components/ui/Badge'
import { EmptyState, SectionHeader } from '../components/ui/Field'
import {
  formatAngka,
  formatRupiah,
  formatRupiahRingkas,
  formatTanggal,
  formatTanggalPanjang,
  formatWaktu,
  kunciTanggal,
  sapaan,
} from '../lib/format'
import { pemakaianHarian } from '../lib/stock'

export function DashboardPage() {
  const { user } = useAuth()
  const { db, stok, bahanMap } = useData()

  const bahanAktif = useMemo(() => db.bahan.filter((b) => !b.arsip), [db.bahan])

  const nilaiTotal = useMemo(
    () =>
      bahanAktif.reduce((total, b) => total + (stok.get(b.id)?.nilai ?? 0), 0),
    [bahanAktif, stok],
  )

  const perluRestock = useMemo(() => {
    return bahanAktif
      .filter((b) => (stok.get(b.id)?.status ?? 'aman') !== 'aman')
      .sort((a, b) => {
        const sa = stok.get(a.id)!
        const sb = stok.get(b.id)!
        if (sa.status !== sb.status) return sa.status === 'habis' ? -1 : 1
        return sa.stok / Math.max(a.stokMin, 1) - sb.stok / Math.max(b.stokMin, 1)
      })
  }, [bahanAktif, stok])

  const jumlahHabis = perluRestock.filter(
    (b) => stok.get(b.id)?.status === 'habis',
  ).length

  const hariIni = kunciTanggal(new Date())
  const mutasiHariIni = useMemo(
    () => db.mutasi.filter((m) => kunciTanggal(m.tanggal) === hariIni),
    [db.mutasi, hariIni],
  )

  const grafik = useMemo(
    () => pemakaianHarian(db.mutasi, stok, 7),
    [db.mutasi, stok],
  )
  const maxGrafik = Math.max(...grafik.map((g) => g.total), 1)

  const terbaru = useMemo(
    () =>
      [...db.mutasi]
        .sort(
          (a, b) =>
            new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime(),
        )
        .slice(0, 8),
    [db.mutasi],
  )

  const kategoriUnik = new Set(bahanAktif.map((b) => b.kategori)).size
  const totalMasukHariIni = mutasiHariIni.filter((m) => m.tipe === 'masuk').length
  const totalKeluarHariIni = mutasiHariIni.filter((m) => m.tipe === 'keluar').length

  return (
    <div className="animate-rise">
      <div className="mb-6 flex flex-col gap-4 rounded-3xl bg-espresso p-5 text-cream sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="hidden size-12 shrink-0 place-items-center rounded-2xl bg-caramel/20 text-caramel sm:grid">
            <IconCoffee className="size-6" />
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-latte/55 uppercase">
              {formatTanggalPanjang(new Date())}
            </p>
            <h1 className="mt-1 font-display text-[26px] leading-tight font-bold text-white sm:text-3xl">
              {sapaan()}, {user?.nama.split(' ')[0] ?? 'Kawan'}!
            </h1>
            <p className="mt-1.5 max-w-lg text-xs leading-relaxed text-latte/65 sm:text-sm">
              {perluRestock.length > 0
                ? `Ada ${perluRestock.length} bahan yang perlu diperhatikan stoknya hari ini.`
                : 'Semua stok bahan dalam kondisi aman. Seduhan siap mengalir.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/mutasi?form=masuk"
            className="btn btn-caramel w-full sm:w-auto"
          >
            <IconArrowDown className="size-4" />
            Catat Stok Masuk
          </Link>
          <Link
            to="/mutasi?form=keluar"
            className="btn border border-white/20 bg-white/5 text-cream hover:bg-white/10"
          >
            <IconArrowUp className="size-4" />
            Stok Keluar
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Bahan Aktif"
          value={String(bahanAktif.length)}
          keterangan={`${kategoriUnik} kategori bahan`}
          ikon={<IconBox className="size-5" />}
          warna="bg-sand text-coffee"
        />
        <StatCard
          label="Nilai Persediaan"
          value={formatRupiahRingkas(nilaiTotal)}
          keterangan={formatRupiah(nilaiTotal)}
          ikon={<IconWallet className="size-5" />}
          warna="bg-success-soft text-success"
        />
        <StatCard
          label="Perlu Restock"
          value={String(perluRestock.length)}
          keterangan={
            jumlahHabis > 0 ? `${jumlahHabis} bahan habis` : 'Di bawah stok minimum'
          }
          ikon={<IconAlert className="size-5" />}
          warna={
            perluRestock.length > 0
              ? 'bg-danger-soft text-danger'
              : 'bg-success-soft text-success'
          }
        />
        <StatCard
          label="Mutasi Hari Ini"
          value={String(mutasiHariIni.length)}
          keterangan={`${totalMasukHariIni} masuk · ${totalKeluarHariIni} keluar`}
          ikon={<IconSwap className="size-5" />}
          warna="bg-latte/50 text-coffee"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <section className="card xl:col-span-7">
          <SectionHeader
            judul="Nilai Pemakaian 7 Hari"
            deskripsi="Estimasi nilai bahan yang terpakai per hari"
            aksi={
              <Link
                to="/laporan"
                className="inline-flex items-center gap-1 text-xs font-semibold text-caramel hover:underline"
              >
                Laporan <IconArrowRight className="size-3.5" />
              </Link>
            }
          />
          <div className="px-5 pt-5 pb-4">
            <div className="mb-4 flex items-center gap-2 text-[11px] text-muted">
              <IconTrend className="size-3.5 text-caramel" />
              Puncak minggu ini{' '}
              <span className="font-semibold text-coffee">
                {formatRupiah(Math.max(...grafik.map((g) => g.total)))}
              </span>
            </div>
            <div className="flex h-44 items-end gap-2 sm:gap-3">
              {grafik.map((g, i) => {
                const tinggi = g.total > 0 ? Math.max((g.total / maxGrafik) * 100, 5) : 2
                const hariIniBar = i === grafik.length - 1
                return (
                  <div
                    key={g.tanggal.toISOString()}
                    className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5"
                  >
                    <span className="text-[9px] font-semibold text-muted opacity-0 transition-opacity group-hover:opacity-100">
                      {formatRupiahRingkas(g.total)}
                    </span>
                    <div
                      className={`w-full max-w-9 rounded-t-md transition-all ${
                        hariIniBar
                          ? 'bg-espresso'
                          : 'bg-latte group-hover:bg-caramel'
                      }`}
                      style={{ height: `${tinggi}%` }}
                      title={`${formatTanggal(g.tanggal)} · ${formatRupiah(g.total)}`}
                    />
                    <span
                      className={`text-[10px] font-medium ${
                        hariIniBar ? 'font-bold text-espresso' : 'text-muted'
                      }`}
                    >
                      {g.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="card xl:col-span-5">
          <SectionHeader
            judul="Perlu Restock"
            deskripsi="Bahan pada atau di bawah stok minimum"
            aksi={
              <Link
                to="/bahan?status=menipis"
                className="text-xs font-semibold text-caramel hover:underline"
              >
                Semua bahan
              </Link>
            }
          />
          {perluRestock.length === 0 ? (
            <EmptyState
              judul="Stok aman semua"
              pesan="Tidak ada bahan yang perlu segera dibeli."
              ikon={<IconCoffee className="size-5" />}
            />
          ) : (
            <div className="divide-y divide-line/70 px-5">
              {perluRestock.slice(0, 5).map((b) => {
                const info = stok.get(b.id)!
                return (
                  <div
                    key={b.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {b.nama}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        Sisa {formatAngka(info.stok)} {b.satuan} · min{' '}
                        {formatAngka(b.stokMin)} {b.satuan}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <BadgeStok status={info.status} />
                      <Link
                        to={`/mutasi?form=masuk&bahan=${b.id}`}
                        className="btn btn-outline btn-sm"
                        title={`Catat stok masuk ${b.nama}`}
                      >
                        <IconPlus className="size-3.5" />
                        Masuk
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <section className="card mt-4">
        <SectionHeader
          judul="Aktivitas Terbaru"
          deskripsi="Mutasi stok yang terakhir dicatat"
          aksi={
            <Link
              to="/mutasi"
              className="inline-flex items-center gap-1 text-xs font-semibold text-caramel hover:underline"
            >
              Lihat semua <IconArrowRight className="size-3.5" />
            </Link>
          }
        />
        {terbaru.length === 0 ? (
          <EmptyState
            judul="Belum ada mutasi"
            pesan="Mulai dengan mencatat stok masuk pertama."
            ikon={<IconCalendar className="size-5" />}
            aksi={
              <Link to="/mutasi?form=masuk" className="btn btn-primary btn-sm">
                Catat stok masuk
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-banggala min-w-[620px]">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Bahan</th>
                  <th>Tipe</th>
                  <th className="text-right">Jumlah</th>
                  <th>Oleh</th>
                </tr>
              </thead>
              <tbody>
                {terbaru.map((m) => {
                  const bahan = bahanMap.get(m.bahanId)
                  return (
                    <tr key={m.id}>
                      <td className="whitespace-nowrap text-xs text-muted">
                        {formatTanggal(m.tanggal)}
                        <span className="ml-1 text-muted/70">
                          {formatWaktu(m.tanggal)}
                        </span>
                      </td>
                      <td className="font-medium text-ink">
                        {bahan?.nama ?? 'Bahan terhapus'}
                      </td>
                      <td>
                        <BadgeTipe tipe={m.tipe} />
                      </td>
                      <td
                        className={`text-right font-semibold whitespace-nowrap ${
                          m.tipe === 'masuk' ? 'text-success' : 'text-coffee'
                        }`}
                      >
                        {m.tipe === 'masuk' ? '+' : '−'}
                        {formatAngka(m.jumlah)}{' '}
                        <span className="text-[11px] font-normal text-muted">
                          {bahan?.satuan}
                        </span>
                      </td>
                      <td className="text-xs text-muted">{m.userName}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  keterangan,
  ikon,
  warna,
}: {
  label: string
  value: string
  keterangan: string
  ikon: ReactNode
  warna: string
}) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-bold tracking-[0.14em] text-muted uppercase">
          {label}
        </p>
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${warna}`}>
          {ikon}
        </span>
      </div>
      <p className="stat-value mt-2">{value}</p>
      <p className="mt-1 truncate text-[11px] text-muted">{keterangan}</p>
    </div>
  )
}
