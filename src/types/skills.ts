/**
 * 技能系统类型定义
 */

/**
 * 技能基本信息
 */
export interface Skill {
  id: string;
  name: string;
  path: string;
  isBuiltin: boolean;
}

/**
 * 技能配置（从 SKILL.md frontmatter 解析）
 */
export interface SkillConfig {
  name: string;
  title?: string;
  description: string;
  emoji?: string;
  difficulty?: string;
  scenarios?: string[];
  category?: string;
  tags?: string[];
  input_schema?: {
    type: string;
    properties?: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

/**
 * 技能模板（用于模板库）
 */
export interface SkillTemplate {
  id: string;
  name: string;
  description: string;
  frontmatter: SkillConfig;
  content: string;
  supportingFiles?: string[];
}

/**
 * 技能导入结果
 */
export interface SkillImportResult {
  success: boolean;
  skill?: Skill;
  error?: string;
  warnings?: string[];
}

/**
 * 技能预览数据
 */
export interface SkillPreview {
  id: string;
  name: string;
  description: string;
  frontmatter: SkillConfig;
  content: string;
  supportingFiles: SupportingFile[];
}

/**
 * 辅助文件信息
 */
export interface SupportingFile {
  path: string;
  name: string;
  type: 'script' | 'reference' | 'example' | 'other';
  size: number;
}

/**
 * 技能验证错误
 */
export interface SkillValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * 技能导出选项
 */
export interface SkillExportOptions {
  includeSupportingFiles?: boolean;
  format: 'zip' | 'folder';
}

/**
 * 技能导入来源
 */
export type SkillImportSource =
  | 'file'
  | 'url'
  | 'github'
  | 'template';

/**
 * 技能导入选项
 */
export interface SkillImportOptions {
  source: SkillImportSource;
  filePath?: string;
  url?: string;
  githubRepo?: string;
  templateId?: string;
  overwrite?: boolean;
}

/**
 * GitHub 仓库中的技能信息
 */
export interface GitHubSkill {
  id: string;
  name: string;
  description: string;
  url: string;
  repo: string;
  author?: string;
  stars?: number;
  category?: string;
  tags?: string[];
}

/**
 * Awesome Skills 列表项
 */
export interface AwesomeSkillItem {
  name: string;
  description: string;
  url: string;
  category: string;
  official?: boolean;
}

/**
 * 技能市场数据
 */
export interface SkillsMarketplace {
  awesomeSkills: AwesomeSkillItem[];
  githubRepos: GitHubSkill[];
  lastUpdated: number;
}
