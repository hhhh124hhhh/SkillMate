#!/usr/bin/env node
/**
 * 技能测试工具
 *
 * 用于验证技能格式、功能和依赖
 *
 * 功能：
 * 1. 格式验证（YAML frontmatter、必需字段）
 * 2. 依赖检测（Python 包）
 * 3. 功能测试（可选）
 *
 * 使用方式：
 *   node scripts/test-skill.ts --skill <skill-name>
 *   node scripts/test-skill.ts --all
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== 类型定义 ====================

interface SkillFrontmatter {
  name: string;
  description: string;
  input_schema?: Record<string, unknown>;
  'allowed-tools'?: string[];
}

interface TestResult {
  skillName: string;
  passed: boolean;
  tests: {
    format: { passed: boolean; errors: string[] };
    dependencies: { passed: boolean; missing: string[]; installed: string[] };
    script?: { passed: boolean; errors: string[] };
  };
}

// ==================== 工具函数 ====================

/**
 * 解析 YAML frontmatter
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
 * 验证技能格式
 */
function validateFormat(content: string): { passed: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const { frontmatter, body } = parseFrontmatter(content);

    // 验证必需字段
    if (!frontmatter.name) {
      errors.push('Missing required field: name');
    } else if (/^[a-z0-9-]+$/.test(frontmatter.name)) {
      // 英文名称：符合规范
    } else if (/^[\u4e00-\u9fa5a-zA-Z0-9-]+$/.test(frontmatter.name)) {
      // 中文名称或混合：允许但警告
      warnings.push(
        'Name contains non-ASCII characters. Recommended format: lowercase letters, numbers, and hyphens only'
      );
    } else {
      errors.push('Invalid name format: must contain only letters, numbers, and hyphens');
    }

    if (!frontmatter.description) {
      errors.push('Missing required field: description');
    } else if (frontmatter.description.length < 10) {
      errors.push('Description is too short (recommended: 10+ characters)');
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
    passed: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * 检测 Python 依赖
 */
function detectDependencies(skillDir: string): string[] {
  const dependencies: string[] = [];

  const scriptPy = path.join(skillDir, 'script.py');
  if (fs.existsSync(scriptPy)) {
    const content = fs.readFileSync(scriptPy, 'utf-8');
    const imports = content.match(/^import\s+(\w+)|^from\s+(\w+)\s+import/gm) || [];

    for (const imp of imports) {
      const moduleName = imp.replace(/^(import|from)\s+/, '').replace(/\s+.*$/, '');
      // 跳过标准库
      const standardLib = [
        'os', 'sys', 'json', 're', 'datetime', 'pathlib', 'typing',
        'collections', 'itertools', 'functools', 'math', 'random',
        'subprocess', 'argparse', 'hashlib', 'base64', 'uuid'
      ];
      if (!standardLib.includes(moduleName)) {
        dependencies.push(moduleName);
      }
    }
  }

  return [...new Set(dependencies)];
}

/**
 * 检查依赖是否已安装
 */
function checkDependencies(dependencies: string[]): { missing: string[]; installed: string[] } {
  const missing: string[] = [];
  const installed: string[] = [];

  for (const dep of dependencies) {
    try {
      execSync(`python -c "import ${dep}"`, { stdio: 'ignore' });
      installed.push(dep);
    } catch {
      missing.push(dep);
    }
  }

  return { missing, installed };
}

/**
 * 测试 Python 脚本语法
 */
function testScriptSyntax(skillDir: string): { passed: boolean; errors: string[] } {
  const errors: string[] = [];
  const scriptPy = path.join(skillDir, 'script.py');

  if (!fs.existsSync(scriptPy)) {
    return { passed: true, errors: [] }; // 没有脚本也算通过
  }

  try {
    execSync(`python -m py_compile "${scriptPy}"`, { stdio: 'pipe' });
  } catch (err) {
    errors.push('Script has syntax errors');
    const output = (err as any).stderr?.toString() || '';
    if (output) {
      errors.push(output.trim());
    }
  }

  return {
    passed: errors.length === 0,
    errors
  };
}

/**
 * 测试单个技能
 */
function testSkill(skillPath: string): TestResult {
  const skillName = path.basename(skillPath);
  console.log(`\n📋 Testing: ${skillName}`);
  console.log('='.repeat(50));

  const skillMdPath = path.join(skillPath, 'SKILL.md');

  if (!fs.existsSync(skillMdPath)) {
    console.log('  ❌ SKILL.md not found');
    return {
      skillName,
      passed: false,
      tests: {
        format: { passed: false, errors: ['SKILL.md not found'] },
        dependencies: { missing: [], installed: [] }
      }
    };
  }

  const content = fs.readFileSync(skillMdPath, 'utf-8');

  // 测试 1: 格式验证
  console.log('  1️⃣  Format validation...');
  const formatTest = validateFormat(content);
  if (formatTest.passed) {
    console.log('     ✅ Passed');
  } else {
    console.log('     ❌ Failed:');
    formatTest.errors.forEach(err => console.log(`        - ${err}`));
  }

  // 显示警告
  if (formatTest.warnings.length > 0) {
    console.log('     ⚠️  Warnings:');
    formatTest.warnings.forEach(warn => console.log(`        - ${warn}`));
  }

  // 测试 2: 依赖检测
  console.log('  2️⃣  Dependency check...');
  const dependencies = detectDependencies(skillPath);
  const depCheck = checkDependencies(dependencies);

  if (dependencies.length === 0) {
    console.log('     ✅ No dependencies');
  } else {
    console.log(`     📦 Dependencies: ${dependencies.join(', ')}`);

    if (depCheck.missing.length === 0) {
      console.log('     ✅ All installed');
    } else {
      console.log('     ⚠️  Missing dependencies:');
      depCheck.missing.forEach(dep => console.log(`        - ${dep}`));
      console.log(`     Install: pip install ${depCheck.missing.join(' ')}`);
    }
  }

  // 测试 3: 脚本语法（如果有）
  const scriptTest = testScriptSyntax(skillPath);
  if (fs.existsSync(path.join(skillPath, 'script.py'))) {
    console.log('  3️⃣  Script syntax...');
    if (scriptTest.passed) {
      console.log('     ✅ Passed');
    } else {
      console.log('     ❌ Failed:');
      scriptTest.errors.forEach(err => console.log(`        - ${err}`));
    }
  }

  const allPassed =
    formatTest.passed &&
    depCheck.missing.length === 0 &&
    (scriptTest.passed || !fs.existsSync(path.join(skillPath, 'script.py')));

  return {
    skillName,
    passed: allPassed,
    tests: {
      format: formatTest,
      dependencies: depCheck,
      script: scriptTest
    }
  };
}

/**
 * 测试所有技能
 */
function testAllSkills(): void {
  const skillsDir = path.join(process.cwd(), 'resources', 'skills');
  const skillDirs = fs.readdirSync(skillsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name)
    .filter(name => !name.startsWith('.')) // 排除隐藏目录
    .sort();

  console.log(`\n🔍 Found ${skillDirs.length} skill(s)\n`);

  const results: TestResult[] = [];

  for (const skillDir of skillDirs) {
    const skillPath = path.join(skillsDir, skillDir);
    const result = testSkill(skillPath);
    results.push(result);
  }

  // 汇总结果
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Summary');
  console.log('='.repeat(50));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`\n✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);

  if (failed > 0) {
    console.log('\nFailed skills:');
    results
      .filter(r => !r.passed)
      .forEach(r => console.log(`  - ${r.skillName}`));
  }

  // 生成测试报告
  const reportPath = path.join(process.cwd(), 'skill-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n📄 Report saved: ${reportPath}`);
}

/**
 * CLI 入口
 */
function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Skill Testing Tool
==================

Usage:
  node scripts/test-skill.ts --skill <skill-name>
  node scripts/test-skill.ts --all

Options:
  --skill <name>     Test specific skill
  --all              Test all skills

Examples:
  # Test single skill
  node scripts/test-skill.ts --skill ai-writer

  # Test all skills
  node scripts/test-skill.ts --all
`);
    process.exit(0);
  }

  const skillName = args.find(arg => arg.startsWith('--skill='))?.split('=')[1] ||
                   args[args.indexOf('--skill') + 1];
  const testAll = args.includes('--all');

  try {
    if (testAll) {
      testAllSkills();
    } else if (skillName) {
      const skillPath = path.join(process.cwd(), 'resources', 'skills', skillName);
      if (!fs.existsSync(skillPath)) {
        throw new Error(`Skill not found: ${skillName}`);
      }
      const result = testSkill(skillPath);
      process.exit(result.passed ? 0 : 1);
    } else {
      throw new Error('Please specify --skill=<name> or --all');
    }
  } catch (err) {
    console.error('\n❌ Error:');
    console.error(`   ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

main();
