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
  IconReceipt,
  IconSwap,
  IconTrend,
} from '../components/Icons'
import { BadgeStok } from '../components/ui/Badge'
import { EmptyState, SectionHeader } from '../components/ui/Field'
import {
  formatAngka,
  formatTanggal,
  formatTanggalPanjang,
  formatWaktu,
  kunciTanggal,
  sapaan,
} from '../lib/format'
import { penjualanHarian } from '../lib/stock'
import { statusBukaSekarang } from '../lib/operasional'
import { totalItem } from '../lib/menu'

export function DashboardPage() {
  const { user } = useAuth()
  const { db, stok } = useData()

  const bahanAktif = useMemo(() => db.bahan.filter((b) => !b.arsip), [db.bahan])

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

  const penjualanHariIni = useMemo(
    () => db.penjualan.filter((p) => kunciTanggal(p.tanggal) === hariIni),
    [db.penjualan, hariIni],
  )

  const itemHariIni = useMemo(
    () => penjualanHariIni.reduce((total, p) => total + totalItem(p.items), 0),
    [penjualanHariIni],
  )

  const grafik = useMemo(() => penjualanHarian(db.penjualan, 7), [db.penjualan])
  const maxGrafik = Math.max(...grafik.map((g) => g.total), 1)
  const puncak = Math.max(...grafik.map((g) => g.total), 0)

  const terbaru = useMemo(
    () =>
      [...db.penjualan]
        .sort(
          (a, b) =>
            new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime(),
        )
        .slice(0, 6),
    [db.penjualan],
  )

  const kategoriUnik = new Set(bahanAktif.map((b) => b.kategori)).size
  const totalMasukHariIni = mutasiHariIni.filter((m) => m.tipe === 'masuk').length
  const totalKeluarHariIni = mutasiHariIni.filter((m) => m.tipe === 'keluar').length

  const status = useMemo(
    () => statusBukaSekarang(db.pengaturan.jamOperasional),
    [db.pengaturan.jamOperasional],
  )

  return (
    <div className="animate-rise">
      <div className="relative mb-6 flex flex-col gap-4 overflow-hidden rounded-3xl border border-gold/15 bg-[linear-gradient(125deg,#190e09_0%,#2a1810_68%,#40271b_100%)] p-5 text-cream shadow-[0_12px_32px_rgba(42,24,16,0.12)] sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="pointer-events-none absolute -top-24 right-12 size-64 rounded-full bg-gold/10 blur-3xl" />
        <div className="flex items-start gap-4">
          <div className="relative hidden size-12 shrink-0 place-items-center rounded-2xl border border-gold/15 bg-gold/10 text-gold sm:grid">
            <IconCoffee className="size-6" />
          </div>
          <div className="relative">
            <p className="eyebrow text-gold/80">
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
            <span
              className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                status.buka
                  ? 'border-success/40 bg-success/15 text-emerald-200'
                  : 'border-white/15 bg-white/5 text-latte/70'
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${status.buka ? 'bg-emerald-300' : 'bg-latte/60'}`}
              />
              {status.buka ? 'Buka' : 'Tutup'} · {status.keterangan}
            </span>
          </div>
        </div>
        <div className="relative flex flex-wrap gap-2">
          <Link to="/penjualan?form=baru" className="btn btn-caramel w-full sm:w-auto">
            <IconPlus className="size-4" />
            Catat Penjualan
          </Link>
          <Link
            to="/mutasi?form=masuk"
            className="btn border border-white/20 bg-white/5 text-cream hover:bg-white/10"
          >
            <IconArrowDown className="size-4" />
            Stok Masuk
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
          label="Penjualan Hari Ini"
          value={String(penjualanHariIni.length)}
          keterangan={`${formatAngka(itemHariIni)} item terjual`}
          ikon={<IconReceipt className="size-5" />}
          warna="bg-latte/50 text-coffee"
        />
        <StatCard
          label="Mutasi Hari Ini"
          value={String(mutasiHariIni.length)}
          keterangan={`${totalMasukHariIni} masuk · ${totalKeluarHariIni} keluar`}
          ikon={<IconSwap className="size-5" />}
          warna="bg-warning-soft text-warning"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <section className="card xl:col-span-7">
          <SectionHeader
            judul="Penjualan 7 Hari"
            deskripsi="Jumlah item yang terjual per hari"
            aksi={
              <Link
                to="/penjualan"
                className="inline-flex items-center gap-1 text-xs font-semibold text-caramel hover:underline"
              >
                Penjualan <IconArrowRight className="size-3.5" />
              </Link>
            }
          />
          <div className="px-5 pt-5 pb-4">
            <div className="mb-4 flex items-center gap-2 text-[11px] text-muted">
              <IconTrend className="size-3.5 text-caramel" />
              Puncak minggu ini{' '}
              <span className="font-semibold text-coffee">
                {formatAngka(puncak)} item
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
                      {formatAngka(g.total)} item
                    </span>
                    <div
                      className={`w-full max-w-9 rounded-t-md transition-all ${
                        hariIniBar
                          ? 'bg-espresso'
                          : 'bg-latte group-hover:bg-caramel'
                      }`}
                      style={{ height: `${tinggi}%` }}
                      title={`${formatTanggal(g.tanggal)} · ${formatAngka(g.total)} item`}
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
          judul="Penjualan Terbaru"
          deskripsi="Transaksi yang memotong stok secara otomatis"
          aksi={
            <Link
              to="/penjualan"
              className="inline-flex items-center gap-1 text-xs font-semibold text-caramel hover:underline"
            >
              Lihat semua <IconArrowRight className="size-3.5" />
            </Link>
          }
        />
        {terbaru.length === 0 ? (
          <EmptyState
            judul="Belum ada penjualan"
            pesan="Catat penjualan pertama untuk memotong stok bahan."
            ikon={<IconCalendar className="size-5" />}
            aksi={
              <Link to="/penjualan?form=baru" className="btn btn-primary btn-sm">
                Catat penjualan
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-banggala min-w-[640px]">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Nomor</th>
                  <th>Menu</th>
                  <th className="text-right">Item</th>
                  <th>Stok</th>
                </tr>
              </thead>
              <tbody>
                {terbaru.map((p) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap text-xs text-muted">
                      {formatTanggal(p.tanggal)}
                      <span className="ml-1 text-muted/70">
                        {formatWaktu(p.tanggal)}
                      </span>
                    </td>
                    <td className="font-mono text-xs font-semibold whitespace-nowrap text-coffee">
                      {p.nomor}
                    </td>
                    <td className="max-w-64">
                      <p className="truncate text-sm font-medium text-ink">
                        {p.items.map((it) => `${it.jumlah}× ${it.nama}`).join(', ')}
                      </p>
                    </td>
                    <td className="text-right text-sm font-semibold whitespace-nowrap text-ink">
                      {formatAngka(totalItem(p.items))}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          p.stokTerpotong
                            ? 'bg-success-soft text-success'
                            : 'bg-warning-soft text-warning'
                        }`}
                      >
                        {p.stokTerpotong ? 'Terpotong' : 'Sebagian'}
                      </span>
                    </td>
                  </tr>
                ))}
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
