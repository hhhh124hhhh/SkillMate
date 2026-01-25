# SkillMate Python MCP 环境配置指南

## 📋 概述

SkillMate 使用 Python 运行时来支持 MCP（Model Context Protocol）功能，特别是 **网页抓取** 功能。本文档详细说明了三种 Python 环境配置方案及其最佳实践。

---

## 🎯 三种配置方案

### 方案对比

| 方案 | 优点 | 缺点 | 推荐场景 |
|------|------|------|----------|
| **方案 1: 内置嵌入式 Python** | ✅ 开箱即用<br>✅ 无需用户配置<br>✅ 环境隔离 | ⚠️ 首次启动需要下载<br>⚠️ 占用 ~150MB 磁盘空间 | 大部分用户（推荐） |
| **方案 2: 系统 Python** | ✅ 快速启动<br>✅ 节省磁盘空间 | ❌ 需要手动安装<br>❌ 需要配置依赖<br>❌ 可能版本冲突 | 开发者 / 已安装 Python 的用户 |
| **方案 3: 混合方案** | ✅ 灵活性最高<br>✅ 故障容错性好 | ⚠️ 配置稍复杂 | 需要定制化的高级用户 |

---

## 📦 方案 1: 内置嵌入式 Python（默认推荐）

### 工作原理

SkillMate 会自动下载并配置 **Python 3.11.8 嵌入式版本**，包含所有必需的依赖包：

```
python-runtime/
├── python.exe              # Python 解释器
├── python311._pth         # 路径配置文件
├── lib/                   # 依赖包目录
│   ├── openai/
│   ├── requests/
│   ├── Pillow/
│   ├── PyYAML/
│   ├── mcp_server_fetch/
│   └── regex/            # 已降级到 <=2022.1.18 修复兼容性
└── DLLs/                  # Python 动态链接库
```

### 自动安装流程

首次启动应用时，`npm run setup-python` 脚本会自动执行：

1. **下载 Python**: 从 python.org 下载 Python 3.11.8 嵌入式版本
2. **解压文件**: 使用 PowerShell Expand-Archive 解压到 `python-runtime/`
3. **修复配置**: 修改 `python311._pth` 启用 `import site`
4. **安装依赖**: 通过 `get-pip.py` 安装所有依赖包到 `python-runtime/lib/`
5. **验证安装**: 测试所有关键包的导入

### 用户操作步骤

**完全自动化，无需任何操作！**

- ✅ 应用启动时自动检测 Python 环境
- ✅ 缺少依赖时自动安装
- ✅ 失败时提供清晰的错误提示和解决方案

### 故障排查

#### 问题 1: 下载失败

**症状**:
```
[Download] ✗ Attempt 3 failed: connect ETIMEDOUT
```

**解决方案**:
1. 检查网络连接
2. 尝试重新运行 `npm run setup-python`
3. 手动下载并放置到 `python-runtime/` 目录

#### 问题 2: 依赖包安装失败

**症状**:
```
[Setup] ⚠ regex failed: ImportError: cannot import name '_regex'
```

**解决方案**:
```bash
# 已通过降级 regex 包解决（regex<=2022.1.18）
# 如仍有问题，手动重新运行：
npm run setup-python
```

#### 问题 3: MCP 连接失败

**症状**:
```
[MCP] ❌ Failed to connect to fetch: Error: spawn python ENOENT
```

**解决方案**:
1. 检查 `python-runtime/python.exe` 是否存在
2. 验证 `python-runtime/lib/` 目录是否包含所有依赖
3. 查看"设置 > MCP > 网页抓取"的详细错误信息

---

## 🐍 方案 2: 系统 Python（高级用户）

### 工作原理

直接使用用户系统已安装的 Python，通过 `pip` 安装 MCP 依赖包。

### 前置条件

1. **Python 版本**: Python 3.8+ (推荐 3.11.x)
2. **pip 版本**: pip 21.0+
3. **网络连接**: 用于安装 Python 包

### 安装步骤

#### Step 1: 检查 Python 版本

```bash
# Windows
python --version
# 或
python3 --version

# macOS/Linux
python3 --version
```

**预期输出**: `Python 3.8.0` 或更高版本

#### Step 2: 安装 MCP 依赖包

```bash
# 使用 pip 安装
pip install mcp-server-fetch

# 或使用 pip3
pip3 install mcp-server-fetch

# 验证安装
python -m mcp_server_fetch --help
```

**预期输出**: 显示 `mcp-server-fetch` 的帮助信息

#### Step 3: 修改 MCP 配置

打开 **"设置 > MCP > 高级编辑"**，找到 `fetch` 配置，修改 `command` 字段：

```json
{
  "mcpServers": {
    "fetch": {
      "description": "网页抓取 - 允许AI获取网页内容",
      "command": "python3",
      "args": ["-m", "mcp_server_fetch"],
      "env": {},
      "disabled": false
    }
  }
}
```

**关键修改**:
- `"command": "python"` → `"command": "python3"`
- 或者使用完整路径：`"command": "C:\\Python311\\python.exe"`

#### Step 4: 验证连接

返回 **"设置 > MCP > 简化模式"**，检查"网页抓取"状态：

- ✅ **已连接**: 绿色对勾，表示成功
- ❌ **未连接**: 红色警告，点击查看错误详情

### 常见问题

#### Q1: 提示 "No module named 'mcp_server_fetch'"

**解决方案**:
```bash
# 确保使用了正确的 Python
python -m pip install mcp-server-fetch

# 或指定 Python 版本
python3.11 -m pip install mcp-server-fetch
```

#### Q2: Python 命令找不到

**解决方案**:
```json
{
  "command": "C:\\Users\\YourName\\AppData\\Local\\Programs\\Python\\Python311\\python.exe"
}
```

使用绝对路径指向 Python 可执行文件。

#### Q3: 依赖包版本冲突

**解决方案**:
```bash
# 创建虚拟环境（推荐）
python -m venv venv

# Windows 激活
venv\Scripts\activate

# macOS/Linux 激活
source venv/bin/activate

# 安装依赖
pip install mcp-server-fetch
```

然后修改 MCP 配置中的 `command` 指向虚拟环境中的 Python：

```json
{
  "command": "venv\\Scripts\\python.exe"
}
```

---

## 🔄 方案 3: 混合方案（最佳实践组合）

### 设计思路

**默认使用嵌入式 Python，遇到问题时自动回退到系统 Python**。

### 实现方式

#### 3.1 模板配置提示

`mcp-templates.json` 中的 `_note` 和 `_alternative` 字段：

```json
{
  "fetch": {
    "description": "网页抓取 - 允许AI获取网页内容（需要Python环境）",
    "command": "python",
    "args": ["-m", "mcp_server_fetch"],
    "_note": "Python 依赖已包含在 python-runtime/lib/ 中（已降级 regex 包修复兼容性）",
    "_alternative": "如遇问题，可使用系统 Python: pip install mcp-server-fetch && 修改 command 为 'python3'"
  }
}
```

UI 会显示这些提示信息，引导用户在遇到问题时使用备选方案。

#### 3.2 错误检测和提示

`MCPClientService` 在连接失败时提供智能诊断：

```typescript
// 伪代码示例
if (error.code === 'ENOENT') {
  // Python 可执行文件未找到
  if (config.command === 'python') {
    showMessage(`
      嵌入式 Python 未找到。

      解决方案：
      1. 重新运行 npm run setup-python
      2. 或使用系统 Python（见下方按钮）
    `);
  }
} else if (error.message.includes('ModuleNotFoundError')) {
  // Python 模块未找到
  showMessage(`
      MCP 依赖包未安装。

      请运行：pip install mcp-server-fetch

      或在"高级编辑"中切换到系统 Python。
  `);
}
```

#### 3.3 用户交互流程

```
启动应用
  │
  ├─→ 尝试使用嵌入式 Python
  │   │
  │   ├─→ 成功 ✅ → 继续使用
  │   │
  │   └─→ 失败 ❌ → 显示错误对话框
  │       │
  │       ├─→ [选项 A] 重新安装嵌入式 Python
  │       │   → 运行 npm run setup-python
  │       │
  │       ├─→ [选项 B] 切换到系统 Python
  │       │   → 打开系统 Python 配置向导
  │       │
  │       └─→ [选项 C] 禁用此 MCP
  │           → 继续使用其他功能
```

### 配置向导（未来功能）

**计划中的功能**：在"设置 > MCP"中添加"Python 环境检测"面板：

```typescript
// 检测逻辑
const pythonEnvironments = [
  {
    name: '嵌入式 Python (推荐)',
    path: 'python-runtime/python.exe',
    status: 'valid' | 'missing' | 'corrupted',
    version: '3.11.8'
  },
  {
    name: '系统 Python',
    path: 'python3',
    status: 'valid' | 'missing' | 'version_mismatch',
    version: '3.11.0'
  }
];
```

用户可以直观地看到所有可用的 Python 环境，并轻松切换。

---

## 🛠️ 故障排查综合指南

### 问题诊断流程图

```
MCP 连接失败
  │
  ├─→ 1. 检查错误类型
  │   │
  │   ├─→ "spawn python ENOENT"
  │   │   → Python 可执行文件未找到
  │   │   → 解决方案：检查 command 字段路径
  │   │
  │   ├─→ "ModuleNotFoundError: No module named 'mcp_server_fetch'"
  │   │   → MCP 依赖包未安装
  │   │   → 解决方案：运行 pip install mcp-server-fetch
  │   │
  │   └─→ "ImportError: cannot import name '_regex'"
  │       → regex 包版本不兼容
  │       → 解决方案：降级 regex 或使用系统 Python
  │
  ├─→ 2. 检查 Python 环境
  │   │
  │   ├─→ 嵌入式 Python
  │   │   → 验证：ls python-runtime/python.exe
  │   │   → 修复：npm run setup-python
  │   │
  │   └─→ 系统 Python
  │       → 验证：python --version
  │       → 修复：pip install mcp-server-fetch
  │
  └─→ 3. 检查 MCP 配置
      │
      ├─→ 打开"设置 > MCP > 高级编辑"
      ├─→ 验证 command 和 args 字段
      └─→ 尝试重新连接
```

### 日志位置

- **主进程日志**: 开发模式终端输出
- **渲染进程日志**: 浏览器 DevTools (F12 > Console)
- **MCP 连接日志**: "设置 > MCP" 页面的状态区域

### 常见错误码

| 错误码 | 含义 | 解决方案 |
|--------|------|----------|
| `ENOENT` | Python 可执行文件未找到 | 检查 `command` 路径 |
| `EACCES` | 权限被拒绝 | 检查文件权限 |
| `MODULE_NOT_FOUND` | Python 模块未找到 | 安装依赖包 |
| `IMPORT_ERROR` | 模块导入失败 | 检查包版本兼容性 |

---

## 📊 依赖包清单

### 内置 Python 依赖（已预装）

```
openai==1.12.0
requests==2.31.0
Pillow==10.2.0
PyYAML==6.0.1
mcp-server-fetch>=0.2.0
regex<=2022.1.18  # 降级修复兼容性
```

### 系统 Python 需要安装

```bash
pip install mcp-server-fetch
```

`mcp-server-fetch` 会自动安装其依赖：
```
openai>=1.0.0
requests>=2.31.0
mcp>=0.9.0
```

---

## 🔗 相关文档

- [MCP_QUICK_START.md](./MCP_QUICK_START.md) - MCP 快速入门
- [MCP_CUSTOM_SERVERS_IMPLEMENTATION.md](./MCP_CUSTOM_SERVERS_IMPLEMENTATION.md) - MCP 服务器实现
- [BAIDU_MCP_FIX_TEST_GUIDE.md](./BAIDU_MCP_FIX_TEST_GUIDE.md) - 百度千帆 MCP 配置
- [scripts/setup-python.js](../scripts/setup-python.js) - Python 环境安装脚本

---

## ❓ 常见问题 (FAQ)

### Q1: 为什么需要 Python 环境？

**A**: SkillMate 的"网页抓取"MCP 功能使用 `mcp-server-fetch` Python 包，允许 AI 获取实时网页内容。其他 MCP 功能（如文件访问、网络搜索）不需要 Python。

### Q2: 可以完全不用 Python 吗？

**A**: 可以！禁用"网页抓取"MCP 即可：
- 打开"设置 > MCP > 简化模式"
- 关闭"网页抓取"开关
- 其他 MCP 功能（文件访问、网络搜索）仍可正常使用

### Q3: 嵌入式 Python 和系统 Python 有什么区别？

**A**:
- **嵌入式 Python**: SkillMate 自带，版本固定为 3.11.8，环境隔离
- **系统 Python**: 用户安装，版本不固定，可能与系统其他应用冲突

### Q4: 如何切换 Python 环境？

**A**: 打开"设置 > MCP > 高级编辑"，修改 `fetch` 配置的 `command` 字段：
- 嵌入式: `"command": "python-runtime/python.exe"`
- 系统: `"command": "python3"` 或 `"command": "C:\\Python311\\python.exe"`

### Q5: 安装失败怎么办？

**A**:
1. 查看"故障排查综合指南"中的错误诊断流程
2. 检查主进程和渲染进程日志
3. 尝试使用系统 Python 作为备选方案
4. 联系技术支持并提供错误日志

---

## 📝 更新日志

### 2026-01-25
- ✅ 降级 `regex` 包到 `<=2022.1.18` 修复嵌入式 Python 兼容性
- ✅ 添加 `_note` 和 `_alternative` 字段到模板配置
- ✅ 创建本配置指南文档

---

**最后更新**: 2026-01-25
**维护者**: SkillMate 开发团队
**版本**: 1.0.0
