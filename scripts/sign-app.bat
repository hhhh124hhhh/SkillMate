@echo off
REM 创建自签名证书并签名应用程序
REM 需要管理员权限运行

echo ========================================
echo 创建自签名开发证书
echo ========================================

REM 检查是否已存在证书
powershell -Command "Get-ChildItem -Path Cert:\LocalMachine\TrustedPublisher | Where-Object {$_.Subject -like '*SkillMate*'}" >nul 2>&1
if %errorlevel% equ 0 (
    echo 证书已存在，跳过创建
) else (
    echo 创建新的自签名证书...
    powershell -Command "$cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject 'CN=SkillMate Dev' -CertStoreLocation 'Cert:\LocalMachine\Root'; Export-Certificate -Cert $cert -FilePath 'SkillMateDev.cer'"
    echo 证书创建完成
)

echo.
echo ========================================
echo 签名应用程序
echo ========================================

set EXE_PATH=out\SkillMate-win32-x64\SkillMate.exe

if not exist "%EXE_PATH%" (
    echo 错误: 找不到应用程序 %EXE_PATH%
    echo 请先运行 npm run package
    pause
    exit /b 1
)

echo 签名: %EXE_PATH%
powershell -Command "$cert = Get-ChildItem -Path Cert:\LocalMachine\Root | Where-Object {$_.Subject -like '*SkillMate*'}; if ($cert) { Set-AuthenticodeSignature -FilePath '%EXE_PATH%' -Certificate $cert -HashAlgorithm SHA256; Write-Host '签名成功' -ForegroundColor Green } else { Write-Host '找不到证书' -ForegroundColor Red; exit 1 }"

echo.
echo ========================================
echo 验证签名
echo ========================================
powershell -Command "Get-AuthenticodeSignature '%EXE_PATH%' | Select-Object Status, SignerCertificate | Format-List"

echo.
echo 完成！现在可以运行应用程序了。
pause
