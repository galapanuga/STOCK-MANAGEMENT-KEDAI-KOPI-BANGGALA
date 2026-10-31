const nf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })
const nfBulat = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })

export function formatAngka(nilai: number, maksDesimal = 2): string {
  if (!Number.isFinite(nilai)) return '0'
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: maksDesimal,
  }).format(nilai)
}

export function formatRupiah(nilai: number): string {
  const n = Number.isFinite(nilai) ? Math.round(nilai) : 0
  const tanda = n < 0 ? '-' : ''
  return `${tanda}Rp ${nfBulat.format(Math.abs(n))}`
}

export function formatRupiahRingkas(nilai: number): string {
  const n = Math.abs(nilai)
  if (n >= 1_000_000_000) return `Rp ${formatAngka(nilai / 1_000_000_000, 1)} M`
  if (n >= 1_000_000) return `Rp ${formatAngka(nilai / 1_000_000, 1)} jt`
  if (n >= 10_000) return `Rp ${formatAngka(nilai / 1_000, 0)} rb`
  return formatRupiah(nilai)
}

const BULAN_PENDEK = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
]

const HARI = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
]

export function formatTanggal(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return '-'
  return `${d.getDate()} ${BULAN_PENDEK[d.getMonth()]} ${d.getFullYear()}`
}

export function formatTanggalPanjang(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return '-'
  return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN_PENDEK[d.getMonth()]} ${d.getFullYear()}`
}

export function formatWaktu(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return '-'
  return `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`
}

export function formatTanggalWaktu(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return '-'
  return `${formatTanggal(d)} · ${formatWaktu(d)}`
}

export function formatBulanTahun(d: Date): string {
  return `${BULAN_PENDEK[d.getMonth()]} ${d.getFullYear()}`
}

export function namaHari(d: Date): string {
  return HARI[d.getDay()]
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** yyyy-mm-dd untuk input date (zona waktu lokal) */
export function keTanggalInput(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** yyyy-mm-ddThh:mm untuk input datetime-local */
export function keWaktuInput(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return ''
  return `${keTanggalInput(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function sekarangInput(): string {
  return keWaktuInput(new Date())
}

export function awalHari(d: Date = new Date()): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function akhirHari(d: Date = new Date()): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

export function tambahHari(d: Date, jumlah: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + jumlah)
  return x
}

export function awalBulan(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
}

export function akhirBulan(d: Date = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}

export function kunciTanggal(iso: string | Date): string {
  return keTanggalInput(iso)
}

export function sapaan(): string {
  const jam = new Date().getHours()
  if (jam < 11) return 'Selamat pagi'
  if (jam < 15) return 'Selamat siang'
  if (jam < 18) return 'Selamat sore'
  return 'Selamat malam'
}
