/**
 * 简单的技能加密测试运行器
 *
 * 运行方式：
 * node tests/run-encryption-tests.js
 *
 * 此脚本不依赖外部测试框架，可以直接运行
 */

// 导入编译后的模块
const { SkillEncryption } = require('../dist-electron/security/SkillEncryption');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

// 测试结果统计
let passedTests = 0;
let failedTests = 0;
const testResults = [];

/**
 * 测试辅助函数
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(`断言失败: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}\n  期望: ${expected}\n  实际: ${actual}`);
  }
}

function assertThrows(fn, message) {
  try {
    fn();
    throw new Error(`${message}\n  期望函数抛出错误，但没有抛出`);
  } catch (error) {
    // 期望抛出错误，测试通过
    if (error.message.includes('期望函数抛出错误')) {
      throw error;
    }
  }
}

/**
 * 运行单个测试
 */
async function runTest(name, testFn) {
  try {
    await testFn();
    passedTests++;
    testResults.push({ name, status: 'PASS' });
    console.log(`  ✅ ${name}`);
  } catch (error) {
    failedTests++;
    testResults.push({ name, status: 'FAIL', error: error.message });
    console.log(`  ❌ ${name}`);
    console.log(`     错误: ${error.message}`);
  }
}

/**
 * 测试套件
 */
async function runAllTests() {
  console.log('='.repeat(60));
  console.log('🔒 技能加密模块测试');
  console.log('='.repeat(60));

  const encryption = new SkillEncryption();

  // 创建临时测试目录
  const testDir = path.join(os.tmpdir(), 'skill-encryption-test-' + Date.now());
  await fs.mkdir(testDir, { recursive: true });

  try {
    // 测试组 1: 基础加密/解密
    console.log('\n📋 测试组 1: 基础加密/解密');
    await runTest('应该正确加密和解密文本', () => {
      const plaintext = '这是一个测试技能内容';
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);
      assertEqual(decrypted, plaintext, '解密结果与原文不匹配');
    });

    await runTest('每次加密应该产生不同的密文', () => {
      const plaintext = '测试内容';
      const encrypted1 = encryption.encrypt(plaintext);
      const encrypted2 = encryption.encrypt(plaintext);

      assert(encrypted1.encrypted !== encrypted2.encrypted, '密文应该不同');
      assert(encrypted1.iv !== encrypted2.iv, 'IV 应该不同');
      assertEqual(encryption.decrypt(encrypted1), plaintext, '第一次解密失败');
      assertEqual(encryption.decrypt(encrypted2), plaintext, '第二次解密失败');
    });

    await runTest('应该正确处理空字符串', () => {
      const plaintext = '';
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);
      assertEqual(decrypted, plaintext, '空字符串处理失败');
    });

    await runTest('应该正确处理特殊字符', () => {
      const plaintext = '🔒加密测试\n换行符\t制表符"引号\'单引号';
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);
      assertEqual(decrypted, plaintext, '特殊字符处理失败');
    });

    // 测试组 2: 加密数据结构
    console.log('\n📋 测试组 2: 加密数据结构');
    await runTest('应该返回正确的数据结构', () => {
      const plaintext = '测试内容';
      const encrypted = encryption.encrypt(plaintext);

      assert(encrypted.version !== undefined, '缺少 version 字段');
      assert(encrypted.algorithm !== undefined, '缺少 algorithm 字段');
      assert(encrypted.encrypted !== undefined, '缺少 encrypted 字段');
      assert(encrypted.authTag !== undefined, '缺少 authTag 字段');
      assert(encrypted.iv !== undefined, '缺少 iv 字段');
      assert(encrypted.timestamp !== undefined, '缺少 timestamp 字段');
    });

    await runTest('应该使用 AES-256-GCM 算法', () => {
      const plaintext = '测试内容';
      const encrypted = encryption.encrypt(plaintext);

      assertEqual(encrypted.version, '1.0', '版本号错误');
      assertEqual(encrypted.algorithm, 'aes-256-gcm', '算法错误');
    });

    await runTest('加密数据应该是有效的 Hex 字符串', () => {
      const plaintext = '测试内容';
      const encrypted = encryption.encrypt(plaintext);

      const hexRegex = /^[0-9a-f]+$/i;
      assert(hexRegex.test(encrypted.encrypted), '密文不是有效的 Hex');
      assert(hexRegex.test(encrypted.iv), 'IV 不是有效的 Hex');
      assert(hexRegex.test(encrypted.authTag), 'AuthTag 不是有效的 Hex');
      assertEqual(encrypted.iv.length, 32, 'IV 长度错误');
      assertEqual(encrypted.authTag.length, 32, 'AuthTag 长度错误');
    });

    // 测试组 3: 防篡改验证
    console.log('\n📋 测试组 3: 防篡改验证');
    await runTest('应该拒绝修改过的密文', () => {
      const plaintext = '测试内容';
      const encrypted = encryption.encrypt(plaintext);

      const tamperedData = {
        ...encrypted,
        encrypted: '0' + encrypted.encrypted.slice(1)
      };

      assertThrows(() => {
        encryption.decrypt(tamperedData);
      }, '应该拒绝修改过的密文');
    });

    await runTest('应该拒绝错误的认证标签', () => {
      const plaintext = '测试内容';
      const encrypted = encryption.encrypt(plaintext);

      const tamperedData = {
        ...encrypted,
        authTag: '0'.repeat(32)
      };

      assertThrows(() => {
        encryption.decrypt(tamperedData);
      }, '应该拒绝错误的认证标签');
    });

    // 测试组 4: 错误处理
    console.log('\n📋 测试组 4: 错误处理');
    await runTest('应该拒绝不支持的加密版本', () => {
      const invalidData = {
        version: '2.0',
        algorithm: 'aes-256-gcm',
        encrypted: 'test',
        authTag: 'test',
        iv: 'test',
        timestamp: Date.now()
      };

      assertThrows(() => {
        encryption.decrypt(invalidData);
      }, '应该拒绝不支持的版本');
    });

    await runTest('应该拒绝不支持的加密算法', () => {
      const invalidData = {
        version: '1.0',
        algorithm: 'aes-128-cbc',
        encrypted: 'test',
        authTag: 'test',
        iv: 'test',
        timestamp: Date.now()
      };

      assertThrows(() => {
        encryption.decrypt(invalidData);
      }, '应该拒绝不支持的算法');
    });

    // 测试组 5: 文件加密
    console.log('\n📋 测试组 5: 文件加密');
    await runTest('应该正确加密和解密技能文件', async () => {
      const skillContent = `---
name: test-skill
description: 测试技能
---

这是一个测试技能的内容。`;
      const skillPath = path.join(testDir, 'SKILL.md');
      await fs.writeFile(skillPath, skillContent, 'utf-8');

      await encryption.encryptSkillFile(skillPath);

      const encryptedContent = await fs.readFile(skillPath, 'utf-8');
      assert(encryptedContent.includes('encryption:'), '文件应包含 encryption 字段');
      assert(encryptedContent.includes('[Content encrypted for production]'), '文件应包含加密提示');

      const decryptedContent = await encryption.decryptSkillFile(skillPath);
      assert(decryptedContent.includes('这是一个测试技能的内容'), '解密内容不正确');
    });

    // 测试组 6: 性能测试
    console.log('\n📋 测试组 6: 性能测试');
    await runTest('单个加密操作应该在 100ms 内完成', () => {
      const plaintext = '测试内容'.repeat(100);
      const startTime = Date.now();

      encryption.encrypt(plaintext);

      const duration = Date.now() - startTime;
      assert(duration < 100, `加密耗时 ${duration}ms，超过 100ms`);
    });

    await runTest('单个解密操作应该在 100ms 内完成', () => {
      const plaintext = '测试内容'.repeat(100);
      const encrypted = encryption.encrypt(plaintext);
      const startTime = Date.now();

      encryption.decrypt(encrypted);

      const duration = Date.now() - startTime;
      assert(duration < 100, `解密耗时 ${duration}ms，超过 100ms`);
    });

    // 测试组 7: 统计信息
    console.log('\n📋 测试组 7: 统计信息');
    await runTest('应该返回正确的统计信息', () => {
      const stats = encryption.getStats();

      assert(typeof stats.cacheSize === 'number', 'cacheSize 应该是数字');
      assert(typeof stats.machineId === 'string', 'machineId 应该是字符串');
      assert(typeof stats.isProduction === 'boolean', 'isProduction 应该是布尔值');
    });

  } finally {
    // 清理临时目录
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // 忽略清理错误
    }
  }

  // 打印测试结果
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果统计');
  console.log('='.repeat(60));
  console.log(`总计: ${passedTests + failedTests} 个测试`);
  console.log(`✅ 通过: ${passedTests}`);
  console.log(`❌ 失败: ${failedTests}`);
  console.log(`📈 通过率: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);

  if (failedTests > 0) {
    console.log('\n❌ 失败的测试:');
    testResults
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.log(`  - ${r.name}`);
        console.log(`    ${r.error}`);
      });
  }

  console.log('='.repeat(60));

  // 返回退出码
  process.exit(failedTests > 0 ? 1 : 0);
}

// 运行测试
runAllTests().catch(error => {
  console.error('❌ 测试运行失败:', error);
  process.exit(1);
});
