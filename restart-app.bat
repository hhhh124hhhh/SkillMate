@echo off
echo 正在关闭 SkillMate...
taskkill /F /IM SkillMate.exe 2>nul
taskkill /F /IM electron.exe 2>nul

echo 清理缓存...
rd /s /q .vite 2>nul
rd /s /q out 2>nul
rd /s /q dist 2>nul

echo 重新启动应用...
npm start
