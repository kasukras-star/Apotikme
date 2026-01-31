/**
 * Script untuk setup super admin user
 * Usage: node scripts/setup-super-admin.js <email> [role]
 * 
 * Contoh:
 * node scripts/setup-super-admin.js kasukras@gmail.com Admin
 */

const https = require('https');
const http = require('http');

const email = process.argv[2];
const role = process.argv[3] || 'Admin';
const adminApiToken = process.env.ADMIN_API_TOKEN || process.env.NEXT_PUBLIC_ADMIN_API_TOKEN;

if (!email) {
  console.error('❌ Error: Email diperlukan');
  console.log('Usage: node scripts/setup-super-admin.js <email> [role]');
  console.log('Contoh: node scripts/setup-super-admin.js kasukras@gmail.com Admin');
  process.exit(1);
}

if (!adminApiToken) {
  console.error('❌ Error: ADMIN_API_TOKEN tidak ditemukan di environment variables');
  console.log('Pastikan ADMIN_API_TOKEN sudah di-set di .env.local');
  process.exit(1);
}

const port = process.env.PORT || 3001;
const host = process.env.HOST || 'localhost';
const protocol = process.env.PROTOCOL || 'http';

async function updateUser() {
  return new Promise((resolve, reject) => {
    // First, get user list to find user ID
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

    const listReq = http.request(listOptions, (listRes) => {
      let data = '';

      listRes.on('data', (chunk) => {
        data += chunk;
      });

      listRes.on('end', () => {
        if (listRes.statusCode !== 200) {
          console.error('❌ Error mendapatkan daftar user:', data);
          reject(new Error(`HTTP ${listRes.statusCode}: ${data}`));
          return;
        }

        try {
          const result = JSON.parse(data);
          const user = result.users.find((u) => u.email === email);

          if (!user) {
            console.error(`❌ Error: User dengan email ${email} tidak ditemukan`);
            console.log('\nDaftar user yang tersedia:');
            result.users.forEach((u) => {
              console.log(`  - ${u.email} (Role: ${u.role || 'None'})`);
            });
            reject(new Error('User not found'));
            return;
          }

          console.log(`✅ User ditemukan: ${user.email} (ID: ${user.id})`);
          console.log(`   Role saat ini: ${user.role || 'None'}`);
          console.log(`   Apotik IDs: ${user.apotikIds?.length || 0}`);
          console.log(`   Super Admin: ${user.isSuperAdmin || false}`);

          // Update user
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

          const updateData = JSON.stringify({
            userId: user.id,
            role: role,
            isSuperAdmin: true,
            apotikIds: [], // Empty array for super admin (will access all)
          });

          const updateReq = http.request(updateOptions, (updateRes) => {
            let updateData = '';

            updateRes.on('data', (chunk) => {
              updateData += chunk;
            });

            updateRes.on('end', () => {
              if (updateRes.statusCode !== 200) {
                console.error('❌ Error mengupdate user:', updateData);
                reject(new Error(`HTTP ${updateRes.statusCode}: ${updateData}`));
                return;
              }

              try {
                const result = JSON.parse(updateData);
                console.log('\n✅ User berhasil diupdate!');
                console.log(`   Email: ${result.user.email}`);
                console.log(`   Role: ${result.user.role}`);
                console.log(`   Super Admin: ${result.user.isSuperAdmin}`);
                console.log(`   Apotik IDs: ${result.user.apotikIds?.length || 0} (Super Admin dapat akses semua)`);
                console.log('\n🎉 User sekarang dapat mengakses semua menu dan semua apotik!');
                resolve(result);
              } catch (err) {
                console.error('❌ Error parsing response:', err);
                reject(err);
              }
            });
          });

          updateReq.on('error', (err) => {
            console.error('❌ Error mengirim request:', err);
            reject(err);
          });

          updateReq.write(updateData);
          updateReq.end();
        } catch (err) {
          console.error('❌ Error parsing response:', err);
          reject(err);
        }
      });
    });

    listReq.on('error', (err) => {
      console.error('❌ Error mengirim request:', err);
      reject(err);
    });

    listReq.end();
  });
}

// Run script
updateUser()
  .then(() => {
    console.log('\n✨ Setup selesai!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Setup gagal:', err.message);
    process.exit(1);
  });
