"""
一体化公众号封面生成器
集成AI生图、智能裁剪、分享卡片生成
"""

import argparse
import json
import os
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests
from PIL import Image, ImageDraw, ImageFont
import yaml

# 导入风格提示词构建器
import sys
from pathlib import Path
image_gen_scripts = Path(__file__).parent.parent.parent / "image-generation" / "scripts"
sys.path.insert(0, str(image_gen_scripts))
from style_prompt_builder import StylePromptBuilder, build_prompt as build_style_prompt

# 导入模板系统
template_scripts = Path(__file__).parent
sys.path.insert(0, str(template_scripts))
from template_engine import TemplateEngine
from text_renderer import TextRenderer
from background_generator import BackgroundGenerator


def load_config(config_path: Optional[str] = None) -> Dict[str, Any]:
    """
    加载配置文件

    Args:
        config_path: 配置文件路径，如果为None则使用默认路径

    Returns:
        配置字典
    """
    # 默认配置文件路径
    if config_path is None:
        config_path = Path(__file__).parent.parent.parent / "image-generation" / "config" / "config.yaml"

    config_file = Path(config_path)

    # 如果配置文件不存在，返回空配置
    if not config_file.exists():
        return {}

    # 读取YAML配置文件
    try:
        with open(config_file, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)
            return config or {}
    except Exception as e:
        print(f"警告：读取配置文件失败 ({e})")
        return {}


def get_api_key(config_path: Optional[str] = None) -> Optional[str]:
    """
    获取API密钥

    优先级：命令行参数 > 配置文件 > 环境变量

    Args:
        config_path: 配置文件路径

    Returns:
        API密钥字符串或None
    """
    # 先尝试从配置文件读取
    config = load_config(config_path)
    if 'api' in config and 'api_key' in config['api']:
        api_key = config['api']['api_key']
        # 检查是否是占位符
        if api_key and api_key != "your_doubao_api_key_here":
            return api_key

    # 再尝试从环境变量读取
    return os.getenv("DOUBAO_API_KEY")


CROP_PRESETS = {
    "wechat-cover": (900, 383),
    "wechat-share": (900, 900),
    "wechat-banner": (1080, 460),
    "article-16-9": (1792, 1024),
    "article-1-1": (1024, 1024),
}


class CropMode:
    CENTER = "center"
    GOLDEN_RATIO = "golden_ratio"
    SMART = "smart"
    TOP_HEAVY = "top_heavy"


def calculate_center_crop(original_width, original_height, target_width, target_height):
    """
    改进的center裁剪算法
    - 对于宽屏目标（宽高比>1.5），向上偏移20%（因为标题文字通常在上方）
    - 对于其他比例，使用正中心裁剪
    """
    left = (original_width - target_width) // 2

    # 计算目标宽高比
    target_ratio = target_width / target_height

    # 如果目标是宽屏（宽高比>1.5），向上偏移
    if target_ratio > 1.5:
        # 向上偏移20%，确保标题文字完整显示
        vertical_offset = int((original_height - target_height) * 0.2)
        top = vertical_offset
    else:
        # 其他情况使用正中心
        top = (original_height - target_height) // 2

    right = left + target_width
    bottom = top + target_height

    left = max(0, left)
    top = max(0, top)
    right = min(original_width, right)
    bottom = min(original_height, bottom)

    return left, top, right, bottom


def calculate_golden_ratio_crop(original_width, original_height, target_width, target_height):
    golden_ratio = 0.618
    aspect_ratio = target_width / target_height

    if original_width / original_height > aspect_ratio:
        new_height = original_height
        new_width = int(new_height * aspect_ratio)
        y_offset = 0
        x_offset = int((original_width - new_width) * golden_ratio)
    else:
        new_width = original_width
        new_height = int(new_width / aspect_ratio)
        x_offset = 0
        y_offset = int((original_height - new_height) * golden_ratio)

    right = min(x_offset + new_width, original_width)
    bottom = min(y_offset + new_height, original_height)
    left = max(0, right - target_width)
    top = max(0, bottom - target_height)

    if right - left < target_width:
        left = max(0, right - target_width)
        right = left + target_width
    if bottom - top < target_height:
        top = max(0, bottom - target_height)
        bottom = top + target_height

    return left, top, right, bottom


def calculate_smart_crop(original_width, original_height, target_width, target_height):
    aspect_ratio = target_width / target_height

    if original_width / original_height > aspect_ratio:
        crop_height = original_height
        crop_width = int(crop_height * aspect_ratio)
        y_offset = 0
        x_offset = (original_width - crop_width) // 2
    else:
        crop_width = original_width
        crop_height = int(crop_width / aspect_ratio)
        x_offset = 0
        y_offset = (original_height - crop_height) // 4

    right = min(x_offset + crop_width, original_width)
    bottom = min(y_offset + crop_height, original_height)
    left = max(0, right - target_width)
    top = max(0, bottom - target_height)

    return left, top, right, bottom


def crop_image(image, target_width, target_height, mode="smart"):
    original_width, original_height = image.size
    original_ratio = original_width / original_height
    target_ratio = target_width / target_height

    # 如果原始比例与目标比例接近（差异<5%），直接缩放不裁剪
    ratio_diff = abs(original_ratio - target_ratio) / target_ratio
    if ratio_diff < 0.05:
        print(f"  比例匹配（差异{ratio_diff*100:.1f}%），直接缩放不裁剪")
        return image.resize((target_width, target_height), Image.Resampling.LANCZOS)

    # 否则按模式裁剪
    calculators = {
        "center": calculate_center_crop,
        "golden_ratio": calculate_golden_ratio_crop,
        "smart": calculate_smart_crop,
    }

    calculator = calculators.get(mode, calculate_smart_crop)
    left, top, right, bottom = calculator(
        original_width, original_height, target_width, target_height
    )

    print(f"  比例不匹配（差异{ratio_diff*100:.1f}%），执行{mode}模式裁剪")
    return image.crop((left, top, right, bottom))


def crop_to_preset(image_path, preset, output_path=None, mode="smart"):
    if preset not in CROP_PRESETS:
        raise ValueError(f"Unknown preset: {preset}. Available: {list(CROP_PRESETS.keys())}")

    target_width, target_height = CROP_PRESETS[preset]

    with Image.open(image_path) as img:
        cropped = crop_image(img, target_width, target_height, mode)

        if output_path is None:
            output_path = str(Path(image_path).with_name(f"{Path(image_path).stem}_{preset}.jpg"))

        cropped.save(output_path, "JPEG", quality=95)
        return output_path


def generate_crop_variants(image_path, preset="wechat-cover", modes=None):
    if modes is None:
        modes = ["center", "golden_ratio", "smart"]

    if preset not in CROP_PRESETS:
        raise ValueError(f"Unknown preset: {preset}")

    target_width, target_height = CROP_PRESETS[preset]
    results = {}

    with Image.open(image_path) as img:
        for mode in modes:
            cropped = crop_image(img, target_width, target_height, mode)

            output_path = str(
                Path(image_path).with_name(f"{Path(image_path).stem}_{preset}_{mode}.jpg")
            )
            cropped.save(output_path, "JPEG", quality=95)
            results[mode] = output_path

    return results


def create_preview_grid(cover_image_path, variants, output_path=None):
    base_size = (400, 400)

    images = []
    for name, path in variants.items():
        with Image.open(path) as img:
            img = img.resize(base_size, Image.Resampling.LANCZOS)
            images.append((name, img))

    cols = len(images) if images else 1
    cell_width = 400
    cell_height = 400
    padding = 20

    grid_width = cols * cell_width + (cols + 1) * padding
    grid_height = cell_height + (cols + 1) * padding + 60

    grid = Image.new("RGB", (grid_width, grid_height), "#F5F5F5")
    draw = ImageDraw.Draw(grid)

    label_font = None
    # 尝试加载常用字体
    font_candidates = ["simhei.ttf", "msyh.ttf", "PingFang.ttc", "Arial.ttf"]
    
    for font_name in font_candidates:
        try:
            label_font = ImageFont.truetype(font_name, 24)
            break
        except OSError:
            continue
            
    if label_font is None:
        try:
            label_font = ImageFont.load_default()
        except Exception:
            # 极端情况下的回退
            pass

    for i, (name, img) in enumerate(images):
        x = padding + i * (cell_width + padding)
        y = padding
        grid.paste(img, (x, y))

        label_y = y + cell_height + 10
        bbox = draw.textbbox((0, 0), name, font=label_font)
        label_x = x + (cell_width - (bbox[2] - bbox[0])) // 2
        draw.text((label_x, label_y), name, fill="#666666", font=label_font)

    if output_path is None:
        output_path = str(
            Path(cover_image_path).with_name(f"{Path(cover_image_path).stem}_preview.jpg")
        )

    grid.save(output_path, "JPEG", quality=90)
    return output_path


def sanitize_filename(title: str, max_length: int = 100) -> str:
    """
    清理文件名

    Args:
        title: 原始标题
        max_length: 最大长度限制

    Returns:
        清理后的文件名
    """
    # 移除或替换特殊字符（包括中文标点和空白字符）
    clean = re.sub(r'[/:\\?*"<>|，。！？、；：""''（）【】《》\\s]', '_', title)

    # 限制长度
    if len(clean) > max_length:
        clean = clean[:max_length]

    # 移除首尾空格和下划线
    clean = clean.strip('_ ')

    # 确保不为空
    if not clean:
        clean = "cover"

    return clean


def find_project_path(search_path: str = ".") -> Optional[str]:
    """
    查找公众号项目目录（包含assets/images文件夹的目录）

    Args:
        search_path: 搜索起始路径

    Returns:
        找到的项目路径，如果未找到则返回None
    """
    search_path = Path(search_path).absolute()

    # 限制搜索深度，避免遍历整个文件系统
    max_depth = 5

    for root, dirs, files in os.walk(str(search_path)):
        # 检查搜索深度
        current_depth = len(Path(root).relative_to(search_path).parts)
        if current_depth > max_depth:
            continue

        # 查找包含assets/images的目录
        if "assets" in dirs:
            assets_path = Path(root) / "assets"
            if assets_path.exists() and (assets_path / "images").exists():
                # 找到了，返回这个目录
                return str(root)

    return None


class CoverGenerator:
    def __init__(self, api_key: Optional[str] = None, config_path: Optional[str] = None):
        # 优先使用传入的api_key，否则从配置文件或环境变量读取
        if api_key is None:
            api_key = get_api_key(config_path)

        if api_key is None or not api_key.strip():
            raise ValueError(
                "未找到API密钥！请通过以下方式之一配置：\n"
                "1. 在配置文件中设置：.claude/skills/image-generation/config/config.yaml\n"
                "2. 设置环境变量：export DOUBAO_API_KEY=你的密钥\n"
                "3. 使用命令行参数：--api-key 你的密钥"
            )

        self.api_key = api_key
        self.base_url = "https://ark.cn-beijing.volces.com/api/v3"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def generate_image(self, prompt: str, size: str = "1792x1024", quality: str = "hd") -> str:
        endpoint = f"{self.base_url}/images/generations"
        payload = {
            "model": "doubao-seedream-4-5-251128",
            "prompt": prompt,
            "size": size,
            "quality": quality,
            "n": 1,
        }

        response = requests.post(endpoint, headers=self.headers, json=payload, timeout=60)

        # 打印详细的错误信息
        if response.status_code != 200:
            print(f"\nAPI调用失败！")
            print(f"状态码: {response.status_code}")
            print(f"响应内容: {response.text}")
            print(f"\n请求参数:")
            print(f"  模型: {payload.get('model')}")
            print(f"  提示词长度: {len(prompt)} 字符")
            print(f"  尺寸: {payload.get('size')}")
            print(f"  质量: {payload.get('quality')}")

        response.raise_for_status()
        data = response.json()

        if "data" in data and len(data["data"]) > 0:
            return data["data"][0]["url"]
        else:
            raise ValueError("No image URL in response")

    def download_image(self, url: str, output_path: str) -> str:
        response = requests.get(url, timeout=60)
        response.raise_for_status()

        output_dir = Path(output_path).parent
        output_dir.mkdir(parents=True, exist_ok=True)

        with open(output_path, "wb") as f:
            f.write(response.content)

        return output_path

    def copy_to_project(
        self,
        result: Dict[str, Any],
        project_path: str,
        title: str
    ) -> List[str]:
        """
        复制生成的文件到项目 assets 文件夹

        Args:
            result: generate_cover返回的结果字典
            project_path: 公众号项目路径
            title: 文章标题

        Returns:
            复制的文件路径列表
        """
        assets_dir = Path(project_path) / "assets" / "images"
        assets_dir.mkdir(parents=True, exist_ok=True)

        # 清理文件名
        safe_title = sanitize_filename(title)
        copied_files = []

        # 复制封面图（优先使用center模式，如果不存在则使用其他可用模式）
        variants = result.get("variants", {}).get("wechat-cover", {})
        # 优先级：center > smart > golden_ratio
        cover_to_copy = variants.get("center") or variants.get("smart") or variants.get("golden_ratio")

        if cover_to_copy and Path(cover_to_copy).exists():
            target = assets_dir / f"{safe_title}_cover.jpg"
            shutil.copy(cover_to_copy, target)
            copied_files.append(str(target))

        # 复制分享卡片
        share_card = result.get("files", {}).get("share_card")
        if share_card and Path(share_card).exists():
            target = assets_dir / f"{safe_title}_share.jpg"
            shutil.copy(share_card, target)
            copied_files.append(str(target))

        # 复制预览图
        preview = result.get("files", {}).get("preview")
        if preview and Path(preview).exists():
            target = assets_dir / f"{safe_title}_preview.jpg"
            shutil.copy(preview, target)
            copied_files.append(str(target))

        return copied_files

    def generate_cover(
        self,
        prompt: str,
        style: str = "auto",
        crop_mode: str = "smart",
        generate_share_card: bool = True,
        generate_variants: bool = True,
        project_path: Optional[str] = None,
        title: Optional[str] = None,
    ) -> Dict[str, Any]:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_dir = Path(f"output/cover_{timestamp}")
        base_dir.mkdir(parents=True, exist_ok=True)

        result = {
            "timestamp": timestamp,
            "prompt": prompt,
            "style": style,
            "crop_mode": crop_mode,
            "files": {},
            "variants": {},
        }

        print(f"正在生成底图...")
        print(f"提示词: {prompt}")

        # 直接生成2.35:1比例，避免裁剪损失
        # 3072x1306 = 4,012,032像素，满足豆包API最低要求(3,686,400)
        # 比例 3072/1306 ≈ 2.353，非常接近目标2.35:1
        image_url = self.generate_image(prompt, "3072x1306", "hd")

        raw_path = base_dir / "raw_image.jpg"
        self.download_image(image_url, str(raw_path))
        result["files"]["raw"] = str(raw_path)

        print(f"底图已保存: {raw_path}")

        crop_modes = [crop_mode] if crop_mode != "all" else ["center", "golden_ratio", "smart"]

        preset = "wechat-cover"
        result["variants"][preset] = {}

        for mode in crop_modes:
            mode_name = mode
            output_name = f"cover_{preset}_{mode_name}.jpg"
            output_path = base_dir / output_name

            try:
                cropped_path = crop_to_preset(
                    str(raw_path),
                    preset,
                    str(output_path),
                    mode=mode,
                )
                result["variants"][preset][mode_name] = cropped_path
                print(f"已生成 {preset} ({mode_name}): {cropped_path}")
            except Exception as e:
                print(f"生成 {preset} ({mode_name}) 失败: {e}")

        if generate_share_card:
            share_preset = "wechat-share"
            share_output = base_dir / f"cover_{share_preset}.jpg"

            try:
                share_path = crop_to_preset(
                    str(raw_path),
                    share_preset,
                    str(share_output),
                    mode="smart",
                )
                result["files"]["share_card"] = share_path
                print(f"已生成分享卡片: {share_path}")
            except Exception as e:
                print(f"生成分享卡片失败: {e}")

        if generate_variants and result["variants"]:
            preview_path = base_dir / "preview_grid.jpg"
            try:
                all_variants = {}
                for mode_dict in result["variants"].values():
                    all_variants.update(mode_dict)

                preview = create_preview_grid(
                    str(raw_path),
                    all_variants,
                    str(preview_path),
                )
                result["files"]["preview"] = preview
                print(f"已生成预览图: {preview}")
            except Exception as e:
                print(f"生成预览图失败: {e}")

        result_file = base_dir / "result.json"
        with open(result_file, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        print(f"\n结果已保存: {result_file}")

        # 如果指定了项目路径且有标题，复制文件到项目
        if project_path and title:
            try:
                copied_files = self.copy_to_project(result, project_path, title)
                result["copied_to_project"] = copied_files
                if copied_files:
                    print(f"\n已复制 {len(copied_files)} 个文件到项目 assets 文件夹:")
                    for file_path in copied_files:
                        print(f"  - {file_path}")
            except Exception as e:
                print(f"\n警告：复制文件到项目失败 ({e})")

        return result

    def generate_with_template(
        self,
        title: str,
        template_id: str = "center_title",
        subtitle: str = "",
        variant: Optional[str] = None,
        generate_share_card: bool = False,
        generate_variants: bool = False,
        project_path: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        使用模板系统生成封面

        Args:
            title: 文章标题
            template_id: 模板ID
            subtitle: 副标题
            variant: 样式变体名称
            generate_share_card: 是否生成分享卡片
            generate_variants: 是否生成多方案预览
            project_path: 公众号项目路径（用于自动复制）

        Returns:
            生成结果字典
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        base_dir = Path(f"output/cover_{timestamp}")
        base_dir.mkdir(parents=True, exist_ok=True)

        result = {
            "timestamp": timestamp,
            "template_id": template_id,
            "variant": variant,
            "files": {},
            "variants": {},
        }

        try:
            # 1. 初始化模板引擎
            template_engine = TemplateEngine()
            text_renderer = TextRenderer()
            background_generator = BackgroundGenerator(image_generator=self)

            # 2. 获取模板配置
            template_result = template_engine.render(
                template_id=template_id,
                title=title,
                subtitle=subtitle,
                variant=variant
            )

            if not template_result:
                raise ValueError(f"模板渲染失败: {template_id}")

            template = template_result['template']
            variables = template_result['variables']

            print(f"使用模板: {template['template']['name']} ({template_id})")
            if variant:
                print(f"使用变体: {variant}")

            # 3. 生成背景图
            background_config = template['template']['background']
            size_str = background_config.get('size', '3072x1306')
            size = template_engine.parse_image_size(size_str)

            print(f"正在生成背景图...")
            print(f"背景类型: {background_config['type']}")
            print(f"目标尺寸: {size[0]}x{size[1]}")

            background_image = background_generator.generate(
                background_config,
                size
            )

            if background_image is None:
                raise ValueError("背景生成失败")

            # 4. 应用叠加层（如果有）
            overlay_config = template['template'].get('overlay')
            if overlay_config and overlay_config.get('enabled', False):
                print(f"应用叠加层...")
                background_image = background_generator.apply_overlay(
                    background_image,
                    overlay_config
                )

            # 5. 渲染文字元素
            print(f"正在渲染文字...")
            elements = template['template'].get('elements', [])

            for element in elements:
                # 检查是否是可选元素且没有内容
                if element.get('type') == 'optional':
                    required = element.get('required', True)
                    if not required:
                        content = element.get('content', '')
                        content = template_engine.replace_variables(content, variables)
                        if not content or (content == '{{subtitle}}' and not subtitle):
                            # 跳过此元素
                            continue

                # 渲染元素
                background_image = text_renderer.render_text(
                    background_image,
                    element,
                    variables,
                    template_engine
                )

            # 6. 保存原始图片
            raw_path = base_dir / "raw_image.jpg"
            background_image.convert('RGB').save(raw_path, "JPEG", quality=95)
            result["files"]["raw"] = str(raw_path)
            print(f"已保存: {raw_path}")

            # 7. 生成微信封面尺寸
            # 模板系统直接生成目标尺寸，不需要裁剪
            target_width, target_height = 900, 383  # 微信封面标准尺寸

            # 调整到目标尺寸
            cover_path = base_dir / "cover_wechat-cover_template.jpg"
            resized = background_image.resize((target_width, target_height), Image.Resampling.LANCZOS)
            resized.convert('RGB').save(cover_path, "JPEG", quality=95)

            result["variants"]["wechat-cover"] = {
                "template": str(cover_path)
            }
            print(f"已生成微信封面: {cover_path}")

            # 8. 保存结果
            result_file = base_dir / "result.json"
            with open(result_file, "w", encoding="utf-8") as f:
                json.dump(result, f, ensure_ascii=False, indent=2)

            # 9. 复制到项目（如果指定）
            if project_path and title:
                try:
                    copied_files = self.copy_to_project(result, project_path, title)
                    result["copied_to_project"] = copied_files
                    if copied_files:
                        print(f"\n已复制 {len(copied_files)} 个文件到项目 assets 文件夹:")
                        for file_path in copied_files:
                            print(f"  - {file_path}")
                except Exception as e:
                    print(f"\n警告：复制文件到项目失败 ({e})")

            return result

        except Exception as e:
            print(f"\n模板生成失败: {e}")
            import traceback
            traceback.print_exc()
            raise

    def generate_with_style(
        self,
        title: str,
        style: str = "auto",
        subtitle: str = "",
        scene_type: str = "cover",
        crop_mode: str = "center",  # 默认改为center，确保内容居中
        generate_share_card: bool = True,
        generate_variants: bool = True,
        project_path: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        使用风格系统生成封面

        Args:
            title: 文章标题
            style: 风格 (tech/fresh/minimal/warm/business/auto)
            subtitle: 副标题
            scene_type: 场景类型 (cover/illustration)
            crop_mode: 裁剪模式
            generate_share_card: 是否生成分享卡片
            generate_variants: 是否生成多方案预览
            project_path: 公众号项目路径（用于自动复制）
            **kwargs: 其他参数

        Returns:
            生成结果字典
        """
        # 如果是auto，自动匹配风格
        if style == "auto":
            builder = StylePromptBuilder()
            style = builder.auto_match_style(title)
            print(f"自动匹配风格: {style}")

        # 使用新的简化提示词（移除装饰元素，确保文字居中）
        from style_prompt_builder import build_simple_cover_prompt
        prompt = build_simple_cover_prompt(
            title=title,
            style=style,
            subtitle=subtitle
        )

        print(f"使用风格: {style}")
        print(f"使用简化提示词（无装饰元素）")
        print(f"提示词:\n{prompt}\n")

        # 调用原有的generate_cover方法
        return self.generate_cover(
            prompt=prompt,
            style=style,
            crop_mode=crop_mode,
            generate_share_card=generate_share_card,
            generate_variants=generate_variants,
            project_path=project_path,
            title=title,
        )


def main():
    parser = argparse.ArgumentParser(
        description="公众号封面生成器 - 支持模板系统、风格系统",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
模式选择:
  1. 模板模式（推荐）: --template <模板ID>
     - 精确控制文字排版
     - AI生成背景，程序绘制文字

  2. 风格模式: --use-style --title <标题>
     - AI生成完整图片
     - 快速简单

  3. 传统模式: 直接提供提示词

模板选项:
  center_title     - 居中大标题
  left_aligned     - 左对齐标题
  top_bottom_split - 上下分区
  two_column       - 双栏布局
  minimal_text     - 极简文字
  card_style       - 卡片式
  gradient_overlay - 渐变叠加
  tech_geometric   - 科技几何
  elegant_serif    - 优雅衬线

风格选项:
  tech       - 专业科技风格，适合技术文章、AI主题
  fresh      - 清新活泼风格，适合生活分享、学习笔记
  minimal    - 简约极简风格，适合哲学思考、深度观点
  warm       - 温暖治愈风格，适合情感文章、成长感悟
  business   - 商务专业风格，适合商业分析、数据报告
  auto       - 自动匹配风格（默认）

示例:
  # 使用模板系统（推荐）
  python cover_generator.py --template center_title --title "智谱上市579亿" --variant "清新风格"

  # 查看所有模板
  python cover_generator.py --list-templates

  # 使用风格系统
  python cover_generator.py --use-style --title "智谱上市579亿" --style tech --subtitle "GLM-4.7实测"

  # 使用传统提示词
  python cover_generator.py "科技感渐变背景，中央有公司Logo"
        """
    )

    # 基础参数
    parser.add_argument("prompt", nargs="?", help="传统提示词（不使用模板或风格系统时）")

    # 模板系统参数
    parser.add_argument("--template", help="使用模板系统生成（指定模板ID）")
    parser.add_argument("--variant", help="模板样式变体")
    parser.add_argument("--list-templates", action="store_true", help="列出所有可用模板")

    # 风格系统参数
    parser.add_argument("--use-style", action="store_true", help="启用风格系统（不推荐，建议使用模板系统）")
    parser.add_argument("--title", help="文章标题（使用模板或风格系统时）")
    parser.add_argument("--subtitle", help="副标题（可选）")
    parser.add_argument("--style",
                       choices=["tech", "fresh", "minimal", "warm", "business", "auto"],
                       default="auto",
                       help="风格模板（默认: auto，仅在使用--use-style时有效）")
    parser.add_argument("--scene-type",
                       choices=["cover", "illustration"],
                       default="cover",
                       help="场景类型（默认: cover，仅在使用--use-style时有效）")

    # 生成参数
    parser.add_argument("--crop-mode",
                       choices=["center", "golden_ratio", "smart", "all"],
                       default="center",
                       help="裁剪模式（默认: center，仅在使用--use-style时有效）")
    parser.add_argument("--share-card", action="store_true", help="生成分享卡片")
    parser.add_argument("--no-variants", action="store_true", help="不生成多方案预览")
    parser.add_argument("--config",
                       help="配置文件路径（默认：.claude/skills/image-generation/config/config.yaml）")
    parser.add_argument("--api-key", help="豆包API密钥（优先级高于配置文件）")

    # 项目路径参数
    parser.add_argument("--project-path", help="公众号项目路径（自动复制封面到assets/images/）")
    parser.add_argument("--auto-find", action="store_true", help="自动查找公众号项目目录")

    args = parser.parse_args()

    # 处理 --list-templates
    if args.list_templates:
        print("\n可用模板:")
        print("=" * 80)
        template_engine = TemplateEngine()
        templates = template_engine.list_templates()
        for tpl in templates:
            print(f"\n{tpl['id']}: {tpl['name']}")
            print(f"  描述: {tpl['description']}")
            print(f"  分类: {tpl['category']}")
        print("=" * 80)
        sys.exit(0)

    # 验证参数
    if args.template and not args.title:
        print("错误：使用模板系统时必须提供 --title 参数")
        print("示例: python cover_generator.py --template center_title --title \"文章标题\"")
        print("\n查看所有模板:")
        print("  python cover_generator.py --list-templates")
        sys.exit(1)

    if args.use_style and not args.title:
        print("错误：使用风格系统时必须提供 --title 参数")
        print("示例: python cover_generator.py --use-style --title \"智谱上市579亿\" --style tech")
        sys.exit(1)

    # 检查是否至少使用一种模式
    if not args.template and not args.use_style and not args.prompt:
        print("错误：请选择一种模式")
        print("\n推荐使用模板系统:")
        print("  python cover_generator.py --template center_title --title \"文章标题\"")
        print("\n查看所有模板:")
        print("  python cover_generator.py --list-templates")
        print("\n使用风格系统:")
        print("  python cover_generator.py --use-style --title \"文章标题\" --style tech")
        print("\n使用传统提示词:")
        print("  python cover_generator.py \"科技感渐变背景，中央有公司Logo\"")
        print("\n查看帮助:")
        print("  python cover_generator.py --help")
        sys.exit(1)

    generator = CoverGenerator(api_key=args.api_key, config_path=args.config)

    # 确定项目路径（优先级：命令行 > 配置文件）
    project_path = None
    if args.project_path:
        # 使用命令行指定的路径
        project_path = args.project_path
        print(f"使用指定项目路径: {project_path}")
    elif args.auto_find:
        # 自动查找项目路径
        print("正在自动查找公众号项目目录...")
        project_path = find_project_path(".")
        if project_path:
            print(f"找到项目目录: {project_path}")
        else:
            print("未找到包含 assets/images/ 的项目目录，跳过文件复制")
    else:
        # 尝试从配置文件读取
        config = load_config(args.config)
        if config.get("project", {}).get("path"):
            project_path = config["project"]["path"]
            if project_path:  # 确保不为空字符串
                print(f"从配置文件读取项目路径: {project_path}")

    try:
        if args.template:
            # 使用模板系统（推荐）
            print("=" * 80)
            print("使用模板系统生成封面")
            print("=" * 80)
            result = generator.generate_with_template(
                title=args.title,
                template_id=args.template,
                subtitle=args.subtitle or "",
                variant=args.variant,
                generate_share_card=args.share_card,
                generate_variants=not args.no_variants,
                project_path=project_path,
            )

            print("\n" + "=" * 80)
            print("生成完成！")
            print("=" * 80)
            print(f"模板: {result.get('template_id', 'N/A')}")
            if result.get('variant'):
                print(f"变体: {result.get('variant')}")

        elif args.use_style:
            # 使用风格系统
            print("=" * 80)
            print("使用风格系统生成封面")
            print("=" * 80)
            result = generator.generate_with_style(
                title=args.title,
                style=args.style,
                subtitle=args.subtitle or "",
                scene_type=args.scene_type,
                crop_mode=args.crop_mode,
                generate_share_card=args.share_card,
                generate_variants=not args.no_variants,
                project_path=project_path,
            )

            print("\n" + "=" * 80)
            print("生成完成！")
            print("=" * 80)
            print(f"风格: {result.get('style', 'N/A')}")
            print(f"生成了 {len(result.get('variants', {}).get('wechat-cover', {}))} 种裁剪方案")
        else:
            # 使用传统提示词
            print("=" * 80)
            print("使用传统提示词生成封面")
            print("=" * 80)
            result = generator.generate_cover(
                prompt=args.prompt,
                style=args.style,
                crop_mode=args.crop_mode,
                generate_share_card=args.share_card,
                generate_variants=not args.no_variants,
                project_path=project_path,
                title=None,  # 传统模式没有标题，使用None
            )

            print("\n" + "=" * 80)
            print("生成完成！")
            print("=" * 80)
            print(f"风格: {result.get('style', 'N/A')}")
            print(f"生成了 {len(result.get('variants', {}).get('wechat-cover', {}))} 种裁剪方案")

        if result.get("files", {}).get("preview"):
            print(f"\n建议查看预览图: {result['files']['preview']}")

        # 列出所有生成的文件
        print("\n生成的文件:")
        for file_type, file_path in result.get("files", {}).items():
            print(f"  [{file_type}] {file_path}")

    except Exception as e:
        print(f"\n生成失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
