# SkillMate 品牌指南

**品牌名称**: SkillMate (技伴)
**品牌定位**: 技能生态平台 + 学习伙伴
**更新日期**: 2026-01-24
**版本**: 1.0.0

---

## 📋 目录

1. [品牌概述](#品牌概述)
2. [Logo 规范](#logo-规范)
3. [配色系统](#配色系统)
4. [排版规范](#排版规范)
5. [应用场景](#应用场景)
6. [文件规范](#文件规范)
7. [常见问题](#常见问题)

---

## 品牌概述

### 品牌定位

**SkillMate (技伴)** 是一个技能生态平台，致力于：

- **构建** - 用户创建和开发 AI 技能
- **分享** - 技能社区交流和展示
- **售卖** - 技能市场交易
- **学习** - 技能教学和培训

### 核心价值

- **技能 (Skill)**: 功能封装、可复用、可售卖
- **伙伴 (Mate)**: 协作、学习、陪伴

### 目标用户

- **技能开发者**: 创建、测试、发布技能
- **技能学习者**: 浏览、学习、使用技能
- **技能交易者**: 购买、出售、评估技能
- **社区参与者**: 评论、反馈、协作

### 品牌个性

- ✅ **专业**: 技术实力、可靠
- ✅ **友好**: 温暖、亲切、易接近
- ✅ **创新**: 领先技术、持续进化
- ✅ **开放**: 社区驱动、用户共创

---

## Logo 规范

### Logo 类型

SkillMate 拥有两套 Logo 系统：

#### 1. 主 Logo: 六边形技能卡片

**设计理念**: 六边形象征稳定和连接，内部方块代表技能，橙绿双色体现双重属性。

**使用场景**:
- ✅ 桌面应用图标（主要）
- ✅ 应用标题栏
- ✅ 任务栏/Dock
- ✅ 设置界面
- ✅ 关于页面

**不使用场景**:
- ❌ 需要表达情感的场合
- ❌ 与用户交互反馈相关的场合

#### 2. 吉祥物: 橙色机器人伙伴

**设计理念**: 友好机器人形象，体现"AI 技能伙伴"定位，温暖亲切。

**使用场景**:
- ✅ 营销材料、社交媒体
- ✅ 用户反馈和状态提示
- ✅ 加载动画
- ✅ 欢迎页面
- ✅ 表情包和周边

**表情变体**:
- **Happy (开心)**: 默认状态
- **Thinking (思考)**: 加载/处理中
- **Success (成功)**: 操作完成
- **Error (错误)**: 操作失败
- **Welcome (欢迎)**: 首次使用

### 最小尺寸要求

| Logo 类型 | 最小尺寸 | 说明 |
|-----------|----------|------|
| 六边形主 Logo | 32x32 px | 低于此尺寸可能不清晰 |
| 机器人吉祥物 | 48x48 px | 需要较大空间展示细节 |

**建议尺寸**:
- **小图标**: 64x64 px (菜单项、工具栏)
- **中图标**: 128x128 px (设置界面、状态提示)
- **大图标**: 256x256 px 或更大 (欢迎页、关于页)

### 安全边距

Logo 周围应保留至少 **Logo 高度的 25%** 作为安全边距，避免与其他元素过于接近。

**示例**:
```
┌─────────────────────────┐
│  ← 安全边距 →           │
│    ┌────────┐          │
│    │  Logo  │          │
│    └────────┘          │
│    ← 安全边距 →        │
└─────────────────────────┘
```

### 使用规范

#### ✅ 正确使用

1. **保持原始比例**: 不要拉伸或压缩 Logo
2. **使用官方文件**: 只使用提供的 SVG 和 PNG 文件
3. **确保足够对比度**: Logo 与背景要有足够对比度
4. **保持清晰度**: 使用矢量文件或高分辨率位图

#### ❌ 错误使用

1. **修改 Logo 颜色**: 不要更改橙绿配色
2. **添加效果**: 不要添加阴影、边框、发光等（除非有动画需求）
3. **修改 Logo 元素**: 不要移除或修改任何图形元素
4. **使用低质量图片**: 不要使用模糊或像素化的 Logo
5. **旋转 Logo**: 除了动画效果外，不要旋转 Logo
6. **遮挡 Logo**: 不要让其他元素遮挡 Logo

### 不可用示例

```html
<!-- ❌ 错误：修改颜色 -->
<img src="logo.svg" style="filter: hue-rotate(90deg)" />

<!-- ❌ 错误：添加边框 -->
<img src="logo.svg" style="border: 2px solid red" />

<!-- ❌ 错误：拉伸变形 -->
<img src="logo.svg" style="width: 200px; height: 100px" />

<!-- ✅ 正确：保持原始比例 -->
<img src="logo.svg" style="width: 128px; height: 128px" />
```

---

## 配色系统

### 主色

#### 橙色 - 技能与创造力

```
#FF7043 (RGB: 255, 112, 67)
HSL: 24°, 100%, 63%
```

**用途**:
- 主操作按钮
- 技能相关元素
- 强调和重点内容
- 主 Logo 主色

**变体**:
- 浅橙: `#FF8A65` (hover 状态)
- 深橙: `#F4511E` (active 状态)
- 背景: `#FBE9E7` (浅色背景)

#### 绿色 - 学习与成长

```
#43A047 (RGB: 67, 160, 71)
HSL: 123°, 56%, 42%
```

**用途**:
- 成功状态反馈
- 学习相关元素
- 完成确认
- 吉祥物辅助色

**变体**:
- 浅绿: `#66BB6A` (hover 状态)
- 深绿: `#2E7D32` (active 状态)
- 背景: `#E8F5E9` (浅色背景)

### 深色模式配色

**深色背景**: `#1A1A2E` (深蓝黑)

**深色模式主色**:
- 橙色: `#FF8C42` (更亮的橙色)
- 绿色: `#4CAF50` (更亮的绿色)

**深色模式文字**:
- 主文字: `#EAEAEA` (92% 亮度)
- 次要文字: `#A0A0A0` (63% 亮度)
- 弱化文字: `#6B6B6B` (42% 亮度)

### 配色使用原则

#### 对比度要求

根据 **WCAG AA 标准**:
- **正常文字** (< 18pt): 对比度 ≥ 4.5:1
- **大文字** (≥ 18pt): 对比度 ≥ 3:1
- **图标/图形**: 对比度 ≥ 3:1

**验证工具**:
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Chrome DevTools Lighthouse](https://developers.google.com/web/tools/lighthouse/)

#### 色彩搭配

**推荐组合**:
1. ✅ 橙色按钮 + 白色文字
2. ✅ 绿色成功提示 + 白色/深灰文字
3. ✅ 橙色 Logo + 白色背景
4. ✅ 绿色 Logo + 深色背景

**避免组合**:
1. ❌ 橙色 + 红色（对比度过低）
2. ❌ 绿色 + 青色（难以区分）
3. ❌ 浅橙 + 浅绿（对比度过低）

---

## 排版规范

### 字体

#### 主字体: Inter

```
字体家族: Inter
备用字体: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto
字体权重: 300, 400, 500, 600, 700
```

**引入方式**:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

#### 中文字体: 系统默认

```
字体家族: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
              "Helvetica Neue", Arial, "Noto Sans", sans-serif,
              "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"
```

### 文字层级

#### 1. 品牌名称

```
英文名: SkillMate
字体: Inter Bold / 700
大小: 32px - 64px
颜色: #FF7043 (橙色)
```

```
中文名: 技伴
字体: 系统默认 Bold / 700
大小: 32px - 64px
颜色: #FF7043 (橙色)
```

#### 2. 标语

```
内容: 你的AI技能伙伴
字体: Inter Medium / 500
大小: 18px - 24px
颜色: #616161 (深灰)
```

#### 3. 标题

```
H1: 48px / 700 (Bold)
H2: 36px / 600 (SemiBold)
H3: 28px / 600 (SemiBold)
H4: 22px / 500 (Medium)
颜色: #212121 (深灰)
```

#### 4. 正文

```
大小: 16px / 400 (Regular)
行高: 1.6 - 1.8
颜色: #616161 (深灰)
```

#### 5. 辅助文字

```
大小: 14px / 400 (Regular)
行高: 1.5
颜色: #9E9E9E (灰色)
```

### 文字与 Logo 组合

#### 方案 1: Logo + 英文

```
┌──────────────────────┐
│   [Logo]  SkillMate   │
└──────────────────────┘
```

#### 方案 2: Logo + 英文 + 中文

```
┌──────────────────────────────┐
│   [Logo]  SkillMate  技伴    │
└──────────────────────────────┘
```

#### 方案 3: Logo + 标语

```
┌──────────────────────────────────┐
│        [Logo]                    │
│      你的AI技能伙伴              │
└──────────────────────────────────┘
```

---

## 应用场景

### 1. 桌面应用图标

**使用 Logo**: 六边形主 Logo

**文件**: `public/icon.png` (512x512)

**尺寸要求**:
- Windows: 16, 32, 48, 256 px
- macOS: 16, 32, 64, 128, 256, 512, 1024 px
- Linux: 16, 32, 48, 64, 128, 256, 512 px

**生成方式**:
```bash
node scripts/generate-logo-icons.js
```

### 2. 应用内界面

#### 主窗口标题栏

**使用**: 六边形 Logo (32x32) + "SkillMate" 文字

```tsx
<HexagonLogo size={32} />
<span>SkillMate</span>
```

#### 设置界面

**使用**: 六边形 Logo (64x64) + "设置" 标题

```tsx
<HexagonLogo size={64} />
<h1>设置</h1>
```

#### 状态提示

**使用**: 机器人吉祥物 (64x64 - 128x128)

```tsx
// 加载状态
<RobotLogo expression="thinking" size={64} animated />
<p>正在处理...</p>

// 成功状态
<RobotLogo expression="success" size={96} />
<p>操作成功！</p>

// 错误状态
<RobotLogo expression="error" size={96} />
<p>操作失败，请重试</p>
```

### 3. 网站和营销材料

#### 网站 Logo

**使用**: 六边形 Logo (128x256) + 文字

```html
<div class="brand">
  <HexagonLogo size={64} />
  <div class="brand-text">
    <h1>SkillMate</h1>
    <p>你的AI技能伙伴</p>
  </div>
</div>
```

#### 社交媒体头像

**使用**: 机器人吉祥物 (400x400) 或六边形 Logo (400x400)

**推荐**: 使用机器人吉祥物，更具亲和力

#### 宣传海报

**主视觉**: 六边形 Logo (大) + 机器人吉祥物（装饰）

**配色**:
- 背景: 白色或浅色渐变
- 主色: 橙色 #FF7043
- 辅色: 绿色 #43A047

### 4. 打印材料

#### 名片

**使用**: 六边形 Logo + 联系方式

**尺寸**: 90mm x 54mm (标准名片)

#### 信纸

**页眉**: 六边形 Logo (小) + "SkillMate"

**页脚**: 网址 + 版权信息

---

## 文件规范

### SVG 文件

**位置**: `public/` 和 `src/assets/`

**文件列表**:
```
logo-skillmate-hexagon.svg       # 主 Logo（六边形）
logo-skillmate-hexagon-dark.svg  # 深色模式
logo-skillmate-hexagon-mono.svg  # 单色版本
logo-skillmate-robot.svg         # 机器人吉祥物
logo-skillmate-robot-dark.svg    # 深色模式
robot-thinking.svg                # 思考表情
robot-success.svg                 # 成功表情
robot-error.svg                   # 错误表情
robot-welcome.svg                 # 欢迎表情
```

**使用建议**:
- ✅ 网页和应用内使用 SVG（最佳清晰度）
- ✅ 打印材料使用 SVG（无损缩放）
- ✅ 支持深色模式切换
- ❌ 不支持 SVG 的平台使用 PNG

### PNG 文件

**位置**: `public/icons/`

**目录结构**:
```
icons/
├── 16x16/
│   ├── icon.png                 # 主图标
│   ├── hexagon/icon-16.png      # 六边形
│   └── robot/icon-16.png        # 机器人
├── 32x32/
├── 48x48/
├── 64x64/
├── 128x128/
├── 256x256/
├── 512x512/
└── 1024x1024/
```

**使用建议**:
- ✅ 应用图标使用 PNG
- ✅ 不支持 SVG 的平台使用 PNG
- ✅ 小尺寸使用优化过的 PNG
- ✅ 头像/社交媒体使用 PNG

### 图标生成脚本

**位置**: `scripts/generate-logo-icons.js`

**运行方式**:
```bash
node scripts/generate-logo-icons.js
```

**功能**:
- 从 SVG 生成多尺寸 PNG
- 支持所有 Logo 变体
- 自动优化文件大小
- 更新主图标 `public/icon.png`

### 动画文件

**位置**: `src/styles/logo-animations.css`

**使用方式**:
```tsx
// 在组件中添加动画类
<img
  src="logo.svg"
  className={`logo ${animated ? 'logo-animated' : ''}`}
/>
```

**可用动画**:
- `logo-spin`: 旋转动画（加载状态）
- `logo-pulse`: 脉冲动画（强调）
- `logo-float`: 浮动动画（悬停）
- `logo-bounce`: 弹跳动画（成功）
- `robot-wave`: 挥手动画（欢迎）
- 等更多...

---

## 常见问题

### Q1: 如何修改 Logo 配色？

**A**: 不建议修改 Logo 配色。如确有需要，请遵循以下原则：

1. **保持主色不变**: 橙色 #FF7043 和绿色 #43A047 必须保持
2. **可调整亮度**: 可根据背景调整明度，但保持色相不变
3. **使用官方变体**: 使用 `dark` 或 `mono` 版本

### Q2: 如何创建自定义 Logo 变体？

**A**: 如需创建自定义变体（如特定活动 Logo），请：

1. 保持核心元素不变（六边形/机器人）
2. 仅调整装饰元素（如添加活动主题元素）
3. 保持配色系统一致
4. 提前与品牌团队确认

### Q3: 如何在代码中使用 Logo？

**A**: 使用提供的 React 组件：

```tsx
// 导入
import { Logo, HexagonLogo, RobotLogo } from '@/components/Logo';

// 使用
<HexagonLogo size={128} />
<RobotLogo expression="success" size={96} animated />
<Logo variant="hexagon" size={64} theme="dark" />
```

### Q4: 如何生成特定尺寸的图标？

**A**: 使用提供的图标生成脚本：

```bash
# 生成所有尺寸
node scripts/generate-logo-icons.js

# 修改脚本中的尺寸配置
# 编辑 scripts/generate-logo-icons.js
# 修改 CONFIG.sizes 数组
```

### Q5: 如何在第三方平台使用 Logo？

**A**: 遵循以下指南：

1. **社交媒体**: 使用 400x400 或 800x800 PNG
2. **应用商店**: 使用 1024x1024 PNG
3. **打印材料**: 使用 SVG（无损缩放）
4. **网站 Favicon**: 使用 32x32 或 48x48 PNG

### Q6: 如何使用 Logo 动画？

**A**: 动画已集成到 React 组件中：

```tsx
// 启用动画
<Logo variant="robot" animated size={64} />

// 或手动添加类名
<img src="logo.svg" className="logo-animated" />
```

### Q7: 深色模式下如何使用 Logo？

**A**: 使用 `theme` 属性：

```tsx
// 自动切换
<Logo variant="hexagon" theme="auto" />

// 强制深色模式
<Logo variant="hexagon" theme="dark" />
```

### Q8: 如何报告 Logo 使用问题？

**A**: 请通过以下方式联系：

- GitHub Issues: [项目 Issues 页面]
- 邮件: brand@skillmate.com（示例）
- 文档: [BRAND_GUIDELINES.md](./BRAND_GUIDELINES.md)

---

## 附录

### 相关文档

- [SKILLMATE_LOGO_DESIGN_PROPOSALS.md](../SKILLMATE_LOGO_DESIGN_PROPOSALS.md) - 8 套设计方案详情
- [SKILLMATE_COLOR_MIGRATION_COMPLETE.md](../SKILLMATE_COLOR_MIGRATION_COMPLETE.md) - 配色迁移报告
- [LOGO_INTEGRATION.md](./LOGO_INTEGRATION.md) - 技术集成文档

### 设计工具

- **Figma**: 设计和原型
- **SVGOMG**: SVG 优化工具
- **Sharp**: 图像处理库
- **Coolors**: 配色方案生成

### 参考资料

- [WCAG 对比度标准](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum)
- [SVG 无障碍属性](https://www.w3.org/TR/SVG-access/)
- [React 组件最佳实践](https://react.dev/learn)

---

**版本历史**:
- v1.0.0 (2026-01-24): 初始版本

**维护团队**: SkillMate 品牌团队

**联系方式**: brand@skillmate.com (示例)

---

*本文档遵循 Creative Commons BY-NC-SA 4.0 协议*
