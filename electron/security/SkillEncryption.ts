/**
 * 技能加密/解密模块
 *
 * 功能：
 * - 基于 AES-256-GCM 的内容加密
 * - 机器 ID 绑定的密钥派生
 * - 构建时批量加密
 * - 运行时解密
 *
 * 安全级别：
 * - 防止普通用户直接复制 SKILL.md
 * - 防止批量提取技能提示词
 * - 防止简单文本搜索工具找到内容
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
import { app } from 'electron';
import * as os from 'os';
import log from 'electron-log';

/**
 * 加密后的技能数据结构
 */
export interface EncryptedSkillData {
  version: '1.0';
  algorithm: 'aes-256-gcm';
  encrypted: string;    // Hex 编码密文
  authTag: string;      // Hex 编码认证标签
  iv: string;           // Hex 编码初始化向量
  timestamp: number;    // 加密时间戳
}

/**
 * 技能加密类
 */
export class SkillEncryption {
  private cache: Map<string, string> = new Map();
  private machineId: string;

  constructor() {
    // 获取机器 ID（生产环境）或使用开发 ID（开发环境）
    this.machineId = app.isPackaged
      ? this.getMachineIdSync()
      : 'development-machine-id';
  }

  /**
   * 同步获取机器唯一 ID
   */
  private getMachineIdSync(): string {
    // 降级方案：基于操作系统特征
    const hash = crypto.createHash('sha256');
    hash.update(os.hostname());
    hash.update(os.platform());
    hash.update(os.arch());
    return hash.digest('hex');
  }

  /**
   * 派生加密密钥
   *
   * 使用 HKDF-SHA256 从机器 ID 派生密钥
   * 与 API Key 加密使用不同的盐值，确保密钥独立性
   */
  private deriveEncryptionKey(): Buffer {
    // 技能加密专用盐值
    const salt = crypto.createHash('sha256')
      .update(this.machineId + 'skill-encryption-v1')
      .digest();

    // 使用 HKDF 派生密钥
    const key = crypto.hkdfSync(
      'sha256',
      Buffer.from(this.machineId),
      salt,
      Buffer.from('skill-encryption-v1'),
      32  // 256 位密钥
    );

    return Buffer.from(key);
  }

  /**
   * 加密内容
   *
   * @param content - 要加密的明文内容
   * @returns 加密后的数据结构
   */
  public encrypt(content: string): EncryptedSkillData {
    const key = this.deriveEncryptionKey();

    // 生成随机 IV（初始化向量）
    const iv = crypto.randomBytes(16);

    // 使用 AES-256-GCM 加密
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(content, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // 获取认证标签（用于验证数据完整性）
    const authTag = cipher.getAuthTag();

    return {
      version: '1.0',
      algorithm: 'aes-256-gcm',
      encrypted: encrypted,
      authTag: authTag.toString('hex'),
      iv: iv.toString('hex'),
      timestamp: Date.now()
    };
  }

  /**
   * 解密内容
   *
   * @param encryptedData - 加密的数据结构
   * @returns 解密后的明文内容
   * @throws 如果解密失败或数据被篡改
   */
  public decrypt(encryptedData: EncryptedSkillData): string {
    // 验证版本
    if (encryptedData.version !== '1.0') {
      throw new Error(`不支持的加密版本: ${encryptedData.version}`);
    }

    // 验证算法
    if (encryptedData.algorithm !== 'aes-256-gcm') {
      throw new Error(`不支持的加密算法: ${encryptedData.algorithm}`);
    }

    const key = this.deriveEncryptionKey();

    // 解析 Hex 编码的数据
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const encrypted = Buffer.from(encryptedData.encrypted, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');

    // 使用 AES-256-GCM 解密
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);

    // 设置认证标签（验证数据完整性）
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString('utf8');
  }

  /**
   * 检查是否为生产环境
   */
  private isProduction(): boolean {
    return process.env.NODE_ENV === 'production' || app.isPackaged;
  }

  /**
   * 加密单个技能文件
   *
   * @param filePath - SKILL.md 文件路径
   * @throws 如果文件格式错误或加密失败
   */
  public async encryptSkillFile(filePath: string): Promise<void> {
    // 开发模式不加密
    if (!this.isProduction()) {
      log.log(`[SkillEncryption] 开发模式跳过加密: ${filePath}`);
      return;
    }

    try {
      // 读取文件内容
      const content = await fs.readFile(filePath, 'utf-8');

      // 解析 YAML frontmatter
      const parts = content.split('---');
      if (parts.length < 3) {
        throw new Error(`文件格式错误（缺少 YAML frontmatter）: ${filePath}`);
      }

      const frontmatter = yaml.parse(parts[1]) as any;
      const instructions = parts.slice(2).join('---').trim();

      // 检查是否已经加密
      if (frontmatter?.encryption) {
        log.log(`[SkillEncryption] 文件已加密，跳过: ${filePath}`);
        return;
      }

      // 加密 instructions 内容
      const encryptedData = this.encrypt(instructions);

      // 更新 frontmatter
      frontmatter.encryption = encryptedData;

      // 重新组装文件内容（加密后 instructions 为占位符）
      const newContent = `---\n${yaml.stringify(frontmatter)}---\n[Content encrypted for production]\n`;

      // 写回文件
      await fs.writeFile(filePath, newContent, 'utf-8');

      log.log(`[SkillEncryption] ✅ 加密成功: ${filePath}`);
    } catch (error) {
      log.error(`[SkillEncryption] ❌ 加密失败: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * 批量加密技能目录
   *
   * @param skillsDir - 技能目录路径
   * @returns 加密的文件数量
   */
  public async encryptSkillsDirectory(skillsDir: string): Promise<number> {
    log.log(`[SkillEncryption] 开始批量加密目录: ${skillsDir}`);

    let encryptedCount = 0;
    let skippedCount = 0;

    try {
      // 递归遍历所有 SKILL.md 文件
      const walkDir = async (dir: string): Promise<string[]> => {
        const files = await fs.readdir(dir, { withFileTypes: true });
        const skillFiles: string[] = [];

        for (const file of files) {
          const fullPath = path.join(dir, file.name);

          if (file.isDirectory()) {
            // 递归子目录
            const subFiles = await walkDir(fullPath);
            skillFiles.push(...subFiles);
          } else if (file.name === 'SKILL.md') {
            // 找到 SKILL.md 文件
            skillFiles.push(fullPath);
          }
        }

        return skillFiles;
      };

      const skillFiles = await walkDir(skillsDir);

      log.log(`[SkillEncryption] 找到 ${skillFiles.length} 个技能文件`);

      // 逐个加密
      for (const filePath of skillFiles) {
        try {
          await this.encryptSkillFile(filePath);
          encryptedCount++;
        } catch (error) {
          log.error(`[SkillEncryption] 加密失败: ${filePath}`, error);
          skippedCount++;
        }
      }

      log.log(`[SkillEncryption] ✅ 批量加密完成: ${encryptedCount} 个成功, ${skippedCount} 个跳过`);
      return encryptedCount;
    } catch (error) {
      log.error(`[SkillEncryption] ❌ 批量加密失败:`, error);
      throw error;
    }
  }

  /**
   * 解密单个技能文件（用于验证）
   *
   * @param filePath - SKILL.md 文件路径
   * @returns 解密后的内容，如果未加密则返回原文
   */
  public async decryptSkillFile(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parts = content.split('---');
      const frontmatter = yaml.parse(parts[1]) as any;

      // 检查是否加密
      if (frontmatter?.encryption) {
        // 使用缓存（如果有的话）
        const cacheKey = filePath + frontmatter.encryption.timestamp;

        if (this.cache.has(cacheKey)) {
          return this.cache.get(cacheKey)!;
        }

        // 解密内容
        const decrypted = this.decrypt(frontmatter.encryption);

        // 缓存解密结果
        this.cache.set(cacheKey, decrypted);

        return decrypted;
      } else {
        // 未加密，返回原文
        return parts.slice(2).join('---').trim();
      }
    } catch (error) {
      log.error(`[SkillEncryption] 解密失败: ${filePath}`, error);
      throw error;
    }
  }

  /**
   * 清空解密缓存
   */
  public clearCache(): void {
    this.cache.clear();
    log.log('[SkillEncryption] 缓存已清空');
  }

  /**
   * 获取加密统计信息
   */
  public getStats() {
    return {
      cacheSize: this.cache.size,
      machineId: this.machineId,
      isProduction: this.isProduction()
    };
  }
}

export default SkillEncryption;
