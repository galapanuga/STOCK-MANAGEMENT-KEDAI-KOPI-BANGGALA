import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import type { DB, User } from '../types'
import { buatPassword, hapusSesi, ambilSesi, simpanSesi, verifikasiPassword } from '../lib/auth'
import { uid } from '../lib/id'
import { inisialisasiDB } from '../lib/seed'
import { simpanDB } from '../lib/storage'

interface AuthContextValue {
  db: DB | null
  setDb: Dispatch<SetStateAction<DB | null>>
  user: User | null
  siap: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  gantiPassword: (userId: string, passwordBaru: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB | null>(null)
  const [siap, setSiap] = useState(false)
  const [userId, setUserId] = useState<string | null>(
    () => ambilSesi()?.userId ?? null,
  )
  const [galatInit, setGalatInit] = useState<string | null>(null)

  useEffect(() => {
    let aktif = true
    inisialisasiDB()
      .then((data) => {
        if (!aktif) return
        setDb(data)
        setSiap(true)
      })
      .catch((error: unknown) => {
        if (!aktif) return
        setGalatInit(
          error instanceof Error ? error.message : 'Gagal memuat data.',
        )
        setSiap(true)
      })
    return () => {
      aktif = false
    }
  }, [])

  useEffect(() => {
    if (!db) return
    try {
      simpanDB(db)
    } catch (error) {
      console.error(error)
    }
  }, [db])

  const user = useMemo(() => {
    if (!db || !userId) return null
    return db.users.find((u) => u.id === userId && u.aktif) ?? null
  }, [db, userId])

  const login = useCallback(
    async (username: string, password: string) => {
      if (!db) throw new Error('Data belum siap. Coba lagi sebentar.')
      const bersih = username.trim().toLowerCase()
      if (!bersih || !password) {
        throw new Error('Username dan password wajib diisi.')
      }
      const akun = db.users.find(
        (u) => u.username.toLowerCase() === bersih,
      )
      if (!akun) throw new Error('Username atau password salah.')
      if (!akun.aktif) throw new Error('Akun ini sedang dinonaktifkan.')
      const cocok = await verifikasiPassword(
        password,
        akun.salt,
        akun.passwordHash,
      )
      if (!cocok) throw new Error('Username atau password salah.')
      simpanSesi(akun.id)
      setUserId(akun.id)
    },
    [db],
  )

  const logout = useCallback(() => {
    hapusSesi()
    setUserId(null)
  }, [])

  const gantiPassword = useCallback(
    async (id: string, passwordBaru: string) => {
      if (passwordBaru.length < 6) {
        throw new Error('Password minimal 6 karakter.')
      }
      const { salt, hash } = await buatPassword(passwordBaru)
      setDb((prev) => {
        if (!prev) return prev
        const operator = prev.users.find((u) => u.id === userId)
        const sekarang = new Date().toISOString()
        return {
          ...prev,
          users: prev.users.map((u) =>
            u.id === id
              ? { ...u, salt, passwordHash: hash, passwordChangedAt: sekarang }
              : u,
          ),
          log: [
            {
              id: uid('log'),
              at: sekarang,
              userId: userId ?? 'sistem',
              userName: operator?.nama ?? 'Sistem',
              aksi: 'Ganti password',
              detail: `Password akun "${prev.users.find((u) => u.id === id)?.username ?? id}" diperbarui`,
            },
            ...prev.log,
          ].slice(0, 250),
        }
      })
    },
    [userId],
  )

  const nilai = useMemo<AuthContextValue>(
    () => ({ db, setDb, user, siap, login, logout, gantiPassword }),
    [db, user, siap, login, logout, gantiPassword],
  )

  if (!siap) {
    return (
      <div className="grid min-h-screen place-items-center bg-cream px-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-espresso text-2xl text-cream shadow-lg">
            ☕
          </div>
          <div>
            <p className="font-display text-xl font-bold text-espresso">
              Banggala Stock
            </p>
            <p className="mt-1 text-sm text-muted">Menyiapkan data kedai…</p>
          </div>
        </div>
      </div>
    )
  }

  if (galatInit) {
    return (
      <div className="grid min-h-screen place-items-center bg-cream px-6">
        <div className="card max-w-md p-6 text-center">
          <p className="font-display text-lg font-bold text-danger">
            Data gagal dimuat
          </p>
          <p className="mt-2 text-sm text-muted">{galatInit}</p>
          <button
            className="btn btn-primary mt-4"
            onClick={() => window.location.reload()}
          >
            Muat ulang
          </button>
        </div>
      </div>
    )
  }

  return <AuthContext.Provider value={nilai}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return ctx
}
