from typing import Dict, Any, List
import requests
import urllib.request
import json
from datetime import datetime, timedelta
import time
from collections import Counter
import random
import sys

# Fix encoding issues on Windows
# 仅在非API服务环境下应用编码修复（避免与FastAPI/Uvicorn日志系统冲突）
import os
if sys.platform == 'win32' and not os.getenv('DISABLE_ENCODING_FIX'):
    import io
    # 检查是否已经被重定向过，避免重复
    if not isinstance(sys.stdout, io.TextIOWrapper):
        try:
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        except (AttributeError, ValueError):
            pass  # stdout 已被重定向或不可用
    if not isinstance(sys.stderr, io.TextIOWrapper):
        try:
            sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
        except (AttributeError, ValueError):
            pass  # stderr 已被重定向或不可用

"""
选题搜索工具

基于2025年最新最佳实践的选题搜索工具，提供全方位的选题推荐和分析功能

核心功能：
1. 热点追踪：多平台实时热点监控
2. 智能推荐：基于定位和历史的选题推荐
3. 选题评估：评估选题价值和可行性
4. 竞品监控：监控竞品热门选题
5. 选题库管理：收藏和管理选题
"""

# API接口配置
API_ENDPOINTS = {
    "微博热搜": "https://cn.apihz.cn/api/xinwen/weibo2.php",
    "百度热搜": "https://cn.apihz.cn/api/xinwen/baidu.php",
}

# api.aa1.cn百度热搜API配置
SOGOU_BAIDU_CONFIG = {
    "base_url": "https://v.api.aa1.cn/api/sougou-baidu/",
}

# uapis.cn热榜API配置
UAPIS_CONFIG = {
    "base_url": "https://uapis.cn/api/v1/misc/hotboard",
    "platforms": {
        "微博": "weibo",
        "知乎": "zhihu",
        "B站": "bilibili",
        "抖音": "douyin",
        "虎嗅": "huxiu",
        "少数派": "sspai",
        "IT之家": "ithome",
        "掘金": "juejin",
        "今日头条": "toutiao",
        "豆瓣": "douban",
        "百度": "baidu",
    },
}

# DailyHotApi配置（推荐API - 免费、开源、45+平台）
# GitHub: https://github.com/imsyy/DailyHotApi
#
# 默认使用公共API（开箱即用）：
# - 无需部署，直接使用
# - 可能有访问限制
#
# 自建服务（推荐用于生产环境）：
# docker run -d -p 6688:6688 imsyy/dailyhot-api:latest
DAILYHOT_API_CONFIG = {
    "base_url": "https://api.imsyy.top",  # 公共API（默认，开箱即用）
    # "base_url": "http://localhost:6688",  # 自建服务（推荐生产环境使用）
    "platforms": {
        "微博": "weibo",
        "知乎": "zhihu",
        "百度": "baidu",
        "B站": "bilibili",
        "抖音": "douyin",
        "快手": "kuaishou",
        "今日头条": "toutiao",
        "豆瓣": "douban",
        "虎嗅": "huxiu",
        "少数派": "sspai",
        "IT之家": "ithome",
        "掘金": "juejin",
        "36氪": "36kr",
        "澎湃": "thepaper",
        "网易新闻": "163",
        "新浪新闻": "sina",
        "腾讯新闻": "qq",
        "搜狗": "sogou",
        "知乎日报": "zhihu-daily",
        "CSDN": "csdn",
        "GitHub": "github",
        "ProductHunt": "producthunt",
        " HackerNews": "hackernews",
        "少数派": "sspai",
        "V2EX": "v2ex",
        "SegmentFault": "segmentfault",
        "简书": "jianshu",
        "Steam": "steam",
        "游民星空": "gamersky",
        "NGA": "nga",
        "TapTap": "taptap",
        "什么值得买": "smzdm",
        "汽车之家": "autohome",
        "易车": "yiche",
        "懂车帝": "dongchedi",
        "哔哩哔哩": "bilibili",
        "AcFun": "acfun",
        "梨视频": "pearvideo",
        "界面": "jiemian",
        "财经网": "caijing",
        "第一财经": "yicai",
        "财新网": "caixin",
        "华尔街见闻": "wallstreetcn",
        "雪球": "xueqiu",
        "天天基金": "fund",
        "券商中国": "stcn",
        "中国基金报": "chinafund",
        "21财经": "21jingji",
        "丁香园": "dxy",
        "科普中国": "kepuchina",
        "中国国家地理": "ngchina",
    },
}

# 公共测试凭证
PUBLIC_CREDENTIALS = {
    "id": "88888888",
    "key": "88888888",
}

# 平台类型映射
PLATFORM_TYPES = {
    "微博热搜": "综合",
    "微博": "综合",
    "知乎热榜": "综合",
    "知乎": "综合",
    "百度热搜": "综合",
    "百度": "综合",
    "抖音热搜": "娱乐",
    "抖音": "娱乐",
    "哔哩哔哩热搜": "科技",
    "B站": "科技",
    "bilibili": "科技",
    "虎嗅": "科技",
    "少数派": "科技",
    "IT之家": "科技",
    "掘金": "科技",
    "今日头条": "综合",
    "豆瓣": "综合",
}

# 热点分类关键词
CATEGORY_KEYWORDS = {
    "科技": ["AI", "人工智能", "ChatGPT", "DeepSeek", "技术", "科技", "编程", "开发", "算法", "数据", "云计算", "5G", "芯片", "半导体", "互联网", "软件", "硬件", "手机", "电脑", "APP", "工具", "产品"],
    "AI": ["AI", "人工智能", "ChatGPT", "DeepSeek", "文心一言", "通义千问", "豆包", "智谱", "大模型", "GPT", "机器学习", "深度学习", "自然语言处理", "生成式AI", "AIGC", "LLM"],
    "娱乐": ["明星", "电影", "电视剧", "综艺", "音乐", "游戏", "动漫", "网红", "直播", "粉丝", "热搜", "八卦"],
    "社会": ["社会", "民生", "政策", "法律", "教育", "医疗", "健康", "环境", "交通", "房产", "就业", "民生"],
}

# 选题评估指标
TOPIC_EVALUATION_METRICS = {
    "时效性": {"weight": 0.3, "description": "话题的时效性和新鲜度"},
    "热度": {"weight": 0.25, "description": "话题的热度和传播度"},
    "匹配度": {"weight": 0.25, "description": "与账号定位的匹配程度"},
    "合规性": {"weight": 0.1, "description": "内容的合规性和安全性"},
    "切入点": {"weight": 0.1, "description": "与其他创作者的差异化"},
}


def fetch_hot_topics(platform: str = "微博热搜", token: str = None, limit: int = 20) -> Dict[str, Any]:
    """
    获取指定平台的热点话题

    Args:
        platform: 平台名称（微博热搜、知乎、百度、抖音等）
        token: API token（可选，使用公共测试凭证）
        limit: 获取数量

    Returns:
        热点话题数据
    """
    endpoint = API_ENDPOINTS.get(platform)
    if not endpoint:
        return {"error": f"不支持的平台: {platform}"}

    try:
        # 构建请求参数
        params = {
            "id": PUBLIC_CREDENTIALS["id"],
            "key": PUBLIC_CREDENTIALS["key"],
        }

        # 发送请求
        response = requests.get(endpoint, params=params, timeout=10)

        if response.status_code != 200:
            return {"error": f"API请求失败，状态码：{response.status_code}"}

        # 解析响应
        data = response.json()

        # 检查响应状态
        if data.get("code") != 200:
            error_msg = data.get("message", "未知错误")
            return {"error": f"API返回错误：{error_msg}"}

        # 解析热点数据
        topics = []
        hot_list = data.get("data", [])

        for item in hot_list[:limit]:
            # 跳过"查看更多"这类特殊条目
            if "查看更多" in item.get("title", ""):
                continue

            topics.append({
                "title": item.get("title", ""),
                "url": item.get("scheme", ""),
                "hot": item.get("desc_extr", ""),
                "platform": platform,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            })

        return {
            "platform": platform,
            "count": len(topics),
            "topics": topics,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }

    except requests.exceptions.Timeout:
        return {"error": "请求超时"}
    except requests.exceptions.RequestException as e:
        return {"error": f"请求失败: {str(e)}"}
    except Exception as e:
        return {"error": f"解析失败: {str(e)}"}


def fetch_uapis_hot_topics(platform: str = "微博", limit: int = 20) -> Dict[str, Any]:
    """
    使用uapis.cn获取指定平台的热点话题

    Args:
        platform: 平台名称（微博/知乎/B站/抖音/虎嗅等）
        limit: 获取数量

    Returns:
        热点话题数据
    """
    platform_type = UAPIS_CONFIG["platforms"].get(platform)
    if not platform_type:
        return {"error": f"不支持的平台: {platform}"}

    try:
        # 构建请求URL
        url = f"{UAPIS_CONFIG['base_url']}?type={platform_type}&limit={limit}"

        # 发送请求
        response = requests.get(url, timeout=10)

        if response.status_code != 200:
            return {"error": f"API请求失败，状态码：{response.status_code}"}

        # 解析响应
        data = response.json()

        # 检查响应状态
        if data.get("code") != 200:
            error_msg = data.get("message", "未知错误")
            return {"error": f"API返回错误：{error_msg}"}

        # 解析热点数据
        topics = []
        hot_list = data.get("data", [])

        for item in hot_list[:limit]:
            topics.append({
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "hot": item.get("hot", ""),
                "platform": platform,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            })

        return {
            "platform": platform,
            "count": len(topics),
            "topics": topics,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }

    except requests.exceptions.Timeout:
        return {"error": "请求超时"}
    except requests.exceptions.RequestException as e:
        return {"error": f"请求失败: {str(e)}"}
    except Exception as e:
        return {"error": f"解析失败: {str(e)}"}



def fetch_all_hot_topics(token: str = None, platforms: List[str] = None, limit: int = 10) -> Dict[str, Any]:
    """
    获取所有平台的热点话题

    Args:
        token: API token
        platforms: 平台列表（默认全部平台）
        limit: 每个平台获取数量

    Returns:
        所有平台的热点数据
    """
    if not platforms:
        platforms = list(API_ENDPOINTS.keys())

    all_topics = {}
    for platform in platforms:
        result = fetch_hot_topics(platform, token, limit)
        if "topics" in result:
            all_topics[platform] = result

    return {
        "total_platforms": len(all_topics),
        "platforms": all_topics,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }


def fetch_all_uapis_topics(platforms: List[str] = None, limit: int = 10) -> Dict[str, Any]:
    """
    使用uapis.cn获取所有平台的热点话题

    Args:
        platforms: 平台列表（默认全部uapis.cn支持的平台）
        limit: 每个平台获取数量

    Returns:
        所有平台的热点数据
    """
    if not platforms:
        platforms = list(UAPIS_CONFIG["platforms"].keys())

    all_topics = {}
    for platform in platforms:
        result = fetch_uapis_hot_topics(platform, limit)
        if "topics" in result:
            all_topics[platform] = result

    return {
        "total_platforms": len(all_topics),
        "platforms": all_topics,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }


def fetch_sogou_baidu_hot_topics(limit: int = 20) -> Dict[str, Any]:
    """
    使用api.aa1.cn获取搜狗百度热搜

    Args:
        limit: 获取数量

    Returns:
        搜狗百度热搜数据
    """
    try:
        url = f"{SOGOU_BAIDU_CONFIG['base_url']}"
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')

        with urllib.request.urlopen(req, timeout=10) as response:
            data = response.read().decode('utf-8')
            json_data = json.loads(data)

            if json_data.get("code") != 200:
                error_msg = json_data.get("message", "未知错误")
                return {"error": f"API返回错误：{error_msg}"}

            # 解析热点数据
            topics = []
            hot_list = json_data.get("data", [])

            for item in hot_list[:limit]:
                topics.append({
                    "title": item.get("title", ""),
                    "url": item.get("url", ""),
                    "hot": item.get("hot", ""),
                    "platform": "搜狗百度",
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                })

            return {
                "platform": "搜狗百度",
                "count": len(topics),
                "topics": topics,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            }

    except urllib.error.URLError as e:
        return {"error": f"请求失败: {str(e)}"}
    except Exception as e:
        return {"error": f"解析失败: {str(e)}"}


def fetch_dailyhot_topics(platform: str = "微博", limit: int = 20) -> Dict[str, Any]:
    """
    使用DailyHotApi获取热点（推荐API - 免费、开源、45+平台）

    优势：
    - 完全免费，无调用限制
    - 支持45+个平台
    - 可自行Docker部署，自主可控
    - 60分钟缓存机制，响应快速
    - 社区活跃，持续维护

    部署方法：
    docker pull imsyy/dailyhot-api:latest
    docker run -d -p 6688:6688 --name dailyhot-api imsyy/dailyhot-api:latest

    Args:
        platform: 平台名称（微博/知乎/百度/B站/抖音等45+平台）
        limit: 获取数量

    Returns:
        热点话题数据
    """
    platform_type = DAILYHOT_API_CONFIG["platforms"].get(platform)
    if not platform_type:
        return {"error": f"不支持的平台: {platform}。支持的平台: {', '.join(list(DAILYHOT_API_CONFIG['platforms'].keys())[:10])}等{len(DAILYHOT_API_CONFIG['platforms'])}个"}

    try:
        # 构建请求URL
        url = f"{DAILYHOT_API_CONFIG['base_url']}/{platform_type}"

        # 发送请求
        response = requests.get(url, timeout=10)

        if response.status_code != 200:
            return {"error": f"API请求失败，状态码：{response.status_code}。请检查DailyHotApi服务是否已启动（docker ps | grep dailyhot）"}

        # 解析响应
        data = response.json()

        # DailyHotApi返回格式: {"code": 200, "msg": "success", "data": [...]}
        if data.get("code") != 200:
            error_msg = data.get("msg", "未知错误")
            return {"error": f"API返回错误：{error_msg}"}

        # 解析热点数据
        topics = []
        hot_list = data.get("data", [])

        for item in hot_list[:limit]:
            topics.append({
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "hot": item.get("hot", ""),
                "platform": platform,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            })

        return {
            "platform": platform,
            "source": "DailyHotApi",
            "count": len(topics),
            "topics": topics,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }

    except requests.exceptions.ConnectionError:
        return {"error": "无法连接到DailyHotApi服务。请确认：1) 服务已启动（docker ps | grep dailyhot）2) 端口6688可访问 3) base_url配置正确"}
    except requests.exceptions.Timeout:
        return {"error": "请求超时"}
    except requests.exceptions.RequestException as e:
        return {"error": f"请求失败: {str(e)}"}
    except Exception as e:
        return {"error": f"解析失败: {str(e)}"}


def fetch_all_dailyhot_topics(platforms: List[str] = None, limit: int = 10) -> Dict[str, Any]:
    """
    使用DailyHotApi获取所有平台的热点话题

    Args:
        platforms: 平台列表（默认获取前8个主要平台）
        limit: 每个平台获取数量

    Returns:
        所有平台的热点数据
    """
    if not platforms:
        # 默认获取8个主要平台
        platforms = ["微博", "知乎", "百度", "B站", "抖音", "今日头条", "虎嗅", "IT之家"]

    all_topics = {}
    for platform in platforms:
        result = fetch_dailyhot_topics(platform, limit)
        if "topics" in result:
            all_topics[platform] = result

    return {
        "source": "DailyHotApi",
        "total_platforms": len(all_topics),
        "platforms": all_topics,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }


def filter_topics_by_category(hot_topics: Dict[str, Any], category: str) -> Dict[str, Any]:
    """
    按类别筛选热点

    Args:
        hot_topics: 热点数据
        category: 类别（科技/AI/娱乐/社会）

    Returns:
        筛选后的热点数据
    """
    if category not in CATEGORY_KEYWORDS:
        return {"error": f"不支持的类别: {category}"}

    keywords = CATEGORY_KEYWORDS[category]
    filtered_topics = {}

    for platform, platform_data in hot_topics.get("platforms", {}).items():
        topics = platform_data.get("topics", [])
        matched_topics = []

        for topic in topics:
            title = topic.get("title", "")
            if any(keyword.lower() in title.lower() for keyword in keywords):
                matched_topics.append(topic)

        if matched_topics:
            filtered_topics[platform] = {
                "platform": platform,
                "count": len(matched_topics),
                "topics": matched_topics,
                "category": category,
            }

    return {
        "category": category,
        "total_platforms": len(filtered_topics),
        "platforms": filtered_topics,
        "total_topics": sum(data["count"] for data in filtered_topics.values()),
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }


def fetch_tech_topics(limit: int = 20) -> Dict[str, Any]:
    """
    获取科技/AI相关热点

    Args:
        limit: 获取数量

    Returns:
        科技/AI热点数据
    """
    # 使用uapis.cn获取所有平台热点
    all_topics = fetch_all_uapis_topics(None, limit)
    
    tech_result = filter_topics_by_category(all_topics, "科技")
    ai_result = filter_topics_by_category(all_topics, "AI")

    return {
        "tech_topics": tech_result,
        "ai_topics": ai_result,
        "total_tech_topics": tech_result.get("total_topics", 0),
        "total_ai_topics": ai_result.get("total_topics", 0),
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }


def recommend_topics(account_niche: str, account_topics: List[str], hot_topics: Dict[str, Any]) -> Dict[str, Any]:
    """
    基于账号定位和历史数据推荐选题

    Args:
        account_niche: 账号定位（如：科技、财经、教育等）
        account_topics: 账号历史选题列表
        hot_topics: 热点数据

    Returns:
        选题推荐结果
    """
    recommendations = []

    # 分析历史选题
    topic_history = account_topics if account_topics else []
    topic_keywords = _extract_keywords(topic_history)

    # 遍历所有平台的热点
    for platform, platform_data in hot_topics.get("platforms", {}).items():
        topics = platform_data.get("topics", [])

        for topic in topics:
            title = topic.get("title", "")

            # 计算匹配度
            match_score = _calculate_match_score(title, account_niche, topic_keywords)

            # 过滤低匹配度的选题
            if match_score > 0.3:
                recommendations.append({
                    "title": title,
                    "url": topic.get("url", ""),
                    "platform": platform,
                    "hot": topic.get("hot", ""),
                    "match_score": round(match_score, 2),
                    "recommendation_reason": _get_recommendation_reason(match_score),
                })

    # 按匹配度排序
    recommendations.sort(key=lambda x: x["match_score"], reverse=True)

    return {
        "account_niche": account_niche,
        "total_recommendations": len(recommendations),
        "recommendations": recommendations[:20],  # 返回前20个推荐
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }


def _extract_keywords(topics: List[str]) -> List[str]:
    """
    从历史选题中提取关键词

    Args:
        topics: 历史选题列表

    Returns:
        关键词列表
    """
    # 简单的关键词提取（实际应用中可以使用jieba等NLP工具）
    keywords = []
    for topic in topics:
        words = topic.split()
        keywords.extend(words)

    # 统计词频，返回高频词
    counter = Counter(keywords)
    return [word for word, count in counter.most_common(20)]


def _calculate_match_score(title: str, account_niche: str, keywords: List[str]) -> float:
    """
    计算选题与账号的匹配度

    Args:
        title: 选题标题
        account_niche: 账号定位
        keywords: 历史选题关键词

    Returns:
        匹配度分数（0-1）
    """
    score = 0.0

    # 检查标题中是否包含账号定位关键词
    if account_niche.lower() in title.lower():
        score += 0.4

    # 检查标题中是否包含历史选题关键词
    for keyword in keywords[:5]:  # 只检查前5个关键词
        if keyword.lower() in title.lower():
            score += 0.2
            break

    # 随机因素（模拟其他因素影响）
    score += random.uniform(0.0, 0.2)

    return min(1.0, score)


def _get_recommendation_reason(score: float) -> str:
    """
    获取推荐理由

    Args:
        score: 匹配度分数

    Returns:
        推荐理由
    """
    if score >= 0.8:
        return "高度匹配，强烈推荐"
    elif score >= 0.6:
        return "匹配度较高，值得考虑"
    elif score >= 0.4:
        return "有一定匹配度，可以尝试"
    else:
        return "匹配度较低，建议参考"


def evaluate_topic(topic_title: str, account_niche: str, current_topics: List[str]) -> Dict[str, Any]:
    """
    评估选题的价值和可行性

    Args:
        topic_title: 选题标题
        account_niche: 账号定位
        current_topics: 当前热门选题列表

    Returns:
        选题评估结果
    """
    # 计算各项指标得分
    scores = {}

    # 时效性得分（模拟）
    scores["时效性"] = random.uniform(0.6, 1.0)

    # 热度得分（模拟）
    scores["热度"] = random.uniform(0.5, 1.0)

    # 匹配度得分
    match_score = 0.0
    if account_niche.lower() in topic_title.lower():
        match_score += 0.5
    if any(topic.lower() in topic_title.lower() for topic in current_topics):
        match_score += 0.3
    scores["匹配度"] = min(1.0, match_score)

    # 合规性得分（简单检查敏感词）
    sensitive_words = ["政治", "敏感", "违法"]
    compliance_score = 1.0
    for word in sensitive_words:
        if word in topic_title:
            compliance_score -= 0.3
    scores["合规性"] = max(0.0, compliance_score)

    # 切入点得分（检查是否与其他热门话题重复）
    similar_count = sum(1 for topic in current_topics if topic == topic_title)
    scores["切入点"] = max(0.0, 1.0 - similar_count * 0.2)

    # 计算综合得分
    total_score = sum(
        scores[key] * TOPIC_EVALUATION_METRICS[key]["weight"]
        for key in scores.keys()
    )

    return {
        "topic_title": topic_title,
        "scores": scores,
        "total_score": round(total_score, 2),
        "grade": _get_topic_grade(total_score),
        "suggestions": _get_topic_suggestions(scores),
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }


def _get_topic_grade(score: float) -> str:
    """
    获取选题评分等级

    Args:
        score: 综合评分

    Returns:
        等级
    """
    if score >= 0.8:
        return "优秀"
    elif score >= 0.6:
        return "良好"
    elif score >= 0.4:
        return "一般"
    else:
        return "较差"


def _get_topic_suggestions(scores: Dict[str, float]) -> List[str]:
    """
    获取选题改进建议

    Args:
        scores: 各项评分

    Returns:
        建议列表
    """
    suggestions = []

    if scores.get("时效性", 0) < 0.6:
        suggestions.append("选题时效性较低，建议结合最新热点")

    if scores.get("热度", 0) < 0.5:
        suggestions.append("选题热度一般，建议增加传播性元素")

    if scores.get("匹配度", 0) < 0.5:
        suggestions.append("选题与账号定位匹配度不高，建议调整角度")

    if scores.get("合规性", 0) < 0.8:
        suggestions.append("选题存在合规风险，建议修改或放弃")

    if scores.get("切入点", 0) < 0.5:
        suggestions.append("选题切入点不够独特，建议寻找差异化角度")

    return suggestions if suggestions else ["选题优秀，可以直接执行"]


def monitor_competitor(competitor_topics: List[str], hot_topics: Dict[str, Any]) -> Dict[str, Any]:
    """
    监控竞品热门选题

    Args:
        competitor_topics: 竞品选题列表
        hot_topics: 当前热点数据

    Returns:
        竞品监控结果
    """
    monitor_results = []

    # 分析竞品选题
    competitor_keywords = _extract_keywords(competitor_topics)

    # 遍历所有平台的热点
    for platform, platform_data in hot_topics.get("platforms", {}).items():
        topics = platform_data.get("topics", [])

        for topic in topics:
            title = topic.get("title", "")

            # 检查竞品是否已经写过类似选题
            is_written = any(
                keyword.lower() in title.lower()
                for keyword in competitor_keywords[:10]
            )

            monitor_results.append({
                "title": title,
                "url": topic.get("url", ""),
                "platform": platform,
                "hot": topic.get("hot", ""),
                "competitor_written": is_written,
                "status": "竞品已写" if is_written else "竞品未写",
            })

    return {
        "total_competitor_topics": len(competitor_topics),
        "total_monitored": len(monitor_results),
        "competitor_written_count": sum(1 for r in monitor_results if r["competitor_written"]),
        "competitor_not_written_count": sum(1 for r in monitor_results if not r["competitor_written"]),
        "monitor_results": monitor_results,
        "suggestions": [
            f"竞品已写{sum(1 for r in monitor_results if r['competitor_written'])}个选题，建议分析其成功经验",
            f"竞品未写{sum(1 for r in monitor_results if not r['competitor_written'])}个选题，可以考虑切入",
        ],
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }


def generate_topic_calendar(hot_topics: Dict[str, Any], days: int = 7) -> Dict[str, Any]:
    """
    生成选题日历

    Args:
        hot_topics: 热点数据
        days: 未来天数

    Returns:
        选题日历
    """
    calendar = {}

    # 每天推荐3-5个选题
    for i in range(days):
        date = datetime.now() + timedelta(days=i)
        date_str = date.strftime("%Y-%m-%d")

        # 从热点中随机选择选题
        all_topics = []
        for platform, platform_data in hot_topics.get("platforms", {}).items():
            all_topics.extend(platform_data.get("topics", []))

        # 随机选择3-5个选题
        selected_count = random.randint(3, 5)
        selected_topics = random.sample(all_topics, min(selected_count, len(all_topics)))

        calendar[date_str] = {
            "date": date_str,
            "day_of_week": ["周一", "周二", "周三", "周四", "周五", "周六", "周日"][date.weekday()],
            "topics": [
                {
                    "title": topic.get("title", ""),
                    "platform": topic.get("platform", ""),
                }
                for topic in selected_topics
            ],
        }

    return {
        "days": days,
        "calendar": calendar,
        "total_topics": sum(len(day["topics"]) for day in calendar.values()),
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }


def handler(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    主处理函数

    Args:
        args: 包含以下字段的字典
            - action: 操作类型（fetch_hot_topics/fetch_all_hot_topics/fetch_uapis_hot_topics/fetch_all_uapis_topics/fetch_sogou_baidu_hot_topics/fetch_dailyhot_topics/fetch_all_dailyhot_topics/recommend_topics/evaluate_topic/monitor_competitor/generate_topic_calendar/filter_topics_by_category/fetch_tech_topics）
            - platform: 平台名称（可选）
            - token: API token（可选）
            - limit: 获取数量（可选，默认20）
            - account_niche: 账号定位（可选）
            - account_topics: 账号历史选题（可选）
            - current_topics: 当前热门选题（可选）
            - competitor_topics: 竞品选题（可选）
            - days: 选题日历天数（可选，默认7）
            - category: 热点类别（可选，科技/AI/娱乐/社会）

    Returns:
        处理结果
    """
    action = args.get("action")
    platform = args.get("platform", "今日热榜")
    token = args.get("token")
    limit = args.get("limit", 20)
    account_niche = args.get("account_niche", "")
    account_topics = args.get("account_topics", [])
    current_topics = args.get("current_topics", [])
    competitor_topics = args.get("competitor_topics", [])
    days = args.get("days", 7)
    category = args.get("category", "")

    result = {}

    if action == "fetch_hot_topics":
        result = fetch_hot_topics(platform, token, limit)

    elif action == "fetch_all_hot_topics":
        platforms = args.get("platforms", None)
        result = fetch_all_hot_topics(token, platforms, limit)

    elif action == "filter_topics_by_category":
        hot_topics = args.get("hot_topics", {})
        if not category:
            return {"error": "类别不能为空"}
        if not hot_topics:
            hot_topics = fetch_all_hot_topics(token, None, limit)
        result = filter_topics_by_category(hot_topics, category)

    elif action == "fetch_tech_topics":
        result = fetch_tech_topics(limit)

    elif action == "fetch_uapis_hot_topics":
        platform = args.get("platform", "微博")
        result = fetch_uapis_hot_topics(platform, limit)

    elif action == "fetch_sogou_baidu_hot_topics":
        result = fetch_sogou_baidu_hot_topics(limit)

    elif action == "fetch_all_uapis_topics":
        platforms = args.get("platforms", None)
        result = fetch_all_uapis_topics(platforms, limit)

    elif action == "fetch_dailyhot_topics":
        # 推荐使用：DailyHotApi - 免费、开源、45+平台
        platform = args.get("platform", "微博")
        result = fetch_dailyhot_topics(platform, limit)

    elif action == "fetch_all_dailyhot_topics":
        # 推荐使用：获取多个平台的热点
        platforms = args.get("platforms", None)
        result = fetch_all_dailyhot_topics(platforms, limit)

    elif action == "recommend_topics":
        hot_topics = args.get("hot_topics", {})
        if not account_niche:
            return {"error": "账号定位不能为空"}
        if not hot_topics:
            hot_topics = fetch_all_hot_topics(token, None, limit)
        result = recommend_topics(account_niche, account_topics, hot_topics)

    elif action == "evaluate_topic":
        topic_title = args.get("topic_title", "")
        if not topic_title:
            return {"error": "选题标题不能为空"}
        result = evaluate_topic(topic_title, account_niche, current_topics)

    elif action == "monitor_competitor":
        hot_topics = args.get("hot_topics", {})
        if not competitor_topics:
            return {"error": "竞品选题不能为空"}
        if not hot_topics:
            hot_topics = fetch_all_hot_topics(token, None, limit)
        result = monitor_competitor(competitor_topics, hot_topics)

    elif action == "generate_topic_calendar":
        hot_topics = args.get("hot_topics", {})
        if not hot_topics:
            hot_topics = fetch_all_hot_topics(token, None, limit)
        result = generate_topic_calendar(hot_topics, days)

    else:
        raise ValueError(f"不支持的操作类型: {action}")

    return result
