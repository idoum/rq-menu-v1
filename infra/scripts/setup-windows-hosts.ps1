# Windows Setup Script for SaaSResto
# Run as Administrator in PowerShell

Write-Host "SaaSResto - Windows Development Setup" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Hosts file path
$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"

# Entries to add
$entries = @(
    "127.0.0.1 saasresto.localhost",
    "127.0.0.1 demo.saasresto.localhost"
)

Write-Host "Adding entries to hosts file..." -ForegroundColor Yellow

# Read current hosts file
$hostsContent = Get-Content $hostsPath -Raw

# Add entries if not already present
foreach ($entry in $entries) {
    if ($hostsContent -notmatch [regex]::Escape($entry)) {
        Add-Content -Path $hostsPath -Value $entry
        Write-Host "  Added: $entry" -ForegroundColor Green
    } else {
        Write-Host "  Already exists: $entry" -ForegroundColor Gray
    }
}

# Flush DNS cache
Write-Host ""
Write-Host "Flushing DNS cache..." -ForegroundColor Yellow
ipconfig /flushdns | Out-Null
Write-Host "  DNS cache flushed" -ForegroundColor Green

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Start PostgreSQL service" -ForegroundColor White
Write-Host "2. Run: npm run db:push" -ForegroundColor White
Write-Host "3. Run: npm run db:seed" -ForegroundColor White
Write-Host "4. Run: npm run dev" -ForegroundColor White
Write-Host "5. Run: caddy run --config infra/proxy/Caddyfile.devlike" -ForegroundColor White
Write-Host "6. Open: http://demo.saasresto.localhost" -ForegroundColor White
Write-Host ""
Write-Host "Demo credentials:" -ForegroundColor Cyan
Write-Host "  Email:    demo@demo.com" -ForegroundColor White
Write-Host "  Password: Demo12345!" -ForegroundColor White
