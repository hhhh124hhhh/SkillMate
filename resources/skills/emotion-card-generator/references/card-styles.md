# 卡片样式模板

本文档定义了情绪卡片的4种基础样式。

---

## 样式A: 纯文字卡片

### 结构

```
┌─────────────────────────┐
│                         │
│   "人居然需要app         │
│    提醒自己活着了"       │
│                         │
│   —— 小郝《死了么》      │
│   2026.01.12            │
└─────────────────────────┘
```

### 适用场景

- 自我揭露
- 核心情绪
- 金句

### Prompt模板

```markdown
Generate a minimalist text card for social media:

Content: "{emotion_text}"
Author: "—— {article_title} · {date}"

Style:
- Center-aligned text
- Clean, minimalist design
- Solid color background: {background_color}
- Text color: {text_color}
- Modern sans-serif font
- White space around text
- No decorative elements
- Aspect ratio: 4:5 (Instagram portrait)
- Size: 1080x1350

The card should feel like a quote/motto card.
```

---

## 样式B: 极简卡片

### 结构

```
┌─────────────────────────┐
│                         │
│   我承认                │
│   我嫉妒"死了么"         │
│                         │
└─────────────────────────┘
```

### 适用场景

- 简短有力的情绪
- 自我揭露
- 直面真相

### Prompt模板

```markdown
Generate a minimalist text card:

Content: "{emotion_text}"

Style:
- Center-aligned text
- Very minimal design
- Solid color background: {background_color}
- Text color: {text_color}
- Bold font
- No footer, no author
- Aspect ratio: 4:5
- Size: 1080x1350

Clean and powerful.
```

---

## 样式C: 对话卡片

### 结构

```
┌─────────────────────────┐
│ "你嫉妒吗?"              │
│ "我嫉妒"                 │
│                         │
│ —— 给兄弟发消息后        │
└─────────────────────────┘
```

### 适用场景

- 问答式情绪
- 自我对话
- 直面矛盾

### Prompt模板

```markdown
Generate a dialogue-style text card:

Top text: "{question}"
Bottom text: "{answer}"
Footer: "—— {context}"

Style:
- Two separate text blocks, top and bottom
- Vertical spacing between blocks
- Minimalist design
- Background: gradient from {color1} to {color2}
- White text
- Center-aligned
- Aspect ratio: 4:5
- Size: 1080x1350

The card should feel like a conversation snippet.
```

---

## 样式D: 矛盾卡片

### 结构

```
┌───────────┬──────────┐
│  坚持     │ 浪费时间 │
│    ?      │          │
├───────────┴──────────┤
│ 我不知道路在哪         │
└───────────────────────┘
```

### 适用场景

- 直面矛盾
- 内心冲突
- 选择困境

### Prompt模板

```markdown
Generate a conflict/contrast text card:

Left side: "{option1}"
Right side: "{option2}"
Center: "？"
Bottom: "{resolution}"

Style:
- Split screen design
- Left side: {color1} background
- Right side: {color2} background
- White text
- Question mark in center
- Bottom text spans full width
- Aspect ratio: 1:1 (square)
- Size: 1080x1080

The card should visually represent inner conflict.
```

---

## 样式选择指南

### 根据情绪类型选择

| 情绪类型 | 推荐样式 |
|---------|---------|
| 荒谬感 | A |
| 嫉妒 | B 或 C |
| 迷茫 | A |
| 焦虑 | B |
| 释然 | A |
| 愤怒 | B |
| 平静 | A |
| 孤独 | A |
| 直面矛盾 | D |
| 自我揭露 | B |
| 金句 | A |

### 根据句子长度选择

- **短句(<10字)**: B
- **中等句(10-30字)**: A 或 C
- **长句(>30字)**: A

### 根据内容选择

- **有问答结构**: C
- **有对比结构**: D
- **纯感受**: A 或 B

---

## 示例

### 示例1: 荒谬感 (样式A)

**情绪**: "人居然需要app来提醒自己活着了"

**配色**:
- 背景: #F5F5DC (米色)
- 文字: #333333 (深灰)
- 强调: #FFA500 (橙色)

**卡片**: 见 `01_荒谬感.png`

---

### 示例2: 嫉妒 (样式B)

**情绪**: "你说我嫉妒吗?我嫉妒"

**配色**:
- 背景: #2E8B57 (海绿)
- 文字: #FFFFFF (白色)

**卡片**: 见 `02_嫉妒.png`

---

### 示例3: 迷茫 (样式A)

**情绪**: "我他妈就是迷茫,不知道路在哪"

**配色**:
- 背景: #E6E6FA (淡紫)
- 文字: #4B0082 (深紫)

**卡片**: 见 `03_迷茫.png`

---

### 示例4: 矛盾 (样式D)

**情绪**: "坚持 vs 浪费时间?"

**配色**:
- 左侧: #4682B4 (钢蓝)
- 右侧: #DC143C (深红)
- 文字: #FFFFFF (白色)

**卡片**: 见 `04_矛盾.png`

---

### 示例5: 坚持 (样式A)

**情绪**: "但我知道,我还不想放弃"

**配色**:
- 背景: #F0F8FF (淡蓝)
- 文字: #4682B4 (钢蓝)

**卡片**: 见 `05_坚持.png`

---

## 技术规格

### 尺寸

| 比例 | 尺寸 | 适用场景 |
|------|------|---------|
| 4:5 | 1080x1350 | Instagram,小红书 |
| 1:1 | 1080x1080 | 对话/矛盾卡片 |

### 字体

- **中文**: 思源黑体,苹方,微软雅黑
- **英文**: Roboto, Helvetica, Arial
- **大小**: 48-72pt (根据内容调整)

### 间距

- **页边距**: 10% (四周)
- **行间距**: 1.5-2倍
- **段落间距**: 2-3倍

---

**最后更新**: 2026-01-12
