import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData, type InputBahan } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import type { Bahan, StatusStok } from '../types'
import {
  IconArchive,
  IconBox,
  IconEdit,
  IconPlus,
  IconRestore,
  IconSearch,
} from '../components/Icons'
import { BadgeStok } from '../components/ui/Badge'
import { ConfirmDialog, Modal } from '../components/ui/Modal'
import { EmptyState, Field, PageHeader } from '../components/ui/Field'
import { formatAngka } from '../lib/format'
import { keDesimal } from '../lib/id'

const GAYA_BAR: Record<StatusStok, string> = {
  aman: 'bg-success',
  menipis: 'bg-warning',
  habis: 'bg-danger',
}

export function BahanPage() {
  const { user, modeOnline } = useAuth()
  const { db, stok, tambahBahan, ubahBahan, arsipBahan } = useData()
  const toast = useToast()
  const [params] = useSearchParams()
  // Master data (bahan) hanya dikelola admin, sama seperti policy RLS di cloud.
  const bolehKelola = !modeOnline || user?.role === 'admin'

  const [cari, setCari] = useState('')
  const [kategori, setKategori] = useState('semua')
  const [status, setStatus] = useState(params.get('status') ?? 'semua')
  const [tampilArsip, setTampilArsip] = useState(false)
  const [modalBuka, setModalBuka] = useState(false)
  const [diedit, setDiedit] = useState<Bahan | null>(null)
  const [targetArsip, setTargetArsip] = useState<Bahan | null>(null)

  const daftar = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return db.bahan
      .filter((b) => (tampilArsip ? true : !b.arsip))
      .filter((b) => (kategori === 'semua' ? true : b.kategori === kategori))
      .filter((b) => {
        if (status === 'semua') return true
        return (stok.get(b.id)?.status ?? 'habis') === status
      })
      .filter((b) =>
        q
          ? b.nama.toLowerCase().includes(q) ||
            b.kategori.toLowerCase().includes(q)
          : true,
      )
      .sort((a, b) => {
        if (a.arsip !== b.arsip) return a.arsip ? 1 : -1
        return a.nama.localeCompare(b.nama, 'id')
      })
  }, [cari, db.bahan, kategori, status, stok, tampilArsip])

  const jumlahMenipis = daftar.filter(
    (b) => (stok.get(b.id)?.status ?? 'aman') !== 'aman',
  ).length

  const bukaTambah = () => {
    setDiedit(null)
    setModalBuka(true)
  }

  const bukaEdit = (bahan: Bahan) => {
    setDiedit(bahan)
    setModalBuka(true)
  }

  const konfirmasiArsip = () => {
    if (!targetArsip) return
    try {
      arsipBahan(targetArsip.id, !targetArsip.arsip)
      toast.sukses(
        targetArsip.arsip
          ? `Bahan "${targetArsip.nama}" diaktifkan kembali.`
          : `Bahan "${targetArsip.nama}" diarsipkan.`,
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mengubah bahan.')
    } finally {
      setTargetArsip(null)
    }
  }

  return (
    <div className="animate-rise">
      <PageHeader
        judul="Bahan & Stok"
        deskripsi="Kelola daftar bahan kedai, stok minimum, dan pantau persediaan tanpa perhitungan uang."
        aksi={
          bolehKelola ? (
            <button className="btn btn-primary" onClick={bukaTambah}>
              <IconPlus className="size-4" />
              Tambah Bahan
            </button>
          ) : undefined
        }
      />

      <div className="card mb-4 flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <input
            className="input pl-9"
            placeholder="Cari nama atau kategori bahan…"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            className="input sm:w-44"
            value={kategori}
            onChange={(e) => setKategori(e.target.value)}
            aria-label="Filter kategori"
          >
            <option value="semua">Semua kategori</option>
            {db.pengaturan.kategoriBahan.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <select
            className="input sm:w-40"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter status stok"
          >
            <option value="semua">Semua status</option>
            <option value="aman">Aman</option>
            <option value="menipis">Menipis</option>
            <option value="habis">Habis</option>
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
            Menampilkan <b className="text-coffee">{daftar.length}</b> bahan
          </span>
          <span>
            Nilai tampil:{' '}
            <b className="text-coffee">
              {jumlahMenipis > 0 ? `${jumlahMenipis} perlu restock` : 'stok aman'}
            </b>
          </span>
        </div>

        {daftar.length === 0 ? (
          <EmptyState
            judul="Tidak ada bahan"
            pesan={
              cari || status !== 'semua' || kategori !== 'semua'
                ? 'Coba ubah kata kunci atau filter Anda.'
                : 'Tambahkan bahan pertama untuk mulai mencatat stok.'
            }
            ikon={<IconBox className="size-5" />}
            aksi={
              bolehKelola ? (
                <button className="btn btn-primary btn-sm" onClick={bukaTambah}>
                  <IconPlus className="size-3.5" /> Tambah bahan
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-banggala min-w-[720px]">
              <thead>
                <tr>
                  <th>Bahan</th>
                  <th>Stok Saat Ini</th>
                  <th className="text-right">Stok Min.</th>
                  <th>Status</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {daftar.map((b) => {
                  const info = stok.get(b.id)!
                  const persen = Math.min(
                    100,
                    (info.stok / Math.max(b.stokMin * 2, 0.001)) * 100,
                  )
                  return (
                    <tr key={b.id} className={b.arsip ? 'opacity-55' : ''}>
                      <td>
                        <p className="font-semibold text-ink">{b.nama}</p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {b.kategori}
                          {b.arsip && ' · diarsipkan'}
                        </p>
                      </td>
                      <td className="min-w-44">
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-ink">
                            {formatAngka(info.stok)}
                          </span>
                          <span className="text-[11px] text-muted">{b.satuan}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full max-w-44 overflow-hidden rounded-full bg-sand">
                          <div
                            className={`h-full rounded-full ${GAYA_BAR[info.status]}`}
                            style={{ width: `${Math.max(persen, 2)}%` }}
                          />
                        </div>
                      </td>
                      <td className="text-right text-xs whitespace-nowrap text-muted">
                        {formatAngka(b.stokMin)} {b.satuan}
                      </td>
                      <td>
                        <BadgeStok status={info.status} />
                      </td>
                      <td>
                        {bolehKelola ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => bukaEdit(b)}
                              title="Ubah bahan"
                            >
                              <IconEdit className="size-3.5" />
                              <span className="hidden sm:inline">Ubah</span>
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => setTargetArsip(b)}
                              title={b.arsip ? 'Aktifkan kembali' : 'Arsipkan bahan'}
                            >
                              {b.arsip ? (
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
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BahanModal
        buka={modalBuka}
        tutup={() => setModalBuka(false)}
        bahan={diedit}
        onSimpan={(input) => {
          try {
            if (diedit) {
              ubahBahan(diedit.id, input)
              toast.sukses(`Bahan "${input.nama}" berhasil diperbarui.`)
            } else {
              tambahBahan(input)
              toast.sukses(`Bahan "${input.nama}" berhasil ditambahkan.`)
            }
            setModalBuka(false)
          } catch (error) {
            toast.error(
              error instanceof Error ? error.message : 'Gagal menyimpan bahan.',
            )
          }
        }}
      />

      <ConfirmDialog
        buka={targetArsip !== null}
        judul={targetArsip?.arsip ? 'Aktifkan kembali bahan?' : 'Arsipkan bahan?'}
        pesan={
          targetArsip?.arsip
            ? `Bahan "${targetArsip?.nama}" akan ditampilkan kembali di daftar bahan aktif.`
            : `Bahan "${targetArsip?.nama}" akan disembunyikan dari daftar aktif. Riwayat mutasinya tetap tersimpan.`
        }
        labelKonfirmasi={targetArsip?.arsip ? 'Aktifkan' : 'Arsipkan'}
        bahaya={!targetArsip?.arsip}
        onTutup={() => setTargetArsip(null)}
        onKonfirmasi={konfirmasiArsip}
      />
    </div>
  )
}

function BahanModal({
  buka,
  tutup,
  bahan,
  onSimpan,
}: {
  buka: boolean
  tutup: () => void
  bahan: Bahan | null
  onSimpan: (input: InputBahan) => void
}) {
  const { db } = useData()
  const [nama, setNama] = useState('')
  const [kategori, setKategori] = useState('')
  const [satuan, setSatuan] = useState('')
  const [stokMin, setStokMin] = useState('0')
  const [stokAwal, setStokAwal] = useState('')
  const [galat, setGalat] = useState('')

  useEffect(() => {
    if (!buka) return
    setGalat('')
    if (bahan) {
      setNama(bahan.nama)
      setKategori(bahan.kategori)
      setSatuan(bahan.satuan)
      setStokMin(String(bahan.stokMin))
    } else {
      setNama('')
      setKategori(db.pengaturan.kategoriBahan[0] ?? 'Lainnya')
      setSatuan(db.pengaturan.satuanBahan[0] ?? 'pcs')
      setStokMin('0')
    }
    setStokAwal('')
  }, [buka, bahan, db.pengaturan.kategoriBahan, db.pengaturan.satuanBahan])

  const kategoriOpsi = useMemo(() => {
    const opsi = [...db.pengaturan.kategoriBahan]
    if (bahan && !opsi.includes(bahan.kategori)) opsi.push(bahan.kategori)
    return opsi
  }, [bahan, db.pengaturan.kategoriBahan])

  const satuanOpsi = useMemo(() => {
    const opsi = [...db.pengaturan.satuanBahan]
    if (bahan && !opsi.includes(bahan.satuan)) opsi.push(bahan.satuan)
    return opsi
  }, [bahan, db.pengaturan.satuanBahan])

  const kirim = () => {
    setGalat('')
    if (!nama.trim()) {
      setGalat('Nama bahan wajib diisi.')
      return
    }
    if (!satuan.trim()) {
      setGalat('Satuan wajib dipilih.')
      return
    }
    onSimpan({
      nama: nama.trim(),
      kategori,
      satuan,
      stokMin: Math.max(0, keDesimal(stokMin)),
      stokAwal: bahan ? 0 : Math.max(0, keDesimal(stokAwal)),
    })
  }

  return (
    <Modal
      buka={buka}
      tutup={tutup}
      judul={bahan ? 'Ubah Bahan' : 'Tambah Bahan'}
      deskripsi={
        bahan
          ? 'Perubahan stok dilakukan melalui menu Mutasi Stok.'
          : 'Lengkapi informasi bahan yang dipakai kedai.'
      }
      footer={
        <>
          <button className="btn btn-outline" onClick={tutup}>
            Batal
          </button>
          <button className="btn btn-primary" onClick={kirim}>
            {bahan ? 'Simpan perubahan' : 'Tambah bahan'}
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

        <Field label="Nama Bahan" htmlFor="bahan-nama">
          <input
            id="bahan-nama"
            className="input"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="mis. Biji Kopi Arabika"
            autoFocus
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kategori" htmlFor="bahan-kategori">
            <select
              id="bahan-kategori"
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
          <Field label="Satuan" htmlFor="bahan-satuan">
            <select
              id="bahan-satuan"
              className="input"
              value={satuan}
              onChange={(e) => setSatuan(e.target.value)}
            >
              {satuanOpsi.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Stok Minimum"
            htmlFor="bahan-min"
            hint="Bahan akan ditandai menipis jika stok ≤ angka ini."
          >
            <div className="relative">
              <input
                id="bahan-min"
                type="number"
                min={0}
                step="any"
                className="input pr-14"
                value={stokMin}
                onChange={(e) => setStokMin(e.target.value)}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] text-muted">
                {satuan || 'satuan'}
              </span>
            </div>
          </Field>

          {!bahan && (
            <Field
              label="Stok Awal (opsional)"
              htmlFor="bahan-awal"
              hint="Akan dicatat sebagai mutasi stok masuk."
            >
              <div className="relative">
                <input
                  id="bahan-awal"
                  type="number"
                  min={0}
                  step="any"
                  className="input pr-14"
                  value={stokAwal}
                  onChange={(e) => setStokAwal(e.target.value)}
                  placeholder="0"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] text-muted">
                  {satuan || 'satuan'}
                </span>
              </div>
            </Field>
          )}
        </div>

        {bahan && (
          <div className="rounded-xl border border-line bg-cream px-3.5 py-3 text-xs leading-relaxed text-muted">
            Untuk menambah atau mengurangi stok, gunakan menu{' '}
            <span className="font-semibold text-coffee">Mutasi Stok</span>. Stok
            saat ini dihitung otomatis dari seluruh riwayat mutasi.
          </div>
        )}
      </div>
    </Modal>
  )
}
