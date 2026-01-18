---
name: image-generation
description: |
  AI图片生成工具。当用户要求"生成图片"、"画图"、"画一张图"、"制作配图"、
  "AI生图"、"设计海报"、"制作插图"、"创建配图"、"需要图片"、"做个图"、
  "设计图"、"配图"、"生成配图"、"创建图片"时触发此技能。

  直接调用内置脚本：resources/skills/image-generation/scripts/doubao_image_gen.py
  支持多种场景：技术架构图、流程图、封面设计、概念图等。
  输出尺寸：1024x1024、1792x1024、2560x1440
  质量选项：standard、hd
---

# 豆包图像生成Skill

本skill集成火山引擎豆包Seedream 4.5 API，为公众号文章、技术博客、演示等场景快速生成高质量配图。

## ⚡ 快速执行指南（重要）

### 前置条件检查

在生成图片前，请确认：

1. **DOUBAO_API_KEY 已配置**
   - 打开设置面板 → API 配置
   - 确认显示"豆包 API Key：已配置"

2. **输出目录已创建**
   - 检查命令：`dir assets\images` (Windows) 或 `ls assets/images` (Linux/Mac)
   - 如不存在，使用 `run_command` 创建：`mkdir -p assets/images`

3. **工作目录正确**
   - 当前应该在公众号项目目录下（如 `D:\公众号试验\文章标题\`）

### 执行方式

**使用 run_command 工具执行命令**（推荐）：

```bash
python resources/skills/image-generation/scripts/doubao_image_gen.py --prompt "技术架构图，展示微服务系统结构" --size "1792x1024" --quality "hd" --output "assets/images/01-微服务架构.png"
```

**完整工作流程**：
1. 使用 `read_file` 工具读取文章内容
2. 分析需要生成的图片
3. 使用 `run_command` 工具执行上述命令
4. 确认返回信息包含 "Successfully wrote to"
5. 使用 `write_file` 工具更新文章，插入图片引用

### 常见问题

**Q: 提示 "DOUBAO_API_KEY environment variable is not set"**
A: 需要在设置面板配置豆包 API Key

**Q: 生成的图片在哪里？**
A: 保存在指定的输出路径，如 `assets/images/01-xxx.png`

**Q: 如何测试 API Key 是否配置成功？**
A: 运行以下命令测试：
```bash
python resources/skills/image-generation/scripts/doubao_image_gen.py --prompt "测试" --output test.png
```

---

## 🚀 快速开始

### 基础调用

```python
from image-generation.scripts.doubao_image_gen import DoubaoImageGenerator

# 初始化
generator = DoubaoImageGenerator(api_key="your_api_key")

# 生成图像
result = generator.generate_image(
    prompt="技术架构图，展示微服务系统结构",
    size="1792x1024",  # 16:9横版
    quality="hd"
)

print(result["url"])  # 输出图像URL
```

### 命令行使用

```bash
python .claude/skills/image-generation/scripts/doubao_image_gen.py \
  --prompt "技术架构图，展示微服务系统结构" \
  --size "1792x1024" \
  --output "architecture.png"
```

## 📋 参数说明

### size（图像尺寸）

| 尺寸 | 比例 | 适用场景 |
|------|------|----------|
| `1024x1024` | 1:1 | 社交媒体、正方形配图 |
| `1792x1024` | 16:9 | 博客封面、横版图表 |
| `2560x1440` | 16:9 | 高清横版图（推荐⭐） |
| `1024x1792` | 9:16 | 手机壁纸、竖版海报 |

> **⚠️ 重要提示**：
> - 豆包API要求图像至少3,686,400像素
> - 本skill生成的图片为16:9比例，**不能直接用于微信公众号封面**
> - 微信公众号封面需要2.35:1比例（900×383或1080×460）
> - **如果需要微信公众号封面，请使用 `cover-generator` skill**
> - cover-generator会先生成16:9底图，再智能裁剪为2.35:1

### quality（图像质量）

- `standard`：快速生成，适合预览（默认）
- `hd`：高质量输出，适合发布使用

### model（模型选择）

- `doubao-seedream-4-5-251128`：最新4.5版本（推荐）
- `doubao-seedream-4-0-250828`：4.0版本

## 🎨 Prompt模板

本skill提供了丰富的prompt模板库，位于 `references/prompt-templates.md`：

### 技术图表模板

- **架构图**：展示系统分层、组件关系
- **流程图**：展示业务流程、步骤顺序
- **对比表格**：对比两个技术/方案的差异
- **数据图表**：展示性能指标、统计数据

### 文章配图模板

- **微信封面**：2.35:1横版（需考虑分享裁剪，关键内容居中）
- **技术封面**：科技感渐变背景+主题图标
- **概念解释**：分步骤图解技术原理
- **代码演示**：IDE风格的代码编辑器界面

使用方式：见 `references/prompt-templates.md`

## 🎨 风格系统（新特性）

本skill现在支持**小红书风格 + 公众号规范**的风格模板系统，自动生成高质量的封面和配图。

### 14种预设风格

#### 现有风格（5种）

| 风格代码 | 风格名称 | 适用场景 | 配色特点 |
|---------|---------|---------|---------|
| `tech` | 专业科技 | 技术文章、AI主题、编程教程 | 深蓝→紫色渐变，白色文字 |
| `fresh` | 清新活泼 | 生活分享、学习笔记、成长记录 | 薄荷绿→暖黄渐变，深绿文字 |
| `minimal` | 简约极简 | 哲学思考、深度观点、极简主义 | 浅灰白背景，深灰文字 |
| `warm` | 温暖治愈 | 情感文章、成长感悟、人生故事 | 暖黄→粉红渐变，深棕文字 |
| `business` | 商务专业 | 商业分析、数据报告、市场研究 | 深蓝背景，白色文字 |

#### 新增风格（9种，来自宝玉）

| 风格代码 | 风格名称 | 适用场景 | 配色特点 |
|---------|---------|---------|---------|
| `elegant` | 优雅精致 | 商业分析、领导力内容、专业服务 | Warm cream 背景，珊瑚色强调 |
| `bold` | 高对比冲击 | 观点文章、重要提醒、警告内容 | 黑色背景，鲜艳红/黄文字 |
| `playful` | 活泼趣味 | 教程指南、轻松内容、入门教程 | Light cream 背景，薄荷绿强调 |
| `nature` | 自然有机 | 环保健康、自然主题、可持续发展 | Sand beige 背景，森林绿文字 |
| `sketch` | 手绘草图 | 头脑风暴、创意过程、概念设计 | Off-white 背景，铅笔灰文字 |
| `notion` | Notion 极简线条 | 知识分享、概念解释、生产力工具 | 纯白背景，黑色极简线条 |

### 使用风格系统

#### 方式1：Python代码

```python
from image_generation.scripts.style_prompt_builder import build_prompt

# 生成专业科技风格封面提示词
prompt = build_prompt(
    title="智谱上市579亿",
    style="tech",
    scene_type="cover",
    subtitle="GLM-4.7实测"
)
print(prompt)

# 自动匹配风格
prompt = build_prompt(
    title="我的学习笔记和成长感悟",
    style="auto",  # 自动匹配为 fresh 风格
    scene_type="cover"
)
```

#### 方式2：命令行（cover-generator）

```bash
# 使用专业科技风格
python .claude/skills/cover-generator/scripts/cover_generator.py \
  --use-style \
  --title "智谱上市579亿" \
  --style tech \
  --subtitle "GLM-4.7实测"

# 自动匹配风格
python .claude/skills/cover-generator/scripts/cover_generator.py \
  --use-style \
  --title "我的学习笔记" \
  --style auto
```

### 风格系统特点

✅ **融合小红书风格优点**
- 清晰的文字层级和留白
- 高对比度配色，确保可读性
- 精致的视觉设计

✅ **遵循公众号特殊要求**
- 2.35:1 横版比例
- 中心60%安全区域设计
- 双重场景优化（封面+分享卡片）
- 防裁剪设计

✅ **自动风格匹配**
- 基于内容关键词智能推荐风格
- 技术关键词 → tech
- 生活关键词 → fresh
- 情感关键词 → warm
- 商业关键词 → business 或 elegant
- 观点/警告 → bold
- 教程/指南 → playful
- 环保/健康 → nature
- 头脑风暴/创意 → sketch
- 知识分享/概念 → notion（默认）

### 完整示例

参考文档：
- `references/style-templates.md` - 5种风格的完整定义
- `references/combination-examples.md` - 10个完整提示词示例
- `references/xiaohongshu-style-guide.md` - 小红书风格规范
- `references/wechat-cover-guide.md` - 公众号封面设计指南

## 🎯 场景选择指南

### AI生图适合的场景 ✅

**营销推广类**（AI擅长 ⭐⭐⭐⭐⭐）
- 社交媒体海报（小红书/微博/朋友圈风格）
- 活动宣传海报（节日、促销、新品发布）
- Banner广告图（网站横幅、App启动页）
- 产品展示图（场景化产品渲染）

**创意设计类**（AI擅长 ⭐⭐⭐⭐⭐）
- Logo和图标设计（品牌标识、功能图标）
- 场景插画（故事背景、概念艺术）
- 背景纹理（渐变背景、抽象图案）

**教育培训类**（AI较擅长 ⭐⭐⭐）
- 思维导图（仅关键词版本，文字不宜过多）
- 教学插图（场景化示意图，文字<50字）
- 知识卡片（概念卡片、名言警句）
- 时间轴（历史事件、项目里程碑）

**内容创作类**（AI擅长 ⭐⭐⭐⭐⭐）
- 文章封面（科技感渐变、主题图标）
- 概念示意图（抽象概念可视化）
- 背景配图（氛围感强的背景图）

### AI生图不适合的场景 ❌

**精确技术图表**（建议使用专业工具）
- 包含大量文字的对比表格 → Excel/PPT/Numbers
- 复杂的代码展示 → IDE截图（VS Code/IntelliJ）
- 精确的数据图表 → ECharts/Excel/Tableau
- 详细的技术架构图 → Draw.io/ProcessOn/Lucidchart

**原因**：当前AI模型的文字渲染能力有限，可能产生错别字、文字模糊或布局混乱。

### 场景选择决策树

```
1. 需要生成图像？
   ↓ 是
2. 图像主要用途？
   ├─ 营销推广 → ✅ 使用AI生图（优先级最高）
   ├─ 创意设计 → ✅ 使用AI生图（优先级最高）
   ├─ 教育培训 → ⚠️ 谨慎使用（文字少则可用）
   ├─ 内容创作 → ✅ 推荐AI生图
   └─ 精确技术图表 → ❌ 使用专业工具
   ↓
3. 图像中文字内容？
   ├─ 几乎没有文字 → ✅ 强烈推荐AI
   ├─ 少量标题/标语 → ✅ 推荐AI
   ├─ 中等文字量 → ⚠️ 可尝试AI，需验证效果
   └─ 大量文字/数据 → ❌ 不推荐AI
```

### 快速参考表

| 场景类型 | AI生图适用性 | 推荐工具 | 推荐尺寸 |
|---------|------------|---------|---------|
| 社交媒体海报 | ⭐⭐⭐⭐⭐ | AI生图 | 1024×1024 |
| 活动宣传海报 | ⭐⭐⭐⭐⭐ | AI生图 | 1024×1792 |
| Banner广告 | ⭐⭐⭐⭐⭐ | AI生图 | 1792×1024 |
| Logo设计 | ⭐⭐⭐⭐ | AI生图 | 1024×1024 |
| 场景插画 | ⭐⭐⭐⭐⭐ | AI生图 | 1792×1024 |
| 背景纹理 | ⭐⭐⭐⭐⭐ | AI生图 | 1792×1024 |
| 文章封面 | ⭐⭐⭐⭐⭐ | AI生图 | 1792×1024 |
| 思维导图 | ⭐⭐⭐ | XMind → AI辅助 | 1792×1024 |
| 教学插图 | ⭐⭐⭐ | AI生图（文字少） | 1792×1024 |
| 技术架构图 | ⭐⭐ | Draw.io | 任意 |
| 代码展示 | ⭐ | IDE截图 | 任意 |
| 数据对比表格 | ⭐ | Excel/PPT | 任意 |

### 推荐组合策略

**最佳实践**：AI + 专业工具组合

```
营销海报：AI生成底图 → Canva添加文字
Logo设计：AI生成创意方向 → Figma精修
技术文档：AI生成素材 → Draw.io组合
数据报告：AI生成配色灵感 → ECharts实现
```

## 💡 最佳实践

### Prompt工程原则

1. **基础公式**：主体 + 场景 + 风格
   ```
   技术架构图 + 微服务系统结构 + 扁平化科技风格
   ```

2. **进阶公式**：主体描述 + 场景描述 + 风格定义 + 镜头语言 + 氛围词 + 细节修饰
   ```
   技术架构图，展示微服务的3层架构
   从上到下依次是：API网关、业务服务、数据层
   使用蓝色和橙色配色方案
   箭头表示数据流向
   扁平化设计，科技感
   白色背景，16:9比例
   ```

3. **关键原则**：
   - ✅ 具体描述（"蓝色渐变卡片" > "好看的卡片"）
   - ✅ 结构清晰（"从左到右分4个步骤" > "多个步骤"）
   - ✅ 包含风格（"扁平化科技风格" > "现代风格"）

### 成本优化建议

1. **开发阶段**：使用 `standard` 质量和 `1024x1024` 尺寸
2. **批量生成**：先单张测试，满意后再批量
3. **智能缓存**：相似prompt可复用结果
4. **API Key管理**：使用环境变量 `DOUBAO_API_KEY`

## 🔗 集成方式

### 与wechat-workflow配合

在公众号文章创作流程中，本skill可作为：

1. **自动配图生成器**
   - 读取 `02_文章内容.md`
   - 识别图片占位符 `![配图：xxx]`
   - 根据上下文生成对应图片
   - 自动替换占位符

2. **手动配图工具**
   - 用户描述配图需求
   - 生成多个版本供选择
   - 下载并插入文章

### 批量生成流程

```python
prompts = [
    "迁移流程图：DeepSeek → GLM",
    "技术指标图表：GLM-4.7性能数据",
    "对比表格：GLM vs DeepSeek"
]

results = generator.batch_generate(
    prompts=prompts,
    size="1792x1024",
    quality="hd"
)

# 批量下载到assets目录
for i, result in enumerate(results):
    generator.download_image(
        result["url"],
        f"assets/images/0{i+1}_配图.png"
    )
```

## 📚 参考文档

- **Prompt模板库**：`references/prompt-templates.md`
- **最佳实践指南**：`references/best-practices.md`
- **火山引擎官方文档**：https://www.volcengine.com/docs/82379/1541523

## ⚙️ 环境配置

### 安装依赖

```bash
pip install openai requests
```

### 配置API Key

**方式1：环境变量（推荐）**
```bash
export DOUBAO_API_KEY="your_api_key"
```

**方式2：代码中硬编码**
```python
api_key = "your_api_key"  # 不推荐生产环境
```

## 🔧 故障排查

### 常见问题

**Q1：生成失败，提示"API key无效"**
- 检查 `api_key` 是否正确
- 确认API key有足够余额

**Q2：生成速度慢**
- 尝试使用 `quality="standard"`
- 检查网络连接

**Q3：生成结果不符合预期**
- 优化prompt，添加更多细节
- 参考prompt模板库中的示例
- 尝试调整 `size` 参数

**Q4：图像尺寸过大**
- 使用tinypng.com或ImageMagick压缩
- 生成时选择较小尺寸

## 🔄 API 失败时的备选方案

当豆包 API 不可用时，您可以使用以下备选方案：

### 方案 1：使用 cover-generator（推荐 ⭐）

**适用场景**：需要生成公众号封面、分享卡片

**优势**：
- ✅ 支持纯色和渐变背景（无需 API）
- ✅ 内置 5 种预设风格（tech、fresh、minimal、warm、business）
- ✅ 自动生成文字标题
- ✅ 智能裁剪和分享卡片同步

**使用方式**：
```
生成封面：AI技术趋势，使用专业科技风格
```

### 方案 2：在线设计工具

**Canva（可画）** - https://www.canva.cn
- ✅ 免费使用大量模板
- ✅ 支持公众号封面尺寸（900×383）
- ✅ 在线编辑，无需下载
- ✅ 中文界面，操作简单

**稿定设计** - https://www.gaoding.com
- ✅ 专业的公众号封面模板
- ✅ 支持团队协作
- ✅ 提供设计元素库

**创客贴** - https://www.chuangkit.com
- ✅ 海量免费模板
- ✅ 快速编辑和导出
- ✅ 支持多种设计场景

### 方案 3：使用本地图片工具

**Pillow（Python）**
```python
from PIL import Image, ImageDraw, ImageFont

# 创建渐变背景
img = Image.new('RGB', (1792, 1024), color='#4A90E2')
draw = ImageDraw.Draw(img)

# 添加标题
font = ImageFont.truetype('arial.ttf', 80)
draw.text((100, 400), "AI技术趋势", fill='white', font=font)

img.save('cover.png')
```

**Figma / Sketch**
- ✅ 专业设计工具
- ✅ 精确控制布局
- ✅ 可复用模板

### 方案 4：使用其他 AI 生图服务

**Midjourney**
- ✅ 艺术效果好
- ✅ 社区支持活跃
- ❌ 需要付费订阅

**Stable Diffusion**
- ✅ 开源免费
- ✅ 可本地部署
- ❌ 配置复杂

**DALL-E 3**
- ✅ 文字渲染能力强
- ✅ ChatGPT 集成
- ❌ 需要付费

### 方案选择建议

| 场景 | 推荐方案 | 原因 |
|------|---------|------|
| 公众号封面 | cover-generator | 无需 API，内置风格 |
| 营销海报 | Canva | 模板丰富，操作简单 |
| 技术图表 | Figma | 精确控制，专业输出 |
| 快速原型 | Pillow | 代码生成，可定制 |
| 艺术创作 | Midjourney | 效果最好 |

### 如何判断 API 是否可用

运行以下测试：
```bash
python .claude/skills/image-generation/scripts/doubao_image_gen.py \
  --prompt "测试" \
  --output test.png
```

如果看到 "生成失败" 或 API 错误，建议使用备选方案。

---

**最后更新**：2026-01-11
**Skill版本**：v1.0
**模型版本**：doubao-seedream-4-5-251128
