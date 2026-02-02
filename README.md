This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### Agar data tampil di URL dan antar perangkat

**Apakah perlu deploy ulang?** Ya. Setelah perubahan kode (load/save lewat API), aplikasi di URL (Vercel) harus di-build ulang dan di-deploy. Tanpa redeploy, URL masih menjalankan versi lama yang hanya baca/tulis ke localStorage, sehingga data di localhost tidak tampil di URL dan data di perangkat A tidak tampil di perangkat B. Setelah redeploy dan konfigurasi env benar, data akan dimuat dan disimpan lewat API (Supabase) sehingga tampil sama di semua origin dan perangkat.

**Checklist:**

| Yang perlu dilakukan | Untuk apa |
|----------------------|------------|
| Set env di Vercel (lihat bawah) | API dan auth bisa konek ke Supabase |
| Jalankan **supabase-app_config.sql** di Supabase | API bisa baca/tulis data (Data Master, Merchandise, Warehouse, POS) |
| **Redeploy** project di Vercel | URL menjalankan kode baru yang pakai API |
| (Opsional) Migrasi data lama dari localhost (lihat bawah) | Data yang dulu cuma di localStorage ikut ke Supabase dan tampil di URL |

### 1. Set environment variables di Vercel

Tanpa env ini, API gagal konek ke Supabase dan halaman bisa error "Supabase env belum dikonfigurasi".

1. Buka [Vercel Dashboard](https://vercel.com) → pilih project Anda.
2. **Settings** → **Environment Variables**.
3. Tambah variable berikut (nilai dari Supabase Dashboard → Project Settings → API; sama seperti di `.env.local`):

| Name | Dipakai untuk |
|------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth client + validasi token di API |
| `SUPABASE_SERVICE_ROLE_KEY` | API menulis ke `app_config` (getSupabaseAdmin) |

4. Simpan setiap variable. Pilih Environment: Production, Preview, Development.
5. **Redeploy sekali**: **Deployments** → tiga titik pada deployment terbaru → **Redeploy**.

Redeploy hanya perlu sekali setelah menambah atau mengubah env. Setelah itu: ubah kode dan push ke Git → Vercel otomatis deploy; ubah env lagi → perlu redeploy lagi agar env baru dipakai. Lihat `.env.example` untuk daftar variable.

### 2. Tabel app_config di Supabase

API generik (`app/api/data/[key]/route.ts`) membaca/menulis ke tabel `app_config`. Tanpa tabel ini, data tidak bisa sinkron ke Supabase. **Wajib** dijalankan agar Data Master, Merchandise, Warehouse, dan POS sinkron di URL dan antar perangkat.

- Jalankan **supabase-app_config.sql** di **Supabase Dashboard → SQL Editor**, pada project yang sama dengan `NEXT_PUBLIC_SUPABASE_URL`.

### 3. Redeploy di Vercel

Setelah env di-set (atau diubah): **Redeploy** project (Deployments → … → Redeploy, atau push commit baru). Pastikan deploy selesai tanpa error.

### 4. Data lama yang hanya ada di localStorage (opsional)

Data yang **sebelum** perubahan hanya disimpan di localStorage (localhost atau satu browser) tidak otomatis pindah ke Supabase. Jadi di URL, setelah redeploy, awalnya data dari API bisa kosong. Data yang dulu cuma ada di localhost tidak akan tampil di URL sampai "dipush" ke Supabase.

**Cara memindahkan data lama ke Supabase:**

1. Jalankan app di **localhost** (dengan kode terbaru dan `.env.local` yang sudah diisi Supabase).
2. Buka tiap modul yang punya data di localStorage (Data Master, Merchandise, Warehouse, POS, dll.).
3. Di tiap halaman, lakukan **load** (data akan terisi dari localStorage), lalu **simpan/update** (submit form atau tombol simpan) agar app memanggil POST ke API dan menulis ke Supabase.
4. Setelah itu, buka **URL (Vercel)** dan refresh; data yang sudah di-POST dari localhost akan tampil dari API.

Tidak perlu ubah kode untuk langkah di atas; cukup pastikan redeploy dan env Vercel sudah benar, lalu lakukan migrasi sekali dari localhost jika ingin data lama ikut tampil di URL.

### SQL di Supabase (ada 2 file)

Di repo ada **dua** file SQL yang bisa dijalankan di Supabase Dashboard → SQL Editor (project yang sama dengan `NEXT_PUBLIC_SUPABASE_URL`):

| File | Kegunaan |
|------|----------|
| **supabase-app_config.sql** | Tabel `app_config` untuk sinkron Data Master, Merchandise, Warehouse, POS. **Wajib** dijalankan agar data tampil di URL dan antar perangkat. |
| **supabase-riwayat_perubahan_harga_jual.sql** | Tabel dan RLS untuk **riwayat perubahan harga jual**. Wajib dijalankan agar data perubahan harga sinkron antar perangkat dan via URL. |
