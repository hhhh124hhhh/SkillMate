#!/usr/bin/env node

/**
 * SkillMate 依赖安装脚本
 *
 * 自动安装所有必需的依赖：
 * 1. Node.js 依赖 (npm install)
 * 2. Python MCP 服务器 (mcp-server-fetch)
 * 3. 验证安装结果
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI 颜色代码
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, description) {
  try {
    log(`\n▶ ${description}...`, 'cyan');
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} 成功`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${description} 失败`, 'red');
    log(`错误: ${error.message}`, 'red');
    return false;
  }
}

function checkPython() {
  try {
    const version = execSync('python --version', { encoding: 'utf-8' });
    log(`✅ 检测到 Python: ${version.trim()}`, 'green');
    return true;
  } catch {
    try {
      const version = execSync('python3 --version', { encoding: 'utf-8' });
      log(`✅ 检测到 Python: ${version.trim()}`, 'green');
      return true;
    } catch {
      log(`⚠️  警告: 未检测到 Python`, 'yellow');
      log(`网页抓取功能需要 Python 环境`, 'yellow');
      return false;
    }
  }
}

function checkMcpServerFetch() {
  try {
    execSync('python -m mcp_server_fetch --help', { stdio: 'pipe' });
    log('✅ mcp-server-fetch 已安装', 'green');
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  log('🚀 SkillMate 依赖安装脚本', 'magenta');
  log('='.repeat(60) + '\n');

  // 1. 检查 Node.js
  log('📋 检查环境...', 'cyan');
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf-8' });
    log(`✅ Node.js: ${nodeVersion.trim()}`, 'green');
  } catch {
    log('❌ 未检测到 Node.js，请先安装 Node.js 18+', 'red');
    process.exit(1);
  }

  // 2. 安装 Node.js 依赖
  log('\n📦 安装 Node.js 依赖...', 'cyan');
  log('这可能需要几分钟时间，请耐心等待...\n', 'yellow');

  if (!execCommand('npm install', '安装 Node.js 依赖')) {
    log('\n❌ Node.js 依赖安装失败', 'red');
    log('请检查网络连接或尝试使用国内镜像:', 'yellow');
    log('  npm install --registry=https://registry.npmmirror.com', 'cyan');
    process.exit(1);
  }

  // 3. 检查 Python
  log('\n🐍 检查 Python 环境...', 'cyan');
  const hasPython = checkPython();

  if (hasPython) {
    // 4. 检查并安装 mcp-server-fetch
    if (!checkMcpServerFetch()) {
      log('\n📦 安装 Python MCP 服务器...', 'cyan');
      if (execCommand('python -m pip install mcp-server-fetch', '安装 mcp-server-fetch')) {
        log('\n✅ mcp-server-fetch 安装成功', 'green');
        log('网页抓取功能现已可用', 'green');
      } else {
        log('\n⚠️  mcp-server-fetch 安装失败', 'yellow');
        log('网页抓取功能将不可用，但不影响其他功能', 'yellow');
        log('您可以稍后手动安装: pip install mcp-server-fetch', 'cyan');
      }
    }
  } else {
    log('\n⚠️  跳过 Python MCP 服务器安装', 'yellow');
    log('如需使用网页抓取功能，请安装 Python 后重新运行此脚本', 'yellow');
  }

  // 5. 总结
  console.log('\n' + '='.repeat(60));
  log('✅ 依赖安装完成！', 'green');
  log('='.repeat(60));

  log('\n📝 下一步:', 'cyan');
  log('  1. 配置 API Key（推荐使用智谱 AI）', 'white');
  log('  2. 运行应用: npm start', 'white');
  log('  3. 查看 README.md 了解更多', 'white');

  log('\n🔗 获取智谱 AI API Key:', 'cyan');
  log('  https://open.bigmodel.cn/', 'blue');

  console.log('\n');
}

// 运行安装
main().catch(error => {
  log(`\n❌ 安装失败: ${error.message}`, 'red');
  process.exit(1);
});
