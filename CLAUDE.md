# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**WeChat_Flowwork** 是一个激发人性的公众号创作AI助手，基于 Electron + React + TypeScript 构建。

## 核心特性

- ✅ **开箱即用** - 内置16个公众号创作技能，无需额外配置，下载即用
- ✅ **固定 MCP** - 项目内置 MCP 服务，无需用户手动配置
- ✅ **AI 操作本地** - 允许 AI 操作本地文件系统和终端
- ✅ **技能扩展** - 通过技能系统轻松扩展能力

### 核心技术栈
- **桌面框架**: Electron 30.0.1
- **前端**: React 18.2.0 + TypeScript 5.2.2 + Tailwind CSS
- **构建工具**: Vite 5.1.6 + vite-plugin-electron
- **AI SDK**: Anthropic AI SDK (@anthropic-ai/sdk) + Model Context Protocol SDK

## 常用命令

### 开发
```bash
npm run dev      # 启动开发服务器（会自动打开 Electron 窗口）
```

### 构建
```bash
npm run build    # 完整构建（TypeScript 编译 + Vite 打包 + electron-builder）
```

### 代码检查
```bash
npm run lint     # 运行 ESLint 检查（仅检查 ts/tsx 文件）
```

### 发布
```bash
# 创建并推送 tag 以触发 GitHub Actions 自动构建
git tag v1.0.0
git push origin v1.0.0
```

## 核心架构

### 目录结构
```
wechat-flowwork/
├── electron/                    # Electron 主进程代码
│   ├── main.ts                 # 主进程入口（窗口管理、IPC 注册、Agent 初始化）
│   ├── preload.ts              # 预加载脚本（IPC 桥接）
│   ├── agent/                  # AI Agent 系统
│   │   ├── AgentRuntime.ts     # 核心运行时（消息处理、流式响应、工具调用）
│   │   ├── skills/             # 技能管理器（动态加载 SKILL.md）
│   │   ├── mcp/                # MCP 客户端服务（外部工具集成）
│   │   ├── tools/              # 内置文件系统工具
│   │   └── security/           # 权限管理器
│   └── config/                 # 配置存储（electron-store）
├── src/                        # React 渲染进程代码
│   ├── App.tsx                 # 根组件（路由、IPC 事件监听）
│   ├── components/             # React 组件
│   │   ├── CoworkView.tsx      # 主界面（Chat/Work 双模式）
│   │   ├── SettingsView.tsx    # 设置面板
│   │   └── FloatingBallPage.tsx # 悬浮球窗口
│   └── main.tsx                # 渲染进程入口
├── resources/skills/           # 内置技能库（只读，打包到 app.asar）
└── public/                     # 静态资源
```

### 架构模式

#### 1. 主进程与渲染进程通信
- **IPC 通道模式**: 使用 `ipcMain.handle` (主进程) 和 `window.ipcRenderer.invoke` (渲染进程)
- **事件广播**: Agent 运行时通过 `win.webContents.send()` 向所有窗口广播状态更新
- **关键 IPC 通道**:
  - `agent:*` - 消息发送、中止、权限确认
  - `session:*` - 会话管理（CRUD）
  - `config:*` - 配置读写
  - `permissions:*` - 权限管理
  - `skills:*` - 技能列表和读取
  - `mcp:*` - MCP 配置管理

#### 2. Agent 运行时 (AgentRuntime.ts)
**核心职责**:
- 管理 Claude AI 对话历史
- 处理流式响应（逐 token 广播到所有窗口）
- 工具调用协调（内置工具、技能工具、MCP 工具）
- 权限确认机制（阻塞等待用户批准）

**消息流程**:
```
用户输入 → 解析（支持图片）→ 添加历史 → 发送到 Claude API →
流式响应 → 工具调用检测 → 权限确认 → 工具执行 → 结果返回 →
更新历史 → 广播所有窗口
```

**关键设计**:
- 多窗口支持：`windows: BrowserWindow[]` 数组，主窗口和悬浮球同时接收更新
- 权限确认：`pendingConfirmations: Map` 存储等待用户响应的 Promise
- 会话管理：通过 `SessionStore` 持久化历史消息

#### 3. 技能系统 (SkillManager.ts)
**内置16个公众号创作技能**（开箱即用）:
- 选题与标题：topic-selector, title-generator
- 内容创作：ai-writer, style-learner, smart-layout
- 情绪激发：emotion-provoker, emotion-card-generator
- 数据分析：data-writer, data-analyzer
- 图片工具：image-cropper, image-generation
- 工作流协调：wechat-workflow, wechat-writing
- 辅助工具：cover-generator, user-guide, skill-creator

**技能加载机制**:
- 扫描 `resources/skills/` 目录（打包后为 `process.resourcesPath/resources/skills`）
- 支持目录结构（目录内 `SKILL.md`）和单文件（`技能名.md`）
- 安全限制：生产环境技能为只读，禁止用户修改
- **所有技能内置，无需用户手动安装或配置**

**技能类型**:
1. **上下文技能**: 提供指令和领域知识，通过 `content` 注入到系统提示
2. **工具技能**: 包含 Python 可执行代码，通过 `subprocess` 调用

#### 4. MCP 客户端 (MCPClientService.ts)
**MCP 协议集成**（项目内置固定配置）:
- 项目内置 MCP 服务配置，无需用户手动设置
- 通过 stdio 连接内置 MCP 服务器
- 工具命名空间: `{server_name}__{tool_name}`
- 开箱即用，启动即可使用所有 MCP 能力

**特殊处理**:
- API Key 自动注入（从应用设置面板同步）
- 支持环境变量覆盖（`config.env` 合并到 `process.env`）

#### 5. 配置和状态管理
**ConfigStore** (electron-store):
- 存储位置: 开发模式为 `.vscode/electron-userdata`，生产模式为系统 userData
- 配置项: API Key、API URL、模型、授权文件夹、网络访问权限、全局快捷键
- 权限记忆: `allowedPermissions: ToolPermission[]`

**SessionStore**:
- 多会话支持：每个会话独立的历史消息
- 自动保存：每次消息处理后持久化

### 前端架构

#### 组件层次
```
App.tsx
├── CoworkView (主界面)
│   ├── ChatView (聊天模式)
│   └── WorkView (工作模式)
├── SettingsView (设置)
├── FloatingBallPage (悬浮球，独立窗口)
└── ConfirmDialog (权限确认弹窗)
```

#### 状态管理模式
- **本地状态**: React `useState` / `useReducer`
- **配置状态**: 通过 `config:get-all` IPC 拉取，修改后通过 `config:set-all` 提交
- **实时更新**: 监听 `agent:stream-token`、`agent:history-update` 等 IPC 事件

#### UI 特性
- **自定义标题栏**: `frame: false` + 自定义窗口控制按钮
- **悬浮球展开动画**: 水平向左展开，固定尺寸 340x320
- **全局快捷键**: 默认 `Alt+Space` 呼唤悬浮球
- **图片支持**: 粘贴或上传图片，转换为 base64 发送到 AI

## 开发注意事项

### 环境变量
- 开发模式通过 `.env` 文件配置（不提交到 git）
- 生产环境通过设置面板配置（持久化到 electron-store）
- `VITE_API_URL` 和 `VITE_MODEL_NAME` 用于开发默认值

### TypeScript 配置
- 严格模式启用
- **未使用变量检查**: `noUnusedLocals` 和 `noUnusedParameters` 启用
- ES 模块导入（`import/export`），不使用 CommonJS（`require`）
- Vite 构建时排除某些 Node.js 模块（`rollupOptions.external`）

### 构建配置
- **代码混淆**: 生产环境使用 javascript-obfuscator 混淆主进程和预加载脚本
  - 字符串数组化 (stringArrayThreshold: 0.5)
  - 对象键转换 (transformObjectKeys: true)
  - 保留 console 输出便于调试
- **外部依赖**: Vite 构建时排除以下模块(不打包):
  - sqlite3, sequelize, better-sqlite3, @modelcontextprotocol/sdk
  - 添加此类依赖时需更新 `rollupOptions.external`
- **图标生成**: 构建前自动运行 `npm run generate-icons` 生成应用图标

### 开发模式特殊处理
- **userData 路径**: 开发模式使用 `.vscode/electron-userdata` 避免权限问题
- **协议注册**: 跳过 `wechatflowwork://` 协议注册（仅生产模式）
- **窗口显示**: 开发模式自动显示主窗口，生产模式隐藏到托盘

### 安全考虑
- **权限确认**: 所有文件写入和命令执行需用户确认
- **路径授权**: 仅允许访问 `authorizedFolders` 列表中的目录
- **技能锁定**: 生产环境禁止修改内置技能（防止破坏核心功能）
- **命令执行超时**: 防止长时间运行的命令

### 调试技巧
- 主进程日志：终端输出
- 渲染进程日志：DevTools（开发模式自动打开，生产模式通过快捷键）
- Agent 调试：关注 `processUserMessage` 流程中的 console.log

## 发布流程

1. 确保 `package.json` 中的版本号已更新
2. 提交所有代码到 GitHub
3. 创建 tag: `git tag v1.0.0 && git push origin v1.0.0`
4. GitHub Actions 自动构建并发布到 Releases
5. 构建产物位置: `release/{version}/`

**构建产物**:
- Windows: `WeChat_Flowwork-Windows-{version}-Setup.exe`
- macOS: `WeChat_Flowwork-Mac-{version}-Installer.dmg`
- Linux: `WeChat_Flowwork-Linux-{version}.AppImage` / `.deb`

## 常见问题

### Q: 修改代码后没有生效？
A: 开发模式下 Vite 支持热重载，但主进程（electron/main.ts）修改需要重启 `npm run dev`。

### Q: IPC 调用报错 "Error: An object could not be cloned"？
A: 确保传递的数据可序列化（避免函数、循环引用等）。

### Q: 技能修改后不生效？
A: 生产环境技能为只读，修改需要重新构建应用。开发模式技能在 `resources/skills/` 目录。所有技能已内置，开箱即用。

### Q: MCP 工具不显示？
A: MCP 服务为项目内置固定配置，自动加载。如遇问题，检查主进程日志中的连接错误。
