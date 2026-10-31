import type { ReactNode } from 'react'

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className = '',
}: {
  label: string
  htmlFor?: string
  hint?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{hint}</p>}
    </div>
  )
}

export function EmptyState({
  judul,
  pesan,
  ikon,
  aksi,
}: {
  judul: string
  pesan?: string
  ikon?: ReactNode
  aksi?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {ikon && (
        <div className="mb-2 grid size-12 place-items-center rounded-2xl bg-sand text-mocha">
          {ikon}
        </div>
      )}
      <p className="font-display text-base font-bold text-espresso">{judul}</p>
      {pesan && <p className="max-w-sm text-sm text-muted">{pesan}</p>}
      {aksi && <div className="mt-3">{aksi}</div>}
    </div>
  )
}

export function PageHeader({
  judul,
  deskripsi,
  aksi,
}: {
  judul: string
  deskripsi?: string
  aksi?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-espresso sm:text-[28px]">
          {judul}
        </h1>
        {deskripsi && (
          <p className="mt-1 max-w-2xl text-sm text-muted">{deskripsi}</p>
        )}
      </div>
      {aksi && <div className="no-print flex flex-wrap items-center gap-2">{aksi}</div>}
    </div>
  )
}

export function SectionHeader({
  judul,
  deskripsi,
  aksi,
}: {
  judul: string
  deskripsi?: string
  aksi?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
      <div>
        <h2 className="font-display text-base font-bold text-espresso">{judul}</h2>
        {deskripsi && <p className="mt-0.5 text-xs text-muted">{deskripsi}</p>}
      </div>
      {aksi}
    </div>
  )
}
