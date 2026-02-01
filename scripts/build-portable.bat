@echo off
REM SkillMate Portable Build Script
REM Builds and fixes portable version in one step

setlocal enabledelayedexpansion

echo ============================================
echo SkillMate Portable Build Tool
echo ============================================
echo.

REM Step 1: Clean
echo [1/4] Cleaning old builds...
if exist out rmdir /s /q out
if exist .vite rmdir /s /q .vite
echo OK: Cleaned
echo.

REM Step 2: Build
echo [2/4] Building application...
call npm run make -- --platform=win32 --arch=x64
if errorlevel 1 (
    echo ERROR: Build failed
    exit /b 1
)
echo OK: Built
echo.

REM Step 3: Fix preload
echo [3/4] Fixing preload.cjs...
set "PACKAGE_DIR=out\SkillMate-win32-x64"
set "UNPACKED_DIR=%PACKAGE_DIR%\resources\app.asar.unpacked"

if not exist "%UNPACKED_DIR%" mkdir "%UNPACKED_DIR%"
copy /y ".vite\build\preload.cjs" "%UNPACKED_DIR%\preload.cjs"
if errorlevel 1 (
    echo ERROR: Failed to copy preload.cjs
    exit /b 1
)
echo OK: Fixed
echo.

REM Step 4: Repackage
echo [4/4] Repackaging ZIP...
set "ZIP_FILE=out\make\zip\win32\x64\SkillMate-win32-x64-2.0.0-FIXED.zip"
set "ZIP_DIR=out\make\zip\win32\x64"

if not exist "%ZIP_DIR%" mkdir "%ZIP_DIR%"
powershell -Command "Compress-Archive -Path '%PACKAGE_DIR%\*' -DestinationPath '%ZIP_FILE%' -Force"
if errorlevel 1 (
    echo ERROR: Failed to create ZIP
    exit /b 1
)
echo OK: Repackaged
echo.

REM Show result
for %%A in ("%ZIP_FILE%") do set SIZE=%%~zA
set /a SIZE_MB=%SIZE% / 1048576

echo ============================================
echo Build Complete!
echo ============================================
echo.
echo Output: %ZIP_FILE%
echo Size: %SIZE_MB% MB
echo.
echo Usage:
echo   1. Extract the ZIP file
echo   2. Double-click SkillMate.exe
echo.
pause
