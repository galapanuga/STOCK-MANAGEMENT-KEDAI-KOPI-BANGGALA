-- ==============================================================================
-- SKEMA BASIS DATA BANGGALA STOCK (SUPABASE / POSTGRESQL)
-- Sistem Operasional & Pencatatan Stok Kedai Kopi Banggala
-- ==============================================================================

-- 1. Tabel Pengaturan Kedai
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
  jam_operasional jsonb not null,
  kategori_bahan text[] not null,
  satuan_bahan text[] not null,
  kategori_menu text[] not null,
  updated_at timestamptz default now()
);

-- 2. Tabel Pengguna (Akun Kasir & Admin)
create table if not exists pengguna (
  id text primary key,
  username text unique not null,
  nama text not null,
  role text not null check (role in ('admin', 'staf')),
  password_hash text not null,
  salt text not null,
  aktif boolean not null default true,
  created_at timestamptz default now(),
  password_changed_at timestamptz
);

-- 3. Tabel Bahan Baku & Stok
create table if not exists bahan (
  id text primary key,
  nama text not null,
  kategori text not null,
  satuan text not null,
  stok_min numeric not null default 0,
  arsip boolean not null default false,
  created_at timestamptz default now()
);

-- 4. Tabel Katalog Menu & Resep
create table if not exists menu (
  id text primary key,
  nama text not null,
  kategori text not null,
  harga numeric,
  deskripsi text,
  resep jsonb not null default '[]'::jsonb,
  resep_estimasi boolean not null default true,
  arsip boolean not null default false,
  created_at timestamptz default now()
);

-- 5. Tabel Mutasi Stok (Masuk & Keluar)
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
  penjualan_id text,
  created_at timestamptz default now()
);

create index if not exists idx_mutasi_bahan on mutasi(bahan_id, tanggal desc);
create index if not exists idx_mutasi_penjualan on mutasi(penjualan_id);

-- 6. Tabel Penjualan Transaksi
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
  created_at timestamptz default now()
);

create index if not exists idx_penjualan_tanggal on penjualan(tanggal desc);

-- 7. Tabel Log Aktivitas Audit
create table if not exists log_aktivitas (
  id text primary key,
  at timestamptz default now(),
  user_id text not null,
  user_name text not null,
  aksi text not null,
  detail text not null
);

create index if not exists idx_log_at on log_aktivitas(at desc);

-- ==============================================================================
-- KEBIJAKAN ROW LEVEL SECURITY (RLS)
-- Akses diizinkan untuk klien aplikasi dengan anon/authenticated key.
-- ==============================================================================

alter table pengaturan enable row level security;
alter table pengguna enable row level security;
alter table bahan enable row level security;
alter table menu enable row level security;
alter table mutasi enable row level security;
alter table penjualan enable row level security;
alter table log_aktivitas enable row level security;

-- Buat policy serbaguna jika belum ada
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'pengaturan' and policyname = 'Akses penuh pengaturan') then
    create policy "Akses penuh pengaturan" on pengaturan for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'pengguna' and policyname = 'Akses penuh pengguna') then
    create policy "Akses penuh pengguna" on pengguna for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'bahan' and policyname = 'Akses penuh bahan') then
    create policy "Akses penuh bahan" on bahan for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'menu' and policyname = 'Akses penuh menu') then
    create policy "Akses penuh menu" on menu for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'mutasi' and policyname = 'Akses penuh mutasi') then
    create policy "Akses penuh mutasi" on mutasi for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'penjualan' and policyname = 'Akses penuh penjualan') then
    create policy "Akses penuh penjualan" on penjualan for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'log_aktivitas' and policyname = 'Akses penuh log') then
    create policy "Akses penuh log" on log_aktivitas for all using (true) with check (true);
  end if;
end $$;

-- ==============================================================================
-- PUBLIKASI REALTIME
-- Memungkinkan perubahan data tersinkronisasi otomatis antar-perangkat secara instan
-- ==============================================================================

do $$
begin
  begin
    alter publication supabase_realtime add table mutasi, penjualan, bahan, menu, pengaturan, pengguna, log_aktivitas;
  exception
    when duplicate_object then
      null;
    when others then
      -- Jika publikasi belum ada atau tabel sudah terdaftar
      null;
  end;
end $$;
