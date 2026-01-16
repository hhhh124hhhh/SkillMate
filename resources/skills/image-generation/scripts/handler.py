"""
Image Generation Skill Handler

处理豆包图像生成相关的所有操作
"""

from typing import Dict, Any
from doubao_image_gen import DoubaoImageGenerator


def handler(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    图像生成Handler

    支持的Actions:
        - generate_image: 文生图
        - edit_image: 图像编辑
        - batch_generate: 批量生成

    参数格式:
        {
            "action": "generate_image",
            "prompt": "图像描述",
            "size": "1024x1024",  # 可选
            "quality": "standard", # 可选
            "n": 1,               # 可选
            "model": "doubao-seedream-4-5-251128"  # 可选
        }
    """
    action = args.get("action")

    # 创建图像生成器实例
    generator = DoubaoImageGenerator()

    if action == "generate_image":
        # 文生图
        result = generator.generate_image(
            prompt=args.get("prompt", ""),
            size=args.get("size", "1024x1024"),
            quality=args.get("quality", "standard"),
            n=args.get("n", 1),
            model=args.get("model", "doubao-seedream-4-5-251128")
        )
        return result

    elif action == "edit_image":
        # 图像编辑
        result = generator.edit_image(
            image_path=args.get("image_path", ""),
            prompt=args.get("prompt", ""),
            size=args.get("size", "1024x1024"),
            model=args.get("model", "doubao-seedream-4-5-251128")
        )
        return result

    elif action == "batch_generate":
        # 批量生成
        prompts = args.get("prompts", [])
        if not prompts:
            return {"error": "缺少prompts参数"}

        results = generator.batch_generate(
            prompts=prompts,
            size=args.get("size", "1024x1024"),
            quality=args.get("quality", "standard"),
            model=args.get("model", "doubao-seedream-4-5-251128"),
            delay=args.get("delay", 1.0)
        )
        return {"results": results}

    else:
        return {"error": f"不支持的操作: {action}"}
