@echo off
echo ========================================
echo Switching to Node.js 20
echo ========================================
echo.

REM Use full path to nvm.exe
set NVM_EXE=C:\Users\Lenovo\AppData\Local\nvm\nvm.exe

if not exist "%NVM_EXE%" (
    echo ERROR: nvm.exe not found at %NVM_EXE%
    echo.
    echo Please close this cmd window and reopen a new one,
    echo or run nvm-windows installer again.
    pause
    exit /b 1
)

REM Step 1: Install Node 20
echo Step 1: Installing Node.js 20...
"%NVM_EXE%" install 20
echo.

REM Step 2: Switch to Node 20
echo Step 2: Switching to Node.js 20...
"%NVM_EXE%" use 20
echo.

REM Step 3: Verify version
echo Step 3: Verifying Node.js version...
C:\nvm4w\nodejs\node.exe --version
echo.

REM Step 4: Navigate to project
echo Step 4: Navigating to project directory...
cd /d d:\wechat-flowwork
echo Current directory: %CD%
echo.

REM Step 5: Reinstall dependencies
echo Step 5: Reinstalling dependencies...
call npm install
echo.

REM Step 6: Start application
echo Step 6: Starting application...
echo ========================================
echo.
npm run dev
