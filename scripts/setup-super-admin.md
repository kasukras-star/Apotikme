# Setup Super Admin User

Script untuk mengatur user agar bisa mengakses semua menu dan semua apotik.

## Cara Menggunakan

### Opsi 1: Menggunakan Script Node.js

1. Pastikan server Next.js sedang berjalan di `localhost:3001`
2. Pastikan `ADMIN_API_TOKEN` sudah di-set di `.env.local`
3. Jalankan script:

```bash
node scripts/setup-super-admin.js kasukras@gmail.com Admin
```

### Opsi 2: Menggunakan API Langsung (cURL)

```bash
# 1. Get user list untuk mendapatkan user ID
curl -X GET "http://localhost:3001/api/admin/list-users" \
  -H "Authorization: Bearer YOUR_ADMIN_API_TOKEN"

# 2. Update user (ganti USER_ID dengan ID dari step 1)
curl -X PATCH "http://localhost:3001/api/admin/update-user" \
  -H "Authorization: Bearer YOUR_ADMIN_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "role": "Admin",
    "isSuperAdmin": true,
    "apotikIds": []
  }'
```

### Opsi 3: Menggunakan Supabase Dashboard

1. Buka Supabase Dashboard → Authentication → Users
2. Cari user dengan email `kasukras@gmail.com`
3. Klik "Edit" pada user tersebut
4. Di bagian "User Metadata", edit `app_metadata`:
   ```json
   {
     "role": "Admin",
     "isSuperAdmin": true,
     "apotikIds": []
   }
   ```
5. Save changes

## Setelah Setup

User `kasukras@gmail.com` akan memiliki:
- ✅ Role: Admin
- ✅ Super Admin: true (akses semua apotik)
- ✅ Akses semua menu (karena role Admin)

User perlu logout dan login kembali untuk perubahan berlaku.
