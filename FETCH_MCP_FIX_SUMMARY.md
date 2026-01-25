# Fetch MCP 服务器启动失败修复总结

## 🎯 问题描述

### 问题症状
```
[MCP] ❌ Failed to connect to fetch after 3 attempts:
  Error: MCP error -32000: Connection closed
  💡 建议: MCP 服务器进程启动失败或意外退出
```

用户手动运行测试：
```bash
$ python -m mcp_server_fetch
python: No module named mcp_server_fetch
```

### 影响范围
- **Fetch MCP 服务器完全不可用** - AI 无法使用网页抓取功能
- **用户体验受影响** - 看到错误提示但不知道如何修复

---

## 🔍 根本原因分析

### 1. pth 文件路径配置错误（CRITICAL）

**文件**: `python-runtime/python311._pth`

**错误配置**:
```
D:\wechat-flowwork\python-runtime\lib\Lib\site-packages
```

**实际情况**:
```
python-runtime/lib/
├── mcp_server_fetch/        # 直接在 lib/ 下
├── openai/
├── requests/
└── ...
```

**原因**:
- `scripts/setup-python.js` 使用 `pip install --target=lib/` 安装包
- 但 pth 文件配置的是传统的 `lib/Lib/site-packages` 路径
- Python 找不到模块，因为路径不匹配

### 2. MCP 客户端未设置环境变量

**代码**: `electron/agent/mcp/MCPClientService.ts` 行 313-363

**问题**:
- Node.js MCP 服务器有路径解析逻辑（`config._preinstalled && args[0].includes('node_modules')`）
- 但 **Python MCP 服务器没有相应的处理**
- 导致即使使用嵌入式 Python，也找不到 lib 目录中的包

### 3. MCP 配置使用系统 Python

**用户配置**（`C:\Users\Lenovo\.aiagent\mcp.json`）:
```json
{
  "fetch": {
    "command": "python",
    "args": ["-m", "mcp_server_fetch"]
  }
}
```

**问题**:
- `"python"` 会使用系统 PATH 中的 Python（3.13.2）
- 系统 Python 中没有安装 `mcp_server_fetch`
- 应该使用项目内置的嵌入式 Python（3.11.8）

### 4. setup-python.js 脚本 bug

**文件**: `scripts/setup-python.js` 行 210-213

**错误代码**:
```javascript
const sitePackagesPath = path.join(pythonDir, 'lib', 'Lib', 'site-packages');
content += `\n${sitePackagesPath}\n`;
```

**问题**: 配置了错误的 pth 路径，与实际安装方式不一致

---

## ✅ 修复方案

### 方案 1: 修复 pth 文件路径（立即修复）

**文件**: `python-runtime/python311._pth`

**修改**:
```
# 旧配置（错误）
D:\wechat-flowwork\python-runtime\lib\Lib\site-packages

# 新配置（正确）
D:\wechat-flowwork\python-runtime\lib
```

**验证**:
```bash
cd python-runtime
./python.exe -m mcp_server_fetch --help
# ✅ 成功显示帮助信息
```

### 方案 2: 增强 MCP 客户端 Python 支持（长期方案）

**文件**: `electron/agent/mcp/MCPClientService.ts`

**修改位置**: 行 318-320, 343-363

**新增逻辑**:
```typescript
// 1. 将 resolvedCommand 改为 let
let resolvedCommand = config.command;

// 2. 添加 Python MCP 服务器处理（在 Node.js 处理之后）
if (config._preinstalled && config.command === 'python') {
    log.log(`[MCP] Resolving preinstalled Python MCP server path for ${name}`);

    // 获取应用根目录
    const appRoot = process.env.APP_ROOT || process.cwd();
    const pythonRuntimePath = path.join(appRoot, 'python-runtime');
    const pythonLibPath = path.join(pythonRuntimePath, 'lib');
    const pythonExePath = path.join(pythonRuntimePath, 'python.exe');

    // 检查 python-runtime 是否存在
    if (fsSync.existsSync(pythonExePath) && fsSync.existsSync(pythonLibPath)) {
        // 使用嵌入式 Python
        resolvedCommand = pythonExePath;  // 替换 command
        finalEnv['PYTHONPATH'] = pythonLibPath;
        log.log(`[MCP] Using embedded Python: ${pythonExePath}`);
        log.log(`[MCP] PYTHONPATH: ${pythonLibPath}`);
    } else {
        log.warn(`[MCP] python-runtime not found, falling back to system Python`);
    }
}
```

**优点**:
- ✅ 自动解析路径，用户无需手动配置
- ✅ 支持回退到系统 Python（如果 python-runtime 不存在）
- ✅ 为未来的 Python MCP 服务器提供通用解决方案
- ✅ 符合现有代码模式（与 Node.js MCP 服务器处理一致）

### 方案 3: 修复 setup-python.js 脚本（预防性）

**文件**: `scripts/setup-python.js`

**修改位置**: 行 210-213

**修改代码**:
```javascript
// 旧代码（错误）
const sitePackagesPath = path.join(pythonDir, 'lib', 'Lib', 'site-packages');
content += `\n${sitePackagesPath}\n`;

// 新代码（正确）
const libPath = path.join(pythonDir, 'lib');
content += `\n${libPath}\n`;
```

**效果**: 防止未来重新安装时出现同样问题

### 方案 4: 更新模板配置

**文件**: `resources/mcp-templates.json`

**修改**:
```json
{
  "fetch": {
    "description": "网页抓取 - 允许AI获取网页内容（需要Python环境）",
    "command": "python",
    "args": ["-m", "mcp_server_fetch"],
    "env": {},
    "disabled": false,
    "_preinstalled": true,  // ✅ 新增：标记为预装服务器
    "_note": "Python 依赖已包含在 python-runtime/lib/ 中（已降级 regex 包修复兼容性，且 pth 文件已修复）",
    "_alternative": "如遇问题，可使用系统 Python: pip install mcp-server-fetch && 修改 command 为 'python3'"
  }
}
```

---

## 🧪 验证清单

完成修复后，需要验证以下检查项：

### 本地验证
- [x] **pth 文件修复**: `python-runtime/python311._pth` 指向 `lib` 目录
- [x] **嵌入式 Python 测试**: `cd python-runtime && ./python.exe -m mcp_server_fetch --help` 成功

### 应用验证（需要用户测试）
- [ ] **MCP 连接测试**: 启动应用，fetch MCP 显示"已连接"
- [ ] **AI 工具测试**: AI 能够调用 `fetch__fetch` 工具获取网页内容
- [ ] **错误日志检查**: 主进程和渲染进程无 MCP 相关错误

### 测试步骤
1. 启动应用: `npm run dev`
2. 进入"设置 > MCP"
3. 确认"网页抓取"显示为"已连接"（绿色对勾）
4. 在聊天中测试: "帮我获取 https://www.anthropic.com 的内容"
5. 验证 AI 是否能够返回网页内容

---

## 📊 修复统计

### 修改的文件（4 个）
1. ✅ `python-runtime/python311._pth` - 修复 pth 路径（1 行）
2. ✅ `electron/agent/mcp/MCPClientService.ts` - 添加 Python MCP 支持（22 行）
3. ✅ `scripts/setup-python.js` - 修复 pth 配置（3 行）
4. ✅ `resources/mcp-templates.json` - 更新 fetch 配置（1 行）

### 新增的代码
- ✅ Python MCP 路径解析逻辑（~20 行）
- ✅ 环境变量自动设置（PYTHONPATH）
- ✅ 回退机制（python-runtime 不存在时使用系统 Python）

### 修复的问题
- ✅ pth 文件路径错误
- ✅ MCP 客户端缺少 Python 支持
- ✅ setup-python.js 脚本 bug
- ✅ 模板配置不完整

---

## 🎉 预期结果

修复成功后：

```
✅ python-runtime/python311._pth 指向: D:\wechat-flowwork\python-runtime\lib
✅ 嵌入式 Python 可以导入 mcp_server_fetch
✅ MCP 客户端自动使用嵌入式 Python
✅ 自动设置 PYTHONPATH 环境变量
✅ Fetch MCP 服务器成功连接
✅ AI 可以使用网页抓取功能
```

### 日志输出（成功时）
```
[MCP] Resolving preinstalled Python MCP server path for fetch
[MCP] Using embedded Python: D:\wechat-flowwork\python-runtime\python.exe
[MCP] PYTHONPATH: D:\wechat-flowwork\python-runtime\lib
[MCP] ✅ Connected to fetch successfully
```

---

## 📝 相关文档

- [PYTHON_MCP_SETUP_GUIDE.md](./PYTHON_MCP_SETUP_GUIDE.md) - Python MCP 环境配置指南
- [MCP_HARDCODED_SERVERS_FIX.md](./MCP_HARDCODED_SERVERS_FIX.md) - 硬编码服务器修复总结
- [MCP_NETWORKING_FIX_SUMMARY.md](./MCP_NETWORKING_FIX_SUMMARY.md) - MCP 联网功能修复总结

---

## 🔧 故障排查

### 问题 1: MCP 连接仍然失败

**症状**: 修复后仍然显示 "Failed to connect to fetch"

**解决方案**:
1. 确认 pth 文件已正确修改
2. 确认 python-runtime/python.exe 存在
3. 检查主进程日志中的详细错误信息
4. 验证 python-runtime/lib/mcp_server_fetch 目录存在

### 问题 2: AI 调用工具时报错

**症状**: AI 提示 "fetch__fetch 工具还没有配置启用"

**解决方案**:
1. 检查 `~/.aiagent/mcp.json` 中 fetch 的 `disabled` 字段
2. 确认用户配置中 fetch 被标记为 `_preinstalled: true`
3. 重启应用重新加载 MCP 服务

### 问题 3: 权限错误

**症状**: `Error: EACCES: permission denied`

**解决方案**:
1. 检查 python-runtime/python.exe 的执行权限
2. 确保防火墙没有阻止 Python 进程
3. 尝试以管理员权限运行应用

---

**最后更新**: 2026-01-25 20:30
**修复状态**: ✅ 代码修复完成，等待用户测试验证
**优先级**: P0（Fetch MCP 完全不可用）
**预计效果**: Fetch MCP 服务器应该能够正常启动和工作
