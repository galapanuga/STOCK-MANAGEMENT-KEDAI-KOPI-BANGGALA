import { useMemo, useRef, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import type { DB, HariKey, JamOperasional } from '../types'
import {
  IconCalendar,
  IconDownload,
  IconInfo,
  IconKey,
  IconPlus,
  IconRestore,
  IconShield,
  IconUpload,
  IconX,
} from '../components/Icons'
import { ConfirmDialog } from '../components/ui/Modal'
import { Field, PageHeader, SectionHeader } from '../components/ui/Field'
import { unduhJSON } from '../lib/csv'
import { verifikasiPassword } from '../lib/auth'
import {
  formatTanggalWaktu,
  keTanggalInput,
} from '../lib/format'
import { namaHariIndo, URUTAN_HARI } from '../lib/operasional'
import { apakahSupabaseAktif } from '../lib/supabase'
import { migrasiSemuaKeCloud } from '../lib/cloudDb'

export function PengaturanPage() {
  const { user, gantiPassword } = useAuth()
  const {
    db,
    simpanPengaturan,
    tambahKategori,
    hapusKategori,
    tambahSatuan,
    hapusSatuan,
    pulihkanBackup,
    resetStok,
  } = useData()
  const toast = useToast()

  const [identitas, setIdentitas] = useState({
    namaKedai: db.pengaturan.namaKedai,
    tagline: db.pengaturan.tagline,
    alamat: db.pengaturan.alamat,
    kota: db.pengaturan.kota,
    tanggalBerdiri: db.pengaturan.tanggalBerdiri,
    halalId: db.pengaturan.halalId,
    instagram: db.pengaturan.instagram,
    tiktok: db.pengaturan.tiktok,
    situsUrl: db.pengaturan.situsUrl,
    mapsUrl: db.pengaturan.mapsUrl,
    gofoodUrl: db.pengaturan.gofoodUrl,
    grabfoodUrl: db.pengaturan.grabfoodUrl,
  })
  const [jam, setJam] = useState<JamOperasional>(db.pengaturan.jamOperasional)

  const [passwordLama, setPasswordLama] = useState('')
  const [passwordBaru, setPasswordBaru] = useState('')
  const [passwordUlang, setPasswordUlang] = useState('')
  const [galatPassword, setGalatPassword] = useState('')
  const [memprosesPassword, setMemprosesPassword] = useState(false)

  const [konfirmasiReset, setKonfirmasiReset] = useState(false)
  const [memprosesReset, setMemprosesReset] = useState(false)
  const [calonBackup, setCalonBackup] = useState<DB | null>(null)
  const inputFile = useRef<HTMLInputElement>(null)

  const ukuranData = useMemo(() => {
    try {
      return new Blob([JSON.stringify(db)]).size
    } catch {
      return 0
    }
  }, [db])

  const ubahIdentitas = (kunci: keyof typeof identitas, nilai: string) => {
    setIdentitas((lama) => ({ ...lama, [kunci]: nilai }))
  }

  const simpanIdentitas = (e: FormEvent) => {
    e.preventDefault()
    if (!identitas.namaKedai.trim()) {
      toast.error('Nama kedai wajib diisi.')
      return
    }
    simpanPengaturan({
      ...identitas,
      namaKedai: identitas.namaKedai.trim(),
      tagline: identitas.tagline.trim(),
      alamat: identitas.alamat.trim(),
      kota: identitas.kota.trim(),
      halalId: identitas.halalId.trim(),
      instagram: identitas.instagram.trim(),
      tiktok: identitas.tiktok.trim(),
      situsUrl: identitas.situsUrl.trim(),
      mapsUrl: identitas.mapsUrl.trim(),
      gofoodUrl: identitas.gofoodUrl.trim(),
      grabfoodUrl: identitas.grabfoodUrl.trim(),
    })
    toast.sukses('Identitas kedai berhasil disimpan.')
  }

  const ubahJam = (hari: HariKey, patch: Partial<JamOperasional[HariKey]>) => {
    setJam((lama) => ({ ...lama, [hari]: { ...lama[hari], ...patch } }))
  }

  const simpanJam = () => {
    simpanPengaturan({ jamOperasional: jam })
    toast.sukses('Jam operasional berhasil disimpan.')
  }

  const simpanPassword = async (e: FormEvent) => {
    e.preventDefault()
    setGalatPassword('')
    if (!user) return
    if (!passwordLama) return setGalatPassword('Masukkan password saat ini.')
    if (passwordBaru.length < 6) return setGalatPassword('Password baru minimal 6 karakter.')
    if (passwordBaru !== passwordUlang) {
      return setGalatPassword('Konfirmasi password baru tidak sama.')
    }
    setMemprosesPassword(true)
    try {
      const cocok = await verifikasiPassword(
        passwordLama,
        user.salt,
        user.passwordHash,
      )
      if (!cocok) {
        setGalatPassword('Password saat ini salah.')
        return
      }
      await gantiPassword(user.id, passwordBaru)
      setPasswordLama('')
      setPasswordBaru('')
      setPasswordUlang('')
      toast.sukses('Password berhasil diperbarui.')
    } catch (error) {
      setGalatPassword(
        error instanceof Error ? error.message : 'Gagal mengubah password.',
      )
    } finally {
      setMemprosesPassword(false)
    }
  }

  const buatBackup = () => {
    unduhJSON(`backup-banggala_${keTanggalInput(new Date())}.json`, db)
    toast.sukses('Backup data berhasil diunduh.')
  }

  const pilihFile = async (file: File | undefined) => {
    if (!file) return
    try {
      const teks = await file.text()
      const data = JSON.parse(teks) as DB
      if (
        !data ||
        !Array.isArray(data.users) ||
        !Array.isArray(data.bahan) ||
        !Array.isArray(data.mutasi)
      ) {
        throw new Error('Struktur file tidak sesuai.')
      }
      if (data.users.length === 0) throw new Error('File backup tidak memiliki akun.')
      setCalonBackup(data)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `Backup tidak valid: ${error.message}`
          : 'Backup tidak valid.',
      )
    } finally {
      if (inputFile.current) inputFile.current.value = ''
    }
  }

  const terapkanBackup = () => {
    if (!calonBackup) return
    try {
      pulihkanBackup(calonBackup)
      toast.sukses('Data berhasil dipulihkan dari backup.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal memulihkan data.')
    } finally {
      setCalonBackup(null)
    }
  }

  const jalankanReset = async () => {
    setMemprosesReset(true)
    try {
      await resetStok()
      toast.sukses('Data bahan, menu, dan penjualan berhasil direset ke contoh awal.')
      setKonfirmasiReset(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal mereset data.')
    } finally {
      setMemprosesReset(false)
    }
  }

  const [konfirmasiMigrasi, setKonfirmasiMigrasi] = useState(false)
  const [sedangMigrasi, setSedangMigrasi] = useState(false)
  const [progresMigrasi, setProgresMigrasi] = useState(0)
  const [pesanMigrasi, setPesanMigrasi] = useState('')

  const jalankanMigrasiCloud = async () => {
    if (!apakahSupabaseAktif) {
      toast.error(
        'Supabase belum dikonfigurasi. Atur VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env terlebih dahulu.',
      )
      return
    }

    setSedangMigrasi(true)
    setProgresMigrasi(5)
    setPesanMigrasi('Menghubungkan ke Supabase Cloud…')

    try {
      const hasil = await migrasiSemuaKeCloud(db, (pesan, persen) => {
        setPesanMigrasi(pesan)
        setProgresMigrasi(persen)
      })

      if (hasil.sukses) {
        toast.sukses(hasil.pesan)
      } else {
        toast.error(hasil.pesan)
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Terjadi kesalahan saat migrasi.',
      )
    } finally {
      setSedangMigrasi(false)
      setKonfirmasiMigrasi(false)
    }
  }

  return (
    <div className="animate-rise">
      <PageHeader
        judul="Pengaturan"
        deskripsi="Atur identitas kedai, jam operasional, master data, keamanan akun, dan cadangan data."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="card xl:col-span-2">
          <SectionHeader
            judul="Identitas Kedai"
            deskripsi="Dipakai di dashboard, halaman login, dan laporan cetak. Tanpa nomor telepon."
          />
          <form onSubmit={simpanIdentitas} className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Nama Kedai" htmlFor="set-nama">
              <input
                id="set-nama"
                className="input"
                value={identitas.namaKedai}
                onChange={(e) => ubahIdentitas('namaKedai', e.target.value)}
              />
            </Field>
            <Field label="Tagline" htmlFor="set-tagline">
              <input
                id="set-tagline"
                className="input"
                value={identitas.tagline}
                onChange={(e) => ubahIdentitas('tagline', e.target.value)}
              />
            </Field>
            <Field label="Alamat" htmlFor="set-alamat" className="sm:col-span-2">
              <textarea
                id="set-alamat"
                rows={2}
                className="input resize-none"
                value={identitas.alamat}
                onChange={(e) => ubahIdentitas('alamat', e.target.value)}
              />
            </Field>
            <Field label="Kota" htmlFor="set-kota">
              <input
                id="set-kota"
                className="input"
                value={identitas.kota}
                onChange={(e) => ubahIdentitas('kota', e.target.value)}
              />
            </Field>
            <Field label="Tanggal Berdiri" htmlFor="set-berdiri">
              <input
                id="set-berdiri"
                type="date"
                className="input"
                value={identitas.tanggalBerdiri}
                onChange={(e) => ubahIdentitas('tanggalBerdiri', e.target.value)}
              />
            </Field>
            <Field label="ID Halal" htmlFor="set-halal">
              <input
                id="set-halal"
                className="input"
                value={identitas.halalId}
                onChange={(e) => ubahIdentitas('halalId', e.target.value)}
              />
            </Field>
            <Field label="Instagram" htmlFor="set-ig">
              <input
                id="set-ig"
                className="input"
                value={identitas.instagram}
                onChange={(e) => ubahIdentitas('instagram', e.target.value)}
                placeholder="kedaikopibanggala"
              />
            </Field>
            <Field label="TikTok" htmlFor="set-tiktok">
              <input
                id="set-tiktok"
                className="input"
                value={identitas.tiktok}
                onChange={(e) => ubahIdentitas('tiktok', e.target.value)}
                placeholder="kopibanggala"
              />
            </Field>
            <Field label="Situs Profil" htmlFor="set-situs">
              <input
                id="set-situs"
                className="input"
                value={identitas.situsUrl}
                onChange={(e) => ubahIdentitas('situsUrl', e.target.value)}
              />
            </Field>
            <Field label="Google Maps" htmlFor="set-maps">
              <input
                id="set-maps"
                className="input"
                value={identitas.mapsUrl}
                onChange={(e) => ubahIdentitas('mapsUrl', e.target.value)}
              />
            </Field>
            <Field label="GoFood" htmlFor="set-gofood">
              <input
                id="set-gofood"
                className="input"
                value={identitas.gofoodUrl}
                onChange={(e) => ubahIdentitas('gofoodUrl', e.target.value)}
              />
            </Field>
            <Field label="GrabFood" htmlFor="set-grab">
              <input
                id="set-grab"
                className="input"
                value={identitas.grabfoodUrl}
                onChange={(e) => ubahIdentitas('grabfoodUrl', e.target.value)}
              />
            </Field>
            <div className="flex justify-end sm:col-span-2">
              <button type="submit" className="btn btn-primary">
                Simpan identitas
              </button>
            </div>
          </form>
        </section>

        <section className="card xl:col-span-2">
          <SectionHeader
            judul="Jam Operasional"
            deskripsi="Status buka/tutup dihitung memakai waktu Asia/Jakarta (WIB)."
            aksi={
              <button className="btn btn-primary btn-sm" onClick={simpanJam}>
                Simpan jam
              </button>
            }
          />
          <div className="grid gap-2 p-5 sm:grid-cols-2 lg:grid-cols-4">
            {URUTAN_HARI.map((hari) => {
              const jadwal = jam[hari]
              return (
                <div
                  key={hari}
                  className={`rounded-xl border p-3 transition-colors ${
                    jadwal.buka ? 'border-line bg-white' : 'border-line bg-sand/50'
                  }`}
                >
                  <label className="flex cursor-pointer items-center justify-between gap-2">
                    <span className="text-xs font-bold text-ink">
                      {namaHariIndo(hari)}
                    </span>
                    <input
                      type="checkbox"
                      checked={jadwal.buka}
                      onChange={(e) => ubahJam(hari, { buka: e.target.checked })}
                      className="size-3.5 accent-espresso"
                      aria-label={`Buka hari ${namaHariIndo(hari)}`}
                    />
                  </label>
                  <div className="mt-2 flex items-center gap-1.5">
                    <input
                      type="time"
                      className="input px-2 py-1.5 text-xs"
                      value={jadwal.mulai}
                      onChange={(e) => ubahJam(hari, { mulai: e.target.value })}
                      disabled={!jadwal.buka}
                      aria-label={`Jam buka ${namaHariIndo(hari)}`}
                    />
                    <span className="text-[10px] text-muted">–</span>
                    <input
                      type="time"
                      className="input px-2 py-1.5 text-xs"
                      value={jadwal.selesai}
                      onChange={(e) => ubahJam(hari, { selesai: e.target.value })}
                      disabled={!jadwal.buka}
                      aria-label={`Jam tutup ${namaHariIndo(hari)}`}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted">
                    {jadwal.buka ? 'Buka' : 'Libur'}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        <section className="card">
          <SectionHeader
            judul="Kategori & Satuan"
            deskripsi="Daftar pilihan yang muncul saat menambah bahan."
          />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <DaftarMaster
              judul="Kategori Bahan"
              daftar={db.pengaturan.kategoriBahan}
              placeholder="mis. Biji Kopi"
              onTambah={(v) => {
                try {
                  tambahKategori(v)
                  toast.sukses(`Kategori "${v}" ditambahkan.`)
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Gagal menambah kategori.')
                }
              }}
              onHapus={(v) => {
                try {
                  hapusKategori(v)
                  toast.sukses(`Kategori "${v}" dihapus.`)
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Gagal menghapus kategori.')
                }
              }}
            />
            <DaftarMaster
              judul="Satuan"
              daftar={db.pengaturan.satuanBahan}
              placeholder="mis. pack"
              onTambah={(v) => {
                try {
                  tambahSatuan(v)
                  toast.sukses(`Satuan "${v}" ditambahkan.`)
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Gagal menambah satuan.')
                }
              }}
              onHapus={(v) => {
                try {
                  hapusSatuan(v)
                  toast.sukses(`Satuan "${v}" dihapus.`)
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Gagal menghapus satuan.')
                }
              }}
            />
          </div>
        </section>

        <section className="card">
          <SectionHeader
            judul="Keamanan Akun"
            deskripsi="Ubah password akun yang sedang digunakan."
          />
          <form onSubmit={simpanPassword} className="space-y-4 p-5">
            {galatPassword && (
              <p className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-xs text-danger">
                {galatPassword}
              </p>
            )}
            <Field label="Password Saat Ini" htmlFor="pw-lama">
              <input
                id="pw-lama"
                type="password"
                className="input"
                value={passwordLama}
                onChange={(e) => setPasswordLama(e.target.value)}
                autoComplete="current-password"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Password Baru" htmlFor="pw-baru">
                <input
                  id="pw-baru"
                  type="password"
                  className="input"
                  value={passwordBaru}
                  onChange={(e) => setPasswordBaru(e.target.value)}
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Ulangi Password Baru" htmlFor="pw-ulang">
                <input
                  id="pw-ulang"
                  type="password"
                  className="input"
                  value={passwordUlang}
                  onChange={(e) => setPasswordUlang(e.target.value)}
                  autoComplete="new-password"
                />
              </Field>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-[11px] text-muted">
                <IconKey className="size-3.5" />
                Minimal 6 karakter
              </p>
              <button className="btn btn-primary" disabled={memprosesPassword}>
                {memprosesPassword ? 'Menyimpan…' : 'Ubah password'}
              </button>
            </div>
          </form>
        </section>

        <section className="card xl:col-span-2">
          <SectionHeader
            judul="Data & Backup"
            deskripsi="Seluruh data tersimpan di browser perangkat ini."
          />
          <div className="space-y-4 p-5">
            {/* Kartu Migrasi Supabase Cloud */}
            <div className="rounded-xl border border-line bg-cream/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-coffee">
                    <span
                      className={`size-2 rounded-full ${apakahSupabaseAktif ? 'bg-success' : 'bg-latte'}`}
                    />
                    Supabase Cloud Database
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted">
                    {apakahSupabaseAktif
                      ? 'Terhubung. Sinkronkan seluruh katalog menu, bahan baku, stok, dan riwayat transaksi ke cloud.'
                      : 'Belum terhubung. Konfigurasikan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env.'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!apakahSupabaseAktif || sedangMigrasi}
                  className="btn btn-primary btn-sm whitespace-nowrap"
                  onClick={() => setKonfirmasiMigrasi(true)}
                >
                  {sedangMigrasi
                    ? 'Memproses Migrasi…'
                    : 'Migrasikan Data Lokal ke Cloud'}
                </button>
              </div>

              {sedangMigrasi && (
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-[11px] font-semibold text-coffee">
                    <span>{pesanMigrasi}</span>
                    <span>{progresMigrasi}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full bg-caramel transition-all duration-300"
                      style={{ width: `${progresMigrasi}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl bg-cream px-4 py-3 text-xs">
              <span className="text-muted">
                {db.users.length} akun · {db.bahan.length} bahan · {db.menu.length} menu ·{' '}
                {db.penjualan.length} penjualan · {db.mutasi.length} mutasi
              </span>
              <span className="font-semibold whitespace-nowrap text-coffee">
                ± {(ukuranData / 1024).toFixed(1)} KB
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button className="btn btn-outline" onClick={buatBackup}>
                <IconDownload className="size-4" />
                Unduh backup JSON
              </button>
              <button
                className="btn btn-outline"
                onClick={() => inputFile.current?.click()}
              >
                <IconUpload className="size-4" />
                Pulihkan backup
              </button>
              <input
                ref={inputFile}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => pilihFile(e.target.files?.[0])}
              />
            </div>

            <div className="rounded-xl border border-danger/20 bg-danger-soft/40 p-3.5">
              <p className="flex items-center gap-1.5 text-xs font-bold text-danger">
                <IconShield className="size-3.5" />
                Zona berbahaya
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-mocha">
                Reset akan mengembalikan bahan, menu, penjualan, dan mutasi ke
                data contoh awal. Akun & pengaturan kedai tetap dipertahankan.
                Unduh backup terlebih dahulu.
              </p>
              <button
                className="btn btn-danger btn-sm mt-2.5"
                onClick={() => setKonfirmasiReset(true)}
              >
                <IconRestore className="size-3.5" />
                Reset data operasional
              </button>
            </div>
          </div>
        </section>
      </div>

      <section className="card mt-4">
        <SectionHeader
          judul="Log Aktivitas"
          deskripsi="25 aktivitas terakhir di sistem ini"
          aksi={
            <span className="text-[11px] text-muted">
              {db.log.length} catatan tersimpan
            </span>
          }
        />
        {db.log.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">
            Belum ada aktivitas tercatat.
          </p>
        ) : (
          <ul className="divide-y divide-line/70">
            {db.log.slice(0, 25).map((log) => (
              <li
                key={log.id}
                className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-sand text-mocha">
                    <IconCalendar className="size-3.5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-ink">
                      {log.aksi}
                      <span className="ml-2 font-normal text-muted">
                        · {log.userName}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                      {log.detail}
                    </p>
                  </div>
                </div>
                <span className="pl-10 text-[10px] whitespace-nowrap text-muted sm:pl-0">
                  {formatTanggalWaktu(log.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-muted">
        <IconInfo className="mt-0.5 size-3.5 shrink-0" />
        Data tersimpan pada localStorage browser. Menghapus data situs/browser
        akan menghilangkan seluruh catatan, jadi lakukan backup rutin dan
        simpan file di tempat aman.
      </p>

      <ConfirmDialog
        buka={konfirmasiReset}
        judul="Reset data operasional?"
        pesan={
          <>
            Seluruh bahan, menu, penjualan, dan mutasi saat ini akan diganti
            dengan data contoh awal. Tindakan ini{' '}
            <b className="text-danger">tidak bisa dibatalkan</b>. Akun pengguna
            dan identitas kedai tetap tersimpan.
          </>
        }
        labelKonfirmasi="Ya, reset data"
        bahaya
        sedangProses={memprosesReset}
        onTutup={() => setKonfirmasiReset(false)}
        onKonfirmasi={jalankanReset}
      />

      <ConfirmDialog
        buka={calonBackup !== null}
        judul="Pulihkan data dari backup?"
        pesan={
          <>
            Data saat ini akan <b className="text-danger">ditimpa seluruhnya</b>{' '}
            dengan isi backup
            {calonBackup
              ? ` (${calonBackup.users.length} akun, ${calonBackup.bahan.length} bahan, ${calonBackup.mutasi.length} mutasi)`
              : ''}
            . Pastikan Anda sudah mengunduh backup data terbaru.
          </>
        }
        labelKonfirmasi="Pulihkan data"
        bahaya
        onTutup={() => setCalonBackup(null)}
        onKonfirmasi={terapkanBackup}
      />

      <ConfirmDialog
        buka={konfirmasiMigrasi}
        judul="Migrasikan data lokal ke Supabase Cloud?"
        pesan={
          <>
            Seluruh data lokal ({db.bahan.length} bahan, {db.menu.length} menu,{' '}
            {db.penjualan.length} transaksi penjualan, dan {db.mutasi.length} riwayat mutasi stok)
            akan disalin ke database Supabase Cloud. Data di cloud akan diperbarui dan diselaraskan
            secara multi-perangkat.
          </>
        }
        labelKonfirmasi={sedangMigrasi ? 'Memproses…' : 'Mulai Migrasi'}
        onTutup={() => !sedangMigrasi && setKonfirmasiMigrasi(false)}
        onKonfirmasi={jalankanMigrasiCloud}
      />
    </div>
  )
}

function DaftarMaster({
  judul,
  daftar,
  placeholder,
  onTambah,
  onHapus,
}: {
  judul: string
  daftar: string[]
  placeholder: string
  onTambah: (nilai: string) => void
  onHapus: (nilai: string) => void
}) {
  const [nilai, setNilai] = useState('')

  const kirim = (e: FormEvent) => {
    e.preventDefault()
    const bersih = nilai.trim()
    if (!bersih) return
    onTambah(bersih)
    setNilai('')
  }

  return (
    <div>
      <p className="mb-2 text-[11px] font-bold tracking-wider text-mocha uppercase">
        {judul}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {daftar.map((d) => (
          <span
            key={d}
            className="inline-flex items-center gap-1 rounded-lg border border-line bg-white py-1 pr-1 pl-2 text-[11px] font-medium text-coffee"
          >
            {d}
            <button
              type="button"
              onClick={() => onHapus(d)}
              className="grid size-5 place-items-center rounded text-muted hover:bg-danger-soft hover:text-danger"
              title={`Hapus ${d}`}
              aria-label={`Hapus ${d}`}
            >
              <IconX className="size-3" />
            </button>
          </span>
        ))}
        {daftar.length === 0 && (
          <p className="text-xs text-muted">Belum ada data.</p>
        )}
      </div>
      <form onSubmit={kirim} className="mt-2.5 flex gap-1.5">
        <input
          className="input py-1.5 text-xs"
          value={nilai}
          onChange={(e) => setNilai(e.target.value)}
          placeholder={placeholder}
        />
        <button className="btn btn-outline btn-sm shrink-0" type="submit">
          <IconPlus className="size-3.5" />
        </button>
      </form>
    </div>
  )
}
