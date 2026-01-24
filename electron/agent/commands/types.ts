/**
 * 命令系统核心类型定义
 * 统一管理技能、MCP工具和系统命令的类型
 */

/**
 * 命令类型枚举
 */
export enum CommandType {
  SKILL = 'skill',       // 技能命令
  MCP = 'mcp',          // MCP工具命令
  SYSTEM = 'system'     // 系统命令
}

/**
 * 命令分类枚举
 */
export enum CommandCategory {
  CREATION = '创作',     // 创作类技能 (ai-writer, topic-selector)
  ANALYSIS = '分析',     // 分析类技能 (data-analyzer, style-learner)
  TOOLS = '工具',        // 工具类技能 (image-cropper, cover-generator)
  MCP = 'MCP工具',       // MCP工具 (fetch, filesystem)
  SYSTEM = '系统'        // 系统操作 (new-session, settings)
}

/**
 * 命令参数定义
 */
export interface CommandParameter {
  name: string;                    // 参数名
  type: 'string' | 'number' | 'boolean' | 'object';
  description: string;             // 参数描述
  required: boolean;               // 是否必填
  default?: unknown;               // 默认值
}

/**
 * 命令定义接口
 */
export interface CommandDefinition {
  id: string;                      // 唯一标识 (如 'ai-writer')
  type: CommandType;               // 命令类型
  name: string;                    // 显示名称
  description: string;             // 简短描述（小白能懂）
  keywords: string[];              // 搜索关键词
  category: CommandCategory;       // 分类
  icon?: string;                   // 图标名称或 emoji（如 '✍️'）
  shortcut?: string;               // 快捷键 (如 'Ctrl+Shift+W')
  params?: CommandParameter[];     // 参数定义
  execute: (params?: Record<string, unknown>) => Promise<void>;  // 执行函数
  requiresInput?: boolean;         // 是否需要用户输入
  serverName?: string;             // MCP 服务器名

  // 小白友好属性（新增）
  emoji?: string;                  // emoji 图标（如 '✍️'）
  scenarios?: string[];            // 使用场景（什么时候用）
  difficulty?: string;             // 使用难度（⭐到⭐⭐⭐⭐⭐）
  title?: string;                  // 友好标题（如 'AI写作助手'）
}

/**
 * 快捷键绑定接口
 */
export interface ShortcutBinding {
  id: string;                      // 命令ID
  accelerator: string;             // 快捷键 (如 'Ctrl+Shift+P')
  action: () => void | Promise<void>;  // 执行动作
  description?: string;            // 描述
}

/**
 * 解析后的Slash命令
 */
export interface ParsedCommand {
  command: CommandDefinition;      // 匹配的命令
  params: Record<string, unknown>; // 解析的参数
  remainingInput: string;          // 剩余输入
}

/**
 * 技能定义扩展 (从SkillManager)
 */
export interface SkillDefinitionExtended {
  name: string;
  description: string;
  instructions: string;
  input_schema: Record<string, unknown>;
  keywords?: string[];             // 搜索关键词
  category?: CommandCategory;      // 分类
  shortcut?: string;               // 快捷键
}

/**
 * MCP工具定义扩展 (从MCPClientService)
 */
export interface MCPToolEnhanced {
  name: string;                    // 工具名称 (带命名空间)
  description: string;
  input_schema: Record<string, unknown>;
  serverName: string;              // 所属服务器
  category?: CommandCategory;      // 工具分类
  keywords?: string[];             // 搜索关键词
}

/**
 * 命令搜索选项
 */
export interface CommandSearchOptions {
  query?: string;                  // 搜索关键词
  category?: CommandCategory;      // 过滤分类
  type?: CommandType;              // 过滤类型
  limit?: number;                  // 返回数量限制
}

/**
 * 命令执行结果
 */
export interface CommandExecutionResult {
  success: boolean;
  error?: string;
  data?: unknown;
}
