import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IconX } from '../Icons'

interface ModalProps {
  buka: boolean
  tutup: () => void
  judul: string
  deskripsi?: string
  children: ReactNode
  lebar?: 'sm' | 'md' | 'lg'
  footer?: ReactNode
}

const LEBAR = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
}

export function Modal({
  buka,
  tutup,
  judul,
  deskripsi,
  children,
  lebar = 'md',
  footer,
}: ModalProps) {
  useEffect(() => {
    if (!buka) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') tutup()
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [buka, tutup])

  if (!buka) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="animate-fade absolute inset-0 bg-espresso/45 backdrop-blur-[2px]"
        onClick={tutup}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={judul}
        className={`animate-rise relative m-0 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-white shadow-2xl sm:m-4 sm:rounded-2xl ${LEBAR[lebar]}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-display text-lg font-bold text-espresso">
              {judul}
            </h2>
            {deskripsi && (
              <p className="mt-0.5 text-xs text-muted">{deskripsi}</p>
            )}
          </div>
          <button
            type="button"
            onClick={tutup}
            className="btn btn-ghost -mr-1.5 -mt-1 rounded-lg p-2"
            aria-label="Tutup"
          >
            <IconX className="size-4.5" />
          </button>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {children}
        </div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-line bg-cream/50 px-5 py-3 sm:flex-row sm:justify-end sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

interface ConfirmDialogProps {
  buka: boolean
  judul: string
  pesan: ReactNode
  onTutup: () => void
  onKonfirmasi: () => void
  labelKonfirmasi?: string
  bahaya?: boolean
  sedangProses?: boolean
}

export function ConfirmDialog({
  buka,
  judul,
  pesan,
  onTutup,
  onKonfirmasi,
  labelKonfirmasi = 'Ya, lanjutkan',
  bahaya = false,
  sedangProses = false,
}: ConfirmDialogProps) {
  return (
    <Modal buka={buka} tutup={onTutup} judul={judul} lebar="sm">
      <div className="text-sm leading-relaxed text-mocha">{pesan}</div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn btn-outline" onClick={onTutup}>
          Batal
        </button>
        <button
          type="button"
          className={`btn ${bahaya ? 'btn-danger' : 'btn-primary'}`}
          onClick={onKonfirmasi}
          disabled={sedangProses}
        >
          {sedangProses ? 'Memproses…' : labelKonfirmasi}
        </button>
      </div>
    </Modal>
  )
}
