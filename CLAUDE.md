# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 🤖 傻瓜包 - 全自动 Claude Code

**本项目已配置为"傻瓜包"模式** - Claude Code 会智能判断你的意图，自动使用合适的技能和规则，无需手动触发命令。

### ✨ 自动化能力

#### 1. 自动意图检测
Claude Code 会根据你的输入自动判断任务类型：

```
"帮我实现登录功能"          → 自动规划 + TDD 实现 + 代码审查
"窗口不显示了"              → 自动调试 + 根因分析 + 修复
"看看这段代码"              → 自动代码审查 + 性能分析 + 安全检查
"设计一个设置页面"          → 自动前端设计 + 桌面适配 + 组件实现
"写个使用文档"              → 自动文档生成 + 格式化 + 示例代码
```

#### 2. 自动工作流
每个任务自动执行完整的开发流程：

```
需求理解 → 自动规划 → TDD 实现 → 代码审查 → 自动测试 → 文档生成 → 提交代码
```

#### 3. 自动最佳实践
无需手动指定，自动应用：

- ✅ **Electron 安全规则** (contextIsolation, CSP, 输入验证)
- ✅ **IPC 类型安全** (TypeScript, 错误处理, 超时保护)
- ✅ **性能优化** (懒加载, 代码分割, 虚拟化)
- ✅ **TDD 流程** (先写测试, 最小实现, 重构)
- ✅ **代码质量** (ESLint, Prettier, 80% 测试覆盖率)

#### 4. 自动 Hooks
系统会在以下时机自动执行操作：

```javascript
// 编辑代码后
- 自动检测 console.log
- 自动提示 TypeScript 检查
- 自动提示运行测试

// 提交代码前
- 自动提醒运行 typecheck
- 自动提醒运行 lint
- 自动提醒运行测试

// 构建后
- 自动检查测试覆盖率
- 自动分析构建结果
- 自动提示修复问题

// 会话结束时
- 自动总结工作成果
- 自动建议下一步操作
```

### 🎯 核心规则文件

自动化配置由以下规则驱动：

1. **`~/.claude/rules/00-auto-detect.md`** - 自动意图检测与技能路由
2. **`~/.claude/rules/01-electron-auto.md`** Electron 自动最佳实践
3. **`~/.claude/rules/02-workflow-auto.md`** 全自动工作流

### 🚀 如何使用

**无需任何配置，直接对话即可**：

```
# 示例 1: 实现功能
你: "帮我添加用户认证功能"
AI: 自动规划 → 制定计划 → TDD 实现 → 审查代码 → 生成文档

# 示例 2: 修复 Bug
你: "登录后窗口崩溃了"
AI: 自动调试 → 收集错误 → 分析根因 → 修复验证 → 防止复发

# 示例 3: 代码审查
你: "帮我检查一下 IPC 通信的安全性"
AI: 自动审查 → 安全检查 → 性能分析 → 改进建议 → 自动修复

# 示例 4: 学习模式
你: "怎么优化 Electron 应用的启动速度？"
AI: 自动调用技能 → 提供方案 → 代码示例 → 最佳实践
```

### 📦 已集成的技能和插件

**全局技能** (自动调用):
- ✅ `electron-react-best-practices` - Electron + React 最佳实践
- ✅ `electron-mcp-best-practices` - MCP 集成最佳实践
- ✅ `electron-react-frontend` - 桌面应用 UI/UX 规则
- ✅ `everything-claude-code` - Anthropic 黑客松获胜者配置

**工作流技能** (自动触发):
- ✅ `superpowers:writing-plans` - 功能规划
- ✅ `superpowers:systematic-debugging` - 系统调试
- ✅ `superpowers:test-driven-development` - TDD 开发
- ✅ `superpowers:requesting-code-review` - 代码审查
- ✅ `document-skills:skill-creator` - 技能创作

### ⚙️ 高级定制

如果需要自定义自动化行为，可以修改：

```bash
~/.claude/rules/00-auto-detect.md      # 修改自动检测规则
~/.claude/rules/01-electron-auto.md    # 修改 Electron 规则
~/.claude/rules/02-workflow-auto.md    # 修改工作流规则
.claude/hooks.json                      # 修改事件触发器
```

### 🎨 体验"傻瓜式"开发

现在你可以像对话一样开发软件，无需记忆命令或手动切换技能：

```
你: "帮我把这个组件重构一下"

AI 自动执行:
  ✅ 分析代码结构
  ✅ 识别性能问题
  ✅ 提出重构方案
  ✅ 先写测试 (TDD)
  ✅ 执行重构
  ✅ 验证功能
  ✅ 性能对比
  ✅ 生成文档
  ✅ 提交代码

整个过程无需任何手动干预！
```

---

## 项目概述

**SkillMate** 是一个激发人性的公众号创作AI助手，基于 Electron + React + TypeScript 构建。

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

## 🧠 错误学习和持续改进机制

### 自动错误记录

当任务中出现错误时，系统会自动：
1. 记录错误信息到 `.claude/errors.log`
2. 分析错误类型和根因
3. 搜索相关技能文档

### 自动学习触发条件

**同一错误模式出现 2 次或以上时**：
1. 自动分析错误模式
2. 生成解决方案文档
3. 更新或创建相关技能文档
4. 在项目中应用修复

### 技能来源标记

**自写技能**（标记方式）：
- 在 SKILL.md frontmatter 中添加：`source: internal`
- 适用自动学习机制
- 错误经验会自动写入技能

**下载技能**（标记方式）：
- 在 SKILL.md frontmatter 中添加：`source: external`
- 不适用自动学习机制（避免覆盖原作者更新）
- 提供更新检测和合并机制

### 错误日志格式

错误记录保存在 `.claude/errors.log`，格式如下：

```json
{
  "timestamp": "2026-01-31T10:30:00Z",
  "error_type": "name_field_mismatch",
  "context": {
    "operation": "skill_rename",
    "affected_files": ["writing-style-coach/SKILL.md"],
    "root_cause": "目录重命名但忘记更新 name 字段"
  },
  "occurrence_count": 2,
  "learned": false,
  "related_skill": "skill-refactoring-best-practices"
}
```

### 使用示例

```bash
# 记录错误
echo '{"timestamp":"'$(date -Iseconds)'","error_type":"test_error","occurrence_count":1,"learned":false}' >> .claude/errors.log

# 查看错误日志
cat .claude/errors.log | jq .

# 统计错误次数
cat .claude/errors.log | jq -r '.error_type' | sort | uniq -c | sort -rn
```

详细说明：`.claude/skill-source-management.md`

---

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
skill-mate/
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

### 🎯 自动应用最佳实践

**重要**: 本项目使用 Electron + React + Vite 技术栈。在编写代码时，Claude Code 应**自动应用** `electron-react-best-practices` 技能的规则。

该技能涵盖以下最佳实践：

#### 安全架构 (CRITICAL) - 自动应用
- ✅ **Context Isolation**: 所有 BrowserWindow 必须启用 `contextIsolation: true`
- ✅ **禁用 Node.js Integration**: 渲染进程必须设置 `nodeIntegration: false`
- ✅ **Content Security Policy**: 实施 CSP 头部防止 XSS
- ✅ **输入验证**: 所有 IPC 数据必须验证和清理
- ✅ **依赖更新**: 定期运行 `npm audit` 检查漏洞

#### IPC 通信 (HIGH) - 自动应用
- ✅ **Request-Response 模式**: 使用 `ipcMain.handle` / `ipcRenderer.invoke`
- ✅ **类型安全**: 实现 TypeScript 类型安全的 IPC 装饰器
- ✅ **错误处理**: 所有 IPC 调用必须有完善的错误处理
- ✅ **超时机制**: IPC 调用应该有超时保护
- ✅ **清理监听器**: IPC 监听器必须在组件卸载时清理

#### 性能优化 (HIGH) - 自动应用
- ✅ **模块懒加载**: 使用 dynamic import 延迟加载重模块
- ✅ **代码分割**: 使用 React.lazy 和 Suspense 分割代码
- ✅ **虚拟化**: 长列表使用 `@tanstack/react-virtual` 虚拟化
- ✅ **批处理 IPC**: 合并多个 IPC 调用减少进程通信
- ✅ **内存监控**: 监控内存使用防止泄漏

**触发关键词**: 当请求包含 "Electron"、"IPC"、"安全"、"性能"、"优化"、"主进程"、"渲染进程" 等关键词时，自动应用这些规则。

### 环境变量
- 开发模式通过 `.env` 文件配置（不提交到 git）
- 生产环境通过设置面板配置（持久化到 electron-store）
- `VITE_API_URL` 和 `VITE_MODEL_NAME` 用于开发默认值

### TypeScript 配置
- 严格模式启用
- **未使用变量检查**: `noUnusedLocals` 和 `noUnusedParameters` 启用
- ES 模块导入（`import/export`），不使用 CommonJS（`require`）
- Vite 构建时排除某些 Node.js 模块（`rollupOptions.external`）

### Node.js 模块系统规范（CRITICAL）

**本项目统一使用 ES Module (ESM)**，严格遵循以下规则避免 CommonJS/ESM 冲突：

#### 1. package.json 配置
```json
{
  "type": "module",  // ✅ 全局启用 ESM
  "exports": "./dist/index.js"  // ✅ 明确导出入口
}
```

#### 2. 文件扩展名规范
- ✅ **使用**：`.js` (跟随 `type: "module"`)
- ✅ **主进程**：`.ts` 编译为 `.mjs`
- ⚠️ **预加载脚本**：Electron 限制，编译为 `.cjs`
- ❌ **禁止**：混用 `require()` 和 `import`

#### 3. 导入语法规则
```typescript
// ✅ 正确：ESM 导入
import { helper } from './helper.js';
import config from './config.js';

// ❌ 错误：CommonJS 语法
const helper = require('./helper');
```

**重要**：ESM 要求导入路径必须包含文件扩展名（`.js`）

#### 4. Electron 特殊处理
```typescript
// electron/main.ts - 主进程（ESM）
import { app, BrowserWindow } from 'electron';

// electron/preload.ts - 预加载（需编译为 CJS）
// 通过 tsconfig 单独配置：
{
  "compilerOptions": {
    "module": "CommonJS",
    "outDir": "./dist/preload"
  }
}
```

#### 5. 依赖管理规则
- ✅ **优先选择**：支持 ESM 的包（查看 `package.json` 的 `"type"` 或 `"exports"`）
- ⚠️ **检查依赖**：`npm ls <package>` 查看模块类型冲突
- ❌ **避免**：仅支持 CJS 的老版本包（如 `chalk@4` → 升级到 `chalk@5`）

#### 6. 构建配置
```javascript
// vite.config.ts
export default {
  build: {
    target: 'node14',
    rollupOptions: {
      output: {
        format: 'es'  // ✅ 输出 ESM
      }
    }
  }
}
```

#### 7. tsconfig.json 配置
```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "node16",
    "esModuleInterop": true,  // ✅ 允许导入 CJS 模块
    "allowSyntheticDefaultImports": true
  }
}
```

#### 8. 故障排查清单
遇到模块错误时，按顺序检查：
- [ ] `package.json` 是否设置 `"type": "module"`
- [ ] 导入路径是否包含文件扩展名（`.js`）
- [ ] 依赖包是否支持 ESM
- [ ] 预加载脚本是否编译为 `.cjs`
- [ ] 构建配置是否输出 ESM 格式

**参考**：[Node.js Package Exports](https://nodejs.cn/api/packages.html)

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
- Windows: `SkillMate-Windows-{version}-Setup.exe`
- macOS: `SkillMate-Mac-{version}-Installer.dmg`
- Linux: `SkillMate-Linux-{version}.AppImage` / `.deb`

## 常见问题

### Q: 修改代码后没有生效？
A: 开发模式下 Vite 支持热重载，但主进程（electron/main.ts）修改需要重启 `npm run dev`。

### Q: IPC 调用报错 "Error: An object could not be cloned"？
A: 确保传递的数据可序列化（避免函数、循环引用等）。

### Q: 技能修改后不生效？
A: 生产环境技能为只读，修改需要重新构建应用。开发模式技能在 `resources/skills/` 目录。所有技能已内置，开箱即用。

### Q: MCP 工具不显示？
A: MCP 服务为项目内置固定配置，自动加载。如遇问题，检查主进程日志中的连接错误。
