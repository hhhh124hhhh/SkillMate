# SkillMate Portable Fix Script
# Adds preload.cjs to packaged app

$ErrorActionPreference = "Stop"

Write-Host "SkillMate Portable Fix Tool" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

# Get paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

$PreloadSource = Join-Path $ProjectRoot ".vite\build\preload.cjs"
$PackageDir = Join-Path $ProjectRoot "out\SkillMate-win32-x64"

# Check preload.cjs exists
Write-Host "Checking preload.cjs..." -ForegroundColor Yellow
if (-not (Test-Path $PreloadSource)) {
    Write-Host "ERROR: preload.cjs not found" -ForegroundColor Red
    Write-Host "Expected: $PreloadSource" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run 'npm run dev' first to generate preload.cjs" -ForegroundColor Yellow
    exit 1
}
Write-Host "OK: preload.cjs found" -ForegroundColor Green

# Check package directory exists
Write-Host ""
Write-Host "Checking package directory..." -ForegroundColor Yellow
if (-not (Test-Path $PackageDir)) {
    Write-Host "ERROR: Package directory not found" -ForegroundColor Red
    Write-Host "Expected: $PackageDir" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run 'npm run make' first to package the app" -ForegroundColor Yellow
    exit 1
}
Write-Host "OK: Package directory found" -ForegroundColor Green

# Create app.asar.unpacked directory
Write-Host ""
Write-Host "Fixing package..." -ForegroundColor Yellow
$UnpackedDir = Join-Path $PackageDir "resources\app.asar.unpacked"
if (-not (Test-Path $UnpackedDir)) {
    New-Item -ItemType Directory -Path $UnpackedDir -Force | Out-Null
    Write-Host "OK: Created app.asar.unpacked directory" -ForegroundColor Green
} else {
    Write-Host "INFO: app.asar.unpacked already exists" -ForegroundColor Cyan
}

# Copy preload.cjs
$PreloadDest = Join-Path $UnpackedDir "preload.cjs"
Copy-Item -Path $PreloadSource -Destination $PreloadDest -Force
Write-Host "OK: Copied preload.cjs to app.asar.unpacked" -ForegroundColor Green

# Repackage ZIP
Write-Host ""
Write-Host "Repackaging ZIP..." -ForegroundColor Yellow
$ZipOutput = Join-Path $ProjectRoot "out\make\zip\win32\x64\SkillMate-win32-x64-2.0.0-FIXED.zip"
$ZipDir = Split-Path $ZipOutput
if (-not (Test-Path $ZipDir)) {
    New-Item -ItemType Directory -Path $ZipDir -Force | Out-Null
}

# Use PowerShell Compress-Archive
Compress-Archive -Path "$PackageDir\*" -DestinationPath $ZipOutput -Force
Write-Host "OK: Created fixed ZIP" -ForegroundColor Green

# Show file size
$ZipSize = (Get-Item $ZipOutput).Length / 1MB
Write-Host "File size: $([math]::Round($ZipSize, 2)) MB" -ForegroundColor Cyan

Write-Host ""
Write-Host "Fix complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Fixed file:" -ForegroundColor Cyan
Write-Host "  $ZipOutput" -ForegroundColor White
Write-Host ""
Write-Host "Usage:" -ForegroundColor Cyan
Write-Host "  1. Extract the ZIP file" -ForegroundColor White
Write-Host "  2. Double-click SkillMate.exe to run" -ForegroundColor White
Write-Host ""
