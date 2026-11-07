import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  abaikanKonflik,
  ambilSemuaAntrean,
  cobaUlangKonflik,
  langgananStatusAntrean,
  prosesAntreanOutbox,
  type OutboxItem,
} from '../lib/outboxQueue'
import { apakahSupabaseAktif, periksaKoneksiOnline } from '../lib/supabase'

export function StatusKoneksi() {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [cloudTerhubung, setCloudTerhubung] = useState<boolean>(false)
  const [tertundaCount, setTertundaCount] = useState<number>(0)
  const [konflikCount, setKonflikCount] = useState<number>(0)
  const [sedangSinkron, setSedangSinkron] = useState<boolean>(false)
  const [memeriksa, setMemeriksa] = useState<boolean>(false)
  const [panelBuka, setPanelBuka] = useState(false)
  const [daftarKonflik, setDaftarKonflik] = useState<OutboxItem[]>([])

  const muatKonflik = useCallback(async () => {
    const semua = await ambilSemuaAntrean()
    setDaftarKonflik(semua.filter((item) => item.status === 'konflik'))
  }, [])

  // 1. Langganan status outbox queue
  useEffect(() => {
    const unsub = langgananStatusAntrean((jumlah, proses, konflik) => {
      setTertundaCount(jumlah)
      setSedangSinkron(proses)
      setKonflikCount(konflik)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (panelBuka || konflikCount > 0) muatKonflik().catch(console.error)
  }, [panelBuka, konflikCount, muatKonflik])

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

    if (apakahSupabaseAktif && navigator.onLine) {
      periksaKoneksiOnline().then(setCloudTerhubung)
    }

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
        const statusOnline = await periksaKoneksiOnline()
        setCloudTerhubung(statusOnline)
        if (statusOnline) await prosesAntreanOutbox()
        await muatKonflik()
      }
    } finally {
      setMemeriksa(false)
    }
  }

  const cobaItem = async (id: string) => {
    await cobaUlangKonflik(id)
    await muatKonflik()
  }

  const buangItem = async (id: string) => {
    await abaikanKonflik(id)
    await muatKonflik()
  }

  const tombolKonflik = konflikCount > 0 && (
    <button
      type="button"
      onClick={() => setPanelBuka((v) => !v)}
      className="flex items-center gap-1.5 rounded-full border border-danger/40 bg-danger-soft px-2.5 py-1 text-[11px] font-semibold text-danger hover:bg-danger/10 transition-colors"
      title={`${konflikCount} transaksi ditolak server dan menunggu keputusan admin.`}
    >
      <span className="size-2 rounded-full bg-danger" />
      <span>{konflikCount} Konflik</span>
    </button>
  )

  const panel = panelBuka && konflikCount > 0 && (
    <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-line bg-white p-3 text-left shadow-xl shadow-espresso/10">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold text-espresso">Transaksi perlu tindakan</p>
        <button
          type="button"
          className="text-muted hover:text-ink"
          onClick={() => setPanelBuka(false)}
          aria-label="Tutup"
        >
          ✕
        </button>
      </div>
      <p className="mb-3 text-[10px] leading-relaxed text-muted">
        Data ini <b>tidak dihapus</b>. Periksa stok, lalu coba kirim ulang atau
        buang jika memang sudah tidak diperlukan.
      </p>
      <div className="max-h-64 space-y-2 overflow-y-auto">
        {daftarKonflik.map((item) => (
          <div key={item.id} className="rounded-lg border border-line bg-cream/60 p-2">
            <p className="text-[11px] font-semibold text-ink">
              {item.aksi} · {new Date(item.createdAt).toLocaleString('id-ID')}
            </p>
            <p className="mt-0.5 text-[10px] leading-snug text-danger">
              {item.lastError ?? 'Ditolak server.'}
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => cobaItem(item.id)}
              >
                Coba lagi
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm text-danger"
                onClick={() => buangItem(item.id)}
              >
                Buang
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  let tombol: ReactNode

  if (!apakahSupabaseAktif) {
    tombol = (
      <div
        className="flex items-center gap-1.5 rounded-full border border-line bg-cream/70 px-2.5 py-1 text-[11px] font-medium text-muted"
        title="Supabase belum dikonfigurasi. Data tersimpan lokal di browser ini."
      >
        <span className="size-2 rounded-full bg-latte/70" />
        <span className="hidden sm:inline">Mode Lokal</span>
      </div>
    )
  } else if (sedangSinkron || memeriksa) {
    tombol = (
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
  } else if (!online || !cloudTerhubung || tertundaCount > 0) {
    tombol = (
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
  } else {
    tombol = (
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

  return (
    <div className="relative flex items-center gap-2">
      {tombol}
      {apakahSupabaseAktif && tombolKonflik}
      {panel}
    </div>
  )
}
