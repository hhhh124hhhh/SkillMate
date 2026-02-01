#!/usr/bin/env node

/**
 * 重新生成 Windows 图标文件
 * 使用 png2ico 或在线工具生成正确的 .ico 文件
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

async function main() {
  console.log('\n' + '='.repeat(60));
  log('🎨 SkillMate 图标修复工具', 'cyan');
  log('='.repeat(60) + '\n');

  // 检查源图标
  const sourceIcon = path.join(__dirname, 'public', 'icon.png');
  if (!fs.existsSync(sourceIcon)) {
    log('❌ 找不到源图标: public/icon.png', 'red');
    process.exit(1);
  }

  log(`✅ 找到源图标: ${sourceIcon}`, 'green');

  log('\n请选择修复方案:\n');
  log('方案 1: 使用在线工具重新生成 .ico 文件（推荐）', 'yellow');
  log('方案 2: 使用 electron-icon-builder 重新生成', 'yellow');
  log('方案 3: 直接使用 PNG 图标（简单但兼容性较差）', 'yellow');
  log('方案 4: 使用 Windows PowerShell 脚本生成', 'yellow');

  console.log('\n' + '='.repeat(60));

  log('\n📝 推荐方案 1 - 在线工具生成图标:', 'cyan');
  log('1. 访问: https://icoconvert.com/', 'white');
  log('2. 上传 public/icon.png', 'white');
  log('3. 选择以下尺寸:', 'white');
  log('   - 16x16', 'white');
  log('   - 32x32', 'white');
  log('   - 48x48', 'white');
  log('   - 256x256', 'white');
  log('4. 下载并替换 build/icon.ico', 'white');

  log('\n📝 方案 2 - 使用 electron-icon-builder:', 'cyan');
  log('运行: npx electron-icon-builder --overwrite --output build/icon.png public/icon.png', 'white');

  log('\n📝 方案 3 - 临时方案（推荐用于快速测试）:', 'cyan');
  log('修改 electron/main.ts，将 icon 设置为 PNG 文件', 'white');
  log('注意: 这可能导致任务栏图标显示不清晰', 'yellow');

  log('\n' + '='.repeat(60));
}

main().catch(error => {
  log(`\n❌ 错误: ${error.message}`, 'red');
  process.exit(1);
});
