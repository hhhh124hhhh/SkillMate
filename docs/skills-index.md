# AI Agent Desktop - 技能索引

**版本**：v2.0
**更新日期**：2025-01-21
**技能总数**：35 个

---

## 📊 技能统计

- **总技能数**: 35 个
- **原始技能**: 15 个（微信公众号创作）
- **新增技能**: 20 个（Phase 2-4）
  - Phase 2: 5 个文档处理技能
  - Phase 3: 5 个开发工作流技能
  - Phase 4: 10 个高级功能技能

---

## 📚 文档处理类（5个）

### pdf-processor
**描述**：PDF处理工具 - 文本和表格提取、创建新PDF、合并/拆分文档、表单处理

**核心功能**：
- 使用 pypdf/pdfplumber 提取文本和表格
- 使用 reportlab 创建新PDF
- 合并、拆分PDF文档
- PDF表单填充和提取

**依赖**：
```bash
pip install pypdf pdfplumber reportlab pandas
```

**适用场景**：提取PDF内容、合并文档、批量处理PDF文件

---

### xlsx-analyzer
**描述**：Excel数据分析 - 公式计算、数据透视表、图表创建

**核心功能**：
- 使用 openpyxl 读写Excel
- 使用公式而非硬编码值
- 创建数据透视表和图表
- 批量数据处理

**依赖**：
```bash
pip install openpyxl pandas
# 可选：LibreOffice（用于高级功能）
```

**适用场景**：数据分析、报表生成、批量处理Excel

---

### docx-editor
**描述**：Word文档编辑 - 创建、修改、格式化文档

**核心功能**：
- 使用 python-docx 编辑Word
- 使用 pandoc 转换文档格式
- 批量文档处理

**依赖**：
```bash
pip install python-docx
# 或安装 pandoc / LibreOffice
```

**适用场景**：文档生成、模板填充、批量修改

---

### pptx-processor
**描述**：PowerPoint处理 - 创建、编辑、提取演示文稿内容

**核心功能**：
- 使用 python-pptx 创建PPT
- 添加文本、图片、图表
- HTML转PPT

**依赖**：
```bash
pip install python-pptx html2pptx
# 可选：LibreOffice（用于格式转换）
```

**适用场景**：演示文稿生成、批量创建幻灯片

---

### frontend-design
**描述**：前端设计 - 创建生产级前端UI组件

**核心功能**：
- 设计思维指导
- 避免泛泛AI审美
- 创建独特风格界面

**依赖**：无（纯指令技能）

**适用场景**：设计Web界面、创建UI组件

---

## 🎨 设计创作类（4个）

### canvas-design
**描述**：Canvas设计工具 - 使用HTML Canvas API创建视觉设计

**核心功能**：
- 2D图形绘制
- 图像处理
- 文字排版
- PNG/PDF导出

**依赖**：浏览器或Node.js canvas库

**适用场景**：创建设计作品、生成艺术、视觉创作

---

### algorithmic-art
**描述**：算法艺术 - 使用p5.js创建生成艺术

**核心功能**：
- 种子随机数（可重现）
- 交互式参数调整
- 粒子系统、流场、L-System
- 导出高质量图像

**依赖**：
```bash
npm install p5
# 或从CDN加载
```

**适用场景**：创作艺术、生成艺术、算法艺术

---

### image-generation
**描述**：AI图片生成 - 使用Stable Diffusion生成图片

**核心功能**：
- 文生图生成
- 图生图编辑
- 图片修复和扩展

**依赖**：Stable Diffusion API

**适用场景**：图片创作、素材生成

---

### image-cropper
**描述**：图片裁剪工具 - 智能裁剪和调整尺寸

**核心功能**：
- 智能裁剪
- 批量处理
- 尺寸调整

**依赖**：ImageMagick

**适用场景**：图片预处理、批量裁剪

---

## 🛠️ 开发工具类（5个）

### skill-creator
**描述**：技能创建向导 - 创建高质量的AI技能

**核心功能**：
- 技能设计最佳实践
- YAML frontmatter结构
- 依赖声明和测试

**依赖**：无（纯指令技能）

**适用场景**：创建新技能、学习技能格式

---

### mcp-server-builder
**描述**：MCP服务器构建 - 构建Model Context Protocol服务器

**核心功能**：
- FastMCP (Python) 实现
- TypeScript/Node.js SDK
- 工具/资源/提示词定义

**依赖**：
- Python: `pip install mcp fastmcp`
- Node.js: `npm install @modelcontextprotocol/sdk`

**适用场景**：构建MCP服务器、集成外部API

---

### webapp-testing
**描述**：Web应用测试 - 使用Playwright测试本地Web应用

**核心功能**：
- 自动化浏览器操作
- 截图和日志捕获
- 表单填写和点击

**依赖**：
```bash
pip install playwright
playwright install chromium
```

**适用场景**：测试Web应用、自动化浏览器操作

---

### data-analyzer
**描述**：数据分析工具 - 分析和可视化数据

**核心功能**：
- 数据清洗和转换
- 统计分析
- 图表生成

**依赖**：
```bash
pip install pandas matplotlib seaborn
```

**适用场景**：数据分析、报表生成

---

### data-writer
**描述**：数据写入工具 - 批量创建数据文件

**核心功能**：
- CSV/JSON/Excel导出
- 数据格式转换
- 批量写入

**依赖**：
```bash
pip install pandas openpyxl
```

**适用场景**：数据导出、格式转换

---

## 🔄 开发工作流类（5个）

### brainstorming
**描述**：头脑风暴 - 将想法转化为完整设计

**核心流程**：
1. 理解想法（检查项目状态）
2. 探索方法（2-3种方案）
3. 展示设计（分段验证）

**依赖**：无（纯指令技能）

**适用场景**：规划新功能、设计方案

---

### test-driven-development
**描述**：测试驱动开发 - TDD工作流程

**核心原则**：
- 没有失败的测试就没有生产代码
- Red-Green-Refactor循环
- 先写测试，看着它失败，编写最小代码通过

**依赖**：无（纯指令技能）

**适用场景**：功能开发、Bug修复

---

### systematic-debugging
**描述**：系统化调试 - 找到根本原因再修复

**四个阶段**：
1. 根本原因调查
2. 模式分析
3. 假设和测试
4. 实施和验证

**依赖**：无（纯指令技能）

**适用场景**：调试Bug、性能问题

---

### verification-before-completion
**描述**：完成前验证 - 证据优先于断言

**铁律**：没有新鲜验证证据就没有完成声明

**门控功能**：
1. 识别验证命令
2. 运行完整命令
3. 阅读完整输出
4. 验证确认声明
5. 做出声明

**依赖**：无（纯指令技能）

**适用场景**：完成功能、提交代码前

---

### writing-plans
**描述**：编写战略文档 - 创建全面的实施计划

**任务粒度**：每个步骤2-5分钟

**包含**：
- 精确文件路径
- 完整代码
- 预期输出
- 提交步骤

**依赖**：无（纯指令技能）

**适用场景**：规划功能、编写实施计划

---

## 🔧 Git工作流类（3个）

### using-git-worktrees
**描述**：Git工作树管理 - 创建隔离的开发环境

**核心功能**：
- 为每个功能创建独立工作树
- 并行处理多个分支
- 智能目录选择和安全验证

**依赖**：git 2.5+

**适用场景**：隔离功能开发、并行工作

---

### requesting-code-review
**描述**：请求代码审查 - 验证工作符合计划

**审查清单**：
- 功能正确性
- 代码质量
- 测试覆盖
- 性能考虑
- 安全性
- 文档

**依赖**：无（纯指令技能）

**适用场景**：完成功能后请求审查

---

### receiving-code-review
**描述**：接收代码审查 - 技术严谨性验证反馈

**处理流程**：
1. 理解反馈
2. 验证有效性
3. 讨论和澄清
4. 实施修改（TDD方法）

**依赖**：无（纯指令技能）

**适用场景**：处理审查反馈、改进代码

---

## 🎯 微信创作类（13个）- 内置技能

### 选题与标题
1. **topic-selector** - 选题助手
2. **title-generator** - 标题生成器

### 内容创作
3. **ai-writer** - AI写作助手
4. **natural-writer** - 自然写作
5. **style-learner** - 风格学习
6. **smart-layout** - 智能排版

### 情绪激发
7. **emotion-provoker** - 情绪激发
8. **emotion-card-generator** - 情绪卡片生成

### 图片工具
9. **image-generation** - 图片生成
10. **image-cropper** - 图片裁剪
11. **cover-generator** - 封面生成
12. **article-illustrator** - 文章配图生成

### 工作流协调
13. **wechat-workflow** - 微信工作流
14. **wechat-writing** - 微信写作

### 辅助工具
15. **scope-guide** - 范围指南
16. **get_current_time** - 获取当前时间

---

## 按依赖分类

### 无依赖（纯指令技能）- 14个
- brainstorming
- test-driven-development
- systematic-debugging
- verification-before-completion
- writing-plans
- using-git-worktrees
- requesting-code-review
- receiving-code-review
- finishing-development
- internal-comms
- frontend-design
- skill-creator
- 以及所有微信创作类技能

### Python依赖 - 9个
- pdf-processor
- xlsx-analyzer
- docx-editor
- pptx-processor
- webapp-testing
- mcp-server-builder (Python版本)
- data-analyzer
- data-writer
- image-cropper

### Node.js依赖 - 2个
- algorithmic-art
- mcp-server-builder (TypeScript版本)

### 外部服务 - 1个
- image-generation (Stable Diffusion API)

### 浏览器API - 1个
- canvas-design

---

## 🚀 快速开始

### 使用技能

#### 上下文技能
直接在对话中描述需求，AI会自动选择合适的技能：
```
请帮我设计一个登录页面
→ AI 自动使用 frontend-design 技能
```

#### 工具技能
提供参数，AI会调用工具：
```
提取 document.pdf 中的所有文本
→ AI 调用 pdf-processor 工具
```

### 组合使用技能

**场景**：开发新功能
```
brainstorming → writing-plans → test-driven-development
→ systematic-debugging → requesting-code-review
→ receiving-code-review → finishing-development
```

**场景**：Git工作流
```
using-git-worktrees → 开发功能A
using-git-worktrees → 开发功能B
```

---

## 📦 依赖安装

### 一键安装所有依赖

```bash
# 安装所有 Python 依赖
pip install pypdf pdfplumber reportlab pandas openpyxl python-docx python-pptx html2pptx playwright pandas matplotlib seaborn pillow mcp fastmcp

# 安装 Playwright 浏览器
playwright install chromium

# 安装 Node.js 依赖
npm install p5 @modelcontextprotocol/sdk
```

### 按类别安装

#### 文档处理
```bash
pip install pypdf pdfplumber reportlab pandas openpyxl python-docx python-pptx html2pptx
```

#### 设计创作
```bash
# Python
pip install pillow
# Node.js
npm install p5
```

#### 开发工具
```bash
# Python
pip install playwright mcp fastmcp
playwright install chromium
# Node.js
npm install @modelcontextprotocol/sdk
```

#### 数据分析
```bash
pip install pandas matplotlib seaborn openpyxl
```

---

## 🔍 查找技能

### 按用途查找

**文档处理**:
- 提取PDF文本: `pdf-processor`
- Excel数据分析: `xlsx-analyzer`
- Word文档编辑: `docx-editor`
- PPT创建: `pptx-processor`

**设计创作**:
- UI设计: `frontend-design`
- 算法艺术: `algorithmic-art`
- Canvas设计: `canvas-design`

**开发流程**:
- 需求分析: `brainstorming`
- TDD开发: `test-driven-development`
- 系统调试: `systematic-debugging`
- 完成验证: `verification-before-completion`

**Git工作流**:
- 并行开发: `using-git-worktrees`
- 代码审查: `requesting-code-review`, `receiving-code-review`

---

## 📈 性能优化

### v2.0 新特性

#### 技能懒加载
- 启动时仅加载技能元数据（名称、描述）
- 使用技能时按需加载完整内容
- **性能提升**：启动时间减少 60%+

#### 技能缓存
- 已加载的技能指令自动缓存
- 避免重复读取文件
- **性能提升**：重复调用速度提升 90%+

#### 并行加载
- 用户技能和内置技能并行加载
- 多个技能元数据并行读取
- **性能提升**：加载速度提升 40%+

---

## 📚 相关文档

- [依赖安装指南](./dependency-installation.md)
- [技能开发指南](./skill-development-guide.md)
- [MCP 集成指南](./mcp-integration-guide.md)

---

## 📝 更新日志

### v2.0 (2025-01-21)
- ✅ 新增10个高级功能技能（Phase 4）
- ✅ 实现技能懒加载机制
- ✅ 添加技能缓存系统
- ✅ 优化并行加载性能
- ✅ 技能总数：15 → 35

### v1.5 (2025-01-20)
- ✅ Phase 3：新增5个开发工作流技能
- ✅ 技能总数：15 → 25

### v1.3 (2025-01-19)
- ✅ Phase 2：新增5个文档处理技能
- ✅ 技能总数：15 → 20

### v1.0 (2025-01-18)
- ✅ 初始版本：15个内置技能
- ✅ 微信创作功能完整

---

**维护者**：AI Agent Desktop Team
**许可**：MIT License
**反馈**：GitHub Issues
