#!/usr/bin/env python3
"""
豆包视觉图像理解工具
支持：图片描述、分析、OCR、问答
"""

import os
import sys
import json
import argparse
import base64
import io
import httpx
from openai import OpenAI

# ✅ Windows UTF-8 兼容性修复（解决中文乱码问题）
# 参考：https://discuss.python.org/t/pep-597-enable-utf-8-mode-by-default-on-windows/3122
if sys.platform == 'win32':
    # 方法 1：Python 3.7+ 使用 reconfigure 方法
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    # 方法 2：通用方法（兼容旧版本）
    else:
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

def get_client():
    """创建豆包 API 客户端"""
    api_key = os.getenv('DOUBAO_API_KEY')
    if not api_key:
        # 尝试从配置文件读取
        raise ValueError("豆包 API Key 未配置，请设置 DOUBAO_API_KEY 环境变量或在设置面板配置")

    # ✅ 超时配置最佳实践：90秒超时（根据 OpenAI 社区推荐）
    # 参考：https://community.openai.com/t/frequently-getting-api-timeout-error-what-am-i-doing-wrong/611941
    timeout_config = httpx.Timeout(
        connect=10.0,      # 连接超时 10 秒
        read=90.0,        # 读取超时 90 秒（视觉模型需要更长时间）
        write=10.0,       # 写入超时 10 秒
        pool=10.0         # 连接池超时 10 秒
    )

    return OpenAI(
        api_key=api_key,
        base_url="https://ark.cn-beijing.volces.com/api/v3",
        timeout=timeout_config,  # ✅ 关键：设置超时
        max_retries=2  # ✅ 网络不稳定时重试 2 次
    )

def describe_image(image_data: str, language: str = "zh-CN") -> dict:
    """描述图片内容"""
    client = get_client()

    prompt_map = {
        "zh-CN": "请详细描述这张图片的内容，包括主要物体、场景、活动和氛围。",
        "en-US": "Please describe this image in detail, including main objects, scene, activities and atmosphere."
    }

    try:
        response = client.chat.completions.create(
            model="doubao-seed-1-6-251015",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": image_data}},
                    {"type": "text", "text": prompt_map.get(language, prompt_map["zh-CN"])}
                ]
            }],
            max_tokens=2000
        )
        return {"success": True, "result": response.choices[0].message.content}
    except Exception as e:
        return {"success": False, "error": str(e)}

def analyze_image(image_data: str, aspect: str = "all") -> dict:
    """分析图片"""
    client = get_client()

    prompt_map = {
        "composition": "请分析这张图片的构图方法，包括元素布局、视觉引导、平衡关系。",
        "colors": "请分析这张图片的色彩运用，包括主色调、色彩搭配、色彩心理学效果。",
        "style": "请分析这张图片的艺术风格，包括设计风格、技法特点、美学特征。",
        "elements": "请识别并分析这张图片中的主要视觉元素和物体。",
        "all": "请从构图、色彩、风格、元素等多个维度全面分析这张图片。"
    }

    try:
        response = client.chat.completions.create(
            model="doubao-seed-1-6-251015",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": image_data}},
                    {"type": "text", "text": prompt_map.get(aspect, prompt_map["all"])}
                ]
            }],
            max_tokens=2000
        )
        return {"success": True, "result": response.choices[0].message.content}
    except Exception as e:
        return {"success": False, "error": str(e)}

def extract_text(image_data: str, language: str = "auto") -> dict:
    """提取图片文字（OCR）"""
    client = get_client()

    lang_map = {
        "zh-CN": "提取图片中的所有中文文字内容，保持原有格式和结构。",
        "en-US": "Extract all English text content from the image, maintaining original format and structure.",
        "auto": "提取图片中的所有文字内容（中文、英文、数字等），保持原有格式和结构。"
    }

    try:
        response = client.chat.completions.create(
            model="doubao-seed-1-6-251015",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": image_data}},
                    {"type": "text", "text": lang_map.get(language, lang_map["auto"])}
                ]
            }],
            max_tokens=2000
        )
        return {"success": True, "result": response.choices[0].message.content}
    except Exception as e:
        return {"success": False, "error": str(e)}

def answer_question(image_data: str, question: str) -> dict:
    """根据图片回答问题"""
    client = get_client()

    try:
        response = client.chat.completions.create(
            model="doubao-seed-1-6-251015",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": image_data}},
                    {"type": "text", "text": question}
                ]
            }],
            max_tokens=2000
        )
        return {"success": True, "result": response.choices[0].message.content}
    except Exception as e:
        return {"success": False, "error": str(e)}

def main():
    parser = argparse.ArgumentParser(description='豆包视觉图像理解工具')
    subparsers = parser.add_subparsers(dest='command', help='可用命令')

    # describe 命令
    describe_parser = subparsers.add_parser('describe', help='描述图片内容')
    describe_parser.add_argument('image', help='图片 base64 或文件路径')
    describe_parser.add_argument('--language', default='zh-CN', help='语言 (zh-CN/en-US)')

    # analyze 命令
    analyze_parser = subparsers.add_parser('analyze', help='分析图片')
    analyze_parser.add_argument('image', help='图片 base64 或文件路径')
    analyze_parser.add_argument('--aspect', default='all',
                                help='分析维度 (composition/colors/style/elements/all)')

    # ocr 命令
    ocr_parser = subparsers.add_parser('ocr', help='提取文字')
    ocr_parser.add_argument('image', help='图片 base64 或文件路径')
    ocr_parser.add_argument('--language', default='auto', help='语言 (zh-CN/en-US/auto)')

    # question 命令
    question_parser = subparsers.add_parser('question', help='回答问题')
    question_parser.add_argument('image', help='图片 base64 或文件路径')
    question_parser.add_argument('question', help='问题')

    args = parser.parse_args()

    # ✅ 添加诊断日志
    print(json.dumps({
        "type": "debug",
        "message": "Script started",
        "command": args.command if hasattr(args, 'command') else None,
        "api_key_configured": bool(os.getenv('DOUBAO_API_KEY'))
    }), file=sys.stderr)

    if not args.command:
        parser.print_help()
        sys.exit(1)

    # ✅ 验证 API Key
    api_key = os.getenv('DOUBAO_API_KEY')
    if not api_key:
        error_msg = "豆包 API Key 未配置，请设置 DOUBAO_API_KEY 环境变量或在设置面板配置"
        print(json.dumps({"type": "error", "message": error_msg}), file=sys.stderr)
        print(json.dumps({"success": False, "error": error_msg}))
        sys.exit(1)

    print(json.dumps({"type": "debug", "message": "API Key configured", "key_length": len(api_key)}), file=sys.stderr)

    # 处理图片数据
    image_data = args.image

    # ✅ 如果不是 base64 格式，尝试从文件读取
    if not image_data.startswith('data:image'):
        try:
            with open(image_data, 'r', encoding='utf-8') as f:
                image_data = f.read().strip()
                # 验证读取的是 base64 数据
                if not image_data.startswith('data:image'):
                    # 不是 base64，可能是图片文件，转换
                    with open(args.image, 'rb') as img_file:
                        image_data = f"data:image/jpeg;base64,{base64.b64encode(img_file.read()).decode()}"
        except Exception as e:
            # 读取失败，返回错误
            print(json.dumps({"success": False, "error": f"无法读取图片文件: {str(e)}"}))
            sys.exit(1)

    # 执行对应命令
    result = None
    if args.command == 'describe':
        result = describe_image(image_data, args.language)
    elif args.command == 'analyze':
        result = analyze_image(image_data, args.aspect)
    elif args.command == 'ocr':
        result = extract_text(image_data, args.language)
    elif args.command == 'question':
        result = answer_question(image_data, args.question)

    # 输出结果
    print(json.dumps(result, ensure_ascii=False, indent=2))

    # 返回退出码
    sys.exit(0 if result.get('success') else 1)

if __name__ == '__main__':
    main()
