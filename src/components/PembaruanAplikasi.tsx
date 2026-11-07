import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Penanda versi baru + status siap offline.
 *
 * Sengaja tidak memakai reload otomatis: kasir bisa sedang mengisi transaksi.
 * Pengguna memilih sendiri kapan memuat ulang aplikasi.
 */
export function PembaruanAplikasi() {
  const {
    needRefresh: [perluMuatUlang, setPerluMuatUlang],
    offlineReady: [siapOffline, setSiapOffline],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registrasi) {
      if (!registrasi) return
      // Periksa pembaruan setiap 30 menit saat aplikasi dibuka.
      setInterval(() => {
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          registrasi.update().catch(() => undefined)
        }
      }, 30 * 60 * 1000)
    },
    onRegisterError(error) {
      console.warn('[PWA] Service worker gagal didaftarkan:', error)
    },
  })

  const [tertutup, setTertutup] = useState(false)

  useEffect(() => {
    if (!siapOffline) return undefined
    const timer = setTimeout(() => setSiapOffline(false), 6000)
    return () => clearTimeout(timer)
  }, [siapOffline, setSiapOffline])

  // Tampilkan lagi bila nanti ada versi baru berikutnya.
  useEffect(() => {
    if (perluMuatUlang) setTertutup(false)
  }, [perluMuatUlang])

  if (tertutup) return null
  if (!perluMuatUlang && !siapOffline) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-line bg-white p-3.5 shadow-xl shadow-espresso/15">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-cream text-base">
          {perluMuatUlang ? '🔄' : '📥'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-espresso">
            {perluMuatUlang ? 'Versi baru tersedia' : 'Siap dipakai offline'}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
            {perluMuatUlang
              ? 'Muat ulang sekarang untuk memakai versi terbaru. Data yang belum tersinkron tetap aman.'
              : 'Aplikasi sudah tersimpan di perangkat ini dan bisa dibuka tanpa internet.'}
          </p>
          <div className="mt-2 flex gap-2">
            {perluMuatUlang && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  updateServiceWorker(true).catch(() => undefined)
                }}
              >
                Muat ulang
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setTertutup(true)
                setPerluMuatUlang(false)
                setSiapOffline(false)
              }}
            >
              Nanti
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
