from typing import Dict, Any, List, Tuple
import json
import re
import os
from datetime import datetime
from collections import Counter
import sys

# Fix encoding issues on Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

"""
写作风格学习工具

基于AI的写作风格学习工具，能够分析用户历史文章，提取写作风格特征，并基于风格生成新内容

核心功能：
1. 风格分析：多维度分析写作风格特征
2. 风格描述生成：生成结构化的风格描述文档
3. 基于风格生成：生成标题、润色内容、创作文章
4. 风格库管理：保存和管理多个风格版本

关键数据：
- 最少文章数量：10篇
- 推荐文章数量：20-30篇
- 最佳文章数量：50篇以上
"""


def parse_articles(articles_text: str) -> List[Dict[str, str]]:
    """
    解析用户提供的文章文本

    Args:
        articles_text: 文章文本（可能包含多篇文章）

    Returns:
        解析后的文章列表
    """
    # 尝试按文章分隔符分割
    # 常见分隔符：===、---、多个换行等
    separators = [
        r'\n={3,}\n',
        r'\n-{3,}\n',
        r'\n\n\n+',
    ]

    articles = []

    # 尝试使用分隔符
    for separator in separators:
        parts = re.split(separator, articles_text)
        if len(parts) > 1:
            # 检查是否有效分割
            valid_parts = [p.strip() for p in parts if len(p.strip()) > 100]
            if len(valid_parts) >= 2:
                for i, part in enumerate(valid_parts):
                    articles.append({
                        "id": i + 1,
                        "content": part
                    })
                break

    # 如果没有找到分隔符，尝试按标题分割
    if not articles:
        lines = articles_text.split('\n')
        current_article = []
        article_count = 0

        for line in lines:
            # 检测标题（行首无缩进，长度适中，不是纯数字）
            if (line.strip() and
                not line.startswith(' ') and
                len(line.strip()) < 100 and
                not line.strip().isdigit() and
                not re.match(r'^[一二三四五六七八九十]+[、.，]', line.strip())):

                if current_article:
                    article_count += 1
                    articles.append({
                        "id": article_count,
                        "content": '\n'.join(current_article)
                    })
                current_article = []

            current_article.append(line)

        # 添加最后一篇文章
        if current_article:
            article_count += 1
            articles.append({
                "id": article_count,
                "content": '\n'.join(current_article)
            })

    # 如果还是没有分割成功，当作一篇文章
    if not articles:
        articles = [{
            "id": 1,
            "content": articles_text
        }]

    return articles


def extract_title(article_content: str) -> str:
    """
    提取文章标题

    Args:
        article_content: 文章内容

    Returns:
        标题
    """
    lines = article_content.split('\n')

    for line in lines[:10]:  # 只检查前10行
        line = line.strip()

        # 跳过空行
        if not line:
            continue

        # 跳过特殊标记
        if line.startswith('#') or line.startswith('>') or line.startswith('```'):
            continue

        # 检查是否是标题（不是纯数字，不是太短，不是太长）
        if (not line.isdigit() and
            len(line) >= 5 and
            len(line) <= 100 and
            not re.match(r'^\d+[、.，]', line)):

            return line

    return "未找到标题"


def extract_opening(article_content: str) -> str:
    """
    提取文章开头

    Args:
        article_content: 文章内容

    Returns:
        开头文本
    """
    lines = article_content.split('\n')

    opening_lines = []
    in_opening = True

    for line in lines:
        line = line.strip()

        # 跳过标题行
        if len(opening_lines) == 0 and not line:
            continue

        # 检查是否离开开头
        if not in_opening:
            break

        # 如果是特殊标记（如##），认为开头结束
        if line.startswith('#'):
            in_opening = False
            break

        # 如果开头超过200字，结束
        if len(' '.join(opening_lines)) > 200:
            in_opening = False
            break

        # 如果是空行且已经有内容，可能进入正文
        if not line and opening_lines:
            in_opening = False
            break

        opening_lines.append(line)

    return ' '.join(opening_lines[:5])  # 最多5行


def extract_content_body(article_content: str) -> List[str]:
    """
    提取文章正文段落

    Args:
        article_content: 文章内容

    Returns:
        正文段落列表
    """
    lines = article_content.split('\n')

    paragraphs = []
    current_paragraph = []

    skip_opening = True
    opening_count = 0

    for line in lines:
        line = line.strip()

        # 跳过开头
        if skip_opening:
            if line:
                opening_count += 1
            if opening_count >= 5:
                skip_opening = False
            continue

        # 跳过空行
        if not line:
            if current_paragraph:
                paragraphs.append(' '.join(current_paragraph))
                current_paragraph = []
            continue

        # 跳过特殊标记
        if line.startswith('#') or line.startswith('>') or line.startswith('```'):
            continue

        current_paragraph.append(line)

    # 添加最后一个段落
    if current_paragraph:
        paragraphs.append(' '.join(current_paragraph))

    return paragraphs


def extract_ending(article_content: str) -> str:
    """
    提取文章结尾

    Args:
        article_content: 文章内容

    Returns:
        结尾文本
    """
    lines = article_content.split('\n')

    # 取最后5-10行
    ending_lines = lines[-10:]

    # 过滤空行和特殊标记
    ending_lines = [
        line.strip()
        for line in ending_lines
        if line.strip() and not line.startswith('#') and not line.startswith('>')
    ]

    return ' '.join(ending_lines[-5:])


def analyze_title_style(articles: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    分析标题风格

    Args:
        articles: 文章列表

    Returns:
        标题风格分析结果
    """
    titles = [extract_title(article["content"]) for article in articles]

    # 长度统计
    lengths = [len(title) for title in titles if title != "未找到标题"]

    # 模式识别
    patterns = {
        "数字式": 0,
        "悬念式": 0,
        "对比式": 0,
        "提问式": 0,
    }

    for title in titles:
        if title == "未找到标题":
            continue

        # 数字式
        if re.search(r'\d+[个种条项]', title):
            patterns["数字式"] += 1

        # 悬念式
        if re.search(r'(揭秘|突破|神器|黑科技)', title):
            patterns["悬念式"] += 1

        # 对比式
        if re.search(r'(看似|实则|但是|然而)', title):
            patterns["对比式"] += 1

        # 提问式
        if re.search(r'[？?]$', title):
            patterns["提问式"] += 1

    # 关键词提取
    all_words = []
    for title in titles:
        if title == "未找到标题":
            continue
        words = re.findall(r'[\w]+', title)
        all_words.extend(words)

    word_counter = Counter(all_words)
    keywords = [word for word, count in word_counter.most_common(10)]

    return {
        "patterns": patterns,
        "length": {
            "avg": sum(lengths) // len(lengths) if lengths else 0,
            "min": min(lengths) if lengths else 0,
            "max": max(lengths) if lengths else 0,
        },
        "keywords": keywords
    }


def analyze_opening_style(articles: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    分析开头风格

    Args:
        articles: 文章列表

    Returns:
        开头风格分析结果
    """
    openings = [extract_opening(article["content"]) for article in articles]

    # 长度统计
    lengths = [len(opening) for opening in openings]

    # 模式识别
    patterns = {
        "热点引入": 0,
        "痛点提问": 0,
        "数据震撼": 0,
    }

    for opening in openings:
        # 热点引入
        if re.search(r'(最新|今天|近日|据报道)', opening):
            patterns["热点引入"] += 1

        # 痛点提问
        if re.search(r'[？?]', opening):
            patterns["痛点提问"] += 1

        # 数据震撼
        if re.search(r'\d+[千万百亿]', opening):
            patterns["数据震撼"] += 1

    # 基调分析（简单版）
    tone_count = {
        "专业": 0,
        "幽默": 0,
        "犀利": 0,
    }

    for opening in openings:
        # 专业：包含技术术语
        if re.search(r'(AI|算法|模型|技术)', opening):
            tone_count["专业"] += 1

        # 幽默：包含表情或轻松词汇
        if re.search(r'(哈哈|😀|😊|有趣)', opening):
            tone_count["幽默"] += 1

        # 犀利：包含否定或批判词汇
        if re.search(r'(不|没有|但是|然而)', opening):
            tone_count["犀利"] += 1

    return {
        "patterns": patterns,
        "length": {
            "avg": sum(lengths) // len(lengths) if lengths else 0,
            "min": min(lengths) if lengths else 0,
            "max": max(lengths) if lengths else 0,
        },
        "tone": max(tone_count.items(), key=lambda x: x[1])[0] if tone_count else "未知"
    }


def analyze_content_structure(articles: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    分析内容结构

    Args:
        articles: 文章列表

    Returns:
        内容结构分析结果
    """
    all_paragraphs = []

    for article in articles:
        paragraphs = extract_content_body(article["content"])
        all_paragraphs.extend(paragraphs)

    # 段落数量统计
    paragraph_counts = [len(extract_content_body(article["content"])) for article in articles]

    # 段落长度统计
    paragraph_lengths = [len(p) for p in all_paragraphs]

    # 结构识别（简单版：总-分-总）
    structure_count = {
        "总分总": 0,
        "递进": 0,
        "并列": 0,
    }

    # 简单的启发式判断
    for article in articles:
        paragraphs = extract_content_body(article["content"])
        if len(paragraphs) >= 3:
            # 检查是否有明显的总结段落
            first_para = paragraphs[0]
            last_para = paragraphs[-1]

            if "总结" in last_para or "结语" in last_para or "总之" in last_para:
                structure_count["总分总"] += 1

    return {
        "structure": max(structure_count.items(), key=lambda x: x[1])[0] if structure_count else "未知",
        "paragraph_count": {
            "avg": sum(paragraph_counts) // len(paragraph_counts) if paragraph_counts else 0,
            "min": min(paragraph_counts) if paragraph_counts else 0,
            "max": max(paragraph_counts) if paragraph_counts else 0,
        },
        "paragraph_length": {
            "avg": sum(paragraph_lengths) // len(paragraph_lengths) if paragraph_lengths else 0,
            "min": min(paragraph_lengths) if paragraph_lengths else 0,
            "max": max(paragraph_lengths) if paragraph_lengths else 0,
        }
    }


def analyze_language_style(articles: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    分析语言风格

    Args:
        articles: 文章列表

    Returns:
        语言风格分析结果
    """
    all_text = ' '.join([article["content"] for article in articles])

    # 句长统计（简单版：按标点分割）
    sentences = re.split(r'[。！？\n]', all_text)
    sentences = [s.strip() for s in sentences if s.strip()]
    sentence_lengths = [len(s) for s in sentences]

    # 词汇多样性
    words = re.findall(r'[\w]+', all_text)
    word_counter = Counter(words)
    vocabulary_diversity = len(word_counter) / len(words) if words else 0

    # 基调分析
    tone_keywords = {
        "专业": ["技术", "算法", "模型", "系统", "架构"],
        "幽默": ["哈哈", "😀", "😊", "有趣", "好玩"],
        "犀利": ["不", "没有", "但是", "然而", "问题"],
    }

    tone_scores = {tone: 0 for tone in tone_keywords}
    for tone, keywords in tone_keywords.items():
        for keyword in keywords:
            tone_scores[tone] += all_text.count(keyword)

    return {
        "vocabulary": f"专业术语+通俗解释" if tone_scores["专业"] > 10 else "通俗为主",
        "sentence_length": {
            "avg": sum(sentence_lengths) // len(sentence_lengths) if sentence_lengths else 0,
            "min": min(sentence_lengths) if sentence_lengths else 0,
            "max": max(sentence_lengths) if sentence_lengths else 0,
        },
        "tone": max(tone_scores.items(), key=lambda x: x[1])[0] if tone_scores else "未知",
        "vocabulary_diversity": round(vocabulary_diversity, 2)
    }


def analyze_ending_style(articles: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    分析结尾风格

    Args:
        articles: 文章列表

    Returns:
        结尾风格分析结果
    """
    endings = [extract_ending(article["content"]) for article in articles]

    # 长度统计
    lengths = [len(ending) for ending in endings]

    # 模式识别
    patterns = {
        "总结提升": 0,
        "行动号召": 0,
        "福利引导": 0,
    }

    for ending in endings:
        # 总结提升
        if re.search(r'(总结|总而言之|总之|综上)', ending):
            patterns["总结提升"] += 1

        # 行动号召
        if re.search(r'(关注|点赞|收藏|转发|分享)', ending):
            patterns["行动号召"] += 1

        # 福利引导
        if re.search(r'(获取|下载|领取|免费|福利)', ending):
            patterns["福利引导"] += 1

    return {
        "patterns": patterns,
        "length": {
            "avg": sum(lengths) // len(lengths) if lengths else 0,
            "min": min(lengths) if lengths else 0,
            "max": max(lengths) if lengths else 0,
        },
        "call_to_action": max(patterns.items(), key=lambda x: x[1])[0] if patterns else "无"
    }


def analyze_tone_style(articles: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    分析语气/语体色彩

    Args:
        articles: 文章列表

    Returns:
        语气风格分析结果
    """
    all_text = ' '.join([article["content"] for article in articles])

    # 语气维度分析
    tone_keywords = {
        "豪放": ["雄心", "伟业", "开阔", "恢弘", "磅礴", "激昂", "慷慨"],
        "柔婉": ["纤巧", "细致", "缠绵", "柔", "婉", "细腻"],
        "直露": ["直接", "明确", "显然", "显然", "直言"],
        "含蓄": ["含蓄", "委婉", "暗示", "寓意", "隐喻"],
        "幽默": ["哈哈", "😀", "😊", "有趣", "好玩", "幽默", "搞笑"],
        "沉郁": ["沉郁", "凄凉", "悲伤", "哀愁", "忧郁"],
        "清新": ["清新", "明快", "明朗", "轻快"],
        "华丽": ["华丽", "典雅", "瑰丽", "绮丽", "绚烂"],
        "素朴": ["素朴", "朴素", "朴实", "自然", "淡雅"],
    }

    tone_scores = {tone: 0 for tone in tone_keywords}
    for tone, keywords in tone_keywords.items():
        for keyword in keywords:
            tone_scores[tone] += all_text.count(keyword)

    # 判断主要语气
    dominant_tone = max(tone_scores.items(), key=lambda x: x[1])[0] if tone_scores else "中性"

    # 语气强度
    tone_intensity = "强" if tone_scores[dominant_tone] > 10 else "弱"

    return {
        "dominant_tone": dominant_tone,
        "tone_intensity": tone_intensity,
        "tone_scores": tone_scores
    }


def analyze_emotion_style(articles: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    分析情感色彩

    Args:
        articles: 文章列表

    Returns:
        情感风格分析结果
    """
    all_text = ' '.join([article["content"] for article in articles])

    # 情感词汇
    emotion_keywords = {
        "正面": ["好", "优秀", "棒", "赞", "喜欢", "爱", "成功", "优秀", "精彩"],
        "负面": ["不好", "差", "坏", "讨厌", "恨", "失败", "糟糕", "差劲"],
        "激越": ["激昂", "慷慨", "激越", "热情", "热烈"],
        "明快": ["明快", "明亮", "欢快", "快乐", "喜悦"],
        "沉郁": ["沉郁", "忧伤", "悲伤", "哀愁"],
        "含蓄": ["含蓄", "委婉", "深沉"],
    }

    emotion_scores = {emotion: 0 for emotion in emotion_keywords}
    for emotion, keywords in emotion_keywords.items():
        for keyword in keywords:
            emotion_scores[emotion] += all_text.count(keyword)

    # 情感倾向
    positive_score = emotion_scores["正面"] + emotion_scores["明快"]
    negative_score = emotion_scores["负面"] + emotion_scores["沉郁"]
    total_score = positive_score + negative_score

    if total_score == 0:
        sentiment_trend = "中性"
    elif positive_score > negative_score:
        sentiment_trend = "正面"
    else:
        sentiment_trend = "负面"

    # 情感强度
    emotion_intensity = "强" if total_score > 20 else "中" if total_score > 10 else "弱"

    # 主导情感
    dominant_emotion = max(emotion_scores.items(), key=lambda x: x[1])[0] if emotion_scores else "中性"

    return {
        "sentiment_trend": sentiment_trend,
        "emotion_intensity": emotion_intensity,
        "dominant_emotion": dominant_emotion,
        "emotion_scores": emotion_scores
    }


def analyze_common_phrases(articles: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    分析常用语风格

    Args:
        articles: 文章列表

    Returns:
        常用语风格分析结果
    """
    all_text = ' '.join([article["content"] for article in articles])

    # 常用语类型
    phrase_patterns = {
        "书面语": ["因此", "因而", "由此可见", "综上所述", "总而言之"],
        "口头语": ["吧", "呢", "啊", "吗", "嘛", "哈"],
        "叠词": [],  # 动态提取
        "成语": [],  # 动态提取
        "网络用语": ["打卡", "种草", "拔草", "吃瓜", "躺平", "内卷"],
        "专业术语": ["AI", "算法", "模型", "数据", "分析", "技术"],
    }

    phrase_counts = {phrase: 0 for phrase in phrase_patterns}

    # 统计固定短语
    for phrase, keywords in phrase_patterns.items():
        if keywords:  # 非空
            for keyword in keywords:
                phrase_counts[phrase] += all_text.count(keyword)

    # 提取叠词（模式：AA, ABB, AABB）
    reduplicated_words = re.findall(r'(.)\1+(?=.{0,2})', all_text)
    phrase_counts["叠词"] = len(reduplicated_words)

    # 提取高频短语（3-4字）
    words = re.findall(r'[\u4e00-\u9fa5]{3,4}', all_text)
    word_counter = Counter(words)
    common_phrases = word_counter.most_common(20)

    # 判断主要用语风格
    dominant_phrase_style = max(phrase_counts.items(), key=lambda x: x[1])[0] if phrase_counts else "混合"

    return {
        "dominant_style": dominant_phrase_style,
        "phrase_counts": phrase_counts,
        "top_common_phrases": common_phrases[:10],
        "reduplicated_word_count": len(reduplicated_words)
    }


def analyze_rhetorical_devices(articles: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    分析修辞手法

    Args:
        articles: 文章列表

    Returns:
        修辞手法分析结果
    """
    all_text = ' '.join([article["content"] for article in articles])

    # 修辞手法检测（简化版）
    rhetorical_devices = {
        "比喻": 0,  # 含"像"、"如"、"似"
        "拟人": 0,  # 含拟人动词
        "夸张": 0,  # 含夸张词
        "排比": 0,  # 检测排比句式
        "设问": 0,  # 含"？"
        "反问": 0,  # 检测反问句式
        "引用": 0,  # 含"引号"或书名号
        "对偶": 0,  # 检测对偶句式
    }

    # 比喻
    if re.search(r'(像|如|似|仿佛|好比)', all_text):
        rhetorical_devices["比喻"] += all_text.count("像") + all_text.count("如") + all_text.count("似")

    # 拟人（简化版：检测常见拟人词）
    personification_words = ["微笑", "跳舞", "歌唱", "哭泣", "怒吼"]
    for word in personification_words:
        rhetorical_devices["拟人"] += all_text.count(word)

    # 夸张（简化版：检测夸张词）
    exaggeration_words = ["极其", "非常", "超级", "千万", "无数"]
    for word in exaggeration_words:
        rhetorical_devices["夸张"] += all_text.count(word)

    # 排比（简化版：检测重复结构）
    if re.search(r'(.{5,20})[，。].*\1[，。]', all_text):
        rhetorical_devices["排比"] += 1

    # 设问/反问
    rhetorical_devices["设问"] = all_text.count("？")
    if re.search(r'(难道|岂不是|怎么能)', all_text):
        rhetorical_devices["反问"] += 1

    # 引用
    rhetorical_devices["引用"] = all_text.count('"') // 2 + all_text.count('"') // 2

    # 对偶（简化版：检测对偶结构）
    if re.search(r'(.{4,10})[，。].*(.{4,10})[，。]', all_text):
        rhetorical_devices["对偶"] += 1

    # 计算总数
    total_devices = sum(rhetorical_devices.values())

    # 主要修辞手法
    dominant_device = max(rhetorical_devices.items(), key=lambda x: x[1])[0] if rhetorical_devices else "无明显修辞"

    return {
        "dominant_device": dominant_device,
        "device_counts": rhetorical_devices,
        "total_devices": total_devices,
        "device_density": round(total_devices / len(all_text) * 100, 2) if all_text else 0
    }


def analyze_sentence_structure(articles: List[Dict[str, str]]) -> Dict[str, Any]:
    """
    分析句式风格

    Args:
        articles: 文章列表

    Returns:
        句式风格分析结果
    """
    all_text = ' '.join([article["content"] for article in articles])

    # 句子分割
    sentences = re.split(r'[。！？\n]', all_text)
    sentences = [s.strip() for s in sentences if s.strip()]
    sentence_lengths = [len(s) for s in sentences]

    # 句式类型
    sentence_types = {
        "整句": 0,  # 结构完整
        "散句": 0,  # 结构不完整
        "长句": 0,  # >30字
        "短句": 0,  # <15字
        "感叹句": 0,  # 含"！"
        "疑问句": 0,  # 含"？"
    }

    for sentence in sentences:
        length = len(sentence)

        # 判断整句/散句（简化版：根据标点）
        if sentence and (sentence[-1] in ['。', '！', '？', '。', '！', '？']):
            sentence_types["整句"] += 1
        else:
            sentence_types["散句"] += 1

        # 判断长短
        if length > 30:
            sentence_types["长句"] += 1
        elif length < 15:
            sentence_types["短句"] += 1

        # 感叹句
        if '！' in sentence or '!' in sentence:
            sentence_types["感叹句"] += 1

        # 疑问句
        if '？' in sentence or '?' in sentence:
            sentence_types["疑问句"] += 1

    # 整散句比例
    total_sentences = len(sentences)
    if total_sentences > 0:
        ratio_zhengsan = sentence_types["整句"] / total_sentences
    else:
        ratio_zhengsan = 0.5

    # 长短句比例
    if total_sentences > 0:
        ratio_changduan = sentence_types["长句"] / (sentence_types["短句"] + 1)
    else:
        ratio_changduan = 0.5

    # 主要句式类型
    if ratio_zhengsan > 0.7:
        dominant_type = "以整句为主"
    elif ratio_zhengsan < 0.3:
        dominant_type = "以散句为主"
    else:
        dominant_type = "整散结合"

    return {
        "dominant_type": dominant_type,
        "sentence_types": sentence_types,
        "sentence_length": {
            "avg": sum(sentence_lengths) // len(sentence_lengths) if sentence_lengths else 0,
            "min": min(sentence_lengths) if sentence_lengths else 0,
            "max": max(sentence_lengths) if sentence_lengths else 0,
        },
        "ratio_zhengsan": round(ratio_zhengsan, 2),
        "ratio_changduan": round(ratio_changduan, 2)
    }


def analyze_style(articles_text: str) -> Dict[str, Any]:
    """
    分析写作风格（主函数）

    Args:
        articles_text: 文章文本

    Returns:
        风格分析结果
    """
    # 解析文章
    articles = parse_articles(articles_text)

    if len(articles) < 10:
        print(f"⚠️ 警告：只有{len(articles)}篇文章，建议至少10篇文章")

    # 分析各个维度
    title_style = analyze_title_style(articles)
    opening_style = analyze_opening_style(articles)
    content_structure = analyze_content_structure(articles)
    language_style = analyze_language_style(articles)
    ending_style = analyze_ending_style(articles)

    # 新增：分析更多维度
    tone_style = analyze_tone_style(articles)
    emotion_style = analyze_emotion_style(articles)
    common_phrases_style = analyze_common_phrases(articles)
    rhetorical_devices_style = analyze_rhetorical_devices(articles)
    sentence_structure_style = analyze_sentence_structure(articles)

    # 生成风格描述
    style_description = f"基于{len(articles)}篇文章的分析，"

    # 综合风格特征
    if title_style["patterns"]["数字式"] > 0:
        style_description += "标题倾向于使用数字式表达，"

    if opening_style["tone"] == "专业":
        style_description += "开头风格专业，"

    if content_structure["structure"] == "总分总":
        style_description += "内容结构采用总分总，"

    if language_style["tone"] == "专业":
        style_description += "语言风格偏专业，"

    style_description += "内容实用性较强。"

    # 生成风格标签
    style_tags = []

    if title_style["patterns"]["数字式"] > 0:
        style_tags.append("数字式")

    if title_style["patterns"]["悬念式"] > 0:
        style_tags.append("悬念式")

    if title_style["patterns"]["对比式"] > 0:
        style_tags.append("对比式")

    if language_style["tone"] == "专业":
        style_tags.append("专业")

    if len(articles) >= 10:
        style_tags.append("干货")

    # 计算风格评分（简单版）
    style_score = 70  # 基础分
    if len(articles) >= 10:
        style_score += 10
    if len(articles) >= 20:
        style_score += 10
    if title_style["patterns"]["数字式"] > 0:
        style_score += 5

    return {
        "status": "success",
        "article_count": len(articles),
        "style_features": {
            "title_style": title_style,
            "opening_style": opening_style,
            "content_structure": content_structure,
            "language_style": language_style,
            "ending_style": ending_style,
            "tone_style": tone_style,
            "emotion_style": emotion_style,
            "common_phrases_style": common_phrases_style,
            "rhetorical_devices_style": rhetorical_devices_style,
            "sentence_structure_style": sentence_structure_style
        },
        "style_description": style_description,
        "style_tags": style_tags,
        "style_score": style_score
    }


def generate_style_prompt(style_analysis: Dict[str, Any]) -> str:
    """
    生成风格Prompt

    Args:
        style_analysis: 风格分析结果

    Returns:
        风格Prompt
    """
    features = style_analysis["style_features"]
    description = style_analysis["style_description"]
    tags = style_analysis["style_tags"]

    prompt = f"""# 写作风格指南

## 基本定位
{description}

## 风格标签
{', '.join(tags)}

## 标题风格

### 常用模式
"""

    # 标题模式
    title_patterns = features["title_style"]["patterns"]
    for pattern, count in title_patterns.items():
        if count > 0:
            prompt += f"- {pattern}（{count}篇使用）\n"

    prompt += f"""

### 标题特征
- 长度：{features["title_style"]["length"]["min"]}-{features["title_style"]["length"]["max"]}字
- 平均长度：{features["title_style"]["length"]["avg"]}字
- 关键词：{', '.join(features["title_style"]["keywords"][:5])}

## 开头风格

### 常用模式
"""

    # 开头模式
    opening_patterns = features["opening_style"]["patterns"]
    for pattern, count in opening_patterns.items():
        if count > 0:
            prompt += f"- {pattern}（{count}篇使用）\n"

    prompt += f"""

### 开头特征
- 长度：{features["opening_style"]["length"]["min"]}-{features["opening_style"]["length"]["max"]}字
- 平均长度：{features["opening_style"]["length"]["avg"]}字
- 基调：{features["opening_style"]["tone"]}

## 内容结构

### 整体结构
{features["content_structure"]["structure"]}

### 段落组织
- 段落数量：平均{features["content_structure"]["paragraph_count"]["avg"]}段（范围：{features["content_structure"]["paragraph_count"]["min"]}-{features["content_structure"]["paragraph_count"]["max"]}段）
- 段落长度：平均{features["content_structure"]["paragraph_length"]["avg"]}字（范围：{features["content_structure"]["paragraph_length"]["min"]}-{features["content_structure"]["paragraph_length"]["max"]}字）

## 语言风格

### 词汇选择
{features["language_style"]["vocabulary"]}

### 句式特点
- 句长：平均{features["language_style"]["sentence_length"]["avg"]}字（范围：{features["language_style"]["sentence_length"]["min"]}-{features["language_style"]["sentence_length"]["max"]}字）
- 基调：{features["language_style"]["tone"]}
- 词汇多样性：{features["language_style"]["vocabulary_diversity"]}

## 语气风格

### 主导语气
- 语气类型：{features["tone_style"]["dominant_tone"]}
- 语气强度：{features["tone_style"]["tone_intensity"]}

### 语气特点
{', '.join([f'- {{tone}}: {{count}}次' for tone, count in features["tone_style"]["tone_scores"].items() if count > 0]) if any(features["tone_style"]["tone_scores"].values()) else '- 语气分布均匀'}

## 情感色彩

### 情感倾向
- 情感倾向：{features["emotion_style"]["sentiment_trend"]}
- 情感强度：{features["emotion_style"]["emotion_intensity"]}
- 主导情感：{features["emotion_style"]["dominant_emotion"]}

### 情感分布
{', '.join([f'- {{emotion}}: {{count}}次' for emotion, count in features["emotion_style"]["emotion_scores"].items() if count > 0]) if any(features["emotion_style"]["emotion_scores"].values()) else '- 情感分布均匀'}

## 常用语风格

### 主导用语风格
- 用语风格：{features["common_phrases_style"]["dominant_style"]}

### 用语特点
- 叠词数量：{features["common_phrases_style"]["reduplicated_word_count"]}个
- 高频短语：{', '.join([phrase for phrase, count in features["common_phrases_style"]["top_common_phrases"][:5]])}

## 修辞手法

### 主要修辞手法
- 主导手法：{features["rhetorical_devices_style"]["dominant_device"]}
- 修辞密度：{features["rhetorical_devices_style"]["device_density"]}%

### 修辞分布
{', '.join([f'- {{device}}: {{count}}次' for device, count in features["rhetorical_devices_style"]["device_counts"].items() if count > 0]) if any(features["rhetorical_devices_style"]["device_counts"].values()) else '- 无明显修辞'}

## 句式风格

### 句式特点
- 主要句式：{features["sentence_structure_style"]["dominant_type"]}
- 整散句比例：{features["sentence_structure_style"]["ratio_zhengsan"]}

### 句式分布
{', '.join([f'- {{stype}}: {{count}}句' for stype, count in features["sentence_structure_style"]["sentence_types"].items() if count > 0]) if any(features["sentence_structure_style"]["sentence_types"].values()) else '- 句式分布均匀'}
- 句长：平均{features["sentence_structure_style"]["sentence_length"]["avg"]}字（范围：{features["sentence_structure_style"]["sentence_length"]["min"]}-{features["sentence_structure_style"]["sentence_length"]["max"]}字）

## 结尾风格

### 常用模式
"""

    # 结尾模式
    ending_patterns = features["ending_style"]["patterns"]
    for pattern, count in ending_patterns.items():
        if count > 0:
            prompt += f"- {pattern}（{count}篇使用）\n"

    prompt += f"""

### 结尾特征
- 长度：{features["ending_style"]["length"]["min"]}-{features["ending_style"]["length"]["max"]}字
- 平均长度：{features["ending_style"]["length"]["avg"]}字
- 行动号召：{features["ending_style"]["call_to_action"]}

## 写作建议

基于分析结果，建议：
1. 保持{features["tone_style"]["dominant_tone"]}的语气
2. 保持{features["emotion_style"]["dominant_emotion"]}的情感基调
3. 继续使用数字式式标题
4. 采用{features["content_structure"]["structure"]}结构
5. 注意段落长度控制
6. 适当使用{features["rhetorical_devices_style"]["dominant_device"]}等修辞手法
7. 保持{features["common_phrases_style"]["dominant_style"]}的用语风格
8. 注意{features["sentence_structure_style"]["dominant_type"]}的句式特点
"""

    return prompt


def generate_titles(style_analysis: Dict[str, Any], topic: str, limit: int = 10) -> List[str]:
    """
    基于风格生成标题

    Args:
        style_analysis: 风格分析结果
        topic: 主题
        limit: 生成数量

    Returns:
        标题列表
    """
    title_patterns = style_analysis["style_features"]["title_style"]["patterns"]
    keywords = style_analysis["style_features"]["title_style"]["keywords"]

    titles = []

    # 基于不同模式生成标题
    # 数字式
    if title_patterns["数字式"] > 0:
        titles.append(f"5大亮点揭秘！{topic}实战指南")
        titles.append(f"掌握这6个{topic}技巧，效率提升10倍")

    # 悬念式
    if title_patterns["悬念式"] > 0:
        titles.append(f"{topic}深度解析：揭秘背后真相")
        titles.append(f"{topic}大突破：效率提升的秘密")

    # 对比式
    if title_patterns["对比式"] > 0:
        titles.append(f"看似简单，实则强大！{topic}实战测评")

    # 提问式
    if title_patterns["提问式"] > 0:
        titles.append(f"为什么{topic}这么受欢迎？")

    # 补充通用标题
    titles.append(f"{topic}完全指南")
    titles.append(f"{topic}最佳实践")

    # 基于关键词生成
    if keywords:
        titles.append(f"{keywords[0]}：{topic}新突破")

    return titles[:limit]


def save_to_file(data: Any, output_file: str) -> bool:
    """
    保存数据到文件

    Args:
        data: 要保存的数据
        output_file: 输出文件路径

    Returns:
        是否成功
    """
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            if isinstance(data, str):
                f.write(data)
            else:
                json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        print(f"保存文件失败: {e}")
        return False




# ===== 船长式风格分析（2026-01-15新增） =====

def analyze_captain_style(articles_text: str) -> Dict[str, Any]:
    """
    分析船长式写作风格

    基于船长AI视界100篇文章分析，提取船长特有的写作风格特征：
    1. 开头策略：热点引入+痛点+稀缺性
    2. 内容结构：四段式（介绍→对比→体验→建议）
    3. 数据支撑：案例密度+数据引用
    4. 语言风格：真诚+接地气+适度情绪词
    5. 结尾设计：互动引导+私域转化

    Args:
        articles_text: 文章文本

    Returns:
        船长式风格分析结果
    """
    articles = parse_articles(articles_text)

    # 1. 分析开头策略
    opening_strategy = _analyze_captain_opening(articles)

    # 2. 分析内容结构
    content_structure = _analyze_captain_structure(articles)

    # 3. 分析数据支撑
    data_support = _analyze_captain_data_support(articles)

    # 4. 分析语言风格
    language_style = _analyze_captain_language(articles)

    # 5. 分析结尾设计
    ending_design = _analyze_captain_ending(articles)

    # 计算船长风格总分
    captain_score = (
        opening_strategy["score"] * 0.2 +
        content_structure["score"] * 0.25 +
        data_support["score"] * 0.2 +
        language_style["score"] * 0.2 +
        ending_design["score"] * 0.15
    )

    # 判断等级
    if captain_score >= 80:
        grade = "优秀（船长级别）"
        advice = "这个风格已经达到了船长的爆款标准！"
    elif captain_score >= 60:
        grade = "良好"
        advice = "风格不错，接近船长水平，继续优化"
    elif captain_score >= 40:
        grade = "一般"
        advice = "风格有船长影子，但还需加强"
    else:
        grade = "较差"
        advice = "与船长风格差异较大，建议学习船长模板"

    return {
        "status": "success",
        "article_count": len(articles),
        "captain_score": round(captain_score, 2),
        "grade": grade,
        "advice": advice,
        "dimensions": {
            "开头策略": opening_strategy,
            "内容结构": content_structure,
            "数据支撑": data_support,
            "语言风格": language_style,
            "结尾设计": ending_design,
        },
        "suggestions": _generate_captain_suggestions({
            "开头策略": opening_strategy,
            "内容结构": content_structure,
            "数据支撑": data_support,
            "语言风格": language_style,
            "结尾设计": ending_design,
        })
    }


def _analyze_captain_opening(articles: List[Dict[str, str]]) -> Dict[str, Any]:
    """分析船长式开头策略"""
    score = 0
    features = []

    # 检查热点引入
    hot_topic_keywords = ["Sora2", "AI视频", "Nano Banana", "Midjourney", "ChatGPT"]
    has_hot_topic = 0
    for article in articles:
        content = article["content"][:200]  # 只检查前200字
        if any(keyword in content for keyword in hot_topic_keywords):
            has_hot_topic += 1

    hot_topic_ratio = has_hot_topic / len(articles)
    if hot_topic_ratio >= 0.5:
        score += 25
        features.append(f"热点引入率：{hot_topic_ratio:.0%}（优秀）")
    elif hot_topic_ratio >= 0.3:
        score += 20
        features.append(f"热点引入率：{hot_topic_ratio:.0%}（良好）")
    else:
        score += 10
        features.append(f"热点引入率：{hot_topic_ratio:.0%}（需加强）")

    # 检查痛点共鸣
    pain_point_keywords = ["问题", "痛点", "困扰", "烦恼", "困难", "挑战"]
    has_pain_point = 0
    for article in articles:
        content = article["content"][:200]
        if any(keyword in content for keyword in pain_point_keywords):
            has_pain_point += 1

    pain_point_ratio = has_pain_point / len(articles)
    if pain_point_ratio >= 0.4:
        score += 25
        features.append(f"痛点共鸣率：{pain_point_ratio:.0%}（优秀）")
    elif pain_point_ratio >= 0.2:
        score += 15
        features.append(f"痛点共鸣率：{pain_point_ratio:.0%}（良好）")
    else:
        score += 5
        features.append(f"痛点共鸣率：{pain_point_ratio:.0%}（需加强）")

    # 检查稀缺性声明
    scarcity_keywords = ["首发", "独家", "免费", "无限", "限时", "最后", "手慢无"]
    has_scarcity = 0
    for article in articles:
        content = article["content"][:200]
        if any(keyword in content for keyword in scarcity_keywords):
            has_scarcity += 1

    scarcity_ratio = has_scarcity / len(articles)
    if scarcity_ratio >= 0.6:
        score += 25
        features.append(f"稀缺性声明率：{scarcity_ratio:.0%}（优秀）")
    elif scarcity_ratio >= 0.3:
        score += 15
        features.append(f"稀缺性声明率：{scarcity_ratio:.0%}（良好）")
    else:
        score += 5
        features.append(f"稀缺性声明率：{scarcity_ratio:.0%}（需加强）")

    # 检查"开幕雷击"效果（前3行有冲击力）
    opening_lines_avg_length = 0
    for article in articles:
        lines = article["content"].split('\n')[:3]
        opening_lines_avg_length += sum(len(line) for line in lines) / 3
    opening_lines_avg_length /= len(articles)

    if opening_lines_avg_length >= 15 and opening_lines_avg_length <= 30:
        score += 25
        features.append(f"开头平均长度：{opening_lines_avg_length:.1f}字（适中）")
    else:
        score += 10
        features.append(f"开头平均长度：{opening_lines_avg_length:.1f}字（需优化）")

    return {
        "score": score,
        "features": features,
        "details": {
            "热点引入率": hot_topic_ratio,
            "痛点共鸣率": pain_point_ratio,
            "稀缺性声明率": scarcity_ratio,
            "开头平均长度": opening_lines_avg_length,
        }
    }


def _analyze_captain_structure(articles: List[Dict[str, str]]) -> Dict[str, Any]:
    """分析船长式内容结构（四段式：介绍→对比→体验→建议）"""
    score = 0
    features = []

    # 检查是否有明确的分段标记
    has_sections = 0
    for article in articles:
        content = article["content"]
        # 检查是否有小标题或分段
        if re.search(r'#{1,2}\s', content) or re.search(r'第[一二三四]', content):
            has_sections += 1

    section_ratio = has_sections / len(articles)
    if section_ratio >= 0.8:
        score += 30
        features.append(f"分段清晰率：{section_ratio:.0%}（优秀）")
    elif section_ratio >= 0.5:
        score += 20
        features.append(f"分段清晰率：{section_ratio:.0%}（良好）")
    else:
        score += 10
        features.append(f"分段清晰率：{section_ratio:.0%}（需加强）")

    # 检查是否有对比内容
    comparison_keywords = ["对比", "测试", "测评", "比较", "不比", "媲美"]
    has_comparison = 0
    for article in articles:
        if any(keyword in article["content"] for keyword in comparison_keywords):
            has_comparison += 1

    comparison_ratio = has_comparison / len(articles)
    if comparison_ratio >= 0.5:
        score += 30
        features.append(f"对比内容率：{comparison_ratio:.0%}（优秀）")
    elif comparison_ratio >= 0.3:
        score += 20
        features.append(f"对比内容率：{comparison_ratio:.0%}（良好）")
    else:
        score += 5
        features.append(f"对比内容率：{comparison_ratio:.0%}（需加强）")

    # 检查是否有实用建议
    advice_keywords = ["建议", "推荐", "技巧", "方法", "步骤", "教程"]
    has_advice = 0
    for article in articles:
        if any(keyword in article["content"] for keyword in advice_keywords):
            has_advice += 1

    advice_ratio = has_advice / len(articles)
    if advice_ratio >= 0.7:
        score += 40
        features.append(f"实用建议率：{advice_ratio:.0%}（优秀）")
    elif advice_ratio >= 0.4:
        score += 25
        features.append(f"实用建议率：{advice_ratio:.0%}（良好）")
    else:
        score += 10
        features.append(f"实用建议率：{advice_ratio:.0%}（需加强）")

    return {
        "score": score,
        "features": features,
        "details": {
            "分段清晰率": section_ratio,
            "对比内容率": comparison_ratio,
            "实用建议率": advice_ratio,
        }
    }


def _analyze_captain_data_support(articles: List[Dict[str, str]]) -> Dict[str, Any]:
    """分析数据支撑（案例密度、数据引用）"""
    score = 0
    features = []

    # 检查案例密度
    case_keywords = ["案例", "示例", "比如", "例如", "演示", "实测"]
    total_cases = 0
    for article in articles:
        case_count = sum(article["content"].count(keyword) for keyword in case_keywords)
        total_cases += case_count

    avg_cases_per_article = total_cases / len(articles)
    if avg_cases_per_article >= 5:
        score += 50
        features.append(f"平均案例数：{avg_cases_per_article:.1f}个/篇（优秀）")
    elif avg_cases_per_article >= 3:
        score += 35
        features.append(f"平均案例数：{avg_cases_per_article:.1f}个/篇（良好）")
    else:
        score += 15
        features.append(f"平均案例数：{avg_cases_per_article:.1f}个/篇（需加强）")

    # 检查数据引用
    data_keywords = ["%", "倍", "万", "千", "倍数", "增长", "提升"]
    has_data = 0
    for article in articles:
        if any(keyword in article["content"] for keyword in data_keywords):
            has_data += 1

    data_ratio = has_data / len(articles)
    if data_ratio >= 0.6:
        score += 50
        features.append(f"数据引用率：{data_ratio:.0%}（优秀）")
    elif data_ratio >= 0.3:
        score += 30
        features.append(f"数据引用率：{data_ratio:.0%}（良好）")
    else:
        score += 10
        features.append(f"数据引用率：{data_ratio:.0%}（需加强）")

    return {
        "score": score,
        "features": features,
        "details": {
            "平均案例数": avg_cases_per_article,
            "数据引用率": data_ratio,
        }
    }


def _analyze_captain_language(articles: List[Dict[str, str]]) -> Dict[str, Any]:
    """分析语言风格（真诚+接地气+适度情绪词）"""
    score = 0
    features = []

    # 检查真诚度（个人经历分享）
    personal_keywords = ["我", "我的", "亲身", "实测", "经验", "分享"]
    has_personal = 0
    for article in articles:
        if any(keyword in article["content"] for keyword in personal_keywords):
            has_personal += 1

    personal_ratio = has_personal / len(articles)
    if personal_ratio >= 0.7:
        score += 35
        features.append(f"个人经历分享率：{personal_ratio:.0%}（优秀）")
    elif personal_ratio >= 0.4:
        score += 25
        features.append(f"个人经历分享率：{personal_ratio:.0%}（良好）")
    else:
        score += 10
        features.append(f"个人经历分享率：{personal_ratio:.0%}（需加强）")

    # 检查接地气（口语化表达）
    colloquial_keywords = ["吧", "呢", "哦", "啊", "嘛", "哈"]
    total_colloquial = 0
    for article in articles:
        colloquial_count = sum(article["content"].count(keyword) for keyword in colloquial_keywords)
        total_colloquial += colloquial_count

    avg_colloquial_per_article = total_colloquial / len(articles)
    if avg_colloquial_per_article >= 10 and avg_colloquial_per_article <= 30:
        score += 35
        features.append(f"口语化表达：{avg_colloquial_per_article:.1f}次/篇（适中）")
    elif avg_colloquial_per_article >= 5:
        score += 20
        features.append(f"口语化表达：{avg_colloquial_per_article:.1f}次/篇（良好）")
    else:
        score += 10
        features.append(f"口语化表达：{avg_colloquial_per_article:.1f}次/篇（需优化）")

    # 检查适度情绪词
    emotion_keywords = ["激动", "惊喜", "震撼", "太棒了", "干货", "炸裂"]
    has_emotion = 0
    for article in articles:
        if any(keyword in article["content"] for keyword in emotion_keywords):
            has_emotion += 1

    emotion_ratio = has_emotion / len(articles)
    if emotion_ratio >= 0.3 and emotion_ratio <= 0.6:
        score += 30
        features.append(f"情绪词使用率：{emotion_ratio:.0%}（适中）")
    elif emotion_ratio >= 0.1:
        score += 20
        features.append(f"情绪词使用率：{emotion_ratio:.0%}（良好）")
    else:
        score += 10
        features.append(f"情绪词使用率：{emotion_ratio:.0%}（需加强）")

    return {
        "score": score,
        "features": features,
        "details": {
            "个人经历分享率": personal_ratio,
            "口语化表达": avg_colloquial_per_article,
            "情绪词使用率": emotion_ratio,
        }
    }


def _analyze_captain_ending(articles: List[Dict[str, str]]) -> Dict[str, Any]:
    """分析结尾设计（互动引导+私域转化）"""
    score = 0
    features = []

    # 检查互动引导
    interaction_keywords = ["留言", "评论", "私信", "打赏", "关注"]
    has_interaction = 0
    for article in articles:
        # 检查文章结尾（最后200字）
        ending = article["content"][-200:]
        if any(keyword in ending for keyword in interaction_keywords):
            has_interaction += 1

    interaction_ratio = has_interaction / len(articles)
    if interaction_ratio >= 0.8:
        score += 50
        features.append(f"互动引导率：{interaction_ratio:.0%}（优秀）")
    elif interaction_ratio >= 0.5:
        score += 35
        features.append(f"互动引导率：{interaction_ratio:.0%}（良好）")
    else:
        score += 15
        features.append(f"互动引导率：{interaction_ratio:.0%}（需加强）")

    # 检查紧迫感强化
    urgency_keywords = ["赶紧", "立即", "马上", "手慢无", "别错过", "转发"]
    has_urgency = 0
    for article in articles:
        ending = article["content"][-200:]
        if any(keyword in ending for keyword in urgency_keywords):
            has_urgency += 1

    urgency_ratio = has_urgency / len(articles)
    if urgency_ratio >= 0.6:
        score += 50
        features.append(f"紧迫感强化率：{urgency_ratio:.0%}（优秀）")
    elif urgency_ratio >= 0.3:
        score += 30
        features.append(f"紧迫感强化率：{urgency_ratio:.0%}（良好）")
    else:
        score += 10
        features.append(f"紧迫感强化率：{urgency_ratio:.0%}（需加强）")

    return {
        "score": score,
        "features": features,
        "details": {
            "互动引导率": interaction_ratio,
            "紧迫感强化率": urgency_ratio,
        }
    }


def _generate_captain_suggestions(dimensions: Dict[str, Any]) -> List[str]:
    """生成船长式风格优化建议"""
    suggestions = []

    # 开头策略建议
    opening = dimensions["开头策略"]
    if opening["score"] < 80:
        if opening["details"]["热点引入率"] < 0.5:
            suggestions.append("开头策略：建议增加热点工具引入（Sora2、Midjourney等）")
        if opening["details"]["稀缺性声明率"] < 0.3:
            suggestions.append("开头策略：建议增加稀缺性声明（免费、无限、首发）")

    # 内容结构建议
    structure = dimensions["内容结构"]
    if structure["score"] < 80:
        if structure["details"]["分段清晰率"] < 0.5:
            suggestions.append("内容结构：建议使用小标题分段，四段式结构（介绍→对比→体验→建议）")
        if structure["details"]["对比内容率"] < 0.3:
            suggestions.append("内容结构：建议增加竞品对比内容（不比XX差、媲美XX）")

    # 数据支撑建议
    data_support = dimensions["数据支撑"]
    if data_support["score"] < 80:
        if data_support["details"]["平均案例数"] < 3:
            suggestions.append("数据支撑：建议增加真实案例（实测、演示、示例）")
        if data_support["details"]["数据引用率"] < 0.3:
            suggestions.append("数据支撑：建议增加数据引用（百分比、倍数、增长）")

    # 语言风格建议
    language = dimensions["语言风格"]
    if language["score"] < 80:
        if language["details"]["个人经历分享率"] < 0.4:
            suggestions.append("语言风格：建议增加个人经历分享（我实测、我使用、我的经验）")
        if language["details"]["口语化表达"] < 5:
            suggestions.append("语言风格：建议使用更接地气的口语化表达")

    # 结尾设计建议
    ending = dimensions["结尾设计"]
    if ending["score"] < 80:
        if ending["details"]["互动引导率"] < 0.5:
            suggestions.append("结尾设计：建议增加互动引导（留言、私信、打赏、关注）")
        if ending["details"]["紧迫感强化率"] < 0.3:
            suggestions.append("结尾设计：建议增加紧迫感强化（赶紧、立即、手慢无、转发）")

    return suggestions if suggestions else ["已经达到了船长的风格标准！"]


def generate_captain_style_prompt() -> str:
    """
    生成船长式风格Prompt

    基于船长AI视界的写作风格，生成可复用的风格Prompt

    Returns:
        船长式风格Prompt
    """
    prompt = """# 船长式写作风格指南

## 开篇策略（前200字）

### 1. 热点引入（前3行）
- 必须包含热点工具名：Sora2、Nano Banana Pro、Midjourney、ChatGPT等
- 突出时效性："全网首发"、"刚刚发现"、"最新"

### 2. 痛点共鸣（100字内）
- 描述用户遇到的问题或困惑
- 使用问句或感叹句增强冲击力

### 3. 稀缺性声明（200字内）
- 强调"免费"、"无限"、"首发"
- 制造紧迫感："一两天后可能就不行了"

## 内容结构（四段式）

### 1. 项目/工具介绍
- 真实经历背书："我实测了XX天"
- 获奖或成就展示："帮助了XX人"

### 2. 技术对比
- 横向对比竞品：不比Sora2差、媲美Midjourney
- 数据支撑：提升XX%、XX倍增长

### 3. 深度体验
- 具体使用场景
- 操作步骤演示
- 真实案例展示

### 4. 实用建议
- 选型指南
- 使用技巧
- 未来展望

## 语言风格

### 1. 真诚分享
- 多用第一人称："我"、"我的"、"亲身"
- 分享真实经历："我实测"、"我使用"

### 2. 接地气
- 适度口语化：吧、呢、哦、啊、嘛
- 避免专业术语堆砌

### 3. 适度情绪词
- "激动"、"惊喜"、"震撼"、"太棒了"
- "干货"、"炸裂"、"绝了"

### 4. 人设词
- 统一自称："船长"、"船员"
- "手把手教你"、"完整干货"

## 结尾设计（最后200字）

### 1. 互动引导
- "有不懂的可以留言"
- "其他船员也会回复"
- "欢迎私信交流"

### 2. 私域转化
- "评论区我会放地址"
- "私信我，获取秘籍"
- "打赏支持，持续输出"

### 3. 紧迫感强化
- "赶紧用"
- "手慢无"
- "转发给需要的人"

## 数据支撑要求

- **案例密度**：每篇至少3-5个真实案例
- **数据引用**：使用百分比、倍数、增长等数据
- **对比测试**：与竞品进行对比测试

## 排版要求

- 使用小标题分段
- 每段不超过5行
- 关键信息加粗
- 配合截图展示

## 注意事项

1. **避免过度夸张**：真实比夸张更有说服力
2. **保持一致性**：每次都使用相同的自称
3. **持续互动**：回复每一条留言
4. **价值为王**：内容必须真正有用

---

*基于船长AI视界100篇文章分析生成*
*适用于AI工具测评类内容创作*
"""

    return prompt


def evaluate_captain_similarity(articles_text: str, captain_articles_text: str = None) -> Dict[str, Any]:
    """
    评估文章与船长风格的相似度

    Args:
        articles_text: 待评估的文章文本
        captain_articles_text: 船长的文章文本（可选，如不提供则使用标准模板）

    Returns:
        相似度评估结果
    """
    # 分析待评估文章
    user_analysis = analyze_captain_style(articles_text)

    # 标准船长风格基准分
    standard_scores = {
        "开头策略": 80,
        "内容结构": 80,
        "数据支撑": 80,
        "语言风格": 80,
        "结尾设计": 80,
    }

    # 计算相似度
    similarities = {}
    for dimension in standard_scores.keys():
        user_score = user_analysis["dimensions"][dimension]["score"]
        standard_score = standard_scores[dimension]
        similarity = min(user_score / standard_score, 1.0)
        similarities[dimension] = round(similarity * 100, 2)

    # 计算总体相似度
    overall_similarity = sum(similarities.values()) / len(similarities)

    # 判断等级
    if overall_similarity >= 80:
        grade = "高度相似（船长级别）"
        advice = "您的写作风格已经非常接近船长！"
    elif overall_similarity >= 60:
        grade = "中度相似"
        advice = "您的写作风格有船长影子，继续优化！"
    elif overall_similarity >= 40:
        grade = "轻度相似"
        advice = "您的写作风格与船长有一定差异，建议参考船长模板"
    else:
        grade = "不相似"
        advice = "您的写作风格与船长差异较大，建议学习船长模板"

    return {
        "status": "success",
        "overall_similarity": round(overall_similarity, 2),
        "grade": grade,
        "advice": advice,
        "dimension_similarities": similarities,
        "user_score": user_analysis["captain_score"],
        "suggestions": user_analysis["suggestions"]
    }


def handler(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    主处理函数

    Args:
        args: 包含以下字段的字典
            - action: 操作类型（analyze_style/generate_style_prompt/generate_title/polish_content/create_article）
            - articles: 文章文本（analyze_style时必需）
            - style_file: 风格分析文件路径（其他操作时必需）
            - topic: 主题（generate_title时必需）
            - limit: 生成数量（可选，默认10）
            - output_file: 输出文件路径（可选）
            - content: 要润色的内容（polish_content时必需）
            - outline: 文章大纲（create_article时必需）

    Returns:
        处理结果
    """
    action = args.get("action", "")

    if action == "analyze_style":
        articles = args.get("articles", "")
        output_file = args.get("output_file", "style_analysis.json")

        if not articles:
            return {
                "status": "error",
                "message": "文章内容不能为空"
            }

        # 分析风格
        result = analyze_style(articles)

        # 保存结果
        if output_file:
            save_to_file(result, output_file)

        return result

    elif action == "generate_style_prompt":
        style_file = args.get("style_file", "")
        output_file = args.get("output_file", "style_prompt.md")

        if not style_file:
            return {
                "status": "error",
                "message": "风格分析文件路径不能为空"
            }

        # 读取风格分析
        try:
            with open(style_file, 'r', encoding='utf-8') as f:
                style_analysis = json.load(f)
        except Exception as e:
            return {
                "status": "error",
                "message": f"读取风格分析文件失败: {e}"
            }

        # 生成Prompt
        prompt = generate_style_prompt(style_analysis)

        # 保存结果
        if output_file:
            save_to_file(prompt, output_file)

        return {
            "status": "success",
            "prompt": prompt,
            "output_file": output_file
        }

    elif action == "generate_title":
        style_file = args.get("style_file", "")
        topic = args.get("topic", "")
        limit = args.get("limit", 10)

        if not style_file:
            return {
                "status": "error",
                "message": "风格分析文件路径不能为空"
            }

        if not topic:
            return {
                "status": "error",
                "message": "主题不能为空"
            }

        # 读取风格分析
        try:
            with open(style_file, 'r', encoding='utf-8') as f:
                style_analysis = json.load(f)
        except Exception as e:
            return {
                "status": "error",
                "message": f"读取风格分析文件失败: {e}"
            }

        # 生成标题
        titles = generate_titles(style_analysis, topic, limit)

        return {
            "status": "success",
            "topic": topic,
            "titles": titles
        }

    elif action == "polish_content":
        # TODO: 实现内容润色功能
        return {
            "status": "error",
            "message": "内容润色功能待实现"
        }

    elif action == "create_article":
        # TODO: 实现文章创作功能
        return {
            "status": "error",
            "message": "文章创作功能待实现"
        }

    # ===== 船长式风格分析（2026-01-15新增） =====
    elif action == "analyze_captain_style":
        # 分析船长式写作风格
        articles = args.get("articles", "")
        output_file = args.get("output_file", "captain_style_analysis.json")

        if not articles:
            return {
                "status": "error",
                "message": "文章内容不能为空"
            }

        # 分析船长风格
        result = analyze_captain_style(articles)

        # 保存结果
        if output_file:
            save_to_file(result, output_file)

        return result

    elif action == "generate_captain_style_prompt":
        # 生成船长式风格Prompt
        output_file = args.get("output_file", "captain_style_prompt.md")

        # 生成Prompt
        prompt = generate_captain_style_prompt()

        # 保存结果
        if output_file:
            save_to_file(prompt, output_file)

        return {
            "status": "success",
            "prompt": prompt,
            "output_file": output_file,
            "message": "船长式风格Prompt已生成"
        }

    elif action == "evaluate_captain_similarity":
        # 评估与船长风格的相似度
        articles = args.get("articles", "")

        if not articles:
            return {
                "status": "error",
                "message": "文章内容不能为空"
            }

        # 评估相似度
        result = evaluate_captain_similarity(articles)

        return result

    else:
        return {
            "status": "error",
            "message": f"不支持的操作类型: {action}"
        }



