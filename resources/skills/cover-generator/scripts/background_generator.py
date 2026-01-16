"""
背景生成器
支持AI生成背景、纯色背景、渐变背景
"""

from PIL import Image, ImageDraw
import re
from typing import Dict, Tuple, Optional
from pathlib import Path


class BackgroundGenerator:
    """背景生成器"""

    def __init__(self, image_generator=None):
        """
        初始化背景生成器

        Args:
            image_generator: AI图片生成器实例（可选）
        """
        self.image_generator = image_generator

    def generate(
        self,
        background_config: Dict,
        size: Tuple[int, int],
        style_prompt_builder=None
    ) -> Optional[Image.Image]:
        """
        生成背景图

        Args:
            background_config: 背景配置
            size: 目标尺寸 (width, height)
            style_prompt_builder: 风格提示词构建器（用于AI生成）

        Returns:
            PIL Image对象
        """
        bg_type = background_config.get('type', 'ai_generate')

        if bg_type == 'ai_generate':
            return self._generate_ai_background(
                background_config,
                size,
                style_prompt_builder
            )
        elif bg_type == 'solid':
            return self._generate_solid_background(
                background_config,
                size
            )
        elif bg_type == 'gradient':
            return self._generate_gradient_background(
                background_config,
                size
            )
        else:
            raise ValueError(f"不支持的背景类型: {bg_type}")

    def _generate_ai_background(
        self,
        config: Dict,
        size: Tuple[int, int],
        style_prompt_builder=None
    ) -> Optional[Image.Image]:
        """
        使用AI生成背景

        Args:
            config: 背景配置
            size: 目标尺寸
            style_prompt_builder: 风格提示词构建器

        Returns:
            PIL Image对象
        """
        if not self.image_generator:
            print("错误: AI图片生成器未配置")
            return None

        # 获取风格
        style = config.get('style', 'tech')

        # 构建提示词
        # 简化的背景提示词（只有背景，没有文字）
        style_prompts = {
            'tech': 'Simple background, dark blue to purple gradient, no text, no decorations',
            'fresh': 'Simple background, light green to yellow gradient, no text, no decorations',
            'minimal': 'Simple background, light gray to white gradient, no text, no decorations',
            'warm': 'Simple background, orange to pink gradient, no text, no decorations',
            'business': 'Simple background, dark blue to gray gradient, no text, no decorations'
        }

        prompt = style_prompts.get(style, style_prompts['tech'])

        # 调用AI生成
        try:
            size_str = f"{size[0]}x{size[1]}"
            image_url = self.image_generator.generate_image(prompt, size_str, "hd")

            # 下载图片
            import requests
            from io import BytesIO

            response = requests.get(image_url)
            response.raise_for_status()

            image = Image.open(BytesIO(response.content))
            return image

        except Exception as e:
            print(f"AI背景生成失败: {e}")
            # 回退到纯色背景
            return self._generate_fallback_background(size, style)

    def _generate_solid_background(
        self,
        config: Dict,
        size: Tuple[int, int]
    ) -> Image.Image:
        """
        生成纯色背景

        Args:
            config: 背景配置
            size: 目标尺寸

        Returns:
            PIL Image对象
        """
        color = config.get('color', '#FFFFFF')
        rgb_color = self._parse_color(color)

        image = Image.new('RGB', size, rgb_color)
        return image

    def _generate_gradient_background(
        self,
        config: Dict,
        size: Tuple[int, int]
    ) -> Image.Image:
        """
        生成渐变背景

        Args:
            config: 背景配置
            size: 目标尺寸

        Returns:
            PIL Image对象
        """
        gradient_config = config.get('gradient', {})
        from_color = gradient_config.get('from', '#667eea')
        to_color = gradient_config.get('to', '#764ba2')
        direction = gradient_config.get('direction', 'horizontal')

        from_rgb = self._parse_color(from_color)
        to_rgb = self._parse_color(to_color)

        image = Image.new('RGB', size)
        draw = ImageDraw.Draw(image)

        width, height = size

        if direction == 'horizontal':
            # 水平渐变
            for x in range(width):
                ratio = x / width
                r = int(from_rgb[0] + (to_rgb[0] - from_rgb[0]) * ratio)
                g = int(from_rgb[1] + (to_rgb[1] - from_rgb[1]) * ratio)
                b = int(from_rgb[2] + (to_rgb[2] - from_rgb[2]) * ratio)
                draw.line([(x, 0), (x, height)], fill=(r, g, b))

        elif direction == 'vertical':
            # 垂直渐变
            for y in range(height):
                ratio = y / height
                r = int(from_rgb[0] + (to_rgb[0] - from_rgb[0]) * ratio)
                g = int(from_rgb[1] + (to_rgb[1] - from_rgb[1]) * ratio)
                b = int(from_rgb[2] + (to_rgb[2] - from_rgb[2]) * ratio)
                draw.line([(0, y), (width, y)], fill=(r, g, b))

        elif direction == 'diagonal':
            # 对角渐变
            for i in range(max(width, height)):
                ratio = i / max(width, height)
                r = int(from_rgb[0] + (to_rgb[0] - from_rgb[0]) * ratio)
                g = int(from_rgb[1] + (to_rgb[1] - from_rgb[1]) * ratio)
                b = int(from_rgb[2] + (to_rgb[2] - from_rgb[2]) * ratio)
                # 绘制对角线
                draw.line([(i, 0), (0, i)], fill=(r, g, b))
                draw.line([(width - i, height), (width, height - i)], fill=(r, g, b))

        return image

    def _generate_fallback_background(
        self,
        size: Tuple[int, int],
        style: str = 'tech'
    ) -> Image.Image:
        """
        生成回退背景（当AI生成失败时）

        Args:
            size: 目标尺寸
            style: 风格

        Returns:
            PIL Image对象
        """
        # 根据风格返回纯色或渐变背景
        fallback_configs = {
            'tech': {
                'type': 'gradient',
                'gradient': {
                    'from': '#1E3A8A',
                    'to': '#7C3AED',
                    'direction': 'horizontal'
                }
            },
            'fresh': {
                'type': 'gradient',
                'gradient': {
                    'from': '#A7F3D0',
                    'to': '#FCD34D',
                    'direction': 'diagonal'
                }
            },
            'minimal': {
                'type': 'solid',
                'color': '#FAFAFA'
            },
            'warm': {
                'type': 'gradient',
                'gradient': {
                    'from': '#FDE68A',
                    'to': '#FCA5A5',
                    'direction': 'horizontal'
                }
            },
            'business': {
                'type': 'gradient',
                'gradient': {
                    'from': '#1E40AF',
                    'to': '#374151',
                    'direction': 'horizontal'
                }
            }
        }

        config = fallback_configs.get(style, fallback_configs['tech'])
        return self.generate(config, size)

    def apply_overlay(
        self,
        image: Image.Image,
        overlay_config: Dict
    ) -> Image.Image:
        """
        应用叠加层

        Args:
            image: 原始图片
            overlay_config: 叠加层配置

        Returns:
            应用叠加层后的图片
        """
        if not overlay_config.get('enabled', False):
            return image

        overlay_type = overlay_config.get('type', 'gradient')

        # 创建叠加层
        if overlay_type == 'gradient':
            return self._apply_gradient_overlay(image, overlay_config)
        elif overlay_type == 'solid':
            return self._apply_solid_overlay(image, overlay_config)
        else:
            return image

    def _apply_gradient_overlay(
        self,
        image: Image.Image,
        overlay_config: Dict
    ) -> Image.Image:
        """
        应用渐变叠加层

        Args:
            image: 原始图片
            overlay_config: 叠加层配置

        Returns:
            叠加后的图片
        """
        gradient_config = overlay_config.get('gradient', {})
        from_color = gradient_config.get('from', 'rgba(0,0,0,0.7)')
        to_color = gradient_config.get('to', 'rgba(0,0,0,0.3)')
        direction = gradient_config.get('direction', 'vertical')

        from_rgba = self._parse_color(from_color)
        to_rgba = self._parse_color(to_color)

        width, height = image.size
        overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        if direction == 'vertical':
            # 垂直渐变叠加
            for y in range(height):
                ratio = y / height
                r = int(from_rgba[0] + (to_rgba[0] - from_rgba[0]) * ratio)
                g = int(from_rgba[1] + (to_rgba[1] - from_rgba[1]) * ratio)
                b = int(from_rgba[2] + (to_rgba[2] - from_rgba[2]) * ratio)
                a = int(from_rgba[3] + (to_rgba[3] - from_rgba[3]) * ratio)
                draw.line([(0, y), (width, y)], fill=(r, g, b, a))

        elif direction == 'horizontal':
            # 水平渐变叠加
            for x in range(width):
                ratio = x / width
                r = int(from_rgba[0] + (to_rgba[0] - from_rgba[0]) * ratio)
                g = int(from_rgba[1] + (to_rgba[1] - from_rgba[1]) * ratio)
                b = int(from_rgba[2] + (to_rgba[2] - from_rgba[2]) * ratio)
                a = int(from_rgba[3] + (to_rgba[3] - from_rgba[3]) * ratio)
                draw.line([(x, 0), (x, height)], fill=(r, g, b, a))

        # 合并叠加层
        image_rgba = image.convert('RGBA')
        combined = Image.alpha_composite(image_rgba, overlay)

        return combined.convert(image.mode)

    def _apply_solid_overlay(
        self,
        image: Image.Image,
        overlay_config: Dict
    ) -> Image.Image:
        """
        应用纯色叠加层

        Args:
            image: 原始图片
            overlay_config: 叠加层配置

        Returns:
            叠加后的图片
        """
        color = overlay_config.get('color', 'rgba(0,0,0,0.5)')
        position = overlay_config.get('position', 'full')
        height_str = overlay_config.get('height', '100%')

        rgba = self._parse_color(color)
        width, height = image.size

        overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay)

        if position == 'full':
            # 全屏叠加
            draw.rectangle([0, 0, width, height], fill=rgba)
        elif position == 'bottom':
            # 底部叠加
            overlay_height = self._parse_size(height_str, height)
            draw.rectangle(
                [0, height - overlay_height, width, height],
                fill=rgba
            )
        elif position == 'top':
            # 顶部叠加
            overlay_height = self._parse_size(height_str, height)
            draw.rectangle(
                [0, 0, width, overlay_height],
                fill=rgba
            )

        # 合并叠加层
        image_rgba = image.convert('RGBA')
        combined = Image.alpha_composite(image_rgba, overlay)

        return combined.convert(image.mode)

    def _parse_color(self, color_str: str) -> Tuple[int, int, int, int]:
        """
        解析颜色字符串

        Args:
            color_str: 颜色字符串

        Returns:
            RGBA元组
        """
        if color_str.startswith('#'):
            # 十六进制颜色
            hex_color = color_str.lstrip('#')
            if len(hex_color) == 6:
                r = int(hex_color[0:2], 16)
                g = int(hex_color[2:4], 16)
                b = int(hex_color[4:6], 16)
                return (r, g, b, 255)
        elif color_str.startswith('rgba'):
            # RGBA颜色
            match = re.match(
                r'rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)',
                color_str
            )
            if match:
                r = int(match.group(1))
                g = int(match.group(2))
                b = int(match.group(3))
                a = float(match.group(4)) if match.group(4) else 1.0
                return (r, g, b, int(a * 255))
        elif color_str.startswith('rgb'):
            # RGB颜色
            match = re.match(
                r'rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)',
                color_str
            )
            if match:
                r = int(match.group(1))
                g = int(match.group(2))
                b = int(match.group(3))
                return (r, g, b, 255)

        # 默认黑色
        return (0, 0, 0, 255)

    def _parse_size(self, size_str: str, reference_size: int) -> int:
        """
        解析尺寸字符串

        Args:
            size_str: 尺寸字符串（百分比或像素）
            reference_size: 参考尺寸

        Returns:
            像素尺寸
        """
        if isinstance(size_str, str) and size_str.endswith('%'):
            pct = float(size_str.rstrip('%')) / 100
            return int(reference_size * pct)
        elif isinstance(size_str, (int, float)):
            return int(size_str)
        else:
            return reference_size


def main():
    """主程序 - 背景生成器测试"""
    print("背景生成器模块")
    print("此模块将被template_engine.py调用")


if __name__ == "__main__":
    main()
