# SkillMate - 快速开始指南

欢迎使用 SkillMate！本指南将帮助您快速上手。

---

## 🚀 5分钟快速入门

### 1. 安装应用

**Windows**:
```bash
# 下载并运行安装包
SkillMate-Windows-2.0.0-Setup.exe
```

**macOS**:
```bash
# 下载并打开 DMG 文件
SkillMate-Mac-2.0.0-Installer.dmg
```

**Linux**:
```bash
# 下载并运行 AppImage
SkillMate-Linux-2.0.0.AppImage
```

### 2. 配置 API

启动应用后，首次使用需要配置 Claude API：

1. 点击右上角设置图标 ⚙️
2. 填写以下信息：
   - **API Key**: 您的 Anthropic API Key
   - **API URL**: `https://api.anthropic.com` (默认)
   - **模型**: `claude-sonnet-4-20250514` (推荐)

3. 点击"保存配置"

### 3. 开始使用

**基础对话**：
```
你好，请介绍一下你自己
```

**使用技能**：
```
请帮我设计一个登录页面
# AI 会自动使用 frontend-design 技能
```

**文件操作**：
```
分析 data/sales.csv 的销售数据
# AI 会调用 xlsx-analyzer 或 data-analyzer 技能
```

---

## 📚 核心功能

### 1. 技能系统（35个内置技能）

SkillMate 内置 35 个开箱即用的技能，涵盖：
- 📚 文档处理（PDF、Excel、Word、PPT）
- 🎨 设计创作（前端设计、算法艺术）
- 🛠️ 开发工具（MCP服务器、Web测试）
- 🔄 开发工作流（TDD、调试、代码审查）
- 🔧 Git工作流（并行开发、代码审查）
- 🎯 微信创作（选题、写作、排版）

**查看所有技能**：[技能索引](./skills-index.md)

### 2. MCP 服务器集成

项目内置 MCP (Model Context Protocol) 服务器，无需手动配置：
- 自动连接外部服务
- 动态工具调用
- 实时数据处理

### 3. 本地文件操作

AI 可以操作您的本地文件系统：
- 读取文件内容
- 写入文件
- 运行命令（需授权）

**安全机制**：所有文件操作和命令执行都需要您的明确授权。

---

## 🎯 常见使用场景

### 场景 1：文档处理

**提取 PDF 文本**：
```
提取 document.pdf 中的所有文本和表格
```

**分析 Excel 数据**：
```
分析 sales.xlsx 中的销售数据，生成统计报表
```

**批量处理 Word 文档**：
```
将 docs/ 目录下的所有 .docx 文件转换为 PDF
```

### 场景 2：Web 开发

**设计前端界面**：
```
请帮我设计一个现代化的登录页面，包含：
- 用户名/密码输入框
- 记住我复选框
- 登录按钮
- 忘记密码链接
```

**测试 Web 应用**：
```
测试 http://localhost:3000 的用户注册功能
```

### 场景 3：开发工作流

**使用 TDD 开发功能**：
```
使用 test-driven-development 技能帮我开发用户认证功能
```

**调试 Bug**：
```
使用 systematic-debugging 技能帮我调试登录失败的 bug
```

**Git 并行开发**：
```
使用 using-git-worktrees 为功能 A 和 B 创建独立的开发环境
```

### 场景 4：微信创作

**生成文章标题**：
```
为"AI 改变工作方式"这个主题生成 10 个吸引人的标题
```

**写作公众号文章**：
```
写一篇关于 AI Agent 的公众号文章，风格要轻松幽默
```

**排版文章**：
```
优化这篇文章的排版，使其更易读
```

---

## 🔧 依赖安装

根据您使用的技能，可能需要安装额外的依赖：

### Python 依赖

**文档处理**：
```bash
pip install pypdf pdfplumber reportlab pandas openpyxl python-docx python-pptx
```

**Web 测试**：
```bash
pip install playwright
playwright install chromium
```

**数据分析**：
```bash
pip install pandas matplotlib seaborn
```

**MCP 服务器**：
```bash
pip install mcp fastmcp
```

### Node.js 依赖

**算法艺术**：
```bash
npm install p5
```

**MCP 服务器**：
```bash
npm install @modelcontextprotocol/sdk
```

### 外部工具

**ImageMagick**（图片处理）：
```bash
# Windows
# 从 https://imagemagick.org 下载安装

# macOS
brew install imagemagick

# Linux
sudo apt-get install imagemagick
```

---

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Alt + Space` | 打开/关闭悬浮球 |
| `Ctrl + ,` | 打开设置 |
| `Ctrl + /` | 查看技能列表 |
| `Ctrl + Enter` | 发送消息 |
| `Ctrl + N` | 新建对话 |

---

## 💡 使用技巧

### 1. 组合使用技能

**完整开发流程**：
```
brainstorming → writing-plans → test-driven-development
→ systematic-debugging → requesting-code-review
→ receiving-code-review → finishing-development
```

### 2. 明确指定技能

如果您想使用特定技能：
```
使用 frontend-design 技能设计一个博客首页
使用 pdf-processor 技能提取 report.pdf 的文本
```

### 3. 提供上下文

给 AI 更多的上下文信息会得到更好的结果：
```
# 好的示例
我正在开发一个电商网站，使用 React + TypeScript。
请帮我设计一个产品详情页面，需要包含：
- 产品图片轮播
- 价格和购买按钮
- 用户评价区域
- 相关产品推荐

# 不好的示例
帮我设计一个网页
```

### 4. 迭代优化

如果第一次结果不满意，继续优化：
```
# 第一次
请设计一个登录页面

# 第二次（优化）
将刚才的登录页面改为深色主题
按钮使用渐变色
```

---

## 🛡️ 安全注意事项

### 1. 文件访问权限

AI 只能访问您授权的文件夹。首次操作文件时会提示授权。

### 2. 命令执行确认

所有命令执行都需要您的明确确认，请仔细阅读命令内容。

### 3. API Key 保护

- 不要分享您的 API Key
- 定期轮换 API Key
- 使用环境变量存储（企业版）

---

## 📖 进阶使用

### 创建自定义技能

1. 使用 **skill-creator** 技能学习技能格式
2. 在 `~/.aiagent/skills/` 创建技能目录
3. 编写 `SKILL.md` 文件：
   ```markdown
   ---
   name: my-custom-skill
   description: 我的自定义技能
   ---

   # 技能指令

   详细的技能说明...
   ```
4. 重启应用，技能自动加载

**详细指南**：[技能开发指南](./skill-development-guide.md)

### 集成 MCP 服务器

1. 编写 MCP 服务器代码
2. 在设置中配置 MCP 服务器
3. AI 自动加载 MCP 工具

**详细指南**：[MCP 集成指南](./mcp-integration-guide.md)

---

## ❓ 常见问题

### Q: 为什么 AI 有时候不使用技能？

A: 技能是根据您的描述自动触发的。您可以明确指定使用某个技能：
```
使用 [技能名] 技能来...
```

### Q: 如何查看所有可用技能？

A: 有三种方式：
1. 查看 [技能索引](./skills-index.md)
2. 在应用中按 `Ctrl + /` 查看技能列表
3. 在设置中查看技能管理面板

### Q: 技能执行失败怎么办？

A: 检查：
1. 是否安装了所需的依赖（见[依赖安装](#-依赖安装)）
2. 文件路径是否正确
3. 是否有足够的权限

查看错误日志：
```bash
# Windows
%APPDATA%\..\Local\aiagent-desktop\logs

# macOS/Linux
~/.config/aiagent-desktop/logs
```

### Q: 如何提高响应速度？

A: v2.0 已优化：
- ✅ 技能懒加载（启动时间减少 60%+）
- ✅ 技能缓存（重复调用速度提升 90%+）
- ✅ 并行加载（加载速度提升 40%+）

如果仍然觉得慢：
1. 检查网络连接
2. 使用更快的模型（如 Claude Sonnet 4.5）
3. 减少上下文长度

### Q: 可以离线使用吗？

A: 部分功能可以离线使用：
- ✅ 纯指令技能（无外部依赖）
- ❌ 需要调用 API 的技能（如图片生成）
- ❌ 在线文档查询

---

## 🆘 获取帮助

### 内置帮助

在对话中输入：
```
/help
```

### 文档资源

- [技能索引](./skills-index.md) - 所有 35 个技能的详细说明
- [依赖安装指南](./dependency-installation.md) - 完整的依赖安装说明
- [架构文档](./architecture.md) - 深入了解系统架构

### 社区支持

- **GitHub Issues**: [提交问题](https://github.com/yourusername/aiagent-desktop/issues)
- **讨论区**: [GitHub Discussions](https://github.com/yourusername/aiagent-desktop/discussions)

### 反馈

遇到问题或有建议？欢迎反馈：
- GitHub Issues（Bug 报告）
- GitHub Discussions（功能请求）
- 邮件：support@aiagent-desktop.com

---

## 🎉 开始探索

现在您已经准备好使用 SkillMate 了！

**试试这些**：
1. 📝 处理文档：`提取这个 PDF 的文本内容`
2. 🎨 设计界面：`设计一个现代化的博客首页`
3. 🔍 调试代码：`帮我调试登录功能的问题`
4. 📊 分析数据：`分析这个 Excel 文件的数据`
5. ✍️ 写文章：`写一篇关于 AI 的公众号文章`

**记住**：AI 会自动选择合适的技能，您只需描述需求即可！

---

**祝您使用愉快！** 🚀

---

**版本**：v2.0
**更新日期**：2025-01-21
**维护者**：SkillMate Team
