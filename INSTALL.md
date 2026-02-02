# 🚀 SkillMate 自动安装指南

**本文档专为 AI Agent 设计，用于自动化安装 SkillMate 项目**

当用户请求安装本 GitHub 项目时，AI Agent 应执行以下步骤。

---

## 📋 安装步骤（Agent 执行清单）

### 第 1 步：克隆项目

```bash
git clone https://github.com/hhhh124hhhh/SkillMate.git
cd SkillMate
```

**检查点**: 确认目录创建成功，`ls` 命令能看到项目文件。

---

### 第 2 步：检查环境

```bash
# 检查 Node.js 版本
node --version

# 检查 npm 版本
npm --version
```

**要求**:
- Node.js >= 18.0.0（推荐 20.x）
- npm >= 9.0.0

**如果 Node.js 未安装**:
- Windows: 通知用户下载 https://nodejs.org/
- macOS: `brew install node`
- Linux: 参考 Node.js 官方文档

---

### 第 3 步：安装依赖

#### 方案 A：一键安装（推荐）

**Windows 用户**:
```bash
install.bat
```

**macOS/Linux 用户**:
```bash
npm run setup
```

#### 方案 B：手动安装（如果方案 A 失败）

```bash
# 1. 安装 Node.js 依赖
npm install

# 如果失败，尝试国内镜像
npm install --registry=https://registry.npmmirror.com

# 2. 安装 Python MCP 服务器（可选）
pip install mcp-server-fetch
```

**错误处理**:
- 如果 `electron-forge` 命令未找到 → 运行 `npm install`
- 如果 Electron 下载失败 (ECONNREFUSED) → 设置 ELECTRON_MIRROR 环境变量
- 如果文件锁定 (EBUSY) → 使用 PowerShell 强制删除 node_modules
- 如果网络超时 → 使用国内镜像或清理缓存
- 如果权限错误 → 检查文件权限

---

### 第 4 步：验证安装

```bash
# 检查 node_modules 是否存在
ls node_modules | head -5

# 检查 Python MCP（可选）
python -m mcp_server_fetch --help
```

---

### 第 5 步：启动应用验证

```bash
npm start
```

**成功标志**:
- ✅ Vite 开发服务器启动
- ✅ Electron 窗口打开
- ✅ 看到 "SkillMate" 界面

**如果失败**:
- 检查端口 5173 是否被占用
- 查看错误日志
- 尝试 `npm start` 重新启动

---

## ⚠️ 常见问题与解决方案

### 问题 1: `electron-forge` 命令未找到

**原因**: 依赖未安装

**解决**:
```bash
npm install
```

---

### 问题 2: npm install 失败

**原因**: 网络问题或依赖冲突

**解决方案**:
```bash
# 方案 1: 清理缓存
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# 方案 2: 使用国内镜像
npm install --registry=https://registry.npmmirror.com

# 方案 3: 切换 Node.js 版本
nvm use 20

# 注意: 如果使用 Node.js v22，虽然有 EBADENGINE 警告，但通常可以正常工作
# 如果遇到兼容性问题，建议切换到 v20.x
```

---

### 问题 2.5: Electron 下载失败

**错误**: `RequestError: connect ECONNREFUSED 127.0.0.1:443`

**原因**:
- Electron 尝试通过本地代理下载失败
- 代理服务器未运行或配置错误
- 中国大陆用户网络环境限制

**解决方案**:
```bash
# 方法 1: 设置 Electron 镜像源（推荐，适用于中国大陆）
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
export ELECTRON_CUSTOM_DIR="{{ version }}"
npm install --registry=https://registry.npmmirror.com

# 方法 2: Windows PowerShell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_CUSTOM_DIR="{{ version }}"
npm install --registry=https://registry.npmmirror.com
```

**说明**:
- 中国大陆用户强烈建议使用 Electron 镜像源
- 如果使用代理，请确保代理服务器正常运行
- 清除代理设置：`unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY`

**实战案例 (2026-02-02)**:
- 用户环境: Windows + Node.js v22.21.0 + npm 11.7.0
- 错误: `ECONNREFUSED 127.0.0.1:443`
- 解决: 设置 ELECTRON_MIRROR 后安装成功 (1400 packages in 7m)

---

### 问题 2.8: 文件锁定 (EBUSY)

**错误**: `EBUSY: resource busy or locked`

**原因**:
- node_modules 文件夹被其他进程占用
- 可能是 IDE、杀毒软件或之前的 npm 进程

**解决方案**:
```bash
# Windows PowerShell
Remove-Item -Path 'node_modules' -Recurse -Force -ErrorAction SilentlyContinue

# macOS/Linux
rm -rf node_modules

# 等待 3-5 秒后重新安装
npm install --registry=https://registry.npmmirror.com
```

**预防**:
- 安装前关闭 IDE 或文件浏览器
- 避免在安装过程中访问 node_modules
- 不要在安装过程中中断进程

**实战案例 (2026-02-02)**:
- 错误: `EBUSY: resource busy or locked, rename 'node_modules\fetcher-mcp'`
- 原因: 之前的 npm 进程未完全释放文件
- 解决: PowerShell 强制删除后重新安装

---

### 问题 3: Python MCP 错误

**错误**: `MCP error -32000: Connection closed`

**原因**: mcp-server-fetch 未安装

**解决**:
```bash
pip install mcp-server-fetch
```

**不影响**: 网页抓取功能不可用，但其他功能正常

---

### 问题 4: 端口被占用

**错误**: `Port 5173 is already in use`

**解决**:
```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <进程ID> /F

# macOS/Linux
lsof -ti:5173 | xargs kill -9
```

---

## 🛠️ 故障排除命令参考

| 问题类型 | 检测方法 | 解决命令 |
|---------|---------|---------|
| Electron 下载失败 | `grep "ECONNREFUSED" npm-debug.log` | `export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/` |
| 文件锁定 EBUSY | 检查 node_modules 是否可访问 | `powershell -Command "Remove-Item -Path 'node_modules' -Recurse -Force"` |
| 依赖冲突 | `npm ls` 查看依赖树 | `rm -rf node_modules package-lock.json && npm install` |
| 缓存问题 | 查看错误日志中的缓存错误 | `npm cache clean --force` |
| Node.js 版本 | `node --version` 检查是否 v20.x | `nvm use 20` 或继续使用 v22（可能有警告） |

---

## 🔧 Agent 执行指令

当用户说以下任一句话时，触发自动安装流程：

### 用户输入示例：
- "帮我安装这个项目"
- "安装 SkillMate"
- "clone 并运行这个项目"
- "帮我设置这个项目"
- "从 GitHub 安装这个"
- "我想运行这个项目"

### Agent 应执行的操作：

1. **确认环境**: 检查是否有 git 和 node
2. **克隆项目**: `git clone https://github.com/hhhh124hhhh/SkillMate.git`
3. **进入目录**: `cd SkillMate`
4. **执行安装**: `npm run setup` (Windows 用 `install.bat`)
5. **处理错误**: 如果失败，根据错误信息选择解决方案
6. **启动应用**: `npm start`
7. **通知用户**: "安装完成！应用已启动"

---

## 📊 安装成功标准

Agent 应确认以下所有项：

- [x] 项目已克隆
- [x] Node.js 依赖已安装 (`node_modules/` 存在)
- [x] Python MCP 已安装（可选）
- [x] 应用可以启动 (`npm start` 成功)
- [x] 窗口正常显示
- [x] 无致命错误

---

## 💡 Agent 提示信息

### 安装前：
```
🚀 正在为您安装 SkillMate...

⏱️ 预计需要 3-5 分钟，请耐心等待...

📦 安装内容：
  - Node.js 依赖
  - Python MCP 服务器（可选）
  - 项目配置
```

### 安装成功：
```
✅ 安装完成！

📝 下一步：
  1. 配置 API Key（推荐智谱 AI）
     获取地址: https://open.bigmodel.cn/
  2. 应用已自动启动
  3. 开始使用 SkillMate！

💡 如需帮助，查看 README.md
```

### 安装失败：
```
❌ 安装失败

🔧 错误原因：[具体错误信息]

💡 解决方案：
  [根据错误类型提供解决方案]

📚 更多帮助：
  - README.md
  - docs/getting-started.md
  - https://github.com/hhhh124hhhh/SkillMate/issues
```

---

## 🎯 快速命令参考

| 平台 | 安装命令 | 启动命令 |
|------|---------|---------|
| Windows | `install.bat` | `npm start` |
| macOS/Linux | `npm run setup` | `npm start` |
| 手动安装 | `npm install` | `npm start` |
| 使用镜像 | `npm install --registry=https://registry.npmmirror.com` | `npm start` |

---

## 📝 注意事项

1. **首次运行必须安装依赖**
   - 不要直接运行 `npm start`
   - 必须先执行安装步骤

2. **网络问题**
   - 中国大陆用户建议使用国内镜像
   - 遇到超时可重试
   - Electron 下载失败需要设置 ELECTRON_MIRROR

3. **Python 环境**
   - Python 是可选的（仅网页抓取功能需要）
   - 不影响核心功能使用

4. **开发模式**
   - 安装完成后是开发模式
   - 生产构建需要运行 `npm run build`

5. **文件锁定预防**
   - 安装前关闭 IDE 和文件浏览器
   - 避免在安装过程中访问项目目录
   - 不要中断安装进程

---

**最后更新**: 2026-02-02
**适用版本**: SkillMate v2.0.0+
**实战验证**: Windows + Node.js v22.21.0 测试通过
