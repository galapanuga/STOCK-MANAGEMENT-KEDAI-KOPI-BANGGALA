// ==============================================================================
// EDGE FUNCTION: admin-pengguna
// ==============================================================================
// Hanya dapat dipanggil oleh admin yang sedang login.
// Memakai SERVICE ROLE KEY (jangan pernah ditaruh di frontend).
//
// Deploy:
//   supabase functions deploy admin-pengguna
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... (biasanya otomatis)
//
// Aksi:
//   { action: 'list' }
//   { action: 'create', username, nama, role, password, aktif? }
//   { action: 'update', id, nama?, role?, aktif? }
//   { action: 'reset_password', id, password }
// ==============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const DOMAIN_EMAIL = 'banggala.local'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function pesanGalat(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'Terjadi kesalahan.'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Metode tidak didukung.' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({ error: 'Konfigurasi server tidak lengkap.' }, 500)
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) {
    return json({ error: 'Sesi tidak ditemukan. Silakan login ulang.' }, 401)
  }

  const klienPemanggil = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await klienPemanggil.auth.getUser(token)
  if (userError || !userData.user) {
    return json({ error: 'Sesi tidak valid. Silakan login ulang.' }, 401)
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: profilAdmin, error: profilError } = await admin
    .from('profiles')
    .select('id, role, aktif')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (profilError || !profilAdmin || profilAdmin.role !== 'admin' || !profilAdmin.aktif) {
    return json({ error: 'Hanya admin aktif yang dapat mengelola pengguna.' }, 403)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Body permintaan tidak valid.' }, 400)
  }

  const action = String(body.action ?? '')

  try {
    if (action === 'list') {
      const { data, error } = await admin
        .from('profiles')
        .select('id, username, nama, role, aktif, created_at, password_changed_at')
        .order('created_at', { ascending: true })
      if (error) throw error
      return json({ data })
    }

    if (action === 'create') {
      const username = String(body.username ?? '').trim().toLowerCase()
      const nama = String(body.nama ?? '').trim()
      const role = String(body.role ?? 'staf')
      const password = String(body.password ?? '')
      const aktif = body.aktif !== false

      if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
        return json({ error: 'Username 3–32 karakter: huruf, angka, titik, garis bawah, strip.' }, 400)
      }
      if (!nama) return json({ error: 'Nama wajib diisi.' }, 400)
      if (role !== 'admin' && role !== 'staf') return json({ error: 'Role tidak valid.' }, 400)
      if (password.length < 6) return json({ error: 'Password minimal 6 karakter.' }, 400)

      const { data: bentrok } = await admin
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle()
      if (bentrok) return json({ error: 'Username sudah digunakan.' }, 409)

      const email = `${username}@${DOMAIN_EMAIL}`
      const { data: dibuat, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username, nama, role },
      })
      if (createError) throw createError
      if (!dibuat.user) throw new Error('Akun tidak berhasil dibuat.')

      const { data: profil, error: upsertError } = await admin
        .from('profiles')
        .upsert({
          id: dibuat.user.id,
          username,
          nama,
          role,
          aktif,
          password_changed_at: new Date().toISOString(),
        })
        .select('id, username, nama, role, aktif, created_at, password_changed_at')
        .single()
      if (upsertError) {
        // Jangan tinggalkan akun auth tanpa profil.
        await admin.auth.admin.deleteUser(dibuat.user.id).catch(() => undefined)
        throw upsertError
      }

      if (!aktif) {
        await admin.auth.admin.updateUserById(dibuat.user.id, { ban_duration: '876000h' })
      }

      return json({ data: profil })
    }

    if (action === 'update') {
      const id = String(body.id ?? '')
      if (!id) return json({ error: 'ID pengguna wajib diisi.' }, 400)

      const { data: target, error: targetError } = await admin
        .from('profiles')
        .select('id, role, aktif')
        .eq('id', id)
        .maybeSingle()
      if (targetError) throw targetError
      if (!target) return json({ error: 'Pengguna tidak ditemukan.' }, 404)

      const patch: Record<string, unknown> = {}
      if (body.nama !== undefined) {
        const nama = String(body.nama).trim()
        if (!nama) return json({ error: 'Nama tidak boleh kosong.' }, 400)
        patch.nama = nama
      }
      if (body.role !== undefined) {
        const role = String(body.role)
        if (role !== 'admin' && role !== 'staf') {
          return json({ error: 'Role tidak valid.' }, 400)
        }
        patch.role = role
      }
      if (body.aktif !== undefined) {
        patch.aktif = Boolean(body.aktif)
      }

      if (Object.keys(patch).length === 0) {
        return json({ error: 'Tidak ada perubahan yang dikirim.' }, 400)
      }

      if (id === userData.user.id && (patch.aktif === false || patch.role === 'staf')) {
        return json({ error: 'Tidak bisa menonaktifkan atau menurunkan role akun sendiri.' }, 400)
      }

      // Pastikan minimal satu admin aktif tetap ada.
      if (target.role === 'admin' && target.aktif) {
        const kehilanganAdmin = patch.role === 'staf' || patch.aktif === false
        if (kehilanganAdmin) {
          const { count } = await admin
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'admin')
            .eq('aktif', true)
          if ((count ?? 0) <= 1) {
            return json({ error: 'Harus ada minimal satu admin aktif.' }, 400)
          }
        }
      }

      const { data: profil, error: updateError } = await admin
        .from('profiles')
        .update(patch)
        .eq('id', id)
        .select('id, username, nama, role, aktif, created_at, password_changed_at')
        .single()
      if (updateError) throw updateError

      if (patch.aktif !== undefined) {
        await admin.auth.admin.updateUserById(id, {
          ban_duration: patch.aktif ? 'none' : '876000h',
        })
      }

      return json({ data: profil })
    }

    if (action === 'reset_password') {
      const id = String(body.id ?? '')
      const password = String(body.password ?? '')
      if (!id) return json({ error: 'ID pengguna wajib diisi.' }, 400)
      if (password.length < 6) return json({ error: 'Password minimal 6 karakter.' }, 400)

      const { error: resetError } = await admin.auth.admin.updateUserById(id, { password })
      if (resetError) throw resetError

      const { data: profil, error: updateError } = await admin
        .from('profiles')
        .update({ password_changed_at: new Date().toISOString() })
        .eq('id', id)
        .select('id, username, nama, role, aktif, created_at, password_changed_at')
        .single()
      if (updateError) throw updateError

      return json({ data: profil })
    }

    return json({ error: 'Aksi tidak dikenal.' }, 400)
  } catch (error) {
    console.error('[admin-pengguna]', error)
    return json({ error: pesanGalat(error) }, 400)
  }
})
