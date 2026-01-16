"""
智谱AI写作工具 - 接入真正的GLM-4 API

功能：内容润色、扩写、精简、风格转换等
"""

import requests
import json
from typing import Dict, Any, List
import os
import sys
from pathlib import Path

# 添加src到路径以导入配置
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))
from src.config import Config


class ZhipuAIWriter:
    """智谱AI写作工具"""

    def __init__(self, api_key: str = None):
        """
        初始化智谱AI写作工具

        Args:
            api_key: 智谱API密钥，如果为None则从环境变量读取
        """
        if api_key is None:
            api_key = Config.ZHIPU_API_KEY

        if not api_key:
            raise ValueError(
                "请提供智谱API密钥 (ZHIPU_API_KEY)\n"
                "请在 .env 文件中设置: ZHIPU_API_KEY=你的密钥\n"
                "或访问: https://open.bigmodel.cn/usercenter/apikeys"
            )

        self.api_key = api_key
        self.base_url = Config.ZHIPU_API_URL

    def _call_api(self, messages: List[Dict], model: str = "glm-4") -> str:
        """
        调用智谱API

        Args:
            messages: 消息列表
            model: 模型名称

        Returns:
            AI生成的文本
        """
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.7,
            "top_p": 0.9,
            "max_tokens": 2000
        }

        try:
            response = requests.post(
                self.base_url,
                headers=headers,
                json=payload,
                timeout=30
            )

            if response.status_code != 200:
                return f"API调用失败: {response.status_code} - {response.text}"

            result = response.json()
            return result["choices"][0]["message"]["content"]

        except Exception as e:
            return f"请求失败: {str(e)}"

    def polish_text(self, text: str, style: str = "正式") -> Dict[str, Any]:
        """
        润色文本（使用智谱AI）

        Args:
            text: 待润色文本
            style: 写作风格

        Returns:
            润色结果
        """
        style_prompts = {
            "正式": "请将以下文本改写为正式、专业的商务风格，用词严谨、表达得体。",
            "幽默": "请将以下文本改写为幽默风趣的风格，增加轻松感和趣味性。",
            "科普": "请将以下文本改写为科普风格，通俗易懂，适合普通读者理解。",
            "故事化": "请将以下文本改写为故事化风格，增加叙述性和代入感。",
        }

        prompt = style_prompts.get(style, style_prompts["正式"])

        messages = [
            {"role": "system", "content": "你是一位专业的文字编辑，擅长优化文章表达。"},
            {"role": "user", "content": f"{prompt}\n\n原文：{text}\n\n请直接输出润色后的文本，不需要解释。"}
        ]

        polished_text = self._call_api(messages)

        return {
            "original_text": text,
            "polished_text": polished_text,
            "style": style,
            "provider": "智谱GLM-4"
        }

    def expand_text(self, text: str, target_length: int = 500) -> Dict[str, Any]:
        """
        扩写文本（使用智谱AI）

        Args:
            text: 待扩写文本
            target_length: 目标字数

        Returns:
            扩写结果
        """
        messages = [
            {"role": "system", "content": "你是一位专业的内容创作者，擅长扩展文章内容。"},
            {"role": "user", "content": f"请将以下文本扩写到约{target_length}字，保持原文核心观点，增加细节说明和例子。\n\n原文：{text}\n\n请直接输出扩写后的文本，不需要解释。"}
        ]

        expanded_text = self._call_api(messages)

        return {
            "original_text": text,
            "expanded_text": expanded_text,
            "target_length": target_length,
            "actual_length": len(expanded_text),
            "provider": "智谱GLM-4"
        }

    def compress_text(self, text: str, target_length: int = 200) -> Dict[str, Any]:
        """
        精简文本（使用智谱AI）

        Args:
            text: 待精简文本
            target_length: 目标字数

        Returns:
            精简结果
        """
        messages = [
            {"role": "system", "content": "你是一位专业的编辑，擅长提炼文章核心观点。"},
            {"role": "user", "content": f"请将以下文本精简到约{target_length}字，保留核心信息和关键观点。\n\n原文：{text}\n\n请直接输出精简后的文本，不需要解释。"}
        ]

        compressed_text = self._call_api(messages)

        return {
            "original_text": text,
            "compressed_text": compressed_text,
            "target_length": target_length,
            "actual_length": len(compressed_text),
            "provider": "智谱GLM-4"
        }

    def change_style(self, text: str, target_style: str) -> Dict[str, Any]:
        """
        风格转换（使用智谱AI）

        Args:
            text: 待转换文本
            target_style: 目标风格

        Returns:
            转换结果
        """
        style_descriptions = {
            "正式": "正式商务风格，用词严谨专业",
            "幽默": "幽默风趣，增加轻松感",
            "科普": "通俗易懂，适合大众理解",
            "故事化": "用故事叙述，增加代入感",
            "对话式": "像对话一样自然亲切",
            "学术": "学术严谨，引用数据和文献",
            "新闻": "新闻报道风格，客观中立",
            "营销": "营销文案风格，强调卖点",
            "简洁": "简洁明了，直奔主题"
        }

        description = style_descriptions.get(target_style, target_style)

        messages = [
            {"role": "system", "content": "你是一位擅长多风格写作的作者。"},
            {"role": "user", "content": f"请将以下文本改写为{description}风格。\n\n原文：{text}\n\n请直接输出改写后的文本，不需要解释。"}
        ]

        changed_text = self._call_api(messages)

        return {
            "original_text": text,
            "changed_text": changed_text,
            "target_style": target_style,
            "provider": "智谱GLM-4"
        }


# handler函数（兼容Claude Skills格式）
def handler(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    主处理函数

    Args:
        args: 包含以下字段的字典
            - action: 操作类型
            - text: 待处理文本
            - style: 写作风格（可选）
            - target_length: 目标长度（可选）

    Returns:
        处理结果
    """
    action = args.get("action")
    text = args.get("text", "")

    if not text:
        return {"error": "文本内容不能为空"}

    # 创建AI写作实例
    try:
        writer = ZhipuAIWriter()
    except ValueError as e:
        return {"error": str(e)}

    result = {}

    if action == "polish":
        style = args.get("style", "正式")
        result = writer.polish_text(text, style)

    elif action == "expand":
        target_length = args.get("target_length", 500)
        result = writer.expand_text(text, target_length)

    elif action == "compress":
        target_length = args.get("target_length", 200)
        result = writer.compress_text(text, target_length)

    elif action == "change_style":
        target_style = args.get("target_style", "正式")
        result = writer.change_style(text, target_style)

    else:
        return {"error": f"不支持的操作类型: {action}"}

    return result


# 使用示例
if __name__ == "__main__":
    # 测试润色功能
    result = handler({
        "action": "polish",
        "text": "大家好，今天我们来讲讲AI写作工具。这个工具非常好用，可以帮助我们写文章。希望大家喜欢。",
        "style": "正式"
    })

    if "error" in result:
        print(f"错误: {result['error']}")
    else:
        print("原文:", result["original_text"])
        print("润色后:", result["polished_text"])
