"""
风格提示词构建器
根据风格模板、场景类型和内容自动生成公众号图片提示词
"""

from typing import Dict, List, Optional
from enum import Enum


class Style(Enum):
    """风格枚举"""
    TECH = "tech"
    FRESH = "fresh"
    MINIMAL = "minimal"
    WARM = "warm"
    BUSINESS = "business"
    ELEGANT = "elegant"
    BOLD = "bold"
    PLAYFUL = "playful"
    NATURE = "nature"
    SKETCH = "sketch"
    NOTION = "notion"
    AUTO = "auto"


class SceneType(Enum):
    """场景类型枚举"""
    COVER = "cover"  # 封面，2.35:1
    ILLUSTRATION = "illustration"  # 配图，16:9


class StylePromptBuilder:
    """风格提示词构建器"""

    # 风格配置
    STYLE_CONFIGS = {
        "tech": {
            "name": "专业科技",
            "cover_ratio": "2.35:1 (900×383)",
            "illustration_ratio": "16:9 (1792×1024)",
            "background": "从深蓝色(#1E3A8A)到紫色(#7C3AED)的水平渐变",
            "text_color": "白色(#FFFFFF)",
            "secondary_text": "浅蓝白色(#E0E7FF)",
            "accent_color": "亮蓝色(#60A5FA)",
            "font": "现代无衬线，科技感",
            "decorations": ["电路板纹路", "代码符号 </> { }", "AI芯片图标", "光点"],
            "transparency": "30%",
            "keywords": ["技术", "AI", "代码", "编程", "架构", "算法", "数据", "开发", "系统", "平台", "工具", "GLM", "GPT", "深度学习", "机器学习", "API"],
            "vibe": "扁平化设计，现代科技风",
            "suitable_for": "技术文章、AI主题、编程教程、架构分析、数据报告"
        },
        "fresh": {
            "name": "清新活泼",
            "cover_ratio": "2.35:1 (900×383)",
            "illustration_ratio": "16:9 (1792×1024)",
            "background": "从薄荷绿(#A7F3D0)到暖黄(#FCD34D)的对角柔和渐变",
            "text_color": "深绿色(#065F46)",
            "secondary_text": "更深的绿色(#064E3B)",
            "accent_color": "橙色(#F59E0B)",
            "font": "圆润无衬线，年轻感",
            "decorations": ["小圆点", "叶子图案", "波浪线", "emoji 💻✨🌱"],
            "transparency": "50%",
            "keywords": ["生活", "日常", "分享", "成长", "学习", "笔记", "技巧", "经验", "入门", "轻科普", "新手"],
            "vibe": "清新、精致、有设计感，适合年轻人审美",
            "suitable_for": "生活分享、成长记录、轻科普、日常感悟、学习笔记"
        },
        "minimal": {
            "name": "简约极简",
            "cover_ratio": "2.35:1 (900×383)",
            "illustration_ratio": "16:9 (1792×1024)",
            "background": "浅灰白色(#F9FAFB)，纯净简洁",
            "text_color": "深灰色(#1F2937)",
            "secondary_text": "中灰色(#374151)",
            "accent_color": "蓝色(#3B82F6) - 少量使用",
            "font": "简洁无衬线，极简主义",
            "decorations": ["极少", "可能有简单细线条"],
            "transparency": "N/A",
            "keywords": ["极简", "哲学", "思考", "观点", "理论", "抽象", "本质", "深度", "探讨", "分析"],
            "vibe": "极简主义，大量留白，专注于内容本身",
            "suitable_for": "哲学思考、深度观点、极简主义、高端内容"
        },
        "warm": {
            "name": "温暖治愈",
            "cover_ratio": "2.35:1 (900×383)",
            "illustration_ratio": "16:9 (1792×1024)",
            "background": "从暖黄(#FDE68A)到粉红(#FCA5A5)的柔和渐变",
            "text_color": "深棕色(#92400E)",
            "secondary_text": "更深的棕色(#78350F)",
            "accent_color": "橙色(#F59E0B)",
            "font": "手写感或圆润字体",
            "decorations": ["心形图案", "星星", "柔和光晕", "emoji 💖✨🌟"],
            "transparency": "60%",
            "keywords": ["情感", "感悟", "心情", "治愈", "温暖", "故事", "陪伴", "成长记录", "人生", "随笔"],
            "vibe": "温暖亲切，视觉柔和，情感化表达",
            "suitable_for": "情感类文章、成长感悟、心理疗愈、人生故事"
        },
        "business": {
            "name": "商务专业",
            "cover_ratio": "2.35:1 (900×383)",
            "illustration_ratio": "16:9 (1792×1024)",
            "background": "深蓝色(#1E40AF)或深灰色(#1F2937)，纯色背景",
            "text_color": "白色(#FFFFFF)",
            "secondary_text": "浅灰白色(#F9FAFB)",
            "accent_color": "蓝色(#3B82F6)",
            "font": "专业无衬线（如思源黑体），商务感",
            "decorations": ["规整的几何图形", "专业的图表元素", "数据可视化图形"],
            "transparency": "N/A",
            "keywords": ["商业", "市场", "数据报告", "分析", "行业", "趋势", "投资", "财报", "解读", "研究", "洞察"],
            "vibe": "专业严谨，结构化强，信息密度高",
            "suitable_for": "商业分析、数据报告、市场研究、专业解读"
        },
        "elegant": {
            "name": "优雅精致",
            "cover_ratio": "2.35:1 (900×383)",
            "illustration_ratio": "16:9 (1792×1024)",
            "background": "Warm cream #F5F0E6",
            "text_color": "深棕色 #78350F",
            "secondary_text": "柔和的深棕色 #92400E",
            "accent_color": "珊瑚色 #E8A598",
            "font": "优雅的衬线字体，精致感",
            "decorations": ["精致的线条", "subtle icons", "柔和的花纹", "极简装饰"],
            "transparency": "40%",
            "keywords": ["专业", "商业", "策略", "领导力", "管理", "优雅", "精致", "高端", "品牌", "营销", "专业服务"],
            "vibe": "refined, sophisticated, delicate lines, subtle icons",
            "suitable_for": "商业分析、领导力内容、专业服务、品牌营销"
        },
        "bold": {
            "name": "高对比冲击",
            "cover_ratio": "2.35:1 (900×383)",
            "illustration_ratio": "16:9 (1792×1024)",
            "background": "Deep black #000000",
            "text_color": "Vibrant red #E53E3E 或 Electric yellow #F6E05E",
            "secondary_text": "白色 #FFFFFF",
            "accent_color": "鲜艳红/橙 #F59E0B",
            "font": "粗体无衬线，强烈冲击",
            "decorations": ["strong shapes", "几何图形", "高对比元素", "箭头"],
            "transparency": "N/A",
            "keywords": ["警告", "紧急", "重要", "critical", "urgent", "bold", "观点", "强烈", "冲击", "强调"],
            "vibe": "strong shapes, dramatic contrast, dynamic",
            "suitable_for": "观点文章、重要提醒、警告内容、强烈观点"
        },
        "playful": {
            "name": "活泼趣味",
            "cover_ratio": "2.35:1 (900×383)",
            "illustration_ratio": "16:9 (1792×1024)",
            "background": "Light cream #FFFBEB",
            "text_color": "深灰色 #374151",
            "secondary_text": "中灰色 #4B5563",
            "accent_color": "薄荷绿 #A7F3D0",
            "font": "圆润无衬线，年轻可爱",
            "decorations": ["doodles", "quirky characters", "speech bubbles", "emoji", "小圆点"],
            "transparency": "50%",
            "keywords": ["趣味", "fun", "easy", "beginner", "tutorial", "guide", "轻松", "入门", "教程", "指南", "新手"],
            "vibe": "doodles, quirky characters, speech bubbles, friendly",
            "suitable_for": "教程指南、轻松内容、入门教程、趣味文章"
        },
        "nature": {
            "name": "自然有机",
            "cover_ratio": "2.35:1 (900×383)",
            "illustration_ratio": "16:9 (1792×1024)",
            "background": "Sand beige #F5E6D3",
            "text_color": "Forest green #064E3B",
            "secondary_text": "Earth brown #78350F",
            "accent_color": "有机绿 #059669",
            "font": "自然的无衬线字体",
            "decorations": ["plant motifs", "natural textures", "flowing lines", "叶子", "有机形状"],
            "transparency": "40%",
            "keywords": ["环保", "wellness", "健康", "organic", "自然", "eco", "可持续", "绿色", "健康生活", "有机", "环境"],
            "vibe": "plant motifs, natural textures, flowing lines, organic",
            "suitable_for": "环保健康、自然主题、可持续发展、健康生活"
        },
        "sketch": {
            "name": "手绘草图",
            "cover_ratio": "2.35:1 (900×383)",
            "illustration_ratio": "16:9 (1792×1024)",
            "background": "Off-white #F7FAFC",
            "text_color": "Pencil gray #4A5568",
            "secondary_text": "深灰色 #1F2937",
            "accent_color": "铅笔灰 #6B7280",
            "font": "手写感字体，类似铅笔书写",
            "decorations": ["rough sketch lines", "arrows", "handwritten labels", "草图", "手绘箭头", "涂鸦"],
            "transparency": "N/A",
            "keywords": ["idea", "draft", "brainstorm", "草图", "创意", "头脑风暴", "想法", "草稿", "概念", "设计思维"],
            "vibe": "rough sketch lines, arrows, handwritten labels, authentic",
            "suitable_for": "头脑风暴、创意过程、概念设计、思维过程"
        },
        "notion": {
            "name": "Notion 极简线条",
            "cover_ratio": "2.35:1 (900×383)",
            "illustration_ratio": "16:9 (1792×1024)",
            "background": "Pure white #FFFFFF",
            "text_color": "Black #1A1A1A",
            "secondary_text": "Dark gray #4A4A4A",
            "accent_color": "深灰色 #1F2937",
            "font": "简洁无衬线，类似 Notion",
            "decorations": ["simple line doodles", "geometric shapes", "maximum whitespace", "极简线条"],
            "transparency": "N/A",
            "keywords": ["knowledge", "concept", "productivity", "SaaS", "知识", "概念", "生产力", "工具", "笔记", "知识管理"],
            "vibe": "simple line doodles, geometric shapes, maximum whitespace, clean",
            "suitable_for": "知识分享、概念解释、生产力工具、知识管理"
        }
    }

    # 模板片段
    XIAOHONGSHU_REQUIREMENTS = """
【小红书风格要求】
- 文字清晰可读，重要信息突出显示
- 排版美观，留白合理
- 高对比度配色，确保可读性
"""

    XIAOHONGSHU_REQUIREMENTS_WITH_EMOJI = """
【小红书风格要求】
- 文字清晰可读，重要信息突出显示
- 排版美观，留白合理
- 支持 emoji 和符号
- 配色温暖或清新
"""

    WECHAT_COVER_REQUIREMENTS = """
【公众号特殊要求】
- 所有关键元素放在画面中心区域
- 文字和图标距离边缘至少15%的安全距离
- 确保裁剪为正方形后核心内容依然完整
- 避免在左右两侧放置重要文字
"""

    def __init__(self):
        """初始化构建器"""
        pass

    def build_prompt(
        self,
        title: str,
        style: str = "tech",
        scene_type: str = "cover",
        subtitle: str = "",
        content: str = "",
        **kwargs
    ) -> str:
        """
        构建风格化提示词

        Args:
            title: 文章标题
            style: 风格 (tech/fresh/minimal/warm/business)
            scene_type: 场景类型 (cover/illustration)
            subtitle: 副标题
            content: 详细内容（用于配图）
            **kwargs: 其他参数

        Returns:
            完整的提示词字符串
        """
        # 验证风格
        if style not in self.STYLE_CONFIGS:
            raise ValueError(f"不支持的风格: {style}。支持的风格: {list(self.STYLE_CONFIGS.keys())}")

        # 获取风格配置
        style_config = self.STYLE_CONFIGS[style]

        # 根据场景类型构建提示词
        if scene_type == "cover":
            return self._build_cover_prompt(title, subtitle, style_config)
        elif scene_type == "illustration":
            return self._build_illustration_prompt(title, content, style_config)
        else:
            raise ValueError(f"不支持的场景类型: {scene_type}")

    def _build_cover_prompt(self, title: str, subtitle: str, style_config: Dict) -> str:
        """构建封面提示词"""
        style_name = style_config["name"]
        ratio = style_config["cover_ratio"]
        background = style_config["background"]
        text_color = style_config["text_color"]
        secondary_text = style_config.get("secondary_text", text_color)
        font = style_config["font"]
        decorations = style_config["decorations"]
        transparency = style_config.get("transparency", "")
        vibe = style_config["vibe"]

        # 选择小红书要求模板
        if style_name in ["清新活泼", "温暖治愈"]:
            xhs_requirements = self.XIAOHONGSHU_REQUIREMENTS_WITH_EMOJI
        else:
            xhs_requirements = self.XIAOHONGSHU_REQUIREMENTS

        # 构建装饰元素描述
        decorations_str = f"  - {', '.join(decorations[:3])}"
        if transparency != "N/A":
            decorations_str += f"\n  - 透明度：{transparency}"

        # 构建提示词
        prompt = f"""微信公众号封面图，主题：{title}
横版布局，{ratio}

{xhs_requirements.strip()}
{self.WECHAT_COVER_REQUIREMENTS.strip()}

【{style_name}风格样式】
背景：{background}
文字颜色：{text_color}
装饰元素：{decorations_str}
字体：{font}

【中心内容布局】
主标题：{title}
  - 字号最大，位于正中央
  - {text_color}文字，醒目清晰
"""

        # 添加副标题
        if subtitle:
            prompt += f"""
副标题：{subtitle}
  - 位于主标题下方
  - 字号较小，{secondary_text}
"""

        # 添加核心图标建议
        prompt += f"""
核心图标：
  - 与主题相关的图标（中心）
  - 与文字形成平衡构图

【整体风格】
- {vibe}
- 清晰易读，有视觉冲击力
- 关键内容集中中央
"""

        if style_name != "简约极简":
            prompt += "- 边缘装饰元素，可被裁剪\n"

        prompt += f"""
【技术规格】
- 比例：{ratio}
- 高清画质
- 确保裁剪为1:1后标题完整
"""

        return prompt.strip()

    def _build_illustration_prompt(self, title: str, content: str, style_config: Dict) -> str:
        """构建配图提示词"""
        style_name = style_config["name"]
        ratio = style_config["illustration_ratio"]
        background = style_config["background"]
        text_color = style_config["text_color"]
        vibe = style_config["vibe"]

        # 选择小红书要求模板
        if style_name in ["清新活泼", "温暖治愈"]:
            xhs_requirements = self.XIAOHONGSHU_REQUIREMENTS_WITH_EMOJI
        else:
            xhs_requirements = self.XIAOHONGSHU_REQUIREMENTS

        # 构建提示词
        prompt = f"""文章配图，主题：{title}
比例：{ratio}

{xhs_requirements.strip()}

【{style_name}风格样式】
背景：{background}
文字颜色：{text_color}
"""

        # 根据风格添加特定说明
        if style_name == "专业科技":
            prompt += """配色方案：
  - 主色：深蓝色(#1E3A8A)
  - 辅助色：紫色(#7C3AED)
  - 强调色：亮蓝色(#60A5FA)
  - 成功色：绿色(#10B981)
  - 警告色：黄色(#FBBF24)
装饰元素：箭头、图标、网格线

【内容布局】
{content}

【整体风格】
- 使用扁平化图标设计
- 现代科技风格
- 箭头连接各步骤，表示流程
- 信息层次分明
- 清晰的视觉引导
"""
        elif style_name == "清新活泼":
            prompt += """配色方案：
  - 主色：薄荷绿(#A7F3D0)
  - 辅助色：暖黄色(#FCD34D)
  - 强调色：橙色(#F59E0B)
装饰元素：小圆点、叶子、emoji

【内容布局】
{content}

每个列表项：
- 清晰的视觉分隔
- emoji 或小图标辅助
- 留白充足

【整体风格】
- 清新、精致、有设计感
- 适合年轻人审美
- 配色和谐，视觉吸引力强
- 扁平化插画风格
"""
        elif style_name == "简约极简":
            prompt += """【内容布局】
{content}

【整体风格】
- 极简主义
- 大量留白
- 专注内容
- 高级感
"""
        elif style_name == "温暖治愈":
            prompt += """配色方案：
  - 卡片1：暖黄色调(#FDE68A)
  - 卡片2：粉红色调(#FCA5A5)
  - 卡片3：暖橙色调(#FB923C)
装饰元素：心形、星星、光晕

【内容布局】
{content}

每个卡片：
- 圆角矩形设计
- 温暖的渐变背景
- 图标在上
- 标题居中
- 内容在下方

【整体风格】
- 温暖亲切
- 视觉柔和
- 情感化表达
- 扁平化插画风格
"""
        elif style_name == "商务专业":
            prompt += """配色方案：
  - 主色：深蓝色(#1E40AF)
  - 辅助色：深灰色(#1F2937)
  - 强调色：蓝色(#3B82F6)
装饰元素：图表、数据可视化元素

【内容布局】
{content}

【整体风格】
- 专业严谨
- 结构化强
- 信息密度高
- 商务数据可视化风格
"""

        prompt += f"""
【技术规格】
- 比例：{ratio}
- 高清画质
- 横版布局
- 适合作为文章配图
"""

        return prompt.strip()

    def auto_match_style(self, content: str) -> str:
        """
        基于内容关键词自动匹配风格

        Args:
            content: 文章内容或标题

        Returns:
            匹配的风格代码 (tech/fresh/minimal/warm/business/elegant/bold/playful/nature/sketch/notion)
        """
        scores = {}

        # 计算每种风格的得分
        for style, config in self.STYLE_CONFIGS.items():
            keywords = config["keywords"]
            score = sum(1 for kw in keywords if kw in content)
            scores[style] = score

        # 找出得分最高的风格
        max_score = max(scores.values())

        # 如果有匹配的关键词，返回最高分的风格
        if max_score > 0:
            return max(scores, key=scores.get)

        # 如果没有匹配，根据内容长度默认选择
        if len(content) < 20:
            return "notion"  # 短标题使用 Notion 极简风（新默认）
        else:
            return "notion"  # 默认使用 Notion 极简风

    def get_style_info(self, style: str) -> Dict:
        """
        获取风格信息

        Args:
            style: 风格代码

        Returns:
            风格配置字典
        """
        return self.STYLE_CONFIGS.get(style, {})

    def list_styles(self) -> List[Dict]:
        """
        列出所有可用风格

        Returns:
            风格列表
        """
        return [
            {
                "code": style,
                "name": config["name"],
                "suitable_for": config["suitable_for"]
            }
            for style, config in self.STYLE_CONFIGS.items()
        ]


# 便捷函数
def build_prompt(
    title: str,
    style: str = "tech",
    scene_type: str = "cover",
    **kwargs
) -> str:
    """
    便捷函数：构建风格化提示词

    Args:
        title: 文章标题
        style: 风格 (tech/fresh/minimal/warm/business/auto)
        scene_type: 场景类型 (cover/illustration)
        **kwargs: 其他参数

    Returns:
        完整的提示词字符串

    Examples:
        >>> # 构建专业科技风格封面提示词
        >>> prompt = build_prompt("智谱上市579亿", style="tech", scene_type="cover")

        >>> # 自动匹配风格并构建封面提示词
        >>> prompt = build_prompt("我的学习笔记", style="auto", scene_type="cover")

        >>> # 构建清新活泼风格配图提示词
        >>> prompt = build_prompt("6个AI技巧", style="fresh", scene_type="illustration", content="...")
    """
    builder = StylePromptBuilder()

    # 如果是 auto，自动匹配风格
    if style == "auto":
        style = builder.auto_match_style(title)

    return builder.build_prompt(title, style, scene_type, **kwargs)


def auto_match_style(content: str) -> str:
    """
    便捷函数：自动匹配风格

    Args:
        content: 文章内容或标题

    Returns:
        匹配的风格代码
    """
    builder = StylePromptBuilder()
    return builder.auto_match_style(content)


def build_simple_cover_prompt(title: str, style: str, subtitle: str = "") -> str:
    """
    极简封面提示词 - 只保留核心要求

    关键原则：
    1. 不描述任何装饰元素
    2. 只强调文字居中和可读性
    3. 明确要求大边距

    Args:
        title: 文章标题
        style: 风格代码
        subtitle: 副标题（可选）

    Returns:
        简化的英文提示词
    """

    # 基础样式配置（只有颜色，没有装饰）
    style_configs = {
        "tech": {
            "bg": "dark blue to purple gradient",
            "text": "white"
        },
        "fresh": {
            "bg": "light green to yellow gradient",
            "text": "dark green"
        },
        "minimal": {
            "bg": "white to light gray gradient",
            "text": "black"
        },
        "warm": {
            "bg": "orange to pink gradient",
            "text": "white"
        },
        "business": {
            "bg": "navy blue to gray gradient",
            "text": "white"
        }
    }

    config = style_configs.get(style, style_configs["tech"])

    # Build subtitle part separately
    subtitle_part = ""
    if subtitle:
        subtitle_part = f"Subtitle: {subtitle}\n- Smaller text, centered below main title\n- Color: {config['text']}\n\n"

    prompt = f"""WeChat official account cover image.

Main title: {title}
- Large, bold text
- HORIZONTALLY AND VERTICALLY CENTERED
- Each line MAXIMUM 10 Chinese characters
- Break into multiple lines if text is long
- Line spacing: comfortable, not cramped
- Color: {config['text']}

{subtitle_part}Background:
- {config['bg']}
- Simple and clean
- NO patterns, NO symbols, NO decorations

CRITICAL LAYOUT RULES:
1. ALL text must be in the exact CENTER of the image
2. Leave at least 30% empty space on ALL sides (top, bottom, left, right)
3. Do NOT place anything near the edges
4. Keep the background simple - no decorative elements
5. Each line MAXIMUM 10 characters for 1:1 crop compatibility

The final image will be cropped from the center.
Ensure all text remains fully visible in both 2.35:1 and 1:1 formats."""

    return prompt


# 主程序示例
if __name__ == "__main__":
    # 示例1：构建专业科技风格封面提示词
    print("=" * 80)
    print("示例1：专业科技风格封面")
    print("=" * 80)
    prompt1 = build_prompt(
        title="智谱上市579亿",
        subtitle="GLM-4.7实测",
        style="tech",
        scene_type="cover"
    )
    print(prompt1)
    print()

    # 示例2：自动匹配风格
    print("=" * 80)
    print("示例2：自动匹配风格")
    print("=" * 80)
    test_title = "我的AI学习笔记和成长感悟"
    matched_style = auto_match_style(test_title)
    print(f"标题：{test_title}")
    print(f"匹配风格：{matched_style}")
    print()

    # 示例3：清新活泼风格封面
    print("=" * 80)
    print("示例3：清新活泼风格封面")
    print("=" * 80)
    prompt3 = build_prompt(
        title="6个AI编程技巧",
        subtitle="从DeepSeek到GLM",
        style="fresh",
        scene_type="cover"
    )
    print(prompt3)
    print()

    # 示例4：列出所有风格
    print("=" * 80)
    print("所有可用风格")
    print("=" * 80)
    builder = StylePromptBuilder()
    for style_info in builder.list_styles():
        print(f"{style_info['code']}: {style_info['name']}")
        print(f"  适用场景：{style_info['suitable_for']}")
        print()
