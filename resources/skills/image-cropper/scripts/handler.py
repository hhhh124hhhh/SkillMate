"""
Image Cropper Skill Handler

处理图像裁剪相关的所有操作
"""

from typing import Dict, Any
from crop_image import crop_to_center, PRESET_SIZES
from batch_crop import batch_crop


def handler(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    图像裁剪Handler

    支持的Actions:
        - crop_single: 单张裁剪
        - crop_batch: 批量裁剪
        - list_presets: 列出预设尺寸

    参数格式:
    {
        "action": "crop_single",
        "input_path": "输入图片路径",
        "output_path": "输出图片路径",
        "preset": "wechat-cover",  # 可选
        "width": 900,              # 可选
        "height": 383,             # 可选
        "quality": 95              # 可选
    }
    """
    action = args.get("action")

    if action == "crop_single":
        # 单张裁剪
        success = crop_to_center(
            input_path=args.get("input_path", ""),
            output_path=args.get("output_path", ""),
            width=args.get("width"),
            height=args.get("height"),
            preset=args.get("preset"),
            quality=args.get("quality", 95)
        )
        return {
            "success": success,
            "message": "裁剪成功" if success else "裁剪失败"
        }

    elif action == "crop_batch":
        # 批量裁剪
        success_count, fail_count = batch_crop(
            input_dir=args.get("input_dir", ""),
            output_dir=args.get("output_dir", ""),
            size=args.get("size"),
            preset=args.get("preset"),
            quality=args.get("quality", 95),
            pattern=args.get("pattern", "*.jpg")
        )
        return {
            "success": True,
            "success_count": success_count,
            "fail_count": fail_count,
            "total_count": success_count + fail_count,
            "message": f"成功{success_count}张，失败{fail_count}张"
        }

    elif action == "list_presets":
        # 列出预设尺寸
        return {
            "presets": PRESET_SIZES,
            "count": len(PRESET_SIZES)
        }

    else:
        return {"error": f"不支持的操作: {action}"}
