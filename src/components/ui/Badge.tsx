import type { StatusStok } from '../../types'

export function BadgeStok({ status }: { status: StatusStok }) {
  const gaya =
    status === 'aman'
      ? 'bg-success-soft text-success'
      : status === 'menipis'
        ? 'bg-warning-soft text-warning'
        : 'bg-danger-soft text-danger'
  const label =
    status === 'aman' ? 'Aman' : status === 'menipis' ? 'Menipis' : 'Habis'

  return (
    <span className={`badge ${gaya}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}

export function BadgeTipe({ tipe }: { tipe: 'masuk' | 'keluar' }) {
  return (
    <span
      className={`badge ${
        tipe === 'masuk'
          ? 'bg-success-soft text-success'
          : 'bg-sand text-coffee'
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {tipe === 'masuk' ? (
          <path d="M12 19V5M6 11l6-6 6 6" />
        ) : (
          <path d="M12 5v14M6 13l6 6 6-6" />
        )}
      </svg>
      {tipe === 'masuk' ? 'Masuk' : 'Keluar'}
    </span>
  )
}

export function BadgePeran({ peran }: { peran: 'admin' | 'staf' }) {
  return (
    <span
      className={`badge ${
        peran === 'admin'
          ? 'bg-espresso text-cream'
          : 'bg-latte/60 text-coffee'
      }`}
    >
      {peran === 'admin' ? 'Admin' : 'Staf'}
    </span>
  )
}

export function BadgeAktif({ aktif }: { aktif: boolean }) {
  return (
    <span
      className={`badge ${
        aktif ? 'bg-success-soft text-success' : 'bg-sand text-muted'
      }`}
    >
      {aktif ? 'Aktif' : 'Nonaktif'}
    </span>
  )
}
