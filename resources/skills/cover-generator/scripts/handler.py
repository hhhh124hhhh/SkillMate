"""
Cover Generator Handler - Claude Code Skill Handler

提供公众号封面生成的能力给 Claude Code 使用。
"""

import json
import sys
from pathlib import Path
from typing import Any, Dict

sys.path.insert(0, str(Path(__file__).parent))

from cover_generator import CoverGenerator


def parse_input(input_str: str) -> Dict[str, Any]:
    """解析用户输入"""
    result = {"prompt": "", "style": "auto", "crop_mode": "smart", "generate_share_card": True}

    input_str = input_str.strip()

    if input_str.startswith("{"):
        try:
            data = json.loads(input_str)
            result.update(data)
        except json.JSONDecodeError:
            pass
    else:
        result["prompt"] = input_str

        if "科技" in input_str or "tech" in input_str.lower():
            result["style"] = "tech"
        elif "自然" in input_str or "nature" in input_str.lower():
            result["style"] = "nature"
        elif "简约" in input_str or "minimal" in input_str.lower():
            result["style"] = "minimal"

        if "黄金比例" in input_str or "golden" in input_str.lower():
            result["crop_mode"] = "golden_ratio"
        elif "居中" in input_str or "center" in input_str.lower():
            result["crop_mode"] = "center"

        if "不带分享" in input_str or "no-share" in input_str.lower():
            result["generate_share_card"] = False

    return result


def main():
    """主入口函数"""
    if len(sys.argv) < 2:
        print("Usage: python handler.py <prompt> [options]")
        print("  prompt: 图片生成提示词")
        print("  --style: 风格 (tech/nature/minimal/auto)")
        print("  --crop-mode: 裁剪模式 (center/golden_ratio/smart)")
        print("  --share-card/--no-share-card: 是否生成分享卡片")
        sys.exit(1)

    prompt = sys.argv[1]

    options = parse_input(" ".join(sys.argv[1:]))

    generator = CoverGenerator()

    try:
        result = generator.generate_cover(
            prompt=options.get("prompt", prompt),
            style=options.get("style", "auto"),
            crop_mode=options.get("crop_mode", "smart"),
            generate_share_card=options.get("generate_share_card", True),
            generate_variants=True,
        )

        print("\n" + "=" * 50)
        print("生成完成！")
        print("=" * 50)

        print(f"\n裁剪方案 ({len(result.get('variants', {}).get('wechat-cover', {}))} 种):")
        for mode, path in result.get("variants", {}).get("wechat-cover", {}).items():
            print(f"  - {mode}: {path}")

        if result.get("files", {}).get("share_card"):
            print(f"\n分享卡片: {result['files']['share_card']}")

        if result.get("files", {}).get("preview"):
            print(f"预览图: {result['files']['preview']}")

        print(f"\n结果文件: output/cover_{result['timestamp']}/result.json")

    except Exception as e:
        print(f"生成失败: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
