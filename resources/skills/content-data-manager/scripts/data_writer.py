from typing import Dict, Any, List, Tuple
import json
import re
import os
import shutil
from datetime import datetime
from collections import Counter
import sys

# Fix encoding issues on Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

"""
数据写入工具

用于将用户从公众号后台或其他来源复制粘贴的数据，自动解析并保存到项目的JSON文件中

核心功能：
1. 数据解析：自动识别文章标题、阅读量、发布时间等信息
2. 数据验证：确保数据完整性和正确性
3. 数据写入：以结构化JSON格式保存
4. 数据统计：生成阅读量、时间等统计数据
"""


def parse_article_data(data: str) -> List[Dict[str, Any]]:
    """
    解析用户粘贴的原始数据

    Args:
        data: 用户粘贴的原始文本数据

    Returns:
        解析后的文章列表
    """
    articles = []
    lines = data.strip().split('\n')

    # 清理空行
    lines = [line.strip() for line in lines if line.strip()]

    i = 0
    while i < len(lines):
        line = lines[i]

        # 跳过非标题行（如"已发表"、"下一页"、"跳转"等）
        if line in ["已发表", "下一页", "跳转", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日", "原创", "非原创"]:
            i += 1
            continue

        # 判断是否是标题（排除纯数字、日期格式）
        if _is_title(line):
            article = {
                "title": line,
                "original": True,  # 默认原创
                "reading": 0,
                "date": ""
            }

            # 检查下一行是否是"原创"或"非原创"
            if i + 1 < len(lines):
                next_line = lines[i + 1]
                if next_line in ["原创", "非原创"]:
                    article["original"] = (next_line == "原创")
                    i += 2  # 跳过"原创"行

                    # 检查是否是阅读量（纯数字）
                    if i < len(lines) and _is_reading_number(lines[i]):
                        article["reading"] = int(lines[i])
                        i += 1

                        # 检查是否是发布日期
                        if i < len(lines) and _is_date(lines[i]):
                            article["date"] = _normalize_date(lines[i])
                            i += 1

                            # 跳过"已发表"
                            if i < len(lines) and lines[i] == "已发表":
                                i += 1
                    else:
                        # 没有阅读量，检查是否是日期
                        if i < len(lines) and _is_date(lines[i]):
                            article["date"] = _normalize_date(lines[i])
                            i += 1
                elif _is_reading_number(next_line):
                    # 直接是阅读量（没有原创标记）
                    article["reading"] = int(next_line)
                    i += 2

                    # 检查是否是日期
                    if i < len(lines) and _is_date(lines[i]):
                        article["date"] = _normalize_date(lines[i])
                        i += 1
                elif _is_date(next_line):
                    # 直接是日期
                    article["date"] = _normalize_date(next_line)
                    i += 2

            articles.append(article)
        else:
            i += 1

    return articles


def _is_title(line: str) -> bool:
    """
    判断是否是文章标题

    Args:
        line: 文本行

    Returns:
        是否是标题
    """
    # 空行不是标题
    if not line.strip():
        return False

    # 纯数字不是标题
    if line.strip().isdigit():
        return False

    # 排除关键词
    exclude_keywords = ["已发表", "下一页", "跳转", "星期", "原创", "非原创", "首页", "内容管理", "草稿箱",
                        "素材库", "发表记录", "原创", "合集", "互动管理", "数据分析", "收入变现", "账号成长",
                        "广告与服务", "广告主", "小程序管理", "付费加热", "微信搜一搜", "服务市场", "设置与开发",
                        "新的功能", "通知中心", "关于腾讯", "服务协议", "规则中心", "腾讯客服", "侵权投诉", "反馈官号",
                        "上传日志", "Copyright", "All Rights Reserved", "输入标题", "文章链接"]

    if any(keyword in line for keyword in exclude_keywords):
        return False

    # 标题通常包含中文、数字、符号，长度适中
    # 排除纯日期格式
    if _is_date(line):
        return False

    # 排除时间格式
    if re.match(r'^\d{1,2}:\d{2}$', line.strip()):
        return False

    return True


def _is_reading_number(line: str) -> bool:
    """
    判断是否是阅读量数字

    Args:
        line: 文本行

    Returns:
        是否是阅读量数字
    """
    # 纯数字
    if line.strip().isdigit():
        return True

    # 可能带逗号分隔的数字
    if re.match(r'^[\d,]+$', line.strip()):
        return True

    return False


def _is_date(line: str) -> bool:
    """
    判断是否是日期

    Args:
        line: 文本行

    Returns:
        是否是日期
    """
    # 匹配格式：2025年12月10日、2025-12-10、2025/12/10
    patterns = [
        r'^\d{4}年\d{1,2}月\d{1,2}日$',
        r'^\d{4}-\d{1,2}-\d{1,2}$',
        r'^\d{4}/\d{1,2}/\d{1,2}$'
    ]

    for pattern in patterns:
        if re.match(pattern, line.strip()):
            return True

    return False


def _normalize_date(date_str: str) -> str:
    """
    标准化日期格式

    Args:
        date_str: 日期字符串

    Returns:
        标准化后的日期（YYYY-MM-DD格式）
    """
    # 尝试各种日期格式
    patterns = [
        (r'(\d{4})年(\d{1,2})月(\d{1,2})日', r'\1-\2-\3'),
        (r'(\d{4})-(\d{1,2})-(\d{1,2})', r'\1-\2-\3'),
        (r'(\d{4})/(\d{1,2})/(\d{1,2})', r'\1-\2-\3'),
    ]

    for pattern, replacement in patterns:
        if re.match(pattern, date_str.strip()):
            normalized = re.sub(pattern, replacement, date_str.strip())
            # 补零
            parts = normalized.split('-')
            if len(parts) == 3:
                parts[1] = parts[1].zfill(2)
                parts[2] = parts[2].zfill(2)
                return '-'.join(parts)

    return date_str.strip()


def validate_article(article: Dict[str, Any]) -> Tuple[bool, str]:
    """
    验证单篇文章数据

    Args:
        article: 文章字典

    Returns:
        (是否有效, 错误信息)
    """
    # 检查标题
    if not article.get("title"):
        return False, "标题不能为空"

    # 检查标题长度
    if len(article["title"]) < 2 or len(article["title"]) > 200:
        return False, "标题长度应在2-200字符之间"

    # 检查阅读量
    reading = article.get("reading", 0)
    if not isinstance(reading, int) or reading < 0:
        return False, "阅读量必须是非负整数"

    # 检查日期格式
    date_str = article.get("date", "")
    if date_str and not _is_date(date_str):
        return False, f"日期格式不正确: {date_str}"

    return True, ""


def check_duplicate(existing_articles: List[Dict[str, Any]], new_articles: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], int]:
    """
    检查并去除重复文章

    Args:
        existing_articles: 原有文章列表
        new_articles: 新文章列表

    Returns:
        (去重后的新文章列表, 重复数量)
    """
    # 创建现有文章标题集合
    existing_titles = {article["title"] for article in existing_articles}

    # 过滤掉重复的文章
    unique_articles = []
    duplicate_count = 0

    for article in new_articles:
        if article["title"] in existing_titles:
            duplicate_count += 1
        else:
            unique_articles.append(article)

    return unique_articles, duplicate_count


def write_to_json(articles: List[Dict[str, Any]], output_file: str, append: bool = True) -> Dict[str, Any]:
    """
    将文章数据写入JSON文件

    Args:
        articles: 文章列表
        output_file: 输出文件路径
        append: 是否追加模式

    Returns:
        写入结果
    """
    # 确保目录存在
    output_dir = os.path.dirname(output_file)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # 如果是追加模式且文件存在，读取现有数据
    existing_data = {"metadata": {}, "articles": [], "statistics": {}}
    existing_articles = []

    if append and os.path.exists(output_file):
        try:
            with open(output_file, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
                existing_articles = existing_data.get("articles", [])
        except Exception as e:
            pass  # 文件损坏或格式错误，忽略现有数据

    # 检查重复
    unique_articles, duplicate_count = check_duplicate(existing_articles, articles)

    if not unique_articles and duplicate_count > 0:
        return {
            "status": "warning",
            "message": f"所有 {len(articles)} 篇文章都已存在，未写入新数据",
            "articles_written": 0,
            "articles_skipped": len(articles),
            "output_file": output_file
        }

    # 为新文章添加ID和创建时间
    max_id = max([article.get("id", 0) for article in existing_articles], default=0)
    for i, article in enumerate(unique_articles):
        max_id += 1
        article["id"] = max_id
        article["created_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # 合并数据
    all_articles = existing_articles + unique_articles

    # 生成统计数据
    statistics = generate_statistics(all_articles)

    # 构建输出数据
    output_data = {
        "metadata": {
            "created": existing_data.get("metadata", {}).get("created", datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
            "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "total_articles": len(all_articles)
        },
        "articles": all_articles,
        "statistics": statistics
    }

    # 写入文件（先备份）
    if os.path.exists(output_file):
        backup_file = output_file + ".bak"
        shutil.copy2(output_file, backup_file)

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    return {
        "status": "success",
        "message": f"成功写入 {len(unique_articles)} 篇文章",
        "articles_written": len(unique_articles),
        "articles_skipped": duplicate_count,
        "output_file": output_file,
        "statistics": statistics
    }


def generate_statistics(articles: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    生成统计数据

    Args:
        articles: 文章列表

    Returns:
        统计信息字典
    """
    if not articles:
        return {
            "total_reading": 0,
            "avg_reading": 0,
            "max_reading": None,
            "min_reading": None,
            "original_count": 0,
            "original_rate": 0
        }

    # 总阅读量
    total_reading = sum(article.get("reading", 0) for article in articles)

    # 平均阅读量
    avg_reading = total_reading // len(articles)

    # 最高阅读量
    max_article = max(articles, key=lambda x: x.get("reading", 0))

    # 最低阅读量
    min_article = min(articles, key=lambda x: x.get("reading", 0))

    # 原创文章数量
    original_count = sum(1 for article in articles if article.get("original", False))

    # 原创率
    original_rate = original_count / len(articles) if articles else 0

    return {
        "total_reading": total_reading,
        "avg_reading": avg_reading,
        "max_reading": {
            "title": max_article.get("title", ""),
            "reading": max_article.get("reading", 0)
        },
        "min_reading": {
            "title": min_article.get("title", ""),
            "reading": min_article.get("reading", 0)
        },
        "original_count": original_count,
        "original_rate": round(original_rate, 2)
    }


def handler(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    主处理函数

    Args:
        args: 包含以下字段的字典
            - action: 操作类型（write_articles/parse_data/validate_data/statistics）
            - data: 原始数据（write_articles/parse_data时必需）
            - output_file: 输出文件路径（可选，默认articles_data.json）
            - append: 是否追加模式（可选，默认True）

    Returns:
        处理结果
    """
    action = args.get("action", "write_articles")
    data = args.get("data", "")
    output_file = args.get("output_file", "articles_data.json")
    append = args.get("append", True)

    result = {}

    if action == "write_articles":
        # 解析数据
        articles = parse_article_data(data)

        if not articles:
            return {
                "status": "error",
                "message": "未能解析出任何文章数据，请检查输入格式",
                "articles_parsed": 0
            }

        # 验证数据
        valid_articles = []
        invalid_articles = 0

        for article in articles:
            is_valid, error_msg = validate_article(article)
            if is_valid:
                valid_articles.append(article)
            else:
                invalid_articles += 1

        if invalid_articles > 0:
            print(f"警告：{invalid_articles} 篇文章数据验证失败，已跳过")

        # 写入JSON
        if valid_articles:
            result = write_to_json(valid_articles, output_file, append)
            result["articles_parsed"] = len(articles)
            result["articles_valid"] = len(valid_articles)
            result["articles_invalid"] = invalid_articles
        else:
            result = {
                "status": "error",
                "message": "没有有效的文章数据可写入",
                "articles_parsed": len(articles),
                "articles_valid": 0,
                "articles_invalid": invalid_articles
            }

    elif action == "parse_data":
        # 仅解析数据
        articles = parse_article_data(data)

        result = {
            "status": "success",
            "articles_parsed": len(articles),
            "articles": articles
        }

    elif action == "validate_data":
        # 验证数据
        articles = parse_article_data(data)
        valid_count = 0
        invalid_count = 0
        errors = []

        for article in articles:
            is_valid, error_msg = validate_article(article)
            if is_valid:
                valid_count += 1
            else:
                invalid_count += 1
                errors.append({
                    "title": article.get("title", ""),
                    "error": error_msg
                })

        result = {
            "status": "success",
            "total": len(articles),
            "valid_count": valid_count,
            "invalid_count": invalid_count,
            "errors": errors
        }

    elif action == "statistics":
        # 读取现有文件并生成统计
        if not os.path.exists(output_file):
            return {
                "status": "error",
                "message": f"文件不存在: {output_file}"
            }

        with open(output_file, 'r', encoding='utf-8') as f:
            data_json = json.load(f)
            articles = data_json.get("articles", [])

        result = {
            "status": "success",
            "statistics": generate_statistics(articles)
        }

    else:
        result = {
            "status": "error",
            "message": f"不支持的操作类型: {action}"
        }

    return result


# 测试代码
if __name__ == "__main__":
    # 测试数据（从公众号后台复制）
    test_data = """
别再写水文了！这套AI写作SOP让逻辑硬核起飞
原创
29412100
2025年12月10日
已发表
2025 年 12 月 AI 年终盘点(一)
11917000
2025年11月29日
已发表
2025年11月29日的碎碎念
原创
110122000
2025年06月26日
已发表
当你不用AI之后，你还会写作吗？
原创
32040000
2025年05月31日
已发表
名字像萌宠，能力却炸裂！字节"小云雀"实测：3分钟榨干抖音流量密码（附操作指南）
原创
29131200
2025年05月22日
已发表
"""

    # 测试解析和写入
    result = handler({
        "action": "write_articles",
        "data": test_data,
        "output_file": "test_articles.json",
        "append": True
    })

    print(json.dumps(result, ensure_ascii=False, indent=2))
