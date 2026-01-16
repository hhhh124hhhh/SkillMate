# 获取当前时间工具 - 使用示例

## 快速开始

### 1. 在Python脚本中使用

```python
from get_current_time import handler

# 获取当前时间
result = handler({"action": "get_current"})
print(f"当前时间: {result['full_datetime']}")
# 输出: 当前时间: 2026年01月15日 13:07:13

# 获取文章格式
result = handler({"action": "format_for_article"})
print(f"今天上午: {result['今天上午']}")
# 输出: 今天上午: 2026年1月15日上午

# 检查日期差异
result = handler({
    "action": "check_date",
    "target_date": "2026-01-20"
})
print(f"2026-01-20: {result['human_readable']}")
# 输出: 2026-01-20: 4天后
```

### 2. 在命令行使用

```bash
# 进入工具目录
cd .claude/skills/get_current_time

# 获取当前时间
python get_current_time.py --action get_current

# 获取文章格式
python get_current_time.py --action format_for_article

# 检查日期差异
python get_current_time.py --action check_date --target-date "2026-01-20"
```

## 实际应用场景

### 场景1：撰写突发新闻

```python
from get_current_time import handler

# 获取当前时间
time_info = handler({"action": "format_for_article"})

# 写文章开头
article_intro = f"""
{time_info['今天上午']}，杭州云栖小镇，阿里扔出了一颗王炸。

千问App正式宣布：月活跃用户突破1亿，同时全球首发AI购物功能。
"""

print(article_intro)
```

### 场景2：验证新闻真实性

```python
from get_current_time import handler

# 文章中的日期
article_dates = [
    "2026-01-15",  # 发布会
    "2025-11-17",  # 公测日
    "2025-12-10",  # 破3000万
]

for date_str in article_dates:
    result = handler({
        "action": "check_date",
        "target_date": date_str
    })
    status = "✅ 今天" if result['is_today'] else (
        "✅ 过去" if result['is_past'] else (
        "❌ 未来" if result['is_future'] else "未知"
    ))
    print(f"{date_str}: {result['human_readable']} - {status}")
```

### 场景3：避免时间误判

```python
from get_current_time import handler

# 检查文章中的关键事件
events = {
    "发布会": "2026-01-15",
    "千问公测": "2025-11-17",
    "破3000万": "2025-12-10",
}

print("事件时间验证:")
print("=" * 50)

for event_name, event_date in events.items():
    result = handler({
        "action": "check_date",
        "target_date": event_date
    })

    # 判断是否为真实事件
    if result['is_past'] or result['is_today']:
        status = "✅ 真实事件"
    else:
        status = "❌ 未来事件（虚构）"

    print(f"{event_name}:")
    print(f"  日期: {result['target_date']}")
    print(f"  时间差: {result['human_readable']}")
    print(f"  状态: {status}")
    print()
```

### 场景4：批量检查文章日期

```python
from get_current_time import handler

def validate_article_dates(article_text, date_patterns=None):
    """
    验证文章中的所有日期

    Args:
        article_text: 文章内容
        date_patterns: 日期模式列表

    Returns:
        验证结果
    """
    import re

    # 默认日期模式
    if date_patterns is None:
        date_patterns = [
            r'\d{4}-\d{2}-\d{2}',  # 2026-01-15
            r'\d{4}年\d{1,2}月\d{1,2}日',  # 2026年1月15日
        ]

    # 提取所有日期
    dates_found = []
    for pattern in date_patterns:
        dates_found.extend(re.findall(pattern, article_text))

    # 去重
    dates_found = list(set(dates_found))

    # 验证每个日期
    results = []
    for date_str in dates_found:
        result = handler({
            "action": "check_date",
            "target_date": date_str
        })
        results.append({
            "date": date_str,
            "human_readable": result['human_readable'],
            "is_future": result['is_future'],
            "is_today": result['is_today'],
            "is_past": result['is_past'],
        })

    return results

# 使用示例
article = """
今天上午10点，杭州云栖小镇，阿里扔出了一颗王炸。
千问App正式宣布：月活跃用户突破1亿。
2025年11月17日公测，2025年12月10日破3000万。
"""

validation_results = validate_article_dates(article)

print("文章日期验证结果:")
for result in validation_results:
    status = "⚠️ 未来" if result['is_future'] else "✅ 真实"
    print(f"{result['date']}: {result['human_readable']} - {status}")
```

## 常见问题

### Q1: 如何检查文章是否基于未来日期？

```python
from get_current_time import handler

# 文章开头日期
article_date = "2026-01-15"

result = handler({
    "action": "check_date",
    "target_date": article_date
})

if result['is_future']:
    print(f"❌ 警告: 文章基于未来日期！")
    print(f"   文章日期: {result['target_date']}")
    print(f"   实际今天: {result['today']}")
    print(f"   时间差: {result['human_readable']}")
elif result['is_today']:
    print(f"✅ 文章日期就是今天")
elif result['is_past']:
    print(f"✅ 文章基于过去日期（{result['human_readable']}）")
```

### Q2: 如何在文章中正确使用时间？

```python
from get_current_time import handler

time_info = handler({"action": "format_for_article"})

# ✅ 正确写法（包含具体日期）
print(f"{time_info['今天上午']}，阿里云栖小镇...")

# ❌ 错误写法（没有具体日期）
print("今天上午，阿里云栖小镇...")
```

### Q3: 如何验证数据时效性？

```python
from get_current_time import handler

# 数据发布时间
data_date = "2025-09-30"

result = handler({
    "action": "check_date",
    "target_date": data_date
})

days_diff = abs(result['days_difference'])

print(f"数据发布于: {result['target_date']}")
print(f"距今: {result['human_readable']}")

if days_diff > 180:
    print("⚠️ 警告: 数据可能已过时（超过6个月）")
elif days_diff > 90:
    print("⚠️ 注意: 数据较旧（超过3个月）")
else:
    print("✅ 数据较新（3个月内）")
```

## 最佳实践

### 1. 写新闻前先检查时间

```python
from get_current_time import handler

# 每次写新闻前执行
current = handler({"action": "get_current"})
print(f"当前时间: {current['full_datetime']}")
print(f"请确认文章事件时间与当前时间一致")
```

### 2. 在文章开头标注日期

```python
from get_current_time import handler

time_info = handler({"action": "format_for_article"})

article_header = f"""
---
发布时间: {time_info['今天']}
发布日期: {time_info['full_datetime']}
---

# 文章标题

文章内容...
"""
```

### 3. 批量验证项目文章

```python
import os
from get_current_time import handler

# 遍历所有文章
article_dir = "公众号项目"

for root, dirs, files in os.walk(article_dir):
    for file in files:
        if file.endswith(".md"):
            filepath = os.path.join(root, file)
            print(f"\n检查: {filepath}")

            # 读取文章
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            # 提取日期并验证
            # ... (使用validate_article_dates函数)
```

## 集成到其他Skills

### 在AI写作中使用

```python
# 在ai-writer skill中集成
from get_current_time import handler

def check_article_freshness(text):
    """检查文章新鲜度"""
    result = handler({"action": "get_current"})

    # 在文章中查找日期
    # 验证日期是否为未来
    # 返回建议
    pass
```

### 在选题搜索中使用

```python
# 在topic-selector skill中集成
from get_current_time import handler

def validate_hot_topic_date(topic_date):
    """验证热点话题日期"""
    result = handler({
        "action": "check_date",
        "target_date": topic_date
    })

    if result['days_difference'] > 7:
        return {"warning": "话题可能已过热（超过7天）"}
    return {"status": "ok"}
```

## 故障排除

### 问题：Windows下中文乱码

脚本已自动处理Windows编码问题，如仍有问题：

```bash
# 设置控制台编码
chcp 65001

# 然后运行脚本
python get_current_time.py --action get_current
```

### 问题：时区不正确

检查系统时区设置：
```bash
# Windows
# 控制面板 → 时间 → 时区

# Linux
timedatectl
```

---

**重要提示**: 每次撰写包含时间信息的文章前，请先运行此工具确认当前时间！
