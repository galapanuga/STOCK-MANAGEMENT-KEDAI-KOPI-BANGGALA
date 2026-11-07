import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData, type InputMutasi } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import type { Mutasi, MutasiTipe } from '../types'
import {
  IconArrowDown,
  IconArrowUp,
  IconEdit,
  IconSearch,
  IconSwap,
  IconTrash,
} from '../components/Icons'
import { BadgeTipe } from '../components/ui/Badge'
import { ConfirmDialog, Modal } from '../components/ui/Modal'
import { EmptyState, Field, PageHeader } from '../components/ui/Field'
import {
  akhirHari,
  awalHari,
  formatAngka,
  formatTanggal,
  formatWaktu,
  keWaktuInput,
  sekarangInput,
} from '../lib/format'
import { keDesimal } from '../lib/id'

const PAGE = 15
const ALASAN_KELUAR = ['Pemakaian', 'Rusak', 'Tumpah', 'Sample', 'Koreksi', 'Lainnya']

export function MutasiPage() {
  const { user } = useAuth()
  const { db, stok, bahanMap, tambahMutasi, ubahMutasi, hapusMutasi } = useData()
  const toast = useToast()
  const [params, setParams] = useSearchParams()

  const [cari, setCari] = useState('')
  const [tipe, setTipe] = useState('semua')
  const [bahanFilter, setBahanFilter] = useState('semua')
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')
  const [halaman, setHalaman] = useState(1)

  const [modalBuka, setModalBuka] = useState(false)
  const [diedit, setDiedit] = useState<Mutasi | null>(null)
  const [tipeAwal, setTipeAwal] = useState<MutasiTipe>('masuk')
  const [bahanAwal, setBahanAwal] = useState('')
  const [targetHapus, setTargetHapus] = useState<Mutasi | null>(null)

  useEffect(() => {
    const form = params.get('form')
    if (form === 'masuk' || form === 'keluar') {
      setDiedit(null)
      setTipeAwal(form)
      setBahanAwal(params.get('bahan') ?? '')
      setModalBuka(true)
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  useEffect(() => {
    setHalaman(1)
  }, [cari, tipe, bahanFilter, dari, sampai])

  const daftar = useMemo(() => {
    const q = cari.trim().toLowerCase()
    const mulai = dari ? awalHari(new Date(`${dari}T00:00:00`)).getTime() : null
    const selesai = sampai
      ? akhirHari(new Date(`${sampai}T00:00:00`)).getTime()
      : null

    return db.mutasi
      .filter((m) => (tipe === 'semua' ? true : m.tipe === tipe))
      .filter((m) => (bahanFilter === 'semua' ? true : m.bahanId === bahanFilter))
      .filter((m) => {
        const t = new Date(m.tanggal).getTime()
        if (mulai !== null && t < mulai) return false
        if (selesai !== null && t > selesai) return false
        return true
      })
      .filter((m) => {
        if (!q) return true
        const bahan = bahanMap.get(m.bahanId)
        return (
          (bahan?.nama.toLowerCase().includes(q) ?? false) ||
          (m.keterangan?.toLowerCase().includes(q) ?? false) ||
          (m.alasan?.toLowerCase().includes(q) ?? false) ||
          m.userName.toLowerCase().includes(q)
        )
      })
      .sort(
        (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime(),
      )
  }, [bahanFilter, bahanMap, cari, dari, db.mutasi, sampai, tipe])

  const jumlahMasuk = daftar.filter((m) => m.tipe === 'masuk').length
  const jumlahKeluar = daftar.filter((m) => m.tipe === 'keluar').length

  const totalHalaman = Math.max(1, Math.ceil(daftar.length / PAGE))
  const halamanAman = Math.min(halaman, totalHalaman)
  const tampil = daftar.slice((halamanAman - 1) * PAGE, halamanAman * PAGE)

  const bukaTambah = (t: MutasiTipe) => {
    setDiedit(null)
    setTipeAwal(t)
    setBahanAwal('')
    setModalBuka(true)
  }

  const bukaEdit = (m: Mutasi) => {
    setDiedit(m)
    setModalBuka(true)
  }

  const resetFilter = () => {
    setCari('')
    setTipe('semua')
    setBahanFilter('semua')
    setDari('')
    setSampai('')
  }

  const konfirmasiHapus = () => {
    if (!targetHapus) return
    try {
      hapusMutasi(targetHapus.id)
      toast.sukses('Mutasi berhasil dihapus. Stok telah disesuaikan.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus mutasi.')
    } finally {
      setTargetHapus(null)
    }
  }

  const adaFilter = Boolean(cari || tipe !== 'semua' || bahanFilter !== 'semua' || dari || sampai)

  return (
    <div className="animate-rise">
      <PageHeader
        judul="Mutasi Stok"
        deskripsi="Catat setiap bahan yang masuk dan keluar agar stok selalu akurat."
        aksi={
          <>
            {user && (
              <button className="btn btn-outline" onClick={() => bukaTambah('keluar')}>
                <IconArrowUp className="size-4" />
                Stok Keluar
              </button>
            )}
            <button className="btn btn-primary" onClick={() => bukaTambah('masuk')}>
              <IconArrowDown className="size-4" />
              Stok Masuk
            </button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="card flex items-center gap-3 px-4 py-3">
          <span className="grid size-9 place-items-center rounded-xl bg-sand text-coffee">
            <IconSwap className="size-4.5" />
          </span>
          <div>
            <p className="text-[10px] font-bold tracking-wider text-muted uppercase">
              Transaksi
            </p>
            <p className="text-base font-bold text-espresso">{daftar.length}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 px-4 py-3">
          <span className="grid size-9 place-items-center rounded-xl bg-success-soft text-success">
            <IconArrowDown className="size-4.5" />
          </span>
          <div>
            <p className="text-[10px] font-bold tracking-wider text-muted uppercase">
              Catatan Masuk
            </p>
            <p className="text-base font-bold text-success">{jumlahMasuk}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 px-4 py-3">
          <span className="grid size-9 place-items-center rounded-xl bg-latte/50 text-coffee">
            <IconArrowUp className="size-4.5" />
          </span>
          <div>
            <p className="text-[10px] font-bold tracking-wider text-muted uppercase">
              Catatan Keluar
            </p>
            <p className="text-base font-bold text-coffee">{jumlahKeluar}</p>
          </div>
        </div>
      </div>

      <div className="card mb-4 p-4">
        <div className="grid gap-2 lg:grid-cols-12">
          <div className="relative lg:col-span-3">
            <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input
              className="input pl-9"
              placeholder="Cari bahan / keterangan…"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
            />
          </div>
          <select
            className="input lg:col-span-2"
            value={tipe}
            onChange={(e) => setTipe(e.target.value)}
            aria-label="Filter tipe"
          >
            <option value="semua">Semua tipe</option>
            <option value="masuk">Stok masuk</option>
            <option value="keluar">Stok keluar</option>
          </select>
          <select
            className="input lg:col-span-2"
            value={bahanFilter}
            onChange={(e) => setBahanFilter(e.target.value)}
            aria-label="Filter bahan"
          >
            <option value="semua">Semua bahan</option>
            {[...db.bahan]
              .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nama}
                </option>
              ))}
          </select>
          <div className="lg:col-span-2">
            <input
              type="date"
              className="input"
              value={dari}
              onChange={(e) => setDari(e.target.value)}
              aria-label="Dari tanggal"
              title="Dari tanggal"
            />
          </div>
          <div className="lg:col-span-2">
            <input
              type="date"
              className="input"
              value={sampai}
              onChange={(e) => setSampai(e.target.value)}
              aria-label="Sampai tanggal"
              title="Sampai tanggal"
            />
          </div>
          <div className="lg:col-span-1">
            <button
              className="btn btn-outline w-full"
              onClick={resetFilter}
              disabled={!adaFilter}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {daftar.length === 0 ? (
          <EmptyState
            judul="Belum ada mutasi"
            pesan={
              adaFilter
                ? 'Tidak ada mutasi yang cocok dengan filter Anda.'
                : 'Mulai catat stok masuk atau keluar pertama hari ini.'
            }
            ikon={<IconSwap className="size-5" />}
            aksi={
              !adaFilter ? (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => bukaTambah('masuk')}
                >
                  <IconArrowDown className="size-3.5" />
                  Catat stok masuk
                </button>
              ) : (
                <button className="btn btn-outline btn-sm" onClick={resetFilter}>
                  Reset filter
                </button>
              )
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table-banggala min-w-[980px]">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Bahan</th>
                    <th>Tipe</th>
                    <th className="text-right">Jumlah</th>
                    <th>Keterangan</th>
                    <th>Oleh</th>
                    <th className="text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {tampil.map((m) => {
                    const bahan = bahanMap.get(m.bahanId)
                    return (
                      <tr key={m.id}>
                        <td className="whitespace-nowrap">
                          <p className="text-xs font-medium text-ink">
                            {formatTanggal(m.tanggal)}
                          </p>
                          <p className="text-[10px] text-muted">
                            {formatWaktu(m.tanggal)}
                          </p>
                        </td>
                        <td>
                          <p className="text-sm font-semibold whitespace-nowrap text-ink">
                            {bahan?.nama ?? 'Bahan terhapus'}
                          </p>
                          <p className="text-[10px] text-muted">{bahan?.kategori}</p>
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
                          <span className="text-[10px] font-normal text-muted">
                            {bahan?.satuan}
                          </span>
                        </td>
                        <td className="max-w-56">
                          <p className="truncate text-xs text-mocha">
                            {m.keterangan || '—'}
                          </p>
                          {m.alasan && (
                            <span className="mt-1 inline-flex rounded bg-sand px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-coffee uppercase">
                              {m.alasan}
                            </span>
                          )}
                        </td>
                        <td className="text-xs whitespace-nowrap text-muted">
                          {m.userName}
                        </td>
                        <td>
                          {m.penjualanId ? (
                            <p className="text-right text-[10px] font-semibold whitespace-nowrap text-caramel">
                              Dari penjualan
                            </p>
                          ) : user?.role === 'admin' ? (
                            <div className="flex items-center justify-end gap-1">
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => bukaEdit(m)}
                                title="Ubah mutasi"
                              >
                                <IconEdit className="size-3.5" />
                              </button>
                              <button
                                className="btn btn-ghost btn-sm text-danger hover:bg-danger-soft"
                                onClick={() => setTargetHapus(m)}
                                title="Hapus mutasi"
                              >
                                <IconTrash className="size-3.5" />
                              </button>
                            </div>
                          ) : (
                            <p className="text-right text-xs text-muted">—</p>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-xs text-muted">
              <span>
                Menampilkan {(halamanAman - 1) * PAGE + 1}–
                {Math.min(halamanAman * PAGE, daftar.length)} dari {daftar.length}{' '}
                mutasi
              </span>
              <div className="flex items-center gap-1">
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setHalaman((h) => Math.max(1, h - 1))}
                  disabled={halamanAman <= 1}
                >
                  Sebelumnya
                </button>
                <span className="px-2 font-semibold text-coffee">
                  {halamanAman} / {totalHalaman}
                </span>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setHalaman((h) => Math.min(totalHalaman, h + 1))}
                  disabled={halamanAman >= totalHalaman}
                >
                  Berikutnya
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <MutasiModal
        buka={modalBuka}
        tutup={() => setModalBuka(false)}
        mutasi={diedit}
        tipeAwal={tipeAwal}
        bahanAwal={bahanAwal}
        onSimpan={(input) => {
          if (diedit) {
            ubahMutasi(diedit.id, input)
            toast.sukses('Mutasi berhasil diperbarui.')
          } else {
            tambahMutasi(input)
            toast.sukses(
              input.tipe === 'masuk'
                ? 'Stok masuk berhasil dicatat.'
                : 'Stok keluar berhasil dicatat.',
            )
          }
          setModalBuka(false)
        }}
      />

      <ConfirmDialog
        buka={targetHapus !== null}
        judul="Hapus mutasi ini?"
        pesan={
          <>
            Mutasi{' '}
            <b className="text-ink">
              {targetHapus?.tipe === 'masuk' ? 'stok masuk' : 'stok keluar'}{' '}
              {formatAngka(targetHapus?.jumlah ?? 0)}{' '}
              {bahanMap.get(targetHapus?.bahanId ?? '')?.satuan}
            </b>{' '}
            untuk{' '}
            <b className="text-ink">
              {bahanMap.get(targetHapus?.bahanId ?? '')?.nama}
            </b>{' '}
            akan dihapus dan stok dihitung ulang. Tindakan ini tidak bisa
            dibatalkan.
          </>
        }
        labelKonfirmasi="Hapus mutasi"
        bahaya
        onTutup={() => setTargetHapus(null)}
        onKonfirmasi={konfirmasiHapus}
      />
    </div>
  )
}

function MutasiModal({
  buka,
  tutup,
  mutasi,
  tipeAwal,
  bahanAwal,
  onSimpan,
}: {
  buka: boolean
  tutup: () => void
  mutasi: Mutasi | null
  tipeAwal: MutasiTipe
  bahanAwal: string
  onSimpan: (input: InputMutasi) => void
}) {
  const { db, stok } = useData()
  const [tipe, setTipe] = useState<MutasiTipe>('masuk')
  const [bahanId, setBahanId] = useState('')
  const [jumlah, setJumlah] = useState('')
  const [alasan, setAlasan] = useState('Pemakaian')
  const [keterangan, setKeterangan] = useState('')
  const [tanggal, setTanggal] = useState(sekarangInput())
  const [galat, setGalat] = useState('')

  const opsiBahan = useMemo(() => {
    const aktif = db.bahan.filter((b) => !b.arsip)
    if (mutasi) {
      const lama = db.bahan.find((b) => b.id === mutasi.bahanId)
      if (lama && !aktif.some((b) => b.id === lama.id)) aktif.push(lama)
    }
    return aktif.sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
  }, [db.bahan, mutasi])

  useEffect(() => {
    if (!buka) return
    setGalat('')
    if (mutasi) {
      setTipe(mutasi.tipe)
      setBahanId(mutasi.bahanId)
      setJumlah(String(mutasi.jumlah))
      setAlasan(mutasi.alasan ?? 'Pemakaian')
      setKeterangan(mutasi.keterangan ?? '')
      setTanggal(keWaktuInput(mutasi.tanggal))
    } else {
      setTipe(tipeAwal)
      setBahanId(
        bahanAwal && opsiBahan.some((b) => b.id === bahanAwal)
          ? bahanAwal
          : (opsiBahan[0]?.id ?? ''),
      )
      setJumlah('')
      setAlasan('Pemakaian')
      setKeterangan('')
      setTanggal(sekarangInput())
    }
  }, [buka, mutasi, tipeAwal, bahanAwal, opsiBahan])

  const bahan = db.bahan.find((b) => b.id === bahanId)
  const info = bahanId ? stok.get(bahanId) : undefined

  let dasarStok = info?.stok ?? 0
  if (mutasi && mutasi.bahanId === bahanId) {
    dasarStok += mutasi.tipe === 'keluar' ? mutasi.jumlah : -mutasi.jumlah
  }
  const jumlahAngka = keDesimal(jumlah)
  const stokSetelah =
    tipe === 'masuk' ? dasarStok + jumlahAngka : dasarStok - jumlahAngka

  const kirim = () => {
    setGalat('')
    if (!bahanId) {
      setGalat('Pilih bahan terlebih dahulu.')
      return
    }
    if (!(jumlahAngka > 0)) {
      setGalat('Jumlah harus lebih dari 0.')
      return
    }
    const waktu = new Date(tanggal)
    if (Number.isNaN(waktu.getTime())) {
      setGalat('Tanggal tidak valid.')
      return
    }
    if (tipe === 'keluar' && jumlahAngka > dasarStok + 1e-9) {
      setGalat(
        `Stok tidak cukup. Tersedia ${formatAngka(dasarStok)} ${bahan?.satuan ?? ''}.`,
      )
      return
    }

    try {
      onSimpan({
        bahanId,
        tipe,
        jumlah: jumlahAngka,
        alasan: tipe === 'keluar' ? alasan : undefined,
        keterangan,
        tanggal: waktu.toISOString(),
      })
    } catch (error) {
      setGalat(error instanceof Error ? error.message : 'Gagal menyimpan mutasi.')
    }
  }

  return (
    <Modal
      buka={buka}
      tutup={tutup}
      judul={mutasi ? 'Ubah Mutasi' : tipe === 'masuk' ? 'Catat Stok Masuk' : 'Catat Stok Keluar'}
      deskripsi={
        mutasi
          ? 'Perubahan akan menghitung ulang stok bahan terkait.'
          : tipe === 'masuk'
            ? 'Catat pembelian atau penambahan stok bahan.'
            : 'Catat pemakaian, kerusakan, atau pengurangan stok.'
      }
      lebar="lg"
      footer={
        <>
          <button className="btn btn-outline" onClick={tutup}>
            Batal
          </button>
          <button className="btn btn-primary" onClick={kirim}>
            {mutasi ? 'Simpan perubahan' : 'Simpan mutasi'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {galat && (
          <p className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-xs text-danger">
            {galat}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 rounded-xl bg-sand/60 p-1.5">
          <button
            type="button"
            onClick={() => setTipe('masuk')}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              tipe === 'masuk'
                ? 'bg-white text-success shadow-sm'
                : 'text-muted hover:text-coffee'
            }`}
          >
            <IconArrowDown className="size-4" />
            Stok Masuk
          </button>
          <button
            type="button"
            onClick={() => setTipe('keluar')}
            className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              tipe === 'keluar'
                ? 'bg-white text-coffee shadow-sm'
                : 'text-muted hover:text-coffee'
            }`}
          >
            <IconArrowUp className="size-4" />
            Stok Keluar
          </button>
        </div>

        <Field label="Bahan" htmlFor="mutasi-bahan">
          <select
            id="mutasi-bahan"
            className="input"
            value={bahanId}
            onChange={(e) => setBahanId(e.target.value)}
          >
            {opsiBahan.length === 0 && <option value="">Belum ada bahan aktif</option>}
            {opsiBahan.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nama} ({b.satuan})
              </option>
            ))}
          </select>
        </Field>

        {bahan && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-cream px-3.5 py-2.5 text-xs">
            <span className="text-muted">
              Stok saat ini:{' '}
              <b className="text-ink">
                {formatAngka(info?.stok ?? 0)} {bahan.satuan}
              </b>
              {bahan.stokMin > 0 && (
                <span className="ml-2 text-muted/80">
                  · min {formatAngka(bahan.stokMin)} {bahan.satuan}
                </span>
              )}
            </span>
            <span
              className={
                stokSetelah < 0
                  ? 'font-semibold text-danger'
                  : 'font-semibold text-success'
              }
            >
              Setelah dicatat: {formatAngka(stokSetelah)} {bahan.satuan}
            </span>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Jumlah" htmlFor="mutasi-jumlah">
            <div className="relative">
              <input
                id="mutasi-jumlah"
                type="number"
                min={0}
                step="any"
                className="input pr-16"
                value={jumlah}
                onChange={(e) => setJumlah(e.target.value)}
                placeholder="0"
                autoFocus
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] text-muted">
                {bahan?.satuan ?? 'satuan'}
              </span>
            </div>
          </Field>

          {tipe === 'keluar' && (
            <Field label="Alasan" htmlFor="mutasi-alasan">
              <select
                id="mutasi-alasan"
                className="input"
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
              >
                {ALASAN_KELUAR.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Keterangan" htmlFor="mutasi-ket">
            <input
              id="mutasi-ket"
              className="input"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder={
                tipe === 'masuk'
                  ? 'mis. Pembelian dari supplier'
                  : 'mis. Produksi minuman pagi'
              }
            />
          </Field>
          <Field label="Tanggal & Waktu" htmlFor="mutasi-tanggal">
            <input
              id="mutasi-tanggal"
              type="datetime-local"
              className="input"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </Field>
        </div>
      </div>
    </Modal>
  )
}
