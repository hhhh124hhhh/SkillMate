from typing import Dict, Any, List
import re
import sys

# Fix encoding issues on Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

"""
智能排版工具

基于2025年最新最佳实践的智能排版工具，提供一键自动排版功能

核心功能：
1. 智能识别文章结构
2. 一键自动排版
3. 多种模板样式
4. 字体、颜色、间距优化
5. H标签自动生成
6. 图片位置建议
7. 排版效果预览
"""

# 排版模板
LAYOUT_TEMPLATES = {
    "简约商务": {
        "description": "适合商务、专业、正式场合",
        "primary_color": "#333333",
        "secondary_color": "#666666",
        "background_color": "#FFFFFF",
        "font_size": 16,
        "line_height": 1.75,
        "letter_spacing": 0.5,
        "padding": 32,
        "style": "简洁、专业、商务",
    },
    "清新文艺": {
        "description": "适合文艺、生活、情感类内容",
        "primary_color": "#5D9CEC",
        "secondary_color": "#A0D468",
        "background_color": "#F5F7FA",
        "font_size": 15,
        "line_height": 1.75,
        "letter_spacing": 0.5,
        "padding": 32,
        "style": "清新、文艺、温暖",
    },
    "活力时尚": {
        "description": "适合时尚、娱乐、年轻受众",
        "primary_color": "#FF6B6B",
        "secondary_color": "#FFD93D",
        "background_color": "#FFFFFF",
        "font_size": 16,
        "line_height": 1.5,
        "letter_spacing": 1,
        "padding": 24,
        "style": "活力、时尚、年轻",
    },
    "科技极客": {
        "description": "适合科技、互联网、开发者",
        "primary_color": "#4A90E2",
        "secondary_color": "#50E3C2",
        "background_color": "#F8F9FA",
        "font_size": 15,
        "line_height": 1.75,
        "letter_spacing": 0,
        "padding": 32,
        "style": "科技、专业、简洁",
    },
    "温暖治愈": {
        "description": "适合治愈、情感、生活类",
        "primary_color": "#FF9F43",
        "secondary_color": "#FDCB6E",
        "background_color": "#FFF5E6",
        "font_size": 16,
        "line_height": 1.75,
        "letter_spacing": 0.5,
        "padding": 32,
        "style": "温暖、治愈、舒适",
    },
    "高端商务": {
        "description": "适合高端、奢华、品牌类",
        "primary_color": "#2C3E50",
        "secondary_color": "#34495E",
        "background_color": "#FFFFFF",
        "font_size": 16,
        "line_height": 1.5,
        "letter_spacing": 0.5,
        "padding": 40,
        "style": "高端、奢华、专业",
    },
}

# 排版规则
LAYOUT_RULES = {
    "标题": {
        "font_size": 18,
        "font_weight": "bold",
        "color": "#333333",
        "line_height": 2.0,
        "letter_spacing": 0.5,
        "padding_top": 10,
        "padding_bottom": 10,
    },
    "小标题": {
        "font_size": 16,
        "font_weight": "bold",
        "color": "#333333",
        "line_height": 1.75,
        "letter_spacing": 0.5,
        "padding_top": 15,
        "padding_bottom": 5,
    },
    "正文": {
        "font_size": 15,
        "font_weight": "normal",
        "color": "#333333",
        "line_height": 1.75,
        "letter_spacing": 0.5,
        "padding_top": 5,
        "padding_bottom": 5,
    },
    "引用": {
        "font_size": 14,
        "font_weight": "normal",
        "color": "#666666",
        "line_height": 1.5,
        "letter_spacing": 0.5,
        "padding": 16,
        "border_left": "4px solid #5D9CEC",
        "background_color": "#F5F7FA",
    },
    "列表": {
        "font_size": 15,
        "font_weight": "normal",
        "color": "#333333",
        "line_height": 1.75,
        "letter_spacing": 0.5,
        "padding_left": 20,
    },
}


def detect_structure(text: str) -> Dict[str, Any]:
    """
    智能识别文章结构

    Args:
        text: 文章内容

    Returns:
        文章结构信息
    """
    # 按段落分割
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]

    structure = {
        "title": "",
        "subheadings": [],
        "body_paragraphs": [],
        "lists": [],
        "quotes": [],
    }

    # 识别标题（第一段或很短的段落）
    if paragraphs and len(paragraphs[0]) < 50:
        structure["title"] = paragraphs[0]
        paragraphs = paragraphs[1:]

    # 识别小标题（较短的段落）
    for paragraph in paragraphs:
        if 10 <= len(paragraph) <= 50 and re.match(r'^[一二三四五六七八九十]+、|\d+[、.]', paragraph):
            structure["subheadings"].append(paragraph)
        elif paragraph.startswith(">"):
            structure["quotes"].append(paragraph[1:].strip())
        elif re.match(r'^\d+[、.]\s', paragraph):
            structure["lists"].append(paragraph)
        else:
            structure["body_paragraphs"].append(paragraph)

    return structure


def auto_layout(text: str, template_name: str = "简约商务") -> Dict[str, Any]:
    """
    一键自动排版

    Args:
        text: 待排版文本
        template_name: 模板名称

    Returns:
        排版结果
    """
    if not text:
        return {"error": "文本内容不能为空"}

    # 获取模板
    template = LAYOUT_TEMPLATES.get(template_name, LAYOUT_TEMPLATES["简约商务"])

    # 识别结构
    structure = detect_structure(text)

    # 生成HTML排版
    html = _generate_html(structure, template)

    # 生成CSS样式
    css = _generate_css(template)

    return {
        "original_text": text,
        "layout_text": html,
        "css_style": css,
        "template_name": template_name,
        "template_description": template["description"],
        "structure": structure,
    }


def _generate_html(structure: Dict[str, Any], template: Dict[str, Any]) -> str:
    """
    生成HTML排版

    Args:
        structure: 文章结构
        template: 模板配置

    Returns:
        HTML内容
    """
    html_parts = []

    # 标题
    if structure["title"]:
        html_parts.append(f'<h1>{structure["title"]}</h1>')

    # 小标题和正文
    current_section = []
    for paragraph in structure["body_paragraphs"]:
        if paragraph in structure["subheadings"]:
            # 保存当前段落
            if current_section:
                html_parts.append('\n'.join(current_section))
                current_section = []
            # 添加小标题
            html_parts.append(f'<h2>{paragraph}</h2>')
        else:
            current_section.append(f'<p>{paragraph}</p>')

    # 保存最后一段
    if current_section:
        html_parts.append('\n'.join(current_section))

    # 引用
    for quote in structure["quotes"]:
        html_parts.append(f'<blockquote>{quote}</blockquote>')

    # 列表
    if structure["lists"]:
        html_parts.append('<ul>')
        for item in structure["lists"]:
            html_parts.append(f'<li>{item}</li>')
        html_parts.append('</ul>')

    return '\n'.join(html_parts)


def _generate_css(template: Dict[str, Any]) -> str:
    """
    生成CSS样式

    Args:
        template: 模板配置

    Returns:
        CSS样式
    """
    css_rules = {
        "body": {
            "font-family": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
            "font-size": f"{template['font_size']}px",
            "line-height": template['line_height'],
            "letter-spacing": f"{template['letter_spacing']}px",
            "color": template['primary_color'],
            "background-color": template['background_color'],
            "padding": f"0 {template['padding']}px",
            "margin": "0",
        },
        "h1": {
            "font-size": f"{LAYOUT_RULES['标题']['font_size']}px",
            "font-weight": LAYOUT_RULES['标题']['font_weight'],
            "color": LAYOUT_RULES['标题']['color'],
            "line-height": LAYOUT_RULES['标题']['line_height'],
            "margin": f"{LAYOUT_RULES['标题']['padding_top']}px 0 {LAYOUT_RULES['标题']['padding_bottom']}px 0",
        },
        "h2": {
            "font-size": f"{LAYOUT_RULES['小标题']['font_size']}px",
            "font-weight": LAYOUT_RULES['小标题']['font_weight'],
            "color": LAYOUT_RULES['小标题']['color'],
            "line-height": LAYOUT_RULES['小标题']['line_height'],
            "margin": f"{LAYOUT_RULES['小标题']['padding_top']}px 0 {LAYOUT_RULES['小标题']['padding_bottom']}px 0",
        },
        "p": {
            "font-size": f"{LAYOUT_RULES['正文']['font_size']}px",
            "font-weight": LAYOUT_RULES['正文']['font_weight'],
            "color": LAYOUT_RULES['正文']['color'],
            "line-height": LAYOUT_RULES['正文']['line_height'],
            "margin": f"{LAYOUT_RULES['正文']['padding_top']}px 0 {LAYOUT_RULES['正文']['padding_bottom']}px 0",
            "text-align": "justify",
        },
        "blockquote": {
            "font-size": f"{LAYOUT_RULES['引用']['font_size']}px",
            "color": LAYOUT_RULES['引用']['color'],
            "line-height": LAYOUT_RULES['引用']['line_height'],
            "padding": f"{LAYOUT_RULES['引用']['padding']}px",
            "margin": "16px 0",
            "border-left": LAYOUT_RULES['引用']['border_left'],
            "background-color": LAYOUT_RULES['引用']['background_color'],
        },
        "ul": {
            "font-size": f"{LAYOUT_RULES['列表']['font_size']}px",
            "color": LAYOUT_RULES['列表']['color'],
            "line-height": LAYOUT_RULES['列表']['line_height'],
            "padding-left": f"{LAYOUT_RULES['列表']['padding_left']}px",
        },
        "li": {
            "margin": "8px 0",
        },
    }

    # 生成CSS字符串
    css_parts = []
    for selector, rules in css_rules.items():
        rules_str = '; '.join([f'{k}: {v}' for k, v in rules.items()])
        css_parts.append(f'{selector} {{ {rules_str} }}')

    return '\n'.join(css_parts)


def optimize_font(text: str) -> Dict[str, Any]:
    """
    优化字体设置

    Args:
        text: 文章内容

    Returns:
        字体优化建议
    """
    if not text:
        return {"error": "文本内容不能为空"}

    # 分析文本长度
    text_length = len(text)
    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]

    # 根据文本长度推荐字体大小
    if text_length < 500:
        recommended_font_size = 17
    elif text_length < 1000:
        recommended_font_size = 16
    elif text_length < 2000:
        recommended_font_size = 15
    else:
        recommended_font_size = 16  # 长文章用稍大字体

    # 推荐行间距
    recommended_line_height = 1.75

    # 推荐字间距
    recommended_letter_spacing = 0.5

    # 推荐字体颜色
    recommended_font_color = "#333333"
    recommended_secondary_color = "#666666"

    return {
        "recommended_font_size": recommended_font_size,
        "recommended_line_height": recommended_line_height,
        "recommended_letter_spacing": recommended_letter_spacing,
        "recommended_font_color": recommended_font_color,
        "recommended_secondary_color": recommended_secondary_color,
        "text_length": text_length,
        "paragraph_count": len(paragraphs),
        "suggestions": [
            f"字体大小：{recommended_font_size}px",
            f"行间距：{recommended_line_height}",
            f"字间距：{recommended_letter_spacing}px",
            f"主色：{recommended_font_color}",
            f"辅助色：{recommended_secondary_color}",
        ],
    }


def suggest_image_position(text: str) -> Dict[str, Any]:
    """
    建议图片位置

    Args:
        text: 文章内容

    Returns:
        图片位置建议
    """
    if not text:
        return {"error": "文本内容不能为空"}

    paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
    image_positions = []

    # 在开头建议插入封面图
    if paragraphs:
        image_positions.append({
            "position": 0,
            "type": "封面图",
            "description": "文章开头插入封面图，吸引读者注意",
        })

    # 每3-5段建议插入配图
    for i in range(2, len(paragraphs), 4):
        image_positions.append({
            "position": i,
            "type": "配图",
            "description": f"在第{i+1}段后插入配图，提升阅读体验",
        })

    # 在结尾建议插入引导关注图
    if paragraphs:
        image_positions.append({
            "position": len(paragraphs),
            "type": "引导关注",
            "description": "文章结尾插入引导关注图片",
        })

    return {
        "total_paragraphs": len(paragraphs),
        "recommended_image_count": len(image_positions),
        "image_positions": image_positions,
    }


def preview_layout(text: str, template_name: str = "简约商务") -> Dict[str, Any]:
    """
    预览排版效果

    Args:
        text: 待排版文本
        template_name: 模板名称

    Returns:
        预览结果
    """
    layout_result = auto_layout(text, template_name)

    return {
        "html_preview": layout_result["layout_text"],
        "css_preview": layout_result["css_style"],
        "template_info": {
            "name": layout_result["template_name"],
            "description": layout_result["template_description"],
        },
    }


def get_template_list() -> List[Dict[str, Any]]:
    """
    获取所有模板列表

    Returns:
        模板列表
    """
    templates = []
    for name, config in LAYOUT_TEMPLATES.items():
        templates.append({
            "name": name,
            "description": config["description"],
            "style": config["style"],
            "primary_color": config["primary_color"],
            "secondary_color": config["secondary_color"],
            "background_color": config["background_color"],
        })
    return templates


def handler(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    主处理函数

    Args:
        args: 包含以下字段的字典
            - action: 操作类型（auto_layout/optimize_font/suggest_image_position/preview_layout/get_template_list/detect_structure）
            - text: 待排版文本
            - template_name: 模板名称（可选，默认简约商务）

    Returns:
        处理结果
    """
    action = args.get("action")
    text = args.get("text", "")
    template_name = args.get("template_name", "简约商务")

    result = {}

    if action == "auto_layout":
        if not text:
            raise ValueError("文本内容不能为空")
        result = auto_layout(text, template_name)

    elif action == "optimize_font":
        if not text:
            raise ValueError("文本内容不能为空")
        result = optimize_font(text)

    elif action == "suggest_image_position":
        if not text:
            raise ValueError("文本内容不能为空")
        result = suggest_image_position(text)

    elif action == "preview_layout":
        if not text:
            raise ValueError("文本内容不能为空")
        result = preview_layout(text, template_name)

    elif action == "get_template_list":
        result = {
            "templates": get_template_list(),
        }

    elif action == "detect_structure":
        if not text:
            raise ValueError("文本内容不能为空")
        result = detect_structure(text)

    else:
        raise ValueError(f"不支持的操作类型: {action}")

    return result
