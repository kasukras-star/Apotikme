/**
 * Script sederhana untuk setup user kasukras@gmail.com sebagai Super Admin
 * Tidak memerlukan dotenv - membaca langsung dari process.env
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const EMAIL = 'kasukras@gmail.com';
const ROLE = 'Admin';
const IS_SUPER_ADMIN = true;
const APOTIK_IDS = [];

// Load .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value;
      }
    }
  });
}

const adminApiToken = process.env.ADMIN_API_TOKEN;

if (!adminApiToken) {
  console.error('❌ Error: ADMIN_API_TOKEN tidak ditemukan');
  console.log('Pastikan ADMIN_API_TOKEN sudah di-set di .env.local');
  process.exit(1);
}

const port = process.env.PORT || 3001;
const host = 'localhost';

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve(body);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function setupUser() {
  try {
    console.log('🔍 Mencari user:', EMAIL);
    
    // Step 1: Get user list
    const listOptions = {
      hostname: host,
      port: port,
      path: '/api/admin/list-users',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminApiToken}`,
        'Content-Type': 'application/json',
      },
    };

    const listData = await makeRequest(listOptions);
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
    
    const updateOptions = {
      hostname: host,
      port: port,
      path: '/api/admin/update-user',
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminApiToken}`,
        'Content-Type': 'application/json',
      },
    };

    const updateBody = JSON.stringify({
      userId: user.id,
      role: ROLE,
      isSuperAdmin: IS_SUPER_ADMIN,
      apotikIds: APOTIK_IDS,
    });

    const updateData = await makeRequest(updateOptions, updateBody);
    
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
    if (error.message.includes('ECONNREFUSED')) {
      console.error('   Pastikan server Next.js sedang berjalan di localhost:' + port);
    }
    process.exit(1);
  }
}

setupUser();
