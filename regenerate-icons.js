#!/usr/bin/env node

/**
 * SkillMate 图标重新生成脚本
 *
 * 使用 electron-icon-builder 生成 Windows .ico 文件
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, description) {
  try {
    log(`▶ ${description}...`, 'cyan');
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} 成功`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${description} 失败`, 'red');
    return false;
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  log('🎨 SkillMate 图标重新生成工具', 'cyan');
  log('='.repeat(60) + '\n');

  // 检查源图标是否存在
  const sourceIcon = path.join(__dirname, 'public', 'icon.png');
  if (!fs.existsSync(sourceIcon)) {
    log(`❌ 找不到源图标: ${sourceIcon}`, 'red');
    log('请确保 public/icon.png 存在', 'yellow');
    process.exit(1);
  }

  log(`✅ 找到源图标: ${sourceIcon}`, 'green');

  // 使用 electron-icon-builder 生成图标
  log('\n📦 生成 Windows 图标...', 'cyan');

  const success = exec(
    'npx @electron-forge/plugin-auto-default --icon ' + sourceIcon,
    '重新生成图标'
  );

  if (success) {
    log('\n✅ 图标生成完成！', 'green');
    log('\n📝 下一步:', 'cyan');
    log('  1. 完全关闭应用（在任务管理器中结束所有进程）', 'white');
    log('  2. 运行: npm start', 'white');
    log('  3. 图标应该会正确显示', 'white');
  } else {
    log('\n❌ 图标生成失败', 'red');
    log('\n替代方案: 手动转换图标', 'yellow');
    log('  1. 访问: https://icoconvert.com/', 'cyan');
    log('  2. 上传 public/icon.png', 'cyan');
    log('  3. 生成 .ico 文件并保存到 build/icon.ico', 'cyan');
  }

  console.log('\n');
}

main().catch(error => {
  log(`\n❌ 错误: ${error.message}`, 'red');
  process.exit(1);
});
