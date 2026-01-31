-- Jalankan sekali di Supabase Dashboard > SQL Editor
-- Agar POS bisa load daftar apotik dari server saat localStorage kosong (Incognito / perangkat lain)

create table if not exists app_config (
  key text primary key,
  value jsonb
);
