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

### 问题: 任务栏图标显示不正确

**症状**：
- 任务栏显示默认图标
- 图标不清晰

**原因**：
- 图标文件损坏
- 图标缓存问题

**解决方案**：

1. **重新生成图标**：
   ```bash
   npx electron-icon-builder -i public/icon.png -o build/
   ```

2. **清除图标缓存**：
   ```bash
   # Windows
   ie4uinit.exe -show

   # 重启应用
   npm start
   ```

3. **使用图标修复工具**：
   ```bash
   # Windows
   .\fix-icon.ps1
   ```

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
