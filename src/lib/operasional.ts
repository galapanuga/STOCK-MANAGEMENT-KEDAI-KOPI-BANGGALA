import type { HariKey, JamOperasional, StatusBuka } from '../types'

export const JAM_OPERASIONAL_RESMI: JamOperasional = {
  senin: { buka: true, mulai: '09:00', selesai: '23:59' },
  selasa: { buka: true, mulai: '09:00', selesai: '23:59' },
  rabu: { buka: true, mulai: '09:00', selesai: '23:59' },
  kamis: { buka: true, mulai: '09:00', selesai: '23:59' },
  jumat: { buka: false, mulai: '09:00', selesai: '23:59' },
  sabtu: { buka: true, mulai: '09:00', selesai: '23:59' },
  minggu: { buka: true, mulai: '09:00', selesai: '23:59' },
}

export const URUTAN_HARI: HariKey[] = [
  'senin',
  'selasa',
  'rabu',
  'kamis',
  'jumat',
  'sabtu',
  'minggu',
]

const NAMA_HARI: Record<HariKey, string> = {
  senin: 'Senin',
  selasa: 'Selasa',
  rabu: 'Rabu',
  kamis: 'Kamis',
  jumat: 'Jumat',
  sabtu: 'Sabtu',
  minggu: 'Minggu',
}

const HARI_DARI_INDEKS: Record<number, HariKey> = {
  0: 'minggu',
  1: 'senin',
  2: 'selasa',
  3: 'rabu',
  4: 'kamis',
  5: 'jumat',
  6: 'sabtu',
}

const INDEKS_DARI_HARI: Record<HariKey, number> = {
  minggu: 0,
  senin: 1,
  selasa: 2,
  rabu: 3,
  kamis: 4,
  jumat: 5,
  sabtu: 6,
}

const PEMBAGI_WAKTU = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Jakarta',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

interface WaktuJakarta {
  hari: HariKey
  /** Menit sejak 00.00 waktu Jakarta. */
  menit: number
}

function waktuJakarta(now: Date): WaktuJakarta {
  const bagian = PEMBAGI_WAKTU.formatToParts(now)
  const ambil = (tipe: string) =>
    bagian.find((b) => b.type === tipe)?.value ?? ''

  const petaHari: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  const indeks = petaHari[ambil('weekday')] ?? now.getDay()
  const jam = Number(ambil('hour')) % 24
  const menit = Number(ambil('minute'))
  return {
    hari: HARI_DARI_INDEKS[indeks],
    menit: jam * 60 + menit,
  }
}

function keMenit(jam: string): number {
  const [h, m] = jam.split(':').map(Number)
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0)
}

export function formatJam(jam: string): string {
  return jam.replace(':', '.')
}

function rentangHari(jam: { mulai: string; selesai: string }): {
  mulai: number
  selesai: number
} {
  const mulai = keMenit(jam.mulai)
  let selesai = keMenit(jam.selesai)
  // Dukung jam operasional yang melewati tengah malam.
  if (selesai <= mulai) selesai += 24 * 60
  return { mulai, selesai }
}

function deskripsiSisa(menit: number): string {
  const jam = Math.floor(menit / 60)
  const sisa = menit % 60
  if (jam > 0) return `${jam} jam ${sisa} menit`
  return `${sisa} menit`
}

function hariBerikutnya(
  jamOperasional: JamOperasional,
  hari: HariKey,
  langkah = 1,
): HariKey {
  const indeks = (INDEKS_DARI_HARI[hari] + langkah) % 7
  return HARI_DARI_INDEKS[indeks]
}

/**
 * Status buka/tutup dihitung memakai zona waktu Asia/Jakarta (WIB),
 * tidak bergantung pada zona waktu perangkat.
 */
export function statusBukaSekarang(
  jamOperasional: JamOperasional,
  now: Date = new Date(),
): StatusBuka {
  const { hari, menit } = waktuJakarta(now)
  const jadwal = jamOperasional[hari]

  if (jadwal?.buka) {
    const { mulai, selesai } = rentangHari(jadwal)
    if (menit >= mulai && menit < selesai) {
      return {
        buka: true,
        keterangan: `Tutup dalam ${deskripsiSisa(selesai - menit)}`,
      }
    }
    if (menit < mulai) {
      return {
        buka: false,
        keterangan: `Buka hari ini ${formatJam(jadwal.mulai)} WIB`,
      }
    }
  }

  for (let i = 1; i <= 7; i++) {
    const berikut = hariBerikutnya(jamOperasional, hari, i)
    const jadwalBerikut = jamOperasional[berikut]
    if (!jadwalBerikut?.buka) continue
    const label = i === 1 ? 'besok' : NAMA_HARI[berikut]
    return {
      buka: false,
      keterangan: `Tutup · buka ${label} ${formatJam(jadwalBerikut.mulai)} WIB`,
    }
  }

  return { buka: false, keterangan: 'Tutup' }
}

export function formatJamHari(jam: {
  buka: boolean
  mulai: string
  selesai: string
}): string {
  if (!jam.buka) return 'Libur'
  return `${formatJam(jam.mulai)} – ${formatJam(jam.selesai)} WIB`
}

export function namaHariIndo(hari: HariKey): string {
  return NAMA_HARI[hari] ?? hari
}

export { NAMA_HARI }
