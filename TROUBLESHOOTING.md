# 故障排除指南

本文档提供 SkillMate 常见问题的解决方案。

---

## 🔧 缓存和数据问题

### 问题: 克隆项目后看到旧的对话历史

**症状**：
- 在全新克隆的项目中看到之前的对话
- 左侧会话列表显示旧会话
- 应用启动时有历史数据

**原因**：
Electron 浏览器缓存存储在 `.vscode/electron-userdata/` 目录中，包含：
- IndexedDB 数据库
- LocalStorage / SessionStorage
- 其他浏览器缓存

如果此目录被包含在项目克隆中（虽然已在 `.gitignore` 中），历史记录就会被带过去。

**解决方案**：

1. **快速修复**：
   ```bash
   # 删除 Electron 用户数据
   rm -rf .vscode/electron-userdata

   # 重新启动
   npm start
   ```

2. **使用清理脚本**：
   ```bash
   # Windows
   scripts\clean-cache.bat

   # macOS/Linux
   ./scripts/clean-cache.sh
   ```

3. **应用内清除**：
   - 打开设置
   - 进入"高级设置"
   - 点击"清除所有数据"

**验证**：
```bash
# 确认目录已删除
ls .vscode/electron-userdata
# 应该报错: No such file or directory
```

---

### 问题: 应用启动时显示错误或白屏

**症状**：
- 窗口打开但内容空白
- 控制台有错误信息
- 应用无响应

**原因**：
- 缓存数据损坏
- 依赖版本冲突
- 端口被占用

**解决方案**：

1. **清除缓存**：
   ```bash
   rm -rf .vscode/electron-userdata
   rm -rf node_modules
   npm install
   npm start
   ```

2. **检查端口占用**：
   ```bash
   # Windows
   netstat -ano | findstr :5173

   # macOS/Linux
   lsof -ti:5173 | xargs kill -9
   ```

3. **查看日志**：
   - 开发模式：查看终端输出
   - 打开 DevTools (F12) 查看 Console

---

### 问题: 清除数据后配置丢失

**症状**：
- 清除数据后需要重新配置
- API Key 被删除

**说明**：
清除所有数据功能会**保留**以下配置：
- ✅ API Key（会保留）
- ✅ 系统关键配置

会**删除**：
- ❌ 所有对话历史
- ❌ 授权文件夹列表
- ❌ 技能设置
- ❌ 用户偏好设置

**如果需要保留配置**：

手动删除特定文件：
```bash
# 只删除对话历史（保留配置）
rm .vscode/electron-userdata/opencowork-sessions.json
```

---

## 🌐 网络和连接问题

### 问题: API 调用失败

**症状**：
- AI 不回复
- 错误提示 "API Error"
- 网络超时

**原因**：
- API Key 配置错误
- 网络连接问题
- API 服务不可用

**解决方案**：

1. **检查 API Key**：
   - 打开设置 → API 配置
   - 确认 API Key 正确
   - 尝试重新生成 API Key

2. **检查网络连接**：
   ```bash
   # 测试 API 连通性
   curl https://open.bigmodel.cn/api/anthropic/v1/messages

   # 或检查代理设置
   echo $HTTP_PROXY
   echo $HTTPS_PROXY
   ```

3. **检查设置**：
   - 设置 → 高级设置
   - 确认"网络访问"已启用

---

### 问题: MCP 服务器连接失败

**症状**：
- MCP 工具不显示
- 错误: "MCP error -32000: Connection closed"

**原因**：
- Python 环境未安装
- mcp-server-fetch 未安装

**解决方案**：

1. **检查 Python**：
   ```bash
   python --version
   # 或
   python3 --version
   ```

2. **安装 MCP 服务器**：
   ```bash
   pip install mcp-server-fetch
   ```

3. **重新启动应用**：
   ```bash
   npm start
   ```

---

## 📦 安装和依赖问题

### 问题: npm install 失败

**症状**：
- 安装过程中断
- 依赖安装错误
- 网络超时

**解决方案**：

1. **使用国内镜像**：
   ```bash
   npm install --registry=https://registry.npmmirror.com
   ```

2. **清理缓存**：
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **检查 Node.js 版本**：
   ```bash
   node --version
   # 要求: >= 18.0.0
   ```

---

### 问题: electron-forge 命令未找到

**症状**：
```
'electron-forge' 不是内部或外部命令
```

**原因**：
依赖未安装或路径配置错误

**解决方案**：

1. **安装依赖**：
   ```bash
   npm install
   ```

2. **使用 npx**：
   ```bash
   npx electron-forge start
   ```

3. **检查 package.json**：
   ```bash
   npm run start
   ```

---

## 🪟 窗口和界面问题

### 问题: 窗口不显示或黑屏

**症状**：
- 启动后没有窗口
- 窗口完全黑屏
- 任务栏有图标但无窗口

**原因**：
- 窗口配置错误
- GPU 加速问题
- 显示器设置

**解决方案**：

1. **禁用 GPU 加速**：
   ```bash
   npm start --disable-gpu
   ```

2. **检查配置**：
   - 查看终端日志
   - 检查 `electron/main.ts` 窗口配置

3. **重置应用数据**：
   ```bash
   rm -rf .vscode/electron-userdata
   npm start
   ```

---

### 问题: 任务栏图标显示不正确或图标不一致

**症状**：
- 任务栏显示默认图标或旧版本图标
- 开发模式 (`npm start`) 和打包模式 (`npm run package`) 显示不同图标
- 窗口图标、任务栏图标、系统托盘图标不一致
- 图标模糊或不清晰

**常见原因**：

1. **Windows 图标缓存问题** ⭐ 最常见
   - Windows 会缓存应用图标以提高性能
   - 即使图标文件更新，缓存仍可能显示旧版本

2. **打包配置问题**
   - 图标文件未被正确打包到 `app.asar.unpacked` 目录
   - `forge.config.ts` 中缺少 `asarUnpack` 配置

3. **图标生成被禁用**
   - 构建流程中的图标生成步骤被注释掉
   - 使用了旧版本的图标文件

4. **开发模式路径问题**
   - 开发模式使用项目根目录的图标
   - 打包模式使用打包后的图标
   - 两个图标文件版本不一致

---

**诊断步骤**：

```bash
# 1. 检查图标文件是否存在且大小正确
ls -lh build/icon.ico
# 应该显示约 353KB (新版) 而不是 37KB (旧版)

# 2. 检查 PNG 图标完整性
ls build/icons/png/
# 应该包含: 16x16.png 到 1024x1024.png 的所有尺寸

# 3. 检查 forge.config.ts 配置
grep -A5 "asarUnpack" forge.config.ts
# 应该包含: 'build/**/*'

# 4. 检查打包后的图标
ls out/SkillMate-win32-x64/resources/app.asar.unpacked/build/icon.ico
# 应该存在且大小正确
```

---

**完整解决方案**：

#### **方案一: 快速修复（推荐）**

根据你的运行模式选择对应的命令：

**开发模式** (`npm start`):
```bash
# 1. 清理缓存并修复图标
npm run fix-dev-icon

# 2. 启动开发服务器
npm start
```

**打包模式** (`npm run package`):
```bash
# 1. 清理 Windows 图标缓存
npm run clear-icon-cache

# 2. 清理旧的打包输出
rm -rf out/

# 3. 重新打包（会自动生成最新图标）
npm run package
```

---

#### **方案二: 手动修复（深度排查）**

**步骤 1: 清理 Windows 图标缓存**

```batch
# Windows 命令提示符（管理员）
taskkill /f /im explorer.exe
cd /d %userprofile%\AppData\Local
del /f /a s /q IconCache.db
cd /d %userprofile%\AppData\Local\Microsoft\Windows\Explorer
del /f /a s /q iconcache_*.db
start explorer.exe
```

或使用项目提供的脚本：
```bash
npm run clear-icon-cache
```

**步骤 2: 验证和修复配置文件**

检查 `forge.config.ts`:

```typescript
// 确保启用图标生成（第 27-35 行）
generateAssets: async (forgeConfig: any) => {
  // 生成应用图标（启用以确保图标一致性）
  const { execSync } = await import('node:child_process')
  try {
    console.log('  → Generating application icons...')
    execSync('npm run generate-icons', { stdio: 'inherit' })
    console.log('  ✅ Icons generated successfully')
  } catch (error) {
    console.warn('  ⚠️  Icon generation failed, continuing...')
  }
}

// 确保 asarUnpack 包含 build 目录（第 96-102 行）
asarUnpack: [
  'resources/skills/**/*',
  'build/**/*',  // ✅ 必须有这一行
  'node_modules/sharp/**/*',
  'node_modules/@modelcontextprotocol/sdk/**/*'
]
```

**步骤 3: 重新生成图标**

```bash
# 强制重新生成所有图标
npm run generate-icons

# 验证生成的图标
ls -lh build/icon.ico
ls build/icons/png/
```

**步骤 4: 清理并重新构建**

```bash
# 清理所有构建输出
rm -rf out/
rm -rf .vite/

# 重新打包
npm run package
```

---

#### **方案三: 强制刷新（终极方案）**

如果以上方案都无效，尝试以下步骤：

```bash
# 1. 完全清理项目
rm -rf out/
rm -rf .vite/
rm -rf node_modules/.cache

# 2. 清理 Windows 图标缓存
npm run clear-icon-cache

# 3. 重新安装依赖（可选）
npm install

# 4. 重新生成图标
npm run generate-icons

# 5. 重新打包
npm run package

# 6. 重启计算机（最后手段）
# 这会强制 Windows 重建所有图标缓存
```

---

**验证清单**：

修复完成后，检查以下位置的图标是否一致：

- [ ] **桌面快捷方式图标** - 查看桌面快捷方式
- [ ] **任务栏图标** - 运行应用后查看任务栏
- [ ] **窗口左上角图标** - 应用窗口左上角
- [ ] **系统托盘图标** - 系统托盘区域（右下角）
- [ ] **任务管理器图标** - Ctrl+Shift+Esc 打开任务管理器
- [ ] **Alt+Tab 切换图标** - 应用切换时显示的图标

所有位置应该都显示统一的 SkillMate 六边形标志，且清晰无模糊。

---

**预防措施**：

为防止将来再次出现此问题：

1. ✅ **CI/CD 检查** - 在构建流程中添加图标文件大小验证
2. ✅ **版本控制** - 将 `build/icon.ico` 纳入版本控制
3. ✅ **自动化** - 每次构建前自动运行图标生成（已配置）
4. ✅ **文档** - 定期查看本文档的最新更新

---

**相关文件**：

- 📄 `forge.config.ts` - 构建配置（图标生成和打包）
- 📄 `electron/main.ts` - 主进程（窗口图标配置）
- 🔧 `scripts/clear-icon-cache.bat` - Windows 图标缓存清理工具
- 🔧 `scripts/fix-dev-icon.bat` - 开发模式图标修复工具
- 📦 `build/icon.ico` - Windows 图标文件
- 📦 `build/icons/png/` - 多尺寸 PNG 图标

---

**技术细节**：

**开发模式 vs 打包模式的图标路径**：

- **开发模式**:
  ```typescript
  iconPath = path.resolve(process.env.APP_ROOT || process.cwd(), 'build', 'icon.ico')
  // 使用: <project-root>/build/icon.ico
  ```

- **打包模式**:
  ```typescript
  iconPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'build', 'icon.ico')
  // 使用: <app-path>/resources/app.asar.unpacked/build/icon.ico
  ```

这就是为什么需要在 `asarUnpack` 中包含 `'build/**/*'` 的原因！

**为什么图标会进入缓存**：

Windows 为了提高性能，会为应用图标创建多个缓存版本：
- 不同尺寸的缩略图（16x16, 32x32, 48x48, 256x256）
- 不同显示场景（任务栏、桌面、Alt+Tab）
- 不同显示效果（正常、高对比度、高 DPI）

即使图标文件更新，这些缓存可能不会自动刷新，需要手动清理。

---

## 🔐 权限和安全问题

### 问题: 文件写入权限被拒绝

**症状**：
- 无法写入文件
- 错误: "Permission denied"

**原因**：
- 文件夹未授权
- 权限被拒绝

**解决方案**：

1. **授权文件夹**：
   - 设置 → 权限管理
   - 添加文件夹到授权列表

2. **检查权限**：
   ```bash
   # Linux/macOS
   ls -la /path/to/folder

   # Windows
   icacls "C:\path\to\folder"
   ```

3. **运行方式**：
   - 以管理员身份运行（Windows）
   - 使用 sudo（macOS/Linux）

---

## 📱 其他问题

### 问题: 应用占用内存过高

**症状**：
- 任务管理器显示高内存占用
- 应用卡顿

**解决方案**：

1. **清除历史数据**：
   - 设置 → 高级设置 → 清除所有数据

2. **限制历史记录**：
   - 定期清理旧会话
   - 避免单个会话过长

3. **重启应用**：
   - 关闭应用
   - 删除缓存
   - 重新启动

---

### 问题: 快捷键不工作

**症状**：
- Alt+Space 无响应
- 自定义快捷键无效

**原因**：
- 快捷键冲突
- 应用未聚焦

**解决方案**：

1. **检查快捷键设置**：
   - 设置 → 高级设置
   - 重新设置快捷键

2. **检查冲突**：
   - 关闭其他应用
   - 更改快捷键组合

3. **重启应用**：
   ```bash
   npm start
   ```

---

## 🆘 获取帮助

如果以上解决方案都无法解决你的问题：

1. **查看日志**：
   - 开发模式：终端输出
   - DevTools Console (F12)

2. **搜索 Issues**：
   - [GitHub Issues](https://github.com/hhhh124hhhh/SkillMate/issues)

3. **创建新 Issue**：
   - 描述问题
   - 提供错误日志
   - 说明系统环境：
     - 操作系统版本
     - Node.js 版本
     - npm 版本

4. **加入社区**：
   - 扫描 README 中的微信群二维码
   - GitHub Discussions

---

**最后更新**: 2026-02-01
**适用版本**: SkillMate v2.0.0+
