# 公众号封面模板系统

## 概述

本模板系统为微信公众号封面生成提供**视觉模板**，核心特点：

- ✅ **AI生成背景** - 保持创意和多样性
- ✅ **程序精确绘制文字** - 确保排版100%可控
- ✅ **YAML配置模板** - 用户可自定义
- ✅ **多种风格模板** - 覆盖常见公众号场景

---

## 模板列表

### 基础模板 (Basic)

#### 1. center_title.yaml - 居中大标题
- **适用场景**: 重要文章、专题报道
- **特点**: 标题居中，视觉焦点集中
- **支持样式**: tech, fresh, warm, business, minimal

#### 2. left_aligned.yaml - 左对齐标题
- **适用场景**: 日常文章、教程类内容
- **特点**: 左对齐，右侧留白适合装饰
- **支持样式**: minimal, tech

### 结构化模板 (Structured)

#### 3. top_bottom_split.yaml - 上下分区
- **适用场景**: 主副标题明确、层级分明
- **特点**: 上半部分主标题，下半部分副标题
- **支持样式**: 多种渐变色

#### 4. two_column.yaml - 双栏布局
- **适用场景**: 主副标题、双语标题
- **特点**: 左右分栏，中间分隔线
- **支持样式**: 多种渐变色

### 极简模板 (Minimal)

#### 5. minimal_text.yaml - 极简文字
- **适用场景**: 哲学思考、深度观点、高端内容
- **特点**: 大量留白，极简主义
- **支持样式**: 纯白、浅灰、米色、深黑

### 创意模板 (Creative)

#### 6. card_style.yaml - 卡片式
- **适用场景**: 多个要点、层级信息
- **特点**: 卡片式设计，底部徽章装饰
- **支持样式**: fresh, warm, tech, business

#### 7. gradient_overlay.yaml - 渐变叠加
- **适用场景**: 需要增强文字可读性
- **特点**: AI背景图上叠加半透明渐变层
- **支持样式**: 深色叠加、蓝色渐变、底部遮罩

### 专业模板 (Tech / Editorial)

#### 8. tech_geometric.yaml - 科技几何
- **适用场景**: 技术文章、编程教程
- **特点**: 科技风格，几何装饰，描边效果
- **支持样式**: 蓝色、紫色、绿色科技风

#### 9. elegant_serif.yaml - 优雅衬线
- **适用场景**: 文艺文章、深度内容
- **特点**: 衬线字体，上下装饰线
- **支持样式**: 经典黑白、深蓝白字、米棕风格

---

## 模板结构

每个模板YAML文件包含以下部分：

```yaml
template:
  name: "模板名称"
  id: "template_id"
  description: "模板描述"
  category: "basic|structured|minimal|creative|tech|editorial"
  version: "1.0.0"

  # 背景配置
  background:
    type: "ai_generate|solid|gradient"
    style: "tech|fresh|minimal|warm|business"  # AI生成时
    size: "3072x1306"  # 2.35:1比例

  # 可选：叠加层配置
  overlay:
    enabled: true
    type: "gradient|solid"

  # 文字和装饰元素
  elements:
    - type: "text|optional|decoration"
      id: "element_id"
      content: "{{title}}"  # 支持变量替换

      # 位置配置
      position:
        type: "center|left|right|absolute|corners"
        x: "50%"           # 百分比或像素
        y: "50%"
        anchor: "middle"   # 对齐锚点

      # 字体配置
      font:
        family: ["字体1", "字体2", "sans-serif"]
        size: 120
        weight: "normal|bold|light"
        color: "#FFFFFF"
        spacing: 0

      # 文字效果
      effects:
        shadow:
          enabled: true
          color: "rgba(0,0,0,0.5)"
          offset_x: 4
          offset_y: 4
        stroke:
          enabled: false
          color: "#60A5FA"
          width: 2

      # 自动换行配置
      wrap:
        enabled: true
        max_width: "80%"
        max_lines: 3
        line_height: 1.3
        align: "center"

  # 样式变体
  variants:
    - name: "变体名称"
      background: {...}
      elements: [...]
```

---

## 位置配置详解

### 位置类型 (position.type)

- **center**: 完全居中（x, y可以省略或设为50%）
- **left**: 左对齐
- **right**: 右对齐
- **absolute**: 绝对定位（需要指定x, y）
- **corners**: 四角装饰（仅用于装饰元素）

### 坐标表示方法

```yaml
# 百分比（相对图片尺寸）
x: "50%"
y: "50%"

# 绝对像素
x: 100
y: 200

# 混合使用
x: "50%"     # 水平居中
y: 100       # 距顶部100像素
```

### 锚点 (anchor)

锚点决定元素的对齐点：

- **left**: 左上角为基准（x从左边，y从顶部）
- **center**: 水平居中
- **right**: 右对齐
- **middle**: 垂直居中
- **top**: 顶部对齐
- **bottom**: 底部对齐

示例：
```yaml
# 左上角定位
position:
  x: 10%
  y: 10%
  anchor: "left"

# 居中定位
position:
  x: "50%"
  y: "50%"
  anchor: "middle"
```

---

## 字体配置详解

### 字体族 (font.family)

支持字体回退列表，系统会按顺序尝试加载：

```yaml
font:
  family: ["SimHei", "Microsoft YaHei", "sans-serif"]
```

**常用字体**：
- 黑体: `SimHei`
- 微软雅黑: `Microsoft YaHei`
- 宋体: `SimSun`
- 思源黑体: `Noto Sans SC`
- 思源宋体: `Noto Serif SC`
- 等宽: `Consolas`, `monospace`

### 字体粗细 (font.weight)

- **normal**: 正常（400）
- **bold**: 粗体（700）
- **light**: 细体（300）

### 文字效果

#### 阴影效果
```yaml
effects:
  shadow:
    enabled: true
    color: "rgba(0,0,0,0.5)"  # 阴影颜色
    offset_x: 4                # X偏移
    offset_y: 4                # Y偏移
    blur: 0                    # 模糊半径（暂不支持）
```

#### 描边效果
```yaml
effects:
  stroke:
    enabled: true
    color: "#60A5FA"           # 描边颜色
    width: 2                   # 描边宽度
```

---

## 自动换行配置

```yaml
wrap:
  enabled: true               # 是否启用换行
  max_width: "80%"           # 最大宽度（百分比或像素）
  max_lines: 3               # 最多行数
  line_height: 1.3           # 行高（相对字体大小）
  align: "center"            # 对齐方式
```

### 对齐方式 (align)

- **left**: 左对齐
- **center**: 居中对齐
- **right**: 右对齐

---

## 变量替换系统

模板支持以下变量：

- `{{title}}`: 主标题（必需）
- `{{subtitle}}`: 副标题（可选）

示例：
```yaml
elements:
  - type: "text"
    content: "{{title}}"        # 替换为实际标题

  - type: "optional"
    content: "{{subtitle}}"     # 如果没有副标题，此元素不显示
```

---

## 装饰元素

装饰元素类型：

### 1. 线条 (line)
```yaml
- type: "decoration"
  id: "divider"
  position:
    type: "absolute"
    x: "50%"
    y: "80%"
    anchor: "middle"
  style:
    type: "line"
    width: 400
    height: 2
    color: "#1A1A1A"
```

### 2. 圆角矩形 (rounded_rectangle)
```yaml
- type: "decoration"
  id: "badge"
  style:
    type: "rounded_rectangle"
    width: 300
    height: 80
    background: "rgba(255,255,255,0.2)"
    border_color: "#FFFFFF"
    border_width: 2
    corner_radius: 40
```

### 3. 角标 (brackets)
```yaml
- type: "decoration"
  id: "corner_brackets"
  position:
    type: "corners"   # 特殊类型，自动定位到四角
  style:
    type: "brackets"
    color: "#60A5FA"
    width: 3
    corner_size: 60
    padding: 50
```

---

## 背景配置

### AI生成背景
```yaml
background:
  type: "ai_generate"
  style: "tech"        # tech/fresh/minimal/warm/business
  size: "3072x1306"    # 2.35:1比例
```

### 纯色背景
```yaml
background:
  type: "solid"
  color: "#FAFAFA"
  size: "3072x1306"
```

### 渐变背景
```yaml
background:
  type: "gradient"
  gradient:
    from: "#667eea"
    to: "#764ba2"
    direction: "horizontal"  # horizontal/vertical/diagonal
  size: "3072x1306"
```

---

## 叠加层配置

叠加层用于增强文字可读性：

### 渐变叠加
```yaml
overlay:
  enabled: true
  type: "gradient"
  gradient:
    from: "rgba(0,0,0,0.7)"    # 顶部深色
    to: "rgba(0,0,0,0.3)"      # 底部浅色
    direction: "vertical"
```

### 纯色叠加
```yaml
overlay:
  enabled: true
  type: "solid"
  color: "rgba(0,0,0,0.5)"
  position: "bottom"   # bottom/top/full
  height: "40%"
```

---

## 样式变体 (Variants)

每个模板可以定义多个样式变体：

```yaml
variants:
  - name: "默认科技风"
    background:
      style: "tech"
    elements:
      - id: "main_title"
        font:
          color: "#FFFFFF"

  - name: "清新风格"
    background:
      style: "fresh"
    elements:
      - id: "main_title"
        font:
          color: "#1B5E20"
```

使用时可以选择变体：
```bash
python cover_generator.py --template center_title --variant "清新风格"
```

---

## 自定义模板

### 创建新模板

1. 在 `templates/` 目录下创建新的YAML文件
2. 参考 `template_schema.json` 确保格式正确
3. 使用验证工具检查：

```bash
python -m template_validator templates/your_template.yaml
```

### 模板验证

模板Schema验证位于 `template_schema.json`，使用JSON Schema标准。

---

## 风格系统

### 预定义风格

| 风格代码 | 风格名称 | 适用场景 |
|---------|---------|---------|
| tech | 专业科技 | 技术文章、AI主题、编程教程 |
| fresh | 清新活泼 | 生活分享、成长记录、轻科普 |
| minimal | 简约极简 | 哲学思考、深度观点、高端内容 |
| warm | 温暖治愈 | 情感文章、成长感悟、心理疗愈 |
| business | 商务专业 | 商业分析、数据报告、市场研究 |

### 风格配色

详见 `image-generation/scripts/style_prompt_builder.py` 中的 `STYLE_CONFIGS`。

---

## 常见问题

### Q1: 如何调整字体大小？

修改模板中对应元素的 `font.size` 值：

```yaml
font:
  size: 120  # 调整此值
```

### Q2: 如何改变文字颜色？

修改 `font.color` 值（使用十六进制）：

```yaml
font:
  color: "#FFFFFF"  # 白色
```

### Q3: 如何添加副标题？

在模板中添加 `optional` 类型的元素：

```yaml
- type: "optional"
  id: "subtitle"
  content: "{{subtitle}}"
  required: false
  # ... 其他配置
```

### Q4: 如何调整元素位置？

修改 `position` 配置：

```yaml
position:
  x: "50%"    # 水平位置（0-100%）
  y: "50%"    # 垂直位置（0-100%）
  anchor: "middle"  # 对齐点
```

### Q5: 为什么文字被裁剪了？

检查以下配置：
1. `wrap.max_width` 是否太大（建议60-85%）
2. `wrap.max_lines` 是否太少
3. `position.y` 是否太靠近边缘

---

## 技术实现

- **模板解析**: `template_engine.py`
- **文字渲染**: `text_renderer.py`
- **背景生成**: `background_generator.py`
- **验证工具**: `template_validator.py`

---

## 贡献指南

欢迎提交新的模板！

1. Fork 本仓库
2. 创建新的模板YAML文件
3. 通过Schema验证
4. 测试多个标题场景
5. 提交Pull Request

---

**版本**: 1.0.0
**最后更新**: 2026-01-13
