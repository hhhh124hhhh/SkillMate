@echo off
REM ========================================
REM SkillMate 开源就绪检查脚本
REM 用途：快速检查项目是否准备好开源
REM ========================================

setlocal enabledelayedexpansion

set "ISSUES_FOUND=0"

echo.
echo ========================================
echo 🔍 SkillMate 开源就绪检查
echo ========================================
echo.

REM 检查 1: 敏感文件
echo [1/7] 检查敏感文件...
git ls-files | findstr /B /C:".env" >nul 2>&1
if !errorlevel! equ 0 (
    echo ❌ FAIL: .env 文件被 git 跟踪
    set /a ISSUES_FOUND+=1
) else (
    echo ✅ PASS: .env 文件未被跟踪
)

git ls-files | findstr /B /C:".claude-permissions.json" >nul 2>&1
if !errorlevel! equ 0 (
    echo ❌ FAIL: .claude-permissions.json 被跟踪
    set /a ISSUES_FOUND+=1
) else (
    echo ✅ PASS: .claude-permissions.json 未被跟踪
)

git ls-files | findstr /B /C:".claude/settings.local.json" >nul 2>&1
if !errorlevel! equ 0 (
    echo ❌ FAIL: .claude/settings.local.json 被跟踪
    set /a ISSUES_FOUND+=1
) else (
    echo ✅ PASS: .claude/settings.local.json 未被跟踪
)

echo.

REM 检查 2: 构建产物
echo [2/7] 检查构建产物...
git ls-files | findstr /B /C:"out/" >nul 2>&1
if !errorlevel! equ 0 (
    echo ❌ FAIL: out/ 目录被跟踪
    set /a ISSUES_FOUND+=1
) else (
    echo ✅ PASS: out/ 目录未被跟踪
)

git ls-files | findstr /B /C:"release/" >nul 2>&1
if !errorlevel! equ 0 (
    echo ❌ FAIL: release/ 目录被跟踪
    set /a ISSUES_FOUND+=1
) else (
    echo ✅ PASS: release/ 目录未被跟踪
)

git ls-files | findstr /B /C:".vscode/electron-userdata/" >nul 2>&1
if !errorlevel! equ 0 (
    echo ❌ FAIL: .vscode/electron-userdata/ 被跟踪
    set /a ISSUES_FOUND+=1
) else (
    echo ✅ PASS: .vscode/electron-userdata/ 未被跟踪
)

echo.

REM 检查 3: 临时文档
echo [3/7] 检查临时文档...
git ls-files | findstr /B /C:".trae/documents/plan_" >nul 2>&1
if !errorlevel! equ 0 (
    echo ⚠️  WARN: .trae/documents/plan_*.md 被跟踪
    set /a ISSUES_FOUND+=1
) else (
    echo ✅ PASS: 临时 plan 文档未被跟踪
)

echo.

REM 检查 4: 硬编码密钥
echo [4/7] 检查硬编码密钥...
findstr /S /C:"sk-ant-api03-" electron\*.ts src\*.tsx 2>nul | findstr /V "process.env" >nul 2>&1
if !errorlevel! equ 0 (
    echo ❌ FAIL: 可能存在硬编码的 API 密钥
    set /a ISSUES_FOUND+=1
) else (
    echo ✅ PASS: 未发现硬编码密钥
)

echo.

REM 检查 5: 必需文档
echo [5/7] 检查必需文档...
if not exist "README.md" (
    echo ⚠️  WARN: 缺少 README.md
    set /a ISSUES_FOUND+=1
) else (
    echo ✅ PASS: README.md 存在
)

if not exist "LICENSE" (
    echo ⚠️  WARN: 缺少 LICENSE 文件
    set /a ISSUES_FOUND+=1
) else (
    echo ✅ PASS: LICENSE 文件存在
)

if not exist ".env.example" (
    echo ⚠️  WARN: 缺少 .env.example
    set /a ISSUES_FOUND+=1
) else (
    echo ✅ PASS: .env.example 存在
)

echo.

REM 检查 6: .gitignore 配置
echo [6/7] 检查 .gitignore 配置...
findstr /C:".env" .gitignore >nul 2>&1
if !errorlevel! neq 0 (
    echo ❌ FAIL: .gitignore 缺少 .env 规则
    set /a ISSUES_FOUND+=1
) else (
    echo ✅ PASS: .env 在 .gitignore 中
)

findstr /C:"node_modules" .gitignore >nul 2>&1
if !errorlevel! neq 0 (
    echo ❌ FAIL: .gitignore 缺少 node_modules 规则
    set /a ISSUES_FOUND+=1
) else (
    echo ✅ PASS: node_modules 在 .gitignore 中
)

echo.

REM 检查 7: 仓库大小
echo [7/7] 检查仓库大小...
for /f %%A in ('git du 2^>nul ^| findstr /R "^[0-9]"') do set SIZE=%%A
if defined SIZE (
    echo ℹ️  当前仓库大小: !SIZE!
) else (
    echo ℹ️  无法确定仓库大小
)

echo.
echo ========================================
echo 📊 检查结果
echo ========================================
echo.

if !ISSUES_FOUND! gtr 0 (
    echo ❌ 发现 !ISSUES_FOUND! 个问题需要修复
    echo.
    echo 📝 建议：
    echo    运行 scripts\prepare-for-open-source.bat 修复问题
    echo.
) else (
    echo ✅ 所有检查通过！
    echo.
    echo 🎉 项目已准备好开源！
    echo.
)

echo ========================================
echo 📚 详细信息
echo ========================================
echo.
echo 完整报告: OPEN_SOURCE_AUDIT_REPORT.md
echo.

pause
