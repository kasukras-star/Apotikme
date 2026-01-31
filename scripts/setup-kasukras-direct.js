/**
 * Script untuk setup user kasukras@gmail.com menggunakan Supabase Admin SDK langsung
 * Tidak memerlukan server Next.js berjalan
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const EMAIL = 'kasukras@gmail.com';
const ROLE = 'Admin';
const IS_SUPER_ADMIN = true;
const APOTIK_IDS = [];

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
let supabaseUrl, supabaseServiceKey;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        if (key.trim() === 'NEXT_PUBLIC_SUPABASE_URL') {
          supabaseUrl = value;
        }
        if (key.trim() === 'SUPABASE_SERVICE_ROLE_KEY') {
          supabaseServiceKey = value;
        }
      }
    }
  });
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY tidak ditemukan');
  console.log('Pastikan kedua variabel sudah di-set di .env.local');
  process.exit(1);
}

async function setupUser() {
  try {
    console.log('🔍 Mencari user:', EMAIL);
    
    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get user list
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      throw new Error(`Failed to get users: ${listError.message}`);
    }

    const user = usersData.users.find((u) => u.email === EMAIL);

    if (!user) {
      console.error(`❌ User dengan email ${EMAIL} tidak ditemukan`);
      console.log('\nDaftar user yang tersedia:');
      usersData.users.forEach((u) => {
        console.log(`  - ${u.email} (Role: ${u.app_metadata?.role || 'None'})`);
      });
      throw new Error('User not found');
    }

    console.log(`✅ User ditemukan:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role saat ini: ${user.app_metadata?.role || 'None'}`);
    console.log(`   Super Admin: ${user.app_metadata?.isSuperAdmin || false}`);
    console.log(`   Apotik IDs: ${user.app_metadata?.apotikIds?.length || 0}`);

    // Update user
    console.log('\n🔄 Mengupdate user...');
    
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        app_metadata: {
          ...user.app_metadata,
          role: ROLE,
          isSuperAdmin: IS_SUPER_ADMIN,
          apotikIds: APOTIK_IDS,
        }
      }
    );

    if (updateError) {
      throw new Error(`Failed to update user: ${updateError.message}`);
    }
    
    console.log('\n✅ User berhasil diupdate!');
    console.log(`   Email: ${updateData.user.email}`);
    console.log(`   Role: ${updateData.user.app_metadata?.role}`);
    console.log(`   Super Admin: ${updateData.user.app_metadata?.isSuperAdmin}`);
    console.log(`   Apotik IDs: ${updateData.user.app_metadata?.apotikIds?.length || 0} (Super Admin dapat akses semua)`);
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

setupUser();
