/**
 * Script untuk setup user kasukras@gmail.com sebagai Super Admin
 * 
 * Cara menggunakan:
 * 1. Pastikan server Next.js berjalan di localhost:3001
 * 2. Set ADMIN_API_TOKEN di environment atau .env.local
 * 3. Jalankan: node scripts/setup-user-kasukras.js
 */

require('dotenv').config({ path: '.env.local' });

const http = require('http');

const EMAIL = 'kasukras@gmail.com';
const ROLE = 'Admin';
const IS_SUPER_ADMIN = true;
const APOTIK_IDS = []; // Empty untuk super admin

const adminApiToken = process.env.ADMIN_API_TOKEN;

if (!adminApiToken) {
  console.error('❌ Error: ADMIN_API_TOKEN tidak ditemukan');
  console.log('Pastikan ADMIN_API_TOKEN sudah di-set di .env.local');
  process.exit(1);
}

const port = process.env.PORT || 3001;
const host = 'localhost';

async function setupUser() {
  try {
    console.log('🔍 Mencari user:', EMAIL);
    
    // Step 1: Get user list
    const listResponse = await fetch(`http://${host}:${port}/api/admin/list-users`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminApiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      throw new Error(`Failed to get users: ${listResponse.status} - ${errorText}`);
    }

    const listData = await listResponse.json();
    const user = listData.users.find((u) => u.email === EMAIL);

    if (!user) {
      console.error(`❌ User dengan email ${EMAIL} tidak ditemukan`);
      console.log('\nDaftar user yang tersedia:');
      listData.users.forEach((u) => {
        console.log(`  - ${u.email} (Role: ${u.role || 'None'})`);
      });
      throw new Error('User not found');
    }

    console.log(`✅ User ditemukan:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role saat ini: ${user.role || 'None'}`);
    console.log(`   Super Admin: ${user.isSuperAdmin || false}`);
    console.log(`   Apotik IDs: ${user.apotikIds?.length || 0}`);

    // Step 2: Update user
    console.log('\n🔄 Mengupdate user...');
    
    const updateResponse = await fetch(`http://${host}:${port}/api/admin/update-user`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user.id,
        role: ROLE,
        isSuperAdmin: IS_SUPER_ADMIN,
        apotikIds: APOTIK_IDS,
      }),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to update user: ${updateResponse.status} - ${errorText}`);
    }

    const updateData = await updateResponse.json();
    
    console.log('\n✅ User berhasil diupdate!');
    console.log(`   Email: ${updateData.user.email}`);
    console.log(`   Role: ${updateData.user.role}`);
    console.log(`   Super Admin: ${updateData.user.isSuperAdmin}`);
    console.log(`   Apotik IDs: ${updateData.user.apotikIds?.length || 0} (Super Admin dapat akses semua)`);
    console.log('\n🎉 Setup selesai!');
    console.log('\n📝 Langkah selanjutnya:');
    console.log('   1. User perlu logout dan login kembali');
    console.log('   2. Setelah login, user akan memiliki akses ke semua menu');
    console.log('   3. User dapat mengakses semua apotik (karena Super Admin)');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ Error: Node.js version terlalu lama. Diperlukan Node.js 18+ atau install node-fetch');
  process.exit(1);
}

setupUser();
