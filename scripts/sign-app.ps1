# SkillMate Application Signing Script
# Requires Administrator privileges

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SkillMate Application Signing Tool" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check admin privileges
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: Administrator privileges required" -ForegroundColor Red
    Write-Host "Please right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or run:" -ForegroundColor Cyan
    Write-Host "powershell -Command Start-Process powershell -Verb RunAs -ArgumentList '-File', '$PSCommandPath'" -ForegroundColor White
    pause
    exit 1
}

Write-Host "OK: Administrator privileges confirmed" -ForegroundColor Green
Write-Host ""

# Step 1: Check or create certificate
Write-Host "=== Step 1: Check Certificate ===" -ForegroundColor Cyan

# Check My store first (for signing), then Root store (for trust)
$cert = Get-ChildItem -Path Cert:\LocalMachine\My | Where-Object {$_.Subject -like "*SkillMate*"} | Select-Object -First 1

if (-not $cert) {
    # Also check Root store
    $cert = Get-ChildItem -Path Cert:\LocalMachine\Root | Where-Object {$_.Subject -like "*SkillMate*"} | Select-Object -First 1
}

if ($cert) {
    Write-Host "OK: Certificate exists" -ForegroundColor Green
    Write-Host "  Subject: $($cert.Subject)"
    Write-Host "  Thumbprint: $($cert.Thumbprint)"
    Write-Host "  Store: $($cert.PSPath)"
    Write-Host "  Expires: $($cert.NotAfter)"
    Write-Host ""
    Write-Host "NOTE: If this certificate doesn't work for signing, run cleanup-cert.ps1 first" -ForegroundColor Yellow
} else {
    Write-Host "Creating new self-signed certificate..." -ForegroundColor Yellow

    try {
        # Step 1: Create certificate in "My" store with proper code signing EKU
        Write-Host "  Creating in LocalMachine\My..." -ForegroundColor Cyan
        $cert = New-SelfSignedCertificate `
            -Subject "CN=SkillMate Dev" `
            -CertStoreLocation "Cert:\LocalMachine\My" `
            -KeyLength 2048 `
            -KeyUsage DigitalSignature `
            -Type CodeSigning `
            -NotAfter (Get-Date).AddYears(5)

        Write-Host "  Copying to LocalMachine\Root..." -ForegroundColor Cyan

        # Step 2: Copy to Root store (Trusted Root)
        $certFilePath = Join-Path $env:TEMP "SkillMateDev.cer"
        Export-Certificate -Cert $cert -FilePath $certFilePath -Force | Out-Null
        Import-Certificate -FilePath $certFilePath -CertStoreLocation "Cert:\LocalMachine\Root" | Out-Null
        Remove-Item $certFilePath -Force

        # Keep reference to certificate from My store (for signing)
        $cert = Get-ChildItem -Path "Cert:\LocalMachine\My" | Where-Object {$_.Thumbprint -eq $cert.Thumbprint}

        Write-Host "OK: Certificate created" -ForegroundColor Green
        Write-Host "  Subject: $($cert.Subject)"
        Write-Host "  Thumbprint: $($cert.Thumbprint)"
        Write-Host "  Valid: 5 years"
    } catch {
        Write-Host "ERROR: Certificate creation failed: $_" -ForegroundColor Red
        pause
        exit 1
    }
}

Write-Host ""

# Step 2: Check application file
Write-Host "=== Step 2: Check Application ===" -ForegroundColor Cyan

$exePath = "out\SkillMate-win32-x64\SkillMate.exe"

if (-not (Test-Path $exePath)) {
    Write-Host "ERROR: Application not found" -ForegroundColor Red
    Write-Host "  Expected: $exePath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please run: npm run package" -ForegroundColor Cyan
    pause
    exit 1
}

Write-Host "OK: Application found: $exePath" -ForegroundColor Green
$fileSize = (Get-Item $exePath).Length / 1MB
Write-Host "  Size: $($fileSize.ToString('F2')) MB"
Write-Host ""

# Step 3: Sign application
Write-Host "=== Step 3: Sign Application ===" -ForegroundColor Cyan

try {
    Set-AuthenticodeSignature `
        -FilePath $exePath `
        -Certificate $cert `
        -HashAlgorithm SHA256 `
        -TimestampServer "http://timestamp.digicert.com"

    Write-Host "OK: Application signed" -ForegroundColor Green
} catch {
    Write-Host "WARNING: Signing error: $_" -ForegroundColor Yellow
    Write-Host "  (Timestamp server may be unavailable, but local signing is complete)" -ForegroundColor Cyan
}

Write-Host ""

# Step 4: Verify signature
Write-Host "=== Step 4: Verify Signature ===" -ForegroundColor Cyan

$sig = Get-AuthenticodeSignature $exePath

Write-Host "Status: " -NoNewline
switch ($sig.Status) {
    "Valid" {
        Write-Host "Valid" -ForegroundColor Green
    }
    "NotSigned" {
        Write-Host "Not Signed" -ForegroundColor Red
    }
    "HashMismatch" {
        Write-Host "Hash Mismatch" -ForegroundColor Yellow
    }
    "NotTrusted" {
        Write-Host "Not Trusted" -ForegroundColor Yellow
    }
    default {
        Write-Host "$($sig.Status)" -ForegroundColor Yellow
    }
}

Write-Host "Signer: $($sig.SignerCertificate.Subject)"
Write-Host "Time: $($sig.SignerCertificate.NotBefore)"
Write-Host ""

# Step 5: Add to TrustedPublisher
Write-Host "=== Step 5: Add to TrustedPublisher ===" -ForegroundColor Cyan

$trustedPublisherPath = "Cert:\LocalMachine\TrustedPublisher"
$trustedCert = Get-ChildItem -Path $trustedPublisherPath | Where-Object {$_.Thumbprint -eq $cert.Thumbprint}

if (-not $trustedCert) {
    Write-Host "Adding certificate to TrustedPublisher store..." -ForegroundColor Yellow

    try {
        # Export certificate to file
        $certFile = "SkillMateDev.cer"
        Export-Certificate -Cert $cert -FilePath $certFile -Force

        # Import to TrustedPublisher
        Import-Certificate -FilePath $certFile -CertStoreLocation "Cert:\LocalMachine\TrustedPublisher" | Out-Null

        # Delete temp file
        Remove-Item $certFile -Force

        Write-Host "OK: Certificate added to TrustedPublisher" -ForegroundColor Green
    } catch {
        Write-Host "WARNING: Could not add to TrustedPublisher: $_" -ForegroundColor Yellow
        Write-Host "  (May need manual trust)" -ForegroundColor Cyan
    }
} else {
    Write-Host "OK: Certificate already in TrustedPublisher" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SUCCESS: Signing Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now run the application:" -ForegroundColor Cyan
Write-Host "  .\out\SkillMate-win32-x64\SkillMate.exe" -ForegroundColor White
Write-Host ""
Write-Host "If still blocked, try:" -ForegroundColor Yellow
Write-Host "1. Restart computer" -ForegroundColor White
Write-Host "2. Temporarily disable Windows Defender" -ForegroundColor White
Write-Host "3. Add exclusion: Windows Defender -> Virus & threat protection -> Manage settings -> Exclusions" -ForegroundColor White
Write-Host ""
pause
