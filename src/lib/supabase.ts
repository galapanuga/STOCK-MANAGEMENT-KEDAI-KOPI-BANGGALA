import { createClient, type SupabaseClient } from '@supabase/supabase-js'

interface EnvConfig {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
}

// Vite replaces `import.meta.env` at build time. Testing for an `env` property
// on `import.meta` first can fail in production browsers and silently select
// the local-only fallback even when the build contains the configured values.
const env = import.meta.env as unknown as EnvConfig

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

/** URL project Supabase (tanpa garis miring di akhir). */
export const urlSupabase = isUrlValid
  ? (rawUrl as string).replace(/\/+$/, '')
  : null

/** Email sintetis untuk login staf: username@banggala.local */
export const DOMAIN_EMAIL = 'banggala.local'

export function emailDariUsername(username: string): string {
  return `${username.trim().toLowerCase()}@${DOMAIN_EMAIL}`
}

export function usernameDariEmail(email: string | null | undefined): string {
  if (!email) return ''
  const [nama] = email.split('@')
  return nama ?? ''
}

export const supabase: SupabaseClient | null = apakahSupabaseAktif
  ? createClient(rawUrl as string, rawAnonKey as string, {
      auth: {
        // Sesi disimpan agar aplikasi bisa dibuka kembali saat offline.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: 'banggala_auth_session',
        flowType: 'pkce',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      global: {
        headers: {
          'x-application-name': 'banggala-stock',
        },
      },
    })
  : null

if (!apakahSupabaseAktif) {
  console.info(
    '[Banggala Stock] Supabase belum dikonfigurasi. Berjalan dalam mode lokal (localStorage + PBKDF2).',
  )
}

/**
 * Memeriksa apakah perangkat online dan server Supabase dapat dijangkau.
 * Memakai endpoint health agar tidak bergantung pada RLS.
 */
export async function periksaKoneksiOnline(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false
  }
  if (!urlSupabase) return false

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)
    const res = await fetch(`${urlSupabase}/auth/v1/health`, {
      signal: controller.signal,
      headers: rawAnonKey ? { apikey: rawAnonKey } : undefined,
    })
    clearTimeout(timer)
    return res.ok
  } catch {
    return false
  }
}
