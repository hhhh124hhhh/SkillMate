"""
获取当前真实时间

用途：在撰写新闻类文章时，快速获取当前真实日期和时间
防止：将真实新闻误判为"虚构内容"
"""

import sys
import json
from datetime import datetime

# Fix encoding issues on Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


def get_current_time():
    """
    获取当前真实时间

    Returns:
        dict: 包含当前时间信息的字典
    """
    now = datetime.now()

    time_info = {
        "current_date": now.strftime("%Y年%m月%d日"),
        "current_time": now.strftime("%H:%M:%S"),
        "year": now.year,
        "month": now.month,
        "day": now.day,
        "weekday": now.strftime("%A"),
        "weekday_cn": now.strftime("%A"),  # 可以扩展为中文
        "full_datetime": now.strftime("%Y年%m月%d日 %H:%M:%S"),
        "timestamp": now.timestamp(),
        "iso_format": now.isoformat(),
    }

    return time_info


def format_time_for_article(time_info=None):
    """
    格式化时间为文章常用格式

    Args:
        time_info: 时间信息字典，如果为None则获取当前时间

    Returns:
        dict: 包含多种格式的时间字符串
    """
    if time_info is None:
        time_info = get_current_time()

    now = datetime.now()

    article_formats = {
        "今天": f"{now.year}年{now.month}月{now.day}日",
        "今天上午": f"{now.year}年{now.month}月{now.day}日上午",
        "今天下午": f"{now.year}年{now.month}月{now.day}日下午",
        "昨天": f"{now.year}年{now.month}月{now.day-1}日",
        "本周": f"{now.year}年{now.month}月第{now.day//7+1}周",
        "本月": f"{now.year}年{now.month}月",
        "今年": f"{now.year}年",
        "相对时间_今天": "今天",
        "相对时间_昨天": "昨天",
        "相对时间_本周": "本周",
        "相对时间_本月": "本月",
    }

    return article_formats


def check_date_difference(target_date_str):
    """
    检查目标日期与今天的差异

    Args:
        target_date_str: 目标日期字符串，格式如 "2026-01-15" 或 "2026年1月15日"

    Returns:
        dict: 包含差异信息的字典
    """
    now = datetime.now()

    # 尝试解析多种日期格式
    date_formats = [
        "%Y-%m-%d",
        "%Y年%m月%d日",
        "%Y/%m/%d",
    ]

    target_date = None
    for fmt in date_formats:
        try:
            target_date = datetime.strptime(target_date_str, fmt)
            break
        except ValueError:
            continue

    if target_date is None:
        return {
            "error": f"无法解析日期: {target_date_str}",
            "supported_formats": ["YYYY-MM-DD", "YYYY年MM月DD日", "YYYY/MM/DD"]
        }

    # 计算差异
    delta = target_date - now
    days_diff = delta.days

    result = {
        "target_date": target_date.strftime("%Y年%m月%d日"),
        "today": now.strftime("%Y年%m月%d日"),
        "days_difference": days_diff,
        "is_future": days_diff > 0,
        "is_past": days_diff < 0,
        "is_today": days_diff == 0,
        "human_readable": "",
    }

    # 生成人类可读的差异描述
    if days_diff == 0:
        result["human_readable"] = "就是今天"
    elif days_diff > 0:
        if days_diff == 1:
            result["human_readable"] = "明天"
        elif days_diff < 7:
            result["human_readable"] = f"{days_diff}天后"
        elif days_diff < 30:
            weeks = days_diff // 7
            result["human_readable"] = f"{weeks}周后"
        elif days_diff < 365:
            months = days_diff // 30
            result["human_readable"] = f"{months}个月后"
        else:
            years = days_diff // 365
            result["human_readable"] = f"{years}年后"
    else:
        if days_diff == -1:
            result["human_readable"] = "昨天"
        elif days_diff > -7:
            result["human_readable"] = f"{abs(days_diff)}天前"
        elif days_diff > -30:
            weeks = abs(days_diff) // 7
            result["human_readable"] = f"{weeks}周前"
        elif days_diff > -365:
            months = abs(days_diff) // 30
            result["human_readable"] = f"{months}个月前"
        else:
            years = abs(days_diff) // 365
            result["human_readable"] = f"{years}年前"

    return result


def handler(args):
    """
    主处理函数

    Args:
        args: 包含action字段的字典
            - "get_current": 获取当前时间
            - "format_for_article": 获取文章常用格式
            - "check_date": 检查日期差异（需要提供target_date参数）

    Returns:
        处理结果字典
    """
    action = args.get("action", "get_current")

    if action == "get_current":
        result = get_current_time()
        result["action"] = "get_current"
        return result

    elif action == "format_for_article":
        time_info = get_current_time()
        formats = format_time_for_article(time_info)
        formats["action"] = "format_for_article"
        formats["current_time"] = time_info
        return formats

    elif action == "check_date":
        target_date = args.get("target_date")
        if not target_date:
            return {
                "error": "请提供target_date参数",
                "example": "2026-01-15 或 2026年1月15日"
            }
        result = check_date_difference(target_date)
        result["action"] = "check_date"
        return result

    else:
        return {
            "error": f"不支持的操作: {action}",
            "supported_actions": ["get_current", "format_for_article", "check_date"]
        }


if __name__ == "__main__":
    # 命令行使用示例
    import argparse

    parser = argparse.ArgumentParser(description="获取当前时间工具")
    parser.add_argument("--action", default="get_current",
                       choices=["get_current", "format_for_article", "check_date"],
                       help="执行的操作")
    parser.add_argument("--target-date", help="要检查的目标日期（用于check_date操作）")

    args_parsed = parser.parse_args()

    if args_parsed.action == "check_date":
        if not args_parsed.target_date:
            print("错误: check_date操作需要提供--target-date参数")
            sys.exit(1)
        result = handler({
            "action": "check_date",
            "target_date": args_parsed.target_date
        })
    else:
        result = handler({"action": args_parsed.action})

    # 输出JSON格式结果
    print(json.dumps(result, ensure_ascii=False, indent=2))
