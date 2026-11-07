import { useEffect, useState } from 'react'
import {
  langgananStatusAntrean,
  prosesAntreanOutbox,
} from '../lib/outboxQueue'
import { apakahSupabaseAktif, periksaKoneksiOnline } from '../lib/supabase'

export function StatusKoneksi() {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [cloudTerhubung, setCloudTerhubung] = useState<boolean>(false)
  const [tertundaCount, setTertundaCount] = useState<number>(0)
  const [sedangSinkron, setSedangSinkron] = useState<boolean>(false)
  const [memeriksa, setMemeriksa] = useState<boolean>(false)

  // 1. Langganan status outbox queue
  useEffect(() => {
    const unsub = langgananStatusAntrean((jumlah, proses) => {
      setTertundaCount(jumlah)
      setSedangSinkron(proses)
    })
    return unsub
  }, [])

  // 2. Listener status jaringan window
  useEffect(() => {
    function handleOnline() {
      setOnline(true)
      if (apakahSupabaseAktif) {
        periksaKoneksiOnline().then(setCloudTerhubung)
        prosesAntreanOutbox().catch(console.error)
      }
    }

    function handleOffline() {
      setOnline(false)
      setCloudTerhubung(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Cek konektivitas awal
    if (apakahSupabaseAktif && navigator.onLine) {
      periksaKoneksiOnline().then(setCloudTerhubung)
    }

    // Interval ping ringan setiap 30 detik
    const pingInterval = setInterval(() => {
      if (apakahSupabaseAktif && navigator.onLine) {
        periksaKoneksiOnline().then(setCloudTerhubung)
      }
    }, 30000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(pingInterval)
    }
  }, [])

  const sinkronManual = async () => {
    if (sedangSinkron || memeriksa) return
    setMemeriksa(true)
    try {
      if (apakahSupabaseAktif) {
        const isOnline = await periksaKoneksiOnline()
        setCloudTerhubung(isOnline)
        if (isOnline) {
          await prosesAntreanOutbox()
        }
      }
    } finally {
      setMemeriksa(false)
    }
  }

  // Jika Supabase belum dikonfigurasi (.env kosong)
  if (!apakahSupabaseAktif) {
    return (
      <div
        className="flex items-center gap-1.5 rounded-full border border-line bg-cream/70 px-2.5 py-1 text-[11px] font-medium text-muted"
        title="Supabase belum dikonfigurasi. Data tersimpan lokal di browser ini."
      >
        <span className="size-2 rounded-full bg-latte/70" />
        <span className="hidden sm:inline">Mode Lokal</span>
      </div>
    )
  }

  // Jika sedang menyinkronkan data antrean
  if (sedangSinkron || memeriksa) {
    return (
      <button
        type="button"
        disabled
        className="flex items-center gap-1.5 rounded-full border border-caramel/30 bg-caramel/10 px-2.5 py-1 text-[11px] font-semibold text-caramel transition-colors"
      >
        <svg
          className="size-3 animate-spin text-caramel"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span>Menyinkronkan…</span>
      </button>
    )
  }

  // Jika offline atau ada antrean tertunda
  if (!online || !cloudTerhubung || tertundaCount > 0) {
    return (
      <button
        type="button"
        onClick={sinkronManual}
        className="flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-[11px] font-semibold text-warning-strong hover:bg-warning/20 transition-colors"
        title={
          tertundaCount > 0
            ? `${tertundaCount} data tersimpan di antrean offline lokal. Klik untuk mencoba sinkronisasi sekarang.`
            : 'Koneksi internet terputus. Data tetap tersimpan aman di perangkat.'
        }
      >
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-warning opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-warning" />
        </span>
        <span>
          {!online || !cloudTerhubung
            ? tertundaCount > 0
              ? `Offline (${tertundaCount} Tertunda)`
              : 'Offline'
            : `${tertundaCount} Tertunda`}
        </span>
      </button>
    )
  }

  // Kondisi Online & Tersinkronisasi Penuh
  return (
    <button
      type="button"
      onClick={sinkronManual}
      className="flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success transition-colors hover:bg-success/20"
      title="Terhubung ke cloud database Supabase secara real-time. Klik untuk cek koneksi."
    >
      <span className="size-2 rounded-full bg-success" />
      <span className="hidden sm:inline">Online (Tersinkron)</span>
      <span className="sm:hidden">Online</span>
    </button>
  )
}
