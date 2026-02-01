<p align="center">
  <img src="./public/icon.png" width="100" height="100" alt="SkillMate Logo">
</p>

<h1 align="center">SkillMate</h1>

<p align="center">
  🚀 一个开源的 AI Agent 桌面应用框架，用于学习如何构建现代化的 AI Skill助手
</p>

<p align="center">
  <a href="https://github.com/hhhh124hhhh/wechat-flowwork"><img src="https://img.shields.io/github/v/release/hhhh124hhhh/wechat-flowwork?style=flat-square&color=orange" alt="Release"></a>
  <a href="https://github.com/hhhh124hhhh/wechat-flowwork/actions"><img src="https://img.shields.io/github/actions/workflow/status/hhhh124hhhh/wechat-flowwork/release.yml?style=flat-square" alt="Build"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/hhhh124hhhh/wechat-flowwork?style=flat-square" alt="License"></a>
</p>

---

# ⚠️ 开发版重要说明

## 🔴 这是开发版本！

**SkillMate** 目前处于**活跃开发阶段**，主要用于：

- 🎓 **学习和研究** - 了解 AI Agent 的实现原理
- 🔬 **实验和探索** - 测试新的交互方式和工具集成
- 📚 **教学演示** - 展示现代 AI 应用的构建方法

### 不推荐用于生产环境

⚠️ **当前版本的限制**：

- 🔴 **稳定性** - 可能存在未知 bug 和崩溃问题
- 🔴 **安全性** - AI 操作本地文件系统，需要用户谨慎授权
- 🔴 **功能完整性** - 部分功能仍在开发中
- 🔴 **性能优化** - 未经过大规模测试和优化

### 推荐使用场景

✅ **适合**：
- 学习 Electron + AI 应用开发
- 研究 AI Agent 架构和实现
- 个人实验和原型验证
- 教学演示和代码示例

❌ **不适合**：
- 生产环境部署
- 处理重要数据
- 需要高可靠性的场景

---

## ✨ 特性

### 为什么选择 SkillMate？

- 🎯 **通用架构** - 不绑定任何特定领域，自由扩展
- 🔧 **高度可定制** - 支持自定义技能和 MCP 服务器
- 📚 **教学优先** - 清晰的代码结构和文档，适合学习
- 🛠️ **最佳实践** - 展示 AI Agent 开发的行业标准
- 🔌 **MCP 协议支持** - 无限扩展能力边界
- 🖥️ **跨平台** - Windows、macOS、Linux 全支持

### 核心能力

- **💬 智能对话** - 基于 Claude AI 的自然语言交互
- **🔧 工具调用** - 安全的文件操作和命令执行
- **🔌 技能系统** - **35+ 内置技能**，涵盖文档处理、设计创作、开发工具、Git 工作流等
- **🌐 MCP 集成** - 标准化的工具集成协议
- **⚡ 流式响应** - 实时展示 AI 思考过程
- **🔐 权限管理** - 细粒度的权限控制和确认机制
- **⚡ 性能优化** - 技能懒加载、智能缓存、并行加载（v2.0 新增）

---

## 🎯 适合谁？

### 对于学习者

- 📖 学习如何构建 Electron + AI 应用
- 🔍 理解 AI Agent 的运行时机制
- 🎓 掌握 MCP 协议和技能系统

### 对于开发者

- 🚀 快速原型验证 AI Agent 创意
- 🧩 基于框架构建定制化助手
- 🔌 集成自定义工具和服务

### 对于研究者

- 🔬 研究 AI Agent 的行为模式
- 📊 分析工具调用和权限管理
- 🎨 实验新的交互方式

---

## ⚠️ Risk Notice / 风险提示

SkillMate allows AI to operate on local file systems and terminals. Please note:

SkillMate 允许 AI 操作本地文件系统和终端。请注意：

- 🚨 **AI may accidentally delete files or execute incorrect commands**
- 🚨 **AI 可能意外删除文件或执行错误命令**
- 🔓 **Prompt injection risks may exist**
- 🔓 **可能存在提示注入风险**
- 👁️ **AI can read all files within authorized directories**
- 👁️ **AI 可以读取授权目录内的所有文件**

**Recommendations / 建议：**
- ✅ Only authorize necessary directories / 仅授权必要的目录
- ✅ Backup data regularly / 定期备份数据
- ✅ Review operation requests / 审查操作请求
- ✅ Monitor AI behavior / 监控 AI 行为

> **Disclaimer / 免责声明：**
> This software is provided "as-is" for learning and development purposes only. Developers are not liable for any losses caused by using this software.
>
> 本软件按"原样"提供，仅用于学习和开发目的。开发者不对使用本软件造成的任何损失承担责任。
>
> **This is a development version - use at your own risk!**
> **这是开发版本 - 使用风险自负！**

---

## 🏗️ 技术架构

### 核心技术栈

- **桌面框架**: Electron 30.0.1
- **前端**: React 18.2.0 + TypeScript 5.2.2 + Tailwind CSS
- **构建工具**: Vite 5.1.6 + vite-plugin-electron
- **AI SDK**: Anthropic AI SDK + Model Context Protocol SDK

### 架构亮点

- ✅ **流式响应** - 实时展示 AI 思考过程
- ✅ **工具调用** - 安全的文件操作和命令执行
- ✅ **权限管理** - 细粒度的权限控制和确认机制
- ✅ **会话管理** - 多会话支持和历史记录持久化
- ✅ **技能系统** - 可扩展的技能框架
- ✅ **MCP 协议** - 标准化的工具集成协议

### 目录结构

```
wechat-flowwork/
├── electron/                    # Electron 主进程代码
│   ├── main.ts                 # 主进程入口（窗口管理、IPC 注册）
│   ├── agent/                  # AI Agent 系统
│   │   ├── AgentRuntime.ts     # 核心运行时
│   │   ├── skills/             # 技能管理器
│   │   ├── mcp/                # MCP 客户端服务
│   │   ├── tools/              # 内置文件系统工具
│   │   └── security/           # 权限管理器
│   └── config/                 # 配置存储
├── src/                        # React 渲染进程代码
│   ├── App.tsx                 # 根组件
│   └── components/             # React 组件
│       ├── CoworkView.tsx      # 主界面
│       ├── SettingsView.tsx    # 设置面板
│       ├── SkillsEditor.tsx    # 技能编辑器
│       ├── MCPConfigEditor.tsx # MCP 配置编辑器
│       └── QuickActionsEditor.tsx # 快捷按钮配置
├── resources/skills/           # 内置技能库（示例）
├── docs/                       # 项目文档
│   ├── architecture.md         # 架构设计
│   ├── getting-started.md      # 快速开始
│   ├── skill-development.md    # 技能开发
│   └── mcp-integration.md      # MCP 集成
└── public/                     # 静态资源
```

---

## 📚 学习路径

### 1. 快速开始
[安装和运行指南](./docs/getting-started.md)

### 2. 架构理解
[架构设计文档](./docs/architecture.md)

### 3. 技能开发
[如何创建自定义技能](./docs/skill-development.md)

### 4. MCP 集成
[MCP 服务器配置指南](./docs/mcp-integration.md)

### 5. 进阶主题
- 安全机制详解
- 性能优化技巧
- 自定义 UI 主题

---

## 🚀 快速开始

### 前置要求

- **Node.js**: >= 18.0.0（推荐 20.x）
- **npm**: >= 9.0.0
- **Git**: 用于克隆仓库
- **操作系统**: Windows 10+, macOS 10.15+, Linux (Ubuntu 20.04+)

### 安装

```bash
# 1. 克隆仓库
git clone https://github.com/hhhh124hhhh/wechat-flowwork.git
cd wechat-flowwork

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
```

应用会自动启动并打开窗口。

### 配置

1. **首次运行配置**
   - 打开应用后，点击右上角设置按钮
   - 配置你的 Anthropic API Key
   - （推荐）配置授权文件夹（限制 AI 访问范围）

2. **可选配置**
   - 添加自定义技能
   - 配置 MCP 服务器
   - 调整快捷键设置

3. **获取 API Key**
   - 访问 [Anthropic Console](https://console.anthropic.com/)
   - 创建账户并获取 API Key
   - 新用户有免费额度

### 开发构建

```bash
# 仅构建前端代码
npm run build:frontend

# 完整构建（Electron + Vite + 打包）
npm run build

# 仅构建 Electron 主进程
npm run build:electron
```

---

## 🎨 自定义技能

创建自己的技能非常简单：

```bash
# 1. 在 resources/skills/ 创建新目录
mkdir -p resources/skills/my-skill

# 2. 创建 SKILL.md 文件
cat > resources/skills/my-skill/SKILL.md << 'EOF'
---
name: my-skill
description: 我的自定义技能
input_schema:
  type: object
  properties:
    query:
      type: string
      description: 查询内容
---

这里是技能的具体指令...
EOF

# 3. 重启应用，技能会自动加载
```

详细指南：[技能开发文档](./docs/skill-development.md)

---

## 🔌 MCP 配置示例

MCP (Model Context Protocol) 允许集成外部工具和服务：

```json
{
  "mcpServers": {
    "filesystem": {
      "name": "filesystem",
      "description": "本地文件系统访问",
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/allowed/path"]
    },
    "fetch": {
      "name": "fetch",
      "description": "网页内容获取",
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"]
    }
  }
}
```

详细指南：[MCP 集成文档](./docs/mcp-integration.md)

---

## 📖 文档

- [架构设计](./docs/architecture.md) - 理解项目整体架构
- [快速开始](./docs/getting-started.md) - 安装和运行指南
- [技能开发](./docs/skill-development.md) - 创建自定义技能
- [MCP 集成](./docs/mcp-integration.md) - 配置 MCP 服务器
- [开发指南](./docs/development.md) - 如何参与开发
- [CLAUDE.md](./CLAUDE.md) - AI 辅助开发配置
- [致谢与致敬](./CREDITS.md) - 开源项目致敬详情 ⭐

---

## 🛠️ 开发指南

### 常用命令

```bash
npm run dev      # 启动开发服务器
npm run build    # 完整构建（Electron + Vite）
npm run lint     # 代码检查
```

### 开发环境

- **Node.js**: >= 18.0.0（推荐 20.x）
- **npm**: >= 9.0.0
- **操作系统**: Windows 10+, macOS 10.15+, Linux (Ubuntu 20.04+)

### 代码风格

项目使用 ESLint 和 Prettier 进行代码检查和格式化：

```bash
# 运行代码检查
npm run lint

# 自动修复代码格式问题
npm run lint -- --fix
```

### 开发模式特性

开发模式下有以下便利功能：

- 🔥 热重载（前端代码修改自动刷新）
- 🐛 自动打开 DevTools
- 📝 详细日志输出
- ⚡ 快速重启（主进程修改需手动重启）

---

## 🤝 贡献

欢迎贡献！请查看 [贡献指南](./CONTRIBUTING.md)

### 如何贡献

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 贡献指南

- 🐛 **Bug 报告** - 使用 GitHub Issues
- 💡 **功能建议** - 使用 GitHub Discussions
- 📖 **文档改进** - 提交 PR
- 🔧 **代码贡献** - 遵循代码规范，添加测试

---

## 🐛 问题反馈

### 遇到问题？

1. **查看文档** - 先查看 [文档](./docs/)
2. **搜索 Issues** - 检查是否已有类似问题
3. **创建 Issue** - 包含详细的错误信息和复现步骤

### Issue 模板

创建 Issue 时请包含：

- 📝 描述 - 清晰描述问题
- 🔍 复现步骤 - 如何触发问题
- 💻 环境 - 操作系统、Node.js 版本等
- 📸 截图/日志 - 错误截图或日志
- 🎯 期望行为 - 你期望发生什么

---

## 📊 开发状态

### 当前版本

**v0.2.0-dev** (开发版本)

### 最近更新

- ✨ 新增 35+ 内置技能
- ✨ 新增 MCP 协议支持
- ✨ 新增权限管理系统
- ✨ 新增技能懒加载和并行加载
- 🐛 修复多个已知 bug
- 📚 完善文档和注释

### 计划中的功能

- 🔮 更多内置技能
- 🔮 技能市场（社区技能分享）
- 🔮 多语言支持
- 🔮 插件系统
- 🔮 性能优化和内存管理

---

## 📄 许可证

Apache License 2.0 - 详见 [LICENSE](./LICENSE)

Copyright © 2024 [SkillMate Team](https://github.com/hhhh124hhhh/wechat-flowwork)

---

## 🙏 致谢与致敬

### 💖 项目灵感

**SkillMate** 的诞生离不开开源社区的无私分享。

本项目在学习、参考和借鉴了以下优秀开源项目的基础上进行开发：

#### 📚 主要参考项目

- **[OpenCowork](https://github.com/opencowork/opencowork)** - **本项目的基础来源**
  - **重要**: SkillMate 基于 OpenCowork 进行二次开发和改造
  - 提供了 Electron + React + TypeScript 架构基础
  - 提供了 AI Agent 运行时系统设计
  - 提供了 MCP 协议集成框架和技能系统核心实现
  - 改造方向：从通用 AI 辅助工具 → 公众号创作垂直应用

- **[Claude Code](https://claude.ai/code)** - Anthropic 官方的 AI 编程助手
  - 启发了 AI Agent 与文件系统交互的设计思路
  - 参考了权限管理和安全确认机制
  - 借鉴了技能系统的设计理念

- **[Continue](https://github.com/continuecoding/continue)** - AI 代码补全和助手
  - 参考了多 AI 模型支持的架构
  - 学习了上下文管理的实现方式

- **[Cursor](https://cursor.sh/)** - AI 驱动的代码编辑器
  - 启发了 AI 辅助开发的交互模式
  - 参考了流式响应的展示方式

#### 🏗️ 核心技术栈致谢

本项目建立在以下优秀开源项目的肩膀上：

**AI 和协议层**：
- [Anthropic Claude API](https://www.anthropic.com) - 强大的大语言模型能力
- [Model Context Protocol](https://modelcontextprotocol.io) - 标准化的工具集成协议
- [@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-typescript) - TypeScript SDK

**桌面应用框架**：
- [Electron](https://www.electronjs.org) - 跨平台桌面应用框架
- [Electron Forge](https://www.electronforge.io) - Electron 打包和构建工具
- [electron-store](https://github.com/sindresorhus/electron-store) - 简单的配置存储
- [electron-updater](https://github.com/electron-userland/electron-updater) - 自动更新机制

**前端框架**：
- [React](https://react.dev) - 用户界面库
- [TypeScript](https://www.typescriptlang.org) - 类型安全的 JavaScript
- [Vite](https://vitejs.dev) - 下一代前端构建工具
- [Tailwind CSS](https://tailwindcss.com) - 实用优先的 CSS 框架
- [@tanstack/react-virtual](https://tanstack.com/virtual) - 虚拟滚动组件

**开发工具**：
- [ESLint](https://eslint.org) - 代码质量检查
- [Prettier](https://prettier.io) - 代码格式化
- [electron-log](https://github.com/megahertz/electron-log) - Electron 日志模块

**社区资源**：
- [everything-claude-code](https://github.com/affaan-m/everything-claude-code) - Anthropic 黑客松获胜配置
  - 提供了完整的 Claude Code 最佳实践
  - 参考了 agents、skills、hooks 等设计模式
  - 借鉴了自动化工作流配置

### 🌟 特别感谢

- **Anthropic 团队** - 提供强大的 Claude AI 能力和完善的技术文档
- **Model Context Protocol 社区** - 制定开放的工具集成标准
- **Electron 社区** - 提供稳定的跨平台应用框架
- **所有开源贡献者** - 用代码和知识构建更美好的世界

### 📜 许可证感谢

本项目遵循 **Apache License 2.0** 开源，感谢以下项目的启发：

- 技术架构设计思路
- 安全最佳实践
- 用户体验优化
- 开发者体验设计

### 🤝 贡献致敬

如果你是某个开源项目的作者，并且觉得本项目参考了您的设计但没有列出来，欢迎通过 [Issues](https://github.com/hhhh124hhhh/wechat-flowwork/issues) 告知我们，我们会立即添加致谢！

---

**开源的本质是分享和传承**。我们站在巨人的肩膀上，也希望我们的工作能够帮助到更多人。

---

## 📮 联系方式

- **GitHub**: https://github.com/hhhh124hhhh/wechat-flowwork
- **Issues**: https://github.com/hhhh124hhhh/wechat-flowwork/issues
- **Discussions**: https://github.com/hhhh124hhhh/wechat-flowwork/discussions

---

## ⭐ Star History

如果这个项目对你有帮助，请给它一个 Star ⭐

[![Star History Chart](https://api.star-history.com/svg?repos=hhhh124hhhh/wechat-flowwork&type=Date)](https://star-history.com/#hhhh124hhhh/wechat-flowwork&Date)

---

<p align="center">
  <b>⚠️ 开始使用前请阅读风险提示</b><br>
  <b>🚀 开始构建你的 AI Agent 之旅</b>
</p>
