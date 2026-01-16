"""
智能裁剪模块 - 支持多种裁剪模式
"""

import os
from enum import Enum
from pathlib import Path
from typing import Dict, List, Literal, Optional, Tuple

from PIL import Image


class CropMode(Enum):
    CENTER = "center"
    GOLDEN_RATIO = "golden_ratio"
    SMART = "smart"
    TOP_HEAVY = "top_heavy"


CROP_PRESETS = {
    "wechat-cover": (900, 383),
    "wechat-share": (900, 900),
    "wechat-banner": (1080, 460),
    "article-16-9": (1792, 1024),
    "article-1-1": (1024, 1024),
}


def calculate_center_crop(
    original_width: int,
    original_height: int,
    target_width: int,
    target_height: int,
) -> Tuple[int, int, int, int]:
    left = (original_width - target_width) // 2
    top = (original_height - target_height) // 2
    right = left + target_width
    bottom = top + target_height

    left = max(0, left)
    top = max(0, top)
    right = min(original_width, right)
    bottom = min(original_height, bottom)

    return left, top, right, bottom


def calculate_golden_ratio_crop(
    original_width: int,
    original_height: int,
    target_width: int,
    target_height: int,
) -> Tuple[int, int, int, int]:
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


def calculate_smart_crop(
    original_width: int,
    original_height: int,
    target_width: int,
    target_height: int,
) -> Tuple[int, int, int, int]:
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


def calculate_top_heavy_crop(
    original_width: int,
    original_height: int,
    target_width: int,
    target_height: int,
) -> Tuple[int, int, int, int]:
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
        y_offset = 0

    right = min(x_offset + crop_width, original_width)
    bottom = min(y_offset + crop_height, original_height)
    left = max(0, right - target_width)
    top = max(0, bottom - target_height)

    return left, top, right, bottom


def crop_image(
    image: Image.Image,
    target_width: int,
    target_height: int,
    mode: CropMode = CropMode.SMART,
) -> Image.Image:
    original_width, original_height = image.size

    calculators = {
        CropMode.CENTER: calculate_center_crop,
        CropMode.GOLDEN_RATIO: calculate_golden_ratio_crop,
        CropMode.SMART: calculate_smart_crop,
        CropMode.TOP_HEAVY: calculate_top_heavy_crop,
    }

    calculator = calculators.get(mode, calculate_smart_crop)
    left, top, right, bottom = calculator(
        original_width, original_height, target_width, target_height
    )

    return image.crop((left, top, right, bottom))


def crop_to_preset(
    image_path: str,
    preset: str,
    output_path: Optional[str] = None,
    mode: CropMode = CropMode.SMART,
) -> str:
    if preset not in CROP_PRESETS:
        raise ValueError(f"Unknown preset: {preset}. Available: {list(CROP_PRESETS.keys())}")

    target_width, target_height = CROP_PRESETS[preset]

    with Image.open(image_path) as img:
        cropped = crop_image(img, target_width, target_height, mode)

        if output_path is None:
            output_path = str(Path(image_path).with_name(f"{Path(image_path).stem}_{preset}.jpg"))

        cropped.save(output_path, "JPEG", quality=95)
        return output_path


def generate_crop_variants(
    image_path: str,
    preset: str = "wechat-cover",
    modes: Optional[List[CropMode]] = None,
) -> Dict[str, str]:
    if modes is None:
        modes = [CropMode.CENTER, CropMode.GOLDEN_RATIO, CropMode.SMART]

    if preset not in CROP_PRESETS:
        raise ValueError(f"Unknown preset: {preset}")

    target_width, target_height = CROP_PRESETS[preset]
    results = {}

    with Image.open(image_path) as img:
        for mode in modes:
            mode_name = mode.value
            cropped = crop_image(img, target_width, target_height, mode)

            output_path = str(
                Path(image_path).with_name(f"{Path(image_path).stem}_{preset}_{mode_name}.jpg")
            )
            cropped.save(output_path, "JPEG", quality=95)
            results[mode_name] = output_path

    return results
