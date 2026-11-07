import type { Role, User } from '../types'
import { mapProfilFromRow, type ProfilRow } from './cloudDb'
import { supabase } from './supabase'

type AksiAdmin =
  | { action: 'list' }
  | {
      action: 'create'
      username: string
      nama: string
      role: Role
      password: string
      aktif?: boolean
    }
  | {
      action: 'update'
      id: string
      nama?: string
      role?: Role
      aktif?: boolean
    }
  | { action: 'reset_password'; id: string; password: string }

interface ResponsEdge {
  data?: ProfilRow | ProfilRow[]
  error?: string
}

function pastikanOnline() {
  if (!supabase) {
    throw new Error('Mode online belum dikonfigurasi.')
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Kelola pengguna membutuhkan koneksi internet.')
  }
  return supabase
}

async function panggil(body: AksiAdmin): Promise<ResponsEdge> {
  const klien = pastikanOnline()
  const { data, error } = await klien.functions.invoke('admin-pengguna', { body })

  if (error) {
    // FunctionsHttpError menyimpan respons di context.
    const konteks = (error as { context?: { json?: () => Promise<unknown> } }).context
    if (konteks?.json) {
      try {
        const isi = (await konteks.json()) as ResponsEdge
        if (isi?.error) throw new Error(isi.error)
      } catch (err) {
        if (err instanceof Error && err.message) throw err
      }
    }
    throw new Error(error.message || 'Gagal menghubungi server pengguna.')
  }

  const hasil = data as ResponsEdge
  if (hasil?.error) throw new Error(hasil.error)
  return hasil ?? {}
}

export async function daftarPenggunaCloud(): Promise<User[]> {
  const hasil = await panggil({ action: 'list' })
  const baris = Array.isArray(hasil.data) ? hasil.data : []
  return baris.map(mapProfilFromRow)
}

export async function buatPenggunaCloud(input: {
  username: string
  nama: string
  role: Role
  password: string
  aktif?: boolean
}): Promise<User> {
  const hasil = await panggil({ action: 'create', ...input })
  if (!hasil.data || Array.isArray(hasil.data)) {
    throw new Error('Server tidak mengembalikan profil pengguna baru.')
  }
  return mapProfilFromRow(hasil.data)
}

export async function ubahPenggunaCloud(input: {
  id: string
  nama?: string
  role?: Role
  aktif?: boolean
}): Promise<User> {
  const hasil = await panggil({ action: 'update', ...input })
  if (!hasil.data || Array.isArray(hasil.data)) {
    throw new Error('Server tidak mengembalikan profil pengguna.')
  }
  return mapProfilFromRow(hasil.data)
}

export async function resetPasswordCloud(input: {
  id: string
  password: string
}): Promise<User> {
  const hasil = await panggil({ action: 'reset_password', ...input })
  if (!hasil.data || Array.isArray(hasil.data)) {
    throw new Error('Server tidak mengembalikan profil pengguna.')
  }
  return mapProfilFromRow(hasil.data)
}
