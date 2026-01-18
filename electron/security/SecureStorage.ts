import crypto from 'crypto'
import os from 'os'
import { app } from 'electron'
import fs from 'fs/promises'
import path from 'path'

/**
 * 🔒 安全存储管理器
 *
 * 使用 AES-256-GCM 加密算法保护敏感数据（API Key 等）
 * 密钥基于机器唯一 ID 派生，确保不同机器无法解密同一加密数据
 *
 * @security
 * - 加密算法：AES-256-GCM（认证加密）
 * - 密钥派生：HKDF-SHA256（基于机器 ID）
 * - 文件权限：0o600（仅所有者可读写）
 */
export class SecureStorage {
  private algorithm = 'aes-256-gcm'
  private keyLength = 32 // 256 bits
  private ivLength = 16 // 128 bits
  private authTagLength = 16 // 128 bits

  /**
   * 生成派生密钥（基于机器 ID + 应用 ID）
   *
   * 使用 HKDF (HMAC-based Extract-and-Expand Key Derivation Function)
   * 确保密钥的密码学强度和不可预测性
   */
  private deriveKey(): Buffer {
    const machineId = this.getMachineId()
    const appId = 'com.wechatflowwork.app'
    const salt = crypto.createHash('sha256').update(machineId + appId).digest()

    // 使用 HKDF 派生密钥
    return crypto.hkdfSync(
      'sha256',
      Buffer.from(machineId),
      salt,
      Buffer.from(appId),
      this.keyLength
    )
  }

  /**
   * 获取机器唯一 ID（平台无关）
   *
   * 优先使用 Electron 的 machineId API，失败则使用操作系统特征
   */
  private getMachineId(): string {
    try {
      // 优先使用 Electron 的 machineId（基于硬件特征生成）
      const { machineId } = require('electron')
      return machineId()
    } catch {
      // 备选方案：基于操作系统特征（仅用于开发模式）
      const platform = os.platform()
      const hostname = os.hostname()
      const cpus = os.cpus()[0]?.model || 'unknown'
      return `${platform}-${hostname}-${cpus}`
    }
  }

  /**
   * 加密数据
   *
   * @param plaintext - 明文数据
   * @returns 加密结果（密文、认证标签、IV）
   */
  encrypt(plaintext: string): { encrypted: string; authTag: string; iv: string } {
    if (!plaintext) {
      throw new Error('[SecureStorage] Cannot encrypt empty plaintext')
    }

    const key = this.deriveKey()
    const iv = crypto.randomBytes(this.ivLength)
    const cipher = crypto.createCipheriv(this.algorithm, key, iv)

    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag()

    return {
      encrypted,
      authTag: authTag.toString('hex'),
      iv: iv.toString('hex')
    }
  }

  /**
   * 解密数据
   *
   * @param encrypted - 十六进制密文
   * @param authTag - 认证标签（十六进制）
   * @param iv - 初始化向量（十六进制）
   * @returns 解密后的明文
   * @throws 如果解密失败（密钥错误、数据损坏等）
   */
  decrypt(encrypted: string, authTag: string, iv: string): string {
    if (!encrypted || !authTag || !iv) {
      throw new Error('[SecureStorage] Missing required parameters for decryption')
    }

    const key = this.deriveKey()
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      key,
      Buffer.from(iv, 'hex')
    )

    decipher.setAuthTag(Buffer.from(authTag, 'hex'))

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

  /**
   * 获取加密配置文件路径
   */
  private getConfigPath(): string {
    const userData = app.getPath('userData')
    return path.join(userData, '.secure-config.json')
  }

  /**
   * 安全存储 API Key
   *
   * @param key - API Key
   */
  async storeApiKey(key: string): Promise<void> {
    if (!key || key.trim().length === 0) {
      throw new Error('[SecureStorage] Cannot store empty API key')
    }

    try {
      const encrypted = this.encrypt(key)
      const configPath = this.getConfigPath()

      // 存储加密后的数据
      const encryptedConfig = {
        apiKey: encrypted,
        encryptedAt: Date.now(),
        version: '1.0'
      }

      // 确保目录存在
      const configDir = path.dirname(configPath)
      await fs.mkdir(configDir, { recursive: true })

      // 写入文件（权限 0o600）
      await fs.writeFile(configPath, JSON.stringify(encryptedConfig, null, 2), {
        mode: 0o600  // 仅所有者可读写
      })

      console.log('[SecureStorage] ✅ API key encrypted and stored securely')
    } catch (error) {
      console.error('[SecureStorage] ❌ Failed to store API key:', error)
      throw error
    }
  }

  /**
   * 获取解密后的 API Key
   *
   * @returns API Key，如果不存在或解密失败则返回空字符串
   */
  async getApiKey(): Promise<string> {
    const configPath = this.getConfigPath()

    try {
      // 检查文件是否存在
      await fs.access(configPath)
    } catch {
      // 文件不存在，返回空字符串
      return ''
    }

    try {
      const content = await fs.readFile(configPath, 'utf-8')
      const encryptedConfig = JSON.parse(content)
      const { apiKey, encryptedAt, version } = encryptedConfig

      // 检查加密数据是否过期（可选，例如 1 年）
      const maxAge = 365 * 24 * 60 * 60 * 1000
      if (encryptedAt && Date.now() - encryptedAt > maxAge) {
        console.warn('[SecureStorage] ⚠️ Encrypted API key is too old, please re-enter')
        return ''
      }

      // 解密 API Key
      const decryptedKey = this.decrypt(apiKey.encrypted, apiKey.authTag, apiKey.iv)

      console.log('[SecureStorage] ✅ API key decrypted successfully')
      return decryptedKey
    } catch (error) {
      console.error('[SecureStorage] ❌ Failed to decrypt API key:', error)
      return ''
    }
  }

  /**
   * 清除存储的 API Key
   */
  async clearApiKey(): Promise<void> {
    const configPath = this.getConfigPath()

    try {
      await fs.unlink(configPath)
      console.log('[SecureStorage] ✅ API key cleared')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('[SecureStorage] ❌ Failed to clear API key:', error)
      }
    }
  }

  /**
   * 检查是否已存储 API Key
   */
  async hasApiKey(): Promise<boolean> {
    const configPath = this.getConfigPath()

    try {
      await fs.access(configPath)
      return true
    } catch {
      return false
    }
  }
}

// 导出单例
export const secureStorage = new SecureStorage()
