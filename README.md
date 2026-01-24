<p align="center">
  <img src="./public/icon.png" width="100" height="100" alt="SkillMate Logo">
</p>

<h1 align="center">SkillMate</h1>

<p align="center">
  🚀 一个开源的 AI Agent 桌面应用框架，用于学习如何构建现代化的 AI 助手
</p>

<p align="center">
  <a href="https://github.com/yourname/skill-mate"><img src="https://img.shields.io/github/v/release/yourname/skill-mate?style=flat-square&color=orange" alt="Release"></a>
  <a href="https://github.com/yourname/skill-mate/actions"><img src="https://img.shields.io/github/actions/workflow/status/yourname/skill-mate/release.yml?style=flat-square" alt="Build"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/yourname/skill-mate?style=flat-square" alt="License"></a>
</p>

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
- **🔌 技能系统** - **35 个内置技能**，涵盖文档处理、设计创作、开发工具、Git工作流等
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

## ⚠️ Risk Notice

SkillMate allows AI to operate on local file systems and terminals. Please note:

- AI may accidentally delete files or execute incorrect commands
- Prompt injection risks may exist
- AI can read all files within authorized directories

**Recommendations:** Only authorize necessary directories, backup data regularly, review operation requests.

> **Disclaimer:** This software is provided "as-is" for learning and development purposes only. Developers are not liable for any losses caused by using this software.

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
skill-mate/
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

### 安装

```bash
# 克隆仓库
git clone https://github.com/yourname/skill-mate.git
cd skill-mate

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 配置

1. 打开应用后，进入设置面板
2. 配置你的 Anthropic API Key
3. （可选）添加自定义技能
4. （可选）配置 MCP 服务器

### 下载安装包

从 [Releases](https://github.com/yourname/skill-mate/releases) 下载最新版本：

- **Windows**: `AI-Agent-Desktop-Windows-{version}-Setup.exe`
- **macOS**: `AI-Agent-Desktop-Mac-{version}-Installer.dmg`
- **Linux**: `AI-Agent-Desktop-Linux-{version}.AppImage` / `.deb`

---

## 🎨 自定义技能

创建自己的技能非常简单：

```bash
# 1. 在 ~/.aiagent/skills/ 创建新目录
mkdir -p ~/.aiagent/skills/my-skill

# 2. 创建 SKILL.md 文件
cat > ~/.aiagent/skills/my-skill/SKILL.md << 'EOF'
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
- [开发指南](./docs/development.md) - 如何参与开发
- [技能开发](./docs/skill-development.md) - 创建自定义技能
- [MCP 集成](./docs/mcp-integration.md) - 配置 MCP 服务器
- [API 参考](./docs/api.md) - 核心 API 文档

---

## 🛠️ 开发指南

### 常用命令

```bash
npm run dev      # 启动开发服务器
npm run build    # 完整构建（Electron + Vite）
npm run lint     # 代码检查
```

### 开发环境

- **Node.js**: >= 18.0.0
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

---

## 🤝 贡献

欢迎贡献！请查看 [贡献指南](./CONTRIBUTING.md)

### 贡献方式

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

Apache License 2.0 - 详见 [LICENSE](./LICENSE)

Copyright © 2024 [SkillMate Team](https://github.com/yourname/skill-mate)

---

## 🙏 致谢

- [Anthropic](https://www.anthropic.com) - 提供 Claude AI 能力
- [Model Context Protocol](https://modelcontextprotocol.io) - MCP 协议规范
- [Electron](https://www.electronjs.org) - 桌面应用框架
- [Vite](https://vitejs.dev) - 下一代前端构建工具

---

<p align="center">
  <b>开始构建你的 AI Agent 之旅</b> 🚀
</p>
