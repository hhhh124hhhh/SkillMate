/**
 * 技能迁移工具
 *
 * 功能：
 * - 备份现有技能目录
 * - 执行加密迁移
 * - 失败自动回滚
 * - 验证加密结果
 *
 * 使用：
 * node scripts/migrate-skills.js
 */

const path = require('path');
const fs = require('fs/promises');

// 技能目录路径
const SKILLS_DIR = path.join(__dirname, '..', 'resources', 'skills');

/**
 * 生成带时间戳的备份目录名
 */
function generateBackupName() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `skills.backup.${timestamp}`;
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
 * 递归删除目录
 */
async function removeDirectory(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await removeDirectory(fullPath);
    } else {
      await fs.unlink(fullPath);
    }
  }

  await fs.rmdir(dir);
}

/**
 * 备份技能目录
 */
async function backupSkills() {
  const resourcesDir = path.join(__dirname, '..', 'resources');
  const backupName = generateBackupName();
  const backupDir = path.join(resourcesDir, backupName);

  console.log('\n📦 步骤 1/4: 备份技能目录');
  console.log(`   源目录: ${SKILLS_DIR}`);
  console.log(`   备份到: ${backupDir}`);

  try {
    // 检查源目录是否存在
    await fs.access(SKILLS_DIR);

    // 创建备份
    await copyDirectory(SKILLS_DIR, backupDir);

    console.log(`   ✅ 备份成功: ${backupName}`);
    return backupDir;
  } catch (error) {
    console.error('   ❌ 备份失败:', error.message);
    throw error;
  }
}

/**
 * 执行加密迁移
 */
async function encryptMigration() {
  console.log('\n🔒 步骤 2/4: 执行加密迁移');

  try {
    // 动态导入 SkillEncryption
    const { SkillEncryption } = require('../dist-electron/security/SkillEncryption');

    // 创建加密实例
    const encryption = new SkillEncryption();

    // 执行批量加密
    const encryptedCount = await encryption.encryptSkillsDirectory(SKILLS_DIR);

    console.log(`   ✅ 加密成功: ${encryptedCount} 个技能文件`);
    return encryptedCount;
  } catch (error) {
    console.error('   ❌ 加密失败:', error.message);
    throw error;
  }
}

/**
 * 验证加密结果
 */
async function verifyEncryption() {
  console.log('\n🔍 步骤 3/4: 验证加密结果');

  try {
    // 动态导入 SkillEncryption
    const { SkillEncryption } = require('../dist-electron/security/SkillEncryption');

    const encryption = new SkillEncryption();
    let verifiedCount = 0;
    let failedCount = 0;

    // 递归验证所有 SKILL.md 文件
    const walkDir = async (dir) => {
      const files = await fs.readdir(dir, { withFileTypes: true });

      for (const file of files) {
        const fullPath = path.join(dir, file.name);

        if (file.isDirectory()) {
          await walkDir(fullPath);
        } else if (file.name === 'SKILL.md') {
          try {
            // 尝试解密文件
            await encryption.decryptSkillFile(fullPath);
            verifiedCount++;
          } catch (error) {
            console.error(`   ❌ 验证失败: ${fullPath}`);
            console.error(`      错误: ${error.message}`);
            failedCount++;
          }
        }
      }
    };

    await walkDir(SKILLS_DIR);

    console.log(`   ✅ 验证成功: ${verifiedCount} 个文件`);

    if (failedCount > 0) {
      console.log(`   ⚠️  验证失败: ${failedCount} 个文件`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('   ❌ 验证过程出错:', error.message);
    return false;
  }
}

/**
 * 回滚到备份
 */
async function rollback(backupDir) {
  console.log('\n🔄 步骤 4/4: 回滚到备份');

  try {
    // 删除当前失败的目录
    console.log(`   删除目录: ${SKILLS_DIR}`);
    await removeDirectory(SKILLS_DIR);

    // 恢复备份
    console.log(`   恢复备份: ${backupDir}`);
    await copyDirectory(backupDir, SKILLS_DIR);

    console.log('   ✅ 回滚成功');
  } catch (error) {
    console.error('   ❌ 回滚失败:', error.message);
    console.error('   ⚠️  警告：技能目录可能处于不一致状态');
    throw error;
  }
}

/**
 * 清理旧备份（保留最近 3 个）
 */
async function cleanOldBackups() {
  console.log('\n🧹 清理旧备份（保留最近 3 个）');

  try {
    const resourcesDir = path.join(__dirname, '..', 'resources');
    const entries = await fs.readdir(resourcesDir, { withFileTypes: true });

    // 找到所有备份目录
    const backups = entries
      .filter(entry => entry.isDirectory() && entry.name.startsWith('skills.backup.'))
      .map(entry => ({
        name: entry.name,
        path: path.join(resourcesDir, entry.name),
        time: new Date(entry.name.replace('skills.backup.', '').replace(/-/g, ':'))
      }))
      .sort((a, b) => b.time - a.time);

    // 删除旧备份
    if (backups.length > 3) {
      const toDelete = backups.slice(3);
      for (const backup of toDelete) {
        console.log(`   删除旧备份: ${backup.name}`);
        await removeDirectory(backup.path);
      }
      console.log(`   ✅ 清理完成：删除了 ${toDelete.length} 个旧备份`);
    } else {
      console.log('   ✅ 无需清理');
    }
  } catch (error) {
    console.warn('   ⚠️  清理失败:', error.message);
  }
}

/**
 * 主迁移流程
 */
async function migrate() {
  console.log('='.repeat(60));
  console.log('🔄 技能加密迁移工具');
  console.log('='.repeat(60));

  let backupDir = null;

  try {
    // 检查环境
    const isProduction = process.env.NODE_ENV === 'production';
    if (!isProduction) {
      console.log('\n⚠️  警告：当前未设置 NODE_ENV=production');
      console.log('   继续执行，但建议在生产环境中使用');
    }

    // 步骤 1: 备份
    backupDir = await backupSkills();

    // 步骤 2: 加密
    await encryptMigration();

    // 步骤 3: 验证
    const isValid = await verifyEncryption();

    if (!isValid) {
      throw new Error('加密验证失败');
    }

    // 步骤 4: 清理旧备份
    await cleanOldBackups();

    // 成功
    console.log('\n' + '='.repeat(60));
    console.log('✅ 迁移成功完成！');
    console.log('='.repeat(60));
    console.log('\n📋 迁移摘要:');
    console.log(`   - 备份位置: ${backupDir}`);
    console.log(`   - 当前状态: 已加密`);
    console.log('\n💡 提示：');
    console.log('   - 如有问题，可手动回滚到备份目录');
    console.log('   - 备份目录将在下次迁移时自动清理（保留最近 3 个）');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ 迁移失败！');
    console.error('='.repeat(60));
    console.error(`\n错误: ${error.message}`);

    // 尝试回滚
    if (backupDir) {
      console.log('\n🔄 正在回滚到备份...');
      try {
        await rollback(backupDir);
        console.log('✅ 已成功回滚到迁移前状态');
      } catch (rollbackError) {
        console.error('❌ 回滚也失败了！', rollbackError.message);
        console.error('\n⚠️  手动恢复步骤:');
        console.error(`   1. 删除当前目录: ${SKILLS_DIR}`);
        console.error(`   2. 重命名备份目录: ${backupDir} -> skills`);
      }
    }

    console.log('='.repeat(60));
    process.exit(1);
  }
}

/**
 * 仅备份（不加密）
 */
async function backupOnly() {
  console.log('='.repeat(60));
  console.log('📦 创建技能备份');
  console.log('='.repeat(60));

  try {
    const backupDir = await backupSkills();

    console.log('\n' + '='.repeat(60));
    console.log('✅ 备份成功完成！');
    console.log('='.repeat(60));
    console.log(`\n📋 备份位置: ${backupDir}`);
  } catch (error) {
    console.error('\n❌ 备份失败');
    console.error(error);
    process.exit(1);
  }
}

/**
 * 列出所有备份
 */
async function listBackups() {
  console.log('='.repeat(60));
  console.log('📋 技能备份列表');
  console.log('='.repeat(60));

  try {
    const resourcesDir = path.join(__dirname, '..', 'resources');
    const entries = await fs.readdir(resourcesDir, { withFileTypes: true });

    const backups = entries
      .filter(entry => entry.isDirectory() && entry.name.startsWith('skills.backup.'))
      .map(entry => ({
        name: entry.name,
        time: new Date(entry.name.replace('skills.backup.', '').replace(/-/g, ':'))
      }))
      .sort((a, b) => b.time - a.time);

    if (backups.length === 0) {
      console.log('\n📭 暂无备份');
    } else {
      console.log(`\n找到 ${backups.length} 个备份：\n`);
      backups.forEach((backup, index) => {
        console.log(`${index + 1}. ${backup.name}`);
        console.log(`   时间: ${backup.time.toLocaleString('zh-CN')}`);
        console.log('');
      });
    }

    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ 列出备份失败');
    console.error(error);
    process.exit(1);
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'migrate';

  switch (command) {
    case 'migrate':
      await migrate();
      break;
    case 'backup':
      await backupOnly();
      break;
    case 'list':
      await listBackups();
      break;
    default:
      console.log('用法:');
      console.log('  node scripts/migrate-skills.js migrate  # 执行完整迁移（默认）');
      console.log('  node scripts/migrate-skills.js backup   # 仅创建备份');
      console.log('  node scripts/migrate-skills.js list     # 列出所有备份');
      break;
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { migrate, backupSkills, rollback, listBackups };
