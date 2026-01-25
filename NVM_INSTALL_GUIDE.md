# nvm-windows 安装指南

## 步骤 1: 下载 nvm-windows

### 方法 1: 直接下载（推荐）

**最新版本**:
- 下载链接: https://github.com/coreybutler/nvm-windows/releases/latest
- 文件名: `nvm-setup.exe`

**或者使用特定版本**:
- 下载链接: https://github.com/coreybutler/nvm-windows/releases/download/1.1.12/nvm-setup.exe

### 方法 2: 从发布页面下载

1. 访问: https://github.com/coreybutler/nvm-windows/releases
2. 查找最新版本（通常是顶部的最新 release）
3. 下载 `nvm-setup.exe` 文件

## 步骤 2: 安装 nvm-windows

1. **运行安装程序**
   - 双击下载的 `nvm-setup.exe`
   - 如果提示 UAC（用户账户控制），点击"是"

2. **选择安装路径**
   - 默认路径: `C:\Users\<YourUsername>\AppData\Roaming\nvm`
   - 建议保持默认设置
   - 点击"Next"

3. **选择 Node.js 符号链接路径**
   - 默认路径: `C:\Program Files\nodejs`
   - 建议保持默认设置
   - 点击"Next"

4. **完成安装**
   - 点击"Install"
   - 等待安装完成
   - 点击"Finish"

5. **验证安装**
   - **关闭所有终端窗口**
   - **重新打开终端**（重要！）
   - 运行命令: `nvm version`
   - 应该显示版本号，如: `1.1.12`

## 步骤 3: 安装 Node.js 20

```powershell
# 查看可用的 Node.js 版本
nvm list available

# 安装 Node.js 20（最新 LTS 版本）
nvm install 20

# 或者安装特定版本
nvm install 20.16.0
```

## 步骤 4: 切换到 Node.js 20

```powershell
# 切换到 Node.js 20
nvm use 20

# 验证当前版本
node --version
# 应该显示: v20.x.x

# 验证 npm 版本
npm --version
```

## 步骤 5: 重新安装项目依赖

```powershell
# 切换到项目目录
cd d:\wechat-flowwork

# 删除旧的 node_modules（可选但推荐）
rmdir /s /q node_modules

# 重新安装依赖
npm install
```

## 步骤 6: 启动应用

```powershell
npm run dev
```

## 常见问题

### Q1: 安装后 `nvm` 命令仍不可用
**A**: 关闭所有终端窗口和编辑器，重新打开。

### Q2: `nvm use 20` 报错
**A**: 以管理员身份运行终端。

### Q3: 多个终端版本不一致
**A**: 确保所有终端（VS Code 集成终端、PowerShell、CMD）都已重启。

### Q4: 安装后 node 仍然是旧版本
**A**:
```powershell
# 查看已安装的版本
nvm list

# 确保使用正确的版本
nvm use 20.16.0

# 验证
node --version
```

## 验证清单

- [ ] nvm-windows 安装成功（`nvm version` 显示版本号）
- [ ] Node.js 20 安装成功（`nvm list` 显示 20.x.x）
- [ ] 当前版本切换成功（`node --version` 显示 v20.x.x）
- [ ] 项目依赖安装成功（`npm install` 无错误）
- [ ] 应用启动成功（`npm run dev` 正常运行）
- [ ] 无 ESM/CommonJS 导入错误
- [ ] 无 Immer MapSet 插件错误

## 快捷命令参考

```powershell
# 查看 nvm 版本
nvm version

# 查看已安装的 Node 版本
nvm list

# 查看可用的 Node 版本
nvm list available

# 安装特定版本
nvm install 20

# 切换到特定版本
nvm use 20

# 设置默认版本
nvm alias default 20
```

## 完成后的下一步

安装完成后，请运行以下命令验证:

```powershell
# 1. 验证 Node 版本
node --version

# 2. 验证 npm 版本
npm --version

# 3. 切换到项目目录
cd d:\wechat-flowwork

# 4. 重新安装依赖
npm install

# 5. 启动应用
npm run dev
```

如果一切正常，您应该看到:
- ✅ Vite 开发服务器成功启动
- ✅ Electron 窗口正常打开
- ✅ 无 ESM/CommonJS 错误
- ✅ 无 Immer MapSet 插件错误
