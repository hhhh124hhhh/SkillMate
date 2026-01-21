/**
 * 构建时技能加密脚本
 *
 * 功能：
 * - 在构建前自动加密所有技能文件
 * - 开发模式跳过加密
 * - 提供详细的日志输出
 *
 * 使用：
 * node scripts/encrypt-skills.js
 *
 * 环境变量：
 * NODE_ENV=production - 生产模式（执行加密）
 * NODE_ENV=development - 开发模式（跳过加密）
 */

import path from 'path';
import fs from 'fs/promises';

// 技能目录路径
const SKILLS_DIR = path.join(__dirname, '..', 'resources', 'skills');

/**
 * 加密技能文件（TypeScript 版本）
 *
 * 注意：此脚本需要先编译 TypeScript 代码才能运行
 * 或者我们可以将加密逻辑迁移到这个 JavaScript 文件中
 */
async function encryptSkills() {
  console.log('='.repeat(60));
  console.log('🔒 技能加密脚本');
  console.log('='.repeat(60));

  // 检查环境变量
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  console.log(`\n📋 环境信息:`);
  console.log(`   - NODE_ENV: ${process.env.NODE_ENV || '未设置'}`);
  console.log(`   - 当前目录: ${__dirname}`);
  console.log(`   - 技能目录: ${SKILLS_DIR}`);

  // 开发模式跳过加密
  if (isDevelopment) {
    console.log('\n✅ 开发模式：跳过加密（技能保持明文）');
    console.log('='.repeat(60));
    return;
  }

  // 生产模式执行加密
  if (!isProduction) {
    console.log('\n⚠️  警告：NODE_ENV 未设置为 production');
    console.log('   请使用以下命令运行：');
    console.log('   cross-env NODE_ENV=production node scripts/encrypt-skills.js');
    console.log('='.repeat(60));
    process.exit(1);
  }

  console.log('\n🚀 生产模式：开始加密技能文件...');

  try {
    // 动态导入编译后的 SkillEncryption 模块
    // 注意：需要先运行 npm run build:main 或 npm run dev 启动过
    const { SkillEncryption } = require('../dist-electron/security/SkillEncryption');

    // 创建加密实例
    const encryption = new SkillEncryption();

    // 检查技能目录是否存在
    try {
      await fs.access(SKILLS_DIR);
    } catch {
      console.error(`\n❌ 错误：技能目录不存在: ${SKILLS_DIR}`);
      console.log('   请确保项目结构正确');
      console.log('='.repeat(60));
      process.exit(1);
    }

    // 执行批量加密
    console.log(`\n📂 扫描技能目录: ${SKILLS_DIR}`);
    const encryptedCount = await encryption.encryptSkillsDirectory(SKILLS_DIR);

    console.log('\n✅ 加密完成！');
    console.log(`   成功加密: ${encryptedCount} 个技能文件`);

    // 输出统计信息
    const stats = encryption.getStats();
    console.log('\n📊 统计信息:');
    console.log(`   - 缓存大小: ${stats.cacheSize}`);
    console.log(`   - 机器 ID: ${stats.machineId.substring(0, 8)}...`);
    console.log(`   - 生产模式: ${stats.isProduction}`);

    console.log('\n' + '='.repeat(60));
  } catch (error) {
    console.error('\n❌ 加密失败！');
    console.error('错误信息:', error.message);

    if (error.message.includes('Cannot find module')) {
      console.error('\n💡 提示：请先编译 TypeScript 代码');
      console.error('   运行: npm run dev');
      console.error('   或: npm run build:main');
    }

    console.log('='.repeat(60));
    process.exit(1);
  }
}

/**
 * 备份技能目录
 */
async function backupSkills() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const backupDir = path.join(__dirname, '..', `resources/skills.backup.${timestamp}`);

  console.log(`\n💾 创建备份: ${backupDir}`);

  try {
    // 递归复制目录
    await copyDirectory(SKILLS_DIR, backupDir);
    console.log('✅ 备份成功');
    return backupDir;
  } catch (error) {
    console.error('❌ 备份失败:', error.message);
    throw error;
  }
}

/**
 * 递归复制目录
 */
async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const shouldBackup = args.includes('--backup');

  try {
    // 如果需要备份
    if (shouldBackup) {
      await backupSkills();
    }

    // 执行加密
    await encryptSkills();
  } catch (error) {
    console.error('\n❌ 脚本执行失败');
    console.error(error);
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { encryptSkills, backupSkills };
