# 风格系统快速开始指南

5分钟上手公众号图片生成风格系统。

---

## 🎯 系统概述

风格系统融合了**小红书的视觉设计优点**和**公众号的特殊要求**，提供5种预设风格，自动生成高质量的封面和配图。

### 核心特点

✅ **5种预设风格**：专业科技、清新活泼、简约极简、温暖治愈、商务专业
✅ **自动风格匹配**：根据内容智能推荐最合适的风格
✅ **小红书风格**：清晰文字层级、合理留白、高对比度配色
✅ **公众号规范**：2.35:1比例、安全区域设计、防裁剪优化

---

## 🚀 5分钟快速上手

### 第1步：选择风格（1分钟）

根据你的文章内容选择合适的风格：

| 文章类型 | 推荐风格 | 关键词示例 |
|---------|---------|----------|
| 技术文章、AI主题 | **专业科技** (tech) | 技术、AI、代码、编程、架构 |
| 学习笔记、成长记录 | **清新活泼** (fresh) | 学习、笔记、成长、日常、分享 |
| 哲学思考、深度观点 | **简约极简** (minimal) | 思考、观点、哲学、本质、深度 |
| 情感文章、人生感悟 | **温暖治愈** (warm) | 情感、感悟、治愈、温暖、陪伴 |
| 商业分析、数据报告 | **商务专业** (business) | 商业、市场、分析、数据、报告 |

**不会选？** 使用 `auto` 让系统自动匹配！

### 第2步：准备内容（1分钟）

准备两个核心要素：

1. **主标题**：文章的核心主题（必填）
   - 示例："智谱上市579亿"
   - 建议：≤10个字

2. **副标题**：补充说明或核心数据（可选）
   - 示例："GLM-4.7实测"
   - 建议：≤15个字

### 第3步：生成提示词（2分钟）

#### 方式A：使用Python代码

```python
from image_generation.scripts.style_prompt_builder import build_prompt

# 生成提示词
prompt = build_prompt(
    title="智谱上市579亿",      # 主标题
    style="tech",              # 风格
    scene_type="cover",        # 场景：封面(cover) 或 配图(illustration)
    subtitle="GLM-4.7实测"     # 副标题（可选）
)

print(prompt)
```

#### 方式B：使用命令行

```bash
cd D:\gongzhonghao_skills

# 使用风格系统生成封面
python .claude/skills/cover-generator/scripts/cover_generator.py \
  --use-style \
  --title "智谱上市579亿" \
  --style tech \
  --subtitle "GLM-4.7实测"
```

### 第4步：生成图片（1分钟）

将生成的提示词输入到豆包图像生成API，或使用cover-generator自动生成：

```bash
# 上一步的命令会自动调用API生成图片
# 图片保存在：output/cover_<timestamp>/ 目录
```

**完成！** 你已经生成了第一张使用风格系统的公众号封面。

---

## 📖 实战示例

### 示例1：技术文章封面

**场景**：写一篇关于GLM-4.7的技术文章

**步骤**：

```python
# 1. 选择风格：专业科技 (tech)
# 2. 准备内容
title = "GLM-4.7深度评测"
subtitle = "代码能力对标Claude Sonnet 4.5"

# 3. 生成提示词
from image_generation.scripts.style_prompt_builder import build_prompt

prompt = build_prompt(
    title=title,
    style="tech",
    subtitle=subtitle,
    scene_type="cover"
)

# 4. 生成图片（使用cover-generator）
# 见下方命令
```

```bash
python .claude/skills/cover-generator/scripts/cover_generator.py \
  --use-style \
  --title "GLM-4.7深度评测" \
  --style tech \
  --subtitle "代码能力对标Claude Sonnet 4.5"
```

**预期效果**：
- 深蓝到紫色渐变背景
- 白色文字清晰醒目
- AI芯片图标增强科技感
- 所有内容在中心安全区域

### 示例2：学习笔记封面

**场景**：分享你的AI学习笔记

**步骤**：

```python
# 1. 选择风格：清新活泼 (fresh)
# 2. 准备内容
title = "6个AI编程技巧"
subtitle = "从DeepSeek到GLM"

# 3-4. 同上...
```

```bash
python .claude/skills/cover-generator/scripts/cover_generator.py \
  --use-style \
  --title "6个AI编程技巧" \
  --style fresh \
  --subtitle "从DeepSeek到GLM"
```

**预期效果**：
- 薄荷绿到暖黄渐变背景
- 深绿色文字清新易读
- emoji和星星增添活力
- 整体轻松友好

### 示例3：自动风格匹配

**场景**：不确定该用什么风格

**步骤**：

```python
# 1. 使用 auto 风格，让系统自动匹配
from image_generation.scripts.style_prompt_builder import build_prompt

prompt = build_prompt(
    title="我的学习笔记和成长感悟",  # 包含"学习"和"感悟"关键词
    style="auto",  # 自动匹配
    scene_type="cover"
)
# 系统会匹配为 fresh（清新活泼）风格
```

```bash
# 命令行方式
python .claude/skills/cover-generator/scripts/cover_generator.py \
  --use-style \
  --title "我的学习笔记和成长感悟" \
  --style auto  # 自动匹配风格
```

---

## 🎨 5种风格速查表

### 1. 专业科技 (tech)

**配色**：深蓝(#1E3A8A) → 紫色(#7C3AED) + 白色文字

**适合**：
- ✅ 技术文章、AI主题
- ✅ 编程教程、架构分析
- ✅ 数据报告、性能测试

**示例标题**：
- "GLM-4.7深度评测"
- "微服务架构最佳实践"
- "Python性能优化指南"

### 2. 清新活泼 (fresh)

**配色**：薄荷绿(#A7F3D0) → 暖黄(#FCD34D) + 深绿文字

**适合**：
- ✅ 学习笔记、成长记录
- ✅ 生活分享、日常感悟
- ✅ 轻科普、入门教程

**示例标题**：
- "6个AI编程技巧"
- "我的学习笔记"
- "成长路上的收获"

### 3. 简约极简 (minimal)

**配色**：浅灰白(#F9FAFB) + 深灰(#1F2937)文字

**适合**：
- ✅ 哲学思考、深度观点
- ✅ 极简主义、断舍离
- ✅ 高端访谈、抽象概念

**示例标题**：
- "技术的本质"
- "极简生活指南"
- "深度思考：什么是成功"

### 4. 温暖治愈 (warm)

**配色**：暖黄(#FDE68A) → 粉红(#FCA5A5) + 深棕文字

**适合**：
- ✅ 情感文章、心理疗愈
- ✅ 成长感悟、人生故事
- ✅ 温暖的日常记录

**示例标题**：
- "与自己和解"
- "成长路上的三个阶段"
- "温暖的陪伴"

### 5. 商务专业 (business)

**配色**：深蓝(#1E40AF) + 白色文字

**适合**：
- ✅ 商业分析、市场研究
- ✅ 数据报告、行业洞察
- ✅ 专业解读、趋势分析

**示例标题**：
- "2024 AI市场分析"
- "Q4季度数据报告"
- "行业趋势洞察"

---

## 💡 常见问题

### Q1: 如何选择合适的风格？

**A**: 看文章的核心主题：

1. **技术类** → 专业科技 (tech)
2. **生活/学习类** → 清新活泼 (fresh)
3. **哲学/思考类** → 简约极简 (minimal)
4. **情感/治愈类** → 温暖治愈 (warm)
5. **商业/数据类** → 商务专业 (business)

**不确定？** 使用 `auto` 让系统自动匹配！

### Q2: 封面和配图风格需要一致吗？

**A**: 建议一致。系列文章保持风格统一有助于建立品牌识别。

```python
# 封面
prompt_cover = build_prompt(title="AI教程", style="tech", scene_type="cover")

# 配图
prompt_illustration = build_prompt(title="AI教程", style="tech", scene_type="illustration", content="...")
```

### Q3: 可以自定义配色吗？

**A**: 可以修改提示词模板，但要注意：

- 保持对比度 ≥ 4.5:1（AA级）
- 推荐 ≥ 7:1（AAA级）
- 使用在线工具验证：https://webaim.org/resources/contrastchecker/

### Q4: 生成的图片尺寸是固定的吗？

**A**: 根据场景自动选择：

- 封面 (cover)：900×383 (2.35:1)
- 配图 (illustration)：1792×1024 (16:9)

### Q5: 如何保证关键内容不被裁剪？

**A**: 风格系统已内置安全区域设计：

- 所有关键内容在中心60%区域
- 裁剪为1:1后标题依然完整
- 边缘只放装饰元素

---

## 📚 进阶使用

### 1. 系列文章保持风格一致

```python
# 系列文章1
prompt1 = build_prompt(title="AI教程（1）：入门", style="tech", scene_type="cover")

# 系列文章2
prompt2 = build_prompt(title="AI教程（2）：进阶", style="tech", scene_type="cover")

# 系列文章3
prompt3 = build_prompt(title="AI教程（3）：实战", style="tech", scene_type="cover")
```

### 2. 批量生成不同风格对比

```python
# 同一标题，5种风格
styles = ["tech", "fresh", "minimal", "warm", "business"]

for style in styles:
    prompt = build_prompt(
        title="AI技术分享",
        style=style,
        scene_type="cover"
    )
    # 保存到不同文件供选择
    print(f"\n=== {style} 风格 ===\n{prompt}\n")
```

### 3. 配图提示词详细化

```python
# 生成配图时，可以添加详细内容描述
prompt = build_prompt(
    title="AI编程技巧",
    style="fresh",
    scene_type="illustration",
    content="""
    列表内容（2列3行布局）：
    1. 🚀 使用结构化提示词
    2. 💡 分解复杂任务
    3. 🔄 迭代优化结果
    4. 📝 添加示例代码
    5. ⚡ 优化响应速度
    6. 🎯 测试验证结果
    """
)
```

---

## 🎯 最佳实践

### ✅ DO（推荐做法）

1. **标题简洁有力**
   - ✅ "GLM-4.7深度评测"
   - ❌ "今天我要给大家详细介绍一下GLM-4.7这款大语言模型的强大功能和实际应用效果"

2. **保持系列文章风格统一**
   - ✅ 同一系列使用相同风格
   - ❌ 每篇文章都用不同风格

3. **副标题补充关键信息**
   - ✅ 主标题："智谱上市"，副标题："579亿估值"
   - ❌ 主标题过长，包含所有信息

4. **利用自动匹配功能**
   - ✅ 不确定时使用 `auto`
   - ❌ 强行使用不合适的风格

### ❌ DON'T（避免做法）

1. **不要过度使用emoji**
   - 虽然fresh和warm风格支持emoji，但要适量

2. **不要忽略安全区域**
   - 风格系统已内置，但生成后还是要检查

3. **不要频繁更换风格**
   - 系列文章保持一致性

4. **不要忽略可读性**
   - 配色对比度必须足够

---

## 📖 完整文档

- **风格定义**：`style-templates.md` - 5种风格的完整配置
- **示例集合**：`combination-examples.md` - 10个完整提示词示例
- **小红书规范**：`xiaohongshu-style-guide.md` - 小红书风格设计规范
- **公众号指南**：`wechat-cover-guide.md` - 公众号封面设计要求
- **提示词构建器**：`scripts/style_prompt_builder.py` - 核心代码实现

---

## 🔗 相关资源

- **豆包图像生成API**：https://www.volcengine.com/product/seedream
- **对比度检查工具**：https://webaim.org/resources/contrastchecker/
- **配色工具**：https://coolors.co/
- **公众号规范**：https://mp.weixin.qq.com/cgi-bin/opshowpage

---

**版本**：1.0
**更新日期**：2026-01-13
**适用场景**：公众号封面、文章配图、营销海报

---

## 🎉 开始使用！

现在你已经了解了风格系统的基础知识，可以开始生成你的第一张封面了！

**有任何问题？** 查看完整文档或参考示例代码。

**祝创作愉快！** 🚀
