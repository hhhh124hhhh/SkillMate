---
name: frontend-design
description: |
  前端界面设计工具 - 创建独特、高质量的前端界面，避免通用 AI 审美。
  当用户需要：构建 Web 组件、页面、应用、React 组件、HTML/CSS 布局、美化 Web UI 时触发此技能。
---

# 前端界面设计指南

本技能指导创建独特、生产级的前端界面，避免通用的"AI 生成"审美风格。实现真实可用的代码，并注重审美细节和创意选择。

## 设计思维

在编码之前，理解上下文并承诺大胆的审美方向：

- **目的**：这个界面解决什么问题？谁使用它？
- **风格**：选择一个极端风格：
  - 极简主义
  - 极繁主义混乱
  - 复古未来主义
  - 有机/自然
  - 奢华/精致
  - 顽皮/玩具般
  - 编辑/杂志风格
  - 粗野主义/原始
  - 装饰艺术/几何
  - 柔和/粉彩
  - 工业/实用主义

- **约束**：技术要求（框架、性能、可访问性）
- **差异化**：什么让这个界面令人难忘？人们会记住一件事是什么？

**关键**：选择清晰的概念方向并精确执行。大胆的极繁主义和精致的极简主义都有效 - 关键是有意识。

然后实现可用代码（HTML/CSS/JS、React、Vue 等），要求：
- 生产级和功能完整
- 视觉震撼和难忘
- 具有清晰的审美观点
- 在每个细节上精心打磨

## 前端审美指南

重点关注：

### 排版
- 选择美丽、独特和有趣的字体
- 避免通用字体如 Arial 和 Inter
- 选择提升前端美学的独特选择
- 将独特的显示字体与精致的正文字体配对

### 颜色和主题
- 致力于连贯的审美
- 使用 CSS 变量保持一致性
- 主导颜色与锐利强调色优于胆怯、均匀分布的调色板

### 动画
- 使用动画实现效果和微交互
- HTML 优先使用纯 CSS 解决方案
- React 使用 Motion 库
- 专注于高影响力时刻：一个精心编排的页面加载，带有错落显示（animation-delay）创造出比分散的微交互更多的愉悦感
- 使用滚动触发和悬停状态来制造惊喜

### 空间构成
- 意外的布局
- 不对称
- 重叠
- 对角线流动
- 网格破坏元素
- 慷慨的负空间 OR 受控的密度

### 背景和视觉细节
- 创建氛围和深度，而不是默认为纯色
- 添加与整体审美匹配的上下文效果和纹理
- 应用创意形式，如渐变网格、噪声纹理、几何图案、分层透明度、戏剧性阴影、装饰边框、自定义光标和颗粒叠加

**避免**：
- 泛泛的 AI 生成审美，如过度使用的字体系列（Inter、Roboto、Arial、系统字体）
- 陈词滥调的配色方案（特别是白色背景上的紫色渐变）
- 可预测的布局和组件模式
- 缺乏上下文特定特征的千篇一律设计

创造性地解释并做出真正为上下文设计的意外选择。没有设计应该是相同的。在浅色和深色主题、不同字体、不同审美之间变化。**永远不要**在代际之间收敛于共同选择（例如 Space Grotesk）。

**重要**：将实现复杂度与审美愿景匹配。极繁主义设计需要带有大量动画和效果的精心制作的代码。极简主义或精致设计需要克制、精确和对间距、排版和微妙细节的仔细关注。优雅来自于良好地执行愿景。

## 实现原则

### HTML/CSS 项目

```css
/* 使用 CSS 变量保持一致性 */
:root {
  --primary-color: #FF6B6B;
  --accent-color: #4ECDC4;
  --bg-color: #1A1A2E;
  --text-color: #FFFFFF;
  --font-display: 'Playfair Display', serif;
  --font-body: 'Source Sans Pro', sans-serif;
}

/* 使用动画和微交互 */
.button {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}

/* 创造性地使用渐变 */
.hero-background {
  background:
    radial-gradient(circle at 20% 50%, rgba(255, 107, 107, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 50%, rgba(78, 205, 196, 0.1) 0%, transparent 50%);
}
```

### React 项目

```jsx
// 使用 Motion 库进行动画
import { motion } from 'framer-motion';

export default function Component() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
    >
      <h1>标题</h1>
    </motion.div>
  );
}

// 错落显示子元素
<motion.div variants={containerVariants} initial="hidden" animate="show">
  {items.map((item, i) => (
    <motion.div
      key={i}
      variants={itemVariants}
      transition={{ delay: i * 0.1 }}
    >
      {item.content}
    </motion.div>
  ))}
</motion.div>
```

## 代码风格指南

**重要**：生成前端代码时：
- 编写简洁、可读的代码
- 使用有意义的类名和变量名
- 避免不必要的注释
- 优先考虑性能和可访问性
- 使用现代 CSS 特性（Grid、Flexbox、自定义属性）
- 实现响应式设计

## 设计检查清单

完成设计前，确保：
- [ ] 审美方向清晰且一致
- [ ] 字体选择独特且适合上下文
- [ ] 颜色方案和谐且令人难忘
- [ ] 布局有趣且非通用
- [ ] 动画增强而非分散注意力
- [ ] 响应式设计在所有设备上工作
- [ ] 代码干净、可维护且性能良好
