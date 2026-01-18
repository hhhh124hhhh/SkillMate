/**
 * 技能加密模块单元测试
 *
 * 运行方式：
 * npm run test  （如果配置了测试运行器）
 * 或直接运行：
 * npx tsx tests/skill-encryption.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SkillEncryption, EncryptedSkillData } from '../electron/security/SkillEncryption';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('SkillEncryption', () => {
  let encryption: SkillEncryption;
  let testDir: string;

  beforeAll(async () => {
    // 创建临时测试目录
    testDir = path.join(os.tmpdir(), 'skill-encryption-test');
    await fs.mkdir(testDir, { recursive: true });

    // 创建加密实例
    encryption = new SkillEncryption();
  });

  afterAll(async () => {
    // 清理临时目录
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // 忽略清理错误
    }
  });

  describe('基础加密/解密', () => {
    it('应该正确加密和解密文本', () => {
      const plaintext = '这是一个测试技能内容';
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('每次加密应该产生不同的密文', () => {
      const plaintext = '测试内容';

      const encrypted1 = encryption.encrypt(plaintext);
      const encrypted2 = encryption.encrypt(plaintext);

      // 由于随机 IV，密文应该不同
      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.authTag).not.toBe(encrypted2.authTag);

      // 但解密后应该相同
      expect(encryption.decrypt(encrypted1)).toBe(plaintext);
      expect(encryption.decrypt(encrypted2)).toBe(plaintext);
    });

    it('应该正确处理空字符串', () => {
      const plaintext = '';
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('应该正确处理特殊字符', () => {
      const plaintext = '🔒加密测试\n换行符\t制表符\r\n回车换行"引号\'单引号';
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('应该正确处理长文本', () => {
      const plaintext = 'A'.repeat(10000);
      const encrypted = encryption.encrypt(plaintext);
      const decrypted = encryption.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('加密数据结构', () => {
    it('应该返回正确的数据结构', () => {
      const plaintext = '测试内容';
      const encrypted = encryption.encrypt(plaintext);

      expect(encrypted).toHaveProperty('version');
      expect(encrypted).toHaveProperty('algorithm');
      expect(encrypted).toHaveProperty('encrypted');
      expect(encrypted).toHaveProperty('authTag');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('timestamp');
    });

    it('应该使用 AES-256-GCM 算法', () => {
      const plaintext = '测试内容';
      const encrypted = encryption.encrypt(plaintext);

      expect(encrypted.version).toBe('1.0');
      expect(encrypted.algorithm).toBe('aes-256-gcm');
    });

    it('加密数据应该是有效的 Hex 字符串', () => {
      const plaintext = '测试内容';
      const encrypted = encryption.encrypt(plaintext);

      // 验证 Hex 格式
      expect(encrypted.encrypted).toMatch(/^[0-9a-f]+$/i);
      expect(encrypted.iv).toMatch(/^[0-9a-f]+$/i);
      expect(encrypted.authTag).toMatch(/^[0-9a-f]+$/i);

      // 验证长度
      expect(encrypted.iv.length).toBe(32); // 16 bytes = 32 hex chars
      expect(encrypted.authTag.length).toBe(32); // 16 bytes = 32 hex chars
    });

    it('应该包含合理的时间戳', () => {
      const beforeTime = Date.now();
      const plaintext = '测试内容';
      const encrypted = encryption.encrypt(plaintext);
      const afterTime = Date.now();

      expect(encrypted.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(encrypted.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('防篡改验证', () => {
    it('应该拒绝修改过的密文', () => {
      const plaintext = '测试内容';
      const encrypted = encryption.encrypt(plaintext);

      // 修改密文
      const tamperedData: EncryptedSkillData = {
        ...encrypted,
        encrypted: '0' + encrypted.encrypted.slice(1)
      };

      expect(() => {
        encryption.decrypt(tamperedData);
      }).toThrow();
    });

    it('应该拒绝错误的认证标签', () => {
      const plaintext = '测试内容';
      const encrypted = encryption.encrypt(plaintext);

      // 修改认证标签
      const tamperedData: EncryptedSkillData = {
        ...encrypted,
        authTag: '0'.repeat(32)
      };

      expect(() => {
        encryption.decrypt(tamperedData);
      }).toThrow();
    });

    it('应该拒绝错误的 IV', () => {
      const plaintext = '测试内容';
      const encrypted = encryption.encrypt(plaintext);

      // 修改 IV
      const tamperedData: EncryptedSkillData = {
        ...encrypted,
        iv: '0'.repeat(32)
      };

      expect(() => {
        encryption.decrypt(tamperedData);
      }).toThrow();
    });
  });

  describe('错误处理', () => {
    it('应该拒绝不支持的加密版本', () => {
      const invalidData: EncryptedSkillData = {
        version: '2.0',
        algorithm: 'aes-256-gcm',
        encrypted: 'test',
        authTag: 'test',
        iv: 'test',
        timestamp: Date.now()
      };

      expect(() => {
        encryption.decrypt(invalidData);
      }).toThrow(/不支持的加密版本/);
    });

    it('应该拒绝不支持的加密算法', () => {
      const invalidData: EncryptedSkillData = {
        version: '1.0',
        algorithm: 'aes-128-cbc',
        encrypted: 'test',
        authTag: 'test',
        iv: 'test',
        timestamp: Date.now()
      };

      expect(() => {
        encryption.decrypt(invalidData);
      }).toThrow(/不支持的加密算法/);
    });
  });

  describe('文件加密', () => {
    it('应该正确加密和解密技能文件', async () => {
      // 创建测试技能文件
      const skillContent = `---
name: test-skill
description: 测试技能
---

这是一个测试技能的内容。`;
      const skillPath = path.join(testDir, 'SKILL.md');
      await fs.writeFile(skillPath, skillContent, 'utf-8');

      // 加密文件
      await encryption.encryptSkillFile(skillPath);

      // 读取加密后的文件
      const encryptedContent = await fs.readFile(skillPath, 'utf-8');

      // 验证文件格式
      expect(encryptedContent).toContain('encryption:');
      expect(encryptedContent).toContain('[Content encrypted for production]');

      // 解密文件
      const decryptedContent = await encryption.decryptSkillFile(skillPath);

      // 验证解密内容
      expect(decryptedContent).toContain('这是一个测试技能的内容');
    });

    it('应该跳过已加密的文件', async () => {
      // 创建已加密的文件
      const encryptedContent = `---
name: test-skill
description: 测试技能
encryption:
  version: 1.0
  algorithm: aes-256-gcm
  encrypted: test
  authTag: test
  iv: test
  timestamp: ${Date.now()}
---

[Content encrypted for production]`;
      const skillPath = path.join(testDir, 'SKILL2.md');
      await fs.writeFile(skillPath, encryptedContent, 'utf-8');

      // 应该不抛出错误
      await expect(encryption.encryptSkillFile(skillPath)).resolves.toBeUndefined();
    });
  });

  describe('性能测试', () => {
    it('单个加密操作应该在合理时间内完成', () => {
      const plaintext = '测试内容'.repeat(100); // ~800 字符
      const startTime = Date.now();

      encryption.encrypt(plaintext);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // 应该在 100ms 内完成
    });

    it('单个解密操作应该在合理时间内完成', () => {
      const plaintext = '测试内容'.repeat(100);
      const encrypted = encryption.encrypt(plaintext);
      const startTime = Date.now();

      encryption.decrypt(encrypted);

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // 应该在 100ms 内完成
    });
  });

  describe('缓存功能', () => {
    it('应该缓存解密结果', async () => {
      // 创建测试文件
      const skillContent = `---
name: test-cache
description: 缓存测试
---

测试缓存功能的内容。`;
      const skillPath = path.join(testDir, 'SKILL3.md');
      await fs.writeFile(skillPath, skillContent, 'utf-8');

      // 加密文件
      await encryption.encryptSkillFile(skillPath);

      // 第一次解密
      const stats1 = encryption.getStats();
      await encryption.decryptSkillFile(skillPath);
      const stats2 = encryption.getStats();

      expect(stats2.cacheSize).toBeGreaterThan(stats1.cacheSize);

      // 第二次解密应该使用缓存
      const startTime = Date.now();
      await encryption.decryptSkillFile(skillPath);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10); // 缓存命中应该很快
    });

    it('应该能够清空缓存', async () => {
      const plaintext = '测试内容';
      const encrypted = encryption.encrypt(plaintext);
      encryption.decrypt(encrypted);

      const statsBefore = encryption.getStats();
      expect(statsBefore.cacheSize).toBeGreaterThan(0);

      encryption.clearCache();

      const statsAfter = encryption.getStats();
      expect(statsAfter.cacheSize).toBe(0);
    });
  });

  describe('统计信息', () => {
    it('应该返回正确的统计信息', () => {
      const stats = encryption.getStats();

      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('machineId');
      expect(stats).toHaveProperty('isProduction');
      expect(typeof stats.cacheSize).toBe('number');
      expect(typeof stats.machineId).toBe('string');
      expect(typeof stats.isProduction).toBe('boolean');
    });
  });
});

// 如果直接运行此文件，执行测试
if (require.main === module) {
  console.log('⚠️  请使用测试框架运行此文件，例如：');
  console.log('   npx vitest tests/skill-encryption.test.ts');
  console.log('   或配置 package.json 的 test 脚本');
}
