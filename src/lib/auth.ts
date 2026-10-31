import type { Sesi } from '../types'

const SESSION_KEY = 'banggala_sesi_v1'
const MASA_BERLAKU_JAM = 12
const ITERASI = 120_000

function keBase64(bytes: Uint8Array): string {
  let teks = ''
  for (const b of bytes) teks += String.fromCharCode(b)
  return btoa(teks)
}

function dariBase64(teks: string): Uint8Array {
  const biner = atob(teks)
  const bytes = new Uint8Array(biner.length)
  for (let i = 0; i < biner.length; i++) bytes[i] = biner.charCodeAt(i)
  return bytes
}

async function turunkanKunci(
  password: string,
  salt: Uint8Array,
): Promise<string> {
  const encoder = new TextEncoder()
  const kunci = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERASI, hash: 'SHA-256' },
    kunci,
    256,
  )
  return keBase64(new Uint8Array(bits))
}

export async function buatPassword(
  password: string,
): Promise<{ salt: string; hash: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await turunkanKunci(password, salt)
  return { salt: keBase64(salt), hash }
}

export async function verifikasiPassword(
  password: string,
  saltB64: string,
  hashTersimpan: string,
): Promise<boolean> {
  try {
    const hash = await turunkanKunci(password, dariBase64(saltB64))
    if (hash.length !== hashTersimpan.length) return false
    let beda = 0
    for (let i = 0; i < hash.length; i++) {
      beda |= hash.charCodeAt(i) ^ hashTersimpan.charCodeAt(i)
    }
    return beda === 0
  } catch {
    return false
  }
}

export function ambilSesi(): Sesi | null {
  try {
    const mentah = localStorage.getItem(SESSION_KEY)
    if (!mentah) return null
    const sesi = JSON.parse(mentah) as Sesi
    if (!sesi?.userId || !sesi?.expiresAt) return null
    if (Date.now() > sesi.expiresAt) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return sesi
  } catch {
    return null
  }
}

export function simpanSesi(userId: string): void {
  const sesi: Sesi = {
    userId,
    expiresAt: Date.now() + MASA_BERLAKU_JAM * 60 * 60 * 1000,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(sesi))
}

export function hapusSesi(): void {
  localStorage.removeItem(SESSION_KEY)
}
