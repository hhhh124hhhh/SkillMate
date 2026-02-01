# 🙏 致谢与致敬 (Credits)

**SkillMate** 项目的开发离不开开源社区的支持和启发。本文档详细记录了我们参考、借鉴和使用的所有开源项目。

---

## 📚 项目灵感来源

### 直接参考的项目

#### 1. [Claude Code](https://claude.ai/code)
**作者**: Anthropic
**许可证**: MIT
**参考内容**:

- ✅ AI Agent 与文件系统交互的设计
- ✅ 权限管理和安全确认机制
- ✅ 技能系统的设计理念
- ✅ MCP 协议集成方式
- ✅ 流式响应展示
- ✅ 会话管理和历史记录

**启发**: 让我们理解了如何构建一个安全、可控的 AI 辅助开发工具。

---

#### 2. [Continue](https://github.com/continuecoding/continue)
**作者**: Continue Dev
**许可证**: Apache License 2.0
**参考内容**:

- ✅ 多 AI 模型支持的架构设计
- ✅ 上下文管理的实现方式
- ✅ 代码片段注入机制

**启发**: 帮助我们理解如何优雅地支持多个 AI 提供商。

---

#### 3. [Cursor](https://cursor.sh/)
**作者**: Cursor Team
**许可证**: Proprietary
**参考内容**:

- ✅ AI 辅助开发的交互模式
- ✅ 流式响应的用户体验设计
- ✅ 代码编辑器集成方式

**启发**: 界面设计和用户交互流程的重要参考。

---

## 🏗️ 核心技术栈

### AI 和协议层

| 项目 | 版本 | 许可证 | 用途 |
|------|------|--------|------|
| [Anthropic Claude API](https://www.anthropic.com) | Latest | Commercial | 大语言模型 |
| [Model Context Protocol](https://modelcontextprotocol.io) | 1.0 | MIT | 工具集成协议 |
| [@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-typescript) | 0.71.2 | MIT | TypeScript SDK |
| [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) | 1.25.2 | MIT | MCP SDK |

---

### 桌面应用框架

| 项目 | 版本 | 许可证 | 用途 |
|------|------|--------|------|
| [Electron](https://www.electronjs.org) | 30.0.1 | MIT | 桌面应用框架 |
| [Electron Forge](https://www.electronforge.io) | 7.11.1 | MIT | 打包构建工具 |
| [electron-store](https://github.com/sindresorhus/electron-store) | 8.2.0 | MIT | 配置存储 |
| [electron-log](https://github.com/megahertz/electron-log) | 5.1.2 | MIT | 日志模块 |
| [electron-updater](https://github.com/electron-userland/electron-updater) | 6.7.3 | MIT | 自动更新 |
| [@electron/fuses](https://github.com/electron/fuses) | 1.8.0 | MIT | Electron 配置 |

---

### 前端框架

| 项目 | 版本 | 许可证 | 用途 |
|------|------|--------|------|
| [React](https://react.dev) | 18.2.0 | MIT | UI 框架 |
| [TypeScript](https://www.typescriptlang.org) | 5.2.2 | MIT | 类型安全 |
| [Vite](https://vitejs.dev) | 5.1.6 | MIT | 构建工具 |
| [Tailwind CSS](https://tailwindcss.com) | 3.x | MIT | CSS 框架 |
| [@tanstack/react-virtual](https://tanstack.com/virtual) | 3.13.18 | MIT | 虚拟滚动 |

---

### 开发工具

| 项目 | 版本 | 许可证 | 用途 |
|------|------|--------|------|
| [ESLint](https://eslint.org) | Latest | MIT | 代码检查 |
| [Prettier](https://prettier.io) | Latest | MIT | 代码格式化 |
| [dotenv](https://github.com/motdotla/dotenv) | 17.2.3 | BSD-2-Clause | 环境变量 |

---

## 🌟 社区资源

### 开发配置和最佳实践

#### [everything-claude-code](https://github.com/affaan-m/everything-claude-code)
**作者**: Affaan Mustafa
**许可证**: MIT
**使用内容**:

- ✅ Agents 设计模式
- ✅ Skills 系统架构
- ✅ Hooks 自动化配置
- ✅ Rules 最佳实践
- ✅ Commands 工作流
- ✅ 测试驱动开发流程

**影响**: 提供了完整的 Claude Code 自动化配置参考，帮助我们在项目中实现了"傻瓜包"模式。

---

#### [electron-react-best-practices](https://github.com/affaan-m/everything-claude-code)
**作者**: Affaan Mustafa
**许可证**: MIT
**使用内容**:

- ✅ 74+ 条 Electron + React 最佳实践
- ✅ Node.js 模块系统规范
- ✅ 安全架构指南
- ✅ 性能优化技巧
- ✅ IPC 通信模式

**影响**: 帮助我们建立了严格的开发规范和安全标准。

---

#### [electron-mcp-best-practices](https://github.com/affaan-m/everything-claude-code)
**作者**: Affaan Mustafa
**许可证**: MIT
**使用内容**:

- ✅ MCP 集成完整指南
- ✅ API Key 安全存储
- ✅ 权限管理实现
- ✅ 占位符检测机制

**影响**: 让我们能够安全地集成 MCP 协议。

---

### 技能和文档

参考的技能和文档资源：

- [Superpowers Skills](https://github.com/affaan-m/everything-claude-code) - 工作流自动化
- [Document Skills](https://github.com/affaan-m/everything-claude-code) - 文档创作
- [Example Skills](https://github.com/affaan-m/everything-claude-code) - 示例技能

---

## 📖 设计理念致敬

### 1. Agent 运行时设计

**灵感来源**: [Claude Code](https://claude.ai/code)

借鉴的设计思路：
- 消息队列管理
- 流式响应处理
- 工具调用协调
- 权限确认机制
- 多窗口支持

### 2. 技能系统架构

**灵感来源**: [Model Context Protocol](https://modelcontextprotocol.io)

借鉴的设计思路：
- 技能加载机制
- 上下文注入
- 工具命名空间
- 元数据管理

### 3. 安全机制

**灵感来源**: 多个开源项目的最佳实践

借鉴的设计思路：
- Context Isolation
- CSP 头部设置
- IPC 输入验证
- 权限细粒度控制

---

## 🤝 贡献者致谢

感谢以下开源项目的维护者和贡献者：

- **Anthropic Team** - Claude API 和 SDK 的持续改进
- **Electron Community** - 提供稳定的桌面应用框架
- **Vite Team** - 极速的开发体验
- **React Team** - 优雅的前端框架
- **TypeScript Team** - 类型安全的开发体验
- **All Open Source Contributors** - 你们的代码让世界更美好

---

## 📜 许可证合规

本项目遵循 **Apache License 2.0** 开源。

### 使用的开源协议

- MIT License: React, Vite, Electron, 大部分工具库
- Apache License 2.0: Continue, 部分依赖库
- BSD License: dotenv 等工具
- Commercial: Claude API (使用 API Key 访问)

### 我们的承诺

1. **遵守所有开源协议**
   - 正确标注所有使用的开源项目
   - 遵守各自的许可证要求
   - 保留原作者的版权声明

2. **回馈社区**
   - 本项目同样开源
   - 欢迎社区贡献
   - 分享我们的经验

3. **透明化**
   - 清晰标注参考和借鉴的内容
   - 诚实致敬原创者
   - 不声称他人的工作为自己的原创

---

## 🌈 开源精神

### 我们的信念

> "Standing on the shoulders of giants."

**牛顿的名言同样适用于软件开发**。我们今天的成就，离不开无数开源先驱的智慧和贡献。

### 我们的承诺

我们承诺：
- ✅ 尊重所有开源项目的劳动成果
- ✅ 遵守所有开源协议
- ✅ 积极回馈开源社区
- ✅ 帮助其他开发者成长
- ✅ 传承开源精神

### 我们的呼吁

如果你使用了本项目的代码或设计，请：
1. 遵守 Apache License 2.0
2. 在你的项目中致谢我们
3. 同样回馈开源社区
4. 帮助更多人学习 AI 开发

---

## 📮 如何致敬

### 如果你是项目作者

如果你觉得本项目参考了你的项目但没有列出来，请：
1. 提交 [Issue](https://github.com/hhhh124hhhh/wechat-flowwork/issues)
2. 说明项目名称和参考内容
3. 我们会在 3 个工作日内添加致谢

### 如果你想致敬我们

如果你基于本项目开发了新项目，请：
1. 保留项目的版权声明
2. 在你的 README 中致敬本项目
3. 遵守 Apache License 2.0
4. 告诉我们，我们会列出你的项目

---

## 🙏 最后的话

**开源不仅是代码，更是一种精神**。

感谢所有开源贡献者的无私奉献，让我们能够站在巨人的肩膀上，构建出更好的产品。

**SkillMate Team**
2026-01-31

---

**文档版本**: 1.0.0
**最后更新**: 2026-01-31
