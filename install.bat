@echo off
REM SkillMate 简单安装脚本 (Windows)
REM 这是一个非交互式的安装脚本

echo ========================================
echo SkillMate 依赖安装工具
echo ========================================
echo.

REM 检查 Node.js
echo [1/4] 检查 Node.js...
node --version
if errorlevel 1 (
    echo ERROR: 未检测到 Node.js，请先安装 Node.js 18+
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)
echo OK: Node.js 已安装
echo.

REM 安装 Node.js 依赖
echo [2/4] 安装 Node.js 依赖...
echo 这可能需要几分钟时间，请耐心等待...
echo.
call npm install
if errorlevel 1 (
    echo.
    echo ERROR: npm install 失败
    echo.
    echo 尝试解决方案:
    echo 1. 使用国内镜像: npm install --registry=https://registry.npmmirror.com
    echo 2. 清理缓存: npm cache clean --force
    echo 3. 删除 node_modules 后重试
    echo.
    pause
    exit /b 1
)
echo OK: Node.js 依赖安装成功
echo.

REM 检查 Python
echo [3/4] 检查 Python 环境...
python --version >nul 2>&1
if errorlevel 1 (
    python3 --version >nul 2>&1
    if errorlevel 1 (
        echo WARNING: 未检测到 Python
        echo 网页抓取功能需要 Python 环境
        echo.
    ) else (
        echo OK: Python3 已安装
    )
) else (
    echo OK: Python 已安装
)
echo.

REM 安装 Python MCP 服务器
echo [4/4] 安装 Python MCP 服务器...
python --version >nul 2>&1
if not errorlevel 1 (
    python -m pip install mcp-server-fetch
    if not errorlevel 1 (
        echo OK: mcp-server-fetch 安装成功
    ) else (
        echo WARNING: mcp-server-fetch 安装失败
        echo 网页抓取功能将不可用，但不影响其他功能
    )
) else (
    python3 -m pip install mcp-server-fetch >nul 2>&1
    if not errorlevel 1 (
        echo OK: mcp-server-fetch 安装成功
    ) else (
        echo WARNING: mcp-server-fetch 安装失败
        echo 网页抓取功能将不可用，但不影响其他功能
    )
)
echo.

echo ========================================
echo 安装完成！
echo ========================================
echo.
echo 下一步:
echo   1. 配置 API Key (推荐使用智谱 AI)
echo   2. 运行应用: npm start
echo   3. 查看 README.md 了解更多
echo.
echo 获取智谱 AI API Key:
echo   https://open.bigmodel.cn/
echo.
pause
