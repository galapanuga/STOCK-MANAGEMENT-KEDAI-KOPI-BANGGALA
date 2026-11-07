import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import type { Role, User } from '../types'
import {
  IconEdit,
  IconEye,
  IconEyeOff,
  IconInfo,
  IconKey,
  IconPlus,
  IconShield,
  IconUser,
} from '../components/Icons'
import { BadgeAktif, BadgePeran } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { EmptyState, Field, PageHeader } from '../components/ui/Field'
import { formatTanggal } from '../lib/format'

export function PenggunaPage() {
  const { user } = useAuth()
  const { db, tambahUser, ubahUser, resetPassword } = useData()
  const toast = useToast()

  const [modalBuka, setModalBuka] = useState(false)
  const [diedit, setDiedit] = useState<User | null>(null)
  const [resetTarget, setResetTarget] = useState<User | null>(null)

  const pengguna = [...db.users].sort((a, b) => {
    if (a.role !== b.role) return a.role === 'admin' ? -1 : 1
    return a.nama.localeCompare(b.nama, 'id')
  })

  const bukaTambah = () => {
    setDiedit(null)
    setModalBuka(true)
  }

  const bukaEdit = (u: User) => {
    setDiedit(u)
    setModalBuka(true)
  }

  return (
    <div className="animate-rise">
      <PageHeader
        judul="Pengguna"
        deskripsi="Kelola akun yang dapat mengakses sistem stok kedai."
        aksi={
          <button className="btn btn-primary" onClick={bukaTambah}>
            <IconPlus className="size-4" />
            Tambah Pengguna
          </button>
        }
      />

      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-line bg-white px-4 py-3 text-xs leading-relaxed text-muted">
        <IconInfo className="mt-0.5 size-4 shrink-0 text-caramel" />
        <p>
          <b className="text-coffee">Admin</b> dapat mengelola pengguna, bahan, dan
          seluruh mutasi. <b className="text-coffee">Staf</b> dapat mencatat stok
          masuk/keluar serta melihat dashboard dan laporan.
        </p>
      </div>

      <div className="card overflow-hidden">
        {pengguna.length === 0 ? (
          <EmptyState
            judul="Belum ada pengguna"
            pesan="Tambahkan akun untuk staf kedai."
            ikon={<IconUser className="size-5" />}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-banggala min-w-[760px]">
              <thead>
                <tr>
                  <th>Pengguna</th>
                  <th>Peran</th>
                  <th>Status</th>
                  <th>Dibuat</th>
                  <th>Password Diubah</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pengguna.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div
                          className={`grid size-9 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                            u.role === 'admin'
                              ? 'bg-espresso text-cream'
                              : 'bg-latte/60 text-coffee'
                          }`}
                        >
                          {u.nama
                            .split(' ')
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((s) => s[0]?.toUpperCase())
                            .join('')}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-ink">
                            {u.nama}
                            {u.id === user?.id && (
                              <span className="ml-2 rounded bg-sand px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-mocha uppercase">
                                Anda
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-muted">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <BadgePeran peran={u.role} />
                    </td>
                    <td>
                      <BadgeAktif aktif={u.aktif} />
                    </td>
                    <td className="text-xs whitespace-nowrap text-muted">
                      {formatTanggal(u.createdAt)}
                    </td>
                    <td className="text-xs whitespace-nowrap text-muted">
                      {u.passwordChangedAt
                        ? formatTanggal(u.passwordChangedAt)
                        : 'Belum pernah'}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => bukaEdit(u)}
                          title="Ubah pengguna"
                        >
                          <IconEdit className="size-3.5" />
                          <span className="hidden sm:inline">Ubah</span>
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setResetTarget(u)}
                          title="Reset password"
                        >
                          <IconKey className="size-3.5" />
                          <span className="hidden sm:inline">Reset</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-line px-4 py-3 text-[11px] text-muted">
        <IconShield className="size-4 shrink-0 text-caramel" />
        Minimal satu akun admin harus tetap aktif. Sistem akan menolak perubahan
        yang menghilangkan admin terakhir.
      </div>

      <UserModal
        buka={modalBuka}
        tutup={() => setModalBuka(false)}
        pengguna={diedit}
        onSimpan={async (data) => {
          if (diedit) {
            await ubahUser(diedit.id, {
              nama: data.nama,
              role: data.role,
              aktif: data.aktif,
            })
            toast.sukses(`Pengguna "${data.nama}" berhasil diperbarui.`)
          } else {
            await tambahUser({
              nama: data.nama,
              username: data.username,
              role: data.role,
              password: data.password,
            })
            toast.sukses(`Pengguna "${data.nama}" berhasil ditambahkan.`)
          }
          setModalBuka(false)
        }}
      />

      <ResetPasswordModal
        pengguna={resetTarget}
        tutup={() => setResetTarget(null)}
        onSimpan={async (password) => {
          if (!resetTarget) return
          await resetPassword(resetTarget.id, password)
          toast.sukses(`Password "${resetTarget.username}" berhasil direset.`)
          setResetTarget(null)
        }}
      />
    </div>
  )
}

interface DataUser {
  nama: string
  username: string
  role: Role
  password: string
  aktif: boolean
}

function UserModal({
  buka,
  tutup,
  pengguna,
  onSimpan,
}: {
  buka: boolean
  tutup: () => void
  pengguna: User | null
  onSimpan: (data: DataUser) => Promise<void>
}) {
  const [nama, setNama] = useState('')
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<Role>('staf')
  const [password, setPassword] = useState('')
  const [konfirmasi, setKonfirmasi] = useState('')
  const [aktif, setAktif] = useState(true)
  const [lihat, setLihat] = useState(false)
  const [galat, setGalat] = useState('')
  const [memproses, setMemproses] = useState(false)

  useEffect(() => {
    if (!buka) return
    setGalat('')
    setMemproses(false)
    setLihat(false)
    if (pengguna) {
      setNama(pengguna.nama)
      setUsername(pengguna.username)
      setRole(pengguna.role)
      setAktif(pengguna.aktif)
      setPassword('')
      setKonfirmasi('')
    } else {
      setNama('')
      setUsername('')
      setRole('staf')
      setAktif(true)
      setPassword('')
      setKonfirmasi('')
    }
  }, [buka, pengguna])

  const kirim = async () => {
    setGalat('')
    if (!nama.trim()) return setGalat('Nama lengkap wajib diisi.')
    if (!pengguna) {
      if (!username.trim()) return setGalat('Username wajib diisi.')
      if (!/^[a-z0-9._-]+$/i.test(username.trim())) {
        return setGalat('Username hanya boleh huruf, angka, titik, garis bawah, dan strip.')
      }
      if (password.length < 6) return setGalat('Password minimal 6 karakter.')
      if (password !== konfirmasi) return setGalat('Konfirmasi password tidak sama.')
    }

    setMemproses(true)
    try {
      await onSimpan({
        nama: nama.trim(),
        username: username.trim().toLowerCase(),
        role,
        password,
        aktif,
      })
    } catch (error) {
      setGalat(error instanceof Error ? error.message : 'Gagal menyimpan pengguna.')
    } finally {
      setMemproses(false)
    }
  }

  return (
    <Modal
      buka={buka}
      tutup={tutup}
      judul={pengguna ? 'Ubah Pengguna' : 'Tambah Pengguna'}
      deskripsi={
        pengguna
          ? `Akun @${pengguna.username}`
          : 'Buat akun baru untuk staf atau admin kedai.'
      }
      footer={
        <>
          <button className="btn btn-outline" onClick={tutup} disabled={memproses}>
            Batal
          </button>
          <button className="btn btn-primary" onClick={kirim} disabled={memproses}>
            {memproses ? 'Menyimpan…' : pengguna ? 'Simpan perubahan' : 'Tambah pengguna'}
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

        <Field label="Nama Lengkap" htmlFor="user-nama">
          <input
            id="user-nama"
            className="input"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="mis. Sari Wulandari"
            autoFocus
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Username"
            htmlFor="user-username"
            hint={pengguna ? 'Username tidak dapat diubah.' : 'Huruf kecil tanpa spasi.'}
          >
            <input
              id="user-username"
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="mis. sari"
              disabled={Boolean(pengguna)}
              autoComplete="off"
            />
          </Field>
          <Field label="Peran" htmlFor="user-role">
            <select
              id="user-role"
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="staf">Staf</option>
              <option value="admin">Admin</option>
            </select>
          </Field>
        </div>

        {pengguna ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-cream px-3.5 py-3">
            <input
              type="checkbox"
              checked={aktif}
              onChange={(e) => setAktif(e.target.checked)}
              className="mt-0.5 size-4 accent-espresso"
            />
            <span>
              <span className="block text-sm font-semibold text-ink">
                Akun aktif
              </span>
              <span className="block text-[11px] text-muted">
                Akun nonaktif tidak dapat masuk, tetapi riwayatnya tetap tersimpan.
              </span>
            </span>
          </label>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Password" htmlFor="user-password" hint="Minimal 6 karakter.">
              <div className="relative">
                <input
                  id="user-password"
                  type={lihat ? 'text' : 'password'}
                  className="input pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted hover:text-coffee"
                  onClick={() => setLihat((v) => !v)}
                  aria-label={lihat ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {lihat ? (
                    <IconEyeOff className="size-4" />
                  ) : (
                    <IconEye className="size-4" />
                  )}
                </button>
              </div>
            </Field>
            <Field label="Konfirmasi Password" htmlFor="user-konfirmasi">
              <input
                id="user-konfirmasi"
                type={lihat ? 'text' : 'password'}
                className="input"
                value={konfirmasi}
                onChange={(e) => setKonfirmasi(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
          </div>
        )}
      </div>
    </Modal>
  )
}

function ResetPasswordModal({
  pengguna,
  tutup,
  onSimpan,
}: {
  pengguna: User | null
  tutup: () => void
  onSimpan: (password: string) => Promise<void>
}) {
  const [password, setPassword] = useState('')
  const [konfirmasi, setKonfirmasi] = useState('')
  const [lihat, setLihat] = useState(false)
  const [galat, setGalat] = useState('')
  const [memproses, setMemproses] = useState(false)

  useEffect(() => {
    setPassword('')
    setKonfirmasi('')
    setGalat('')
    setMemproses(false)
    setLihat(false)
  }, [pengguna])

  const kirim = async () => {
    setGalat('')
    if (password.length < 6) return setGalat('Password minimal 6 karakter.')
    if (password !== konfirmasi) return setGalat('Konfirmasi password tidak sama.')
    setMemproses(true)
    try {
      await onSimpan(password)
    } catch (error) {
      setGalat(error instanceof Error ? error.message : 'Gagal reset password.')
    } finally {
      setMemproses(false)
    }
  }

  return (
    <Modal
      buka={pengguna !== null}
      tutup={tutup}
      judul="Reset Password"
      deskripsi={pengguna ? `Atur password baru untuk @${pengguna.username}` : undefined}
      lebar="sm"
      footer={
        <>
          <button className="btn btn-outline" onClick={tutup} disabled={memproses}>
            Batal
          </button>
          <button className="btn btn-primary" onClick={kirim} disabled={memproses}>
            {memproses ? 'Menyimpan…' : 'Simpan password'}
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
        <Field label="Password Baru" htmlFor="reset-password" hint="Minimal 6 karakter.">
          <div className="relative">
            <input
              id="reset-password"
              type={lihat ? 'text' : 'password'}
              className="input pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="new-password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted hover:text-coffee"
              onClick={() => setLihat((v) => !v)}
              aria-label={lihat ? 'Sembunyikan password' : 'Tampilkan password'}
            >
              {lihat ? <IconEyeOff className="size-4" /> : <IconEye className="size-4" />}
            </button>
          </div>
        </Field>
        <Field label="Konfirmasi Password" htmlFor="reset-konfirmasi">
          <input
            id="reset-konfirmasi"
            type={lihat ? 'text' : 'password'}
            className="input"
            value={konfirmasi}
            onChange={(e) => setKonfirmasi(e.target.value)}
            autoComplete="new-password"
          />
        </Field>
      </div>
    </Modal>
  )
}
