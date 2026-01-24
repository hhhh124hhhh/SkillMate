/**
 * 前端意图检测器
 * 简化版，用于实时检测用户输入意图并推荐技能
 */

export interface SkillRecommendation {
  skillId: string;
  skillName: string;
  reason: string;
}

interface IntentPattern {
  keywords: string[];
  skillId: string;
  skillName: string;
  reason: string;
}

// 意图模式定义（与后端保持同步）
const PATTERNS: IntentPattern[] = [
  // AI写作助手
  {
    keywords: ['润色', '改写', '优化', '修改', '扩写', '精简', '缩写', '改',
               '顺口', '通顺', '换个说法', '换个风格', '语气', '更生动',
               '更简洁', '更专业', '更通俗', '文字', '句子', '段落'],
    skillId: 'ai-writer',
    skillName: 'AI写作助手',
    reason: '帮你润色文字、换个风格、扩充内容'
  },
  // 标题生成器
  {
    keywords: ['标题', '题目', '起标题', '想标题', '标题党', '吸引人',
               '爆款标题', '标题不好', '改标题', '新标题'],
    skillId: 'title-generator',
    skillName: '标题生成器',
    reason: '帮你生成10个吸引人的标题'
  },
  // 选题选择器
  {
    keywords: ['选题', '写什么', '主题', '话题', '题材', '内容方向',
               '没灵感', '不知道写啥', '热门话题', '热点', '趋势'],
    skillId: 'topic-selector',
    skillName: '选题选择器',
    reason: '帮你找到热门写作话题'
  },
  // 头图生成器
  {
    keywords: ['封面', '头图', '首图', 'banner', '海报', '配图',
               '封面图', '封面设计', '做封面', '封面不好看'],
    skillId: 'cover-generator',
    skillName: '头图生成器',
    reason: '帮你生成公众号封面图'
  },
  // 头脑风暴
  {
    keywords: ['头脑风暴', '创意', '点子', '想法', '脑暴', '发散思维',
               '更多点子', '新思路', '灵感', '创新'],
    skillId: 'brainstorming',
    skillName: '头脑风暴',
    reason: '帮你想出更多创意点子'
  },
  // 微信写作
  {
    keywords: ['写文章', '写作', '写一篇', '帮我写', '从头写',
               '写完整', '完整文章', '长文', '文章草稿'],
    skillId: 'wechat-writing',
    skillName: '微信写作',
    reason: '从头到尾帮你写篇文章'
  },
  // 自然写作
  {
    keywords: ['人味', '人话', '太生硬', '太正式', '像人写的',
               '自然一点', '口语化', '接地气', '不那么像AI'],
    skillId: 'natural-writer',
    skillName: '自然写作',
    reason: '让文字更像人写的'
  },
  // 图片生成
  {
    keywords: ['配图', '插图', '生成图片', '画图', '图片', '图像',
               '作图', '需要图', '要图'],
    skillId: 'image-generation',
    skillName: '图片生成',
    reason: '帮你生成配图和插图'
  },
  // 数据分析
  {
    keywords: ['数据分析', '分析数据', '阅读量', '点赞', '在看', '分享',
               '粉丝', '用户画像', '数据报告', '表现', '效果'],
    skillId: 'data-analyzer',
    skillName: '数据分析',
    reason: '帮你分析公众号数据'
  },
  // 风格学习
  {
    keywords: ['风格', '学习风格', '模仿', '我的风格', '保持风格',
               '像我的', '统一风格', '风格一致'],
    skillId: 'style-learner',
    skillName: '风格学习',
    reason: '学习你的写作风格'
  },
  // PDF处理
  {
    keywords: ['pdf', 'PDF', '文档', '提取', '识别', '扫描',
               '转文字', '文字提取', '处理文档'],
    skillId: 'pdf-processor',
    skillName: 'PDF处理',
    reason: '帮你处理PDF文档'
  }
];

/**
 * 检测用户输入并推荐技能
 * @param input 用户输入文本
 * @returns 推荐结果（如果没有匹配则返回null）
 */
export function detectIntent(input: string): SkillRecommendation | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmedInput = input.trim().toLowerCase();

  // 输入太短，不推荐
  if (trimmedInput.length < 2) {
    return null;
  }

  // 已经是命令（/开头），不推荐
  if (trimmedInput.startsWith('/')) {
    return null;
  }

  // 检查每个模式
  for (const pattern of PATTERNS) {
    // 检查是否匹配任何关键词
    const hasMatch = pattern.keywords.some(keyword =>
      trimmedInput.includes(keyword.toLowerCase())
    );

    if (hasMatch) {
      return {
        skillId: pattern.skillId,
        skillName: pattern.skillName,
        reason: pattern.reason
      };
    }
  }

  return null;
}
