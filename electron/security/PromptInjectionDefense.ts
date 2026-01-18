/**
 * 提示词注入防御系统
 *
 * 基于 OWASP LLM01:2025 提示词注入攻击模式
 * 检测并防御各类提示词注入攻击，保护 AI 系统安全
 *
 * 攻击类型：
 * - 直接注入：忽略原有指令
 * - 角色扮演：要求 AI 扮演管理员或其他角色
 * - 系统提示提取：试图获取系统提示词
 * - 越狱攻击：绕过安全限制
 * - 分隔符注入：使用特殊分隔符劫持对话
 */

export interface InjectionDetection {
  isInjection: boolean
  confidence: number // 0.0 - 1.0
  reasons: string[]
  matchedPatterns: string[]
}

export class PromptInjectionDefense {
  // 攻击模式列表（基于 OWASP LLM01:2025）
  private readonly ATTACK_PATTERNS: Array<{
    pattern: RegExp
    name: string
    severity: 'high' | 'medium' | 'low'
    confidence: number
  }> = [
    // 高危：直接忽略指令
    {
      pattern: /忽略.*?(?:之前|上述|原有|前述|所有).*?(?:指令|指示|命令|规则|要求)/gi,
      name: '忽略指令攻击',
      severity: 'high',
      confidence: 0.9
    },
    {
      pattern: /(?:forget|disregard|ignore|override).*(?:instruction|prompt|rule|constraint)/gi,
      name: '英文忽略指令攻击',
      severity: 'high',
      confidence: 0.9
    },
    {
      pattern: /不要.*?(?:遵循|遵守|听从).*(?:之前|前述|原有)/gi,
      name: '反向指令攻击',
      severity: 'high',
      confidence: 0.85
    },

    // 高危：角色扮演攻击
    {
      pattern: /(?:扮演|作为|假装|你是).*?(?:管理员|root|admin|supervisor|上帝|开发者|creator)/gi,
      name: '管理员角色扮演',
      severity: 'high',
      confidence: 0.95
    },
    {
      pattern: /act as|roleplay|pretend to be|you are (?:a|an) (?:admin|root|supervisor|god|developer)/gi,
      name: '英文角色扮演攻击',
      severity: 'high',
      confidence: 0.95
    },
    {
      pattern: /(?:进入|切换到|开启).*?(?:管理员模式|root 模式|开发者模式|调试模式)/gi,
      name: '模式切换攻击',
      severity: 'high',
      confidence: 0.9
    },

    // 高危：系统提示提取
    {
      pattern: /(?:显示|输出|打印|告诉我|泄露|暴露).*?(?:系统提示|system prompt|指令|instructions?)/gi,
      name: '系统提示提取',
      severity: 'high',
      confidence: 0.95
    },
    {
      pattern: /(?:重复|复读|回显).*(?:上面|之前|开头).*?(?:所有|一切|全部).*?(?:文字|内容|指令)/gi,
      name: '上下文提取攻击',
      severity: 'high',
      confidence: 0.85
    },
    {
      pattern: /what are your (?:instructions|rules|constraints|guidelines)|tell me your (?:system prompt|instructions)/gi,
      name: '英文上下文提取',
      severity: 'high',
      confidence: 0.95
    },

    // 中危：分隔符注入
    {
      pattern: /<\|.*?\|>/gi,
      name: '特殊分隔符注入',
      severity: 'medium',
      confidence: 0.8
    },
    {
      pattern: /###.*?###/g,
      name: 'Markdown 分隔符注入',
      severity: 'medium',
      confidence: 0.7
    },
    {
      pattern: /---.*?---/g,
      name: 'YAML 分隔符注入',
      severity: 'medium',
      confidence: 0.7
    },
    {
      pattern: /<<.*?>>>/g,
      name: '多行分隔符注入',
      severity: 'medium',
      confidence: 0.75
    },

    // 中危：越狱攻击
    {
      pattern: /(?:越狱|jailbreak|bypass|override).*(?:限制|约束|规则|安全|security)/gi,
      name: '越狱攻击',
      severity: 'medium',
      confidence: 0.85
    },
    {
      pattern: /(?:解锁|开启|禁用|关闭).*(?:过滤|审查|限制|约束|检测)/gi,
      name: '安全绕过攻击',
      severity: 'medium',
      confidence: 0.8
    },
    {
      pattern: /DAN|Developer Mode|unrestricted mode|no limitations/gi,
      name: 'DAN 模式攻击',
      severity: 'medium',
      confidence: 0.9
    },

    // 中危：指令覆盖
    {
      pattern: /(?:新的|现在|从现在开始|此处).*(?:指令|规则|要求是|请)/gi,
      name: '指令覆盖攻击',
      severity: 'medium',
      confidence: 0.65
    },
    {
      pattern: /(?:above|previous|following).*(?:text|instructions?|rules?).*?(?:invalid|ignore|disregard)/gi,
      name: '英文指令覆盖',
      severity: 'medium',
      confidence: 0.7
    },

    // 低危：可疑模式
    {
      pattern: /(?:转换|切换).*(?:角色|人格|模式)/gi,
      name: '角色切换请求',
      severity: 'low',
      confidence: 0.5
    },
    {
      pattern: /(?:假设|假如|如果).*(?:你是|你可以)/gi,
      name: '假设性场景',
      severity: 'low',
      confidence: 0.4
    },
    {
      pattern: /(?:TODO|FIXME|NOTE|HINT|WARNING)[:\s]/gi,
      name: '开发者标记',
      severity: 'low',
      confidence: 0.3
    }
  ]

  /**
   * 检测输入是否包含提示词注入
   * @param input 用户输入
   * @returns 检测结果
   */
  detectInjection(input: string): InjectionDetection {
    const reasons: string[] = []
    const matchedPatterns: string[] = []
    let maxConfidence = 0.0

    for (const { pattern, name, severity, confidence } of this.ATTACK_PATTERNS) {
      if (pattern.test(input)) {
        matchedPatterns.push(name)

        // 计算综合置信度
        const patternConfidence = this.calculatePatternConfidence(input, pattern, confidence)
        maxConfidence = Math.max(maxConfidence, patternConfidence)

        const severityLabel = {
          high: '🔴 高危',
          medium: '🟠 中危',
          low: '🟡 低危'
        }[severity]

        reasons.push(`${severityLabel} - ${name} (置信度: ${(patternConfidence * 100).toFixed(0)}%)`)
      }
    }

    // 额外检查：多个攻击模式同时出现
    if (matchedPatterns.length >= 3) {
      maxConfidence = Math.min(maxConfidence * 1.2, 1.0)
      reasons.push(`⚠️ 检测到 ${matchedPatterns.length} 个攻击模式，置信度提升`)
    }

    return {
      isInjection: maxConfidence > 0.5,
      confidence: maxConfidence,
      reasons,
      matchedPatterns
    }
  }

  /**
   * 计算单个模式的置信度
   */
  private calculatePatternConfidence(
    input: string,
    pattern: RegExp,
    baseConfidence: number
  ): number {
    // 重置正则表达式状态
    pattern.lastIndex = 0

    // 计算匹配次数
    let matchCount = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(input)) !== null && matchCount < 10) {
      matchCount++
    }

    // 匹配次数越多，置信度越高
    const countMultiplier = Math.min(1 + (matchCount - 1) * 0.1, 1.5)

    // 检查匹配位置（开头或结尾的攻击更可疑）
    pattern.lastIndex = 0
    const firstMatch = pattern.exec(input)
    let positionMultiplier = 1.0

    if (firstMatch && firstMatch.index !== undefined) {
      const relativePosition = firstMatch.index / input.length
      // 开头（0-0.2）或结尾（0.8-1.0）更可疑
      if (relativePosition < 0.2 || relativePosition > 0.8) {
        positionMultiplier = 1.2
      }
    }

    return Math.min(baseConfidence * countMultiplier * positionMultiplier, 1.0)
  }

  /**
   * 清理输入中的攻击模式
   * @param input 原始输入
   * @returns 清理后的输入
   */
  sanitize(input: string): string {
    let sanitized = input

    // 移除分隔符注入
    sanitized = sanitized.replace(/<\|.*?\|>/gi, '[内容已过滤]')
    sanitized = sanitized.replace(/###.*?###/g, '[内容已过滤]')
    sanitized = sanitized.replace(/---.*?---/g, '[内容已过滤]')
    sanitized = sanitized.replace(/<<.*?>>>/g, '[内容已过滤]')

    // 对高危关键词进行警告替换
    const dangerousKeywords = [
      /忽略.*?指令/gi,
      /扮演.*?管理员/gi,
      /显示.*?系统提示/gi,
      /越狱/gi,
      /jailbreak/gi
    ]

    for (const keyword of dangerousKeywords) {
      sanitized = sanitized.replace(keyword, '[检测到可疑指令]')
    }

    return sanitized
  }

  /**
   * 生成安全警告消息
   */
  generateWarning(detection: InjectionDetection): string {
    if (!detection.isInjection) {
      return ''
    }

    const confidenceLevel = detection.confidence >= 0.8 ? '极高' :
                           detection.confidence >= 0.6 ? '高' :
                           '中等'

    let message = `⚠️ 安全警告：检测到潜在的提示词注入攻击（置信度：${confidenceLevel}）\n\n`

    if (detection.reasons.length > 0) {
      message += '检测到的攻击模式：\n'
      detection.reasons.forEach((reason, index) => {
        message += `${index + 1}. ${reason}\n`
      })
    }

    message += '\n系统已自动清理输入内容。如果这是误判，请重新表述您的问题。'

    return message
  }
}

// 导出单例
export const promptInjectionDefense = new PromptInjectionDefense()
