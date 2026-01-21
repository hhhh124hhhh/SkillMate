---
name: docx-editor
description: |
  Word 文档编辑工具 - 创建、编辑和分析文档，支持修订跟踪、评论、格式保留和文本提取。
  当用户需要：创建 Word 文档、编辑内容、处理修订、添加评论、分析文档时触发此技能。
---

# DOCX 创建、编辑和分析

## 概述

用户可能要求你创建、编辑或分析 .docx 文件的内容。.docx 文件本质上是一个 ZIP 存档，包含 XML 文件和其他资源。

## 工作流程决策树

### 读取/分析内容
使用下面的"文本提取"或"原始 XML 访问"部分

### 创建新文档
使用"创建新的 Word 文档"工作流程

### 编辑现有文档
- **你自己的文档 + 简单更改**
  使用"基本 OOXML 编辑"工作流程

- **别人的文档**
  使用**"修订工作流程"**（推荐默认）

- **法律、学术、商业或政府文档**
  使用**"修订工作流程"**（必需）

## 读取和分析内容

### 文本提取

如果只需要读取文档的文本内容，应该使用 pandoc 将文档转换为 markdown。Pandoc 提供了出色的文档结构保留支持，并可以显示修订：

```bash
# 将文档转换为 markdown 并保留修订
pandoc --track-changes=all path-to-file.docx -o output.md
# 选项：--track-changes=accept/reject/all
```

### 创建新的 Word 文档

从零创建新的 Word 文档时，使用 **python-docx**，它允许使用 Python 创建 Word 文档。

### 工作流程

1. 安装 python-docx：`pip install python-docx`
2. 使用 Python 脚本创建文档

### 示例代码

```python
from docx import Document
from docx.shared import Pt, RGBColor
from docx.enum.text import WD_PARAGRAPH_ALIGNMENT

# 创建新文档
doc = Document()

# 添加标题
title = doc.add_heading('文档标题', 0)
title.alignment = WD_PARAGRAPH_ALIGNMENT.CENTER

# 添加段落
para = doc.add_paragraph()
run = para.add_run('这是普通文本，')
run.bold = True

run = para.add_run('这是粗体文本。')
run.font.color.rgb = RGBColor(0xFF, 0x00, 0x00)

# 添加表格
table = doc.add_table(rows=3, cols=3)
table.style = 'Table Grid'
for i in range(3):
    for j in range(3):
        cell = table.rows[i].cells[j]
        cell.text = f'单元格 {i+1}-{j+1}'

# 保存文档
doc.save('output.docx')
```

## 编辑现有的 Word 文档

### 基本编辑

```python
from docx import Document

# 加载现有文档
doc = Document('existing.docx')

# 修改段落
for para in doc.paragraphs:
    if '旧文本' in para.text:
        para.text = para.text.replace('旧文本', '新文本')

# 添加新段落
doc.add_paragraph('新的段落内容')

# 保存
doc.save('modified.docx')
```

### 格式化编辑

```python
from docx import Document
from docx.shared import Pt, RGBColor
from docx.enum.style import WD_STYLE_TYPE

doc = Document('existing.docx')

# 修改标题样式
for para in doc.paragraphs:
    if para.style.name.startswith('Heading'):
        para.runs[0].font.size = Pt(16)
        para.runs[0].font.color.rgb = RGBColor(0x42, 0x24, 0xE9)

# 保存
doc.save('formatted.docx')
```

### 使用修订跟踪

对于需要修订跟踪的专业文档编辑：

1. **使用 LibreOffice**：
   ```bash
   soffice --headless --accept="socket,host=localhost,port=8100;urp;"
   ```

2. **使用 python-docx 添加修订**（需要额外库）：
   ```python
   # 需要更复杂的 OOXML 操作
   # 建议使用 LibreOffice 或专门的处理工具
   ```

## 常见任务

### 添加图片

```python
from docx import Document
from docx.shared import Inches

doc = Document()

# 添加图片
doc.add_picture('image.png', width=Inches(4.0))

# 保存
doc.save('document_with_image.docx')
```

### 添加页眉页脚

```python
from docx import Document

doc = Document()

# 添加页眉
section = doc.sections[0]
header = section.header
header_para = header.paragraphs[0]
header_para.text = "这是页眉"

# 添加页脚
footer = section.footer
footer_para = footer.paragraphs[0]
footer_para.text = "第  页"

doc.save('document_with_header_footer.docx')
```

### 提取文本

```python
from docx import Document

doc = Document('document.docx')

# 提取所有段落文本
for para in doc.paragraphs:
    print(para.text)

# 提取表格文本
for table in doc.tables:
    for row in table.rows:
        for cell in row.cells:
            print(cell.text)
```

### 批量处理

```python
import os
from docx import Document

# 批量处理目录中的所有 Word 文档
input_dir = 'input_docs/'
output_dir = 'output_docs/'

os.makedirs(output_dir, exist_ok=True)

for filename in os.listdir(input_dir):
    if filename.endswith('.docx'):
        doc = Document(os.path.join(input_dir, filename))

        # 执行编辑操作
        # ...

        # 保存到输出目录
        doc.save(os.path.join(output_dir, filename))
```

## 最佳实践

### 库选择
- **python-docx**：最适合基本创建和编辑
- **pandoc**：最适合格式转换和文本提取
- **LibreOffice**：最适合复杂的修订跟踪功能

### 使用 python-docx
- 始终在修改后保存文档
- 复杂的格式可能需要直接操作 XML
- 修订跟踪需要额外处理

### 代码风格
编写简洁的代码：
- 使用有意义的变量名
- 避免不必要的打印语句
- 保持函数简单和专注

## 依赖要求

- **python-docx**: `pip install python-docx`
- **pandoc**: 系统包管理器安装
- **LibreOffice**: 系统包管理器安装（用于高级功能）
