#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Batch Image Cropper

Batch crop multiple images to specified dimensions.
Supports custom sizes and preset dimensions.

Author: Claude Code
Created: 2026-01-11
"""

import sys
import os
from pathlib import Path
import glob

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

# Import preset sizes
from crop_image import PRESET_SIZES, parse_size


def batch_crop(input_dir, output_dir, size=None, preset=None, quality=95, pattern='*.jpg'):
    """
    Batch crop all images in a directory.

    Args:
        input_dir: Input directory path
        output_dir: Output directory path
        size: Target size as string (e.g., '900x383')
        preset: Preset name
        quality: JPEG quality
        pattern: File pattern to match (default '*.jpg')

    Returns:
        Tuple of (success_count, fail_count)
    """
    # Determine target size
    if preset:
        if preset not in PRESET_SIZES:
            print(f"Available presets: {', '.join(PRESET_SIZES.keys())}")
            return (0, 0)
        target_width, target_height = PRESET_SIZES[preset]
        size_desc = f"{preset} ({target_width}x{target_height})"
    elif size:
        target_width, target_height = parse_size(size)
        size_desc = f"{target_width}x{target_height}"
    else:
        print("Error: Must specify either --preset or --size")
        return (0, 0)

    # Find all matching files
    input_path = Path(input_dir)
    if not input_path.exists():
        print(f"Error: Input directory not found: {input_dir}")
        return (0, 0)

    files = list(input_path.glob(pattern))
    if not files:
        print(f"No files found matching pattern: {pattern}")
        return (0, 0)

    print(f"Found {len(files)} files")
    print(f"Target size: {size_desc}")
    print(f"Output directory: {output_dir}")
    print("-" * 50)

    # Create output directory
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    # Process each file
    success_count = 0
    fail_count = 0

    for i, file_path in enumerate(files, 1):
        try:
            print(f"[{i}/{len(files)}] Processing: {file_path.name}")

            # Open image
            img = Image.open(file_path)
            original_width, original_height = img.size

            # Calculate crop box
            left = (original_width - target_width) // 2
            top = (original_height - target_height) // 2
            right = left + target_width
            bottom = top + target_height

            # Ensure crop box is within bounds
            left = max(0, left)
            top = max(0, top)
            right = min(original_width, right)
            bottom = min(original_height, bottom)

            # Crop
            cropped_img = img.crop((left, top, right, bottom))

            # Save
            output_file = output_path / file_path.name
            cropped_img.save(output_file, quality=quality)

            print(f"  -> Saved to: {output_file}")
            success_count += 1

        except Exception as e:
            print(f"  -> Error: {e}")
            fail_count += 1

    print("-" * 50)
    print(f"Complete: {success_count} succeeded, {fail_count} failed")

    return (success_count, fail_count)


def main():
    """Command line interface"""
    import argparse

    parser = argparse.ArgumentParser(
        description="Batch crop images in a directory",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Crop all JPG files in a folder
  python batch_crop.py input_folder/ --preset wechat-cover --output output_folder/

  # Crop all PNG files
  python batch_crop.py input_folder/ --size 900x383 --output output_folder/ --pattern "*.png"
        """
    )

    parser.add_argument(
        'input_dir',
        help='Input directory path'
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
        required=True,
        help='Output directory path'
    )

    parser.add_argument(
        '--quality',
        type=int,
        default=95,
        help='JPEG quality (1-100, default 95)'
    )

    parser.add_argument(
        '--pattern',
        default='*.jpg',
        help='File pattern to match (default: *.jpg)'
    )

    args = parser.parse_args()

    # Validate
    if not args.size and not args.preset:
        parser.print_help()
        print("\nError: Must specify either --size or --preset")
        sys.exit(1)

    # Batch crop
    success, fail = batch_crop(
        args.input_dir,
        args.output,
        size=args.size,
        preset=args.preset,
        quality=args.quality,
        pattern=args.pattern
    )

    sys.exit(0 if fail == 0 else 1)


if __name__ == '__main__':
    main()
