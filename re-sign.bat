@echo off
echo ========================================
echo Clean and Re-sign Application
echo ========================================
echo.

echo Step 1: Cleaning old certificates...
powershell.exe -ExecutionPolicy Bypass -File "%~dp0cleanup-cert.ps1"

echo.
echo Step 2: Signing with new certificate...
powershell.exe -ExecutionPolicy Bypass -File "%~dp0scripts\sign-app.ps1"

pause
