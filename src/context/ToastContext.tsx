import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { uid } from '../lib/id'

type TipeToast = 'sukses' | 'error' | 'info'

interface Toast {
  id: string
  tipe: TipeToast
  pesan: string
}

interface ToastContextValue {
  sukses: (pesan: string) => void
  error: (pesan: string) => void
  info: (pesan: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const GAYA: Record<TipeToast, string> = {
  sukses: 'border-success/30 bg-white text-success',
  error: 'border-danger/30 bg-white text-danger',
  info: 'border-line bg-white text-coffee',
}

const IKON: Record<TipeToast, string> = {
  sukses: 'M5 13l4 4L19 7',
  error: 'M6 6l12 12M18 6L6 18',
  info: 'M12 8h.01M11 12h1v5h1',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [daftar, setDaftar] = useState<Toast[]>([])

  const buang = useCallback((id: string) => {
    setDaftar((d) => d.filter((t) => t.id !== id))
  }, [])

  const tambah = useCallback(
    (tipe: TipeToast, pesan: string) => {
      const id = uid('toast')
      setDaftar((d) => [...d.slice(-3), { id, tipe, pesan }])
      window.setTimeout(() => buang(id), 3800)
    },
    [buang],
  )

  const nilai = useMemo<ToastContextValue>(
    () => ({
      sukses: (pesan) => tambah('sukses', pesan),
      error: (pesan) => tambah('error', pesan),
      info: (pesan) => tambah('info', pesan),
    }),
    [tambah],
  )

  return (
    <ToastContext.Provider value={nilai}>
      {children}
      <div className="no-print pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
        {daftar.map((t) => (
          <div
            key={t.id}
            className={`animate-slide-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg shadow-espresso/10 ${GAYA[t.tipe]}`}
            role="status"
          >
            <span
              className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${
                t.tipe === 'sukses'
                  ? 'bg-success-soft'
                  : t.tipe === 'error'
                    ? 'bg-danger-soft'
                    : 'bg-sand'
              }`}
            >
              <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={IKON[t.tipe]} />
              </svg>
            </span>
            <span className="flex-1 leading-snug">{t.pesan}</span>
            <button
              onClick={() => buang(t.id)}
              className="cursor-pointer text-muted transition-colors hover:text-ink"
              aria-label="Tutup notifikasi"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast harus dipakai di dalam ToastProvider')
  return ctx
}
