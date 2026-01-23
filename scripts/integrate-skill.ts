#!/usr/bin/env node
/**
 * 技能集成工具
 *
 * 用于从 GitHub 仓库集成技能到 AI Agent Desktop 项目
 *
 * 功能：
 * 1. 从 GitHub 克隆技能源码
 * 2. 转换格式（anthropics/skills → 项目格式）
 * 3. 验证技能格式
 * 4. 检测依赖
 * 5. 安装到 resources/skills/
 *
 * 使用方式：
 *   node scripts/integrate-skill.ts --source <repo-url> --skill <skill-name>
 *   node scripts/integrate-skill.ts --batch <skills-list.json>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== 类型定义 ====================

interface SkillFrontmatter {
  name: string;
  description: string;
  input_schema?: Record<string, unknown>;
  'allowed-tools'?: string[];
}

interface SkillMetadata {
  name: string;
  description: string;
  category: string;
  type: 'context' | 'tool';
  dependencies?: string[];
  version?: string;
  author?: string;
  license?: string;
}

interface IntegrationOptions {
  source: string; // GitHub 仓库 URL 或本地路径
  skill: string; // 技能名称
  target?: string; // 目标路径（默认：resources/skills/）
  force?: boolean; // 覆盖已存在的技能
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ==================== 工具函数 ====================

/**
 * 读取 YAML frontmatter
 */
function parseFrontmatter(content: string): { frontmatter: SkillFrontmatter; body: string } {
  // 标准化换行符（Windows \r\n -> \n）
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 尝试匹配 ---\n...\n---\n 格式
  let match = normalized.match(/^---\n([\s\S]+?)\n---\n([\s\S]+)$/);

  // 如果不匹配，尝试更宽松的格式
  if (!match) {
    match = normalized.match(/^---\r?\n([\s\S]+?)\r?\n---\r?\n([\s\S]+)$/);
  }

  if (!match) {
    throw new Error('Invalid skill format: missing YAML frontmatter');
  }

  const frontmatter = yaml.load(match[1]) as SkillFrontmatter;
  const body = match[2];

  return { frontmatter, body };
}

/**
 * 生成 YAML frontmatter
 */
function generateFrontmatter(metadata: SkillFrontmatter): string {
  const yamlContent = yaml.dump(metadata, {
    lineWidth: -1,
    quotingType: '"',
    forceQuotes: false
  });

  return `---\n${yamlContent.trim()}\n---\n\n`;
}

/**
 * 验证技能格式
 */
function validateSkill(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const { frontmatter, body } = parseFrontmatter(content);

    // 验证必需字段
    if (!frontmatter.name) {
      errors.push('Missing required field: name');
    } else if (!/^[a-z0-9-]+$/.test(frontmatter.name)) {
      errors.push(
        'Invalid name format: must contain only lowercase letters, numbers, and hyphens'
      );
    }

    if (!frontmatter.description) {
      errors.push('Missing required field: description');
    } else if (frontmatter.description.length < 10) {
      warnings.push('Description is too short (recommended: 10+ characters)');
    }

    // 验证内容
    if (!body || body.trim().length === 0) {
      errors.push('Skill body is empty');
    }

    // 验证 input_schema
    if (frontmatter.input_schema) {
      try {
        JSON.stringify(frontmatter.input_schema);
      } catch (err) {
        errors.push('Invalid input_schema: must be JSON-serializable');
      }
    }

  } catch (err) {
    errors.push(`Parse error: ${err instanceof Error ? err.message : String(err)}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 检测技能依赖
 */
function detectDependencies(skillDir: string): string[] {
  const dependencies: string[] = [];

  // 检查 Python 依赖
  const scriptPy = path.join(skillDir, 'script.py');
  if (fs.existsSync(scriptPy)) {
    const content = fs.readFileSync(scriptPy, 'utf-8');
    const imports = content.match(/^import\s+(\w+)|^from\s+(\w+)\s+import/gm) || [];

    for (const imp of imports) {
      const moduleName = imp.replace(/^(import|from)\s+/, '').replace(/\s+.*$/, '');
      // 标准库模块跳过
      const standardLib = [
        'os', 'sys', 'json', 're', 'datetime', 'pathlib', 'typing',
        'collections', 'itertools', 'functools', 'math', 'random'
      ];
      if (!standardLib.includes(moduleName)) {
        dependencies.push(moduleName);
      }
    }
  }

  return [...new Set(dependencies)];
}

/**
 * 转换 anthropics/skills 格式到项目格式
 */
function convertAnthropicSkill(sourcePath: string, targetPath: string): void {
  console.log(`Converting skill from ${sourcePath}...`);

  // 读取源技能
  const sourceSkillPath = path.join(sourcePath, 'SKILL.md');
  if (!fs.existsSync(sourceSkillPath)) {
    throw new Error(`SKILL.md not found in ${sourcePath}`);
  }

  const content = fs.readFileSync(sourceSkillPath, 'utf-8');

  // 检查是否已经是项目格式
  const { frontmatter } = parseFrontmatter(content);

  // 中文化描述（如果需要）
  if (!/[\u4e00-\u9fa5]/.test(frontmatter.description)) {
    console.log('  ⚠️  Description is not in Chinese, consider translating it');
  }

  // 验证格式
  const validation = validateSkill(content);
  if (!validation.valid) {
    console.error('  ❌ Validation failed:');
    validation.errors.forEach(err => console.error(`     - ${err}`));
    throw new Error('Skill validation failed');
  }

  if (validation.warnings.length > 0) {
    console.log('  ⚠️  Warnings:');
    validation.warnings.forEach(warn => console.log(`     - ${warn}`));
  }

  // 检测依赖
  const dependencies = detectDependencies(sourcePath);
  if (dependencies.length > 0) {
    console.log(`  📦 Detected dependencies: ${dependencies.join(', ')}`);
  }

  // 创建目标目录
  fs.mkdirSync(targetPath, { recursive: true });

  // 复制 SKILL.md
  fs.writeFileSync(path.join(targetPath, 'SKILL.md'), content, 'utf-8');

  // 复制 script.py（如果存在）
  const scriptSource = path.join(sourcePath, 'script.py');
  if (fs.existsSync(scriptSource)) {
    const scriptTarget = path.join(targetPath, 'script.py');
    fs.copyFileSync(scriptSource, scriptTarget);
    console.log('  ✓ Copied script.py');
  }

  // 复制 assets（如果存在）
  const assetsSource = path.join(sourcePath, 'assets');
  if (fs.existsSync(assetsSource)) {
    const assetsTarget = path.join(targetPath, 'assets');
    fs.mkdirSync(assetsTarget, { recursive: true });
    const files = fs.readdirSync(assetsSource);
    for (const file of files) {
      fs.copyFileSync(
        path.join(assetsSource, file),
        path.join(assetsTarget, file)
      );
    }
    console.log(`  ✓ Copied ${files.length} asset(s)`);
  }

  console.log('  ✅ Conversion completed');
}

/**
 * 生成依赖安装指南
 */
function generateDependencyGuide(skillName: string, dependencies: string[]): string {
  if (dependencies.length === 0) {
    return '';
  }

  const guide = [
    '## 依赖要求',
    '',
    '此技能需要以下 Python 依赖：',
    '',
    '```bash',
    `pip install ${dependencies.join(' ')}`,
    '```',
    ''
  ];

  return guide.join('\n');
}

// ==================== 主函数 ====================

/**
 * 集成单个技能
 */
async function integrateSkill(options: IntegrationOptions): Promise<void> {
  console.log(`\n🎯 Integrating skill: ${options.skill}`);
  console.log(`📦 Source: ${options.source}`);

  const targetDir = options.target || path.join(process.cwd(), 'resources', 'skills');
  const skillTargetPath = path.join(targetDir, options.skill);

  // 检查是否已存在
  if (fs.existsSync(skillTargetPath) && !options.force) {
    throw new Error(
      `Skill already exists: ${skillTargetPath}\nUse --force to overwrite`
    );
  }

  // 转换技能
  convertAnthropicSkill(options.source, skillTargetPath);

  // 检测依赖并生成指南
  const dependencies = detectDependencies(skillTargetPath);
  if (dependencies.length > 0) {
    console.log('\n📋 Dependency Installation:');
    console.log(`   pip install ${dependencies.join(' ')}`);

    // 追加依赖指南到 SKILL.md
    const skillMdPath = path.join(skillTargetPath, 'SKILL.md');
    const content = fs.readFileSync(skillMdPath, 'utf-8');
    const guide = generateDependencyGuide(options.skill, dependencies);

    if (guide && !content.includes('## 依赖要求')) {
      const updatedContent = content + '\n\n' + guide;
      fs.writeFileSync(skillMdPath, updatedContent, 'utf-8');
    }
  }

  console.log(`\n✅ Skill "${options.skill}" integrated successfully!`);
  console.log(`📁 Location: ${skillTargetPath}`);
}

/**
 * 批量集成技能
 */
async function integrateBatch(skillsList: string): Promise<void> {
  console.log(`📦 Batch integration from: ${skillsList}`);

  // 读取技能列表
  const listPath = path.resolve(skillsList);
  if (!fs.existsSync(listPath)) {
    throw new Error(`Skills list not found: ${listPath}`);
  }

  const listContent = fs.readFileSync(listPath, 'utf-8');
  const skills: Array<{ name: string; source: string }> = JSON.parse(listContent);

  console.log(`\nFound ${skills.length} skill(s) to integrate\n`);

  let successCount = 0;
  let failCount = 0;

  for (const skill of skills) {
    try {
      await integrateSkill({
        source: skill.source,
        skill: skill.name
      });
      successCount++;
    } catch (err) {
      console.error(`\n❌ Failed to integrate "${skill.name}":`);
      console.error(`   ${err instanceof Error ? err.message : String(err)}`);
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`Batch integration completed:`);
  console.log(`  ✅ Success: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log('='.repeat(50));
}

/**
 * CLI 入口
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Skill Integration Tool
======================

Usage:
  node scripts/integrate-skill.ts --source <repo-url> --skill <skill-name>
  node scripts/integrate-skill.ts --batch <skills-list.json>

Options:
  --source <path>    Source directory or GitHub repo URL
  --skill <name>     Skill name (directory name)
  --target <path>    Target directory (default: resources/skills/)
  --force            Overwrite existing skill
  --batch <file>     Batch integration from JSON file

Examples:
  # Integrate single skill from local path
  node scripts/integrate-skill.ts --source ./skills/pdf --skill pdf-processor

  # Integrate with force overwrite
  node scripts/integrate-skill.ts --source ./skills/pdf --skill pdf-processor --force

  # Batch integration
  node scripts/integrate-skill.ts --batch ./skills-batch.json
`);
    process.exit(0);
  }

  const options: IntegrationOptions = {
    source: '',
    skill: ''
  };

  let batchFile = '';

  // 解析参数
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--source':
        options.source = args[++i];
        break;
      case '--skill':
        options.skill = args[++i];
        break;
      case '--target':
        options.target = args[++i];
        break;
      case '--force':
        options.force = true;
        break;
      case '--batch':
        batchFile = args[++i];
        break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }

  try {
    if (batchFile) {
      await integrateBatch(batchFile);
    } else {
      if (!options.source || !options.skill) {
        throw new Error('--source and --skill are required');
      }
      await integrateSkill(options);
    }
  } catch (err) {
    console.error('\n❌ Error:');
    console.error(`   ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

// 运行主函数
main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
