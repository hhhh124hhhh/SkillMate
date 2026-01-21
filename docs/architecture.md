# 架构设计文档

本文档详细说明 AI Agent Desktop 的整体架构设计，帮助你深入理解项目的技术实现。

---

## 一、整体架构

### 1.1 架构概览

AI Agent Desktop 采用 **Electron 多进程架构**，由主进程和渲染进程组成，通过 IPC（进程间通信）进行协作。

```
┌─────────────────────────────────────────────────────────────┐
│                      Electron 应用                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │   主进程          │         │   渲染进程        │         │
│  │  (Main Process)  │◄──────►│ (Render Process) │         │
│  │                  │  IPC    │                  │         │
│  │  • AgentRuntime  │         │  • React UI      │         │
│  │  • SkillManager  │         │  • ChatView      │         │
│  │  • MCPClient     │         │  • SettingsView  │         │
│  │  • WindowManager │         │  • SkillsEditor  │         │
│  └──────────────────┘         └──────────────────┘         │
│         │                              ▲                    │
│         │                              │                    │
│         ▼                              │                    │
│  ┌──────────────────┐                  │                    │
│  │  外部服务         │──────────────────┘                    │
│  │                  │  用户交互                             │
│  │  • Anthropic API │                                       │
│  │  • MCP Servers   │                                       │
│  └──────────────────┘                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 进程职责

#### 主进程 (Main Process)
**位置**: `electron/main.ts`

**核心职责**:
- 窗口管理（创建、销毁、显示、隐藏）
- 系统集成（托盘、快捷键、协议注册）
- Agent 运行时管理
- 文件系统操作
- IPC 通道注册和处理
- 配置持久化

**关键模块**:
```typescript
electron/
├── main.ts                 // 主进程入口
├── preload.ts              // 预加载脚本（IPC 桥接）
├── agent/                  // AI Agent 系统
│   ├── AgentRuntime.ts     // 核心运行时
│   ├── skills/             // 技能管理器
│   ├── mcp/                // MCP 客户端
│   ├── tools/              // 内置工具
│   └── security/           // 权限管理
└── config/                 // 配置存储
```

#### 渲染进程 (Render Process)
**位置**: `src/main.tsx` → `src/App.tsx`

**核心职责**:
- 用户界面渲染
- 用户交互处理
- 实时状态展示
- 配置编辑界面

**关键组件**:
```typescript
src/components/
├── CoworkView.tsx          // 主界面（聊天模式）
├── SettingsView.tsx        // 设置面板
├── SkillsEditor.tsx        // 技能编辑器
├── MCPConfigEditor.tsx     // MCP 配置编辑器
├── QuickActionsEditor.tsx  // 快捷按钮配置
└── UserGuideView.tsx       // 用户引导
```

---

## 二、核心系统设计

### 2.1 Agent 运行时 (AgentRuntime)

**位置**: `electron/agent/AgentRuntime.ts`

**设计目标**:
- 管理与 Anthropic API 的对话
- 协调工具调用（内置工具、技能工具、MCP 工具）
- 流式响应处理
- 权限确认机制

**核心流程**:

```
用户输入
    │
    ▼
解析消息（支持图片）
    │
    ▼
添加到对话历史
    │
    ▼
发送到 Anthropic API
    │
    ▼
流式响应处理
    │
    ├─► 文本内容 → 广播到所有窗口
    │
    └─► 工具调用 → 权限确认 → 执行工具 → 返回结果
              │
              ▼
         用户批准？
              │
              ├─ 是 → 执行工具
              └─ 否 → 中止请求
```

**关键方法**:

| 方法 | 功能 |
|------|------|
| `processUserMessage()` | 处理用户消息，发送到 API |
| `executeTool()` | 执行工具调用（权限确认） |
| `broadcastUpdate()` | 广播状态更新到所有窗口 |
| `handleRequestPermission()` | 处理权限确认请求 |

**状态管理**:
```typescript
interface AgentState {
  messages: Message[];              // 对话历史
  isProcessing: boolean;            // 是否正在处理
  currentTool: string | null;       // 当前执行的工具
  pendingConfirmations: Map<...>;   // 等待确认的权限请求
}
```

### 2.2 技能系统 (SkillManager)

**位置**: `electron/agent/skills/SkillManager.ts`

**设计目标**:
- 动态加载技能（用户技能 > 内置技能）
- 支持上下文技能和工具技能
- 技能触发词匹配
- 技能优先级管理

**技能加载优先级**:

```
1. 用户技能 (~/.aiagent/skills/)
    └─ 高优先级，可覆盖内置技能

2. 内置技能 (resources/skills/)
    └─ 低优先级，提供示例和基础功能
```

**技能类型**:

#### 1. 上下文技能 (Context Skill)
- **作用**: 提供 AI 领域知识和指令
- **格式**: 纯文本 + YAML frontmatter
- **加载**: 将 `content` 注入到系统提示
- **示例**: `ai-writer`, `style-learner`

**SKILL.md 格式**:
```yaml
---
name: ai-writer
description: AI 写作助手
---

你是专业的写作助手，擅长...
```

#### 2. 工具技能 (Tool Skill)
- **作用**: 提供可执行的 Python 脚本
- **格式**: YAML frontmatter + Python 代码
- **加载**: 注册为可调用工具
- **示例**: `data-analyzer`, `image-cropper`

**SKILL.md 格式**:
```yaml
---
name: data-analyzer
description: 数据分析工具
input_schema:
  type: object
  properties:
    file:
      type: string
---

## Python 脚本

```python
import sys
import pandas as pd

def main():
    # 读取数据并分析
    ...
```
```

**关键方法**:

| 方法 | 功能 |
|------|------|
| `loadSkills()` | 从多个目录加载技能 |
| `getTriggeredSkill()` | 根据触发词匹配技能 |
| `executeSkillTool()` | 执行工具技能的 Python 脚本 |
| `loadSkillsFromDirectory()` | 从指定目录加载技能 |

### 2.3 MCP 客户端 (MCPClientService)

**位置**: `electron/agent/mcp/MCPClientService.ts`

**设计目标**:
- 管理多个 MCP 服务器连接
- 工具命名空间隔离
- 环境变量注入
- 连接状态管理

**MCP 协议集成**:

```
MCP Server (stdio)          MCP Server (HTTP)
       │                           │
       ▼                           ▼
┌──────────────────────────────────────┐
│         MCP Client Service           │
│                                      │
│  • stdio 客户端管理                  │
│  • HTTP 客户端管理                   │
│  • 工具注册 (server__tool 命名)      │
│  • 环境变量注入                      │
└──────────────────────────────────────┘
       │
       ▼
Agent Runtime (工具调用)
```

**MCP 服务器配置**:

**stdio 类型**:
```json
{
  "mcpServers": {
    "filesystem": {
      "name": "filesystem",
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"],
      "env": { "API_KEY": "xxx" }
    }
  }
}
```

**streamableHttp 类型**:
```json
{
  "mcpServers": {
    "custom-api": {
      "name": "custom-api",
      "type": "streamableHttp",
      "baseUrl": "https://api.example.com",
      "headers": { "Authorization": "Bearer token" }
    }
  }
}
```

**工具命名空间**:
- 所有 MCP 工具添加 `server__` 前缀
- 例如: `filesystem__read_file`, `fetch__fetch`

**关键方法**:

| 方法 | 功能 |
|------|------|
| `loadClients()` | 加载所有 MCP 客户端 |
| `getAllTools()` | 获取所有已注册的工具 |
| `callTool()` | 调用 MCP 工具 |
| `getServerStatus()` | 获取服务器连接状态 |

### 2.4 权限管理 (PermissionManager)

**位置**: `electron/agent/security/PermissionManager.ts`

**设计目标**:
- 细粒度的权限控制
- 用户确认机制
- 权限记忆功能
- 安全审计

**权限类型**:

```typescript
enum PermissionType {
  READ_FILE = 'read_file',
  WRITE_FILE = 'write_file',
  EXEC_COMMAND = 'exec_command',
  NETWORK_REQUEST = 'network_request'
}
```

**权限确认流程**:

```
AI 请求操作文件
    │
    ▼
PermissionManager.checkPermission()
    │
    ├─ 已授权 ──► 允许操作
    │
    └─ 未授权 ──► 弹出确认对话框
                      │
                      ▼
                 用户选择
                      │
        ├─ 允许 ──► 记住权限 ──► 执行操作
        │
        └─ 拒绝 ──► 中止请求
```

**权限存储**:
```typescript
interface ToolPermission {
  toolName: string;          // 工具名称
  allowedPaths: string[];    // 允许的路径
  granted: boolean;          // 是否已授权
  timestamp: number;         // 授权时间
}
```

**关键方法**:

| 方法 | 功能 |
|------|------|
| `checkPermission()` | 检查权限（已授权则返回 true） |
| `requestPermission()` | 请求用户确认权限 |
| `grantPermission()` | 授予权限并记忆 |
| `revokePermission()` | 撤销权限 |

---

## 三、数据流设计

### 3.1 消息处理流程

```
用户输入 (渲染进程)
    │
    │ ipcRenderer.invoke('agent:send-message', message)
    ▼
主进程 (AgentRuntime)
    │
    ├─► 解析消息（支持图片转 base64）
    │
    ├─► 添加到对话历史
    │
    ├─► 发送到 Anthropic API
    │
    └─► 流式响应处理
          │
          ├─► onText: 广播 'agent:stream-token'
          │
          └─► onToolUse:
                │
                ├─► 检查权限
                │
                ├─► 广播 'agent:tool-request'
                │
                ├─► 等待用户确认 (ipcMain.handle('agent:confirm-permission'))
                │
                ├─► 执行工具（内置/技能/MCP）
                │
                ├─► 返回工具结果
                │
                └─► 继续对话
```

### 3.2 配置管理流程

```
用户修改配置 (渲染进程)
    │
    │ ipcRenderer.invoke('config:set-all', config)
    ▼
主进程 (ConfigStore)
    │
    ├─► 验证配置格式
    │
    ├─► 持久化到磁盘 (electron-store)
    │
    ├─► 触发配置变更事件
    │
    └─► 更新运行时状态
          │
          ├─► AgentRuntime 重新加载 API Key
          │
          └─► MCPClientService 重新连接服务器
```

### 3.3 技能加载流程

```
应用启动
    │
    ▼
SkillManager.loadSkills()
    │
    ├─► 扫描 ~/.aiagent/skills/ (用户技能)
    │       │
    │       └─► 解析 SKILL.md
    │               │
    │               ├─ 提取 YAML frontmatter
    │               ├─ 读取 content / toolScript
    │               └─ 注册到技能列表
    │
    ├─► 扫描 resources/skills/ (内置技能)
    │       │
    │       └─► 同上（如果名称冲突，用户技能覆盖）
    │
    └─► 触发 'skills:loaded' 事件
```

---

## 四、技术选型

### 4.1 核心技术栈

| 技术 | 版本 | 用途 | 选型理由 |
|------|------|------|----------|
| **Electron** | 30.0.1 | 桌面应用框架 | 跨平台、生态成熟 |
| **React** | 18.2.0 | 前端框架 | 组件化、生态丰富 |
| **TypeScript** | 5.2.2 | 类型系统 | 类型安全、开发体验好 |
| **Tailwind CSS** | 3.x | CSS 框架 | 快速开发、一致性 |
| **Vite** | 5.1.6 | 构建工具 | 快速热更新、ESM 支持 |
| **Anthropic SDK** | @anthropic-ai/sdk | AI 对话 | 官方 SDK、流式支持 |
| **MCP SDK** | @modelcontextprotocol/sdk | 工具集成 | 标准协议、扩展性强 |

### 4.2 为什么选择这些技术？

#### Electron vs Tauri
- ✅ **Electron**: 成熟稳定、文档完善、社区活跃
- ❌ **Tauri**: 生态尚在早期、MCP SDK 暂不支持 Rust

#### React vs Svelte/Vue
- ✅ **React**: 团队熟悉、生态最大、类型推导完善
- ❌ **Vue**: 需要额外学习成本
- ❌ **Svelte**: 生态较小、大型项目经验少

#### TypeScript vs JavaScript
- ✅ **TypeScript**: 类型安全、IDE 支持、重构友好
- ❌ **JavaScript**: 大型项目难以维护

#### Vite vs Webpack
- ✅ **Vite**: 开发速度快、配置简单、ESM 原生支持
- ❌ **Webpack**: 配置复杂、热更新慢

---

## 五、架构优势

### 5.1 可扩展性

**技能系统**:
- ✅ 用户技能可覆盖内置技能
- ✅ 支持上下文技能和工具技能
- ✅ Python 脚本集成能力

**MCP 协议**:
- ✅ 标准化的工具集成协议
- ✅ 支持无限扩展外部服务
- ✅ 工具命名空间隔离

### 5.2 安全性

**权限管理**:
- ✅ 细粒度的路径授权
- ✅ 用户确认机制
- ✅ 权限记忆功能
- ✅ 审计日志

**数据隔离**:
- ✅ 主进程隔离敏感操作
- ✅ 用户数据不可访问系统文件
- ✅ 配置加密存储（可选）

### 5.3 可维护性

**代码组织**:
- ✅ 清晰的模块划分
- ✅ 单一职责原则
- ✅ TypeScript 类型安全

**开发体验**:
- ✅ 热更新支持
- ✅ 详细日志输出
- ✅ 错误提示友好

### 5.4 教学价值

**清晰的架构**:
- ✅ 主进程/渲染进程职责明确
- ✅ IPC 通信模式标准
- ✅ 状态管理简单直观

**丰富的示例**:
- ✅ 16 个内置技能示例
- ✅ MCP 集成示例
- ✅ 工具调用示例

---

## 六、性能优化

### 6.1 已实现的优化

**流式响应**:
- 逐 token 展示 AI 思考过程
- 减少用户等待感知

**多窗口支持**:
- 主窗口和悬浮球共享状态
- 事件广播机制高效

**技能缓存**:
- 启动时一次性加载
- 运行时无重复解析

**配置持久化**:
- electron-store 异步写入
- 避免阻塞主线程

### 6.2 未来优化方向

**虚拟滚动**:
- 长对话历史按需渲染

**Web Workers**:
- 将技能脚本执行移到 Worker 线程

**增量构建**:
- 技能修改后仅重载变更部分

---

## 七、安全机制

### 7.1 权限控制

**路径授权**:
- 仅允许访问授权目录
- 支持路径白名单

**操作确认**:
- 文件写入需用户确认
- 命令执行需用户确认
- 网络请求需用户确认

**权限记忆**:
- 可选择永久授权
- 权限记录可撤销

### 7.2 数据安全

**本地存储**:
- 对话历史存储在本地
- API Key 加密存储（可选）

**网络通信**:
- HTTPS 加密传输
- 支持 API 代理

### 7.3 代码安全

**技能沙箱**:
- Python 脚本在子进程执行
- 超时自动终止

**输入验证**:
- 文件路径检查
- 命令参数验证

---

## 八、总结

AI Agent Desktop 的架构设计遵循以下原则：

1. **简单性** - 清晰的模块划分，易于理解
2. **可扩展性** - 技能系统和 MCP 协议支持无限扩展
3. **安全性** - 权限管理和确认机制
4. **教学价值** - 代码注释详细，适合学习

这个架构不仅是一个可用的 AI Agent 框架，更是一个优秀的教学示例，展示了如何构建现代化的 AI 应用。

---

<p align="center">
  <b>掌握架构，开始构建</b> 🚀
</p>
