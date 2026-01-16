<p align="center">
  <img src="./public/icon.png" width="100" height="100" alt="WeChat_Flowwork Logo">
</p>

<h1 align="center">公众号运营牛马</h1>

<p align="center">
  你的私人运营牛马，就是干活的 · 专注于实际运营工作的实用工具
</p>

<p align="center">
  <a href="./README.md">English</a> · <a href="./README_CN.md">中文</a>
</p>

<p align="center">
  <a href="https://github.com/opencowork/opencowork/releases"><img src="https://img.shields.io/github/v/release/opencowork/opencowork?style=flat-square&color=orange" alt="Release"></a>
  <a href="https://github.com/opencowork/opencowork/actions"><img src="https://img.shields.io/github/actions/workflow/status/opencowork/opencowork/release.yml?style=flat-square" alt="Build"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/github/license/opencowork/opencowork?style=flat-square" alt="License"></a>
</p>

---

## 💡 核心理念

### 不止是聊天，更是真正能帮你干活的运营助手

**公众号运营牛马** = 专业 + 高效 + 实用

一个开源的桌面AI助手，将16个强大的公众号运营技能集成到专业的应用中，帮助你高效完成运营工作。

我们相信：
- ✅ **实用的功能**，才能真正提高运营效率
- ✅ **高效的工具**，比花里胡哨的界面更有价值
- ✅ **专业的流程**，比零散的技巧更能保证质量
- ✅ **批量的处理**，比单个操作更能节省时间

### 普通公众号工具 vs 公众号运营牛马

| 维度 | 普通工具 | 公众号运营牛马 |
|------|---------|---------------|
| 关心什么 | 阅读量、转发量、点赞数 | 运营效率、工作质量、流程标准化 |
| 核心功能 | 优化技巧、包装、数据 | 完整运营功能 + **批量处理** + **流程自动化** |
| 目标 | 涨粉、变现 | 提高效率、保证质量、降低运营成本 |
| 结果 | 可能"好看"但不一定"实用" | "专业高效"，真正解决运营问题 |

---

## ⚠️ Risk Notice

WeChat_Flowwork allows AI to operate on local file systems and terminals. Please note:

- AI may accidentally delete files or execute incorrect commands
- Prompt injection risks may exist
- AI can read all files within authorized directories

**Recommendations:** Only authorize necessary directories, backup data regularly, review operation requests.

> **Disclaimer:** This software is provided "as-is" for learning and development purposes only. Developers are not liable for any losses caused by using this software.

---

## ✨ 核心功能

### 16个内置运营技能

覆盖公众号运营全流程，从选题到发布，从数据到管理：

#### 1. 内容生产
- **topic-selector** - 多平台热点搜索（微博、知乎、百度、抖音等）
- **title-generator** - 批量生成标题，基于运营需求优化
- **ai-writer** - 快速写作辅助（批量创作、内容扩写、风格调整）
- **style-learner** - 写作风格学习与批量应用
- **smart-layout** - 智能排版优化，支持批量处理

#### 2. 视觉设计
- **cover-generator** - 批量生成封面，支持模板应用
- **image-generation** - AI生成配图，批量处理
- **image-cropper** - 智能裁剪，预设尺寸（微信封面、正方形等）

#### 3. 数据分析
- **data-analyzer** - 数据分析与运营建议
- **data-writer** - 公众号数据解析（从后台复制数据自动解析为JSON）

#### 4. 运营管理
- **wechat-workflow** - 完整工作流整合，支持批量操作
- **wechat-writing** - 运营写作指导和优化

#### 5. 辅助工具
- **user-guide** - 运营指南和快速入门
- **skill-creator** - 技能创建工具

### 核心优势 ⭐
- **批量处理** - 支持批量操作，提高运营效率
- **流程自动化** - 完整运营工作流，减少手动操作
- **专业功能** - 针对运营场景优化的实用功能
- **高效界面** - 专业简洁的界面，专注于工作

### 桌面应用特性

<p align="center">
  <img src="https://i.meee.com.tw/uA5H9yG.png" width="400" alt="WeChat_Flowwork Demo">
</p>

- **🎯 模型无关** — 支持GLM及各类Agent模型，无厂商锁定
- **📁 文件操作** — 读取、写入、创建和修改本地文件
- **🖥️ 终端控制** — 执行命令行操作
- **🔌 技能扩展** — 通过Skills和MCP协议扩展能力
- **🌐 跨平台** — Windows、macOS、Linux全支持

### 悬浮球快速启动

<p align="center">
  <img src="https://i.meee.com.tw/iKBLLFA.gif" width="400" alt="Floating Ball">
</p>

通过 `Alt+Space` 快捷键随时召唤创作助手，让灵感不被打断。

---

## 🎯 完整创作工作流

### Flowwork 心流创作法 ⭐

```
1. 激发情绪 → emotion-provoker
   "帮我激发情绪，这篇文章太理性了"

2. 自由写作 → [手动创作]
   让真实情绪自然流露

3. 优化表达 → ai-writer + smart-layout
   润色文字，美化排版

4. 生成配图 → image-generation
   AI生成匹配情绪的配图

5. 记录成长 → emotion-card-generator
   生成情绪卡片，记录这次写作的心路历程

6. 真实连接 → [发布]
   把真实的内容，分享给真实的读者
```

### 技能触发示例

在WeChat_Flowwork中，通过自然语言即可调用任何技能：

```
# 选题与标题
"找选题"
"生成5个关于AI的标题"
"优化这个标题"

# 内容创作
"润色这段文字"
"切换为幽默风格"
"排版这篇文章"

# 情绪与成长
"激发情绪，我写得太理性了"
"生成情绪卡片，记录这次写作"

# 数据分析
"分析我的文章数据"
"解析公众号后台数据"

# 图片工具
"生成配图"
"裁剪为微信封面尺寸"
```

---

## 🚀 快速开始

### 下载安装

从 [Releases](https://github.com/opencowork/opencowork/releases) 下载最新版本：

- **Windows**: `WeChat_Flowwork-Windows-{version}-Setup.exe`
- **macOS**: `WeChat_Flowwork-Mac-{version}-Installer.dmg`
- **Linux**: `WeChat_Flowwork-Linux-{version}.AppImage` / `.deb`

### 配置AI模型

1. 打开WeChat_Flowwork
2. 进入设置面板
3. 配置你的GLM API Key
4. 开始创作！

---

## 📚 技术架构

### 核心技术栈

- **桌面框架**: Electron 30.0.1
- **前端**: React 18.2.0 + TypeScript 5.2.2 + Tailwind CSS
- **构建工具**: Vite 5.1.6 + vite-plugin-electron
- **AI SDK**: GLM SDK + Model Context Protocol SDK

### 技能系统

WeChat_Flowwork 内置16个核心创作技能：

```
resources/skills/
├── topic-selector/         # 选题搜索
├── emotion-provoker/       # 情绪激发 ⭐
├── emotion-card-generator/ # 成长记录 ⭐
├── ai-writer/              # AI写作
├── title-generator/        # 标题生成
├── style-learner/          # 风格学习
├── smart-layout/           # 智能排版
├── data-analyzer/          # 数据分析
├── data-writer/            # 数据解析
├── image-cropper/          # 图片裁剪
├── image-generation/       # 图片生成
├── wechat-workflow/        # 工作流整合
├── wechat-writing/         # 写作指导
├── cover-generator/        # 封面生成
├── user-guide/             # 用户指南
└── skill-creator/          # 技能创建
```

每个技能遵循标准结构：
- **SKILL.md** - 技能文档和触发条件
- **scripts/** - Python实现代码
- **references/** - 参考资料和最佳实践

### MCP协议支持

通过MCP (Model Context Protocol) 集成外部工具和服务，无限扩展能力边界。

---

## 🛠️ 开发指南

### 常用命令

```bash
npm run dev      # 启动开发服务器
npm run build    # 完整构建
npm run lint     # 代码检查
```

### 文档

- [配置指南](./docs/configuration.md)
- [开发指南](./docs/development.md)
- [技能开发规范](./docs/skill-development.md)

---

## 🤝 合作伙伴

感谢 **智谱AI** 对本项目的支持。

<p align="center">
  <img src="https://i.meee.com.tw/vWOPQjd.png" height="50" alt="GLM">
</p>

<p align="center">
  <sub>🤝 我们欢迎与AI模型提供商合作，共同推动Agent生态发展。<a href="mailto:a976466014@gmail.com">联系我们</a></sub>
</p>

---

## 📄 开源协议

Copyright © 2024 [WeChat_Flowwork Team](https://github.com/opencowork) · [Apache License 2.0](./LICENSE)

---

## 🙏 致谢

- [智谱AI](https://www.bigmodel.cn) - 提供GLM大模型能力

---

<p align="center">
  <b>让真实的内容，连接真实的读者</b> 🚀<br>
  <b>不只追求成功，更追求真实</b> ⭐
</p>
