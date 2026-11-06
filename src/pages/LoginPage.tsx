import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  IconAlert,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconShield,
} from '../components/Icons'

export function LoginPage() {
  const { login, user, db } = useAuth()
  const navigate = useNavigate()
  const lokasi = useLocation()
  const dari = (lokasi.state as { dari?: string } | null)?.dari ?? '/'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [lihatPassword, setLihatPassword] = useState(false)
  const [galat, setGalat] = useState('')
  const [memproses, setMemproses] = useState(false)
  const tanggalBerdiri = db?.pengaturan.tanggalBerdiri ?? '2024-01-15'
  const tanggalBerdiriLabel = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${tanggalBerdiri}T00:00:00`))

  if (user) return <Navigate to={dari} replace />

  const kirim = async (e: FormEvent) => {
    e.preventDefault()
    setGalat('')
    setMemproses(true)
    try {
      await login(username, password)
      navigate(dari, { replace: true })
    } catch (error) {
      setGalat(
        error instanceof Error ? error.message : 'Gagal masuk. Coba lagi.',
      )
    } finally {
      setMemproses(false)
    }
  }

  const isiDemo = () => {
    setUsername('admin')
    setPassword('admin123')
    setGalat('')
  }

  return (
    <div className="app-surface min-h-screen lg:grid lg:grid-cols-[1.02fr_1fr]">
      <section className="relative hidden overflow-hidden bg-[linear-gradient(135deg,#190e09_0%,#2a1810_62%,#42291b_100%)] px-12 py-14 text-cream lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-24 size-[420px] rounded-full bg-gold/15 blur-3xl" />
          <div className="absolute bottom-0 -left-32 size-[380px] rounded-full bg-coffee/40 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:26px_26px]" />
        </div>

        <div className="relative flex items-center gap-3">
          <div className="flex h-12 w-[88px] items-center justify-center rounded-xl bg-paper px-2 shadow-lg shadow-black/30">
            <img
              src="/images/logo.png"
              alt="Kedai Kopi Banggala"
              className="w-full object-contain"
            />
          </div>
          <div>
            <p className="font-display text-lg leading-none font-bold tracking-tight">
              Banggala Stock
            </p>
            <p className="mt-1 text-[9px] font-semibold tracking-[0.16em] text-latte/60 uppercase">
              Sistem Operasional Kedai
            </p>
          </div>
        </div>

        <div className="relative max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-latte/80 uppercase">
            <span className="size-1.5 rounded-full bg-gold" />
            Sejak {tanggalBerdiriLabel}
          </span>
          <h1 className="mt-5 font-display text-[42px] leading-[1.08] font-bold tracking-tight text-white">
            Sedikit, tapi
            <br />
            terus berjalan.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-latte/70">
            Banggala percaya pada langkah kecil yang konsisten. Kelola bahan,
            atur resep menu, dan catat penjualan yang otomatis memotong stok —
            semuanya dalam satu tempat.
          </p>

          <ul className="mt-8 space-y-3">
            {[
              'Stok bahan terhitung otomatis dari mutasi',
              'Resep menu memotong stok saat terjual',
              'Peringatan saat stok menipis',
            ].map((teks) => (
              <li key={teks} className="flex items-center gap-3 text-sm text-latte/85">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                  <IconCheck className="size-3" />
                </span>
                {teks}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-end justify-between gap-4 text-[11px] text-latte/55">
          <div>
            <p>{db?.pengaturan.kota || 'Jadimulya, Gunungjati, Cirebon'}</p>
            <p className="mt-0.5">Kedai Kopi Banggala</p>
          </div>
          <p>© {new Date().getFullYear()} {db?.pengaturan.namaKedai || 'Kedai Kopi Banggala'}</p>
        </div>
      </section>

      <section className="flex min-h-screen flex-col justify-center px-5 py-10 sm:px-10 lg:px-14">
        <div className="mx-auto w-full max-w-[380px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-[78px] items-center justify-center rounded-xl bg-paper px-1.5 shadow-sm">
              <img
                src="/images/logo.png"
                alt="Kedai Kopi Banggala"
                className="w-full object-contain"
              />
            </div>
            <div>
              <p className="font-display text-[15px] leading-tight font-bold text-espresso">
                Banggala Stock
              </p>
              <p className="mt-1 text-[9px] font-semibold tracking-[0.15em] text-muted uppercase">
                Kedai Kopi Banggala
              </p>
            </div>
          </div>

          <div className="mb-7">
            <p className="eyebrow text-caramel">
              Stok · Menu · Penjualan
            </p>
            <h2 className="mt-2 font-display text-[30px] leading-tight font-bold text-espresso">
              Selamat datang kembali
            </h2>
            <p className="mt-1.5 text-sm text-muted">
              Masuk dengan akun kedai untuk mulai mencatat stok dan penjualan.
            </p>
          </div>

          {galat && (
            <div
              className="mb-4 flex items-start gap-2.5 rounded-xl border border-danger/25 bg-danger-soft/70 px-3.5 py-3 text-sm text-danger"
              role="alert"
            >
              <IconAlert className="mt-0.5 size-4 shrink-0" />
              <span>{galat}</span>
            </div>
          )}

          <form onSubmit={kirim} className="space-y-4">
            <div>
              <label htmlFor="username" className="label">
                Username
              </label>
              <input
                id="username"
                className="input py-2.5"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="mis. admin"
                autoComplete="username"
                autoFocus
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={lihatPassword ? 'text' : 'password'}
                  className="input py-2.5 pr-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setLihatPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted transition-colors hover:text-coffee"
                  aria-label={
                    lihatPassword ? 'Sembunyikan password' : 'Tampilkan password'
                  }
                >
                  {lihatPassword ? (
                    <IconEyeOff className="size-4.5" />
                  ) : (
                    <IconEye className="size-4.5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full py-2.5"
              disabled={memproses}
            >
              {memproses ? 'Memeriksa…' : 'Masuk'}
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-dashed border-line bg-white/60 p-3.5">
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wide text-mocha uppercase">
              <IconShield className="size-3.5" />
              Akun awal
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              Username <span className="font-semibold text-coffee">admin</span> ·
              Password <span className="font-semibold text-coffee">admin123</span>
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted/80">
              Berlaku jika password belum pernah diubah.
            </p>
            <button
              type="button"
              onClick={isiDemo}
              className="mt-2 text-xs font-semibold text-caramel underline-offset-2 hover:underline"
            >
              Isi otomatis
            </button>
          </div>

          <p className="mt-7 text-center text-[11px] leading-relaxed text-muted">
            Lupa password? Hubungi admin kedai untuk reset akun.
            <br />
            Data disimpan aman di browser perangkat ini.
          </p>
        </div>
      </section>
    </div>
  )
}
