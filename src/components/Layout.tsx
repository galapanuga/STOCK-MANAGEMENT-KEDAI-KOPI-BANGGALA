import { useEffect, useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import {
  IconBook,
  IconBox,
  IconChart,
  IconGrid,
  IconLogout,
  IconMenu,
  IconReceipt,
  IconSettings,
  IconSwap,
  IconUsers,
  IconX,
} from './Icons'
import { formatTanggalPanjang, sapaan } from '../lib/format'

const JUDUL_HALAMAN: Record<string, string> = {
  '/': 'Dashboard',
  '/bahan': 'Bahan & Stok',
  '/menu': 'Menu & Resep',
  '/penjualan': 'Penjualan',
  '/mutasi': 'Mutasi Stok',
  '/laporan': 'Laporan',
  '/pengguna': 'Pengguna',
  '/pengaturan': 'Pengaturan',
}

function inisial(nama: string): string {
  return nama
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('')
}

export function Layout() {
  const { user, logout } = useAuth()
  const { db, stok } = useData()
  const toast = useToast()
  const lokasi = useLocation()
  const [menuTerbuka, setMenuTerbuka] = useState(false)

  useEffect(() => {
    setMenuTerbuka(false)
    window.scrollTo({ top: 0 })
  }, [lokasi.pathname])

  const jumlahMenipis = useMemo(() => {
    let n = 0
    for (const b of db.bahan) {
      if (b.arsip) continue
      const s = stok.get(b.id)
      if (s && s.status !== 'aman') n++
    }
    return n
  }, [db.bahan, stok])

  const navigasi = [
    { ke: '/', label: 'Dashboard', ikon: IconGrid, tepat: true },
    { ke: '/menu', label: 'Menu & Resep', ikon: IconBook },
    { ke: '/penjualan', label: 'Penjualan', ikon: IconReceipt },
    { ke: '/bahan', label: 'Bahan & Stok', ikon: IconBox },
    { ke: '/mutasi', label: 'Mutasi Stok', ikon: IconSwap },
    { ke: '/laporan', label: 'Laporan', ikon: IconChart },
  ]

  const navigasiAdmin = [
    { ke: '/pengguna', label: 'Pengguna', ikon: IconUsers },
    { ke: '/pengaturan', label: 'Pengaturan', ikon: IconSettings },
  ]

  const keluar = () => {
    logout()
    toast.info('Anda telah keluar. Sampai jumpa!')
  }

  return (
    <div className="app-surface min-h-screen">
      {menuTerbuka && (
        <div
          className="animate-fade fixed inset-0 z-40 bg-espresso/50 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMenuTerbuka(false)}
        />
      )}

      <aside
        className={`no-print fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col bg-espresso text-cream transition-transform duration-300 lg:translate-x-0 ${
          menuTerbuka ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-[76px] shrink-0 items-center justify-center rounded-xl bg-paper px-1.5 shadow-lg shadow-black/20">
              <img
                src="/images/logo.png"
                alt="Kedai Kopi Banggala"
                className="w-full object-contain"
              />
            </div>
            <div>
              <p className="font-display text-[15px] leading-tight font-bold tracking-tight text-white">
                Banggala Stock
              </p>
              <p className="mt-1 text-[9px] font-semibold tracking-[0.15em] text-latte/60 uppercase">
                Kedai Kopi Banggala
              </p>
            </div>
          </div>
          <button
            className="rounded-lg p-1.5 text-latte/70 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => setMenuTerbuka(false)}
            aria-label="Tutup menu"
          >
            <IconX className="size-5" />
          </button>
        </div>

        <div className="mx-5 mb-4 h-px bg-white/10" />

        <nav className="scroll-thin flex-1 space-y-1 overflow-y-auto px-3">
          <p className="px-3 pb-2 text-[9px] font-bold tracking-[0.2em] text-latte/40 uppercase">
            Operasional
          </p>
          {navigasi.map((item) => (
            <NavLink
              key={item.ke}
              to={item.ke}
              end={item.tepat}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
            >
              <item.ikon className="size-[18px] shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.ke === '/bahan' && jumlahMenipis > 0 && (
                <span className="rounded-full bg-caramel px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {jumlahMenipis}
                </span>
              )}
            </NavLink>
          ))}

          {user?.role === 'admin' && (
            <>
              <p className="px-3 pt-5 pb-2 text-[9px] font-bold tracking-[0.2em] text-latte/40 uppercase">
                Administrasi
              </p>
              {navigasiAdmin.map((item) => (
                <NavLink
                  key={item.ke}
                  to={item.ke}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'nav-link-active' : ''}`
                  }
                >
                  <item.ikon className="size-[18px] shrink-0" />
                  <span className="flex-1">{item.label}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="p-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 shrink-0 place-items-center rounded-full bg-caramel/90 text-xs font-bold text-white">
                {inisial(user?.nama ?? '?')}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-white">
                  {user?.nama}
                </p>
                <p className="text-[10px] tracking-wide text-latte/50 uppercase">
                  {user?.role === 'admin' ? 'Administrator' : 'Staf'}
                </p>
              </div>
              <button
                onClick={keluar}
                className="rounded-lg p-1.5 text-latte/60 transition-colors hover:bg-white/10 hover:text-white"
                title="Keluar"
                aria-label="Keluar"
              >
                <IconLogout className="size-4.5" />
              </button>
            </div>
          </div>
          <p className="mt-3 px-1 text-center text-[10px] text-latte/35">
            Data tersimpan lokal di perangkat ini
          </p>
        </div>
      </aside>

      <div className="app-shell flex min-h-screen flex-col lg:pl-[268px]">
        <header className="no-print sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-paper/90 px-4 shadow-[0_2px_10px_rgba(42,24,16,0.025)] backdrop-blur-md lg:px-8">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg border border-line bg-white p-2 text-mocha lg:hidden"
              onClick={() => setMenuTerbuka(true)}
              aria-label="Buka menu"
            >
              <IconMenu className="size-5" />
            </button>
            <div>
              <p className="eyebrow text-muted">
                {db.pengaturan.namaKedai}
              </p>
              <p className="font-display text-[15px] font-bold text-espresso">
                {JUDUL_HALAMAN[lokasi.pathname] ?? 'Dashboard'}
              </p>
            </div>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <div className="text-right">
              <p className="text-[10px] font-semibold tracking-wide text-muted uppercase">
                {sapaan()}
              </p>
              <p className="text-xs font-medium text-mocha">
                {formatTanggalPanjang(new Date())}
              </p>
            </div>
            <div className="grid size-9 place-items-center rounded-full bg-espresso text-[11px] font-bold text-cream">
              {inisial(user?.nama ?? '?')}
            </div>
          </div>
        </header>

        <main className="app-main mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>

        <footer className="no-print border-t border-line px-4 py-4 text-center text-[11px] text-muted lg:px-8">
          Banggala Stock v2.0 · Pencatatan stok, menu, dan penjualan kedai kopi
        </footer>
      </div>
    </div>
  )
}
