import { createClient, type SupabaseClient } from '@supabase/supabase-js'

interface EnvConfig {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
}

const env: EnvConfig =
  typeof import.meta !== 'undefined' && 'env' in import.meta
    ? (import.meta.env as unknown as EnvConfig)
    : {}

const rawUrl = env.VITE_SUPABASE_URL
const rawAnonKey = env.VITE_SUPABASE_ANON_KEY

const isUrlValid =
  Boolean(rawUrl) &&
  rawUrl !== 'https://your-project.supabase.co' &&
  !rawUrl?.includes('your-project') &&
  (rawUrl?.startsWith('https://') || rawUrl?.startsWith('http://'))

const isKeyValid =
  Boolean(rawAnonKey) &&
  rawAnonKey !== 'your-anon-key-here' &&
  !rawAnonKey?.includes('your-anon-key') &&
  (rawAnonKey?.length ?? 0) > 20

export const apakahSupabaseAktif = Boolean(isUrlValid && isKeyValid)

export const supabase: SupabaseClient | null = apakahSupabaseAktif
  ? createClient(rawUrl as string, rawAnonKey as string, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null

if (!apakahSupabaseAktif) {
  console.info(
    '[Banggala Stock] Supabase belum dikonfigurasi. Berjalan dalam mode offline-lokal (localStorage).',
  )
}

/**
 * Memeriksa apakah perangkat saat ini online dan dapat menjangkau server Supabase.
 */
export async function periksaKoneksiOnline(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false
  }

  if (!supabase) {
    // Mode demo lokal tanpa Supabase
    return false
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)

    // Ping ringan ke endpoint Supabase
    const { error } = await supabase
      .from('pengaturan')
      .select('id')
      .limit(1)
      .abortSignal(controller.signal)

    clearTimeout(timer)
    if (error && error.code !== 'PGRST116') {
      // Jika error berupa koneksi/network
      return false
    }
    return true
  } catch {
    return false
  }
}
