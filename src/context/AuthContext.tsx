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
import {
  mapBahanFromRow,
  mapLogFromRow,
  mapMenuFromRow,
  mapMutasiFromRow,
  mapPengaturanFromRow,
  mapPenggunaFromRow,
  mapPenjualanFromRow,
  muatDBSupabase,
  simpanPenggunaCloud,
  type BahanRow,
  type LogAktivitasRow,
  type MenuRow,
  type MutasiRow,
  type PengaturanRow,
  type PenggunaRow,
  type PenjualanRow,
} from '../lib/cloudDb'
import { uid } from '../lib/id'
import { antrekanAksi, prosesAntreanOutbox } from '../lib/outboxQueue'
import { inisialisasiDB } from '../lib/seed'
import { simpanDB } from '../lib/storage'
import { apakahSupabaseAktif, supabase } from '../lib/supabase'

interface AuthContextValue {
  db: DB | null
  setDb: Dispatch<SetStateAction<DB | null>>
  user: User | null
  siap: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  gantiPassword: (userId: string, passwordBaru: string) => Promise<void>
}

function bacaIdLama(record: unknown): string | null {
  if (record && typeof record === 'object' && 'id' in record && typeof record.id === 'string') {
    return record.id
  }
  return null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB | null>(null)
  const [siap, setSiap] = useState(false)
  const [userId, setUserId] = useState<string | null>(
    () => ambilSesi()?.userId ?? null,
  )
  const [galatInit, setGalatInit] = useState<string | null>(null)

  // 1. Pemuatan Hybrid (Lokal Cache Terlebih Dahulu, Lalu Cloud Sync)
  useEffect(() => {
    let aktif = true

    async function inisialisasiHybrid() {
      try {
        // Langkah A: Tampilkan data lokal secepat mungkin (< 50ms)
        const dataLokal = await inisialisasiDB()
        if (!aktif) return
        setDb(dataLokal)
        setSiap(true)

        // Langkah B: Jika Supabase aktif dan online, ambil versi cloud terbaru
        if (apakahSupabaseAktif && typeof navigator !== 'undefined' && navigator.onLine) {
          try {
            const dataCloud = await muatDBSupabase()
            if (aktif && dataCloud && dataCloud.users.length > 0) {
              setDb(dataCloud)
              simpanDB(dataCloud)
            }
          } catch (errCloud) {
            console.warn('[Banggala Stock] Gagal sinkronisasi data cloud saat startup:', errCloud)
          }

          // Segera proses antrean outbox jika ada item tertunda
          prosesAntreanOutbox().catch(console.error)
        }
      } catch (error: unknown) {
        if (!aktif) return
        setGalatInit(
          error instanceof Error ? error.message : 'Gagal memuat data.',
        )
        setSiap(true)
      }
    }

    inisialisasiHybrid()

    return () => {
      aktif = false
    }
  }, [])

  // 2. Simpan setiap perubahan state DB ke localStorage sebagai cadangan offline
  useEffect(() => {
    if (!db) return
    try {
      simpanDB(db)
    } catch (error) {
      console.error('[Banggala Stock] Gagal menyimpan ke localStorage:', error)
    }
  }, [db])

  // 3. Langganan Realtime Supabase (WebSocket) untuk Sinkronisasi Multi-Perangkat
  useEffect(() => {
    if (!apakahSupabaseAktif || !supabase) return

    const channel = supabase
      .channel('banggala_realtime_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mutasi' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const item = mapMutasiFromRow(payload.new as MutasiRow)
            setDb((prev) => {
              if (!prev) return prev
              if (prev.mutasi.some((m) => m.id === item.id)) {
                return {
                  ...prev,
                  mutasi: prev.mutasi.map((m) => (m.id === item.id ? item : m)),
                }
              }
              return { ...prev, mutasi: [item, ...prev.mutasi] }
            })
          } else if (payload.eventType === 'UPDATE') {
            const item = mapMutasiFromRow(payload.new as MutasiRow)
            setDb((prev) => {
              if (!prev) return prev
              return {
                ...prev,
                mutasi: prev.mutasi.map((m) => (m.id === item.id ? item : m)),
              }
            })
          } else if (payload.eventType === 'DELETE') {
            const id = bacaIdLama(payload.old)
            if (!id) return
            setDb((prev) => {
              if (!prev) return prev
              return {
                ...prev,
                mutasi: prev.mutasi.filter((m) => m.id !== id),
              }
            })
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'penjualan' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const item = mapPenjualanFromRow(payload.new as PenjualanRow)
            setDb((prev) => {
              if (!prev) return prev
              if (prev.penjualan.some((p) => p.id === item.id)) {
                return {
                  ...prev,
                  penjualan: prev.penjualan.map((p) =>
                    p.id === item.id ? item : p,
                  ),
                }
              }
              return { ...prev, penjualan: [item, ...prev.penjualan] }
            })
          } else if (payload.eventType === 'UPDATE') {
            const item = mapPenjualanFromRow(payload.new as PenjualanRow)
            setDb((prev) => {
              if (!prev) return prev
              return {
                ...prev,
                penjualan: prev.penjualan.map((p) =>
                  p.id === item.id ? item : p,
                ),
              }
            })
          } else if (payload.eventType === 'DELETE') {
            const id = bacaIdLama(payload.old)
            if (!id) return
            setDb((prev) => {
              if (!prev) return prev
              return {
                ...prev,
                penjualan: prev.penjualan.filter((p) => p.id !== id),
              }
            })
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bahan' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const item = mapBahanFromRow(payload.new as BahanRow)
            setDb((prev) => {
              if (!prev) return prev
              if (prev.bahan.some((b) => b.id === item.id)) {
                return {
                  ...prev,
                  bahan: prev.bahan.map((b) => (b.id === item.id ? item : b)),
                }
              }
              return { ...prev, bahan: [...prev.bahan, item] }
            })
          } else if (payload.eventType === 'UPDATE') {
            const item = mapBahanFromRow(payload.new as BahanRow)
            setDb((prev) => {
              if (!prev) return prev
              return {
                ...prev,
                bahan: prev.bahan.map((b) => (b.id === item.id ? item : b)),
              }
            })
          } else if (payload.eventType === 'DELETE') {
            const id = bacaIdLama(payload.old)
            if (!id) return
            setDb((prev) => {
              if (!prev) return prev
              return {
                ...prev,
                bahan: prev.bahan.filter((b) => b.id !== id),
              }
            })
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const item = mapMenuFromRow(payload.new as MenuRow)
            setDb((prev) => {
              if (!prev) return prev
              if (prev.menu.some((m) => m.id === item.id)) {
                return {
                  ...prev,
                  menu: prev.menu.map((m) => (m.id === item.id ? item : m)),
                }
              }
              return { ...prev, menu: [...prev.menu, item] }
            })
          } else if (payload.eventType === 'UPDATE') {
            const item = mapMenuFromRow(payload.new as MenuRow)
            setDb((prev) => {
              if (!prev) return prev
              return {
                ...prev,
                menu: prev.menu.map((m) => (m.id === item.id ? item : m)),
              }
            })
          } else if (payload.eventType === 'DELETE') {
            const id = bacaIdLama(payload.old)
            if (!id) return
            setDb((prev) => {
              if (!prev) return prev
              return {
                ...prev,
                menu: prev.menu.filter((m) => m.id !== id),
              }
            })
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pengaturan' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const item = mapPengaturanFromRow(payload.new as PengaturanRow)
            setDb((prev) => (prev ? { ...prev, pengaturan: item } : prev))
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pengguna' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const item = mapPenggunaFromRow(payload.new as PenggunaRow)
            setDb((prev) => {
              if (!prev) return prev
              const ada = prev.users.some((u) => u.id === item.id)
              return {
                ...prev,
                users: ada
                  ? prev.users.map((u) => (u.id === item.id ? item : u))
                  : [...prev.users, item],
              }
            })
          } else if (payload.eventType === 'DELETE') {
            const id = bacaIdLama(payload.old)
            if (!id) return
            setDb((prev) => {
              if (!prev) return prev
              return {
                ...prev,
                users: prev.users.filter((u) => u.id !== id),
              }
            })
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'log_aktivitas' },
        (payload) => {
          const item = mapLogFromRow(payload.new as LogAktivitasRow)
          setDb((prev) => {
            if (!prev) return prev
            if (prev.log.some((l) => l.id === item.id)) return prev
            return {
              ...prev,
              log: [item, ...prev.log].slice(0, 250),
            }
          })
        },
      )
      .subscribe()

    return () => {
      if (supabase) {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  // 4. Interval background pemrosesan antrean outbox setiap 15 detik
  useEffect(() => {
    if (!apakahSupabaseAktif) return

    const interval = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        prosesAntreanOutbox().catch(console.error)
      }
    }, 15000)

    return () => clearInterval(interval)
  }, [])

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
      const akun = db.users.find((u) => u.username.toLowerCase() === bersih)
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
      let userDiperbarui: User | null = null

      setDb((prev) => {
        if (!prev) return prev
        const operator = prev.users.find((u) => u.id === userId)
        const sekarang = new Date().toISOString()
        const updatedUsers = prev.users.map((u) => {
          if (u.id === id) {
            userDiperbarui = {
              ...u,
              salt,
              passwordHash: hash,
              passwordChangedAt: sekarang,
            }
            return userDiperbarui
          }
          return u
        })

        const logItem = {
          id: uid('log'),
          at: sekarang,
          userId: userId ?? 'sistem',
          userName: operator?.nama ?? 'Sistem',
          aksi: 'Ganti password',
          detail: `Password akun "${prev.users.find((u) => u.id === id)?.username ?? id}" diperbarui`,
        }

        return {
          ...prev,
          users: updatedUsers,
          log: [logItem, ...prev.log].slice(0, 250),
        }
      })

      if (userDiperbarui && apakahSupabaseAktif) {
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          simpanPenggunaCloud(userDiperbarui).catch(() => {
            antrekanAksi({
              aksi: 'pengguna',
              tipeOperasi: 'update',
              payload: { user: userDiperbarui },
            }).catch(console.error)
          })
        } else {
          antrekanAksi({
            aksi: 'pengguna',
            tipeOperasi: 'update',
            payload: { user: userDiperbarui },
          }).catch(console.error)
        }
      }
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
