# SkillMate 图标修复脚本

Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "SkillMate 图标修复工具" -ForegroundColor Magenta
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# 检查源图标
$sourceIcon = "public\icon.png"
if (-not (Test-Path $sourceIcon)) {
    Write-Host "❌ 找不到源图标: $sourceIcon" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "✅ 找到源图标: $sourceIcon" -ForegroundColor Green
Write-Host ""

Write-Host "请选择修复方案:" -ForegroundColor Yellow
Write-Host ""
Write-Host "[1] 使用在线工具重新生成 .ico 文件（推荐）" -ForegroundColor White
Write-Host "[2] 使用 electron-icon-builder 重新生成" -ForegroundColor White
Write-Host "[3] 验证当前图标文件" -ForegroundColor White
Write-Host "[4] 查看详细帮助" -ForegroundColor White
Write-Host ""

$choice = Read-Host "请选择 (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "📝 使用在线工具生成图标:" -ForegroundColor Cyan
        Write-Host "1. 访问: https://icoconvert.com/" -ForegroundColor White
        Write-Host "2. 点击 'Choose File' 上传 public\icon.png" -ForegroundColor White
        Write-Host "3. 选择以下尺寸:" -ForegroundColor Yellow
        Write-Host "   ☑ 16x16" -ForegroundColor White
        Write-Host "   ☑ 32x32" -ForegroundColor White
        Write-Host "   ☑ 48x48" -ForegroundColor White
        Write-Host "   ☑ 256x256" -ForegroundColor White
        Write-Host "4. 下载生成的 .ico 文件" -ForegroundColor White
        Write-Host "5. 将文件保存到 build\icon.ico（替换现有文件）" -ForegroundColor White
        Write-Host ""
        Write-Host "正在打开 icoconvert.com..." -ForegroundColor Cyan
        Start-Process "https://icoconvert.com/"
    }

    "2" {
        Write-Host ""
        Write-Host "📦 使用 electron-icon-builder 生成图标..." -ForegroundColor Cyan
        Write-Host ""

        Write-Host "检查是否安装了 electron-icon-builder..." -ForegroundColor Yellow
        try {
            $null = npm list electron-icon-builder --depth=0 2>&1
            Write-Host "✅ electron-icon-builder 已安装" -ForegroundColor Green
        } catch {
            Write-Host "⚠️  electron-icon-builder 未安装，正在安装..." -ForegroundColor Yellow
            npm install -g electron-icon-builder
        }

        Write-Host ""
        Write-Host "生成图标文件..." -ForegroundColor Cyan
        npx electron-icon-builder --overwrite --output build/icon.png public/icon.png

        Write-Host ""
        Write-Host "✅ 图标生成完成" -ForegroundColor Green
        Write-Host ""
        Write-Host "注意: electron-icon-builder 生成的是 PNG 文件" -ForegroundColor Yellow
        Write-Host "Windows 需要 .ico 格式，请使用方案 1" -ForegroundColor Yellow
    }

    "3" {
        Write-Host ""
        Write-Host "🔍 验证当前图标文件..." -ForegroundColor Cyan
        Write-Host ""

        if (Test-Path "build\icon.ico") {
            $file = Get-Item "build\icon.ico"
            Write-Host "✅ 图标文件存在" -ForegroundColor Green
            Write-Host "   路径: $($file.FullName)" -ForegroundColor White
            Write-Host "   大小: $($file.Length) 字节" -ForegroundColor White
            Write-Host ""

            # 使用 file 命令检查（如果可用）
            try {
                $fileInfo = file build/icon.ico
                Write-Host "   文件类型: 图标文件" -ForegroundColor Cyan
            } catch {
                Write-Host "⚠️  无法验证文件格式" -ForegroundColor Yellow
            }
        } else {
            Write-Host "❌ 图标文件不存在: build\icon.ico" -ForegroundColor Red
        }

        Write-Host ""
        Write-Host "🔍 检查源图标:" -ForegroundColor Cyan
        if (Test-Path "public\icon.png") {
            $file = Get-Item "public\icon.png"
            Write-Host "✅ 源图标存在" -ForegroundColor Green
            Write-Host "   路径: $($file.FullName)" -ForegroundColor White
            Write-Host "   大小: $($file.Length) 字节" -ForegroundColor White

            # 尝试读取图片尺寸
            try {
                Add-Type -AssemblyName System.Drawing
                $image = [System.Drawing.Image]::FromFile((Resolve-Path "public\icon.png"))
                Write-Host "   尺寸: $($image.Width) x $($image.Height)" -ForegroundColor Cyan
                $image.Dispose()
            } catch {
                Write-Host "   无法读取图片尺寸（需要 .NET）" -ForegroundColor Yellow
            }
        }
    }

    "4" {
        Write-Host ""
        Write-Host "📖 详细帮助:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Windows 任务栏图标不显示的常见原因:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "1. 图标文件格式错误" -ForegroundColor White
        Write-Host "   解决: 使用在线工具重新生成 .ico 文件" -ForegroundColor Gray
        Write-Host ""
        Write-Host "2. 图标缓存问题" -ForegroundColor White
        Write-Host "   解决: 重启 Windows 或清除图标缓存" -ForegroundColor Gray
        Write-Host "   命令: ie4uinit.exe -show" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "3. Electron 配置问题" -ForegroundColor White
        Write-Host "   检查 electron/main.ts 中的 icon 配置" -ForegroundColor Gray
        Write-Host ""
        Write-Host "4. 开发模式问题" -ForegroundColor White
        Write-Host "   尝试完整打包后的应用" -ForegroundColor Gray
        Write-Host "   命令: npm run make" -ForegroundColor Cyan
        Write-Host ""
    }

    default {
        Write-Host "❌ 无效选择" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "💡 提示: 修改图标后需要完全重启应用才能生效" -ForegroundColor Yellow
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

pause
