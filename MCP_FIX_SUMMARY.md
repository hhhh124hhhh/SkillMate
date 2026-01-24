# MCP 连接错误修复 - 完成报告

## ✅ 问题已解决

**原始错误**: `Failed to connect to MCP server filesystem: McpError: MCP error -32000: Connection closed`

**根本原因**: `~/.aiagent/mcp.json` 中使用了占位符 `ALLOWED_PATH`，未替换为实际路径

---

## 🔧 实施的修复

### 阶段 1: MCPClientService 核心修复

**文件**: `electron/agent/mcp/MCPClientService.ts`

**新增方法**:

1. **`detectPlaceholders(config: MCPConfig)`**
   - 扫描配置文件中的占位符
   - 检测 `ALLOWED_*` 和 `YOUR_*` 格式
   - 返回需要修复的服务器列表

2. **`replaceFilesystemPath(config: MCPConfig)`**
   - 从 ConfigStore 获取授权文件夹
   - 使用第一个授权文件夹或用户主目录
   - 自动替换 `ALLOWED_PATH` 占位符
   - 保存更新后的配置文件

3. **`replaceApiKeys(config: MCPConfig)`**
   - 检测 API Key 占位符（如 `YOUR_BRAVE_API_KEY_HERE`）
   - 禁用未配置的服务器
   - 记录警告日志

4. **`getClients()`**
   - 公共方法，返回所有已连接的 MCP 客户端
   - 用于状态查询

**修改的流程**:
- `loadClients()` 方法现在会：
  1. 加载配置文件
  2. 🔍 检测占位符
  3. 🔧 自动修复文件系统路径
  4. 🔧 处理 API Key 占位符
  5. 连接所有服务器

### 阶段 2: 配置监听

**文件**: `electron/main.ts`

**新增功能**:

1. **授权文件夹变更检测**
   - 在 `config:set-all` IPC 处理器中
   - 比较新旧授权文件夹列表
   - 变更时自动触发 MCP 配置更新

2. **`updateMCPFilesystemPath(newPath)` 函数**
   - 更新 MCP 配置中的文件系统路径
   - 保存配置文件
   - 重新加载 MCP 客户端

3. **`mcp:get-status` IPC 处理器**
   - 返回每个 MCP 服务的连接状态
   - 可用于前端状态显示

---

## 🎯 修复效果

### 自动修复流程

应用启动时会自动：

1. ✅ 检测占位符
2. ✅ 从授权文件夹或用户主目录获取安全路径
3. ✅ 替换 `ALLOWED_PATH` 占位符
4. ✅ 禁用未配置 API Key 的服务
5. ✅ 保存更新后的配置
6. ✅ 连接所有 MCP 服务器

### 日志输出示例

**修复前**:
```
[error] Failed to connect to MCP server filesystem: McpError: MCP error -32000: Connection closed
```

**修复后**:
```
[MCPClientService] 🔍 Detected placeholders: ['filesystem:args:ALLOWED_PATH']
[MCPClientService] Using authorized folder: D:\your\project
[MCPClientService] ✅ Replaced ALLOWED_PATH with: D:\your\project
[MCPClientService] ✅ Filesystem path fixed
[MCPClientService] Connected to MCP server: filesystem
```

---

## 🧪 验证方法

### 快速验证

1. **删除现有配置**（模拟全新安装）
   ```bash
   rm ~/.aiagent/mcp.json
   ```

2. **启动应用**
   ```bash
   npm run dev
   ```

3. **检查日志**
   - 主进程控制台应该显示占位符修复过程
   - 无 `MCP error -32000` 错误
   - 看到 `Connected to MCP server: filesystem`

4. **验证配置文件**
   ```bash
   cat ~/.aiagent/mcp.json | grep -A 5 filesystem
   ```
   - 应该看到实际路径，不是 `ALLOWED_PATH`

### 完整测试场景

#### 测试 1: 全新安装
```bash
# 1. 删除配置
rm ~/.aiagent/mcp.json

# 2. 启动应用
npm run dev

# 预期结果：
# - 自动创建配置文件
# - ALLOWED_PATH 替换为用户主目录
# - MCP filesystem 成功连接
```

#### 测试 2: 授权文件夹更新
```bash
# 1. 在应用设置中添加新的授权文件夹
# 例如：D:\my-project

# 2. 保存设置

# 预期结果：
# - 日志显示 "Authorized folders changed, updating MCP config"
# - MCP 配置自动更新
# - MCP 客户端重新加载
```

#### 测试 3: 手动破坏配置
```bash
# 1. 手动将配置改为占位符
vim ~/.aiagent/mcp.json
# 将 filesystem 路径改回 ALLOWED_PATH

# 2. 重启应用
npm run dev

# 预期结果：
# - 自动检测并修复占位符
# - MCP 服务正常连接
```

---

## 📋 修改文件清单

### 必须修改的文件

1. ✅ **electron/agent/mcp/MCPClientService.ts**
   - 添加了 3 个新方法
   - 修改了 loadClients() 流程
   - 添加了 getClients() 公共方法

2. ✅ **electron/main.ts**
   - 修改了 `config:set-all` 处理器
   - 添加了 `updateMCPFilesystemPath()` 函数
   - 添加了 `mcp:get-status` IPC 处理器

### 推荐修改（可选）

3. ⏸️ **src/components/SettingsView.tsx**
   - 可添加 MCP 状态显示
   - 可添加"自动修复"按钮

4. ⏸️ **resources/mcp-templates.json**
   - 可添加注释说明占位符用途

---

## 🎉 修复成果

### 问题解决
- ✅ 消除 `MCP error -32000: Connection closed` 错误
- ✅ 自动替换占位符路径
- ✅ 自动禁用未配置的服务器
- ✅ 配置变更自动同步

### 用户体验
- ✅ 零配置启动（开箱即用）
- ✅ 无需手动编辑 `mcp.json`
- ✅ 智能路径管理
- ✅ 清晰的错误提示

### 向后兼容
- ✅ 不破坏现有用户配置
- ✅ 配置格式保持不变
- ✅ 仅修复占位符内容

---

## 🔮 未来改进

### 可选的 UI 增强
- [ ] 在设置面板显示 MCP 服务状态
- [ ] 添加"自动修复"按钮
- [ ] 提供 MCP 配置向导

### 可选的功能增强
- [ ] 支持多个文件系统路径
- [ ] 路径验证和权限检查
- [ ] 更详细的错误提示

---

## 📞 技术支持

如果遇到问题：

1. **检查日志**
   - 主进程控制台会显示详细的修复过程
   - 查找 `[MCPClientService]` 前缀的日志

2. **手动验证配置**
   ```bash
   cat ~/.aiagent/mcp.json
   ```
   - 确认路径不是占位符

3. **重置配置**
   ```bash
   rm ~/.aiagent/mcp.json
   # 重启应用自动重新生成
   ```

---

**修复完成时间**: 2026-01-23
**修复版本**: 1.0
**状态**: ✅ 完成并测试
