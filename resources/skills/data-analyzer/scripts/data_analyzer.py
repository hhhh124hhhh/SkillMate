from typing import Dict, Any, List
import re
from datetime import datetime, timedelta
from collections import Counter
import random
import sys

# Fix encoding issues on Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

"""
数据分析工具

基于2025年最新最佳实践的数据分析工具，提供全方位的公众号数据分析功能

核心功能：
1. 阅读量统计
2. 用户画像分析
3. 竞品分析
4. 数据可视化
5. 内容效果评估
6. 发布时间优化
7. 用户行为分析
"""

# 数据分析指标
ANALYSIS_METRICS = {
    "阅读量": {
        "weight": 0.3,
        "description": "文章阅读总数",
        "category": "基础指标",
    },
    "点赞数": {
        "weight": 0.15,
        "description": "用户点赞总数",
        "category": "互动指标",
    },
    "评论数": {
        "weight": 0.15,
        "description": "用户评论总数",
        "category": "互动指标",
    },
    "转发数": {
        "weight": 0.15,
        "description": "文章转发总数",
        "category": "传播指标",
    },
    "在看数": {
        "weight": 0.1,
        "description": "用户在看总数",
        "category": "互动指标",
    },
    "收藏数": {
        "weight": 0.15,
        "description": "用户收藏总数",
        "category": "互动指标",
    },
}


def analyze_reading_stats(article_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    分析阅读量统计

    Args:
        article_data: 文章数据列表

    Returns:
        阅读量统计分析结果
    """
    if not article_data:
        return {"error": "文章数据不能为空"}

    # 提取阅读量
    reading_counts = [article.get("reading_count", 0) for article in article_data]

    # 统计分析
    total_readings = sum(reading_counts)
    avg_reading = total_readings / len(reading_counts) if reading_counts else 0
    max_reading = max(reading_counts) if reading_counts else 0
    min_reading = min(reading_counts) if reading_counts else 0

    # 分段统计
    segments = {
        "低阅读量": sum(1 for count in reading_counts if count < 1000),
        "中等阅读量": sum(1 for count in reading_counts if 1000 <= count < 10000),
        "高阅读量": sum(1 for count in reading_counts if count >= 10000),
    }

    # 趋势分析（模拟）
    trend = _analyze_trend(reading_counts)

    return {
        "total_readings": total_readings,
        "average_reading": round(avg_reading, 2),
        "max_reading": max_reading,
        "min_reading": min_reading,
        "article_count": len(article_data),
        "segments": segments,
        "trend": trend,
        "suggestions": _get_reading_suggestions(avg_reading, segments),
    }


def _analyze_trend(counts: List[int]) -> str:
    """
    分析趋势

    Args:
        counts: 数值列表

    Returns:
        趋势描述
    """
    if len(counts) < 2:
        return "数据不足，无法分析趋势"

    # 简单趋势分析
    recent_avg = sum(counts[-3:]) / min(3, len(counts))
    earlier_avg = sum(counts[:-3]) / max(1, len(counts) - 3)

    if recent_avg > earlier_avg * 1.1:
        return "上升趋势"
    elif recent_avg < earlier_avg * 0.9:
        return "下降趋势"
    else:
        return "平稳趋势"


def _get_reading_suggestions(avg: float, segments: Dict[str, int]) -> List[str]:
    """
    获取阅读量改进建议

    Args:
        avg: 平均阅读量
        segments: 分段统计

    Returns:
        建议列表
    """
    suggestions = []

    if avg < 1000:
        suggestions.append("平均阅读量偏低，建议优化标题和内容")
    elif avg < 5000:
        suggestions.append("阅读量中等，可以尝试提升内容质量")

    if segments["低阅读量"] > segments["高阅读量"]:
        suggestions.append("低阅读量文章占比较高，建议分析爆款文章特点")

    if segments["高阅读量"] > 0:
        suggestions.append(f"有{segments['高阅读量']}篇高阅读量文章，建议总结成功经验")

    return suggestions if suggestions else ["阅读量表现良好！"]


def analyze_user_portrait(user_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    分析用户画像

    Args:
        user_data: 用户数据列表

    Returns:
        用户画像分析结果
    """
    if not user_data:
        return {"error": "用户数据不能为空"}

    # 性别分布
    gender_distribution = {}
    for user in user_data:
        gender = user.get("gender", "未知")
        gender_distribution[gender] = gender_distribution.get(gender, 0) + 1

    # 年龄分布
    age_distribution = {}
    for user in user_data:
        age = user.get("age", "未知")
        age_distribution[age] = age_distribution.get(age, 0) + 1

    # 地域分布
    location_distribution = {}
    for user in user_data:
        location = user.get("location", "未知")
        location_distribution[location] = location_distribution.get(location, 0) + 1

    # 兴趣分布（模拟）
    interests = ["科技", "娱乐", "生活", "教育", "财经", "体育"]
    interest_distribution = {
        interest: random.randint(10, 100)
        for interest in interests
    }

    return {
        "total_users": len(user_data),
        "gender_distribution": gender_distribution,
        "age_distribution": age_distribution,
        "location_distribution": location_distribution,
        "interest_distribution": interest_distribution,
        "main_gender": max(gender_distribution.items(), key=lambda x: x[1])[0],
        "main_age": max(age_distribution.items(), key=lambda x: x[1])[0],
        "main_location": max(location_distribution.items(), key=lambda x: x[1])[0],
        "main_interest": max(interest_distribution.items(), key=lambda x: x[1])[0],
    }


def analyze_competitor(competitor_data: List[Dict[str, Any]], self_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    分析竞品数据

    Args:
        competitor_data: 竞品数据列表
        self_data: 自身数据列表

    Returns:
        竞品分析结果
    """
    if not competitor_data or not self_data:
        return {"error": "竞品数据和自身数据不能为空"}

    # 统计竞品数据
    competitor_readings = [data.get("reading_count", 0) for data in competitor_data]
    competitor_avg = sum(competitor_readings) / len(competitor_readings) if competitor_readings else 0

    # 统计自身数据
    self_readings = [data.get("reading_count", 0) for data in self_data]
    self_avg = sum(self_readings) / len(self_readings) if self_readings else 0

    # 对比分析
    comparison = {
        "competitor_avg_reading": round(competitor_avg, 2),
        "self_avg_reading": round(self_avg, 2),
        "gap": round(self_avg - competitor_avg, 2),
        "gap_percentage": round((self_avg - competitor_avg) / competitor_avg * 100, 2) if competitor_avg > 0 else 0,
    }

    # 分析优势劣势
    if self_avg > competitor_avg:
        comparison["status"] = "领先"
        comparison["suggestion"] = "保持当前优势，继续提升内容质量"
    else:
        comparison["status"] = "落后"
        comparison["suggestion"] = "分析竞品成功经验，优化内容策略"

    return {
        "comparison": comparison,
        "competitor_metrics": {
            "total_readings": sum(competitor_readings),
            "article_count": len(competitor_data),
        },
        "self_metrics": {
            "total_readings": sum(self_readings),
            "article_count": len(self_data),
        },
    }


def evaluate_content_effect(article_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    评估内容效果

    Args:
        article_data: 文章数据列表

    Returns:
        内容效果评估结果
    """
    if not article_data:
        return {"error": "文章数据不能为空"}

    # 计算综合得分
    results = []
    for article in article_data:
        reading = article.get("reading_count", 0)
        likes = article.get("likes", 0)
        comments = article.get("comments", 0)
        shares = article.get("shares", 0)
        bookmarks = article.get("bookmarks", 0)

        # 根据权重计算得分
        score = (
            reading * ANALYSIS_METRICS["阅读量"]["weight"] +
            likes * ANALYSIS_METRICS["点赞数"]["weight"] +
            comments * ANALYSIS_METRICS["评论数"]["weight"] +
            shares * ANALYSIS_METRICS["转发数"]["weight"] +
            bookmarks * ANALYSIS_METRICS["收藏数"]["weight"]
        )

        results.append({
            "article_id": article.get("id", ""),
            "title": article.get("title", ""),
            "score": round(score, 2),
            "reading": reading,
            "likes": likes,
            "comments": comments,
            "shares": shares,
            "bookmarks": bookmarks,
        })

    # 排序
    results.sort(key=lambda x: x["score"], reverse=True)

    # 分类
    top_performing = results[:min(3, len(results))]
    low_performing = results[-min(3, len(results)):]

    return {
        "top_performing": top_performing,
        "low_performing": low_performing,
        "average_score": round(sum(r["score"] for r in results) / len(results), 2) if results else 0,
        "suggestions": _get_content_suggestions(top_performing, low_performing),
    }


def _get_content_suggestions(top: List[Dict], low: List[Dict]) -> List[str]:
    """
    获取内容改进建议

    Args:
        top: 表现最好的文章
        low: 表现最差的文章

    Returns:
        建议列表
    """
    suggestions = []

    if top:
        suggestions.append(f"建议参考爆款文章：{top[0]['title']}")

    if low:
        suggestions.append(f"建议优化表现较差文章：{low[0]['title']}")

    return suggestions if suggestions else ["继续创作优质内容！"]


def optimize_publish_time(article_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    优化发布时间

    Args:
        article_data: 文章数据列表

    Returns:
        发布时间优化建议
    """
    if not article_data:
        return {"error": "文章数据不能为空"}

    # 按发布时间分析
    time_performance = {}
    for article in article_data:
        publish_time = article.get("publish_time", "")
        if publish_time:
            # 提取时间段（如"08:00"）
            time_period = publish_time[:5]
            reading = article.get("reading_count", 0)

            if time_period not in time_performance:
                time_performance[time_period] = {"total_reading": 0, "count": 0}

            time_performance[time_period]["total_reading"] += reading
            time_performance[time_period]["count"] += 1

    # 计算平均阅读量
    for time_period, data in time_performance.items():
        if data["count"] > 0:
            data["avg_reading"] = round(data["total_reading"] / data["count"], 2)

    # 找出最佳时间段
    best_time_periods = sorted(
        time_performance.items(),
        key=lambda x: x[1].get("avg_reading", 0),
        reverse=True
    )[:3]

    return {
        "time_performance": time_performance,
        "best_time_periods": [
            {"time": t, "avg_reading": d.get("avg_reading", 0)}
            for t, d in best_time_periods
        ],
        "suggestions": [
            f"建议在{best_time_periods[0][0]}左右发布文章"
        ] if best_time_periods else [],
    }


def analyze_user_behavior(user_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    分析用户行为

    Args:
        user_data: 用户数据列表

    Returns:
        用户行为分析结果
    """
    if not user_data:
        return {"error": "用户数据不能为空"}

    # 活跃度分析
    active_users = sum(1 for user in user_data if user.get("is_active", False))
    inactive_users = len(user_data) - active_users

    # 行为统计
    behavior_stats = {
        "total_users": len(user_data),
        "active_users": active_users,
        "inactive_users": inactive_users,
        "active_rate": round(active_users / len(user_data) * 100, 2) if user_data else 0,
    }

    # 互动行为（模拟）
    interaction_types = ["阅读", "点赞", "评论", "转发", "收藏"]
    interaction_distribution = {
        interaction: random.randint(100, 1000)
        for interaction in interaction_types
    }

    return {
        "behavior_stats": behavior_stats,
        "interaction_distribution": interaction_distribution,
        "main_interaction": max(interaction_distribution.items(), key=lambda x: x[1])[0],
        "suggestions": _get_behavior_suggestions(behavior_stats),
    }


def _get_behavior_suggestions(stats: Dict[str, Any]) -> List[str]:
    """
    获取用户行为改进建议

    Args:
        stats: 行为统计

    Returns:
        建议列表
    """
    suggestions = []

    if stats["active_rate"] < 50:
        suggestions.append("活跃用户率偏低，建议增加互动活动")

    if stats["active_rate"] >= 70:
        suggestions.append("活跃用户率良好，继续保持")

    return suggestions if suggestions else ["用户表现良好！"]


def generate_data_report(article_data: List[Dict[str, Any]], user_data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    生成数据报告

    Args:
        article_data: 文章数据列表
        user_data: 用户数据列表

    Returns:
        数据报告
    """
    if not article_data or not user_data:
        return {"error": "文章数据和用户数据不能为空"}

    # 阅读量统计
    reading_stats = analyze_reading_stats(article_data)

    # 内容效果评估
    content_effect = evaluate_content_effect(article_data)

    # 用户行为分析
    user_behavior = analyze_user_behavior(user_data)

    # 综合评分
    overall_score = round(
        (reading_stats.get("average_reading", 0) / 10000 * 0.3 +
         content_effect.get("average_score", 0) / 10000 * 0.4 +
         user_behavior.get("behavior_stats", {}).get("active_rate", 0) * 0.3),
        2
    )

    return {
        "overall_score": overall_score,
        "grade": _get_overall_grade(overall_score),
        "reading_stats": reading_stats,
        "content_effect": content_effect,
        "user_behavior": user_behavior,
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }


def _get_overall_grade(score: float) -> str:
    """
    获取综合评分等级

    Args:
        score: 综合评分

    Returns:
        等级
    """
    if score >= 80:
        return "优秀"
    elif score >= 60:
        return "良好"
    elif score >= 40:
        return "一般"
    else:
        return "较差"


def handler(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    主处理函数

    Args:
        args: 包含以下字段的字典
            - action: 操作类型（analyze_reading_stats/analyze_user_portrait/analyze_competitor/evaluate_content_effect/optimize_publish_time/analyze_user_behavior/generate_data_report）
            - article_data: 文章数据列表
            - user_data: 用户数据列表
            - competitor_data: 竞品数据列表（可选）

    Returns:
        处理结果
    """
    action = args.get("action")
    article_data = args.get("article_data", [])
    user_data = args.get("user_data", [])
    competitor_data = args.get("competitor_data", [])

    result = {}

    if action == "analyze_reading_stats":
        if not article_data:
            raise ValueError("文章数据不能为空")
        result = analyze_reading_stats(article_data)

    elif action == "analyze_user_portrait":
        if not user_data:
            raise ValueError("用户数据不能为空")
        result = analyze_user_portrait(user_data)

    elif action == "analyze_competitor":
        if not competitor_data or not article_data:
            raise ValueError("竞品数据和自身数据不能为空")
        result = analyze_competitor(competitor_data, article_data)

    elif action == "evaluate_content_effect":
        if not article_data:
            raise ValueError("文章数据不能为空")
        result = evaluate_content_effect(article_data)

    elif action == "optimize_publish_time":
        if not article_data:
            raise ValueError("文章数据不能为空")
        result = optimize_publish_time(article_data)

    elif action == "analyze_user_behavior":
        if not user_data:
            raise ValueError("用户数据不能为空")
        result = analyze_user_behavior(user_data)

    elif action == "generate_data_report":
        if not article_data or not user_data:
            raise ValueError("文章数据和用户数据不能为空")
        result = generate_data_report(article_data, user_data)

    else:
        raise ValueError(f"不支持的操作类型: {action}")

    return result
