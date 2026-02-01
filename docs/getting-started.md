# 快速开始指南

欢迎来到 SkillMate！本指南将帮助你快速了解和使用这个 AI Agent 框架。

**文档导航**：
- [🏠 返回 README](../README.md) | [🚀 高级功能指南](./advanced-guide.md) | [📖 完整文档列表](../README.md#-文档)

> **⚠️ 重要提示**: SkillMate 目前处于**开发阶段**，尚未提供预编译的安装包。本文档主要面向开发者，指导如何从源码运行项目。

---

## 系统要求

### 必需环境

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **操作系统**:
  - Windows 10 及以上
  - macOS 10.15 (Catalina) 及以上
  - Linux (Ubuntu 20.04+, Debian 11+, Fedora 35+)

### 检查环境

```bash
# 检查 Node.js 版本
node --version  # 应该 >= 18.0.0

# 检查 npm 版本
npm --version   # 应该 >= 9.0.0
```

如果版本过低，请访问 [Node.js 官网](https://nodejs.org/) 下载最新 LTS 版本。

---

## 从源码运行（开发者）

### 1. 克隆仓库

```bash
git clone https://github.com/hhhh124hhhh/SkillMate.git
cd SkillMate
```

### 2. 安装依赖

**方式一：一键安装（推荐）**

```bash
npm run setup
```

这会自动安装所有必需的依赖，包括 Python MCP 服务器。

**方式二：手动安装**

```bash
npm install
```

然后手动安装 Python 依赖（可选，用于网页抓取功能）：

```bash
pip install mcp-server-fetch
```

**提示**: 如果安装速度慢，可以使用国内镜像：
```bash
npm install --registry=https://registry.npmmirror.com
```

### 3. 启动开发服务器

> ⚠️ **重要提示**: 在启动之前，请确保已经完成步骤 2（安装依赖）！

```bash
npm start
```

首次运行会自动：
- 启动 Vite 开发服务器（端口 5173）
- 启动 Electron 主进程
- 打开应用窗口

**成功标志**: 看到应用窗口显示 "SkillMate" 界面。

---

## 首次配置

### 1. 打开应用设置

启动应用后，点击右上角 **⚙️ 设置** 图标。

### 2. 配置 API Key

在 **API 配置** 标签页中：

1. **获取智谱 AI API Key**:
   - 访问 [智谱 AI 开放平台](https://open.bigmodel.cn/)
   - 注册或登录账号
   - 进入 API Keys 页面
   - 创建新的 API Key

2. **输入 API Key**:
   - 将密钥粘贴到 "API Key" 输入框
   - （可选）修改 API URL（默认使用智谱 AI 端点）
   - （可选）选择模型（默认使用 `glm-4-flash` 或 `glm-4.7`）

3. **保存配置**:
   - 点击 "保存配置" 按钮
   - 看到成功提示即配置完成

### 3. 配置授权目录（可选）

在 **授权管理** 标签页中：

1. 点击 "添加授权目录"
2. 选择你希望 AI 可以访问的文件夹
3. 点击 "授权" 确认

**推荐授权目录**:
- 你的工作目录（如 `D:\Projects`）
- 文档目录（如 `C:\Users\YourName\Documents`）
- 代码仓库目录

**安全提示**: 仅授权你信任 AI 访问的目录，避免授权敏感文件夹。

---

## 基本使用

### 第一次对话

1. 回到主界面
2. 在底部输入框输入你的问题，例如：
   ```
   帮我分析一下当前目录的结构
   ```
3. 按 `Enter` 发送

**AI 响应流程**:
1. AI 分析你的请求
2. 如果需要操作文件，会弹出权限确认对话框
3. 点击 "允许" 后执行操作
4. 实时显示 AI 的思考过程和结果

### 尝试快捷操作

主界面提供 4 个默认快捷按钮（可自定义）：

- 💻 **代码生成**: 快速生成代码片段
- 🔍 **代码分析**: 分析代码功能和改进建议
- 🔧 **问题诊断**: 调试代码错误
- 💡 **方案设计**: 设计解决方案

点击任意按钮，AI 会填充预设提示词，你可以修改后发送。

---

## 自定义配置

### 添加自定义技能

1. 点击设置 → **技能管理**
2. 点击 **"创建新技能"**
3. 选择模板或从空白开始
4. 填写技能名称、描述和指令
5. 点击 "保存"

详细教程：[技能开发指南](./skill-development.md)

### 配置 MCP 服务器

项目内置了 MCP 服务配置，开箱即用。如需添加自定义 MCP 服务器：

1. 点击设置 → **MCP 配置**
2. 点击 **"添加服务器"**
3. 选择服务器类型（stdio 或 streamableHttp）
4. 填写服务器配置
5. 点击 "保存并测试连接"

详细教程：[MCP 集成指南](./mcp-integration.md)

### 自定义快捷按钮

1. 点击设置 → **快捷操作**
2. 编辑现有按钮或添加新按钮
3. 配置：
   - 图标（17 个可选）
   - 按钮标签
   - 预设提示词
   - 颜色主题（6 种可选）
4. 点击 "保存配置"

---

## 常见问题

### Q: 启动后窗口空白？

**A**: 检查 Vite 开发服务器是否正常运行：
- 查看终端输出是否有错误
- 尝试按 `Ctrl+R` 刷新窗口
- 确保在项目根目录运行 `npm start` 且没有报错

### Q: API 请求失败？

**A**: 检查以下几点：
1. 智谱 AI API Key 是否正确配置
2. 网络是否正常（是否需要代理）
3. 在设置中测试 API 连接
4. 检查 API 余额是否充足

### Q: AI 无法操作文件？

**A**: 确保：
1. 已添加授权目录
2. 文件在授权目录范围内
3. 允许了权限确认对话框

### Q: 技能不显示？

**A**: 检查技能格式：
1. SKILL.md 文件必须在技能目录根目录
2. YAML frontmatter 必须包含 `name` 和 `description` 字段
3. 技能名称必须是英文，使用连字符（如 `my-skill`）
4. 重启应用以重新加载技能

### Q: MCP 服务器连接失败？

**A**: 排查步骤：
1. 检查服务器配置格式是否正确
2. stdio 类型：确保 `command` 和 `args` 正确
3. streamableHttp 类型：确保 `baseUrl` 可访问
4. 查看主进程日志（开发模式终端输出）

---

## 下一步

恭喜你完成了基本配置！现在可以：

1. 📖 **学习架构**: 阅读 [架构设计文档](./architecture.md)
2. 🔧 **开发技能**: 学习 [技能开发指南](./skill-development.md)
3. 🔌 **集成 MCP**: 学习 [MCP 集成指南](./mcp-integration.md)
4. 🚀 **深入开发**: 阅读 [开发指南](./development.md)

---

## 获取帮助

遇到问题？这里有一些资源：

- **GitHub Issues**: [提交问题](https://github.com/hhhh124hhhh/SkillMate/issues)
- **文档中心**: [完整文档列表](../README.md#-文档)
- **项目讨论**: [GitHub Discussions](https://github.com/hhhh124hhhh/SkillMate/discussions)

---

## 关于项目

SkillMate 是一个开源的 AI Agent 桌面应用框架，专为学习和研究如何构建现代化的 AI Skill 助手而设计。

**项目定位**:
- 🎓 **学习和研究**: 通过实际代码学习 AI Agent 开发
- 🔧 **可扩展**: 基于技能系统轻松扩展功能
- 📚 **开源**: 基于 Apache License 2.0 开源

**技术栈**:
- Electron 30.0.1 - 桌面应用框架
- React 18.2.0 - UI 框架
- TypeScript 5.2.2 - 类型安全
- 智谱 AI (GLM-4.7) - 大语言模型
- Model Context Protocol - 工具集成协议

---

<p align="center">
  <b>开始探索 AI Agent 的无限可能</b> 🚀
</p>

---

**继续学习**：
- [🏠 返回 README](../README.md) - 5分钟快速上手
- [🚀 高级功能指南](./advanced-guide.md) - 技能开发、MCP配置等
- [📖 完整文档列表](../README.md#-文档) - 所有文档

---
