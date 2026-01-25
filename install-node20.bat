@echo off
echo ========================================
echo Installing Node.js 20 using nvm
echo ========================================
echo.

REM Try to find and run nvm.exe
if exist "%APPDATA%\nvm\nvm.exe" (
    echo Found nvm at: %APPDATA%\nvm\nvm.exe
    "%APPDATA%\nvm\nvm.exe" install 20
    "%APPDATA%\nvm\nvm.exe" use 20
    goto :verify
)

if exist "%PROGRAMFILES%\nvm\nvm.exe" (
    echo Found nvm at: %PROGRAMFILES%\nvm\nvm.exe
    "%PROGRAMFILES%\nvm\nvm.exe" install 20
    "%PROGRAMFILES%\nvm\nvm.exe" use 20
    goto :verify
)

if exist "%LOCALAPPDATA%\nvm\nvm.exe" (
    echo Found nvm at: %LOCALAPPDATA%\nvm\nvm.exe
    "%LOCALAPPDATA%\nvm\nvm.exe" install 20
    "%LOCALAPPDATA%\nvm\nvm.exe" use 20
    goto :verify
)

echo ERROR: nvm.exe not found in standard locations!
echo Please check if nvm-windows is properly installed.
echo.
echo Common locations:
echo - %APPDATA%\nvm\nvm.exe
echo - %PROGRAMFILES%\nvm\nvm.exe
echo - %LOCALAPPDATA%\nvm\nvm.exe
echo.
pause
exit /b 1

:verify
echo.
echo ========================================
echo Verifying installation...
echo ========================================
call "%APPDATA%\nvm\nvm.exe" version
if exist "%PROGRAMFILES%\nodejs\node.exe" (
    "%PROGRAMFILES%\nodejs\node.exe" --version
) else if exist "%APPDATA%\nvm\v20.16.0\node.exe" (
    "%APPDATA%\nvm\v20.16.0\node.exe" --version
)
echo.
echo ========================================
echo Installation complete!
echo ========================================
echo.
echo Next steps:
echo 1. Close this window and all terminal windows
echo 2. Reopen terminal and verify: node --version
echo 3. Run: cd d:\wechat-flowwork
echo 4. Run: npm install
echo 5. Run: npm run dev
echo.
pause
