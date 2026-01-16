"""
模板验证器
使用JSON Schema验证模板YAML文件的正确性
"""

import yaml
import json
import sys
from pathlib import Path
from typing import Dict, List, Any


class TemplateValidator:
    """模板验证器"""

    def __init__(self, schema_path: str = None):
        """
        初始化验证器

        Args:
            schema_path: JSON Schema文件路径
        """
        if schema_path is None:
            # 默认schema路径
            current_dir = Path(__file__).parent
            schema_path = current_dir.parent / "templates" / "template_schema.json"

        self.schema_path = Path(schema_path)
        self.schema = self._load_schema()

    def _load_schema(self) -> Dict:
        """加载JSON Schema"""
        try:
            with open(self.schema_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"错误: Schema文件不存在: {self.schema_path}")
            sys.exit(1)
        except json.JSONDecodeError as e:
            print(f"错误: Schema文件格式错误: {e}")
            sys.exit(1)

    def validate_template(self, template_path: str) -> tuple[bool, List[str]]:
        """
        验证单个模板文件

        Args:
            template_path: 模板YAML文件路径

        Returns:
            (is_valid, errors): 验证结果和错误列表
        """
        errors = []

        # 1. 检查文件是否存在
        path = Path(template_path)
        if not path.exists():
            errors.append(f"文件不存在: {template_path}")
            return False, errors

        # 2. 加载YAML
        try:
            with open(path, 'r', encoding='utf-8') as f:
                template_data = yaml.safe_load(f)
        except yaml.YAMLError as e:
            errors.append(f"YAML解析错误: {e}")
            return False, errors

        # 3. 检查基本结构
        if 'template' not in template_data:
            errors.append("缺少根元素 'template'")
            return False, errors

        template = template_data['template']

        # 4. 检查必需字段
        required_fields = ['name', 'id', 'description', 'category', 'version', 'background', 'elements']
        for field in required_fields:
            if field not in template:
                errors.append(f"缺少必需字段: template.{field}")

        # 5. 验证字段类型和值
        if 'category' in template:
            valid_categories = ['basic', 'structured', 'minimal', 'creative', 'tech', 'editorial']
            if template['category'] not in valid_categories:
                errors.append(f"无效的category: {template['category']}")

        if 'version' in template:
            import re
            if not re.match(r'^\d+\.\d+\.\d+$', template['version']):
                errors.append(f"无效的version格式: {template['version']}")

        # 6. 验证背景配置
        if 'background' in template:
            bg = template['background']
            if 'type' not in bg:
                errors.append("background缺少type字段")

            bg_type = bg.get('type')
            if bg_type == 'ai_generate':
                if 'style' not in bg:
                    errors.append("AI生成背景缺少style字段")
                valid_styles = ['tech', 'fresh', 'minimal', 'warm', 'business']
                if 'style' in bg and bg['style'] not in valid_styles:
                    errors.append(f"无效的background.style: {bg['style']}")

            elif bg_type == 'solid':
                if 'color' not in bg:
                    errors.append("纯色背景缺少color字段")

            elif bg_type == 'gradient':
                if 'gradient' not in bg:
                    errors.append("渐变背景缺少gradient字段")
                else:
                    grad = bg['gradient']
                    for field in ['from', 'to', 'direction']:
                        if field not in grad:
                            errors.append(f"gradient缺少{field}字段")

        # 7. 验证元素配置
        if 'elements' in template:
            if not isinstance(template['elements'], list):
                errors.append("elements必须是数组")
            else:
                for idx, element in enumerate(template['elements']):
                    element_errors = self._validate_element(element, idx)
                    errors.extend(element_errors)

        # 8. 验证变体配置
        if 'variants' in template:
            if not isinstance(template['variants'], list):
                errors.append("variants必须是数组")

        is_valid = len(errors) == 0
        return is_valid, errors

    def _validate_element(self, element: Dict, index: int) -> List[str]:
        """
        验证单个元素

        Args:
            element: 元素配置
            index: 元素索引

        Returns:
            错误列表
        """
        errors = []

        # 检查必需字段
        if 'type' not in element:
            errors.append(f"elements[{index}]缺少type字段")
            return errors

        if 'id' not in element:
            errors.append(f"elements[{index}]缺少id字段")

        element_type = element.get('type')

        # 文字元素特殊验证
        if element_type in ['text', 'optional']:
            if 'content' not in element:
                errors.append(f"elements[{index}]缺少content字段")

            # 验证变量占位符
            if 'content' in element:
                content = element['content']
                valid_vars = ['{{title}}', '{{subtitle}}']
                for var in valid_vars:
                    if var in content:
                        break
                else:
                    if '{{' in content:
                        errors.append(f"elements[{index}]包含无效的变量: {content}")

        # 验证位置配置
        if 'position' in element:
            pos = element['position']
            if 'type' not in pos:
                errors.append(f"elements[{index}].position缺少type字段")

        # 验证字体配置
        if 'font' in element:
            font = element['font']
            if 'size' in font and not isinstance(font['size'], (int, float)):
                errors.append(f"elements[{index}].font.size必须是数字")

        # 验证换行配置
        if 'wrap' in element:
            wrap = element['wrap']
            if 'max_width' in wrap:
                max_width = wrap['max_width']
                if isinstance(max_width, str):
                    if not max_width.endswith('%'):
                        errors.append(f"elements[{index}].wrap.max_width格式错误")
                elif not isinstance(max_width, (int, float)):
                    errors.append(f"elements[{index}].wrap.max_width类型错误")

        return errors

    def validate_directory(self, templates_dir: str) -> Dict[str, Any]:
        """
        验证目录中的所有模板

        Args:
            templates_dir: 模板目录路径

        Returns:
            验证结果汇总
        """
        dir_path = Path(templates_dir)

        if not dir_path.exists():
            return {
                'total': 0,
                'valid': 0,
                'invalid': 0,
                'results': []
            }

        yaml_files = list(dir_path.glob("*.yaml"))
        results = []
        valid_count = 0

        for yaml_file in yaml_files:
            is_valid, errors = self.validate_template(str(yaml_file))
            if is_valid:
                valid_count += 1

            results.append({
                'file': yaml_file.name,
                'valid': is_valid,
                'errors': errors
            })

        return {
            'total': len(yaml_files),
            'valid': valid_count,
            'invalid': len(yaml_files) - valid_count,
            'results': results
        }

    def print_validation_report(self, result: Dict[str, Any]):
        """
        打印验证报告

        Args:
            result: validate_directory的返回结果
        """
        print("\n" + "=" * 60)
        print("模板验证报告")
        print("=" * 60)
        print(f"总计: {result['total']} 个模板")
        print(f"✓ 有效: {result['valid']} 个")
        print(f"✗ 无效: {result['invalid']} 个")
        print("=" * 60)

        for item in result['results']:
            status = "✓" if item['valid'] else "✗"
            print(f"\n{status} {item['file']}")

            if item['errors']:
                print("  错误:")
                for error in item['errors']:
                    print(f"    - {error}")

        print("=" * 60)


def main():
    """主程序"""
    import argparse

    parser = argparse.ArgumentParser(description="模板验证工具")
    parser.add_argument('path', nargs='?', default='templates',
                       help='模板文件或目录路径（默认: templates/）')
    parser.add_argument('--schema', help='JSON Schema文件路径')

    args = parser.parse_args()

    # 创建验证器
    validator = TemplateValidator(schema_path=args.schema)

    path = Path(args.path)

    if path.is_file():
        # 验证单个文件
        is_valid, errors = validator.validate_template(str(path))

        if is_valid:
            print(f"✓ {path.name}: 验证通过")
            sys.exit(0)
        else:
            print(f"✗ {path.name}: 验证失败")
            for error in errors:
                print(f"  - {error}")
            sys.exit(1)

    elif path.is_dir():
        # 验证整个目录
        result = validator.validate_directory(str(path))
        validator.print_validation_report(result)

        # 如果有无效的模板，返回错误代码
        sys.exit(0 if result['invalid'] == 0 else 1)

    else:
        print(f"错误: 路径不存在: {args.path}")
        sys.exit(1)


if __name__ == "__main__":
    main()
