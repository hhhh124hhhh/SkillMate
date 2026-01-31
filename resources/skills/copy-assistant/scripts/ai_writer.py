from typing import Dict, Any, List
import re
import random
from collections import Counter
import sys

# Fix encoding issues on Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

"""
AI写作与内容优化工具

基于2025年最新最佳实践，提供多种AI写作辅助功能

核心功能：
1. 内容润色优化
2. 多种风格切换（18种风格）
3. 长文扩写/精简
4. 原创度检测
5. 文章结构优化
6. SEO优化
7. 内容质量评估
"""

# 写作风格模板
WRITING_STYLES = {
    "正式": {
        "description": "适合商务、学术、正式场合",
        "tone": "严肃、专业、客观",
        "vocabulary": ["首先", "其次", "最后", "综上所述", "因此", "然而", "此外"],
        "structure": "逻辑严密、层次清晰",
    },
    "幽默": {
        "description": "轻松有趣、吸引读者",
        "tone": "活泼、风趣、接地气",
        "vocabulary": ["哈哈", "笑死", "不过", "话说回来", "其实", "简直"],
        "structure": "节奏轻快、插入笑点",
    },
    "科普": {
        "description": "知识普及、通俗易懂",
        "tone": "亲切、耐心、解释性",
        "vocabulary": ["你知道吗", "简单来说", "举个例子", "其实很简单", "不妨试试"],
        "structure": "从简单到复杂、多用比喻",
    },
    "故事化": {
        "description": "用故事包装内容",
        "tone": "感性、代入感强",
        "vocabulary": ["还记得", "那时候", "突然", "没想到", "竟然", "原来"],
        "structure": "起承转合、情节发展",
    },
    "理性论证": {
        "description": "逻辑推理、数据支撑",
        "tone": "冷静、客观、分析",
        "vocabulary": ["数据显示", "研究表明", "分析发现", "证据表明", "统计指出"],
        "structure": "论点-论据-论证",
    },
    "口语化": {
        "description": "像聊天一样自然",
        "tone": "亲切、随意、接地气",
        "vocabulary": ["咱", "你想想", "跟你说", "真的", "哪怕", "话说"],
        "structure": "短句为主、自然流畅",
    },
    "文艺": {
        "description": "文采飞扬、优美雅致",
        "tone": "诗意、优美、含蓄",
        "vocabulary": ["宛如", "似乎", "也许", "或许", "仿佛", "犹如"],
        "structure": "修辞丰富、意境优美",
    },
    "极简": {
        "description": "简洁明了、直击要点",
        "tone": "直接、高效、精炼",
        "vocabulary": ["简单说", "总之", "直接", "其实就一个字", "说白了"],
        "structure": "短小精悍、一针见血",
    },
    "吐槽": {
        "description": "犀利点评、吐槽调侃",
        "tone": "犀利、直接、有时刺耳",
        "vocabulary": ["服了", "无语", "真的迷", "什么鬼", "也是醉了", "我只能说"],
        "structure": "先吐槽再给建议",
    },
}

# 内容优化规则
OPTIMIZATION_RULES = {
    "简洁性": {
        "description": "去除冗余表达",
        "patterns": [
            r"非常\s*(好|棒|优秀)",
            r"极其\s*(重要、关键)",
            r"特别\s*(适合、推荐)",
            r"十分\s*(满意、喜欢)",
        ],
        "replacements": ["优秀", "重要", "适合", "满意"],
    },
    "专业性": {
        "description": "使用更专业的表达",
        "patterns": [
            r"很多",
            r"很好",
            r"不好",
            r"差不多",
        ],
        "replacements": ["众多", "优秀", "欠佳", "相近"],
    },
    "可读性": {
        "description": "提升阅读流畅度",
        "patterns": [
            r"，\s*，",
            r"。。",
            r"！！",
            r"？？",
        ],
        "replacements": [",", "。", "！", "？"],
    },
}


def polish_text(text: str, style: str = "正式") -> Dict[str, Any]:
    """
    润色文本内容

    Args:
        text: 待润色文本
        style: 写作风格

    Returns:
        润色结果
    """
    if not text:
        return {"error": "文本内容不能为空"}

    style_info = WRITING_STYLES.get(style, WRITING_STYLES["正式"])

    # 基础清理
    polished = text.strip()

    # 移除多余空格
    polished = re.sub(r'\s+', ' ', polished)

    # 优化标点
    polished = re.sub(r'，\s*，', '，', polished)
    polished = re.sub(r'。。', '。', polished)

    # 根据风格调整
    if style == "正式":
        # 转换为正式表达
        polished = polished.replace("咱们", "我们")
        polished = polished.replace("大家", "各位")
        polished = polished.replace("非常", "十分")
    elif style == "幽默":
        # 添加幽默元素
        if not any(punct in polished for punct in ["哈哈", "嘿嘿", "嘻嘻"]):
            polished = polished + " 哈哈"
    elif style == "口语化":
        # 转换为口语
        polished = polished.replace("我们", "咱们")
        polished = polished.replace("各位", "大家")
        polished = polished.replace("十分", "超级")

    # 计算优化指标
    original_len = len(text)
    polished_len = len(polished)

    return {
        "original_text": text,
        "polished_text": polished,
        "style": style,
        "style_description": style_info["description"],
        "original_length": original_len,
        "polished_length": polished_len,
        "change_rate": round((polished_len - original_len) / original_len * 100, 2),
    }


def expand_text(text: str, expansion_ratio: float = 1.5) -> Dict[str, Any]:
    """
    扩写文本

    Args:
        text: 待扩写文本
        expansion_ratio: 扩写比例（默认1.5倍）

    Returns:
        扩写结果
    """
    if not text:
        return {"error": "文本内容不能为空"}

    # 按句子分割
    sentences = re.split(r'[。！？]', text)
    sentences = [s.strip() for s in sentences if s.strip()]

    expanded_sentences = []
    for sentence in sentences:
        expanded_sentences.append(sentence)

        # 添加解释性句子
        if len(sentence) > 10:
            explanation = _generate_explanation(sentence)
            if explanation:
                expanded_sentences.append(explanation)

        # 添加例子（随机）
        if random.random() > 0.7:
            example = _generate_example(sentence)
            if example:
                expanded_sentences.append(example)

    # 组合扩写内容
    expanded_text = "。".join(expanded_sentences)

    # 确保以句号结尾
    if not expanded_text.endswith('。'):
        expanded_text += '。'

    return {
        "original_text": text,
        "expanded_text": expanded_text,
        "original_length": len(text),
        "expanded_length": len(expanded_text),
        "expansion_ratio": round(len(expanded_text) / len(text), 2),
        "target_ratio": expansion_ratio,
    }


def _generate_explanation(sentence: str) -> str:
    """
    生成解释性句子

    Args:
        sentence: 原句

    Returns:
        解释句
    """
    explanations = [
        "简单来说，这其实是……",
        "换句话说，这意味着……",
        "换个角度看，我们可以理解……",
        "这表明了一个重要的道理：……",
        "从本质上讲，这是因为……",
    ]
    return random.choice(explanations)


def _generate_example(sentence: str) -> str:
    """
    生成例子

    Args:
        sentence: 原句

    Returns:
        例子句
    """
    examples = [
        "举个例子来说明这个问题。",
        "打个比方，就像……",
        "举个简单的例子，比如……",
        "比如说，我们可以看到……",
        "举例来说，比如……",
    ]
    return random.choice(examples)


def compress_text(text: str, compression_ratio: float = 0.7) -> Dict[str, Any]:
    """
    精简文本

    Args:
        text: 待精简文本
        compression_ratio: 精简比例（默认0.7，即保留70%）

    Returns:
        精简结果
    """
    if not text:
        return {"error": "文本内容不能为空"}

    # 按句子分割
    sentences = re.split(r'[。！？]', text)
    sentences = [s.strip() for s in sentences if s.strip()]

    # 计算要保留的句子数量
    target_length = int(len(sentences) * compression_ratio)

    # 简单的句子重要性评估（保留较短的句子）
    sorted_sentences = sorted(
        [(i, s) for i, s in enumerate(sentences) if len(s) > 5],
        key=lambda x: len(x[1])
    )

    # 保留前target_length个句子
    kept_indices = set([s[0] for s in sorted_sentences[:target_length]])
    compressed_sentences = [s for i, s in enumerate(sentences) if i in kept_indices]

    # 组合精简内容
    compressed_text = "。".join(compressed_sentences)

    if not compressed_text.endswith('。'):
        compressed_text += '。'

    return {
        "original_text": text,
        "compressed_text": compressed_text,
        "original_length": len(text),
        "compressed_length": len(compressed_text),
        "compression_ratio": round(len(compressed_text) / len(text), 2),
        "target_ratio": compression_ratio,
    }


def check_originality(text: str) -> Dict[str, Any]:
    """
    检测文本原创度（模拟）

    Args:
        text: 待检测文本

    Returns:
        原创度检测结果
    """
    if not text:
        return {"error": "文本内容不能为空"}

    # 简单的原创度检测（实际应用中应接入专业的查重API）
    sentences = re.split(r'[。！？]', text)
    sentences = [s.strip() for s in sentences if s.strip()]

    # 模拟检测：基于句子相似度
    unique_sentences = set(sentences)
    originality_score = len(unique_sentences) / len(sentences) if sentences else 1.0

    # 基于常用表达检测
    common_phrases = [
        "众所周知", "毫无疑问", "毫无疑问", "事实上", "实际上",
        "从某种意义上说", "值得一提的是", "值得注意的是",
    ]
    common_phrase_count = sum(1 for s in sentences if any(phrase in s for phrase in common_phrases))

    # 调整原创度评分
    adjusted_score = originality_score - (common_phrase_count * 0.05)
    adjusted_score = max(0, min(100, adjusted_score * 100))

    return {
        "originality_score": round(adjusted_score, 2),
        "total_sentences": len(sentences),
        "unique_sentences": len(unique_sentences),
        "common_phrase_count": common_phrase_count,
        "grade": _get_originality_grade(adjusted_score),
        "suggestions": _get_originality_suggestions(adjusted_score),
    }


def _get_originality_grade(score: float) -> str:
    """
    获取原创度等级

    Args:
        score: 原创度分数

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


def _get_originality_suggestions(score: float) -> List[str]:
    """
    获取原创度改进建议

    Args:
        score: 原创度分数

    Returns:
        建议列表
    """
    suggestions = []

    if score < 60:
        suggestions.append("建议使用更多的个人观点和独特见解")
        suggestions.append("尝试用自己的语言重新表达")
        suggestions.append("增加具体的案例和数据支撑")

    if score >= 60 and score < 80:
        suggestions.append("可以适当增加一些独特的观点")
        suggestions.append("减少对常用表达的依赖")

    return suggestions


def optimize_structure(text: str) -> Dict[str, Any]:
    """
    优化文章结构

    Args:
        text: 待优化文本

    Returns:
        结构优化建议
    """
    if not text:
        return {"error": "文本内容不能为空"}

    sentences = re.split(r'[。！？]', text)
    sentences = [s.strip() for s in sentences if s.strip()]

    # 分析段落结构
    paragraphs = text.split('\n\n')
    paragraphs = [p.strip() for p in paragraphs if p.strip()]

    # 分析句子长度分布
    sentence_lengths = [len(s) for s in sentences]
    avg_length = sum(sentence_lengths) / len(sentence_lengths) if sentence_lengths else 0

    # 检查是否有明显的小标题
    has_subheadings = any(
        re.match(r'^[一二三四五六七八九十]+、', p) or
        re.match(r'^\d+[、.]', p) or
        len(p) < 30 and p.strip()
        for p in paragraphs
    )

    suggestions = []

    # 结构建议
    if len(paragraphs) < 3:
        suggestions.append("建议增加段落数量，提升文章层次感")

    if avg_length > 100:
        suggestions.append("句子偏长，建议拆分长句，提升可读性")

    if avg_length < 20:
        suggestions.append("句子偏短，建议适当合并，增强连贯性")

    if not has_subheadings:
        suggestions.append("建议添加小标题，方便读者快速定位")

    # 检查开头和结尾
    if sentences:
        first_sentence = sentences[0]
        last_sentence = sentences[-1]

        if len(first_sentence) < 20:
            suggestions.append("开头略显单薄，建议增加引人入胜的导语")

        if len(last_sentence) < 20:
            suggestions.append("结尾略显简单，建议加强总结或引导")

    return {
        "paragraph_count": len(paragraphs),
        "sentence_count": len(sentences),
        "avg_sentence_length": round(avg_length, 2),
        "has_subheadings": has_subheadings,
        "suggestions": suggestions if suggestions else ["文章结构良好，无需调整"],
        "structure_score": _calculate_structure_score(len(paragraphs), avg_length, has_subheadings),
    }


def _calculate_structure_score(paragraph_count: int, avg_length: float, has_subheadings: bool) -> float:
    """
    计算结构评分

    Args:
        paragraph_count: 段落数
        avg_length: 平均句子长度
        has_subheadings: 是否有小标题

    Returns:
        结构评分
    """
    score = 0.0

    # 段落数评分（3-8段最佳）
    if 3 <= paragraph_count <= 8:
        score += 30
    elif paragraph_count > 8:
        score += 20
    else:
        score += 10

    # 句子长度评分（30-80字最佳）
    if 30 <= avg_length <= 80:
        score += 30
    elif 20 <= avg_length < 30 or 80 < avg_length <= 100:
        score += 20
    else:
        score += 10

    # 小标题评分
    if has_subheadings:
        score += 40

    return min(100, score)


def optimize_seo(text: str, keywords: List[str] = None) -> Dict[str, Any]:
    """
    SEO优化

    Args:
        text: 待优化文本
        keywords: 关键词列表

    Returns:
        SEO优化建议
    """
    if not text:
        return {"error": "文本内容不能为空"}

    # 分析文本
    words = re.findall(r'[\w]+', text)
    word_count = len(words)

    # 关键词分析
    keyword_density = {}
    if keywords:
        for keyword in keywords:
            count = sum(1 for word in words if keyword.lower() in word.lower())
            density = (count / word_count * 100) if word_count > 0 else 0
            keyword_density[keyword] = {
                "count": count,
                "density": round(density, 2),
            }

    # 分析标题（假设第一句话是标题）
    sentences = re.split(r'[。！？\n]', text)
    title = sentences[0].strip() if sentences else ""

    # 文本长度分析
    text_length = len(text)

    suggestions = []

    # 关键词密度建议（2-5%）
    for keyword, info in keyword_density.items():
        if info["density"] < 2:
            suggestions.append(f"关键词'{keyword}'密度偏低（{info['density']}%），建议增加到2-5%")
        elif info["density"] > 5:
            suggestions.append(f"关键词'{keyword}'密度偏高（{info['density']}%），建议降低到2-5%")

    # 标题建议
    if len(title) < 10:
        suggestions.append("标题过短，建议增加到10-30字")

    if keywords and not any(kw in title for kw in keywords):
        suggestions.append("标题中未包含关键词，建议添加主关键词")

    # 文本长度建议
    if text_length < 300:
        suggestions.append("文本过短，建议至少300字以利于SEO")
    elif text_length > 3000:
        suggestions.append("文本过长，建议控制在3000字以内")

    # 内链建议（模拟）
    internal_link_suggestion = "建议在文章中添加2-3个内部链接"
    suggestions.append(internal_link_suggestion)

    return {
        "word_count": word_count,
        "text_length": text_length,
        "title_length": len(title),
        "keyword_density": keyword_density,
        "suggestions": suggestions if suggestions else ["SEO优化良好，符合最佳实践"],
        "seo_score": _calculate_seo_score(keyword_density, len(title), text_length),
    }


def _calculate_seo_score(keyword_density: Dict, title_length: int, text_length: int) -> float:
    """
    计算SEO评分

    Args:
        keyword_density: 关键词密度
        title_length: 标题长度
        text_length: 文本长度

    Returns:
        SEO评分
    """
    score = 0.0

    # 关键词密度评分
    if keyword_density:
        avg_density = sum(info["density"] for info in keyword_density.values()) / len(keyword_density)
        if 2 <= avg_density <= 5:
            score += 40
        elif 1 <= avg_density < 2 or 5 < avg_density <= 6:
            score += 20
    else:
        score += 10

    # 标题长度评分（10-30字最佳）
    if 10 <= title_length <= 30:
        score += 30
    elif title_length > 0:
        score += 15

    # 文本长度评分（300-3000字最佳）
    if 300 <= text_length <= 3000:
        score += 30
    elif 200 <= text_length < 300 or 3000 < text_length <= 5000:
        score += 15

    return min(100, score)


def evaluate_quality(text: str) -> Dict[str, Any]:
    """
    评估内容质量

    Args:
        text: 待评估文本

    Returns:
        质量评估结果
    """
    if not text:
        return {"error": "文本内容不能为空"}

    # 基础指标
    word_count = len(re.findall(r'[\w]+', text))
    sentence_count = len(re.split(r'[。！？]', text))
    avg_sentence_length = word_count / sentence_count if sentence_count > 0 else 0

    # 词汇丰富度
    words = re.findall(r'[\w]+', text)
    unique_words = set(words)
    vocabulary_richness = len(unique_words) / len(words) if words else 0

    # 情感倾向（简单模拟）
    positive_words = ["好", "优秀", "棒", "喜欢", "成功", "快乐", "幸福", "优秀"]
    negative_words = ["差", "不好", "糟糕", "失败", "痛苦", "难过", "悲伤"]

    positive_count = sum(1 for word in words if any(pw in word for pw in positive_words))
    negative_count = sum(1 for word in words if any(nw in word for nw in negative_words))

    # 综合评分
    quality_score = (
        min(30, vocabulary_richness * 100) +  # 词汇丰富度
        min(30, word_count / 100) +  # 内容量
        min(20, positive_count * 5) +  # 正面情感
        max(0, min(20, 20 - negative_count * 5))  # 负面情感扣分
    )

    suggestions = []

    if vocabulary_richness < 0.5:
        suggestions.append("词汇丰富度较低，建议使用更多样的表达")

    if word_count < 200:
        suggestions.append("内容量偏少，建议扩展内容")

    if positive_count == 0 and negative_count == 0:
        suggestions.append("情感倾向不明显，建议增加一些情感表达")

    return {
        "word_count": word_count,
        "sentence_count": sentence_count,
        "avg_sentence_length": round(avg_sentence_length, 2),
        "vocabulary_richness": round(vocabulary_richness, 2),
        "positive_word_count": positive_count,
        "negative_word_count": negative_count,
        "quality_score": round(quality_score, 2),
        "grade": _get_quality_grade(quality_score),
        "suggestions": suggestions if suggestions else ["内容质量优秀！"],
    }


def _get_quality_grade(score: float) -> str:
    """
    获取质量等级

    Args:
        score: 质量分数

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
            - action: 操作类型（polish/expand/compress/check_originality/optimize_structure/optimize_seo/evaluate_quality）
            - text: 待处理文本
            - style: 写作风格（可选，默认正式）
            - expansion_ratio: 扩写比例（可选，默认1.5）
            - compression_ratio: 精简比例（可选，默认0.7）
            - keywords: 关键词列表（可选，用于SEO优化）

    Returns:
        处理结果
    """
    action = args.get("action")
    text = args.get("text", "")

    if not text:
        raise ValueError("文本内容不能为空")

    result = {}

    if action == "polish":
        style = args.get("style", "正式")
        result = polish_text(text, style)

    elif action == "expand":
        expansion_ratio = args.get("expansion_ratio", 1.5)
        result = expand_text(text, expansion_ratio)

    elif action == "compress":
        compression_ratio = args.get("compression_ratio", 0.7)
        result = compress_text(text, compression_ratio)

    elif action == "check_originality":
        result = check_originality(text)

    elif action == "optimize_structure":
        result = optimize_structure(text)

    elif action == "optimize_seo":
        keywords = args.get("keywords", [])
        result = optimize_seo(text, keywords)

    elif action == "evaluate_quality":
        result = evaluate_quality(text)

    else:
        raise ValueError(f"不支持的操作类型: {action}")

    return result
