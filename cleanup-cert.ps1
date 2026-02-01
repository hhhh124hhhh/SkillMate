# Clean up existing SkillMate certificates
Write-Host "Removing existing SkillMate certificates..." -ForegroundColor Yellow

# Remove from My store
$myCerts = Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object {$_.Subject -like "*SkillMate*"}
foreach ($c in $myCerts) {
    Write-Host "  Removing from My: $($c.Thumbprint)" -ForegroundColor Cyan
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("My","LocalMachine")
    $store.Open("MaxAllowed")
    $store.Remove($c)
    $store.Close()
}

# Remove from Root store
$rootCerts = Get-ChildItem -Path Cert:\LocalMachine\Root | Where-Object {$_.Subject -like "*SkillMate*"}
foreach ($c in $rootCerts) {
    Write-Host "  Removing from Root: $($c.Thumbprint)" -ForegroundColor Cyan
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root","LocalMachine")
    $store.Open("MaxAllowed")
    $store.Remove($c)
    $store.Close()
}

# Remove from TrustedPublisher
$tpCerts = Get-ChildItem -Path Cert:\LocalMachine\TrustedPublisher | Where-Object {$_.Subject -like "*SkillMate*"}
foreach ($c in $tpCerts) {
    Write-Host "  Removing from TrustedPublisher: $($c.Thumbprint)" -ForegroundColor Cyan
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("TrustedPublisher","LocalMachine")
    $store.Open("MaxAllowed")
    $store.Remove($c)
    $store.Close()
}

Write-Host "OK: Certificates removed" -ForegroundColor Green
Write-Host ""
Write-Host "Now run: .\admin-sign.bat" -ForegroundColor Cyan
pause
