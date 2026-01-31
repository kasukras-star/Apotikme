# PowerShell script untuk setup user kasukras@gmail.com sebagai Super Admin
# Usage: .\scripts\setup-kasukras.ps1

$email = "kasukras@gmail.com"
$role = "Admin"
$isSuperAdmin = $true
$apotikIds = @()

# Load .env.local if exists
if (Test-Path ".env.local") {
    Get-Content ".env.local" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*)\s*=\s*(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

$adminApiToken = $env:ADMIN_API_TOKEN

if (-not $adminApiToken) {
    Write-Host "❌ Error: ADMIN_API_TOKEN tidak ditemukan" -ForegroundColor Red
    Write-Host "Pastikan ADMIN_API_TOKEN sudah di-set di .env.local" -ForegroundColor Yellow
    exit 1
}

$port = if ($env:PORT) { $env:PORT } else { "3001" }
$baseUrl = "http://localhost:$port"

Write-Host "🔍 Mencari user: $email" -ForegroundColor Cyan

# Step 1: Get user list
try {
    $listResponse = Invoke-RestMethod -Uri "$baseUrl/api/admin/list-users" `
        -Method GET `
        -Headers @{
            "Authorization" = "Bearer $adminApiToken"
            "Content-Type" = "application/json"
        }
    
    $user = $listResponse.users | Where-Object { $_.email -eq $email } | Select-Object -First 1
    
    if (-not $user) {
        Write-Host "❌ User dengan email $email tidak ditemukan" -ForegroundColor Red
        Write-Host "`nDaftar user yang tersedia:" -ForegroundColor Yellow
        $listResponse.users | ForEach-Object {
            Write-Host "  - $($_.email) (Role: $(if ($_.role) { $_.role } else { 'None' }))" -ForegroundColor Gray
        }
        exit 1
    }
    
    Write-Host "✅ User ditemukan:" -ForegroundColor Green
    Write-Host "   ID: $($user.id)" -ForegroundColor Gray
    Write-Host "   Email: $($user.email)" -ForegroundColor Gray
    Write-Host "   Role saat ini: $(if ($user.role) { $user.role } else { 'None' })" -ForegroundColor Gray
    Write-Host "   Super Admin: $(if ($user.isSuperAdmin) { 'true' } else { 'false' })" -ForegroundColor Gray
    Write-Host "   Apotik IDs: $(if ($user.apotikIds) { $user.apotikIds.Count } else { 0 })" -ForegroundColor Gray
    
    # Step 2: Update user
    Write-Host "`n🔄 Mengupdate user..." -ForegroundColor Cyan
    
    $updateBody = @{
        userId = $user.id
        role = $role
        isSuperAdmin = $isSuperAdmin
        apotikIds = $apotikIds
    } | ConvertTo-Json
    
    $updateResponse = Invoke-RestMethod -Uri "$baseUrl/api/admin/update-user" `
        -Method PATCH `
        -Headers @{
            "Authorization" = "Bearer $adminApiToken"
            "Content-Type" = "application/json"
        } `
        -Body $updateBody
    
    Write-Host "`n✅ User berhasil diupdate!" -ForegroundColor Green
    Write-Host "   Email: $($updateResponse.user.email)" -ForegroundColor Gray
    Write-Host "   Role: $($updateResponse.user.role)" -ForegroundColor Gray
    Write-Host "   Super Admin: $($updateResponse.user.isSuperAdmin)" -ForegroundColor Gray
    Write-Host "   Apotik IDs: $(if ($updateResponse.user.apotikIds) { $updateResponse.user.apotikIds.Count } else { 0 }) (Super Admin dapat akses semua)" -ForegroundColor Gray
    Write-Host "`n🎉 Setup selesai!" -ForegroundColor Green
    Write-Host "`n📝 Langkah selanjutnya:" -ForegroundColor Yellow
    Write-Host "   1. User perlu logout dan login kembali" -ForegroundColor White
    Write-Host "   2. Setelah login, user akan memiliki akses ke semua menu" -ForegroundColor White
    Write-Host "   3. User dapat mengakses semua apotik (karena Super Admin)" -ForegroundColor White
    
} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Detail: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    exit 1
}
