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
import {
  buatPassword,
  hapusSesi,
  ambilSesi,
  simpanSesi,
  verifikasiPassword,
} from '../lib/auth'
import {
  mapBahanFromRow,
  mapLogFromRow,
  mapMenuFromRow,
  mapMutasiFromRow,
  mapPengaturanFromRow,
  mapPenjualanFromRow,
  mapProfilFromRow,
  type BahanRow,
  type LogAktivitasRow,
  type MenuRow,
  type MutasiRow,
  type PengaturanRow,
  type PenjualanRow,
  type ProfilRow,
} from '../lib/cloudDb'
import { ambilProfilCloud } from '../lib/rpc'
import { langgananPeristiwaSinkron } from '../lib/peristiwa'
import { sinkronkanAwal } from '../lib/sinkron'
import { inisialisasiDB } from '../lib/seed'
import { simpanDB } from '../lib/storage'
import {
  apakahSupabaseAktif,
  emailDariUsername,
  supabase,
} from '../lib/supabase'

interface AuthContextValue {
  db: DB | null
  setDb: Dispatch<SetStateAction<DB | null>>
  user: User | null
  siap: boolean
  modeOnline: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  gantiPassword: (userId: string, passwordBaru: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const KUNCI_PROFIL_CACHE = 'banggala_profil_cache'

function bacaIdLama(record: unknown): string | null {
  if (record && typeof record === 'object' && 'id' in record && typeof record.id === 'string') {
    return record.id
  }
  return null
}

function bacaCacheProfil(): User | null {
  try {
    const mentah = localStorage.getItem(KUNCI_PROFIL_CACHE)
    if (!mentah) return null
    const data = JSON.parse(mentah) as User
    if (!data?.id || !data?.username) return null
    return data
  } catch {
    return null
  }
}

function simpanCacheProfil(profil: User | null): void {
  try {
    if (!profil) {
      localStorage.removeItem(KUNCI_PROFIL_CACHE)
      return
    }
    localStorage.setItem(KUNCI_PROFIL_CACHE, JSON.stringify(profil))
  } catch {
    // cache bersifat opsional
  }
}

function gabungProfilKeDb(db: DB, profil: User): DB {
  const ada = db.users.some((u) => u.id === profil.id)
  return {
    ...db,
    users: ada
      ? db.users.map((u) => (u.id === profil.id ? profil : u))
      : [...db.users, profil],
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB | null>(null)
  const [siap, setSiap] = useState(false)
  const [userId, setUserId] = useState<string | null>(
    () => (apakahSupabaseAktif ? null : (ambilSesi()?.userId ?? null)),
  )
  const [profil, setProfil] = useState<User | null>(() =>
    apakahSupabaseAktif ? bacaCacheProfil() : null,
  )
  const [galatInit, setGalatInit] = useState<string | null>(null)

  // ----------------------------------------------------------------------------
  // 1. Startup: cache lokal dulu, lalu sesi & snapshot cloud
  // ----------------------------------------------------------------------------
  useEffect(() => {
    let aktif = true

    async function inisialisasi() {
      try {
        const dataLokal = await inisialisasiDB()
        if (!aktif) return
        setDb(dataLokal)

        if (!apakahSupabaseAktif) {
          setUserId(ambilSesi()?.userId ?? null)
          setSiap(true)
          return
        }

        // --- Mode online ---
        const cache = bacaCacheProfil()
        if (cache) setProfil(cache)

        const { data: sesi, error: errorSesi } = await supabase!.auth.getSession()
        if (!aktif) return

        const sedangOnline =
          typeof navigator === 'undefined' || navigator.onLine
        const galatJaringanSesi =
          Boolean(errorSesi) &&
          /fetch|network|load failed|timeout|abort/i.test(errorSesi!.message)

        if (!sesi.session && (!sedangOnline || galatJaringanSesi)) {
          // Offline (atau jaringan gagal): access token bisa saja kedaluwarsa,
          // tetapi profil cache tetap dipakai agar kasir masih bisa mencatat.
          if (cache) setProfil(cache)
        } else if (!sesi.session) {
          setProfil(null)
          simpanCacheProfil(null)
        } else if (sedangOnline) {
          try {
            const profilCloud = await ambilProfilCloud(sesi.session.user.id)
            if (!aktif) return
            if (profilCloud && profilCloud.aktif) {
              setProfil(profilCloud)
              simpanCacheProfil(profilCloud)
              setDb((prev) => (prev ? gabungProfilKeDb(prev, profilCloud) : prev))
            } else {
              // Profil tidak ada (dihapus) atau sudah nonaktif: sesi tidak sah.
              await supabase!.auth.signOut()
              setProfil(null)
              simpanCacheProfil(null)
            }
          } catch (error) {
            // Offline / server tidak terjangkau: tetap pakai cache.
            console.warn('[Banggala Stock] Profil cloud tidak dapat dimuat:', error)
            if (cache) setProfil(cache)
          }
        }

        setSiap(true)

        // Sinkronisasi background: outbox dulu, baru snapshot cloud.
        if (
          sesi.session &&
          typeof navigator !== 'undefined' &&
          navigator.onLine
        ) {
          sinkronkanAwal()
            .then((dataCloud) => {
              if (!aktif || !dataCloud) return
              setDb(dataCloud)
              simpanDB(dataCloud)
            })
            .catch((error) => {
              console.warn('[Banggala Stock] Sinkronisasi awal gagal:', error)
            })
        }
      } catch (error: unknown) {
        if (!aktif) return
        setGalatInit(error instanceof Error ? error.message : 'Gagal memuat data.')
        setSiap(true)
      }
    }

    inisialisasi()

    return () => {
      aktif = false
    }
  }, [])

  // ----------------------------------------------------------------------------
  // 2. Persist snapshot ke localStorage (cache offline)
  // ----------------------------------------------------------------------------
  useEffect(() => {
    if (!db) return
    try {
      simpanDB(db)
    } catch (error) {
      console.error('[Banggala Stock] Gagal menyimpan ke localStorage:', error)
    }
  }, [db])

  // ----------------------------------------------------------------------------
  // 3. Realtime Supabase
  // ----------------------------------------------------------------------------
  useEffect(() => {
    if (!apakahSupabaseAktif || !supabase || !profil?.id) return

    const perbaruiKoleksi = <T extends { id: string }>(
      daftar: T[],
      item: T,
      urutanAwal = false,
    ): T[] => {
      if (daftar.some((x) => x.id === item.id)) {
        return daftar.map((x) => (x.id === item.id ? item : x))
      }
      return urutanAwal ? [item, ...daftar] : [...daftar, item]
    }

    const channel = supabase
      .channel('banggala_realtime_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mutasi' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const item = mapMutasiFromRow(payload.new as MutasiRow)
            setDb((prev) =>
              prev
                ? {
                    ...prev,
                    mutasi: perbaruiKoleksi(prev.mutasi, item, true),
                  }
                : prev,
            )
          } else if (payload.eventType === 'UPDATE') {
            const item = mapMutasiFromRow(payload.new as MutasiRow)
            setDb((prev) =>
              prev
                ? { ...prev, mutasi: perbaruiKoleksi(prev.mutasi, item) }
                : prev,
            )
          } else if (payload.eventType === 'DELETE') {
            const id = bacaIdLama(payload.old)
            if (!id) return
            setDb((prev) =>
              prev ? { ...prev, mutasi: prev.mutasi.filter((m) => m.id !== id) } : prev,
            )
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'penjualan' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const item = mapPenjualanFromRow(payload.new as PenjualanRow)
            setDb((prev) =>
              prev
                ? {
                    ...prev,
                    penjualan: perbaruiKoleksi(prev.penjualan, item, true),
                  }
                : prev,
            )
          } else if (payload.eventType === 'UPDATE') {
            const item = mapPenjualanFromRow(payload.new as PenjualanRow)
            setDb((prev) =>
              prev
                ? { ...prev, penjualan: perbaruiKoleksi(prev.penjualan, item) }
                : prev,
            )
          } else if (payload.eventType === 'DELETE') {
            const id = bacaIdLama(payload.old)
            if (!id) return
            setDb((prev) =>
              prev
                ? { ...prev, penjualan: prev.penjualan.filter((p) => p.id !== id) }
                : prev,
            )
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bahan' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const item = mapBahanFromRow(payload.new as BahanRow)
            setDb((prev) => (prev ? { ...prev, bahan: perbaruiKoleksi(prev.bahan, item) } : prev))
          } else if (payload.eventType === 'DELETE') {
            const id = bacaIdLama(payload.old)
            if (!id) return
            setDb((prev) =>
              prev ? { ...prev, bahan: prev.bahan.filter((b) => b.id !== id) } : prev,
            )
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const item = mapMenuFromRow(payload.new as MenuRow)
            setDb((prev) => (prev ? { ...prev, menu: perbaruiKoleksi(prev.menu, item) } : prev))
          } else if (payload.eventType === 'DELETE') {
            const id = bacaIdLama(payload.old)
            if (!id) return
            setDb((prev) =>
              prev ? { ...prev, menu: prev.menu.filter((m) => m.id !== id) } : prev,
            )
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
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const item = mapProfilFromRow(payload.new as ProfilRow)
            setDb((prev) => (prev ? gabungProfilKeDb(prev, item) : prev))
            if (item.id === profil.id) {
              setProfil(item)
              simpanCacheProfil(item)
              if (!item.aktif) {
                supabase!.auth.signOut().catch(console.error)
                setProfil(null)
                simpanCacheProfil(null)
              }
            }
          } else if (payload.eventType === 'DELETE') {
            const id = bacaIdLama(payload.old)
            if (!id) return
            setDb((prev) =>
              prev ? { ...prev, users: prev.users.filter((u) => u.id !== id) } : prev,
            )
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
            return { ...prev, log: [item, ...prev.log].slice(0, 250) }
          })
        },
      )
      .subscribe()

    return () => {
      supabase?.removeChannel(channel)
    }
  }, [profil?.id, profil?.aktif])

  // ----------------------------------------------------------------------------
  // 4. Sesi Auth berubah (login/logout/refresh)
  // ----------------------------------------------------------------------------
  useEffect(() => {
    if (!apakahSupabaseAktif || !supabase) return

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setProfil(null)
        simpanCacheProfil(null)
        return
      }
      // INITIAL_SESSION bisa bernilai null saat offline (token kedaluwarsa
      // tetapi refresh belum bisa dihubungi). Jangan hapus profil cache;
      // kasir harus tetap bisa membuka aplikasi dan mencatat transaksi.
      if (!session) return
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Profil dimuat oleh alur login; di sini cukup pastikan cache ada.
        if (!bacaCacheProfil() && session.user.id) {
          ambilProfilCloud(session.user.id)
            .then((p) => {
              if (p?.aktif) {
                setProfil(p)
                simpanCacheProfil(p)
              }
            })
            .catch(() => undefined)
        }
      }
    })

    return () => data.subscription.unsubscribe()
  }, [])

  // ----------------------------------------------------------------------------
  // 5. Proses outbox berkala + reaksi terhadap konflik
  // ----------------------------------------------------------------------------
  useEffect(() => {
    if (!apakahSupabaseAktif || !profil?.id) return undefined
    const interval = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        sinkronkanAwal()
          .then((dataCloud) => {
            if (dataCloud) setDb(dataCloud)
          })
          .catch(() => undefined)
      }
    }, 20000)
    return () => clearInterval(interval)
  }, [profil?.id])

  useEffect(() => {
    if (!profil?.id) return undefined
    return langgananPeristiwaSinkron((peristiwa) => {
      if (peristiwa.tipe !== 'perlu-sinkron-ulang') return
      if (!apakahSupabaseAktif) return
      if (typeof navigator !== 'undefined' && !navigator.onLine) return
      sinkronkanAwal()
        .then((dataCloud) => {
          if (dataCloud) setDb(dataCloud)
        })
        .catch((error) => {
          console.warn('[Banggala Stock] Sinkron ulang gagal:', error)
        })
    })
  }, [profil?.id])

  // ----------------------------------------------------------------------------
  // 6. Aksi autentikasi
  // ----------------------------------------------------------------------------
  const user = useMemo(() => {
    if (apakahSupabaseAktif) return profil
    if (!db || !userId) return null
    return db.users.find((u) => u.id === userId && u.aktif) ?? null
  }, [db, userId, profil])

  const login = useCallback(
    async (username: string, password: string) => {
      const bersih = username.trim().toLowerCase()
      if (!bersih || !password) {
        throw new Error('Username dan password wajib diisi.')
      }

      if (apakahSupabaseAktif) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          throw new Error(
            'Login membutuhkan koneksi internet. Gunakan perangkat yang sudah pernah login untuk membuka aplikasi secara offline.',
          )
        }

        const { data, error } = await supabase!.auth.signInWithPassword({
          email: emailDariUsername(bersih),
          password,
        })

        if (error) {
          if (/fetch|network|load failed/i.test(error.message)) {
            throw new Error('Gagal terhubung ke server. Periksa koneksi internet.')
          }
          throw new Error('Username atau password salah.')
        }
        if (!data.user) throw new Error('Login gagal. Coba lagi.')

        const profilCloud = await ambilProfilCloud(data.user.id)
        if (!profilCloud) {
          await supabase!.auth.signOut()
          throw new Error('Akun belum memiliki profil. Hubungi admin.')
        }
        if (!profilCloud.aktif) {
          await supabase!.auth.signOut()
          throw new Error('Akun ini sedang dinonaktifkan.')
        }

        setProfil(profilCloud)
        simpanCacheProfil(profilCloud)
        setDb((prev) => (prev ? gabungProfilKeDb(prev, profilCloud) : prev))

        sinkronkanAwal()
          .then((dataCloud) => {
            if (dataCloud) setDb(dataCloud)
          })
          .catch(console.error)
        return
      }

      // --- Mode lokal (fallback tanpa Supabase) ---
      if (!db) throw new Error('Data belum siap. Coba lagi sebentar.')
      const akun = db.users.find((u) => u.username.toLowerCase() === bersih)
      if (!akun || !akun.salt || !akun.passwordHash) {
        throw new Error('Username atau password salah.')
      }
      if (!akun.aktif) throw new Error('Akun ini sedang dinonaktifkan.')

      const cocok = await verifikasiPassword(password, akun.salt, akun.passwordHash)
      if (!cocok) throw new Error('Username atau password salah.')

      simpanSesi(akun.id)
      setUserId(akun.id)
    },
    [db],
  )

  const logout = useCallback(() => {
    if (apakahSupabaseAktif) {
      supabase?.auth.signOut().catch(console.error)
      setProfil(null)
      simpanCacheProfil(null)
      return
    }
    hapusSesi()
    setUserId(null)
  }, [])

  const gantiPassword = useCallback(
    async (id: string, passwordBaru: string) => {
      if (passwordBaru.length < 6) {
        throw new Error('Password minimal 6 karakter.')
      }

      if (apakahSupabaseAktif) {
        if (!profil || id !== profil.id) {
          throw new Error('Ganti password pengguna lain lewat halaman Pengguna.')
        }
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          throw new Error('Ganti password membutuhkan koneksi internet.')
        }
        const { error } = await supabase!.auth.updateUser({ password: passwordBaru })
        if (error) throw new Error(error.message || 'Gagal mengganti password.')
        const sekarang = new Date().toISOString()
        setProfil((prev) => (prev ? { ...prev, passwordChangedAt: sekarang } : prev))
        simpanCacheProfil({ ...profil, passwordChangedAt: sekarang })
        setDb((prev) =>
          prev
            ? {
                ...prev,
                users: prev.users.map((u) =>
                  u.id === id ? { ...u, passwordChangedAt: sekarang } : u,
                ),
              }
            : prev,
        )
        return
      }

      // --- Mode lokal ---
      const { salt, hash } = await buatPassword(passwordBaru)
      const sekarang = new Date().toISOString()

      setDb((prev) => {
        if (!prev) return prev
        const operator = prev.users.find((u) => u.id === userId)
        const target = prev.users.find((u) => u.id === id)
        const logItem = {
          id: `log_${Date.now().toString(36)}`,
          at: sekarang,
          userId: userId ?? 'sistem',
          userName: operator?.nama ?? 'Sistem',
          aksi: 'Ganti password',
          detail: `Password akun "${target?.username ?? id}" diperbarui`,
        }
        return {
          ...prev,
          users: prev.users.map((u) =>
            u.id === id
              ? { ...u, salt, passwordHash: hash, passwordChangedAt: sekarang }
              : u,
          ),
          log: [logItem, ...prev.log].slice(0, 250),
        }
      })
    },
    [profil, userId],
  )

  const nilai = useMemo<AuthContextValue>(
    () => ({
      db,
      setDb,
      user,
      siap,
      modeOnline: apakahSupabaseAktif,
      login,
      logout,
      gantiPassword,
    }),
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
