#!/usr/bin/env node

/**
 * SkillMate 依赖安装脚本（改进版）
 *
 * 自动安装所有必需的依赖：
 * 1. Node.js 依赖 (npm install)
 * 2. Python MCP 服务器 (mcp-server-fetch)
 * 3. 验证安装结果
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

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

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(`${colors.cyan}${query}${colors.reset} `, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function askYesNo(query) {
  const answer = await askQuestion(`${query} (y/n):`);
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

function execCommand(command, description, options = {}) {
  try {
    log(`\n▶ ${description}...`, 'cyan');

    const result = spawnSync(command, {
      shell: true,
      stdio: 'inherit',
      ...options
    });

    if (result.status === 0) {
      log(`✅ ${description} 成功`, 'green');
      return true;
    } else {
      throw new Error(`Exit code: ${result.status}`);
    }
  } catch (error) {
    log(`❌ ${description} 失败`, 'red');
    log(`错误: ${error.message}`, 'red');
    return false;
  }
}

function checkPython() {
  try {
    const result = spawnSync('python', ['--version'], { stdio: 'pipe' });
    if (result.status === 0) {
      const version = result.stdout.toString().trim();
      log(`✅ 检测到 Python: ${version}`, 'green');
      return { hasPython: true, command: 'python' };
    }
  } catch {}

  try {
    const result = spawnSync('python3', ['--version'], { stdio: 'pipe' });
    if (result.status === 0) {
      const version = result.stdout.toString().trim();
      log(`✅ 检测到 Python3: ${version}`, 'green');
      return { hasPython: true, command: 'python3' };
    }
  } catch {}

  log(`⚠️  警告: 未检测到 Python`, 'yellow');
  log(`网页抓取功能需要 Python 环境`, 'yellow');
  return { hasPython: false, command: null };
}

function checkMcpServerFetch() {
  try {
    const result = spawnSync('python', ['-m', 'mcp_server_fetch', '--help'], { stdio: 'pipe' });
    return result.status === 0;
  } catch {
    return false;
  }
}

async function clearNpmCache() {
  log('\n🗑️  清理 npm 缓存...', 'cyan');

  const commands = [
    'npm cache clean --force',
    'rm -rf node_modules package-lock.json',
  ];

  for (const cmd of commands) {
    try {
      execSync(cmd, { stdio: 'inherit' });
    } catch (error) {
      // 忽略单个命令失败
    }
  }

  log('✅ 缓存清理完成', 'green');
}

async function installNodeDependencies(useMirror = false) {
  log('\n📦 安装 Node.js 依赖...', 'cyan');
  log('这可能需要几分钟时间，请耐心等待...\n', 'yellow');

  const command = useMirror
    ? 'npm install --registry=https://registry.npmmirror.com'
    : 'npm install';

  const success = execCommand(command, '安装 Node.js 依赖');

  if (!success) {
    log('\n❌ Node.js 依赖安装失败', 'red');
    log('\n可能的解决方案:', 'yellow');
    log('  1. 检查网络连接', 'white');
    log('  2. 尝试使用国内镜像', 'white');
    log('  3. 清理 npm 缓存后重试', 'white');
    log('  4. 检查 Node.js 版本 (要求 18+)', 'white');

    if (!useMirror) {
      const tryMirror = await askYesNo('\n是否尝试使用国内镜像重试?');
      if (tryMirror) {
        return await installNodeDependencies(true);
      }
    }

    const tryCache = await askYesNo('\n是否清理 npm 缓存后重试?');
    if (tryCache) {
      await clearNpmCache();
      return await installNodeDependencies(useMirror);
    }

    return false;
  }

  return true;
}

async function installPythonMCP(pythonCommand) {
  if (!checkMcpServerFetch()) {
    log('\n📦 安装 Python MCP 服务器...', 'cyan');

    const command = `${pythonCommand} -m pip install mcp-server-fetch`;
    const success = execCommand(command, '安装 mcp-server-fetch');

    if (success) {
      log('\n✅ mcp-server-fetch 安装成功', 'green');
      log('网页抓取功能现已可用', 'green');
    } else {
      log('\n⚠️  mcp-server-fetch 安装失败', 'yellow');
      log('网页抓取功能将不可用，但不影响其他功能', 'yellow');
      log('您可以稍后手动安装: pip install mcp-server-fetch', 'cyan');
    }
  } else {
    log('✅ mcp-server-fetch 已安装', 'green');
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
    log('\n下载地址: https://nodejs.org/', 'cyan');
    process.exit(1);
  }

  // 2. 安装 Node.js 依赖
  const npmSuccess = await installNodeDependencies(false);

  if (!npmSuccess) {
    log('\n❌ 依赖安装失败，无法继续', 'red');
    log('\n如需帮助，请访问:', 'yellow');
    log('  https://github.com/hhhh124hhhh/SkillMate/issues', 'cyan');
    process.exit(1);
  }

  // 3. 检查 Python
  log('\n🐍 检查 Python 环境...', 'cyan');
  const { hasPython, command: pythonCommand } = checkPython();

  if (hasPython && pythonCommand) {
    // 4. 检查并安装 mcp-server-fetch
    await installPythonMCP(pythonCommand);
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

  log('\n💡 提示:', 'yellow');
  log('  如果遇到问题，请查看 docs/getting-started.md', 'white');
  log('  或提交问题: https://github.com/hhhh124hhhh/SkillMate/issues', 'white');

  console.log('\n');
}

// 运行安装
main().catch(error => {
  log(`\n❌ 安装失败: ${error.message}`, 'red');
  log('\n请检查错误信息并重试，或提交问题获取帮助:', 'yellow');
  log('https://github.com/hhhh124hhhh/SkillMate/issues', 'cyan');
  process.exit(1);
});
