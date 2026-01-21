# 技能开发指南

本指南将教你如何创建、测试和发布自定义技能，扩展 AI Agent Desktop 的能力。

---

## 一、技能是什么？

技能（Skill）是 AI Agent 的能力单元，定义了 AI 如何处理特定类型的任务。

### 1.1 技能类型

AI Agent Desktop 支持两种类型的技能：

#### 上下文技能 (Context Skill)
- **作用**: 为 AI 提供领域知识和指令
- **触发**: AI 根据用户请求自动选择合适的技能
- **格式**: YAML frontmatter + Markdown 内容
- **示例**: `ai-writer`, `style-learner`, `emotion-provoker`

**工作原理**:
```
用户请求 → AI 分析 → 匹配技能描述 → 注入技能内容 → 生成响应
```

#### 工具技能 (Tool Skill)
- **作用**: 提供可执行的 Python 脚本
- **触发**: AI 主动调用工具（通过 `input_schema` 定义参数）
- **格式**: YAML frontmatter + Python 代码
- **示例**: `data-analyzer`, `image-cropper`, `cover-generator`

**工作原理**:
```
用户请求 → AI 分析 → 识别需要工具 → 调用技能工具 → 执行 Python 脚本 → 返回结果
```

### 1.2 技能存储位置

**用户技能**（高优先级）:
- 路径: `~/.aiagent/skills/`
- 可编辑、可删除
- 可覆盖内置技能

**内置技能**（低优先级）:
- 路径: `resources/skills/`
- 只读，提供示例
- 用户技能可覆盖同名技能

**技能加载优先级**:
```
用户技能 > 内置技能
```

---

## 二、技能格式规范

### 2.1 标准技能结构

每个技能必须是一个独立的目录，包含 `SKILL.md` 文件：

```
my-skill/
├── SKILL.md           # 必需：技能定义文件
├── script.py          # 可选：Python 脚本（工具技能）
└── assets/            # 可选：资源文件
    └── example.png
```

### 2.2 SKILL.md 格式

#### 上下文技能示例

```markdown
---
name: code-reviewer
description: 代码审查助手，帮助分析代码质量、发现潜在问题和改进建议
---

# 代码审查助手

你是专业的代码审查专家，擅长：

- 识别代码异味（Code Smells）
- 发现潜在的 bug 和安全问题
- 提供性能优化建议
- 改善代码可读性和可维护性

## 审查流程

1. **理解代码意图**: 分析代码的目标和功能
2. **检查正确性**: 识别逻辑错误和边界条件
3. **评估安全性**: 检查输入验证、权限控制等
4. **优化性能**: 识别性能瓶颈和优化机会
5. **改进可读性**: 提供命名、结构、注释建议

## 审查准则

- ✅ **遵循最佳实践**: SOLID 原则、设计模式
- ✅ **类型安全**: TypeScript 类型定义完整
- ✅ **错误处理**: 适当的异常捕获和错误提示
- ✅ **测试覆盖**: 关键逻辑有单元测试
- ❌ **避免**: 硬编码、全局变量、过度嵌套

## 输出格式

请使用以下格式提供审查结果：

```markdown
## 📋 总体评价

[代码质量评分：A/B/C/D]

## ✅ 优点

- [列出做得好的地方]

## ⚠️ 问题

### [问题 1]
- **位置**: [文件名:行号]
- **严重性**: [高/中/低]
- **描述**: [问题描述]
- **建议**: [改进方案]

### [问题 2]
...
```

---

### 开始审查

当用户提交代码时，请按照上述流程进行全面的代码审查。
```

#### 工具技能示例

```markdown
---
name: csv-analyzer
description: 分析 CSV 文件，生成统计报告和可视化图表
input_schema:
  type: object
  properties:
    file_path:
      type: string
      description: CSV 文件路径
    analysis_type:
      type: string
      description: 分析类型：summary/statistics/correlation
      enum: [summary, statistics, correlation]
      default: summary
    output_format:
      type: string
      description: 输出格式：table/json/chart
      enum: [table, json, chart]
      default: table
  required:
    - file_path
---

# CSV 数据分析工具

自动化分析 CSV 文件，提供统计洞察和可视化。

## 功能特性

- 📊 **数据摘要**: 快速查看数据概况
- 📈 **统计分析**: 均值、中位数、标准差等
- 🔗 **相关性分析**: 特征之间的关联
- 📉 **可视化图表**: 自动生成图表

## 使用方式

### 方式一：直接描述

```
请分析 data/sales.csv 的统计数据
```

### 方式二：参数化调用

```
使用 csv-analyzer 工具：
- 文件: data/sales.csv
- 分析类型: statistics
- 输出格式: chart
```

## 参数说明

- **file_path** (必需): CSV 文件的绝对路径
- **analysis_type** (可选):
  - `summary`: 数据摘要（默认）
  - `statistics`: 详细统计
  - `correlation`: 相关性分析
- **output_format** (可选):
  - `table`: 表格格式（默认）
  - `json`: JSON 格式
  - `chart`: 图表（保存为 PNG）

## 输出示例

### 摘要模式
```
数据概况:
- 行数: 1,000
- 列数: 5
- 缺失值: 12
- 数据类型: 数值(3), 文本(2)

列信息:
- age: 数值，范围 18-65
- salary: 数值，范围 30k-150k
- department: 文本，5 个唯一值
```

### 统计模式
```
统计指标:
- age:
  - 均值: 35.2
  - 中位数: 34.0
  - 标准差: 8.5
- salary:
  - 均值: 75,000
  - 中位数: 72,000
  - 标准差: 18,500
```

---

## Python 实现

工具技能会自动执行以下 Python 脚本：
```

```python
#!/usr/bin/env python3
"""
CSV 数据分析脚本
"""

import sys
import json
import pandas as pd
import matplotlib.pyplot as plt


def load_csv(file_path: str) -> pd.DataFrame:
    """加载 CSV 文件"""
    try:
        df = pd.read_csv(file_path)
        print(f"✅ 成功加载 CSV: {file_path}", file=sys.stderr)
        return df
    except Exception as e:
        print(f"❌ 加载失败: {e}", file=sys.stderr)
        sys.exit(1)


def analyze_summary(df: pd.DataFrame) -> str:
    """生成数据摘要"""
    summary = {
        "行数": len(df),
        "列数": len(df.columns),
        "缺失值": df.isnull().sum().sum(),
        "数据类型": {
            "数值": len(df.select_dtypes(include=['number']).columns),
            "文本": len(df.select_dtypes(include=['object']).columns)
        }
    }

    output = ["## 数据概况"]
    for key, value in summary.items():
        if isinstance(value, dict):
            output.append(f"- {key}:")
            for k, v in value.items():
                output.append(f"  - {k}: {v}")
        else:
            output.append(f"- {key}: {value}")

    output.append("\n## 列信息")
    for col in df.columns:
        dtype = str(df[col].dtype)
        unique_count = df[col].nunique()
        output.append(f"- {col}: {dtype}, {unique_count} 个唯一值")

    return "\n".join(output)


def analyze_statistics(df: pd.DataFrame) -> str:
    """生成统计分析"""
    numeric_df = df.select_dtypes(include=['number'])

    if numeric_df.empty:
        return "⚠️ 没有数值列可分析"

    output = ["## 统计指标\n"]

    for col in numeric_df.columns:
        col_data = df[col]
        output.append(f"### {col}")
        output.append(f"- 均值: {col_data.mean():.2f}")
        output.append(f"- 中位数: {col_data.median():.2f}")
        output.append(f"- 标准差: {col_data.std():.2f}")
        output.append(f"- 最小值: {col_data.min()}")
        output.append(f"- 最大值: {col_data.max()}")
        output.append("")

    return "\n".join(output)


def analyze_correlation(df: pd.DataFrame) -> str:
    """生成相关性分析"""
    numeric_df = df.select_dtypes(include=['number'])

    if len(numeric_df.columns) < 2:
        return "⚠️ 需要至少 2 个数值列进行相关性分析"

    corr_matrix = numeric_df.corr()

    output = ["## 相关性矩阵\n"]
    output.append("```")
    output.append(corr_matrix.to_string())
    output.append("```")

    return "\n".join(output)


def generate_chart(df: pd.DataFrame, output_path: str = "chart.png"):
    """生成可视化图表"""
    numeric_df = df.select_dtypes(include=['number'])

    if numeric_df.empty:
        print("⚠️ 没有数值列可绘制", file=sys.stderr)
        return

    fig, axes = plt.subplots(nrows=1, ncols=len(numeric_df.columns), figsize=(12, 4))

    if len(numeric_df.columns) == 1:
        axes = [axes]

    for i, col in enumerate(numeric_df.columns):
        df[col].hist(ax=axes[i], bins=20)
        axes[i].set_title(col)
        axes[i].set_xlabel('Value')
        axes[i].set_ylabel('Frequency')

    plt.tight_layout()
    plt.savefig(output_path, dpi=100)
    print(f"✅ 图表已保存: {output_path}", file=sys.stderr)


def main():
    """主函数"""
    # 从命令行参数读取配置
    if len(sys.argv) < 2:
        print("❌ 错误: 缺少文件路径参数", file=sys.stderr)
        sys.exit(1)

    config = json.loads(sys.argv[1])
    file_path = config.get('file_path')
    analysis_type = config.get('analysis_type', 'summary')
    output_format = config.get('output_format', 'table')

    # 加载数据
    df = load_csv(file_path)

    # 执行分析
    if analysis_type == 'summary':
        result = analyze_summary(df)
    elif analysis_type == 'statistics':
        result = analyze_statistics(df)
    elif analysis_type == 'correlation':
        result = analyze_correlation(df)
    else:
        result = f"⚠️ 未知的分析类型: {analysis_type}"

    # 输出结果
    print(result)

    # 可选：生成图表
    if output_format == 'chart':
        chart_path = file_path.replace('.csv', '_chart.png')
        generate_chart(df, chart_path)
        print(f"\n📊 图表已生成: {chart_path}")


if __name__ == '__main__':
    main()
```

### 2.3 YAML Frontmatter 字段说明

#### 必需字段

**name** (string)
- 技能的唯一标识符
- 必须是英文，使用连字符（如 `my-skill`）
- 不能包含空格或特殊字符
- 用作文件名和工具名称

**description** (string)
- 清晰描述技能的功能
- 帮助 AI 理解何时使用此技能
- 建议包含使用场景

#### 可选字段

**input_schema** (object)
- JSON Schema 格式的参数定义
- 仅工具技能需要
- 定义工具接受的输入参数

**allowed-tools** (array)
- 技能可以使用的工具列表
- 限制技能的能力范围
- 例如: `["read_file", "write_file"]`

---

## 三、创建你的第一个技能

### 3.1 快速开始（5 分钟）

#### 步骤 1: 创建技能目录

```bash
# macOS/Linux
mkdir -p ~/.aiagent/skills/hello-world

# Windows (PowerShell)
New-Item -ItemType Directory -Path "$env:USERPROFILE\.aiagent\skills\hello-world"
```

#### 步骤 2: 创建 SKILL.md

```bash
# macOS/Linux
cat > ~/.aiagent/skills/hello-world/SKILL.md << 'EOF'
---
name: hello-world
description: 向用户打招呼的简单技能
---

# 你好，世界！

这是一个简单的示例技能，用于演示技能的基本结构。

## 功能

当用户说"你好"或"hello"时，用友好的方式回应。

## 回应方式

- 使用用户的名字（如果知道）
- 提供帮助选项
- 保持友好和热情
EOF

# Windows (PowerShell)
@"
---
name: hello-world
description: 向用户打招呼的简单技能
---

# 你好，世界！

这是一个简单的示例技能，用于演示技能的基本结构。
"@ | Out-File -FilePath "$env:USERPROFILE\.aiagent\skills\hello-world\SKILL.md" -Encoding utf8
```

#### 步骤 3: 重启应用

重启 AI Agent Desktop，技能会自动加载。

#### 步骤 4: 测试技能

在主界面输入：
```
你好
```

AI 会自动使用 `hello-world` 技能回应！

### 3.2 进阶示例：代码生成器

创建一个更实用的技能：

```markdown
---
name: python-generator
description: 生成 Python 代码片段，包括函数、类、脚本等
input_schema:
  type: object
  properties:
    type:
      type: string
      description: 代码类型：function/class/script
      enum: [function, class, script]
    description:
      type: string
      description: 功能描述
    requirements:
      type: string
      description: 特殊要求（如：错误处理、类型提示）
  required:
    - type
    - description
---

# Python 代码生成器

你是专业的 Python 开发者，擅长编写清晰、高效、符合最佳实践的代码。

## 生成原则

- ✅ **类型提示**: 使用 Python 3.9+ 类型注解
- ✅ **文档字符串**: Google 风格的 docstrings
- ✅ **错误处理**: 适当的异常捕获和验证
- ✅ **代码风格**: 遵循 PEP 8
- ✅ **测试友好**: 易于测试的设计

## 代码模板

### 函数模板

```python
from typing import List, Optional


def function_name(param1: str, param2: int) -> dict:
    """简短描述函数功能。

    Args:
        param1: 参数1说明
        param2: 参数2说明

    Returns:
        返回值说明

    Raises:
        ValueError: 无效输入时抛出

    Examples:
        >>> function_name("test", 42)
        {'result': 'success'}
    """
    # 实现代码
    pass
```

### 类模板

```python
from dataclasses import dataclass
from typing import List


@dataclass
class ClassName:
    """类描述。"""

    attribute: str

    def method(self) -> None:
        """方法描述。"""
        pass
```

## 使用方式

### 方式一：自然语言

```
生成一个 Python 函数，计算斐波那契数列的第 n 项
```

### 方式二：参数化调用

```
使用 python-generator 工具：
- 类型: function
- 描述: 计算斐波那契数列的第 n 项，使用动态规划优化
- 要求: 包含类型提示和错误处理
```

---

开始生成高质量的 Python 代码！
```

---

## 四、最佳实践

### 4.1 命名规范

**技能名称**:
- ✅ 使用小写英文和连字符：`my-skill`, `csv-analyzer`
- ❌ 避免空格：`My Skill`
- ❌ 避免中文：`数据分析师`
- ❌ 避免驼峰命名：`mySkill`

**描述**:
- ✅ 清晰说明功能和使用场景
- ✅ 包含触发词（如"分析"、"生成"）
- ❌ 过于简短："数据分析"
- ❌ 过于冗长：超过 100 字

### 4.2 内容组织

**上下文技能**:
1. **简介**: 简要说明技能功能
2. **能力列表**: 用无序列表说明能做什么
3. **使用流程**: 编号步骤说明工作流程
4. **输出格式**: 展示预期的输出格式
5. **示例**: 提供使用示例（可选）

**工具技能**:
1. **功能特性**: 简要列出功能点
2. **使用方式**: 说明两种调用方式
3. **参数说明**: 详细说明每个参数
4. **输出示例**: 展示不同模式的输出
5. **Python 实现**: 代码块注释说明脚本

### 4.3 Python 脚本规范

**代码风格**:
```python
#!/usr/bin/env python3
"""
模块文档字符串
"""

import sys
import json
from typing import Dict, List


def main():
    """主函数"""
    # 读取参数（从 sys.argv[1]）
    config = json.loads(sys.argv[1])

    # 执行逻辑
    result = process(config)

    # 输出结果（print 到 stdout）
    print(result)


if __name__ == '__main__':
    main()
```

**关键点**:
- ✅ 从 `sys.argv[1]` 读取 JSON 配置
- ✅ 使用 `print()` 输出结果到 stdout
- ✅ 使用 `print(..., file=sys.stderr)` 输出日志
- ✅ 非零退出码表示错误：`sys.exit(1)`

### 4.4 测试你的技能

**手动测试**:
1. 重启应用
2. 在主界面触发技能
3. 检查输出是否符合预期

**调试技巧**:
- 查看主进程日志（开发模式终端输出）
- 在 Python 脚本中添加 `print(..., file=sys.stderr)` 日志
- 简化技能内容，逐步添加功能

---

## 五、常见问题

### Q: 技能不显示？

**A**: 检查以下几点：
1. SKILL.md 是否在技能目录根目录
2. YAML frontmatter 是否包含 `name` 和 `description`
3. 技能名称格式是否正确（英文、连字符）
4. 是否重启应用

### Q: 工具技能执行失败？

**A**: 排查步骤：
1. 检查 Python 脚本是否有执行权限
2. 手动运行脚本测试：`python script.py '{"param": "value"}'`
3. 查看主进程日志中的错误信息
4. 确保 JSON 参数格式正确

### Q: 如何调试技能？

**A**:
1. **简化技能**: 从最简单的 "hello world" 开始
2. **添加日志**: 在 Python 脚本中添加 `print(..., file=sys.stderr)`
3. **查看日志**: 开发模式查看终端输出
4. **分步测试**: 先测试 YAML frontmatter，再测试内容，最后测试 Python

### Q: 技能可以调用其他工具吗？

**A**: 可以！在 YAML frontmatter 中添加：
```yaml
---
allowed-tools:
  - read_file
  - write_file
  - exec_command
---
```

### Q: 如何分享技能？

**A**:
1. 将技能目录打包为 zip
2. 在 GitHub Gist 或仓库分享
3. 用户解压到 `~/.aiagent/skills/` 即可

---

## 六、进阶主题

### 6.1 技能依赖管理

如果技能需要第三方 Python 库：

```markdown
## 依赖要求

- pandas: 数据处理
- matplotlib: 数据可视化
- requests: HTTP 请求

安装命令：
```bash
pip install pandas matplotlib requests
```
```

### 6.2 技能模板库

查看 `resources/skills/` 目录中的内置技能作为模板：
- `ai-writer`: 上下文技能示例
- `data-analyzer`: 工具技能示例
- `image-cropper`: 图像处理示例

### 6.3 技能性能优化

**减少启动时间**:
- 避免在技能加载时执行重量级操作
- 使用懒加载：仅在需要时导入库

**优化 Python 脚本**:
- 使用生成器而非列表
- 缓存重复计算
- 避免全局变量

---

## 七、资源链接

- **技能示例**: [GitHub - aiagent-desktop/skills](https://github.com/yourname/aiagent-desktop/tree/main/resources/skills)
- **社区技能**: [技能市场](https://github.com/yourname/aiagent-desktop/wiki/Skill-Marketplace)
- **YAML 规范**: [YAML 1.2 Specification](https://yaml.org/spec/1.2/spec.html)
- **JSON Schema**: [Understanding JSON Schema](https://json-schema.org/understanding-json-schema/)

---

<p align="center">
  <b>开始创建你的技能</b> 🚀
</p>
