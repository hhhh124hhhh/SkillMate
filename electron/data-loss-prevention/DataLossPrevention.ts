/**
 * 数据丢失防护系统 (Data Loss Prevention - DLP)
 *
 * 检测并过滤敏感信息，防止 AI 输出中泄露：
 * - 个人身份信息 (PII)：身份证、手机号、邮箱、银行卡
 * - 凭证信息：API Key、Bearer Token、JWT
 *
 * 符合《个人信息保护法》《数据安全法》要求
 */

import log from 'electron-log';

export interface SensitiveDataMatch {
  type: string
  category: 'pii' | 'credential'
  original: string
  redacted: string
  position: number
  confidence: number
}

export interface DLPScanResult {
  hasSensitiveData: boolean
  categories: string[]
  findings: SensitiveDataMatch[]
  redacted: string
}

export class DataLossPrevention {
  // 个人身份信息模式（PII）
  private readonly PII_PATTERNS = {
    // 中国身份证号（18位）
    idCard: {
      pattern: /\b[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g,
      category: 'pii' as const,
      typeName: '身份证号',
      mask: (match: string) => `${match.slice(0, 4)}****${match.slice(-4)}`,
      confidence: 0.95
    },

    // 中国手机号（13/14/15/16/17/18/19开头）
    phone: {
      pattern: /\b(1[3-9]\d{9})\b/g,
      category: 'pii' as const,
      typeName: '手机号',
      mask: (match: string) => `${match.slice(0, 3)}****${match.slice(-4)}`,
      confidence: 0.9
    },

    // 邮箱地址
    email: {
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      category: 'pii' as const,
      typeName: '邮箱',
      mask: (match: string) => {
        const [local, domain] = match.split('@')
        const maskedLocal = local.length > 3
          ? local.slice(0, 2) + '***' + local.slice(-1)
          : '***'
        return `${maskedLocal}@${domain}`
      },
      confidence: 0.85
    },

    // 银行卡号（16-19位）
    bankCard: {
      pattern: /\b(\d{16}|\d{17}|\d{18}|\d{19})\b/g,
      category: 'pii' as const,
      typeName: '银行卡号',
      mask: (match: string) => `${match.slice(0, 4)}****${match.slice(-4)}`,
      confidence: 0.8
    },

    // 护照号码（G/P/S/D开头）
    passport: {
      pattern: /\b([G|P|S|D]\d{8})\b/g,
      category: 'pii' as const,
      typeName: '护照号',
      mask: (match: string) => `${match[0]}*****${match.slice(-2)}`,
      confidence: 0.9
    },

    // 社会统一信用代码（18位）
    creditCode: {
      pattern: /\b[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}\b/g,
      category: 'pii' as const,
      typeName: '统一信用代码',
      mask: (match: string) => `${match.slice(0, 6)}********${match.slice(-4)}`,
      confidence: 0.85
    }
  }

  // 凭证信息模式
  private readonly CREDENTIAL_PATTERNS = {
    // API Key（32位以上字母数字）
    apiKey: {
      pattern: /\b[A-Za-z0-9]{32,}\b/g,
      category: 'credential' as const,
      typeName: 'API密钥',
      mask: () => '***API_KEY***',
      confidence: 0.6,
      // 额外验证：必须包含大小写字母和数字
      validator: (match: string) =>
        /[A-Z]/.test(match) && /[a-z]/.test(match) && /\d/.test(match)
    },

    // Bearer Token
    bearerToken: {
      pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
      category: 'credential' as const,
      typeName: 'Bearer令牌',
      mask: () => 'Bearer ***TOKEN***',
      confidence: 0.95
    },

    // JWT Token（eyJ开头）
    jwt: {
      pattern: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
      category: 'credential' as const,
      typeName: 'JWT令牌',
      mask: () => '***JWT***',
      confidence: 0.95
    },

    // OAuth 令牌
    oauthToken: {
      pattern: /\b(AA|ya29)[A-Za-z0-9\-._~+/]{50,}\b/g,
      category: 'credential' as const,
      typeName: 'OAuth令牌',
      mask: () => '***OAUTH_TOKEN***',
      confidence: 0.9
    },

    // 密码字段（password: xxx 或 "password":"xxx"）
    passwordField: {
      pattern: /(?:password|passwd|pwd)['":\s]*['"]?([^'"\s]{8,})/gi,
      category: 'credential' as const,
      typeName: '密码字段',
      mask: () => '***',
      confidence: 0.85
    },

    // 秘钥（sk-开头，如 OpenAI API Key）
    secretKey: {
      pattern: /\b(sk-[A-Za-z0-9]{20,}|gsk_[A-Za-z0-9_\-]{30,})\b/g,
      category: 'credential' as const,
      typeName: 'API密钥',
      mask: () => '***SECRET_KEY***',
      confidence: 0.98
    }
  }

  /**
   * 扫描文本中的敏感信息
   * @param text 待扫描文本
   * @returns 扫描结果
   */
  scanSensitiveData(text: string): DLPScanResult {
    const findings: SensitiveDataMatch[] = []
    const categories = new Set<string>()
    let redacted = text

    // 扫描 PII
    for (const [, config] of Object.entries(this.PII_PATTERNS)) {
      const matches = this.findMatches(text, config.pattern, config)

      for (const match of matches) {
        findings.push(match)
        categories.add(config.typeName)

        // 替换原文
        redacted = redacted.replace(match.original, match.redacted)
      }
    }

    // 扫描凭证
    for (const [, config] of Object.entries(this.CREDENTIAL_PATTERNS)) {
      const matches = this.findMatches(text, config.pattern, config)

      for (const match of matches) {
        findings.push(match)
        categories.add(config.typeName)

        // 替换原文
        redacted = redacted.replace(match.original, match.redacted)
      }
    }

    return {
      hasSensitiveData: findings.length > 0,
      categories: Array.from(categories),
      findings,
      redacted
    }
  }

  /**
   * 查找匹配项
   */
  private findMatches(
    text: string,
    pattern: RegExp,
    config: {
      category: 'pii' | 'credential'
      typeName: string
      mask: (match: string) => string
      confidence: number
      validator?: (match: string) => boolean
    }
  ): SensitiveDataMatch[] {
    const matches: SensitiveDataMatch[] = []
    let match: RegExpExecArray | null

    // 重置正则表达式
    pattern.lastIndex = 0

    while ((match = pattern.exec(text)) !== null) {
      const original = match[0] || match[1] || match[0]

      // 验证器检查（如果有）
      if (config.validator && !config.validator(original)) {
        continue
      }

      matches.push({
        type: config.typeName,
        category: config.category,
        original,
        redacted: config.mask(original),
        position: match.index,
        confidence: config.confidence
      })
    }

    return matches
  }

  /**
   * 过滤 AI 输出中的敏感信息
   * @param output AI 输出文本
   * @returns 过滤结果
   */
  filterAIOutput(output: string): { filtered: string; hasSensitiveData: boolean } {
    const result = this.scanSensitiveData(output)

    if (result.hasSensitiveData) {
      log.warn('[DLP] 检测到敏感信息并已过滤:', {
        categories: result.categories,
        count: result.findings.length
      })

      return {
        filtered: result.redacted,
        hasSensitiveData: true
      }
    }

    return {
      filtered: output,
      hasSensitiveData: false
    }
  }

  /**
   * 生成隐私警告消息
   */
  generatePrivacyWarning(result: DLPScanResult): string {
    if (!result.hasSensitiveData) {
      return ''
    }

    let message = '🔒 隐私保护：已自动过滤以下敏感信息\n\n'

    if (result.categories.length > 0) {
      message += '检测到的敏感信息类型：\n'
      result.categories.forEach((category, index) => {
        message += `${index + 1}. ${category}\n`
      })
    }

    message += `\n共过滤 ${result.findings.length} 处敏感信息`
    message += '\n\n为了保护隐私，这些信息已被自动掩码处理。'

    return message
  }

  /**
   * 检查是否包含特定类型的敏感信息
   */
  hasSensitiveDataType(
    text: string,
    type: keyof typeof DataLossPrevention.prototype['PII_PATTERNS'] |
          keyof typeof DataLossPrevention.prototype['CREDENTIAL_PATTERNS']
  ): boolean {
    const piiPattern = this.PII_PATTERNS[type as keyof typeof this.PII_PATTERNS]
    if (piiPattern) {
      piiPattern.pattern.lastIndex = 0
      return piiPattern.pattern.test(text)
    }

    const credPattern = this.CREDENTIAL_PATTERNS[type as keyof typeof this.CREDENTIAL_PATTERNS]
    if (credPattern) {
      credPattern.pattern.lastIndex = 0
      return credPattern.pattern.test(text)
    }

    return false
  }
}

// 导出单例
export const dlp = new DataLossPrevention()
