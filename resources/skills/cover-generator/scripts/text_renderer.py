"""
文字渲染器
使用PIL精确绘制文字，支持自动换行、字体效果、精确定位
"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import re


class TextRenderer:
    """文字渲染器"""

    # 常用字体映射
    FONT_MAP = {
        'SimHei': ['simhei.ttf', 'SimHei.ttf'],
        'Microsoft YaHei': ['msyh.ttf', 'Microsoft YaHei.ttf'],
        'SimSun': ['simsun.ttf', 'SimSun.ttf'],
        'Noto Sans SC': ['NotoSansSC-Regular.otf', 'NotoSansSC-Regular.ttf'],
        'Noto Serif SC': ['NotoSerifSC-Regular.otf', 'NotoSerifSC-Regular.ttf'],
        'Consolas': ['consola.ttf', 'Consolas.ttf'],
        'Arial': ['arial.ttf', 'Arial.ttf'],
        'sans-serif': ['arial.ttf', 'Arial.ttf'],
    }

    def __init__(self):
        """初始化渲染器"""
        self.fonts = {}  # 字体缓存
        self._system_fonts = self._find_system_fonts()

    def _find_system_fonts(self) -> Dict[str, Path]:
        """
        查找系统字体

        Returns:
            字体文件路径映射
        """
        font_paths = {}

        # Windows字体目录
        font_dirs = [
            Path("C:/Windows/Fonts"),
            Path("C:/Windows/System32/Fonts"),
        ]

        # macOS字体目录
        font_dirs.extend([
            Path("/System/Library/Fonts"),
            Path("/Library/Fonts"),
            Path("~/Library/Fonts").expanduser(),
        ])

        # Linux字体目录
        font_dirs.extend([
            Path("/usr/share/fonts"),
            Path("/usr/local/share/fonts"),
        ])

        # 搜索字体文件
        for font_dir in font_dirs:
            if not font_dir.exists():
                continue

            for font_file in font_dir.rglob("*.ttf"):
                font_name_lower = font_file.stem.lower()
                font_paths[font_name_lower] = font_file

            for font_file in font_dir.rglob("*.otf"):
                font_name_lower = font_file.stem.lower()
                font_paths[font_name_lower] = font_file

        return font_paths

    def load_font(
        self,
        family: List[str],
        size: int,
        weight: str = "normal"
    ) -> ImageFont.FreeTypeFont:
        """
        加载字体

        Args:
            family: 字体族列表（按优先级）
            size: 字体大小
            weight: 字体粗细 (normal/bold/light)

        Returns:
            PIL字体对象
        """
        # 生成缓存键
        cache_key = f"{','.join(family)}_{size}_{weight}"

        if cache_key in self.fonts:
            return self.fonts[cache_key]

        # 尝试加载字体
        for font_name in family:
            font = self._try_load_font(font_name, size)
            if font:
                self.fonts[cache_key] = font
                return font

        # 如果都失败了，使用默认字体
        try:
            font = ImageFont.load_default()
            print(f"警告: 无法加载字体 {family}，使用默认字体")
            self.fonts[cache_key] = font
            return font
        except Exception as e:
            print(f"错误: 无法加载默认字体: {e}")
            raise

    def _try_load_font(self, font_name: str, size: int) -> Optional[ImageFont.FreeTypeFont]:
        """
        尝试加载单个字体

        Args:
            font_name: 字体名称
            size: 字体大小

        Returns:
            PIL字体对象或None
        """
        # 1. 尝试从映射表查找
        if font_name in self.FONT_MAP:
            for filename in self.FONT_MAP[font_name]:
                font_path = self._system_fonts.get(filename.lower())
                if font_path and font_path.exists():
                    try:
                        return ImageFont.truetype(str(font_path), size)
                    except Exception:
                        continue

        # 2. 直接查找字体文件名
        font_path = self._system_fonts.get(font_name.lower())
        if font_path and font_path.exists():
            try:
                return ImageFont.truetype(str(font_path), size)
            except Exception:
                pass

        # 3. 尝试直接用文件名
        for system_path in self._system_fonts.values():
            if font_name.lower() in system_path.name.lower():
                try:
                    return ImageFont.truetype(str(system_path), size)
                except Exception:
                    continue

        return None

    def wrap_text(
        self,
        text: str,
        font: ImageFont.FreeTypeFont,
        max_width: int
    ) -> List[str]:
        """
        自动换行

        Args:
            text: 文本内容
            font: 字体对象
            max_width: 最大宽度（像素）

        Returns:
            换行后的文本列表
        """
        lines = []
        words = list(text)  # 中文按字符分割

        current_line = []

        for word in words:
            test_line = ''.join(current_line + [word])

            # 获取文本宽度
            bbox = font.getbbox(test_line)
            text_width = bbox[2] - bbox[0]

            if text_width <= max_width:
                current_line.append(word)
            else:
                if current_line:
                    lines.append(''.join(current_line))
                current_line = [word]

        if current_line:
            lines.append(''.join(current_line))

        return lines

    def calculate_text_size(
        self,
        text: str,
        font: ImageFont.FreeTypeFont,
        spacing: int = 0
    ) -> Tuple[int, int]:
        """
        计算文本尺寸

        Args:
            text: 文本内容
            font: 字体对象
            spacing: 字间距

        Returns:
            (width, height)
        """
        lines = text.split('\n')
        max_width = 0
        total_height = 0

        for i, line in enumerate(lines):
            bbox = font.getbbox(line)
            line_width = bbox[2] - bbox[0]
            line_height = bbox[3] - bbox[1]

            max_width = max(max_width, line_width + len(line) * spacing)
            total_height += line_height

        # 添加行间距
        if len(lines) > 1:
            total_height += (len(lines) - 1) * line_height * 0.2

        return int(max_width), int(total_height)

    def get_text_position(
        self,
        text_width: int,
        text_height: int,
        x: int,
        y: int,
        anchor: str
    ) -> Tuple[int, int]:
        """
        根据锚点计算文本绘制位置

        Args:
            text_width: 文本宽度
            text_height: 文本高度
            x: 目标X坐标
            y: 目标Y坐标
            anchor: 锚点 (left/center/right/middle/top/bottom)

        Returns:
            (x, y): 实际绘制坐标
        """
        # 水平锚点
        if 'left' in anchor:
            pos_x = x
        elif 'right' in anchor:
            pos_x = x - text_width
        else:  # center
            pos_x = x - text_width // 2

        # 垂直锚点
        if 'top' in anchor:
            pos_y = y
        elif 'bottom' in anchor or 'middle' in anchor:
            pos_y = y - text_height
        else:  # baseline
            pos_y = y

        return pos_x, pos_y

    def render_text(
        self,
        image: Image.Image,
        element_config: Dict,
        variables: Dict[str, str],
        template_engine
    ) -> Image.Image:
        """
        渲染单个文字元素

        Args:
            image: PIL图片对象
            element_config: 元素配置
            variables: 变量字典
            template_engine: 模板引擎实例

        Returns:
            渲染后的图片
        """
        # 1. 检查元素类型
        element_type = element_config.get('type')

        if element_type == 'decoration':
            # 渲染装饰元素
            return self._render_decoration(image, element_config, template_engine)

        # 2. 检查可选元素
        if element_type == 'optional':
            required = element_config.get('required', True)
            if not required:
                content = element_config.get('content', '')
                content = template_engine.replace_variables(content, variables)
                if not content or content == '{{subtitle}}' and not variables.get('subtitle'):
                    # 跳过可选元素
                    return image

        # 3. 获取文本内容
        content = element_config.get('content', '')
        content = template_engine.replace_variables(content, variables)

        if not content:
            return image

        # 4. 获取字体配置
        font_config = element_config.get('font', {})
        font_family = font_config.get('family', ['Microsoft YaHei', 'sans-serif'])
        font_size = font_config.get('size', 40)
        font_weight = font_config.get('weight', 'normal')

        # 5. 加载字体
        font = self.load_font(font_family, font_size, font_weight)

        # 6. 获取位置配置
        position_config = element_config.get('position', {})
        image_width, image_height = image.size
        x, y, anchor = template_engine.parse_position(
            position_config,
            image_width,
            image_height
        )

        # 7. 获取换行配置
        wrap_config = element_config.get('wrap', {})

        if wrap_config.get('enabled', True):
            max_width_str = wrap_config.get('max_width', '80%')
            max_width = template_engine.parse_size(max_width_str, image_width)
            max_lines = wrap_config.get('max_lines', 3)
            line_height = wrap_config.get('line_height', 1.3)
            align = wrap_config.get('align', 'center')

            # 自动换行
            lines = self.wrap_text(content, font, max_width)

            # 限制行数
            if len(lines) > max_lines:
                lines = lines[:max_lines]
                # 如果超出，添加省略号
                if len(lines[-1]) > 3:
                    lines[-1] = lines[-1][:-3] + '...'

            # 计算总高度
            line_bbox = font.getbbox('测')
            single_line_height = line_bbox[3] - line_bbox[1]
            total_height = int(single_line_height * line_height * len(lines))

            # 计算每行宽度
            line_widths = []
            for line in lines:
                bbox = font.getbbox(line)
                line_widths.append(bbox[2] - bbox[0])

            max_text_width = max(line_widths) if line_widths else 0

            # 计算起始位置
            pos_x, pos_y = self.get_text_position(
                max_text_width,
                total_height,
                x,
                y,
                anchor
            )

            # 8. 创建绘制对象
            draw = ImageDraw.Draw(image)

            # 9. 绘制每一行
            current_y = pos_y
            for i, line in enumerate(lines):
                line_width = line_widths[i]

                # 水平对齐
                if align == 'center':
                    line_x = pos_x + (max_text_width - line_width) // 2
                elif align == 'right':
                    line_x = pos_x + (max_text_width - line_width)
                else:  # left
                    line_x = pos_x

                # 绘制阴影（如果启用）
                effects = element_config.get('effects', {})
                shadow_config = effects.get('shadow', {})

                if isinstance(shadow_config, dict) and shadow_config.get('enabled', False):
                    shadow_color = shadow_config.get('color', 'rgba(0,0,0,0.5)')
                    shadow_offset_x = shadow_config.get('offset_x', 4)
                    shadow_offset_y = shadow_config.get('offset_y', 4)

                    # 解析颜色为RGBA元组
                    shadow_rgba = self._parse_color(shadow_color)

                    # 如果有透明度，需要创建临时图层
                    if shadow_rgba[3] < 255:
                        temp = Image.new('RGBA', image.size, (0, 0, 0, 0))
                        temp_draw = ImageDraw.Draw(temp)
                        temp_draw.text(
                            (line_x + shadow_offset_x, current_y + shadow_offset_y),
                            line,
                            font=font,
                            fill=shadow_rgba
                        )
                        # 合并到原图
                        image = Image.alpha_composite(
                            image.convert('RGBA'),
                            temp
                        ).convert(image.mode)
                        draw = ImageDraw.Draw(image)
                    else:
                        # 不透明，直接绘制
                        draw.text(
                            (line_x + shadow_offset_x, current_y + shadow_offset_y),
                            line,
                            font=font,
                            fill=shadow_rgba[:3]  # RGB only for non-transparent
                        )

                # 绘制描边（如果启用）
                stroke_config = effects.get('stroke', {})
                if isinstance(stroke_config, dict) and stroke_config.get('enabled', False):
                    stroke_color = stroke_config.get('color', '#000000')
                    stroke_width = stroke_config.get('width', 2)

                    draw.text(
                        (line_x, current_y),
                        line,
                        font=font,
                        fill=stroke_color,
                        stroke_width=stroke_width
                    )

                # 绘制主文字
                font_color = font_config.get('color', '#000000')
                draw.text(
                    (line_x, current_y),
                    line,
                    font=font,
                    fill=font_color
                )

                # 移动到下一行
                current_y += int(single_line_height * line_height)

        else:
            # 不换行，直接绘制
            pos_x, pos_y = self.get_text_position(
                font.getlength(content),
                font_size,
                x,
                y,
                anchor
            )

            draw = ImageDraw.Draw(image)

            # 绘制阴影
            effects = element_config.get('effects', {})
            shadow_config = effects.get('shadow', {})
            if isinstance(shadow_config, dict) and shadow_config.get('enabled', False):
                shadow_offset_x = shadow_config.get('offset_x', 4)
                shadow_offset_y = shadow_config.get('offset_y', 4)
                shadow_color = shadow_config.get('color', 'rgba(0,0,0,0.5)')

                # 解析颜色为RGBA元组
                shadow_rgba = self._parse_color(shadow_color)

                # 如果有透明度，需要创建临时图层
                if shadow_rgba[3] < 255:
                    temp = Image.new('RGBA', image.size, (0, 0, 0, 0))
                    temp_draw = ImageDraw.Draw(temp)
                    temp_draw.text(
                        (pos_x + shadow_offset_x, pos_y + shadow_offset_y),
                        content,
                        font=font,
                        fill=shadow_rgba
                    )
                    # 合并到原图
                    image = Image.alpha_composite(
                        image.convert('RGBA'),
                        temp
                    ).convert(image.mode)
                    draw = ImageDraw.Draw(image)
                else:
                    # 不透明，直接绘制
                    draw.text(
                        (pos_x + shadow_offset_x, pos_y + shadow_offset_y),
                        content,
                        font=font,
                        fill=shadow_rgba[:3]  # RGB only
                    )

            # 绘制主文字
            font_color = font_config.get('color', '#000000')
            draw.text(
                (pos_x, pos_y),
                content,
                font=font,
                fill=font_color
            )

        return image

    def _render_decoration(
        self,
        image: Image.Image,
        element_config: Dict,
        template_engine
    ) -> Image.Image:
        """
        渲染装饰元素

        Args:
            image: PIL图片对象
            element_config: 元素配置
            template_engine: 模板引擎实例

        Returns:
            渲染后的图片
        """
        style = element_config.get('style', {})
        dec_type = style.get('type', 'line')

        draw = ImageDraw.Draw(image)

        if dec_type == 'line':
            # 绘制线条
            position_config = element_config.get('position', {})
            x, y, anchor = template_engine.parse_position(
                position_config,
                image.width,
                image.height
            )

            width = style.get('width', 100)
            height = style.get('height', 2)
            color = style.get('color', '#000000')

            # 计算线条矩形
            x1 = x - width // 2
            y1 = y - height // 2
            x2 = x + width // 2
            y2 = y + height // 2

            draw.rectangle([x1, y1, x2, y2], fill=color)

        elif dec_type == 'rounded_rectangle':
            # 绘制圆角矩形
            position_config = element_config.get('position', {})
            x, y, anchor = template_engine.parse_position(
                position_config,
                image.width,
                image.height
            )

            width = style.get('width', 200)
            height = style.get('height', 60)
            bg_color = style.get('background', 'rgba(255,255,255,0.2)')
            border_color = style.get('border_color', '#FFFFFF')
            border_width = style.get('border_width', 2)
            corner_radius = style.get('corner_radius', 10)

            # 计算矩形坐标
            x1 = x - width // 2
            y1 = y - height // 2
            x2 = x + width // 2
            y2 = y + height // 2

            # 绘制圆角矩形
            from PIL import Image, ImageDraw
            draw = ImageDraw.Draw(image)

            # 简化版圆角矩形
            draw.rounded_rectangle(
                [x1, y1, x2, y2],
                radius=corner_radius,
                fill=self._parse_color(bg_color),
                outline=self._parse_color(border_color),
                width=border_width
            )

        elif dec_type == 'brackets':
            # 绘制角标
            color = style.get('color', '#000000')
            line_width = style.get('width', 3)
            corner_size = style.get('corner_size', 60)
            padding = style.get('padding', 50)

            draw = ImageDraw.Draw(image)

            # 左上角
            draw.line([
                (padding, padding + corner_size),
                (padding, padding),
                (padding + corner_size, padding)
            ], fill=color, width=line_width)

            # 右上角
            draw.line([
                (image.width - padding - corner_size, padding),
                (image.width - padding, padding),
                (image.width - padding, padding + corner_size)
            ], fill=color, width=line_width)

            # 左下角
            draw.line([
                (padding, image.height - padding - corner_size),
                (padding, image.height - padding),
                (padding + corner_size, image.height - padding)
            ], fill=color, width=line_width)

            # 右下角
            draw.line([
                (image.width - padding - corner_size, image.height - padding),
                (image.width - padding, image.height - padding),
                (image.width - padding, image.height - padding - corner_size)
            ], fill=color, width=line_width)

        return image

    def _parse_color(self, color_str: str) -> Tuple:
        """
        解析颜色字符串

        Args:
            color_str: 颜色字符串 (hex或rgba)

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
            match = re.match(r'rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)', color_str)
            if match:
                r = int(match.group(1))
                g = int(match.group(2))
                b = int(match.group(3))
                a = float(match.group(4)) if match.group(4) else 1.0
                return (r, g, b, int(a * 255))

        # 默认黑色
        return (0, 0, 0, 255)


def main():
    """主程序 - 文字渲染测试"""
    print("文字渲染器模块")
    print("此模块将被template_engine.py调用")


if __name__ == "__main__":
    main()
