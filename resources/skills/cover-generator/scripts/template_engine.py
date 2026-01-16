"""
模板引擎
加载模板、协调背景生成和文字渲染
"""

import yaml
import re
from pathlib import Path
from typing import Dict, List, Any, Optional
from PIL import Image


class TemplateEngine:
    """模板引擎核心类"""

    def __init__(self, templates_dir: str = None):
        """
        初始化模板引擎

        Args:
            templates_dir: 模板目录路径
        """
        if templates_dir is None:
            current_dir = Path(__file__).parent
            templates_dir = current_dir.parent / "templates"

        self.templates_dir = Path(templates_dir)
        self.templates: Dict[str, Dict] = {}
        self._load_all_templates()

    def _load_all_templates(self):
        """加载所有模板"""
        if not self.templates_dir.exists():
            print(f"警告: 模板目录不存在: {self.templates_dir}")
            return

        for yaml_file in self.templates_dir.glob("*.yaml"):
            try:
                template = self._load_template(str(yaml_file))
                if template:
                    template_id = template['template']['id']
                    self.templates[template_id] = template
                    print(f"  已加载模板: {template_id}")
            except Exception as e:
                print(f"  加载模板失败 {yaml_file.name}: {e}")

    def _load_template(self, template_path: str) -> Optional[Dict]:
        """
        加载单个模板文件

        Args:
            template_path: 模板YAML文件路径

        Returns:
            模板数据字典
        """
        with open(template_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)

    def get_template(self, template_id: str) -> Optional[Dict]:
        """
        获取指定模板

        Args:
            template_id: 模板ID

        Returns:
            模板数据字典
        """
        return self.templates.get(template_id)

    def list_templates(self) -> List[Dict[str, str]]:
        """
        列出所有可用模板

        Returns:
            模板信息列表
        """
        return [
            {
                'id': tpl['template']['id'],
                'name': tpl['template']['name'],
                'description': tpl['template']['description'],
                'category': tpl['template']['category']
            }
            for tpl in self.templates.values()
        ]

    def render(
        self,
        template_id: str,
        title: str,
        subtitle: str = "",
        variant: str = None,
        **kwargs
    ) -> Optional[Image.Image]:
        """
        渲染模板

        Args:
            template_id: 模板ID
            title: 主标题
            subtitle: 副标题
            variant: 样式变体名称
            **kwargs: 其他参数

        Returns:
            渲染后的PIL Image对象
        """
        # 1. 获取模板
        template = self.get_template(template_id)
        if not template:
            print(f"错误: 模板不存在: {template_id}")
            return None

        # 2. 应用变体
        if variant:
            template = self._apply_variant(template, variant)
            if not template:
                print(f"错误: 变体不存在: {variant}")
                return None

        # 3. 替换变量
        variables = {
            'title': title,
            'subtitle': subtitle
        }

        # 4. 生成背景图（延迟实现，集成到cover_generator.py中）
        # 这里返回模板配置，由cover_generator.py处理背景生成
        return {
            'template': template,
            'variables': variables
        }

    def _apply_variant(self, template: Dict, variant_name: str) -> Optional[Dict]:
        """
        应用样式变体

        Args:
            template: 原始模板
            variant_name: 变体名称

        Returns:
            应用变体后的模板
        """
        variants = template['template'].get('variants', [])

        for variant in variants:
            if variant['name'] == variant_name:
                # 深拷贝模板
                import copy
                new_template = copy.deepcopy(template)

                # 应用背景配置
                if 'background' in variant:
                    new_template['template']['background'].update(variant['background'])

                # 应用元素配置
                if 'elements' in variant:
                    element_map = {
                        elem['id']: elem
                        for elem in variant['elements']
                    }

                    for elem in new_template['template']['elements']:
                        if elem['id'] in element_map:
                            elem.update(element_map[elem['id']])

                return new_template

        return None

    @staticmethod
    def replace_variables(template_str: str, variables: Dict[str, str]) -> str:
        """
        替换模板变量

        Args:
            template_str: 模板字符串
            variables: 变量字典

        Returns:
            替换后的字符串
        """
        result = template_str

        # 替换 {{title}}
        if '{{title}}' in result:
            result = result.replace('{{title}}', variables.get('title', ''))

        # 替换 {{subtitle}}
        if '{{subtitle}}' in result:
            subtitle = variables.get('subtitle', '')
            result = result.replace('{{subtitle}}', subtitle)

        return result

    @staticmethod
    def parse_position(position_config: Dict, image_width: int, image_height: int) -> tuple[int, int, str]:
        """
        解析位置配置

        Args:
            position_config: 位置配置字典
            image_width: 图片宽度
            image_height: 图片高度

        Returns:
            (x, y, anchor): 像素坐标和锚点
        """
        pos_type = position_config.get('type', 'absolute')
        anchor = position_config.get('anchor', 'left')

        # 处理特殊位置类型
        if pos_type == 'center':
            x = image_width // 2
            y = image_height // 2
            return x, y, 'middle'

        # 解析x坐标
        x_str = position_config.get('x', '50%')
        if isinstance(x_str, str) and x_str.endswith('%'):
            x_pct = float(x_str.rstrip('%')) / 100
            x = int(image_width * x_pct)
        else:
            x = int(x_str)

        # 解析y坐标
        y_str = position_config.get('y', '50%')
        if isinstance(y_str, str) and y_str.endswith('%'):
            y_pct = float(y_str.rstrip('%')) / 100
            y = int(image_height * y_pct)
        else:
            y = int(y_str)

        return x, y, anchor

    @staticmethod
    def parse_size(size_str: str, reference_size: int) -> int:
        """
        解析尺寸配置（支持百分比和绝对值）

        Args:
            size_str: 尺寸字符串（如 "80%" 或 400）
            reference_size: 参考尺寸（用于百分比计算）

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

    @staticmethod
    def parse_image_size(size_str: str) -> tuple[int, int]:
        """
        解析图片尺寸字符串

        Args:
            size_str: 尺寸字符串（如 "3072x1306"）

        Returns:
            (width, height)
        """
        match = re.match(r'^(\d+)x(\d+)$', size_str)
        if match:
            return int(match.group(1)), int(match.group(2))
        else:
            raise ValueError(f"无效的尺寸格式: {size_str}")


def main():
    """主程序 - 模板引擎测试"""
    import argparse

    parser = argparse.ArgumentParser(description="模板引擎")
    parser.add_argument('--list', action='store_true', help='列出所有模板')
    parser.add_argument('--template', help='模板ID')
    parser.add_argument('--title', help='主标题')
    parser.add_argument('--subtitle', help='副标题')
    parser.add_argument('--variant', help='样式变体')
    parser.add_argument('--templates-dir', default='templates',
                       help='模板目录路径')

    args = parser.parse_args()

    # 创建模板引擎
    engine = TemplateEngine(templates_dir=args.templates_dir)

    if args.list:
        # 列出所有模板
        print("\n可用模板:")
        print("=" * 60)
        templates = engine.list_templates()
        for tpl in templates:
            print(f"\n{tpl['id']}: {tpl['name']}")
            print(f"  描述: {tpl['description']}")
            print(f"  分类: {tpl['category']}")
        print("=" * 60)

    elif args.template and args.title:
        # 渲染模板
        result = engine.render(
            template_id=args.template,
            title=args.title,
            subtitle=args.subtitle or "",
            variant=args.variant
        )

        if result:
            print(f"\n模板配置已加载: {args.template}")
            print(f"标题: {args.title}")
            if args.subtitle:
                print(f"副标题: {args.subtitle}")
            if args.variant:
                print(f"变体: {args.variant}")
            print("\n注意: 实际渲染功能将在cover_generator.py中实现")

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
