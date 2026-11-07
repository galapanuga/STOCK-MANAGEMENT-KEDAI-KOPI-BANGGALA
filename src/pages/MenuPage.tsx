import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData, type InputMenu } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import type { Menu, ResepItem } from '../types'
import {
  IconArchive,
  IconBook,
  IconDownload,
  IconEdit,
  IconPlus,
  IconRestore,
  IconSearch,
  IconTrash,
} from '../components/Icons'
import { ConfirmDialog, Modal } from '../components/ui/Modal'
import { EmptyState, Field, PageHeader } from '../components/ui/Field'
import { unduhCSV } from '../lib/csv'
import { formatAngka } from '../lib/format'
import { keDesimal } from '../lib/id'

interface BarisResep {
  bahanId: string
  jumlah: string
}

export function MenuPage() {
  const { user, modeOnline } = useAuth()
  const { db, bahanMap, tambahMenu, ubahMenu, arsipMenu } = useData()
  const toast = useToast()
  // Katalog & resep hanya dikelola admin, sama seperti policy RLS di cloud.
  const bolehKelola = !modeOnline || user?.role === 'admin'

  const [cari, setCari] = useState('')
  const [kategori, setKategori] = useState('semua')
  const [tampilArsip, setTampilArsip] = useState(false)
  const [modalBuka, setModalBuka] = useState(false)
  const [diedit, setDiedit] = useState<Menu | null>(null)
  const [targetArsip, setTargetArsip] = useState<Menu | null>(null)

  const daftar = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return db.menu
      .filter((m) => (tampilArsip ? true : !m.arsip))
      .filter((m) => (kategori === 'semua' ? true : m.kategori === kategori))
      .filter((m) =>
        q
          ? m.nama.toLowerCase().includes(q) ||
            (m.deskripsi?.toLowerCase().includes(q) ?? false) ||
            m.kategori.toLowerCase().includes(q)
          : true,
      )
      .sort((a, b) => {
        if (a.arsip !== b.arsip) return a.arsip ? 1 : -1
        return a.nama.localeCompare(b.nama, 'id')
      })
  }, [cari, db.menu, kategori, tampilArsip])

  const ekspor = () => {
    if (daftar.length === 0) {
      toast.error('Tidak ada menu untuk diekspor.')
      return
    }
    unduhCSV(
      'Menu-Banggala.csv',
      ['Menu', 'Kategori', 'Deskripsi', 'Resep Estimasi', 'Jumlah Bahan', 'Resep'],
      daftar.map((m) => [
        m.nama,
        m.kategori,
        m.deskripsi ?? '',
        m.resepEstimasi ? 'Ya' : 'Tidak',
        m.resep.length,
        m.resep
          .map((r) => {
            const b = bahanMap.get(r.bahanId)
            return `${b?.nama ?? r.bahanId} ${formatAngka(r.jumlah)} ${b?.satuan ?? ''}`.trim()
          })
          .join('; '),
      ]),
    )
    toast.sukses('Daftar menu berhasil diunduh.')
  }

  const konfirmasiArsip = () => {
    if (!targetArsip) return
    try {
      arsipMenu(targetArsip.id, !targetArsip.arsip)
      toast.sukses(
        targetArsip.arsip
          ? `Menu "${targetArsip.nama}" diaktifkan kembali.`
          : `Menu "${targetArsip.nama}" diarsipkan.`,
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengubah menu.')
    } finally {
      setTargetArsip(null)
    }
  }

  return (
    <div className="animate-rise">
      <PageHeader
        judul="Menu & Resep"
        deskripsi="Katalog menu kedai beserta resep bahan. Resep contoh ditandai sebagai estimasi dan bisa disesuaikan."
        aksi={
          <>
            <button className="btn btn-outline" onClick={ekspor}>
              <IconDownload className="size-4" />
              Export CSV
            </button>
            {bolehKelola && (
              <button
                className="btn btn-primary"
                onClick={() => {
                  setDiedit(null)
                  setModalBuka(true)
                }}
              >
                <IconPlus className="size-4" />
                Tambah Menu
              </button>
            )}
          </>
        }
      />

      <div className="card mb-4 flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            className="input pl-9"
            placeholder="Cari nama menu atau deskripsi…"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            className="input sm:w-48"
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            aria-label="Filter kategori menu"
          >
            <option value="semua">Semua kategori</option>
            {db.pengaturan.kategoriMenu.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-xs font-medium text-mocha select-none">
            <input
              type="checkbox"
              checked={tampilArsip}
              onChange={(e) => setTampilArsip(e.target.checked)}
              className="size-3.5 accent-espresso"
            />
            Arsip
          </label>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 text-xs text-muted">
          <span>
            Menampilkan <b className="text-coffee">{daftar.length}</b> menu
          </span>
          <span>
            <b className="text-coffee">
              {db.menu.filter((m) => !m.arsip && m.resep.length === 0).length}
            </b>{' '}
            menu tanpa resep (stok tidak terpotong)
          </span>
        </div>

        {daftar.length === 0 ? (
          <EmptyState
            judul="Tidak ada menu"
            pesan={
              cari || kategori !== 'semua'
                ? 'Coba ubah kata kunci atau filter Anda.'
                : 'Tambahkan menu pertama untuk mulai mencatat penjualan.'
            }
            ikon={<IconBook className="size-5" />}
            aksi={
              bolehKelola ? (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setDiedit(null)
                    setModalBuka(true)
                  }}
                >
                  <IconPlus className="size-3.5" /> Tambah menu
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-banggala min-w-[860px]">
              <thead>
                <tr>
                  <th>Menu</th>
                  <th>Kategori</th>
                  <th>Resep</th>
                  <th>Status</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((m) => (
                  <tr key={m.id} className={m.arsip ? 'opacity-55' : ''}>
                    <td className="max-w-72">
                      <p className="font-semibold text-ink">{m.nama}</p>
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-muted">
                        {m.deskripsi || 'Tanpa deskripsi'}
                      </p>
                    </td>
                    <td className="text-xs whitespace-nowrap text-mocha">
                      {m.kategori}
                    </td>
                    <td>
                      {m.resep.length === 0 ? (
                        <span className="badge bg-warning-soft text-warning">
                          Tanpa resep
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-semibold text-ink">
                            {m.resep.length} bahan
                          </span>
                          {m.resepEstimasi && (
                            <span className="badge bg-latte/60 text-coffee">
                              Estimasi
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          m.arsip
                            ? 'bg-sand text-muted'
                            : 'bg-success-soft text-success'
                        }`}
                      >
                        {m.arsip ? 'Diarsipkan' : 'Aktif'}
                      </span>
                    </td>
                    <td>
                      {bolehKelola ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setDiedit(m)
                              setModalBuka(true)
                            }}
                            title="Ubah menu"
                          >
                            <IconEdit className="size-3.5" />
                            <span className="hidden sm:inline">Ubah</span>
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setTargetArsip(m)}
                            title={m.arsip ? 'Aktifkan kembali' : 'Arsipkan menu'}
                          >
                            {m.arsip ? (
                              <IconRestore className="size-3.5" />
                            ) : (
                              <IconArchive className="size-3.5" />
                            )}
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
        )}
      </div>

      <MenuModal
        buka={modalBuka}
        tutup={() => setModalBuka(false)}
        menu={diedit}
        onSimpan={(input) => {
          try {
            if (diedit) {
              ubahMenu(diedit.id, input)
              toast.sukses(`Menu "${input.nama}" berhasil diperbarui.`)
            } else {
              tambahMenu(input)
              toast.sukses(`Menu "${input.nama}" berhasil ditambahkan.`)
            }
            setModalBuka(false)
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : 'Gagal menyimpan menu.',
            )
          }
        }}
      />

      <ConfirmDialog
        buka={targetArsip !== null}
        judul={targetArsip?.arsip ? 'Aktifkan kembali menu?' : 'Arsipkan menu?'}
        pesan={
          targetArsip?.arsip
            ? `Menu "${targetArsip?.nama}" akan ditampilkan kembali dan bisa dipilih saat mencatat penjualan.`
            : `Menu "${targetArsip?.nama}" akan disembunyikan dari pilihan penjualan. Riwayat penjualannya tetap tersimpan.`
        }
        labelKonfirmasi={targetArsip?.arsip ? 'Aktifkan' : 'Arsipkan'}
        bahaya={!targetArsip?.arsip}
        onTutup={() => setTargetArsip(null)}
        onKonfirmasi={konfirmasiArsip}
      />
    </div>
  )
}

function MenuModal({
  buka,
  tutup,
  menu,
  onSimpan,
}: {
  buka: boolean
  tutup: () => void
  menu: Menu | null
  onSimpan: (input: InputMenu) => void
}) {
  const { db, bahanMap } = useData()
  const [nama, setNama] = useState('')
  const [kategori, setKategori] = useState('')
  const [deskripsi, setDeskripsi] = useState('')
  const [estimasi, setEstimasi] = useState(true)
  const [resep, setResep] = useState<BarisResep[]>([])
  const [galat, setGalat] = useState('')

  useEffect(() => {
    if (!buka) return
    setGalat('')
    if (menu) {
      setNama(menu.nama)
      setKategori(menu.kategori)
      setDeskripsi(menu.deskripsi ?? '')
      setEstimasi(menu.resepEstimasi)
      setResep(menu.resep.map((r) => ({ bahanId: r.bahanId, jumlah: String(r.jumlah) })))
    } else {
      setNama('')
      setKategori(db.pengaturan.kategoriMenu[0] ?? 'Kopi & Minuman')
      setDeskripsi('')
      setEstimasi(true)
      setResep([])
    }
  }, [buka, menu, db.pengaturan.kategoriMenu])

  const opsiBahan = useMemo(() => {
    const aktif = db.bahan.filter((b) => !b.arsip)
    if (menu) {
      for (const r of menu.resep) {
        const lama = db.bahan.find((b) => b.id === r.bahanId)
        if (lama && !aktif.some((b) => b.id === lama.id)) aktif.push(lama)
      }
    }
    return aktif.sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
  }, [db.bahan, menu])

  const kategoriOpsi = useMemo(() => {
    const opsi = [...db.pengaturan.kategoriMenu]
    if (menu && !opsi.includes(menu.kategori)) opsi.push(menu.kategori)
    return opsi
  }, [db.pengaturan.kategoriMenu, menu])

  const tambahBaris = () => {
    const dipakai = new Set(resep.map((r) => r.bahanId))
    const calon = opsiBahan.find((b) => !dipakai.has(b.id)) ?? opsiBahan[0]
    if (!calon) return
    setResep((r) => [...r, { bahanId: calon.id, jumlah: '' }])
  }

  const ubahBaris = (indeks: number, patch: Partial<BarisResep>) => {
    setResep((r) => r.map((baris, i) => (i === indeks ? { ...baris, ...patch } : baris)))
  }

  const hapusBaris = (indeks: number) => {
    setResep((r) => r.filter((_, i) => i !== indeks))
  }

  const kirim = () => {
    setGalat('')
    if (!nama.trim()) return setGalat('Nama menu wajib diisi.')
    if (!kategori.trim()) return setGalat('Kategori menu wajib dipilih.')

    const daftar: ResepItem[] = []
    for (const baris of resep) {
      if (!baris.bahanId) return setGalat('Pilih bahan untuk setiap baris resep.')
      const jumlah = keDesimal(baris.jumlah)
      if (!(jumlah > 0)) {
        return setGalat('Jumlah bahan resep harus lebih dari 0.')
      }
      daftar.push({ bahanId: baris.bahanId, jumlah })
    }

    onSimpan({
      nama: nama.trim(),
      kategori,
      deskripsi: deskripsi.trim() || undefined,
      resep: daftar,
      resepEstimasi: estimasi,
    })
  }

  return (
    <Modal
      buka={buka}
      tutup={tutup}
      judul={menu ? 'Ubah Menu' : 'Tambah Menu'}
      deskripsi="Resep menentukan bahan apa saja yang dipotong saat menu terjual."
      lebar="lg"
      footer={
        <>
          <button className="btn btn-outline" onClick={tutup}>
            Batal
          </button>
          <button className="btn btn-primary" onClick={kirim}>
            {menu ? 'Simpan perubahan' : 'Tambah menu'}
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

        <Field label="Nama Menu" htmlFor="menu-nama">
          <input
            id="menu-nama"
            className="input"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="mis. Kopi Susu Gaoel"
            autoFocus
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kategori" htmlFor="menu-kategori">
            <select
              id="menu-kategori"
              className="input"
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
            >
              {kategoriOpsi.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Jenis Resep" htmlFor="menu-estimasi">
            <select
              id="menu-estimasi"
              className="input"
              value={estimasi ? 'estimasi' : 'resmi'}
              onChange={(e) => setEstimasi(e.target.value === 'estimasi')}
            >
              <option value="estimasi">Estimasi / contoh</option>
              <option value="resmi">Resep resmi kedai</option>
            </select>
          </Field>
        </div>

        <Field label="Deskripsi" htmlFor="menu-deskripsi">
          <textarea
            id="menu-deskripsi"
            rows={2}
            className="input resize-none"
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
            placeholder="Deskripsi singkat menu (opsional)"
          />
        </Field>

        <div className="rounded-xl border border-line">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3.5 py-2.5">
            <div>
              <p className="text-xs font-bold text-ink">Resep Bahan</p>
              <p className="text-[10px] text-muted">
                {resep.length === 0
                  ? 'Tanpa resep: penjualan menu ini tidak memotong stok.'
                  : `${resep.length} bahan akan dipotong per porsi.`}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={tambahBaris}
              disabled={opsiBahan.length === 0}
            >
              <IconPlus className="size-3.5" />
              Bahan
            </button>
          </div>

          <div className="space-y-2 p-3.5">
            {resep.length === 0 ? (
              <p className="py-3 text-center text-xs text-muted">
                Belum ada bahan resep.
              </p>
            ) : (
              resep.map((baris, indeks) => {
                const bahan = bahanMap.get(baris.bahanId)
                return (
                  <div
                    key={`${baris.bahanId}-${indeks}`}
                    className="flex items-center gap-2"
                  >
                    <select
                      className="input min-w-0 flex-1"
                      value={baris.bahanId}
                      onChange={(e) => ubahBaris(indeks, { bahanId: e.target.value })}
                      aria-label="Bahan resep"
                    >
                      {opsiBahan.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nama} ({b.satuan})
                        </option>
                      ))}
                    </select>
                    <div className="relative w-28 shrink-0">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        className="input pr-12"
                        value={baris.jumlah}
                        onChange={(e) => ubahBaris(indeks, { jumlah: e.target.value })}
                        placeholder="0"
                        aria-label="Jumlah bahan"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[10px] text-muted">
                        {bahan?.satuan ?? ''}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm shrink-0 text-danger hover:bg-danger-soft"
                      onClick={() => hapusBaris(indeks)}
                      aria-label="Hapus bahan resep"
                    >
                      <IconTrash className="size-3.5" />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <p className="rounded-xl border border-line bg-cream px-3.5 py-3 text-[11px] leading-relaxed text-muted">
          Resep bawaan katalog bersifat estimasi, bukan takaran resmi kedai.
          Sesuaikan jumlah bahan agar pemotongan stok sesuai praktik dapur.
        </p>
      </div>
    </Modal>
  )
}
