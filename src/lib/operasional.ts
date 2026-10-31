import type { HariKey, JamHari, JamOperasional } from '../types'

export const HARI_DAFTAR: { key: HariKey; label: string; urutan: number }[] = [
  { key: 'senin', label: 'Senin', urutan: 1 },
  { key: 'selasa', label: 'Selasa', urutan: 2 },
  { key: 'rabu', label: 'Rabu', urutan: 3 },
  { key: 'kamis', label: 'Kamis', urutan: 4 },
  { key: 'jumat', label: 'Jumat', urutan: 5 },
  { key: 'sabtu', label: 'Sabtu', urutan: 6 },
  { key: 'minggu', label: 'Minggu', urutan: 0 },
]

export const HARI_LABEL: Record<HariKey, string> = {
  senin: 'Senin',
  selasa: 'Selasa',
  rabu: 'Rabu',
  kamis: 'Kamis',
  jumat: 'Jumat',
  sabtu: 'Sabtu',
  minggu: 'Minggu',
}

export const JAM_OPERASIONAL_RESMI: JamOperasional = {
  senin: { buka: true, mulai: '09:00', selesai: '23:59' },
  selasa: { buka: true, mulai: '09:00', selesai: '23:59' },
  rabu: { buka: true, mulai: '09:00', selesai: '23:59' },
  kamis: { buka: true, mulai: '09:00', selesai: '23:59' },
  jumat: { buka: false, mulai: '09:00', selesai: '23:59' },
  sabtu: { buka: true, mulai: '09:00', selesai: '23:59' },
  minggu: { buka: true, mulai: '09:00', selesai: '23:59' },
}

export interface WaktuWIB {
  hari: HariKey
  hariNama: string
  menitHariIni: number
  jam: number
  menit: number
  teksWaktu: string
}

const URUTAN_HARI_JS: HariKey[] = [
  'minggu',
  'senin',
  'selasa',
  'rabu',
  'kamis',
  'jumat',
  'sabtu',
]

/**
 * Mendapatkan komponen waktu saat ini di zona Asia/Jakarta (WIB).
 */
export function ambilWaktuWIB(referensi: Date = new Date()): WaktuWIB {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  })

  const bagian = formatter.formatToParts(referensi)
  let weekdayStr = ''
  let jam = 0
  let menit = 0

  for (const b of bagian) {
    if (b.type === 'weekday') weekdayStr = b.value.toLowerCase()
    else if (b.type === 'hour') jam = Number(b.value) || 0
    else if (b.type === 'minute') menit = Number(b.value) || 0
  }

  const petaWeekday: Record<string, HariKey> = {
    sun: 'minggu',
    mon: 'senin',
    tue: 'selasa',
    wed: 'rabu',
    thu: 'kamis',
    fri: 'jumat',
    sat: 'sabtu',
  }

  const hari: HariKey = petaWeekday[weekdayStr] ?? 'senin'
  const menitHariIni = jam * 60 + menit
  const teksWaktu = `${String(jam).padStart(2, '0')}.${String(menit).padStart(2, '0')} WIB`

  return {
    hari,
    hariNama: HARI_LABEL[hari],
    menitHariIni,
    jam,
    menit,
    teksWaktu,
  }
}

function menitDariHHMM(hhmm: string): number {
  const [h, m] = (hhmm || '00:00').split(':').map((x) => Number(x) || 0)
  return h * 60 + m
}

function formatHHMM(hhmm: string): string {
  const [h, m] = (hhmm || '00:00').split(':')
  return `${(h ?? '00').padStart(2, '0')}.${(m ?? '00').padStart(2, '0')}`
}

export type TipeStatusOperasional = 'buka' | 'tutup' | 'libur'

export interface StatusOperasional {
  status: TipeStatusOperasional
  buka: boolean
  labelSingkat: string
  labelLengkap: string
  detail: string
  hariIni: JamHari
  waktuWIB: WaktuWIB
}

export function hitungStatusOperasional(
  jadwal: JamOperasional = JAM_OPERASIONAL_RESMI,
  referensi: Date = new Date(),
): StatusOperasional {
  const wib = ambilWaktuWIB(referensi)
  const hariIni = jadwal[wib.hari] ?? {
    buka: false,
    mulai: '09:00',
    selesai: '23:59',
  }

  const mulai = menitDariHHMM(hariIni.mulai)
  const selesai = menitDariHHMM(hariIni.selesai)

  // Kasus hari libur
  if (!hariIni.buka) {
    const hariBerikutnya = cariHariBukaBerikutnya(jadwal, wib.hari)
    const labelLibur = wib.hari === 'jumat' ? 'Jumat libur' : 'Hari libur'
    return {
      status: 'libur',
      buka: false,
      labelSingkat: labelLibur,
      labelLengkap: `${labelLibur} · Persiapan kedai`,
      detail: hariBerikutnya
        ? `Buka ${hariBerikutnya.label} ${formatHHMM(hariBerikutnya.mulai)} WIB`
        : 'Sedang tutup',
      hariIni,
      waktuWIB: wib,
    }
  }

  // Hari buka biasa
  if (wib.menitHariIni >= mulai && wib.menitHariIni <= selesai) {
    return {
      status: 'buka',
      buka: true,
      labelSingkat: 'Buka sekarang',
      labelLengkap: 'Buka sekarang',
      detail: `Tutup pukul ${formatHHMM(hariIni.selesai)} WIB`,
      hariIni,
      waktuWIB: wib,
    }
  }

  if (wib.menitHariIni < mulai) {
    return {
      status: 'tutup',
      buka: false,
      labelSingkat: 'Belum buka',
      labelLengkap: 'Tutup · Buka nanti',
      detail: `Buka hari ini pukul ${formatHHMM(hariIni.mulai)} WIB`,
      hariIni,
      waktuWIB: wib,
    }
  }

  // Lewat jam tutup
  const hariBerikutnya = cariHariBukaBerikutnya(jadwal, wib.hari)
  return {
    status: 'tutup',
    buka: false,
    labelSingkat: 'Tutup',
    labelLengkap: 'Tutup untuk hari ini',
    detail: hariBerikutnya
      ? `Buka ${hariBerikutnya.label} pukul ${formatHHMM(hariBerikutnya.mulai)} WIB`
      : 'Tutup',
    hariIni,
    waktuWIB: wib,
  }
}

function cariHariBukaBerikutnya(
  jadwal: JamOperasional,
  hariSaatIni: HariKey,
): { key: HariKey; label: string; mulai: string } | null {
  const indexSaatIni = URUTAN_HARI_JS.indexOf(hariSaatIni)
  for (let i = 1; i <= 7; i++) {
    const idx = (indexSaatIni + i) % 7
    const key = URUTAN_HARI_JS[idx]
    const j = jadwal[key]
    if (j?.buka) {
      const label = i === 1 ? 'besok' : HARI_LABEL[key]
      return { key, label, mulai: j.mulai }
    }
  }
  return null
}
