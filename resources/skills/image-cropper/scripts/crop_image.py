#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Image Cropper - Single Image Cropping Tool

Crops images to specified dimensions while keeping the center.
Supports custom sizes and preset dimensions for social media.

Author: Claude Code
Created: 2026-01-11
"""

import sys
import os
from pathlib import Path

# Fix encoding issues on Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

try:
    from PIL import Image
except ImportError:
    print("Error: PIL not available. Please install: pip install pillow")
    sys.exit(1)


# Preset sizes for common social media platforms
PRESET_SIZES = {
    # WeChat
    'wechat-cover': (900, 383),      # 2.35:1
    'wechat-share': (900, 900),      # 1:1
    'wechat-banner': (1080, 460),    # 2.35:1 HD

    # Social Media
    'instagram': (1080, 1080),       # 1:1
    'twitter': (1200, 675),          # 16:9
    'linkedin': (1200, 627),         # 1.91:1

    # Article Images
    'article-16-9': (1792, 1024),    # 16:9
    'article-4-3': (1024, 768),      # 4:3
    'article-1-1': (1024, 1024),     # 1:1
}


def parse_size(size_str):
    """Parse size string like '900x383' into (900, 383)"""
    try:
        width, height = map(int, size_str.lower().split('x'))
        return (width, height)
    except (ValueError, AttributeError):
        raise ValueError(f"Invalid size format: {size_str}. Use format like '900x383'")


def crop_to_center(input_path, output_path, width=None, height=None, preset=None, quality=95):
    """
    Crop image to specified size while keeping center.

    Args:
        input_path: Input image path
        output_path: Output image path
        width: Target width (or use preset)
        height: Target height (or use preset)
        preset: Preset name from PRESET_SIZES
        quality: JPEG quality (1-100)

    Returns:
        True if successful, False otherwise
    """
    try:
        # Determine target size
        if preset:
            if preset not in PRESET_SIZES:
                print(f"Available presets: {', '.join(PRESET_SIZES.keys())}")
                return False
            target_width, target_height = PRESET_SIZES[preset]
        elif width and height:
            target_width, target_height = width, height
        else:
            print("Error: Must specify either --preset or --size")
            return False

        # Open image
        img = Image.open(input_path)
        original_width, original_height = img.size

        print(f"Original size: {original_width}x{original_height}")
        print(f"Target size: {target_width}x{target_height}")

        # Calculate crop box (center crop)
        left = (original_width - target_width) // 2
        top = (original_height - target_height) // 2
        right = left + target_width
        bottom = top + target_height

        # Ensure crop box is within image bounds
        left = max(0, left)
        top = max(0, top)
        right = min(original_width, right)
        bottom = min(original_height, bottom)

        print(f"Crop region: left={left}, top={top}, right={right}, bottom={bottom}")

        # Crop
        cropped_img = img.crop((left, top, right, bottom))
        print(f"Cropped size: {cropped_img.size}")

        # Ensure output directory exists
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Save
        cropped_img.save(str(output_path), quality=quality)
        print(f"Saved to: {output_path}")

        return True

    except FileNotFoundError:
        print(f"Error: Input file not found: {input_path}")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False


def main():
    """Command line interface"""
    import argparse

    parser = argparse.ArgumentParser(
        description="Crop images to specified size while keeping center",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Crop to custom size
  python crop_image.py input.jpg --size 900x383 --output output.jpg

  # Use preset
  python crop_image.py input.jpg --preset wechat-cover --output output.jpg

  # List available presets
  python crop_image.py --list-presets
        """
    )

    parser.add_argument(
        'input',
        nargs='?',
        help='Input image path'
    )

    parser.add_argument(
        '--size',
        help='Target size (e.g., 900x383)'
    )

    parser.add_argument(
        '--preset',
        help='Use preset size',
        choices=list(PRESET_SIZES.keys())
    )

    parser.add_argument(
        '--output',
        help='Output image path'
    )

    parser.add_argument(
        '--quality',
        type=int,
        default=95,
        help='JPEG quality (1-100, default 95)'
    )

    parser.add_argument(
        '--list-presets',
        action='store_true',
        help='List all available presets'
    )

    args = parser.parse_args()

    # List presets
    if args.list_presets:
        print("Available presets:")
        for name, (w, h) in PRESET_SIZES.items():
            print(f"  {name}: {w}x{h}")
        return

    # Validate required arguments
    if not args.input or not args.output:
        parser.print_help()
        print("\nError: input and output are required")
        sys.exit(1)

    # Parse size if provided
    width = height = None
    if args.size:
        width, height = parse_size(args.size)

    # Crop image
    success = crop_to_center(
        args.input,
        args.output,
        width=width,
        height=height,
        preset=args.preset,
        quality=args.quality
    )

    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
