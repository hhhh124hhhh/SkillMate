@echo off
echo ========================================
echo Running signing script as Administrator
echo ========================================
echo.

powershell.exe -ExecutionPolicy Bypass -File "%~dp0scripts\sign-app.ps1"

echo.
pause
