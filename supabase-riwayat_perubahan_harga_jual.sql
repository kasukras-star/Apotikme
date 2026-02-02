-- Jalankan sekali di Supabase Dashboard > SQL Editor
-- Pastikan project yang dipilih sama dengan URL di .env.local / Vercel (NEXT_PUBLIC_SUPABASE_URL)
-- Agar riwayat perubahan harga jual sinkron antar perangkat (bukan hanya localStorage)

create table if not exists riwayat_perubahan_harga_jual (
  id uuid primary key default gen_random_uuid(),
  no_transaksi text not null,
  tanggal_berlaku date not null,
  produk_id text not null,
  kode_produk text not null,
  nama_produk text not null,
  harga_lama numeric not null default 0,
  harga_baru numeric not null default 0,
  operator text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_riwayat_ph_created_at on riwayat_perubahan_harga_jual (created_at desc);
create index if not exists idx_riwayat_ph_no_transaksi on riwayat_perubahan_harga_jual (no_transaksi);

alter table riwayat_perubahan_harga_jual enable row level security;

drop policy if exists "riwayat_ph_authenticated" on riwayat_perubahan_harga_jual;
create policy "riwayat_ph_authenticated"
  on riwayat_perubahan_harga_jual for all to authenticated
  using (true) with check (true);

drop policy if exists "riwayat_ph_anon" on riwayat_perubahan_harga_jual;
create policy "riwayat_ph_anon"
  on riwayat_perubahan_harga_jual for all to anon
  using (true) with check (true);
