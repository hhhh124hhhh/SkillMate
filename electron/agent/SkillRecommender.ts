/**
 * 技能推荐器
 * 根据用户输入智能推荐合适的技能
 */

import log from 'electron-log';

export interface SkillRecommendation {
  skillId: string;
  skillName: string;
  confidence: number; // 0-1，推荐置信度
  reason: string; // 推荐理由（小白友好的解释）
}

export interface IntentPattern {
  keywords: string[]; // 关键词列表
  skillId: string; // 对应的技能ID
  skillName: string; // 技能友好名称
  reason: string; // 推荐理由
  weight: number; // 权重（影响置信度计算）
}

/**
 * 技能推荐器类
 */
export class SkillRecommender {
  private patterns: IntentPattern[] = [];

  constructor() {
    this.initializePatterns();
  }

  /**
   * 初始化意图模式（关键词到技能的映射）
   */
  private initializePatterns(): void {
    this.patterns = [
      // AI写作助手 (ai-writer)
      {
        keywords: ['润色', '改写', '优化', '修改', '扩写', '精简', '缩写', '改',
                   '顺口', '通顺', '换个说法', '换个风格', '语气', '更生动',
                   '更简洁', '更专业', '更通俗', '文字', '句子', '段落'],
        skillId: 'ai-writer',
        skillName: 'AI写作助手',
        reason: '帮你润色文字、换个风格、扩充内容',
        weight: 1.0
      },

      // 标题生成器 (title-generator)
      {
        keywords: ['标题', '题目', '起标题', '想标题', '标题党', '吸引人',
                   '爆款标题', '标题不好', '改标题', '新标题'],
        skillId: 'title-generator',
        skillName: '标题生成器',
        reason: '帮你生成10个吸引人的标题',
        weight: 1.2 // 标题需求通常比较明确
      },

      // 选题选择器 (topic-selector)
      {
        keywords: ['选题', '写什么', '主题', '话题', '题材', '内容方向',
                   '没灵感', '不知道写啥', '热门话题', '热点', '趋势'],
        skillId: 'topic-selector',
        skillName: '选题选择器',
        reason: '帮你找到热门写作话题',
        weight: 1.1
      },

      // 头图生成器 (cover-generator)
      {
        keywords: ['封面', '头图', '首图', 'banner', '海报', '配图',
                   '封面图', '封面设计', '做封面', '封面不好看'],
        skillId: 'cover-generator',
        skillName: '头图生成器',
        reason: '帮你生成公众号封面图',
        weight: 1.1
      },

      // 头脑风暴 (brainstorming)
      {
        keywords: ['头脑风暴', '创意', '点子', '想法', '脑暴', '发散思维',
                   '更多点子', '新思路', '灵感', '创新'],
        skillId: 'brainstorming',
        skillName: '头脑风暴',
        reason: '帮你想出更多创意点子',
        weight: 1.0
      },

      // 微信写作 (wechat-writing)
      {
        keywords: ['写文章', '写作', '写一篇', '帮我写', '从头写',
                   '写完整', '完整文章', '长文', '文章草稿'],
        skillId: 'wechat-writing',
        skillName: '微信写作',
        reason: '从头到尾帮你写篇文章',
        weight: 1.0
      },

      // 自然写作 (natural-writer)
      {
        keywords: ['人味', '人话', '太生硬', '太正式', '像人写的',
                   '自然一点', '口语化', '接地气', '不那么像AI'],
        skillId: 'natural-writer',
        skillName: '自然写作',
        reason: '让文字更像人写的',
        weight: 1.1
      },

      // 图片生成 (image-generation)
      {
        keywords: ['配图', '插图', '生成图片', '画图', '图片', '图像',
                   '作图', '需要图', '要图'],
        skillId: 'image-generation',
        skillName: '图片生成',
        reason: '帮你生成配图和插图',
        weight: 1.0
      },

      // 数据分析 (data-analyzer)
      {
        keywords: ['数据分析', '分析数据', '阅读量', '点赞', '在看', '分享',
                   '粉丝', '用户画像', '数据报告', '表现', '效果'],
        skillId: 'data-analyzer',
        skillName: '数据分析',
        reason: '帮你分析公众号数据',
        weight: 1.1
      },

      // 风格学习 (style-learner)
      {
        keywords: ['风格', '学习风格', '模仿', '我的风格', '保持风格',
                   '像我的', '统一风格', '风格一致'],
        skillId: 'style-learner',
        skillName: '风格学习',
        reason: '学习你的写作风格',
        weight: 1.0
      },

      // PDF处理 (pdf-processor)
      {
        keywords: ['pdf', 'PDF', '文档', '提取', '识别', '扫描',
                   '转文字', '文字提取', '处理文档'],
        skillId: 'pdf-processor',
        skillName: 'PDF处理',
        reason: '帮你处理PDF文档',
        weight: 1.2
      }
    ];

    log.log(`[SkillRecommender] Initialized with ${this.patterns.length} intent patterns`);
  }

  /**
   * 检测用户意图并推荐技能
   * @param userInput 用户输入文本
   * @param threshold 推荐阈值（默认0.3，置信度高于此值才推荐）
   * @returns 推荐结果（如果没有匹配则返回null）
   */
  detectIntent(userInput: string, threshold: number = 0.3): SkillRecommendation | null {
    if (!userInput || typeof userInput !== 'string') {
      return null;
    }

    const input = userInput.toLowerCase().trim();

    // 如果输入太短，不推荐
    if (input.length < 2) {
      return null;
    }

    // 如果已经是技能命令（/开头），不推荐
    if (input.startsWith('/')) {
      return null;
    }

    let bestMatch: {
      pattern: IntentPattern;
      confidence: number;
    } | null = null;

    // 遍历所有模式，计算匹配度
    for (const pattern of this.patterns) {
      let matchCount = 0;
      let totalLength = 0;

      // 检查每个关键词
      for (const keyword of pattern.keywords) {
        if (input.includes(keyword.toLowerCase())) {
          matchCount++;
          totalLength += keyword.length;
        }
      }

      // 如果有匹配
      if (matchCount > 0) {
        // 计算置信度
        // 考虑因素：
        // 1. 匹配的关键词数量
        // 2. 关键词长度（越长的关键词权重越高）
        // 3. 模式权重
        const avgKeywordLength = totalLength / matchCount;
        const confidence = Math.min(
          (matchCount / pattern.keywords.length) * 0.6 +
          (avgKeywordLength / 10) * 0.4,
          1.0
        ) * pattern.weight;

        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = {
            pattern,
            confidence: Math.min(confidence, 1.0) // 限制在1.0以内
          };
        }
      }
    }

    // 检查是否达到阈值
    if (bestMatch && bestMatch.confidence >= threshold) {
      log.log(`[SkillRecommender] Detected intent: "${bestMatch.pattern.skillName}" ` +
               `(confidence: ${bestMatch.confidence.toFixed(2)})`);

      return {
        skillId: bestMatch.pattern.skillId,
        skillName: bestMatch.pattern.skillName,
        confidence: bestMatch.confidence,
        reason: bestMatch.pattern.reason
      };
    }

    return null;
  }

  /**
   * 批量检测（用于测试）
   */
  batchDetect(inputs: string[]): SkillRecommendation[] {
    const results: SkillRecommendation[] = [];

    for (const input of inputs) {
      const recommendation = this.detectIntent(input);
      if (recommendation) {
        results.push(recommendation);
      }
    }

    return results;
  }

  /**
   * 添加自定义意图模式
   */
  addPattern(pattern: IntentPattern): void {
    this.patterns.push(pattern);
    log.log(`[SkillRecommender] Added new pattern: ${pattern.skillName}`);
  }

  /**
   * 获取所有模式（用于调试）
   */
  getAllPatterns(): IntentPattern[] {
    return [...this.patterns];
  }
}
