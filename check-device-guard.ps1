# SkillMate - Disable Device Guard for Development
# IMPORTANT: Only for development/testing, NOT for production

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SkillMate Device Guard Diagnostic" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Device Guard status
Write-Host "=== Checking Device Guard Status ===" -ForegroundColor Cyan
$deviceGuard = Get-ComputerInfo | Select-Object -ExpandProperty DeviceGuardSecurityServicesConfigured

if ($deviceGuard -match "HypervisorEnforcedCodeIntegrity") {
    Write-Host "WARNING: HVCI (Device Guard) is ENABLED" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "This unsigned application cannot run with HVCI enabled." -ForegroundColor Red
    Write-Host ""
    Write-Host "Solutions:" -ForegroundColor Cyan
    Write-Host "1. For DEVELOPMENT: Disable HVCI temporarily" -ForegroundColor White
    Write-Host "2. For TESTING: Use Windows Sandbox or VM" -ForegroundColor White
    Write-Host "3. For PRODUCTION: Purchase code signing certificate ($300+/year)" -ForegroundColor White
    Write-Host ""
    Write-Host "To disable HVCI:" -ForegroundColor Yellow
    Write-Host "1. Windows Settings -> Update & Security -> Windows Security" -ForegroundColor White
    Write-Host "2. Device security -> Core isolation details" -ForegroundColor White
    Write-Host "3. Turn OFF Memory integrity" -ForegroundColor White
    Write-Host "4. Restart computer" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "OK: HVCI is not enabled" -ForegroundColor Green
    Write-Host "The application should run without signing" -ForegroundColor Green
}

Write-Host ""
Write-Host "Alternative: Run in development mode with 'npm start'" -ForegroundColor Cyan
Write-Host ""
pause
