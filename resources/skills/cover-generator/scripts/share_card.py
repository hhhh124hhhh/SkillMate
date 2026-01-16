"""
分享卡片生成模块 - 为公众号封面生成配套的分享卡片
"""

import os
from pathlib import Path
from typing import Any, Optional

from PIL import Image, ImageDraw, ImageFont


def create_share_card(
    cover_image_path: str,
    title: Optional[str] = None,
    author: Optional[str] = None,
    output_path: Optional[str] = None,
    style: str = "simple",
) -> str:
    with Image.open(cover_image_path) as cover_img:
        target_size = (900, 900)
        cover_img = cover_img.resize(target_size, Image.Resampling.LANCZOS)

        card = Image.new("RGB", (1080, 1080), "#FFFFFF")
        draw = ImageDraw.Draw(card)

        card.paste(cover_img, (90, 90))

        margin = 90
        current_y = 990

        if title:
            title_font_size = 48
            try:
                title_font = ImageFont.truetype("simhei.ttf", title_font_size)
            except OSError:
                title_font = ImageFont.load_default()

            title_lines = wrap_text(draw, title, 900, title_font)
            for line in title_lines:
                if current_y > 1050:
                    break
                draw.text((margin, current_y), line, fill="#333333", font=title_font)
                current_y += title_font_size + 16

        if author:
            author_font_size = 32
            try:
                author_font = ImageFont.truetype("simhei.ttf", author_font_size)
            except OSError:
                author_font = ImageFont.load_default()

            draw.text((margin, current_y), f"公众号：{author}", fill="#999999", font=author_font)

        if output_path is None:
            output_path = str(
                Path(cover_image_path).with_name(
                    f"{Path(cover_image_path).stem}_share_card.jpg"
                )
            )

        card.save(output_path, "JPEG", quality=95)
        return output_path


def wrap_text(draw: Any, text: str, max_width: int, font: Any) -> list[str]:
    words = list(text)
    lines = []
    current_line = ""

    for word in words:
        test_line = current_line + word if current_line else word
        bbox = draw.textbbox((0, 0), test_line, font=font)
        text_width = bbox[2] - bbox[0]

        if text_width <= max_width:
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line)
            current_line = word

    if current_line:
        lines.append(current_line)

    return lines if lines else [text[:10] + "..."]


def create_preview_grid(
    cover_image_path: str,
    variants: dict[str, str],
    output_path: Optional[str] = None,
) -> str:
    base_size = (400, 400)

    images = []
    for name, path in variants.items():
        with Image.open(path) as img:
            img = img.resize(base_size, Image.Resampling.LANCZOS)
            images.append((name, img))

    cols = len(images) if images else 1
    rows = 1
    cell_width = 400
    cell_height = 400
    padding = 20

    grid_width = cols * cell_width + (cols + 1) * padding
    grid_height = rows * cell_height + (rows + 1) * padding + 60

    grid = Image.new("RGB", (grid_width, grid_height), "#F5F5F5")
    draw = ImageDraw.Draw(grid)

    try:
        label_font = ImageFont.truetype("simhei.ttf", 24)
    except OSError:
        label_font = ImageFont.load_default()

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
