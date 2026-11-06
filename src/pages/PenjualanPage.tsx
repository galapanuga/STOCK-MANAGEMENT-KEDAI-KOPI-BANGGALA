import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData, type InputPenjualan } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import type { Penjualan } from '../types'
import {
  IconEdit,
  IconMinus,
  IconPlus,
  IconReceipt,
  IconSearch,
  IconTrash,
} from '../components/Icons'
import { ConfirmDialog, Modal } from '../components/ui/Modal'
import { EmptyState, Field, PageHeader } from '../components/ui/Field'
import {
  formatAngka,
  formatTanggal,
  formatWaktu,
  keTanggalInput,
  keWaktuInput,
  sekarangInput,
} from '../lib/format'
import { keDesimal } from '../lib/id'
import { hitungStok } from '../lib/stock'
import {
  menuTanpaResep,
  rincianKebutuhan,
  totalItem,
} from '../lib/menu'

const PAGE = 12

export function PenjualanPage() {
  const { user } = useAuth()
  const { db, menuMap, catatPenjualan, ubahPenjualan, hapusPenjualan } = useData()
  const toast = useToast()
  const [params, setParams] = useSearchParams()

  const [dari, setDari] = useState(keTanggalInput(new Date()))
  const [sampai, setSampai] = useState(keTanggalInput(new Date()))
  const [cari, setCari] = useState('')
  const [halaman, setHalaman] = useState(1)
  const [modalBuka, setModalBuka] = useState(false)
  const [diedit, setDiedit] = useState<Penjualan | null>(null)
  const [targetHapus, setTargetHapus] = useState<Penjualan | null>(null)

  useEffect(() => {
    if (params.get('form') === 'baru') {
      setDiedit(null)
      setModalBuka(true)
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  useEffect(() => {
    setHalaman(1)
  }, [cari, dari, sampai])

  const daftar = useMemo(() => {
    const q = cari.trim().toLowerCase()
    const mulai = dari ? new Date(`${dari}T00:00:00`).getTime() : null
    const selesai = sampai ? new Date(`${sampai}T23:59:59.999`).getTime() : null

    return db.penjualan
      .filter((p) => {
        const t = new Date(p.tanggal).getTime()
        if (mulai !== null && t < mulai) return false
        if (selesai !== null && t > selesai) return false
        return true
      })
      .filter((p) => {
        if (!q) return true
        return (
          p.nomor.toLowerCase().includes(q) ||
          (p.catatan?.toLowerCase().includes(q) ?? false) ||
          p.userName.toLowerCase().includes(q) ||
          p.items.some(
            (it) =>
              it.nama.toLowerCase().includes(q) ||
              (menuMap.get(it.menuId)?.kategori.toLowerCase().includes(q) ?? false),
          )
        )
      })
      .sort(
        (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime(),
      )
  }, [cari, dari, db.penjualan, menuMap, sampai])

  const totalHalaman = Math.max(1, Math.ceil(daftar.length / PAGE))
  const halamanAman = Math.min(halaman, totalHalaman)
  const tampil = daftar.slice((halamanAman - 1) * PAGE, halamanAman * PAGE)

  const totalItemPeriode = daftar.reduce(
    (total, p) => total + totalItem(p.items),
    0,
  )
  const tanpaPotongan = daftar.filter((p) => !p.stokTerpotong).length

  const resetHariIni = () => {
    const hariIni = keTanggalInput(new Date())
    setDari(hariIni)
    setSampai(hariIni)
    setCari('')
  }

  const konfirmasiHapus = () => {
    if (!targetHapus) return
    try {
      hapusPenjualan(targetHapus.id)
      toast.sukses(
        `Penjualan ${targetHapus.nomor} dihapus. Stok bahan dikembalikan.`,
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Gagal menghapus penjualan.',
      )
    } finally {
      setTargetHapus(null)
    }
  }

  return (
    <div className="animate-rise">
      <PageHeader
        judul="Penjualan"
        deskripsi="Catat menu terjual. Stok bahan otomatis berkurang sesuai resep — tanpa perhitungan omzet."
        aksi={
          <button
            className="btn btn-primary"
            onClick={() => {
              setDiedit(null)
              setModalBuka(true)
            }}
          >
            <IconPlus className="size-4" />
            Catat Penjualan
          </button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="card flex items-center gap-3 px-4 py-3">
          <span className="grid size-9 place-items-center rounded-xl bg-sand text-coffee">
            <IconReceipt className="size-4.5" />
          </span>
          <div>
            <p className="text-[10px] font-bold tracking-wider text-muted uppercase">
              Transaksi
            </p>
            <p className="text-base font-bold text-espresso">{daftar.length}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 px-4 py-3">
          <span className="grid size-9 place-items-center rounded-xl bg-latte/50 text-coffee">
            <IconMinus className="size-4.5" />
          </span>
          <div>
            <p className="text-[10px] font-bold tracking-wider text-muted uppercase">
              Item Terjual
            </p>
            <p className="text-base font-bold text-coffee">
              {formatAngka(totalItemPeriode)}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3 px-4 py-3">
          <span
            className={`grid size-9 place-items-center rounded-xl ${
              tanpaPotongan > 0
                ? 'bg-warning-soft text-warning'
                : 'bg-success-soft text-success'
            }`}
          >
            <IconReceipt className="size-4.5" />
          </span>
          <div>
            <p className="text-[10px] font-bold tracking-wider text-muted uppercase">
              Stok Tidak Penuh
            </p>
            <p className="text-base font-bold text-espresso">{tanpaPotongan}</p>
          </div>
        </div>
      </div>

      <div className="card mb-4 p-4">
        <div className="grid gap-2 lg:grid-cols-12">
          <div className="relative lg:col-span-5">
            <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input
              className="input pl-9"
              placeholder="Cari nomor, menu, catatan, atau petugas…"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
            />
          </div>
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
          <div className="lg:col-span-2">
            <button className="btn btn-outline w-full" onClick={resetHariIni}>
              Hari ini
            </button>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        {daftar.length === 0 ? (
          <EmptyState
            judul="Belum ada penjualan"
            pesan="Catat transaksi pertama; stok bahan akan otomatis berkurang."
            ikon={<IconReceipt className="size-5" />}
            aksi={
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setDiedit(null)
                  setModalBuka(true)
                }}
              >
                <IconPlus className="size-3.5" /> Catat penjualan
              </button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table-banggala min-w-[980px]">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Nomor</th>
                    <th>Menu</th>
                    <th className="text-right">Item</th>
                    <th>Stok</th>
                    <th>Catatan</th>
                    <th>Oleh</th>
                    <th className="text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {tampil.map((p) => (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap">
                        <p className="text-xs font-medium text-ink">
                          {formatTanggal(p.tanggal)}
                        </p>
                        <p className="text-[10px] text-muted">
                          {formatWaktu(p.tanggal)}
                        </p>
                      </td>
                      <td className="font-mono text-xs font-semibold whitespace-nowrap text-coffee">
                        {p.nomor}
                      </td>
                      <td className="max-w-80">
                        <p className="truncate text-xs text-ink">
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
                          title={
                            p.stokTerpotong
                              ? 'Seluruh bahan resep sudah dipotong'
                              : 'Ada menu tanpa resep, stok tidak terpotong penuh'
                          }
                        >
                          {p.stokTerpotong ? 'Terpotong' : 'Sebagian'}
                        </span>
                      </td>
                      <td className="max-w-48">
                        <p className="truncate text-xs text-mocha">
                          {p.catatan || '—'}
                        </p>
                      </td>
                      <td className="text-xs whitespace-nowrap text-muted">
                        {p.userName}
                      </td>
                      <td>
                        {user?.role === 'admin' ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => {
                                setDiedit(p)
                                setModalBuka(true)
                              }}
                              title="Ubah penjualan"
                            >
                              <IconEdit className="size-3.5" />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm text-danger hover:bg-danger-soft"
                              onClick={() => setTargetHapus(p)}
                              title="Hapus penjualan"
                            >
                              <IconTrash className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-right text-xs text-muted">—</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-xs text-muted">
              <span>
                Menampilkan {(halamanAman - 1) * PAGE + 1}–
                {Math.min(halamanAman * PAGE, daftar.length)} dari {daftar.length}{' '}
                transaksi
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

      <PenjualanModal
        buka={modalBuka}
        tutup={() => setModalBuka(false)}
        penjualan={diedit}
        onSimpan={(input) => {
          if (diedit) {
            ubahPenjualan(diedit.id, input)
            toast.sukses(`Penjualan ${diedit.nomor} berhasil diperbarui.`)
          } else {
            const p = catatPenjualan(input)
            toast.sukses(
              `Penjualan ${p.nomor} dicatat${p.stokTerpotong ? ' dan stok dipotong.' : ' (sebagian stok tidak terpotong).'}`,
            )
          }
          setModalBuka(false)
        }}
      />

      <ConfirmDialog
        buka={targetHapus !== null}
        judul="Hapus penjualan ini?"
        pesan={
          <>
            Penjualan <b className="text-ink">{targetHapus?.nomor}</b> akan
            dihapus beserta mutasi stok yang dibuat otomatis. Stok bahan akan
            dihitung ulang. Tindakan ini tidak bisa dibatalkan.
          </>
        }
        labelKonfirmasi="Hapus penjualan"
        bahaya
        onTutup={() => setTargetHapus(null)}
        onKonfirmasi={konfirmasiHapus}
      />
    </div>
  )
}

interface BarisItem {
  menuId: string
  jumlah: string
}

function PenjualanModal({
  buka,
  tutup,
  penjualan,
  onSimpan,
}: {
  buka: boolean
  tutup: () => void
  penjualan: Penjualan | null
  onSimpan: (input: InputPenjualan) => void
}) {
  const { db, stok, bahanMap, menuMap } = useData()
  const [tanggal, setTanggal] = useState(sekarangInput())
  const [catatan, setCatatan] = useState('')
  const [baris, setBaris] = useState<BarisItem[]>([])
  const [pilihan, setPilihan] = useState('')
  const [galat, setGalat] = useState('')

  const opsiMenu = useMemo(() => {
    const aktif = db.menu.filter((m) => !m.arsip)
    if (penjualan) {
      for (const item of penjualan.items) {
        const lama = db.menu.find((m) => m.id === item.menuId)
        if (lama && !aktif.some((m) => m.id === lama.id)) aktif.push(lama)
      }
    }
    return aktif.sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
  }, [db.menu, penjualan])

  useEffect(() => {
    if (!buka) return
    setGalat('')
    if (penjualan) {
      setTanggal(keWaktuInput(penjualan.tanggal))
      setCatatan(penjualan.catatan ?? '')
      setBaris(
        penjualan.items.map((it) => ({
          menuId: it.menuId,
          jumlah: String(it.jumlah),
        })),
      )
    } else {
      setTanggal(sekarangInput())
      setCatatan('')
      setBaris([])
    }
    setPilihan('')
  }, [buka, penjualan])

  const stokDasar = useMemo(() => {
    if (!penjualan) return stok
    return hitungStok(
      db.bahan,
      db.mutasi.filter((m) => m.penjualanId !== penjualan.id),
    )
  }, [db.bahan, db.mutasi, penjualan, stok])

  const itemsAngka = useMemo(
    () =>
      baris
        .map((b) => ({ menuId: b.menuId, jumlah: keDesimal(b.jumlah) }))
        .filter((b) => b.jumlah > 0),
    [baris],
  )

  const rincian = useMemo(
    () => rincianKebutuhan(itemsAngka, menuMap, bahanMap, stokDasar),
    [bahanMap, itemsAngka, menuMap, stokDasar],
  )

  const tanpaResep = useMemo(
    () => menuTanpaResep(itemsAngka, menuMap),
    [itemsAngka, menuMap],
  )

  const kurang = rincian.filter((r) => !r.cukup)
  const totalQty = itemsAngka.reduce((t, it) => t + it.jumlah, 0)

  const tambahItem = () => {
    const menuId = pilihan || opsiMenu[0]?.id
    if (!menuId) return
    setBaris((lama) => {
      const sudah = lama.find((b) => b.menuId === menuId)
      if (sudah) {
        return lama.map((b) =>
          b.menuId === menuId
            ? { ...b, jumlah: String((keDesimal(b.jumlah) || 0) + 1) }
            : b,
        )
      }
      return [...lama, { menuId, jumlah: '1' }]
    })
    setPilihan('')
  }

  const ubahJumlah = (menuId: string, jumlah: string) => {
    setBaris((lama) =>
      lama.map((b) => (b.menuId === menuId ? { ...b, jumlah } : b)),
    )
  }

  const hapusItem = (menuId: string) => {
    setBaris((lama) => lama.filter((b) => b.menuId !== menuId))
  }

  const kirim = () => {
    setGalat('')
    if (itemsAngka.length === 0) {
      return setGalat('Tambahkan minimal satu menu dengan jumlah lebih dari 0.')
    }
    const waktu = new Date(tanggal)
    if (Number.isNaN(waktu.getTime())) {
      return setGalat('Tanggal penjualan tidak valid.')
    }
    if (kurang.length > 0) {
      return setGalat(
        `Stok tidak cukup: ${kurang
          .map(
            (k) =>
              `${k.nama} (butuh ${formatAngka(k.dibutuhkan)} ${k.satuan}, tersedia ${formatAngka(k.tersedia)} ${k.satuan})`,
          )
          .join('; ')}.`,
      )
    }

    try {
      onSimpan({
        tanggal: waktu.toISOString(),
        items: itemsAngka,
        catatan,
      })
    } catch (error) {
      setGalat(
        error instanceof Error ? error.message : 'Gagal menyimpan penjualan.',
      )
    }
  }

  return (
    <Modal
      buka={buka}
      tutup={tutup}
      judul={penjualan ? 'Ubah Penjualan' : 'Catat Penjualan'}
      deskripsi={
        penjualan
          ? 'Perubahan akan menghapus lalu menghitung ulang stok bahan terkait.'
          : 'Pilih menu dan jumlahnya. Stok bahan dipotong otomatis sesuai resep.'
      }
      lebar="lg"
      footer={
        <>
          <button className="btn btn-outline" onClick={tutup}>
            Batal
          </button>
          <button
            className="btn btn-primary"
            onClick={kirim}
            disabled={opsiMenu.length === 0}
          >
            {penjualan ? 'Simpan perubahan' : 'Simpan penjualan'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {galat && (
          <p className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-xs leading-relaxed text-danger">
            {galat}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tanggal & Waktu" htmlFor="pj-tanggal">
            <input
              id="pj-tanggal"
              type="datetime-local"
              className="input"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </Field>
          <Field label="Catatan" htmlFor="pj-catatan">
            <input
              id="pj-catatan"
              className="input"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="mis. Dine-in meja 3 / GrabFood"
            />
          </Field>
        </div>

        <div className="rounded-xl border border-line">
          <div className="flex flex-wrap items-end gap-2 border-b border-line px-3.5 py-3">
            <div className="min-w-0 flex-1">
              <label className="label" htmlFor="pj-menu">
                Tambah Menu
              </label>
              <select
                id="pj-menu"
                className="input"
                value={pilihan || opsiMenu[0]?.id || ''}
                onChange={(e) => setPilihan(e.target.value)}
                disabled={opsiMenu.length === 0}
              >
                {opsiMenu.length === 0 && (
                  <option value="">Belum ada menu aktif</option>
                )}
                {opsiMenu.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nama}
                    {m.resep.length === 0 ? ' · tanpa resep' : ''}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-outline"
              onClick={tambahItem}
              disabled={opsiMenu.length === 0}
            >
              <IconPlus className="size-4" />
              Tambah
            </button>
          </div>

          <div className="space-y-2 p-3.5">
            {baris.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted">
                Belum ada menu pada transaksi ini.
              </p>
            ) : (
              baris.map((b) => {
                const menu = menuMap.get(b.menuId)
                return (
                  <div key={b.menuId} className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {menu?.nama ?? 'Menu terhapus'}
                      </p>
                      <p className="text-[10px] text-muted">
                        {menu
                          ? menu.resep.length > 0
                            ? `${menu.resep.length} bahan resep`
                            : 'Tanpa resep · stok tidak terpotong'
                          : 'Menu tidak ditemukan'}
                      </p>
                    </div>
                    <div className="relative w-24 shrink-0">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        className="input pr-10 text-right"
                        value={b.jumlah}
                        onChange={(e) => ubahJumlah(b.menuId, e.target.value)}
                        aria-label={`Jumlah ${menu?.nama ?? ''}`}
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[10px] text-muted">
                        porsi
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm shrink-0 text-danger hover:bg-danger-soft"
                      onClick={() => hapusItem(b.menuId)}
                      aria-label="Hapus item"
                    >
                      <IconTrash className="size-3.5" />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {baris.length > 0 && (
            <div className="flex items-center justify-between border-t border-line bg-cream/50 px-3.5 py-2.5 text-xs">
              <span className="text-muted">Total item</span>
              <span className="font-bold text-ink">{formatAngka(totalQty)}</span>
            </div>
          )}
        </div>

        {itemsAngka.length > 0 && (
          <div className="rounded-xl border border-line">
            <div className="border-b border-line px-3.5 py-2.5">
              <p className="text-xs font-bold text-ink">Pemeriksaan Stok</p>
              <p className="text-[10px] text-muted">
                {penjualan
                  ? 'Stok dihitung tanpa mutasi penjualan ini.'
                  : 'Stok tersedia saat ini.'}
              </p>
            </div>
            {rincian.length === 0 ? (
              <p className="px-3.5 py-3 text-xs text-muted">
                Tidak ada bahan yang dipotong pada transaksi ini.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-sand/60 font-mono text-[9px] tracking-wider text-mocha uppercase">
                      <th className="px-3.5 py-2">Bahan</th>
                      <th className="px-3.5 py-2 text-right">Butuh</th>
                      <th className="px-3.5 py-2 text-right">Tersedia</th>
                      <th className="px-3.5 py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rincian.map((r) => (
                      <tr key={r.bahanId} className="border-t border-line/70">
                        <td className="px-3.5 py-2 font-medium text-ink">
                          {r.nama}
                        </td>
                        <td className="px-3.5 py-2 text-right whitespace-nowrap text-mocha">
                          {formatAngka(r.dibutuhkan)} {r.satuan}
                        </td>
                        <td className="px-3.5 py-2 text-right whitespace-nowrap text-mocha">
                          {formatAngka(r.tersedia)} {r.satuan}
                        </td>
                        <td className="px-3.5 py-2 text-right">
                          <span
                            className={`badge ${
                              r.cukup
                                ? 'bg-success-soft text-success'
                                : 'bg-danger-soft text-danger'
                            }`}
                          >
                            {r.cukup ? 'Cukup' : 'Kurang'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {tanpaResep.length > 0 && (
              <p className="border-t border-warning/20 bg-warning-soft/60 px-3.5 py-2.5 text-[11px] leading-relaxed text-warning">
                {tanpaResep.join(', ')} belum punya resep. Stok tidak dipotong
                untuk menu tersebut.
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
