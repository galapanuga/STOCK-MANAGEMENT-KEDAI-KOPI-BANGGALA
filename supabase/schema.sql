-- ==============================================================================
-- BANGGALA STOCK — SKEMA BASIS DATA ONLINE (SUPABASE / POSTGRESQL)
-- ==============================================================================
-- Model keamanan:
--   * Login memakai Supabase Auth (email sintetis username@banggala.local)
--   * Identitas & role disimpan di public.profiles (tanpa hash password)
--   * RLS ketat: baca = pengguna aktif; ubah master = admin
--   * Seluruh transaksi stok WAJIB lewat RPC (tidak ada tulis langsung)
--   * Nomor penjualan & validasi stok dihitung atomik di server
--
-- Jalankan file ini di Supabase Dashboard -> SQL Editor.
-- Aman dijalankan ulang (idempotent), kecuali bagian drop tabel lama.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. BERSIHKAN SKEMA LAMA (tabel pengguna berisi hash password)
-- ------------------------------------------------------------------------------
drop table if exists pengguna cascade;

-- ------------------------------------------------------------------------------
-- 1. TABEL PROFIL (terhubung ke auth.users)
-- ------------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username = lower(username)),
  nama text not null,
  role text not null default 'staf' check (role in ('admin', 'staf')),
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now(),
  password_changed_at timestamptz
);

alter table profiles add column if not exists password_changed_at timestamptz;

-- ------------------------------------------------------------------------------
-- 2. PENGATURAN KEDAI (satu baris)
-- ------------------------------------------------------------------------------
create table if not exists pengaturan (
  id text primary key default 'utama',
  nama_kedai text not null,
  tagline text,
  alamat text,
  kota text,
  tanggal_berdiri text,
  halal_id text,
  instagram text,
  tiktok text,
  maps_url text,
  gofood_url text,
  grabfood_url text,
  situs_url text,
  jam_operasional jsonb not null default '{}'::jsonb,
  kategori_bahan text[] not null default '{}',
  satuan_bahan text[] not null default '{}',
  kategori_menu text[] not null default '{}',
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------------------------
-- 3. BAHAN BAKU
-- ------------------------------------------------------------------------------
create table if not exists bahan (
  id text primary key,
  nama text not null,
  kategori text not null,
  satuan text not null,
  stok_min numeric not null default 0,
  arsip boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------------------------
-- 4. MENU & RESEP
-- ------------------------------------------------------------------------------
create table if not exists menu (
  id text primary key,
  nama text not null,
  kategori text not null,
  harga numeric,
  deskripsi text,
  resep jsonb not null default '[]'::jsonb,
  resep_estimasi boolean not null default true,
  arsip boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

-- ------------------------------------------------------------------------------
-- 5. PENJUALAN
-- ------------------------------------------------------------------------------
create table if not exists penjualan (
  id text primary key,
  nomor text unique not null,
  tanggal timestamptz not null,
  items jsonb not null default '[]'::jsonb,
  omzet numeric,
  hpp numeric,
  laba numeric,
  catatan text,
  stok_terpotong boolean not null default true,
  user_id text not null,
  user_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_penjualan_tanggal on penjualan(tanggal desc);

-- ------------------------------------------------------------------------------
-- 6. MUTASI STOK
-- ------------------------------------------------------------------------------
create table if not exists mutasi (
  id text primary key,
  bahan_id text not null references bahan(id) on delete cascade,
  tipe text not null check (tipe in ('masuk', 'keluar')),
  jumlah numeric not null check (jumlah > 0),
  harga_satuan numeric,
  alasan text,
  keterangan text,
  tanggal timestamptz not null,
  user_id text not null,
  user_name text not null,
  penjualan_id text references penjualan(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_mutasi_bahan on mutasi(bahan_id, tanggal desc);
create index if not exists idx_mutasi_penjualan on mutasi(penjualan_id);

-- ------------------------------------------------------------------------------
-- 7. LOG AKTIVITAS
-- ------------------------------------------------------------------------------
create table if not exists log_aktivitas (
  id text primary key,
  at timestamptz not null default now(),
  user_id text not null,
  user_name text not null,
  aksi text not null,
  detail text not null
);

create index if not exists idx_log_at on log_aktivitas(at desc);

-- ------------------------------------------------------------------------------
-- 8. COUNTER NOMOR PENJUALAN HARIAN (atomik, aman multi-perangkat)
-- ------------------------------------------------------------------------------
create table if not exists penjualan_counter (
  hari date primary key,
  urut integer not null default 0
);

-- Migrasi versi awal mungkin pernah membuat kolom-kolom keuangan. Pastikan
-- skema stok-only tidak menyimpan harga/HPP/omzet/laba.
alter table menu drop column if exists harga;
alter table mutasi drop column if exists harga_satuan;
alter table penjualan drop column if exists omzet;
alter table penjualan drop column if exists hpp;
alter table penjualan drop column if exists laba;

-- ==============================================================================
-- FUNGSI BANTU
-- ==============================================================================

create or replace function public.banggala_saya_aktif()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and aktif = true
  );
$$;

create or replace function public.banggala_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and aktif = true
  );
$$;

create or replace function public.banggala_profil_aktif()
returns profiles
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_profil profiles;
begin
  select * into v_profil from profiles where id = auth.uid() and aktif = true;
  if v_profil.id is null then
    raise exception using errcode = 'P0001', message = 'AKUN_TIDAK_AKTIF';
  end if;
  return v_profil;
end;
$$;

create or replace function public.banggala_pastikan_admin()
returns profiles
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_profil profiles;
begin
  v_profil := public.banggala_profil_aktif();
  if v_profil.role <> 'admin' then
    raise exception using errcode = 'P0001', message = 'HANYA_ADMIN';
  end if;
  return v_profil;
end;
$$;

-- Kebutuhan bahan dari daftar item penjualan (menuId, jumlah).
create or replace function public.banggala_kebutuhan_bahan(p_items jsonb)
returns table (bahan_id text, butuh numeric)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    r.value ->> 'bahanId' as bahan_id,
    round(sum((r.value ->> 'jumlah')::numeric * (i.value ->> 'jumlah')::numeric), 3) as butuh
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as i(value)
  join menu m on m.id = i.value ->> 'menuId'
  cross join lateral jsonb_array_elements(coalesce(m.resep, '[]'::jsonb)) as r(value)
  where (i.value ->> 'jumlah')::numeric > 0
    and (r.value ->> 'jumlah')::numeric > 0
  group by 1
  having sum((r.value ->> 'jumlah')::numeric * (i.value ->> 'jumlah')::numeric) > 0;
$$;

-- Validasi stok. Melempar STOK_KURANG dengan detail JSON bila tidak cukup.
create or replace function public.banggala_pastikan_stok_cukup(p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_kebutuhan record;
  v_stok numeric;
  v_kurang jsonb := '[]'::jsonb;
  v_bahan bahan;
begin
  -- Urutkan kunci bahan agar dua transaksi paralel tidak saling deadlock.
  for v_kebutuhan in
    select * from public.banggala_kebutuhan_bahan(p_items) order by bahan_id
  loop
    -- Kunci baris bahan agar dua kasir tidak menjual stok terakhir bersamaan.
    select * into v_bahan from bahan where id = v_kebutuhan.bahan_id for update;
    if v_bahan.id is null then
      raise exception using errcode = 'P0001', message = 'BAHAN_TIDAK_DITEMUKAN',
        detail = v_kebutuhan.bahan_id;
    end if;

    select coalesce(sum(case when tipe = 'masuk' then jumlah else -jumlah end), 0)
      into v_stok
      from mutasi
      where bahan_id = v_kebutuhan.bahan_id;

    if v_stok + 1e-9 < v_kebutuhan.butuh then
      v_kurang := v_kurang || jsonb_build_object(
        'bahanId', v_kebutuhan.bahan_id,
        'nama', v_bahan.nama,
        'satuan', v_bahan.satuan,
        'dibutuhkan', v_kebutuhan.butuh,
        'tersedia', v_stok
      );
    end if;
  end loop;

  if jsonb_array_length(v_kurang) > 0 then
    raise exception using errcode = 'P0001', message = 'STOK_KURANG',
      detail = v_kurang::text;
  end if;
end;
$$;

-- Tolak perubahan yang membuat stok bahan menjadi negatif.
-- Dipakai saat mengubah/menghapus mutasi masuk, atau saat memuat snapshot data.
create or replace function public.banggala_pastikan_stok_bahan_tidak_negatif(
  p_bahan_id text,
  p_stok numeric
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_bahan bahan;
begin
  if p_stok >= -1e-9 then
    return;
  end if;

  select * into v_bahan from bahan where id = p_bahan_id;
  raise exception using errcode = 'P0001', message = 'STOK_AKAN_NEGATIF',
    detail = format('%s: stok menjadi %s %s',
      coalesce(v_bahan.nama, p_bahan_id), p_stok, coalesce(v_bahan.satuan, ''));
end;
$$;

-- Nomor urut penjualan harian. Tidak diekspos ke klien.
create or replace function public.banggala_nomor_penjualan(p_tanggal timestamptz)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hari date := (p_tanggal at time zone 'Asia/Jakarta')::date;
  v_urut integer;
begin
  insert into penjualan_counter (hari, urut)
  values (v_hari, 1)
  on conflict (hari) do update set urut = penjualan_counter.urut + 1
  returning urut into v_urut;

  return 'PJ-' || to_char(v_hari, 'YYYYMMDD') || '-' || lpad(v_urut::text, 3, '0');
end;
$$;

-- Normalisasi item penjualan: ambil snapshot nama menu dari server.
create or replace function public.banggala_siapkan_items(p_items jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_jumlah integer;
  v_items jsonb;
begin
  select count(*) into v_jumlah
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as x(value)
  where coalesce((x.value ->> 'jumlah')::numeric, 0) > 0;

  if v_jumlah = 0 then
    raise exception using errcode = 'P0001', message = 'ITEM_KOSONG';
  end if;

  select jsonb_agg(
           jsonb_build_object(
             'menuId', m.id,
             'nama', m.nama,
             'jumlah', (x.value ->> 'jumlah')::numeric
           ) order by x.ord
         )
    into v_items
  from jsonb_array_elements(p_items) with ordinality as x(value, ord)
  join menu m on m.id = x.value ->> 'menuId'
  where (x.value ->> 'jumlah')::numeric > 0;

  if coalesce(jsonb_array_length(v_items), 0) <> v_jumlah then
    raise exception using errcode = 'P0001', message = 'MENU_TIDAK_VALID';
  end if;

  return v_items;
end;
$$;

create or replace function public.banggala_stok_terpotong(p_items jsonb)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select not exists (
    select 1
    from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as x(value)
    join menu m on m.id = x.value ->> 'menuId'
    where jsonb_array_length(coalesce(m.resep, '[]'::jsonb)) = 0
  );
$$;

create or replace function public.banggala_simpan_log(
  p_log jsonb,
  p_profil profiles
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_log is null then
    return;
  end if;

  insert into log_aktivitas (id, at, user_id, user_name, aksi, detail)
  values (
    coalesce(p_log ->> 'id', 'log_' || replace(gen_random_uuid()::text, '-', '')),
    coalesce((p_log ->> 'at')::timestamptz, now()),
    p_profil.id::text,
    p_profil.nama,
    coalesce(p_log ->> 'aksi', 'Aktivitas'),
    coalesce(p_log ->> 'detail', '')
  )
  on conflict (id) do nothing;
end;
$$;

-- ==============================================================================
-- TRIGGER: auth.users -> profiles, dan updated_at
-- ==============================================================================

create or replace function public.banggala_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_username text;
  v_nama text;
begin
  v_username := lower(coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    split_part(coalesce(new.email, 'pengguna'), '@', 1)
  ));
  v_nama := coalesce(nullif(new.raw_user_meta_data ->> 'nama', ''), v_username);

  -- Role SELALU 'staf' saat akun auth dibuat. Promosi admin hanya lewat
  -- Edge Function (service role) atau SQL manual. Ini mencegah eskalasi hak
  -- bila pendaftaran publik tidak sengaja diaktifkan.
  insert into profiles (id, username, nama, role, aktif)
  values (new.id, v_username, v_nama, 'staf', true)
  on conflict (id) do update
    set username = excluded.username,
        nama = excluded.nama;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.banggala_handle_new_user();

create or replace function public.banggala_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated on profiles;
create trigger trg_profiles_updated
  before update on profiles
  for each row execute function public.banggala_set_updated_at();

drop trigger if exists trg_bahan_updated on bahan;
create trigger trg_bahan_updated
  before update on bahan
  for each row execute function public.banggala_set_updated_at();

drop trigger if exists trg_menu_updated on menu;
create trigger trg_menu_updated
  before update on menu
  for each row execute function public.banggala_set_updated_at();

drop trigger if exists trg_pengaturan_updated on pengaturan;
create trigger trg_pengaturan_updated
  before update on pengaturan
  for each row execute function public.banggala_set_updated_at();

drop trigger if exists trg_penjualan_updated on penjualan;
create trigger trg_penjualan_updated
  before update on penjualan
  for each row execute function public.banggala_set_updated_at();

drop trigger if exists trg_mutasi_updated on mutasi;
create trigger trg_mutasi_updated
  before update on mutasi
  for each row execute function public.banggala_set_updated_at();

-- ==============================================================================
-- RPC: PENJUALAN
-- ==============================================================================

create or replace function public.catat_penjualan(
  p_id text,
  p_tanggal timestamptz,
  p_items jsonb,
  p_catatan text default null,
  p_log jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profil profiles;
  v_items jsonb;
  v_penjualan penjualan;
  v_nomor text;
  v_terpotong boolean;
begin
  v_profil := public.banggala_profil_aktif();

  -- Idempotensi: permintaan ulang dari outbox tidak menggandakan transaksi.
  select * into v_penjualan from penjualan where id = p_id;
  if v_penjualan.id is not null then
    return jsonb_build_object(
      'penjualan', to_jsonb(v_penjualan),
      'mutasi', coalesce(
        (select jsonb_agg(to_jsonb(m) order by m.created_at) from mutasi m where m.penjualan_id = p_id),
        '[]'::jsonb
      )
    );
  end if;

  v_items := public.banggala_siapkan_items(p_items);
  v_terpotong := public.banggala_stok_terpotong(v_items);
  perform public.banggala_pastikan_stok_cukup(v_items);
  v_nomor := public.banggala_nomor_penjualan(p_tanggal);

  insert into penjualan (
    id, nomor, tanggal, items, catatan, stok_terpotong, user_id, user_name
  ) values (
    p_id, v_nomor, p_tanggal, v_items, nullif(p_catatan, ''), v_terpotong,
    v_profil.id::text, v_profil.nama
  )
  returning * into v_penjualan;

  insert into mutasi (
    id, bahan_id, tipe, jumlah, alasan, keterangan, tanggal, user_id, user_name, penjualan_id
  )
  select
    p_id || ':' || k.bahan_id,
    k.bahan_id,
    'keluar',
    k.butuh,
    'penjualan',
    v_nomor,
    p_tanggal,
    v_profil.id::text,
    v_profil.nama,
    p_id
  from public.banggala_kebutuhan_bahan(v_items) as k;

  perform public.banggala_simpan_log(p_log, v_profil);

  return jsonb_build_object(
    'penjualan', to_jsonb(v_penjualan),
    'mutasi', coalesce(
      (select jsonb_agg(to_jsonb(m) order by m.created_at) from mutasi m where m.penjualan_id = p_id),
      '[]'::jsonb
    )
  );
end;
$$;

create or replace function public.ubah_penjualan(
  p_id text,
  p_tanggal timestamptz,
  p_items jsonb,
  p_catatan text default null,
  p_log jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profil profiles;
  v_items jsonb;
  v_penjualan penjualan;
  v_terpotong boolean;
begin
  v_profil := public.banggala_pastikan_admin();

  select * into v_penjualan from penjualan where id = p_id for update;
  if v_penjualan.id is null then
    raise exception using errcode = 'P0001', message = 'PENJUALAN_TIDAK_DITEMUKAN';
  end if;

  v_items := public.banggala_siapkan_items(p_items);
  v_terpotong := public.banggala_stok_terpotong(v_items);

  -- Kembalikan stok lama, lalu validasi ulang dengan item baru.
  delete from mutasi where penjualan_id = p_id;
  perform public.banggala_pastikan_stok_cukup(v_items);

  update penjualan
     set tanggal = p_tanggal,
         items = v_items,
         catatan = nullif(p_catatan, ''),
         stok_terpotong = v_terpotong
   where id = p_id
   returning * into v_penjualan;

  insert into mutasi (
    id, bahan_id, tipe, jumlah, alasan, keterangan, tanggal, user_id, user_name, penjualan_id
  )
  select
    p_id || ':' || k.bahan_id,
    k.bahan_id,
    'keluar',
    k.butuh,
    'penjualan',
    v_penjualan.nomor,
    p_tanggal,
    v_penjualan.user_id,
    v_penjualan.user_name,
    p_id
  from public.banggala_kebutuhan_bahan(v_items) as k;

  perform public.banggala_simpan_log(p_log, v_profil);

  return jsonb_build_object(
    'penjualan', to_jsonb(v_penjualan),
    'mutasi', coalesce(
      (select jsonb_agg(to_jsonb(m) order by m.created_at) from mutasi m where m.penjualan_id = p_id),
      '[]'::jsonb
    )
  );
end;
$$;

create or replace function public.hapus_penjualan(
  p_id text,
  p_log jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profil profiles;
begin
  v_profil := public.banggala_pastikan_admin();

  -- Mutasi ikut terhapus lewat ON DELETE CASCADE.
  delete from penjualan where id = p_id;
  perform public.banggala_simpan_log(p_log, v_profil);
end;
$$;

-- ==============================================================================
-- RPC: MUTASI MANUAL
-- ==============================================================================

create or replace function public.catat_mutasi(
  p_id text,
  p_bahan_id text,
  p_tipe text,
  p_jumlah numeric,
  p_alasan text default null,
  p_keterangan text default null,
  p_tanggal timestamptz default now(),
  p_log jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profil profiles;
  v_stok numeric;
  v_bahan bahan;
  v_mutasi mutasi;
begin
  v_profil := public.banggala_profil_aktif();

  select * into v_mutasi from mutasi where id = p_id;
  if v_mutasi.id is not null then
    return to_jsonb(v_mutasi);
  end if;

  if p_tipe not in ('masuk', 'keluar') then
    raise exception using errcode = 'P0001', message = 'TIPE_MUTASI_TIDAK_VALID';
  end if;
  if p_jumlah is null or p_jumlah <= 0 then
    raise exception using errcode = 'P0001', message = 'JUMLAH_TIDAK_VALID';
  end if;

  select * into v_bahan from bahan where id = p_bahan_id for update;
  if v_bahan.id is null then
    raise exception using errcode = 'P0001', message = 'BAHAN_TIDAK_DITEMUKAN', detail = p_bahan_id;
  end if;

  if p_tipe = 'keluar' then
    select coalesce(sum(case when tipe = 'masuk' then jumlah else -jumlah end), 0)
      into v_stok from mutasi where bahan_id = p_bahan_id;
    if v_stok + 1e-9 < p_jumlah then
      raise exception using errcode = 'P0001', message = 'STOK_KURANG',
        detail = jsonb_build_array(jsonb_build_object(
          'bahanId', v_bahan.id,
          'nama', v_bahan.nama,
          'satuan', v_bahan.satuan,
          'dibutuhkan', p_jumlah,
          'tersedia', v_stok
        ))::text;
    end if;
  end if;

  insert into mutasi (
    id, bahan_id, tipe, jumlah, alasan, keterangan, tanggal, user_id, user_name
  ) values (
    p_id, p_bahan_id, p_tipe, p_jumlah, nullif(p_alasan, ''), nullif(p_keterangan, ''),
    p_tanggal, v_profil.id::text, v_profil.nama
  )
  returning * into v_mutasi;

  perform public.banggala_simpan_log(p_log, v_profil);
  return to_jsonb(v_mutasi);
end;
$$;

create or replace function public.ubah_mutasi(
  p_id text,
  p_bahan_id text,
  p_tipe text,
  p_jumlah numeric,
  p_alasan text default null,
  p_keterangan text default null,
  p_tanggal timestamptz default now(),
  p_log jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profil profiles;
  v_lama mutasi;
  v_stok_lama numeric;
  v_stok_baru numeric;
  v_bahan bahan;
  v_mutasi mutasi;
begin
  v_profil := public.banggala_pastikan_admin();

  select * into v_lama from mutasi where id = p_id for update;
  if v_lama.id is null then
    raise exception using errcode = 'P0001', message = 'MUTASI_TIDAK_DITEMUKAN';
  end if;
  if v_lama.penjualan_id is not null then
    raise exception using errcode = 'P0001', message = 'MUTASI_PENJUALAN';
  end if;

  if p_tipe not in ('masuk', 'keluar') then
    raise exception using errcode = 'P0001', message = 'TIPE_MUTASI_TIDAK_VALID';
  end if;
  if p_jumlah is null or p_jumlah <= 0 then
    raise exception using errcode = 'P0001', message = 'JUMLAH_TIDAK_VALID';
  end if;

  -- Kunci bahan lama & baru dengan urutan tetap untuk menghindari deadlock.
  perform 1 from bahan
   where id in (v_lama.bahan_id, p_bahan_id)
   order by id
   for update;

  select * into v_bahan from bahan where id = p_bahan_id;
  if v_bahan.id is null then
    raise exception using errcode = 'P0001', message = 'BAHAN_TIDAK_DITEMUKAN', detail = p_bahan_id;
  end if;

  -- Stok bahan lama setelah mutasi ini dikeluarkan dari perhitungan.
  select coalesce(sum(case when tipe = 'masuk' then jumlah else -jumlah end), 0)
    into v_stok_lama
    from mutasi
    where bahan_id = v_lama.bahan_id and id <> p_id;

  if p_bahan_id = v_lama.bahan_id then
    v_stok_baru := v_stok_lama
      + case when p_tipe = 'masuk' then p_jumlah else -p_jumlah end;
    perform public.banggala_pastikan_stok_bahan_tidak_negatif(p_bahan_id, v_stok_baru);
  else
    -- Memindahkan mutasi ke bahan lain: bahan lama tidak boleh menjadi negatif.
    perform public.banggala_pastikan_stok_bahan_tidak_negatif(
      v_lama.bahan_id, v_stok_lama
    );

    select coalesce(sum(case when tipe = 'masuk' then jumlah else -jumlah end), 0)
      into v_stok_baru
      from mutasi
      where bahan_id = p_bahan_id and id <> p_id;

    v_stok_baru := v_stok_baru
      + case when p_tipe = 'masuk' then p_jumlah else -p_jumlah end;

    if v_stok_baru < -1e-9 then
      raise exception using errcode = 'P0001', message = 'STOK_KURANG',
        detail = jsonb_build_array(jsonb_build_object(
          'bahanId', v_bahan.id,
          'nama', v_bahan.nama,
          'satuan', v_bahan.satuan,
          'dibutuhkan', p_jumlah,
          'tersedia', v_stok_baru + p_jumlah
        ))::text;
    end if;
  end if;

  update mutasi
     set bahan_id = p_bahan_id,
         tipe = p_tipe,
         jumlah = p_jumlah,
         alasan = nullif(p_alasan, ''),
         keterangan = nullif(p_keterangan, ''),
         tanggal = p_tanggal
   where id = p_id
   returning * into v_mutasi;

  perform public.banggala_simpan_log(p_log, v_profil);
  return to_jsonb(v_mutasi);
end;
$$;

create or replace function public.hapus_mutasi(
  p_id text,
  p_log jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profil profiles;
  v_lama mutasi;
  v_stok numeric;
begin
  v_profil := public.banggala_pastikan_admin();

  select * into v_lama from mutasi where id = p_id for update;
  if v_lama.id is null then
    return;
  end if;
  if v_lama.penjualan_id is not null then
    raise exception using errcode = 'P0001', message = 'MUTASI_PENJUALAN';
  end if;

  perform 1 from bahan where id = v_lama.bahan_id for update;

  -- Menghapus mutasi masuk dapat membuat stok negatif bila stoknya sudah terpakai.
  select coalesce(sum(case when tipe = 'masuk' then jumlah else -jumlah end), 0)
    into v_stok
    from mutasi
    where bahan_id = v_lama.bahan_id and id <> p_id;

  perform public.banggala_pastikan_stok_bahan_tidak_negatif(v_lama.bahan_id, v_stok);

  delete from mutasi where id = p_id;
  perform public.banggala_simpan_log(p_log, v_profil);
end;
$$;

-- ==============================================================================
-- RPC: GANTI SELURUH DATA (reset / restore / migrasi awal)
-- ==============================================================================
-- p_db berisi baris snake_case:
--   { pengaturan, bahan[], menu[], penjualan[], mutasi[], log[] }
-- ==============================================================================

create or replace function public.ganti_semua_data(
  p_db jsonb,
  p_log jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profil profiles;
begin
  v_profil := public.banggala_pastikan_admin();

  -- Cegah kasir lain menulis di tengah proses ganti data.
  lock table bahan, menu, penjualan, mutasi, log_aktivitas,
    pengaturan, penjualan_counter in exclusive mode;

  delete from mutasi;
  delete from penjualan;
  delete from menu;
  delete from bahan;
  delete from pengaturan;
  delete from penjualan_counter;
  delete from log_aktivitas;

  if p_db ? 'pengaturan' and p_db -> 'pengaturan' is not null then
    insert into pengaturan
    select * from jsonb_populate_record(null::pengaturan, p_db -> 'pengaturan');
  end if;

  if jsonb_typeof(p_db -> 'bahan') = 'array' then
    insert into bahan
    select * from jsonb_populate_recordset(null::bahan, p_db -> 'bahan');
  end if;

  if jsonb_typeof(p_db -> 'menu') = 'array' then
    insert into menu
    select * from jsonb_populate_recordset(null::menu, p_db -> 'menu');
  end if;

  if jsonb_typeof(p_db -> 'penjualan') = 'array' then
    insert into penjualan
    select * from jsonb_populate_recordset(null::penjualan, p_db -> 'penjualan');
  end if;

  -- Bangun ulang counter nomor dari data yang baru dimasukkan. Tanpa ini,
  -- penjualan berikutnya setelah migrasi/restore bisa memakai nomor yang
  -- sudah ada dan ditolak unique constraint.
  insert into penjualan_counter (hari, urut)
  select (tanggal at time zone 'Asia/Jakarta')::date as hari,
         max(coalesce((substring(nomor from '([0-9]+)$'))::integer, 0)) as urut
  from penjualan
  group by 1
  on conflict (hari) do update
    set urut = greatest(penjualan_counter.urut, excluded.urut);

  if jsonb_typeof(p_db -> 'mutasi') = 'array' then
    insert into mutasi
    select * from jsonb_populate_recordset(null::mutasi, p_db -> 'mutasi');
  end if;

  if jsonb_typeof(p_db -> 'log') = 'array' then
    insert into log_aktivitas
    select * from jsonb_populate_recordset(null::log_aktivitas, p_db -> 'log');
  end if;

  -- Tolak snapshot yang menghasilkan stok negatif (mis. backup rusak).
  perform public.banggala_pastikan_stok_bahan_tidak_negatif(b.id, coalesce(s.total, 0))
  from bahan b
  left join (
    select bahan_id,
           sum(case when tipe = 'masuk' then jumlah else -jumlah end) as total
    from mutasi
    group by bahan_id
  ) s on s.bahan_id = b.id
  where coalesce(s.total, 0) < -1e-9;

  perform public.banggala_simpan_log(p_log, v_profil);
end;
$$;

create or replace function public.reset_operasional(
  p_db jsonb,
  p_log jsonb default null
)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.ganti_semua_data(p_db, p_log);
$$;

-- ==============================================================================
-- ROW LEVEL SECURITY
-- ==============================================================================

alter table profiles enable row level security;
alter table pengaturan enable row level security;
alter table bahan enable row level security;
alter table menu enable row level security;
alter table mutasi enable row level security;
alter table penjualan enable row level security;
alter table log_aktivitas enable row level security;
alter table penjualan_counter enable row level security;

-- profiles ---------------------------------------------------------------
drop policy if exists "profil: baca sendiri atau admin" on profiles;
create policy "profil: baca sendiri atau admin"
  on profiles for select to authenticated
  using (id = auth.uid() or public.banggala_is_admin());

-- pengaturan -------------------------------------------------------------
drop policy if exists "pengaturan: baca aktif" on pengaturan;
create policy "pengaturan: baca aktif"
  on pengaturan for select to authenticated
  using (public.banggala_saya_aktif());

drop policy if exists "pengaturan: tulis admin" on pengaturan;
create policy "pengaturan: tulis admin"
  on pengaturan for all to authenticated
  using (public.banggala_is_admin())
  with check (public.banggala_is_admin());

-- bahan ------------------------------------------------------------------
drop policy if exists "bahan: baca aktif" on bahan;
create policy "bahan: baca aktif"
  on bahan for select to authenticated
  using (public.banggala_saya_aktif());

drop policy if exists "bahan: tulis admin" on bahan;
create policy "bahan: tulis admin"
  on bahan for all to authenticated
  using (public.banggala_is_admin())
  with check (public.banggala_is_admin());

-- menu -------------------------------------------------------------------
drop policy if exists "menu: baca aktif" on menu;
create policy "menu: baca aktif"
  on menu for select to authenticated
  using (public.banggala_saya_aktif());

drop policy if exists "menu: tulis admin" on menu;
create policy "menu: tulis admin"
  on menu for all to authenticated
  using (public.banggala_is_admin())
  with check (public.banggala_is_admin());

-- penjualan --------------------------------------------------------------
drop policy if exists "penjualan: baca aktif" on penjualan;
create policy "penjualan: baca aktif"
  on penjualan for select to authenticated
  using (public.banggala_saya_aktif());

-- mutasi -----------------------------------------------------------------
drop policy if exists "mutasi: baca aktif" on mutasi;
create policy "mutasi: baca aktif"
  on mutasi for select to authenticated
  using (public.banggala_saya_aktif());

-- log --------------------------------------------------------------------
drop policy if exists "log: baca aktif" on log_aktivitas;
create policy "log: baca aktif"
  on log_aktivitas for select to authenticated
  using (public.banggala_saya_aktif());

drop policy if exists "log: tulis aktif" on log_aktivitas;
create policy "log: tulis aktif"
  on log_aktivitas for insert to authenticated
  with check (public.banggala_saya_aktif() and user_id = auth.uid()::text);

-- counter ----------------------------------------------------------------
drop policy if exists "counter: admin" on penjualan_counter;
create policy "counter: admin"
  on penjualan_counter for select to authenticated
  using (public.banggala_is_admin());

-- ==============================================================================
-- HAK AKSES TABEL
-- ==============================================================================
-- Transaksi tidak boleh ditulis langsung dari klien: wajib lewat RPC.

revoke all on table profiles, pengaturan, bahan, menu, mutasi, penjualan,
  log_aktivitas, penjualan_counter from anon;

revoke all on table mutasi, penjualan, penjualan_counter from authenticated;
revoke insert, update, delete on table profiles, log_aktivitas from authenticated;

grant select on table profiles, mutasi, penjualan, log_aktivitas, penjualan_counter
  to authenticated;
grant select, insert, update, delete on table pengaturan, bahan, menu to authenticated;
grant insert on table log_aktivitas to authenticated;

-- ==============================================================================
-- HAK EKSEKUSI FUNGSI
-- ==============================================================================

-- Kedua fungsi ini dipanggil di dalam policy RLS. Policy dievaluasi dengan hak
-- pengguna yang sedang query, jadi role authenticated WAJIB boleh mengeksekusi
-- keduanya. Fungsi lain di bawah tetap tertutup untuk klien.
revoke execute on function public.banggala_saya_aktif() from public, anon, authenticated;
revoke execute on function public.banggala_is_admin() from public, anon, authenticated;
grant execute on function public.banggala_saya_aktif() to authenticated;
grant execute on function public.banggala_is_admin() to authenticated;

revoke execute on function public.banggala_profil_aktif() from public, anon, authenticated;
revoke execute on function public.banggala_pastikan_admin() from public, anon, authenticated;
revoke execute on function public.banggala_kebutuhan_bahan(jsonb) from public, anon, authenticated;
revoke execute on function public.banggala_pastikan_stok_cukup(jsonb) from public, anon, authenticated;
revoke execute on function public.banggala_pastikan_stok_bahan_tidak_negatif(text, numeric) from public, anon, authenticated;
revoke execute on function public.banggala_nomor_penjualan(timestamptz) from public, anon, authenticated;
revoke execute on function public.banggala_siapkan_items(jsonb) from public, anon, authenticated;
revoke execute on function public.banggala_stok_terpotong(jsonb) from public, anon, authenticated;
revoke execute on function public.banggala_simpan_log(jsonb, profiles) from public, anon, authenticated;
revoke execute on function public.banggala_handle_new_user() from public, anon, authenticated;
revoke execute on function public.banggala_set_updated_at() from public, anon, authenticated;

revoke execute on function public.catat_penjualan(text, timestamptz, jsonb, text, jsonb) from public, anon;
revoke execute on function public.ubah_penjualan(text, timestamptz, jsonb, text, jsonb) from public, anon;
revoke execute on function public.hapus_penjualan(text, jsonb) from public, anon;
revoke execute on function public.catat_mutasi(text, text, text, numeric, text, text, timestamptz, jsonb) from public, anon;
revoke execute on function public.ubah_mutasi(text, text, text, numeric, text, text, timestamptz, jsonb) from public, anon;
revoke execute on function public.hapus_mutasi(text, jsonb) from public, anon;
revoke execute on function public.ganti_semua_data(jsonb, jsonb) from public, anon;
revoke execute on function public.reset_operasional(jsonb, jsonb) from public, anon;

grant execute on function public.catat_penjualan(text, timestamptz, jsonb, text, jsonb) to authenticated;
grant execute on function public.ubah_penjualan(text, timestamptz, jsonb, text, jsonb) to authenticated;
grant execute on function public.hapus_penjualan(text, jsonb) to authenticated;
grant execute on function public.catat_mutasi(text, text, text, numeric, text, text, timestamptz, jsonb) to authenticated;
grant execute on function public.ubah_mutasi(text, text, text, numeric, text, text, timestamptz, jsonb) to authenticated;
grant execute on function public.hapus_mutasi(text, jsonb) to authenticated;
grant execute on function public.ganti_semua_data(jsonb, jsonb) to authenticated;
grant execute on function public.reset_operasional(jsonb, jsonb) to authenticated;

-- ==============================================================================
-- REALTIME
-- ==============================================================================

do $$
declare
  v_tabel text;
begin
  foreach v_tabel in array array[
    'profiles', 'pengaturan', 'bahan', 'menu', 'mutasi', 'penjualan', 'log_aktivitas'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table %I', v_tabel);
    exception
      when duplicate_object then null;
      when others then null;
    end;
  end loop;
end $$;

-- ==============================================================================
-- VERIFIKASI (jalankan manual untuk memastikan konfigurasi)
-- ==============================================================================
-- select tablename, policyname, cmd, roles from pg_policies
--   where schemaname = 'public' order by tablename, policyname;
-- select proname, prosecdef from pg_proc
--   where pronamespace = 'public'::regnamespace order by proname;
