export function uid(prefix = ''): string {
  const acak =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14)
  return prefix ? `${prefix}_${acak}` : acak
}

/** Angka aman dari input pengguna. */
export function keAngka(nilai: unknown, bawaan = 0): number {
  if (typeof nilai === 'number') return Number.isFinite(nilai) ? nilai : bawaan
  if (typeof nilai !== 'string') return bawaan
  const bersih = nilai.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
  const n = Number(bersih)
  return Number.isFinite(n) ? n : bawaan
}

export function pangkas(teks: string, maks = 80): string {
  const t = teks.trim()
  return t.length > maks ? `${t.slice(0, maks - 1)}…` : t
}

/** Angka desimal dari input (menerima koma sebagai pemisah desimal). */
export function keDesimal(nilai: unknown, bawaan = 0): number {
  if (typeof nilai === 'number') return Number.isFinite(nilai) ? nilai : bawaan
  if (typeof nilai !== 'string') return bawaan
  const bersih = nilai.trim().replace(',', '.').replace(/[^\d.-]/g, '')
  const n = Number(bersih)
  return Number.isFinite(n) ? n : bawaan
}
