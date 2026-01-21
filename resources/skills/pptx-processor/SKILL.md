---
name: pptx-processor
description: |
  PowerPoint 处理工具 - 演示文稿的创建、编辑和分析。
  支持创建新演示文稿、修改现有幻灯片、提取内容、合并演示文稿。当用户需要：创建 PPT、编辑幻灯片、提取内容时触发此技能。
---

# PowerPoint 处理指南

## 概述

使用 Python 和命令行工具处理 PowerPoint 演示文稿。

**核心功能**：
- 创建新演示文稿
- 修改现有幻灯片
- 提取文本和内容
- 合并/拆分演示文稿
- 批量操作

## Python 工具

### python-pptx - 基本操作

#### 创建新演示文稿

```python
from pptx import Presentation

prs = Presentation()
title_slide = prs.slides.add_slide(prs.slide_layouts[0])
title = title_slide.shapes.title
subtitle = title_slide.placeholders[1]

title.text = "Hello, World!"
subtitle.text = "Created with python-pptx"

prs.save('hello.pptx')
```

#### 添加文本和形状

```python
from pptx import Presentation
from pptx.util import Inches, Pt

prs = Presentation()
blank_slide = prs.slides.add_slide(prs.slide_layouts[6])

# 添加文本框
left = top = width = height = Inches(1)
txBox = blank_slide.shapes.add_textbox(left, top, width, height)
tf = txBox.text_frame
tf.text = "This is text inside a textbox"

p = tf.add_paragraph()
p.text = "This is a second paragraph"
p.level = 1

prs.save('textbox.pptx')
```

#### 添加图片

```python
from pptx import Presentation
from pptx.util import Inches

prs = Presentation()
blank_slide = prs.slides.add_slide(prs.slide_layouts[6])

img_path = 'image.png'
left = top = Inches(1)
height = Inches(2)
pic = blank_slide.shapes.add_picture(img_path, left, top, height=height)

prs.save('image.pptx')
```

#### 提取文本

```python
from pptx import Presentation

prs = Presentation('presentation.pptx')

for slide in prs.slides:
    for shape in slide.shapes:
        if hasattr(shape, "text"):
            print(shape.text)
```

## HTML 转 PowerPoint

### 使用 html2pptx

```python
from html2pptx import Html2Pptx

html_content = """
<h1>Title</h1>
<p>Slide content</p>
"""

h2p = Html2Pptx()
h2p.html2pptx(html_content, 'output.pptx')
```

## 命令行工具

### LibreOffice - 转换和批量操作

```bash
# 转换为 PDF
soffice --headless --convert-to pdf presentation.pptx

# 批量转换
for file in *.pptx; do
    soffice --headless --convert-to pdf "$file"
done
```

## 常见操作

### 合并演示文稿

```python
from pptx import Presentation

def merge_presentations(files, output):
    merged = Presentation()
    for file in files:
        prs = Presentation(file)
        for slide in prs.slides:
            # 复制幻灯片
            slide_layout = merged.slide_layouts[0]
            new_slide = merged.slides.add_slide(slide_layout)
            # 复制内容（需要手动复制形状）
            for shape in slide.shapes:
                # 复制逻辑
                pass
    merged.save(output)
```

### 添加图表

```python
from pptx import Presentation
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE

prs = Presentation()
slide = prs.slides.add_slide(prs.slide_layouts[6])

chart_data = CategoryChartData()
chart_data.categories = ['East', 'West', 'Midwest']
chart_data.add_series('Series 1', (1, 2, 3))

x, y, cx, cy = Inches(2), Inches(2), Inches(6), Inches(4.5)
slide.shapes.add_chart(
    XL_CHART_TYPE.COLUMN_CLUSTERED, x, y, cx, cy, chart_data
)

prs.save('chart.pptx')
```

### 修改现有幻灯片

```python
from pptx import Presentation

prs = Presentation('existing.pptx')
slide = prs.slides[0]

# 修改标题
slide.shapes.title.text = "New Title"

# 添加新形状
left = top = width = height = Inches(2)
slide.shapes.add_textbox(left, top, width, height)

prs.save('modified.pptx')
```

## 依赖要求

- **python-pptx**: `pip install python-pptx`
- **html2pptx**: `pip install html2pptx`
- **LibreOffice**: 用于格式转换和批量操作

## 最佳实践

- **保持简单**：从基本结构开始
- **使用模板**：利用幻灯片布局
- **测试兼容性**：在不同 PowerPoint 版本中测试
- **备份数据**：修改前备份原始文件

## 常见陷阱

**避免**：
- ❌ 硬编码位置值（使用相对定位）
- ❌ 忽略异常（添加错误处理）
- ❌ 覆盖重要数据（修改前备份）

**推荐**：
- ✅ 使用模板和布局
- ✅ 添加适当的错误处理
- ✅ 测试跨平台兼容性
- ✅ 保留原始文件备份

## 代码风格指南

**重要**：生成 PowerPoint 处理代码时：
- 编写清晰、可读的代码
- 使用描述性变量名
- 添加适当的注释
- 处理异常情况
- 测试输出结果
