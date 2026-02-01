@echo off
echo ========================================
echo SkillMate Quick Test
echo ========================================
echo.

echo Step 1: Checking build artifacts...
echo.
if exist "out\SkillMate-win32-x64\SkillMate.exe" (
    echo [OK] Packaged application exists
    dir "out\SkillMate-win32-x64\SkillMate.exe" | find "SkillMate.exe"
) else (
    echo [MISSING] Packaged application not found
    echo Run: npm run package
)
echo.

echo Step 2: Checking resource files...
echo.
if exist "out\SkillMate-win32-x64\resources\mcp-templates.json" (
    echo [OK] mcp-templates.json exists
) else (
    echo [ERROR] mcp-templates.json missing
)
echo.

if exist "out\SkillMate-win32-x64\resources\skills" (
    echo [OK] skills directory exists
    dir /b "out\SkillMate-win32-x64\resources\skills" | find /c /v "" > temp.txt
    set /p skill_count=<temp.txt
    del temp.txt
    echo [INFO] Found !skill_count! skills
) else (
    echo [ERROR] skills directory missing
)
echo.

echo Step 3: Checking preload.cjs in app.asar...
echo.
npx asar list "out\SkillMate-win32-x64\resources\app.asar" | find "electron/preload.cjs" >nul
if %errorlevel% equ 0 (
    echo [OK] preload.cjs found in app.asar
) else (
    echo [ERROR] preload.cjs missing from app.asar
)
echo.

echo Step 4: Security check...
echo.
echo [Checking for API Key leaks...]
grep -a "sk-ant-" "out\SkillMate-win32-x64\resources\app.asar" >nul 2>&1
if %errorlevel% equ 0 (
    echo [WARNING] Real API Key found in app.asar!
) else (
    echo [OK] No API Key leaks detected
)
echo.

echo Step 5: Checking Device Guard status...
echo.
powershell -Command "Get-ComputerInfo | Select-Object -ExpandProperty DeviceGuardSecurityServicesConfigured" | find "HypervisorEnforcedCodeIntegrity" >nul
if %errorlevel% equ 0 (
    echo [WARNING] HVCI (Device Guard) is ENABLED
    echo [INFO] Packaged app may be blocked
    echo [INFO] Run check-device-guard.ps1 for details
) else (
    echo [OK] HVCI is not enabled
)
echo.

echo ========================================
echo Test Summary Complete
echo ========================================
echo.
echo For detailed testing checklist, see: TESTING-CHECKLIST.md
echo.
echo To test in development mode, run: npm start
echo To test packaged app, run: .\out\SkillMate-win32-x64\SkillMate.exe
echo.
pause
