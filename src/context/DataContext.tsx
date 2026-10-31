import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import type {
  Bahan,
  DB,
  LogAktivitas,
  Mutasi,
  MutasiTipe,
  Pengaturan,
  Role,
  StokInfo,
  User,
} from '../types'
import { buatPassword } from '../lib/auth'
import { uid } from '../lib/id'
import { formatAngka } from '../lib/format'
import { hitungStok } from '../lib/stock'
import { buatDatabaseAwal, KATEGORI_BAWAAN, SATUAN_BAWAAN } from '../lib/seed'
import { PENGATURAN_RESMI } from '../lib/dataAwal'
import { useAuth } from './AuthContext'

export interface InputBahan {
  nama: string
  kategori: string
  satuan: string
  stokMin: number
  stokAwal?: number
  hargaAwal?: number
  keteranganAwal?: string
}

export interface InputMutasi {
  bahanId: string
  tipe: MutasiTipe
  jumlah: number
  hargaSatuan?: number
  alasan?: string
  keterangan?: string
  tanggal: string
}

export interface InputUser {
  username: string
  nama: string
  role: Role
  password: string
  aktif?: boolean
}

interface DataContextValue {
  db: DB
  stok: Map<string, StokInfo>
  bahanMap: Map<string, Bahan>
  tambahBahan: (input: InputBahan) => Bahan
  ubahBahan: (id: string, input: InputBahan) => void
  arsipBahan: (id: string, arsip: boolean) => void
  tambahMutasi: (input: InputMutasi) => Mutasi
  ubahMutasi: (id: string, input: InputMutasi) => void
  hapusMutasi: (id: string) => void
  tambahUser: (input: InputUser) => Promise<void>
  ubahUser: (
    id: string,
    patch: { nama?: string; role?: Role; aktif?: boolean },
  ) => void
  resetPassword: (id: string, password: string) => Promise<void>
  simpanPengaturan: (patch: Partial<Pengaturan>) => void
  tambahKategori: (nama: string) => void
  hapusKategori: (nama: string) => void
  tambahSatuan: (nama: string) => void
  hapusSatuan: (nama: string) => void
  pulihkanBackup: (data: DB) => void
  resetStok: () => Promise<void>
  catatLog: (aksi: string, detail: string) => void
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { db: dbAuth, setDb, user, logout } = useAuth()
  const db = dbAuth as DB

  const stok = useMemo(
    () => (db ? hitungStok(db.bahan, db.mutasi) : new Map<string, StokInfo>()),
    [db],
  )

  const bahanMap = useMemo(
    () => new Map((db?.bahan ?? []).map((b) => [b.id, b])),
    [db],
  )

  const buatLog = useCallback(
    (aksi: string, detail: string): LogAktivitas => ({
      id: uid('log'),
      at: new Date().toISOString(),
      userId: user?.id ?? 'sistem',
      userName: user?.nama ?? 'Sistem',
      aksi,
      detail,
    }),
    [user],
  )

  const tambahBahan = useCallback(
    (input: InputBahan): Bahan => {
      const nama = input.nama.trim()
      if (!nama) throw new Error('Nama bahan wajib diisi.')
      if (!input.satuan.trim()) throw new Error('Satuan wajib diisi.')
      if (input.stokMin < 0) throw new Error('Stok minimum tidak boleh negatif.')
      if (
        db.bahan.some(
          (b) => !b.arsip && b.nama.trim().toLowerCase() === nama.toLowerCase(),
        )
      ) {
        throw new Error('Bahan dengan nama tersebut sudah ada.')
      }

      const sekarang = new Date().toISOString()
      const bahanBaru: Bahan = {
        id: uid('bhn'),
        nama,
        kategori: input.kategori.trim() || 'Lainnya',
        satuan: input.satuan.trim(),
        stokMin: input.stokMin,
        arsip: false,
        createdAt: sekarang,
      }

      const stokAwal = input.stokAwal ?? 0
      if (stokAwal < 0) throw new Error('Stok awal tidak boleh negatif.')

      const mutasiBaru: Mutasi | null =
        stokAwal > 0
          ? {
              id: uid('mut'),
              bahanId: bahanBaru.id,
              tipe: 'masuk',
              jumlah: stokAwal,
              hargaSatuan: input.hargaAwal && input.hargaAwal > 0 ? input.hargaAwal : undefined,
              keterangan: input.keteranganAwal?.trim() || 'Stok awal',
              tanggal: sekarang,
              userId: user?.id ?? 'sistem',
              userName: user?.nama ?? 'Sistem',
              createdAt: sekarang,
            }
          : null

      const log = buatLog(
        'Tambah bahan',
        `Menambahkan bahan "${nama}"${mutasiBaru ? ` dengan stok awal ${formatAngka(stokAwal)} ${bahanBaru.satuan}` : ''}`,
      )

      setDb((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          bahan: [...prev.bahan, bahanBaru],
          mutasi: mutasiBaru ? [...prev.mutasi, mutasiBaru] : prev.mutasi,
          log: [log, ...prev.log].slice(0, 250),
        }
      })

      return bahanBaru
    },
    [buatLog, db.bahan, setDb, user],
  )

  const ubahBahan = useCallback(
    (id: string, input: InputBahan) => {
      const nama = input.nama.trim()
      if (!nama) throw new Error('Nama bahan wajib diisi.')
      if (input.stokMin < 0) throw new Error('Stok minimum tidak boleh negatif.')
      if (
        db.bahan.some(
          (b) =>
            b.id !== id &&
            !b.arsip &&
            b.nama.trim().toLowerCase() === nama.toLowerCase(),
        )
      ) {
        throw new Error('Bahan dengan nama tersebut sudah ada.')
      }

      const lama = db.bahan.find((b) => b.id === id)
      if (!lama) throw new Error('Bahan tidak ditemukan.')

      const log = buatLog('Ubah bahan', `Memperbarui bahan "${nama}"`)
      setDb((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          bahan: prev.bahan.map((b) =>
            b.id === id
              ? {
                  ...b,
                  nama,
                  kategori: input.kategori.trim() || 'Lainnya',
                  satuan: input.satuan.trim(),
                  stokMin: input.stokMin,
                }
              : b,
          ),
          log: [log, ...prev.log].slice(0, 250),
        }
      })
    },
    [buatLog, db.bahan, setDb],
  )

  const arsipBahan = useCallback(
    (id: string, arsip: boolean) => {
      const bahan = db.bahan.find((b) => b.id === id)
      if (!bahan) throw new Error('Bahan tidak ditemukan.')
      const log = buatLog(
        arsip ? 'Arsipkan bahan' : 'Aktifkan bahan',
        `${arsip ? 'Mengarsipkan' : 'Mengaktifkan'} bahan "${bahan.nama}"`,
      )
      setDb((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          bahan: prev.bahan.map((b) => (b.id === id ? { ...b, arsip } : b)),
          log: [log, ...prev.log].slice(0, 250),
        }
      })
    },
    [buatLog, db.bahan, setDb],
  )

  const validasiMutasi = useCallback(
    (input: InputMutasi, abaikanMutasiId?: string) => {
      if (!input.bahanId) throw new Error('Pilih bahan terlebih dahulu.')
      if (!(input.jumlah > 0)) throw new Error('Jumlah harus lebih dari 0.')
      if (input.hargaSatuan !== undefined && input.hargaSatuan < 0) {
        throw new Error('Harga satuan tidak boleh negatif.')
      }
      const bahan = db.bahan.find((b) => b.id === input.bahanId)
      if (!bahan) throw new Error('Bahan tidak ditemukan.')

      if (input.tipe === 'keluar') {
        let stokTersedia = stok.get(input.bahanId)?.stok ?? 0

        if (abaikanMutasiId) {
          const lama = db.mutasi.find((m) => m.id === abaikanMutasiId)
          if (lama && lama.bahanId === input.bahanId) {
            stokTersedia += lama.tipe === 'keluar' ? lama.jumlah : -lama.jumlah
          }
        }

        if (input.jumlah > stokTersedia + 1e-9) {
          throw new Error(
            `Stok tidak cukup. Tersedia ${formatAngka(stokTersedia)} ${bahan.satuan}.`,
          )
        }
      }

      return bahan
    },
    [db.bahan, db.mutasi, stok],
  )

  const tambahMutasi = useCallback(
    (input: InputMutasi): Mutasi => {
      const bahan = validasiMutasi(input)
      const sekarang = new Date().toISOString()
      const mutasi: Mutasi = {
        id: uid('mut'),
        bahanId: input.bahanId,
        tipe: input.tipe,
        jumlah: input.jumlah,
        hargaSatuan:
          input.tipe === 'masuk' && input.hargaSatuan && input.hargaSatuan > 0
            ? input.hargaSatuan
            : undefined,
        alasan: input.alasan?.trim() || undefined,
        keterangan: input.keterangan?.trim() || undefined,
        tanggal: input.tanggal || sekarang,
        userId: user?.id ?? 'sistem',
        userName: user?.nama ?? 'Sistem',
        createdAt: sekarang,
      }

      const log = buatLog(
        input.tipe === 'masuk' ? 'Stok masuk' : 'Stok keluar',
        `${bahan.nama} ${input.tipe === 'masuk' ? '+' : '−'}${formatAngka(input.jumlah)} ${bahan.satuan}`,
      )

      setDb((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          mutasi: [...prev.mutasi, mutasi],
          log: [log, ...prev.log].slice(0, 250),
        }
      })

      return mutasi
    },
    [buatLog, setDb, user, validasiMutasi],
  )

  const ubahMutasi = useCallback(
    (id: string, input: InputMutasi) => {
      const lama = db.mutasi.find((m) => m.id === id)
      if (!lama) throw new Error('Mutasi tidak ditemukan.')
      const bahan = validasiMutasi(input, id)

      const log = buatLog(
        'Ubah mutasi',
        `Memperbarui mutasi ${bahan.nama} menjadi ${formatAngka(input.jumlah)} ${bahan.satuan}`,
      )

      setDb((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          mutasi: prev.mutasi.map((m) =>
            m.id === id
              ? {
                  ...m,
                  bahanId: input.bahanId,
                  tipe: input.tipe,
                  jumlah: input.jumlah,
                  hargaSatuan:
                    input.tipe === 'masuk' && input.hargaSatuan && input.hargaSatuan > 0
                      ? input.hargaSatuan
                      : undefined,
                  alasan: input.alasan?.trim() || undefined,
                  keterangan: input.keterangan?.trim() || undefined,
                  tanggal: input.tanggal || m.tanggal,
                }
              : m,
          ),
          log: [log, ...prev.log].slice(0, 250),
        }
      })
    },
    [buatLog, db.mutasi, setDb, validasiMutasi],
  )

  const hapusMutasi = useCallback(
    (id: string) => {
      const lama = db.mutasi.find((m) => m.id === id)
      if (!lama) return
      const bahan = db.bahan.find((b) => b.id === lama.bahanId)
      const log = buatLog(
        'Hapus mutasi',
        `Menghapus mutasi ${bahan?.nama ?? lama.bahanId} (${lama.tipe} ${formatAngka(lama.jumlah)})`,
      )
      setDb((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          mutasi: prev.mutasi.filter((m) => m.id !== id),
          log: [log, ...prev.log].slice(0, 250),
        }
      })
    },
    [buatLog, db.bahan, db.mutasi, setDb],
  )

  const tambahUser = useCallback(
    async (input: InputUser) => {
      const username = input.username.trim().toLowerCase()
      const nama = input.nama.trim()
      if (!username) throw new Error('Username wajib diisi.')
      if (!/^[a-z0-9._-]+$/.test(username)) {
        throw new Error('Username hanya boleh huruf, angka, titik, garis bawah, dan strip.')
      }
      if (!nama) throw new Error('Nama lengkap wajib diisi.')
      if (db.users.some((u) => u.username.toLowerCase() === username)) {
        throw new Error('Username sudah digunakan.')
      }
      if (input.password.length < 6) {
        throw new Error('Password minimal 6 karakter.')
      }

      const { salt, hash } = await buatPassword(input.password)
      const baru: User = {
        id: uid('usr'),
        username,
        nama,
        role: input.role,
        passwordHash: hash,
        salt,
        aktif: input.aktif ?? true,
        createdAt: new Date().toISOString(),
      }
      const log = buatLog(
        'Tambah pengguna',
        `Menambahkan pengguna "${nama}" (${input.role})`,
      )

      setDb((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          users: [...prev.users, baru],
          log: [log, ...prev.log].slice(0, 250),
        }
      })
    },
    [buatLog, db.users, setDb],
  )

  const ubahUser = useCallback(
    (id: string, patch: { nama?: string; role?: Role; aktif?: boolean }) => {
      const target = db.users.find((u) => u.id === id)
      if (!target) throw new Error('Pengguna tidak ditemukan.')

      if (id === user?.id && patch.aktif === false) {
        throw new Error('Tidak bisa menonaktifkan akun sendiri.')
      }
      if (id === user?.id && patch.role && patch.role !== target.role) {
        throw new Error('Tidak bisa mengubah role akun sendiri.')
      }

      const adminAktif = db.users.filter((u) => u.role === 'admin' && u.aktif)
      const kehilanganAdmin =
        target.role === 'admin' &&
        target.aktif &&
        adminAktif.length === 1 &&
        (patch.role === 'staf' || patch.aktif === false)
      if (kehilanganAdmin) {
        throw new Error('Harus ada minimal satu admin aktif.')
      }

      if (patch.nama !== undefined && !patch.nama.trim()) {
        throw new Error('Nama tidak boleh kosong.')
      }

      const log = buatLog(
        'Ubah pengguna',
        `Memperbarui akun "${target.username}"${patch.role ? ` · role ${patch.role}` : ''}${
          patch.aktif !== undefined ? ` · ${patch.aktif ? 'aktif' : 'nonaktif'}` : ''
        }`,
      )

      setDb((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          users: prev.users.map((u) =>
            u.id === id
              ? {
                  ...u,
                  nama: patch.nama?.trim() ?? u.nama,
                  role: patch.role ?? u.role,
                  aktif: patch.aktif ?? u.aktif,
                }
              : u,
          ),
          log: [log, ...prev.log].slice(0, 250),
        }
      })
    },
    [buatLog, db.users, setDb, user],
  )

  const resetPassword = useCallback(
    async (id: string, password: string) => {
      if (password.length < 6) throw new Error('Password minimal 6 karakter.')
      const target = db.users.find((u) => u.id === id)
      if (!target) throw new Error('Pengguna tidak ditemukan.')
      const { salt, hash } = await buatPassword(password)
      const sekarang = new Date().toISOString()
      const log = buatLog(
        'Reset password',
        `Password akun "${target.username}" direset`,
      )
      setDb((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          users: prev.users.map((u) =>
            u.id === id
              ? { ...u, salt, passwordHash: hash, passwordChangedAt: sekarang }
              : u,
          ),
          log: [log, ...prev.log].slice(0, 250),
        }
      })
    },
    [buatLog, db.users, setDb],
  )

  const simpanPengaturan = useCallback(
    (patch: Partial<Pengaturan>) => {
      const log = buatLog('Ubah pengaturan', 'Memperbarui pengaturan kedai')
      setDb((prev) =>
        prev
          ? {
              ...prev,
              pengaturan: { ...prev.pengaturan, ...patch },
              log: [log, ...prev.log].slice(0, 250),
            }
          : prev,
      )
    },
    [buatLog, setDb],
  )

  const tambahKategori = useCallback(
    (nama: string) => {
      const bersih = nama.trim()
      if (!bersih) throw new Error('Nama kategori wajib diisi.')
      if (db.pengaturan.kategoriBahan.some((k) => k.toLowerCase() === bersih.toLowerCase())) {
        throw new Error('Kategori sudah ada.')
      }
      simpanPengaturan({
        kategoriBahan: [...db.pengaturan.kategoriBahan, bersih],
      })
    },
    [db.pengaturan.kategoriBahan, simpanPengaturan],
  )

  const hapusKategori = useCallback(
    (nama: string) => {
      const dipakai = db.bahan.filter((b) => b.kategori === nama).length
      if (dipakai > 0) {
        throw new Error(`Kategori masih dipakai oleh ${dipakai} bahan.`)
      }
      simpanPengaturan({
        kategoriBahan: db.pengaturan.kategoriBahan.filter((k) => k !== nama),
      })
    },
    [db.bahan, db.pengaturan.kategoriBahan, simpanPengaturan],
  )

  const tambahSatuan = useCallback(
    (nama: string) => {
      const bersih = nama.trim()
      if (!bersih) throw new Error('Nama satuan wajib diisi.')
      if (db.pengaturan.satuanBahan.some((s) => s.toLowerCase() === bersih.toLowerCase())) {
        throw new Error('Satuan sudah ada.')
      }
      simpanPengaturan({ satuanBahan: [...db.pengaturan.satuanBahan, bersih] })
    },
    [db.pengaturan.satuanBahan, simpanPengaturan],
  )

  const hapusSatuan = useCallback(
    (nama: string) => {
      const dipakai = db.bahan.filter((b) => b.satuan === nama).length
      if (dipakai > 0) {
        throw new Error(`Satuan masih dipakai oleh ${dipakai} bahan.`)
      }
      simpanPengaturan({
        satuanBahan: db.pengaturan.satuanBahan.filter((s) => s !== nama),
      })
    },
    [db.bahan, db.pengaturan.satuanBahan, simpanPengaturan],
  )

  const pulihkanBackup = useCallback(
    (data: DB) => {
      if (!data || !Array.isArray(data.users) || !Array.isArray(data.bahan)) {
        throw new Error('File backup tidak valid.')
      }

      const users = data.users.filter(
        (u) => u && u.id && u.username && u.salt && u.passwordHash,
      )
      if (users.length === 0) throw new Error('Backup tidak memiliki akun yang valid.')
      if (!users.some((u) => u.aktif)) {
        throw new Error('Backup tidak memiliki akun aktif.')
      }

      const bersih: DB = {
        version: data.version ?? 1,
        users,
        bahan: data.bahan.filter((b) => b && b.id && b.nama),
        mutasi: Array.isArray(data.mutasi)
          ? data.mutasi.filter((m) => m && m.id && m.bahanId)
          : [],
        menu: Array.isArray(data.menu) ? data.menu : [],
        penjualan: Array.isArray(data.penjualan) ? data.penjualan : [],
        pengaturan: {
          ...PENGATURAN_RESMI,
          ...data.pengaturan,
          kategoriBahan: Array.isArray(data.pengaturan?.kategoriBahan)
            ? data.pengaturan.kategoriBahan
            : KATEGORI_BAWAAN,
          satuanBahan: Array.isArray(data.pengaturan?.satuanBahan)
            ? data.pengaturan.satuanBahan
            : SATUAN_BAWAAN,
        },
        log: Array.isArray(data.log) ? data.log : [],
      }

      const operatorId = user?.id
      setDb(bersih)
      if (operatorId && !bersih.users.some((u) => u.id === operatorId)) {
        logout()
      }
    },
    [logout, setDb, user],
  )

  const resetStok = useCallback(async () => {
    const seed = await buatDatabaseAwal()
    const log = buatLog(
      'Reset data',
      'Mengembalikan data bahan & mutasi ke contoh awal',
    )
    setDb((prev) =>
      prev
        ? {
            ...prev,
            bahan: seed.bahan,
            mutasi: seed.mutasi,
            log: [log, ...prev.log].slice(0, 250),
          }
        : prev,
    )
  }, [buatLog, setDb])

  const catatLog = useCallback(
    (aksi: string, detail: string) => {
      const log = buatLog(aksi, detail)
      setDb((prev) =>
        prev
          ? { ...prev, log: [log, ...prev.log].slice(0, 250) }
          : prev,
      )
    },
    [buatLog, setDb],
  )

  const nilai = useMemo<DataContextValue>(
    () => ({
      db,
      stok,
      bahanMap,
      tambahBahan,
      ubahBahan,
      arsipBahan,
      tambahMutasi,
      ubahMutasi,
      hapusMutasi,
      tambahUser,
      ubahUser,
      resetPassword,
      simpanPengaturan,
      tambahKategori,
      hapusKategori,
      tambahSatuan,
      hapusSatuan,
      pulihkanBackup,
      resetStok,
      catatLog,
    }),
    [
      db,
      stok,
      bahanMap,
      tambahBahan,
      ubahBahan,
      arsipBahan,
      tambahMutasi,
      ubahMutasi,
      hapusMutasi,
      tambahUser,
      ubahUser,
      resetPassword,
      simpanPengaturan,
      tambahKategori,
      hapusKategori,
      tambahSatuan,
      hapusSatuan,
      pulihkanBackup,
      resetStok,
      catatLog,
    ],
  )

  return <DataContext.Provider value={nilai}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData harus dipakai di dalam DataProvider')
  return ctx
}
