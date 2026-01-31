@echo off
REM ========================================
REM SkillMate 开源准备脚本
REM 用途：清理敏感文件和构建产物
REM ========================================

setlocal enabledelayedexpansion

echo.
echo ========================================
echo 🔒 SkillMate 开源准备工具
echo ========================================
echo.
echo 此脚本将执行以下操作：
echo   1. 从 git 中移除构建产物（~2.1GB）
echo   2. 移除 Claude 配置文件
echo   3. 清理临时开发文档
echo   4. 更新 .gitignore
echo   5. 创建配置示例文件
echo.
echo ⚠️  警告：此操作会修改 git 暂存区
echo.
pause

echo.
echo ========================================
echo 📦 第 1 步：移除构建产物
echo ========================================
echo.

REM 移除构建产物
echo 移除 .vscode/electron-userdata/...
git rm -r --cached .vscode/electron-userdata/ 2>nul
if !errorlevel! equ 0 (
    echo ✅ 已移除 .vscode/electron-userdata/
) else (
    echo ℹ️  .vscode/electron-userdata/ 未被跟踪或已移除
)

echo 移除 out/...
git rm -r --cached out/ 2>nul
if !errorlevel! equ 0 (
    echo ✅ 已移除 out/
) else (
    echo ℹ️  out/ 未被跟踪或已移除
)

echo 移除 release/...
git rm -r --cached release/ 2>nul
if !errorlevel! equ 0 (
    echo ✅ 已移除 release/
) else (
    echo ℹ️  release/ 未被跟踪或已移除
)

echo.
echo ========================================
echo ⚙️  第 2 步：移除 Claude 配置文件
echo ========================================
echo.

echo 移除 .claude-permissions.json...
git rm --cached .claude-permissions.json 2>nul
if !errorlevel! equ 0 (
    echo ✅ 已移除 .claude-permissions.json
) else (
    echo ℹ️  .claude-permissions.json 未被跟踪或已移除
)

echo 移除 .claude/settings.local.json...
git rm --cached .claude\settings.local.json 2>nul
if !errorlevel! equ 0 (
    echo ✅ 已移除 .claude\settings.local.json
) else (
    echo ℹ️  .claude\settings.local.json 未被跟踪或已移除
)

echo.
echo ========================================
echo 📄 第 3 步：清理临时开发文档
echo ========================================
echo.

echo 移除 .trae/documents/ 中的 plan 文件...
git rm ".trae/documents/plan_20260116_062747.md" 2>nul
git rm ".trae/documents/plan_20260116_063207.md" 2>nul
git rm ".trae/documents/plan_20260116_063704.md" 2>nul
git rm ".trae/documents/plan_20260116_064744.md" 2>nul
git rm ".trae/documents/plan_20260116_065151.md" 2>nul
git rm ".trae/documents/plan_20260116_073853.md" 2>nul
git rm ".trae/documents/plan_20260116_074841.md" 2>nul
git rm ".trae/documents/plan_20260116_080310.md" 2>nul
git rm ".trae/documents/plan_20260116_083915.md" 2>nul
git rm ".trae/documents/plan_20260116_084020.md" 2>nul
git rm ".trae/documents/plan_20260116_084750.md" 2>nul
git rm ".trae/documents/plan_20260116_110356.md" 2>nul
git rm ".trae/documents/plan_20260116_110735.md" 2>nul
git rm ".trae/documents/plan_20260116_112305.md" 2>nul
git rm ".trae/documents/plan_20260116_113214.md" 2>nul

echo ✅ 已移除 plan 文件

echo.
echo ========================================
echo 🚫 第 4 步：更新 .gitignore
echo ========================================
echo.

REM 检查 .gitignore 是否已包含这些规则
findstr /C:".vscode/electron-userdata/" .gitignore >nul
if !errorlevel! neq 0 (
    echo.
    echo # 开源准备 - Claude Code 配置 >> .gitignore
    echo .claude-permissions.json >> .gitignore
    echo .claude/settings.local.json >> .gitignore
    echo.
    echo # 开源准备 - 开发环境数据 >> .gitignore
    echo .vscode/electron-userdata/ >> .gitignore
    echo.
    echo # 开源准备 - 临时开发文档 >> .gitignore
    echo .trae/ >> .gitignore
    echo ✅ 已更新 .gitignore
) else (
    echo ℹ️  .gitignore 已包含这些规则
)

echo.
echo ========================================
echo 📝 第 5 步：创建配置示例文件
echo ========================================
echo.

if not exist ".claude-permissions.json.example" (
    echo 创建 .claude-permissions.json.example...
    copy .claude-permissions.json .claude-permissions.json.example >nul
    echo ✅ 已创建 .claude-permissions.json.example
) else (
    echo ℹ️  .claude-permissions.json.example 已存在
)

echo.
echo ========================================
echo 💾 第 6 步：提交更改
echo ========================================
echo.

echo 将更新 .gitignore 添加到暂存区...
git add .gitignore .claude-permissions.json.example 2>nul

echo.
echo ⚠️  请检查以下将要提交的更改：
echo.
git status --short

echo.
echo.
echo ========================================
echo 📊 清理总结
echo ========================================
echo.
echo ✅ 构建产物已从 git 移除（但仍在磁盘上）
echo ✅ Claude 配置已从 git 移除
echo ✅ 临时文档已清理
echo ✅ .gitignore 已更新
echo ✅ 配置示例已创建
echo.
echo ========================================
echo 🎯 下一步操作
echo ========================================
echo.
echo 1. 查看将要提交的更改：
echo    git diff --cached
echo.
echo 2. 如果确认无误，提交更改：
echo    git commit -m "chore: 清理敏感文件和构建产物，准备开源"
echo.
echo 3. 推送到新分支（推荐）：
echo    git checkout -b prepare-for-open-source
echo    git push origin prepare-for-open-source
echo.
echo 4. 或者直接推送到主分支（谨慎）：
echo    git push origin main
echo.
echo ⚠️  重要提醒：
echo - 磁盘上的文件未被删除，仅从 git 跟踪中移除
echo - 建议在新分支上测试，确认无误后再合并
echo - 仓库大小将减少约 2GB
echo.

pause
