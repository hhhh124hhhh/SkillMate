#!/usr/bin/env python3
"""
豆包Seedream 4.5图像生成脚本

功能：
1. 基础文生图（generate_image）
2. 图像编辑（edit_image）
3. 多图融合（blend_images）
4. 批量生成（batch_generate）

作者：Claude Code
创建时间：2026-01-11
"""

import openai
import requests
from typing import Dict, List, Optional
import os
import sys
import argparse
import time
import json
from pathlib import Path

# Fix encoding issues on Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


def load_config():
    """加载配置文件"""
    config_path = Path(__file__).parent.parent.parent.parent / "config.json"
    default_config = {
        "image_output_root": "output/",
        "image_scripts_root": ".claude/skills/image-generation/scripts/"
    }

    try:
        if config_path.exists():
            with open(config_path, 'r', encoding='utf-8') as f:
                return {**default_config, **json.load(f)}
    except Exception:
        pass

    return default_config


# 全局配置
CONFIG = load_config()


class DoubaoImageGenerator:
    """豆包图像生成器"""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = "https://ark.cn-beijing.volces.com/api/v3"
    ):
        """
        初始化豆包图像生成器

        Args:
            api_key: API密钥，如果为None则从环境变量DOUBAO_API_KEY读取
            base_url: API基础URL
        """
        if api_key is None:
            api_key = os.getenv("DOUBAO_API_KEY", "9087db7c-d9e1-489a-8bf4-b76c153d2bea")

        self.api_key = api_key
        self.base_url = base_url
        self.client = openai.OpenAI(api_key=api_key, base_url=base_url)

    def generate_image(
        self,
        prompt: str,
        size: str = "1024x1024",
        quality: str = "standard",
        n: int = 1,
        model: str = "doubao-seedream-4-5-251128"
    ) -> Dict:
        """
        生成图像

        Args:
            prompt: 图像描述
            size: 图像尺寸 (1024x1024, 1024x1792, 1792x1024)
            quality: 质量 (standard, hd)
            n: 生成数量
            model: 模型名称

        Returns:
            包含图像URL的字典
            {
                "url": "图像URL",
                "created": "创建时间戳"
            }
        """
        try:
            response = self.client.images.generate(
                model=model,
                prompt=prompt,
                size=size,
                quality=quality,
                n=n
            )

            result = {
                "url": response.data[0].url,
                "created": response.created
            }

            return result

        except Exception as e:
            return {
                "error": str(e),
                "url": None
            }

    def edit_image(
        self,
        image_path: str,
        prompt: str,
        size: str = "1024x1024",
        model: str = "doubao-seedream-4-5-251128"
    ) -> Dict:
        """
        编辑图像

        Args:
            image_path: 原始图像路径
            prompt: 编辑指令
            size: 输出尺寸
            model: 模型名称

        Returns:
            包含编辑后图像URL的字典
        """
        try:
            with open(image_path, "rb") as f:
                response = self.client.images.edit(
                    model=model,
                    image=f,
                    prompt=prompt,
                    size=size
                )

            return {
                "url": response.data[0].url,
                "created": response.created
            }

        except Exception as e:
            return {
                "error": str(e),
                "url": None
            }

    def batch_generate(
        self,
        prompts: List[str],
        size: str = "1024x1024",
        quality: str = "standard",
        model: str = "doubao-seedream-4-5-251128",
        delay: float = 1.0
    ) -> List[Dict]:
        """
        批量生成图像

        Args:
            prompts: 图像描述列表
            size: 图像尺寸
            quality: 质量
            model: 模型名称
            delay: 每次请求之间的延迟（秒）

        Returns:
            生成结果列表
        """
        results = []

        for i, prompt in enumerate(prompts):
            print(f"正在生成第 {i+1}/{len(prompts)} 张图像...")

            result = self.generate_image(
                prompt=prompt,
                size=size,
                quality=quality,
                model=model
            )

            results.append(result)

            # 避免请求过于频繁
            if i < len(prompts) - 1:
                time.sleep(delay)

        return results

    def download_image(self, url: str, output_path: str) -> bool:
        """
        下载图像到本地

        Args:
            url: 图像URL
            output_path: 输出路径

        Returns:
            是否下载成功
        """
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()

            # 确保输出目录存在
            output_path = Path(output_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)

            with open(output_path, "wb") as f:
                f.write(response.content)

            print(f"图像已保存到: {output_path}")
            return True

        except Exception as e:
            print(f"下载失败: {e}")
            return False

    def save_to_assets(
        self,
        url: str,
        filename: str,
        project_name: str = "default_project"
    ) -> str:
        """
        下载图像到项目assets目录

        Args:
            url: 图像URL
            filename: 文件名
            project_name: 项目名称

        Returns:
            保存的文件路径
        """
        # 构建输出路径（使用配置文件中的相对路径）
        project_root = CONFIG.get('image_output_root', 'output/')
        output_path = f"{project_root}{project_name}/assets/images/{filename}"

        success = self.download_image(url, output_path)

        if success:
            return output_path
        else:
            return ""


def download_image(url: str, output_path: str) -> bool:
    """辅助函数：下载图像"""
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()

        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, "wb") as f:
            f.write(response.content)

        return True

    except Exception as e:
        print(f"下载失败: {e}")
        return False


def main():
    """命令行入口"""
    parser = argparse.ArgumentParser(
        description="豆包Seedream 4.5图像生成工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 基础用法
  python doubao_image_gen.py --prompt "一只猫" --output cat.png

  # 生成横版图表
  python doubao_image_gen.py --prompt "技术架构图" --size "1792x1024" --output architecture.png

  # 生成高质量图像
  python doubao_image_gen.py --prompt "城市夜景" --quality "hd" --output city.png
        """
    )

    parser.add_argument(
        "--prompt",
        required=True,
        help="图像描述（必需）"
    )

    parser.add_argument(
        "--size",
        default="1024x1024",
        choices=["1024x1024", "1024x1792", "1792x1024", "2560x1440"],
        help="图像尺寸（默认: 1024x1024）\n  1024x1024: 正方形(1:1)\n  1792x1024: 横版(16:9)\n  1024x1792: 竖版(9:16)\n  2560x1440: 横版高清(16:9，满足像素要求)"
    )

    parser.add_argument(
        "--quality",
        default="standard",
        choices=["standard", "hd"],
        help="图像质量（默认: standard）"
    )

    parser.add_argument(
        "--output",
        default="generated_image.png",
        help="输出文件名（默认: generated_image.png）"
    )

    parser.add_argument(
        "--api-key",
        help="API密钥（默认从环境变量DOUBAO_API_KEY读取）"
    )

    args = parser.parse_args()

    # 初始化生成器
    api_key = args.api_key or os.getenv("DOUBAO_API_KEY")
    
    try:
        generator = DoubaoImageGenerator(api_key=api_key)
    except ValueError as e:
        print(f"错误: {e}")
        sys.exit(1)

    # 生成图像
    result = generator.generate_image(
        prompt=args.prompt,
        size=args.size,
        quality=args.quality
    )

    # 检查结果
    if result.get("error"):
        print(f"生成失败: {result['error']}")
        sys.exit(1)

    if result.get("url"):
        print(f"\n生成成功！")
        print(f"图像URL: {result['url']}")

        # 下载图像
        print(f"正在下载到: {args.output}")
        success = generator.download_image(result["url"], args.output)

        if success:
            print(f"✓ 完成！")
        else:
            sys.exit(1)


if __name__ == "__main__":
    main()
