from typing import Dict, Any, List
import re
import random
from datetime import datetime
import sys

# Fix encoding issues on Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

"""
微信公众号标题生成器

基于2025年最新最佳实践，提供多种爆款标题模板和优化建议

核心原则：
- 前10个字必须包含核心关键词
- 信息密度 > 3个关键词
- 时效性暗示（2025年、最新等）
- 数字暴力美学（具体数字点击率提升230%）
- 用奇数制造真实感（3个技巧比4个方法可信度高27%）

2026-01-15更新：
- 新增船长式标题模板（首发型、对比型、数字型、紧迫型、功能型）
- 新增船长专用关键词库
- 新增船长式标题质量评分（信息密度、紧迫感、具体性、人设）
- 新增小郝式标题模板（数字亮点型、轻松幽默型、实用价值型）
- 新增小郝专用关键词库（Emoji丰富、轻松幽默、亲切接地气）
"""

# 标题模板库
TITLE_TEMPLATES = {
    "数字_痛点_解决方案": [
        "{count}个{pain_point}，{solution}帮你解决！",
        "{count}招搞定{pain_point}，{solution}让你少走弯路",
        "{count}天告别{pain_point}，{solution}教你轻松应对",
        "{count}种方法解决{pain_point}，{solution}是关键",
        "{count}分钟搞定{pain_point}，{solution}让你事半功倍",
    ],
    "悬念_热点_情感": [
        "{hot_topic}刷屏，但90%的人都不知道{emotion}...",
        "为什么{hot_topic}火了？{emotion}背后的真相",
        "{hot_topic}火爆全网，{emotion}的人都在看",
        "揭秘{hot_topic}！{emotion}的都在默默...",
        "{hot_topic}突然火了，{emotion}的人早就在...",
    ],
    "身份_反常识": [
        "{identity}的{common_sense}，其实是{unexpected_result}",
        "别再{common_action}了，{identity}都这样做",
        "{identity}都知道的{truth}，你却还在...",
        "{identity}不会告诉你，{unexpected_result}才是真相",
        "以为{common_sense}？{identity}早就开始{unexpected_action}了",
    ],
    "危机_利益": [
        "注意！{risk}正在发生，{benefit}帮你避免",
        "{risk}预警！这{count}个{benefit}让你远离危险",
        "小心{risk}！{benefit}带你安全脱身",
        "{risk}来了，{benefit}帮你应对",
        "{risk}逼近，{benefit}是你的救命稻草",
    ],
    "热点_圈层": [
        "{hot_topic}火了，{term}们的{action}指南",
        "追{hot_topic}，{term}都在用这个方法",
        "{hot_topic}出圈，{term}们的{benefit}来了",
        "玩转{hot_topic}，{term}必备的{count}招",
        "{hot_topic}爆火，{term}都在谈{emotion}",
    ],
    "数字暴力": [
        "{count}分钟{action}，{benefit}轻松搞定",
        "花{money}元{action}，{benefit}到手",
        "{count}天{action}，{benefit}暴涨{growth}%",
        "{count}次{action}，{benefit}直接翻倍",
        "用{count}分钟{action}，{benefit}提升{growth}%",
    ],
    "悬念提问": [
        "为什么{action}，{question}？",
        "{action}，但{question}怎么办？",
        "你真的会{action}吗？{question}",
        "还在{action}？{question}才是关键",
        "不会{action}？{question}教你",
    ],
    "稀缺限时": [
        "最后{count}天！{benefit}限时领取",
        "仅剩{count}个名额！{benefit}等你拿",
        "紧急通知！{benefit}限时开放",
        "错过等{time}！{benefit}最后一波",
        "限时{count}小时！{benefit}快来抢",
    ],
    "数据冲击": [
        "实测！{action}，{benefit}提升{growth}%",
        "数据揭秘：{action}，{benefit}暴涨{growth}%",
        "用数据说话：{action}，{benefit}增长{growth}%",
        "对比{count}组数据：{action}，{benefit}翻倍",
        "{count}万+案例：{action}，{benefit}暴涨",
    ],
    "情感绑定": [
        "{time}，{emotion}的你还在{action}？",
        "{identity}，{emotion}的你不能错过{benefit}",
        "{time}，{emotion}的人都在做{action}",
        "致{emotion}的你：{action}，{benefit}来了",
        "{emotion}的人都在看，{action}带你{benefit}",
    ],

    # ===== 船长式标题模板（2026-01-15新增） =====
    "船长_首发型": [
        "全网首发！免费无限，{tool_name}，{feature1}，{feature2}，{personal_ip}教你",
        "全网首发！无限免费，{tool_name}，{feature1}，{feature2}，{feature3}，{personal_ip}手把手教你",
        "全网首发！免费+无限，{tool_name}，{feature1}/{feature2}，还能做{extra_feature}，{personal_ip}完整教程",
        "首发！免费无限，{tool_name}，{feature1}，{feature2}，附{resource}，{personal_ip}教你",
        "全网首发！免费无限，{tool_name}，{feature1}，{feature2}，不比{competitor}差，{personal_ip}手把手教你",
    ],

    "船长_对比型": [
        "{tool_name}，{description}，不比{competitor}差，附{technique}，{personal_ip}手把手教你",
        "免费！{tool_name}，{feature1}，{feature2}，不比{competitor}差，{technique}，{personal_ip}教你",
        "{tool_name}，{feature1}，{feature2}，实测不比{competitor}差，附{count}个技巧，{personal_ip}完整干货",
        "免费无限！{tool_name}，{feature1}，{feature2}，效果媲美{competitor}，{personal_ip}手把手教你",
        "{tool_name}实测！{feature1}，{feature2}，不比{competitor}差，{technique}和{resource}，{personal_ip}教你",
    ],

    "船长_数字型": [
        "免费！{feature}，{count}个{technique}，成为{identity}，{personal_ip}完整干货",
        "免费！{feature}，{count}种{method}，成为{identity}，{personal_ip}手把手教你",
        "{count}个{technique}，{feature}一键搞定，成为{identity}，{personal_ip}完整教程",
        "免费！{feature}，{count}个案例+{count2}个技巧，成为{identity}，{personal_ip}分享",
        "{count}天精通{feature}，{count2}个技巧+{count3}个案例，{personal_ip}带你成为{identity}",
    ],

    "船长_紧迫型": [
        "冲！免费无限！{feature1}/{feature2}，附{resource}，{personal_ip}教你",
        "冲！免费无限，{tool_name}，{feature1}，{feature2}，{resource}，{personal_ip}手把手教你",
        "冲！{tool_name}免费无限用，{feature1}，{feature2}，新手照搬，{personal_ip}教你",
        "赶紧用！免费无限，{tool_name}，{feature1}，{feature2}，手慢无，{personal_ip}教你",
        "限时！免费无限，{tool_name}，{feature1}/{feature2}，附{resource}，{personal_ip}完整教程",
    ],

    "船长_功能型": [
        "免费！{tool_name}，{feature1}/{feature2}/{feature3}，一键全搞定，{personal_ip}手把手教你",
        "免费！{tool_name}，{feature1}，{feature2}，{feature3}，还能做{extra_feature}，{personal_ip}教你",
        "免费！{tool_name}，{feature1}/{feature2}，{feature3}，一键搞定，{personal_ip}完整教程",
        "{tool_name}，{feature1}，{feature2}，{feature3}，还能做{extra_feature}，{personal_ip}手把手教你",
        "免费！{tool_name}，{feature1}，{feature2}，{feature3}，附{resource}，{personal_ip}教你",
    ],

    # ===== 小郝式标题模板（2026-01-15新增） =====
    # 基于小郝AI说风格分析：轻松幽默 + Emoji丰富 + 亲切接地气 + 实用价值
    "小郝_数字亮点型": [
        "{count}大亮点揭秘！{tool_name}让{feature}更轻松🚀",
        "{count}个{pain_point}？{tool_name}一键搞定，效率提升{growth}%📈",
        "{count}步搞定{feature}！{tool_name}让你轻松成为{identity}✨",
        "学会了！{tool_name}+{feature}，工作效率提升{growth}倍💪",
        "{count}个技巧！{tool_name}让{feature}不再难🎯",
    ],

    "小郝_轻松幽默型": [
        "{pain_point}？别慌！{tool_name}来救场了😎",
        "还在{old_way}？{tool_name}让你轻松{benefit}🌟",
        "震惊！{tool_name}竟然让{feature}这么简单😱",
        "以为是{wrong_thought}，结果是{truth}！{tool_name}太强了🔥",
        "告别{pain_point}！{tool_name}让你轻松{benefit}✨",
    ],

    "小郝_实用价值型": [
        "{tool_name}实测：{feature1}+{feature2}，效率提升{growth}%📊",
        "手把手教你用{tool_name}搞定{feature}！附{resource}📝",
        "从{pain_point}到{benefit}！{tool_name}完整教程📚",
        "{tool_name}让{feature}变得超简单！{count}步图文教程💡",
        "{tool_name}体验报告：{feature1}、{feature2}、{feature3}全搞定✅",
    ],

    "小郝_问题解决型": [
        "{count}个{pain_point}，{tool_name}帮你全部解决🎯",
        "不要再{wrong_way}了！{tool_name}让你正确{benefit}✨",
        "{pain_point}怎么办？{tool_name}手把手教你解决💪",
        "告别{pain_point}！{count}招让你轻松{benefit}🚀",
        "{pain_point}不用慌！{tool_name}一键搞定，附{resource}📋",
    ],

    "小郝_适度紧迫型": [
        "限时分享！{tool_name}让{feature}变得超简单✨",
        "终于找到了！{tool_name}完美解决{pain_point}🎯",
        "强烈推荐！{tool_name}让我效率提升{growth}%🔥",
        "不容错过！{tool_name}+{feature}，附完整教程📝",
        "建议收藏！{tool_name}帮你轻松搞定{feature}⭐",
    ],
}

# 关键词库
KEYWORD_BANK = {
    "痛点": ["焦虑", "迷茫", "贫穷", "焦虑", "拖延", "迷茫", "焦虑", "焦虑", "焦虑", "焦虑"],
    "利益": ["涨粉", "赚钱", "提升", "优化", "提升", "优化", "提升", "优化", "提升", "优化"],
    "身份": ["宝妈", "打工人", "创业者", "运营人", "自媒体", "设计师", "程序员", "运营者", "创作者", "职场人"],
    "热点": ["AI写作", "DeepSeek", "公众号运营", "副业赚钱", "短视频", "直播带货", "知识付费", "私域流量"],
    "情感": ["焦虑", "迷茫", "期待", "兴奋", "感动", "愤怒", "焦虑", "困惑", "惊喜", "期待"],
    "动作": ["涨粉", "赚钱", "写作", "运营", "创作", "设计", "开发", "分析", "优化", "提升"],

    # ===== 船长专用关键词库（2026-01-15新增） =====
    "船长_紧迫感": ["全网首发", "免费", "无限", "冲", "限时", "独家", "首发", "紧急", "赶紧", "手慢无"],
    "船长_工具": ["Sora2", "Nano Banana Pro", "AI视频", "AI绘图", "AI数字人", "AI配音", "Kling", "Midjourney", "ChatGPT"],
    "船长_数字": ["100个", "38个", "50个", "30个", "完整", "全套", "全方位", "多维度", "一站式"],
    "船长_人设": ["船长教你", "手把手教你", "完整干货", "船长分享", "船长说", "船长实测", "船长推荐"],
    "船长_功能": ["AI视频生成", "AI图像生成", "语音克隆", "数字人口型", "动漫视频", "带货视频", "分镜生成", "一键搞定"],
    "船长_竞品": ["Sora2", "Midjourney", "ElevenLabs", "Runway", "D-ID", "HeyGen", "Stable Diffusion"],
    "船长_资源": ["提示词技巧", "完整教程", "秘籍", "方法", "指南", "工具", "模板", "案例"],
    "船长_身份": ["AI电影导演", "AI创作专家", "视频创作者", "内容创作者", "AI工具达人", "效率提升专家"],

    # ===== 小郝专用关键词库（2026-01-15新增） =====
    # 基于小郝AI说风格分析：轻松幽默 + Emoji丰富 + 亲切接地气
    "小郝_Emoji": ["🚀", "📈", "💪", "✨", "🎯", "🔥", "⭐", "💡", "📊", "📝", "📚", "😎", "😱", "🌟", "✅"],
    "小郝_轻松词": ["轻松", "简单", "搞定", "一键", "完美", "终于", "别慌", "震惊", "太强了"],
    "小郝_工具": ["Claude Skills", "Cursor", "v0.dev", "Flowith", "影刀RPA", "Coze", "Dify", "FastGPT"],
    "小郝_功能": ["AI写作", "AI编程", "RPA自动化", "工作流自动化", "AI助手", "智能客服", "知识库"],
    "小郝_痛点": ["选题焦虑", "代码bug", "效率低下", "重复劳动", "学习困难", "时间不够"],
    "小郝_数字": ["3大", "5个", "7步", "10倍", "50%", "80%", "100%"],
    "小郝_身份": ["应用开发者", "内容创作者", "效率追求者", "AI爱好者", "打工人", "创业者"],
    "小郝_资源": ["完整教程", "图文教程", "实战案例", "模板资源", "学习笔记"],
    "小郝_紧迫感": ["限时分享", "强烈推荐", "不容错过", "建议收藏"],  # 适度紧迫感，不过度
    "小郝_反差": ["还在", "不要再", "以为是", "告别"],
}

# 点击率预测权重
CTR_WEIGHTS = {
    "数字": 0.23,
    "关键词密度": 0.15,
    "时效性": 0.12,
    "情感词": 0.10,
    "疑问句": 0.10,
    "悬念": 0.12,
    "稀缺性": 0.10,
    "长度适中": 0.08,
}


def generate_title(template_type: str, **kwargs) -> str:
    """
    根据模板生成标题

    Args:
        template_type: 模板类型
        **kwargs: 模板参数

    Returns:
        生成的标题
    """
    templates = TITLE_TEMPLATES.get(template_type, [])
    if not templates:
        raise ValueError(f"未找到模板类型: {template_type}")

    # 随机选择模板
    template = random.choice(templates)

    # 填充模板
    try:
        title = template.format(**kwargs)
        return title
    except KeyError as e:
        raise ValueError(f"模板参数缺失: {e}")


def optimize_keywords(title: str) -> Dict[str, Any]:
    """
    优化标题关键词

    Args:
        title: 原始标题

    Returns:
        优化建议
    """
    # 提取关键词
    keywords = re.findall(r'[\w]+', title)

    # 检查关键词密度
    keyword_count = len(keywords)
    keyword_density = len(set(keywords)) / len(keywords) if keywords else 0

    # 检查核心关键词位置（前10个字）
    first_10_chars = title[:10]
    core_keywords = ["2025", "最新", "秘籍", "教程", "指南", "实战", "方法", "技巧", "策略"]
    has_core_keyword = any(kw in first_10_chars for kw in core_keywords)

    suggestions = []

    if keyword_count < 3:
        suggestions.append("建议增加关键词密度，标题应包含至少3个关键词")

    if not has_core_keyword:
        suggestions.append("核心关键词应放在前10个字中")

    if keyword_density < 0.5:
        suggestions.append("建议减少重复关键词，提高信息密度")

    return {
        "keyword_count": keyword_count,
        "keyword_density": keyword_density,
        "has_core_keyword": has_core_keyword,
        "suggestions": suggestions,
    }


def calculate_ctr_score(title: str) -> Dict[str, Any]:
    """
    计算标题点击率评分

    Args:
        title: 标题

    Returns:
        评分结果
    """
    score = 0.0
    factors = []

    # 数字检查
    if re.search(r'\d+', title):
        score += CTR_WEIGHTS["数字"]
        factors.append("包含数字")

    # 关键词密度检查
    keywords = re.findall(r'[\w]+', title)
    if len(keywords) >= 3:
        score += CTR_WEIGHTS["关键词密度"]
        factors.append("关键词密度充足")

    # 时效性检查
    time_words = ["2025", "最新", "今年", "近期", "刚刚", "突发"]
    if any(word in title for word in time_words):
        score += CTR_WEIGHTS["时效性"]
        factors.append("有时效性")

    # 情感词检查
    emotion_words = ["感动", "震惊", "愤怒", "惊喜", "期待", "焦虑", "迷茫"]
    if any(word in title for word in emotion_words):
        score += CTR_WEIGHTS["情感词"]
        factors.append("包含情感词")

    # 疑问句检查
    if title.endswith('?') or "？" in title or title.startswith("为什么"):
        score += CTR_WEIGHTS["疑问句"]
        factors.append("使用疑问句")

    # 悬念检查
    suspense_words = ["揭秘", "真相", "幕后", "秘密", "竟然", "居然"]
    if any(word in title for word in suspense_words):
        score += CTR_WEIGHTS["悬念"]
        factors.append("制造悬念")

    # 稀缺性检查
    scarcity_words = ["最后", "限时", "独家", "仅剩", "首发", "紧急"]
    if any(word in title for word in scarcity_words):
        score += CTR_WEIGHTS["稀缺性"]
        factors.append("稀缺性")

    # 长度检查（建议20-30字）
    length = len(title)
    if 20 <= length <= 30:
        score += CTR_WEIGHTS["长度适中"]
        factors.append("长度适中")

    return {
        "score": round(score * 100, 2),
        "factors": factors,
        "length": length,
        "grade": _get_grade(score),
    }


def _get_grade(score: float) -> str:
    """
    获取评分等级

    Args:
        score: 评分

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


def generate_ab_test_titles(original_title: str, count: int = 3) -> List[str]:
    """
    为原标题生成A/B测试标题

    Args:
        original_title: 原标题
        count: 生成数量

    Returns:
        A/B测试标题列表
    """
    variants = []

    # 提取原标题中的关键词
    keywords = re.findall(r'[\w]+', original_title)

    # 变体1：数字前置
    if keywords:
        variant1 = f"3个{keywords[0]}，{keywords[1] if len(keywords) > 1 else ''}教你轻松搞定"
        variants.append(variant1)

    # 变体2：加入疑问
    variant2 = f"为什么{original_title}?真相在这里"
    variants.append(variant2)

    # 变体3：加入数据
    variant3 = f"实测！{original_title}，点击率提升230%"
    variants.append(variant3)

    # 变体4：加入情感
    if keywords:
        variant4 = f"致{keywords[0]}的你：{original_title}"
        variants.append(variant4)

    # 变体5：加入悬念
    variant5 = f"{original_title}，但90%的人都不知道..."
    variants.append(variant5)

    return variants[:count]


def suggest_improvements(title: str) -> List[str]:
    """
    提供标题改进建议

    Args:
        title: 标题

    Returns:
        改进建议列表
    """
    suggestions = []

    # 检查长度
    if len(title) > 30:
        suggestions.append("标题过长，建议精简到30字以内")

    # 检查是否有数字
    if not re.search(r'\d+', title):
        suggestions.append("建议加入具体数字，点击率可提升230%")

    # 检查是否有情感词
    emotion_words = ["感动", "震惊", "愤怒", "惊喜", "期待", "焦虑", "迷茫"]
    if not any(word in title for word in emotion_words):
        suggestions.append("建议加入情感词，增加用户共鸣")

    # 检查是否有悬念
    suspense_words = ["揭秘", "真相", "秘密", "竟然", "居然"]
    if not any(word in title for word in suspense_words):
        suggestions.append("建议制造悬念，引发用户好奇心")

    # 检查是否有稀缺性
    scarcity_words = ["最后", "限时", "独家", "仅剩", "首发", "紧急"]
    if not any(word in title for word in scarcity_words):
        suggestions.append("建议加入稀缺性词汇，增加紧迫感")

    # 检查前10个字
    first_10_chars = title[:10]
    if len(first_10_chars) < 5:
        suggestions.append("前10个字应包含核心关键词，提高信息密度")

    # 检查是否有疑问
    if not (title.endswith('?') or "？" in title or title.startswith("为什么")):
        suggestions.append("建议使用疑问句，引发用户思考")

    # 检查时效性
    time_words = ["2025", "最新", "今年", "近期", "刚刚", "突发"]
    if not any(word in title for word in time_words):
        suggestions.append("建议加入时效性词汇，提升推荐权重")

    return suggestions if suggestions else ["标题已经很优秀了！"]


# ===== 船长式标题质量评分（2026-01-15新增） =====

def calculate_captain_score(title: str, personal_ip: str = "船长") -> Dict[str, Any]:
    """
    计算船长式标题质量评分

    评分维度：
    - 信息密度评分：关键词数量/字数
    - 紧迫感评分：是否包含紧迫感词
    - 具体性评分：是否有数字
    - 人设评分：是否包含个人IP

    Args:
        title: 标题
        personal_ip: 个人IP（默认"船长"）

    Returns:
        评分结果
    """
    # 1. 信息密度评分
    keywords = re.findall(r'[\w]+', title)
    keyword_count = len(keywords)
    length = len(title)
    density_score = (keyword_count / length * 10) if length > 0 else 0

    # 2. 紧迫感评分
    urgency_words = KEYWORD_BANK["船长_紧迫感"]
    urgency_count = sum(1 for word in urgency_words if word in title)
    urgency_score = min(urgency_count * 15, 100)  # 最高100分

    # 3. 具体性评分
    has_number = bool(re.search(r'\d+', title))
    has_tool = any(tool in title for tool in KEYWORD_BANK["船长_工具"])
    has_feature = any(feature in title for feature in KEYWORD_BANK["船长_功能"])

    specific_score = 0
    if has_number:
        specific_score += 30
    if has_tool:
        specific_score += 35
    if has_feature:
        specific_score += 35

    # 4. 人设评分
    ip_score = 0
    if personal_ip in title:
        ip_score += 50
    if any(ip_word in title for ip_word in KEYWORD_BANK["船长_人设"]):
        ip_score += 50

    # 综合评分
    total_score = (density_score * 0.2 +
                   urgency_score * 0.3 +
                   specific_score * 0.3 +
                   ip_score * 0.2)

    # 等级判断
    if total_score >= 80:
        grade = "优秀（船长级别）"
        advice = "这个标题达到了船长的爆款标准！"
    elif total_score >= 60:
        grade = "良好"
        advice = "不错的标题，但还有提升空间"
    elif total_score >= 40:
        grade = "一般"
        advice = "建议增加紧迫感、数字或个人IP"
    else:
        grade = "较差"
        advice = "标题需要大幅优化，建议使用船长模板"

    return {
        "total_score": round(total_score, 2),
        "grade": grade,
        "advice": advice,
        "details": {
            "信息密度": round(density_score, 2),
            "紧迫感": urgency_score,
            "具体性": specific_score,
            "人设": ip_score,
        },
        "suggestions": _generate_captain_suggestions(title, personal_ip)
    }


def _generate_captain_suggestions(title: str, personal_ip: str) -> List[str]:
    """
    生成船长式标题优化建议

    Args:
        title: 标题
        personal_ip: 个人IP

    Returns:
        优化建议列表
    """
    suggestions = []

    # 检查紧迫感
    urgency_words = KEYWORD_BANK["船长_紧迫感"]
    if not any(word in title for word in urgency_words):
        suggestions.append("建议加入紧迫感词：全网首发、免费、无限、冲")

    # 检查数字
    if not re.search(r'\d+', title):
        suggestions.append("建议加入具体数字：100个、38个、50个等")

    # 检查人设
    if personal_ip not in title and not any(ip_word in title for ip_word in KEYWORD_BANK["船长_人设"]):
        suggestions.append(f"建议加入个人IP：{personal_ip}教你、{personal_ip}手把手教你")

    # 检查工具名
    if not any(tool in title for tool in KEYWORD_BANK["船长_工具"]):
        suggestions.append("建议提到具体工具名：Sora2、Nano Banana Pro等")

    # 检查功能词
    if not any(feature in title for feature in KEYWORD_BANK["船长_功能"]):
        suggestions.append("建议加入功能词：AI视频生成、AI绘图、语音克隆等")

    # 检查竞品对比
    if not any(competitor in title for competitor in KEYWORD_BANK["船长_竞品"]):
        suggestions.append("建议加入竞品对比：不比Sora2差、媲美Midjourney")

    # 检查资源承诺
    if not any(resource in title for resource in KEYWORD_BANK["船长_资源"]):
        suggestions.append("建议加入资源承诺：附提示词技巧、完整教程、秘籍")

    return suggestions if suggestions else ["标题已经很优秀了！"]


def generate_captain_titles(topic: str, personal_ip: str = "船长", count: int = 5) -> List[Dict[str, Any]]:
    """
    生成船长式标题

    Args:
        topic: 主题
        personal_ip: 个人IP
        count: 生成数量

    Returns:
        标题列表
    """
    captain_templates = [
        "船长_首发型",
        "船长_对比型",
        "船长_数字型",
        "船长_紧迫型",
        "船长_功能型",
    ]

    titles = []

    for template_type in captain_templates:
        if len(titles) >= count:
            break

        try:
            params = {
                "tool_name": random.choice(KEYWORD_BANK["船长_工具"]),
                "feature1": random.choice(KEYWORD_BANK["船长_功能"]),
                "feature2": random.choice(KEYWORD_BANK["船长_功能"]),
                "feature3": random.choice(KEYWORD_BANK["船长_功能"]),
                "extra_feature": random.choice(KEYWORD_BANK["船长_功能"]),
                "personal_ip": personal_ip,
                "competitor": random.choice(KEYWORD_BANK["船长_竞品"]),
                "count": random.choice([38, 50, 100]),
                "count2": random.choice([3, 5, 7]),
                "count3": random.choice([10, 20, 30]),
                "technique": random.choice(KEYWORD_BANK["船长_资源"]),
                "resource": random.choice(KEYWORD_BANK["船长_资源"]),
                "method": random.choice(KEYWORD_BANK["船长_资源"]),
                "identity": random.choice(KEYWORD_BANK["船长_身份"]),
                "description": topic,
            }

            title = generate_title(template_type, **params)
            captain_score = calculate_captain_score(title, personal_ip)

            titles.append({
                "title": title,
                "template_type": template_type,
                "captain_score": captain_score,
                "ctr_score": calculate_ctr_score(title),
            })
        except Exception:
            continue

    return titles


def generate_xiaohao_titles(topic: str, personal_ip: str = "小郝", count: int = 5) -> List[Dict[str, Any]]:
    """
    生成小郝式标题

    基于小郝AI说风格：轻松幽默 + Emoji丰富 + 亲切接地气 + 实用价值

    Args:
        topic: 主题
        personal_ip: 个人IP
        count: 生成数量

    Returns:
        标题列表
    """
    xiaohao_templates = [
        "小郝_数字亮点型",
        "小郝_轻松幽默型",
        "小郝_实用价值型",
        "小郝_问题解决型",
        "小郝_适度紧迫型",
    ]

    titles = []

    for template_type in xiaohao_templates:
        if len(titles) >= count:
            break

        try:
            params = {
                "tool_name": random.choice(KEYWORD_BANK["小郝_工具"]),
                "feature1": random.choice(KEYWORD_BANK["小郝_功能"]),
                "feature2": random.choice(KEYWORD_BANK["小郝_功能"]),
                "feature3": random.choice(KEYWORD_BANK["小郝_功能"]),
                "feature": random.choice(KEYWORD_BANK["小郝_功能"]),
                "pain_point": random.choice(KEYWORD_BANK["小郝_痛点"]),
                "count": random.choice([3, 5, 7]),
                "growth": random.choice([50, 80, 100, 200]),
                "identity": random.choice(KEYWORD_BANK["小郝_身份"]),
                "resource": random.choice(KEYWORD_BANK["小郝_资源"]),
                "benefit": random.choice(["轻松搞定", "效率提升", "不再犯难", "得心应手"]),
                "old_way": random.choice(["手动处理", "传统方法", "复杂操作"]),
                "wrong_way": random.choice(["手动处理", "传统方法", "复杂操作"]),
                "wrong_thought": random.choice(["很难", "很复杂", "需要专业背景"]),
                "truth": random.choice(["这么简单", "这么轻松", "这么强大"]),
            }

            title = generate_title(template_type, **params)

            # 自动添加 Emoji（小郝特色）
            emoji = random.choice(KEYWORD_BANK["小郝_Emoji"])
            if emoji not in title:
                title += emoji

            xiaohao_score = calculate_xiaohao_score(title, personal_ip)

            titles.append({
                "title": title,
                "template_type": template_type,
                "xiaohao_score": xiaohao_score,
                "ctr_score": calculate_ctr_score(title),
            })
        except Exception:
            continue

    return titles


def calculate_xiaohao_score(title: str, personal_ip: str = "小郝") -> Dict[str, Any]:
    """
    计算小郝式标题质量评分

    评分维度（基于小郝AI说风格分析）：
    - 数字量化评分（30%）：是否有具体数字
    - 轻松幽默评分（25%）：是否使用轻松词汇和Emoji
    - 实用价值评分（25%）：是否突出实用价值
    - 亲切接地气评分（20%）：是否亲切接地气

    Args:
        title: 标题
        personal_ip: 个人IP（默认"小郝"）

    Returns:
        评分结果
    """
    # 1. 数字量化评分（30%）
    has_number = bool(re.search(r'\d+', title))
    has_count_word = any(word in title for word in ["个", "步", "大", "倍", "%"])
    number_score = 0
    if has_number:
        number_score += 15
    if has_count_word:
        number_score += 15

    # 2. 轻松幽默评分（25%）
    轻松词 = KEYWORD_BANK["小郝_轻松词"]
    has_easy_word = any(word in title for word in 轻松词)
    has_emoji = any(emoji in title for emoji in KEYWORD_BANK["小郝_Emoji"])
    easy_score = 0
    if has_easy_word:
        easy_score += 12
    if has_emoji:
        easy_score += 13

    # 3. 实用价值评分（25%）
    value_words = ["搞定", "解决", "提升", "教程", "技巧", "方法", "指南", "实测", "体验"]
    has_value_word = any(word in title for word in value_words)
    value_score = 25 if has_value_word else 10

    # 4. 亲切接地气评分（20%）
    has_help_word = any(word in title for word in ["帮你", "手把手", "教你", "分享"])
    friendly_score = 20 if has_help_word else 10

    # 综合评分
    total_score = (number_score * 0.30 +
                   easy_score * 0.25 +
                   value_score * 0.25 +
                   friendly_score * 0.20)

    # 等级判断
    if total_score >= 80:
        grade = "优秀（小郝级别）"
        advice = "这个标题完美体现了小郝的风格！"
    elif total_score >= 60:
        grade = "良好"
        advice = "不错的标题，有明显的轻松专业特色"
    elif total_score >= 40:
        grade = "一般"
        advice = "建议增加Emoji或数字，让标题更生动"
    else:
        grade = "较差"
        advice = "建议重新构思，突出轻松实用的特色"

    return {
        "total_score": round(total_score, 2),
        "grade": grade,
        "advice": advice,
        "details": {
            "数字量化": number_score,
            "轻松幽默": easy_score,
            "实用价值": value_score,
            "亲切接地气": friendly_score,
        },
        "suggestions": _generate_xiaohao_suggestions(title, personal_ip)
    }


def _generate_xiaohao_suggestions(title: str, personal_ip: str) -> List[str]:
    """生成小郝式标题优化建议"""
    suggestions = []

    # 检查数字
    if not re.search(r'\d+', title):
        suggestions.append("建议加入具体数字：3大、5个、7步等")

    # 检查Emoji
    if not any(emoji in title for emoji in KEYWORD_BANK["小郝_Emoji"]):
        suggestions.append("建议加入Emoji：🚀、📈、💪、✨等")

    # 检查轻松词
    if not any(word in title for word in KEYWORD_BANK["小郝_轻松词"]):
        suggestions.append("建议使用轻松词汇：轻松、简单、搞定、一键等")

    # 检查实用价值词
    value_words = ["搞定", "解决", "提升", "教程", "技巧"]
    if not any(word in title for word in value_words):
        suggestions.append("建议突出实用价值：一键搞定、轻松解决等")

    # 检查人设
    if personal_ip not in title and "小郝" not in title:
        suggestions.append(f"建议加入人设：{personal_ip}教你、{personal_ip}分享")

    return suggestions if suggestions else ["标题已经很优秀了！"]


def handler(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    主处理函数

    Args:
        args: 包含以下字段的字典
            - topic: 主题/话题
            - keywords: 关键词列表（可选）
            - template_type: 模板类型（可选）
            - title: 原标题（可选，用于A/B测试和优化）
            - action: 操作类型：generate/optimize/ab_test/analyze/captain_generate/captain_score/xiaohao_generate/xiaohao_score
            - personal_ip: 个人IP（可选，用于船长式标题，默认"船长"）

    Returns:
        处理结果
    """
    action = args.get("action", "generate")
    result = {}

    if action == "captain_generate":
        # 生成船长式标题（2026-01-15新增）
        topic = args.get("topic", "")
        personal_ip = args.get("personal_ip", "船长")
        count = args.get("count", 5)

        titles = generate_captain_titles(topic, personal_ip, count)

        result = {
            "titles": titles,
            "topic": topic,
            "personal_ip": personal_ip,
            "style": "船长式",
        }

    elif action == "captain_score":
        # 计算船长式标题质量评分（2026-01-15新增）
        title = args.get("title", "")
        if not title:
            raise ValueError("请提供标题")

        personal_ip = args.get("personal_ip", "船长")
        captain_score = calculate_captain_score(title, personal_ip)

        result = {
            "title": title,
            "captain_score": captain_score,
            "personal_ip": personal_ip,
        }

    elif action == "xiaohao_generate":
        # 生成小郝式标题（2026-01-15新增）
        topic = args.get("topic", "")
        personal_ip = args.get("personal_ip", "小郝")
        count = args.get("count", 5)

        titles = generate_xiaohao_titles(topic, personal_ip, count)

        result = {
            "titles": titles,
            "topic": topic,
            "personal_ip": personal_ip,
            "style": "小郝式",
        }

    elif action == "xiaohao_score":
        # 计算小郝式标题质量评分（2026-01-15新增）
        title = args.get("title", "")
        if not title:
            raise ValueError("请提供标题")

        personal_ip = args.get("personal_ip", "小郝")
        xiaohao_score = calculate_xiaohao_score(title, personal_ip)

        result = {
            "title": title,
            "xiaohao_score": xiaohao_score,
            "personal_ip": personal_ip,
        }

    elif action == "generate":
        # 生成标题
        topic = args.get("topic", "")
        if not topic:
            raise ValueError("请提供主题/话题")

        template_type = args.get("template_type", random.choice(list(TITLE_TEMPLATES.keys())))

        # 生成多个标题
        titles = []
        for _ in range(5):
            try:
                params = {
                    "topic": topic,
                    "pain_point": random.choice(KEYWORD_BANK["痛点"]),
                    "solution": random.choice(KEYWORD_BANK["利益"]),
                    "count": random.choice([3, 5, 7, 10]),
                    "hot_topic": random.choice(KEYWORD_BANK["热点"]),
                    "emotion": random.choice(KEYWORD_BANK["情感"]),
                    "identity": random.choice(KEYWORD_BANK["身份"]),
                    "common_sense": "这么做",
                    "unexpected_result": "竟然错了",
                    "common_action": "继续这样",
                    "unexpected_action": "这样做",
                    "risk": "这个问题",
                    "benefit": random.choice(KEYWORD_BANK["利益"]),
                    "term": "大家",
                    "question": "怎么办",
                    "time": "一年",
                    "money": "100",
                    "action": random.choice(KEYWORD_BANK["动作"]),
                    "growth": random.choice([50, 100, 200, 300]),
                }
                title = generate_title(template_type, **params)
                titles.append({
                    "title": title,
                    "score": calculate_ctr_score(title),
                    "template_type": template_type,
                })
            except Exception as e:
                continue

        result["titles"] = titles

    elif action == "optimize":
        # 优化标题
        title = args.get("title", "")
        if not title:
            raise ValueError("请提供要优化的标题")

        optimization = optimize_keywords(title)
        improvements = suggest_improvements(title)

        result = {
            "original_title": title,
            "optimization": optimization,
            "improvements": improvements,
        }

    elif action == "ab_test":
        # A/B测试
        original_title = args.get("title", "")
        if not original_title:
            raise ValueError("请提供原标题")

        count = args.get("count", 3)
        variants = generate_ab_test_titles(original_title, count)

        result = {
            "original_title": original_title,
            "variants": variants,
            "scores": [calculate_ctr_score(variant) for variant in variants],
        }

    elif action == "analyze":
        # 分析标题
        title = args.get("title", "")
        if not title:
            raise ValueError("请提供要分析的标题")

        score = calculate_ctr_score(title)
        improvements = suggest_improvements(title)

        result = {
            "title": title,
            "score": score,
            "improvements": improvements,
        }

    else:
        raise ValueError(f"不支持的操作类型: {action}")

    result["timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return result
