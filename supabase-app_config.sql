-- Jalankan sekali di Supabase Dashboard > SQL Editor
-- Wajib agar data (Data Master, Merchandise, Warehouse, POS) sinkron di URL dan antar perangkat

create table if not exists app_config (
  key text primary key,
  value jsonb
);
