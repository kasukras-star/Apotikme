# Setup User kasukras@gmail.com sebagai Super Admin

## Cara 1: Menggunakan Script (Paling Mudah)

1. **Pastikan server Next.js berjalan:**
   ```bash
   npm run dev
   ```

2. **Pastikan ADMIN_API_TOKEN sudah di-set di `.env.local`:**
   ```env
   ADMIN_API_TOKEN=your-admin-api-token-here
   ```

3. **Jalankan script:**
   ```bash
   node scripts/setup-user-kasukras.js
   ```

Script akan otomatis:
- Mencari user dengan email `kasukras@gmail.com`
- Mengupdate role menjadi `Admin`
- Mengaktifkan `isSuperAdmin: true`
- Mengatur `apotikIds: []` (akses semua apotik)

## Cara 2: Menggunakan Browser Console (Jika sudah login sebagai Admin)

1. Login ke aplikasi sebagai Admin yang sudah ada
2. Buka browser console (F12)
3. Jalankan script berikut:

```javascript
// Get user list
const response = await fetch('/api/admin/list-users', {
  headers: {
    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session.access_token}`
  }
});
const data = await response.json();
const user = data.users.find(u => u.email === 'kasukras@gmail.com');

if (!user) {
  console.error('User tidak ditemukan');
} else {
  // Update user
  const updateResponse = await fetch('/api/admin/update-user', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      userId: user.id,
      role: 'Admin',
      isSuperAdmin: true,
      apotikIds: []
    })
  });
  
  const result = await updateResponse.json();
  console.log('✅ User berhasil diupdate:', result);
}
```

## Cara 3: Menggunakan Supabase Dashboard (Manual)

1. Buka Supabase Dashboard → Authentication → Users
2. Cari user dengan email `kasukras@gmail.com`
3. Klik "Edit" pada user tersebut
4. Scroll ke bagian "User Metadata"
5. Edit `app_metadata` menjadi:
   ```json
   {
     "role": "Admin",
     "isSuperAdmin": true,
     "apotikIds": []
   }
   ```
6. Klik "Save"

## Setelah Setup

User `kasukras@gmail.com` akan memiliki:
- ✅ **Role:** Admin (akses semua menu admin)
- ✅ **Super Admin:** true (akses semua apotik)
- ✅ **Apotik IDs:** [] (empty = akses semua)

**Penting:** User perlu **logout dan login kembali** agar perubahan berlaku.

## Verifikasi

Setelah login kembali, user seharusnya:
1. Melihat semua menu di sidebar (termasuk IT Manajemen)
2. Dapat mengakses halaman Pengaturan User
3. Dapat mengakses semua apotik (via selector di header)
4. Tidak ada error "Unauthorized"
