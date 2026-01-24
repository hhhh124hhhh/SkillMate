/**
 * 命令注册表
 * 集中管理所有可用命令（技能、MCP工具、系统操作）
 */

import {
  CommandDefinition,
  CommandCategory,
  CommandType,
  CommandSearchOptions,
  SkillDefinitionExtended,
  MCPToolEnhanced,
  CommandParameter
} from './types.js';
import log from 'electron-log';

export class CommandRegistry {
  private commands: Map<string, CommandDefinition> = new Map();
  private agentRuntime: any; // AgentRuntime 实例引用

  constructor(agentRuntime?: any) {
    this.agentRuntime = agentRuntime;
  }

  /**
   * 注册单个命令
   */
  register(command: CommandDefinition): void {
    if (this.commands.has(command.id)) {
      log.warn(`[CommandRegistry] Command ${command.id} already registered, overwriting`);
    }

    this.commands.set(command.id, command);
    log.log(`[CommandRegistry] Registered command: ${command.id} (${command.type})`);
  }

  /**
   * 批量注册技能命令
   */
  registerFromSkills(skills: SkillDefinitionExtended[]): void {
    log.log(`[CommandRegistry] Registering ${skills.length} skills...`);

    skills.forEach(skill => {
      // 推断分类
      const category = skill.category || this.inferCategoryFromSkill(skill.name);

      // 提取关键词
      const keywords = skill.keywords || this.extractKeywords(skill.name, skill.description);

      this.register({
        id: skill.name,
        type: CommandType.SKILL,
        name: skill.name,
        title: (skill as any).title || skill.name,  // 新增：友好标题
        description: skill.description,
        keywords: keywords,
        category: category,
        icon: this.getIconForCategory(category),
        emoji: (skill as any).emoji || this.getDefaultEmoji(category),  // 新增：emoji图标
        scenarios: (skill as any).scenarios || [],  // 新增：使用场景
        difficulty: (skill as any).difficulty || '⭐⭐⭐',  // 新增：使用难度
        shortcut: skill.shortcut,
        params: this.convertInputSchemaToParams(skill.input_schema),
        execute: async (params) => {
          // 技能命令需要用户输入，这里只是将技能ID填充到输入框
          // 实际执行由 AgentRuntime 处理
          log.log(`[CommandRegistry] Executing skill: ${skill.name}`, params);
          // 通过 AgentRuntime 的广播机制通知UI
          if (this.agentRuntime) {
            this.agentRuntime.notifyCommandExecution?.(skill.name, params);
          }
        },
        requiresInput: true // 技能通常需要用户输入
      });
    });
  }

  /**
   * 批量注册MCP工具命令
   */
  registerFromMCPTools(tools: MCPToolEnhanced[]): void {
    log.log(`[CommandRegistry] Registering ${tools.length} MCP tools...`);

    tools.forEach(tool => {
      // 提取工具名称（移除命名空间前缀）
      const toolName = tool.name.replace(`${tool.serverName}__`, '');

      // 提取关键词
      const keywords = tool.keywords || [tool.serverName, toolName];

      this.register({
        id: tool.name, // 使用完整的带命名空间的名称
        type: CommandType.MCP,
        name: toolName,
        description: tool.description,
        keywords: keywords,
        category: tool.category || CommandCategory.MCP,
        icon: 'Server',
        params: this.convertInputSchemaToParams(tool.input_schema),
        execute: async (params) => {
          log.log(`[CommandRegistry] Executing MCP tool: ${tool.name}`, params);
          // 通过 MCPClientService 调用工具
          if (this.agentRuntime?.mcpService) {
            const result = await this.agentRuntime.mcpService.callTool(tool.name, params);
            return result;
          }
        },
        requiresInput: true,
        serverName: tool.serverName
      });
    });
  }

  /**
   * 注册系统命令
   */
  registerSystemCommands(): void {
    // 新会话命令
    this.register({
      id: 'new-session',
      type: CommandType.SYSTEM,
      name: '新会话',
      description: '开始新的对话，清空历史',
      keywords: ['new', 'session', 'clear', 'reset', '新建', '清空'],
      category: CommandCategory.SYSTEM,
      icon: 'Plus',
      shortcut: 'Ctrl+Shift+N',
      execute: async () => {
        log.log('[CommandRegistry] Executing: new-session');
        if (this.agentRuntime) {
          this.agentRuntime.clearHistory();
          // 通知所有窗口会话已重置
          this.agentRuntime.notifyUpdate();
        }
      }
    });

    // 打开设置
    this.register({
      id: 'open-settings',
      type: CommandType.SYSTEM,
      name: '打开设置',
      description: '打开应用设置面板',
      keywords: ['settings', 'config', 'preferences', '设置', '配置'],
      category: CommandCategory.SYSTEM,
      icon: 'Settings',
      execute: async () => {
        log.log('[CommandRegistry] Executing: open-settings');
        // 通过IPC通知UI打开设置
        if (this.agentRuntime) {
          this.agentRuntime.broadcast?.('settings:open');
        }
      }
    });
  }

  /**
   * 搜索命令（支持模糊匹配）
   */
  search(options: CommandSearchOptions = {}): CommandDefinition[] {
    const { query, category, type, limit } = options;

    let results = Array.from(this.commands.values());

    // 按分类过滤
    if (category) {
      results = results.filter(cmd => cmd.category === category);
    }

    // 按类型过滤
    if (type) {
      results = results.filter(cmd => cmd.type === type);
    }

    // 按关键词搜索
    if (query && query.trim()) {
      const lowerQuery = query.toLowerCase().trim();

      results = results.filter(cmd => {
        // 名称匹配
        if (cmd.name.toLowerCase().includes(lowerQuery)) {
          return true;
        }

        // 描述匹配
        if (cmd.description.toLowerCase().includes(lowerQuery)) {
          return true;
        }

        // 关键词匹配
        if (cmd.keywords.some(kw => kw.toLowerCase().includes(lowerQuery))) {
          return true;
        }

        return false;
      });
    }

    // 限制返回数量
    if (limit && limit > 0) {
      results = results.slice(0, limit);
    }

    return results;
  }

  /**
   * 通过ID获取命令
   */
  get(id: string): CommandDefinition | undefined {
    log.log('[CommandRegistry] Getting command:', JSON.stringify(id));
    log.log('[CommandRegistry] Total commands in registry:', this.commands.size);
    log.log('[CommandRegistry] Available IDs:', Array.from(this.commands.keys()));

    const result = this.commands.get(id);
    log.log('[CommandRegistry] Get result:', result ? 'FOUND' : 'NOT FOUND');
    return result;
  }

  /**
   * 获取所有命令
   */
  getAll(): CommandDefinition[] {
    return Array.from(this.commands.values());
  }

  /**
   * 按分类获取命令
   */
  getByCategory(category: CommandCategory): CommandDefinition[] {
    return this.search({ category });
  }

  /**
   * 检查快捷键冲突
   */
  checkShortcutConflict(shortcut: string, excludeId?: string): string | null {
    for (const [id, cmd] of this.commands) {
      if (id !== excludeId && cmd.shortcut === shortcut) {
        return id;
      }
    }
    return null;
  }

  /**
   * 设置AgentRuntime引用（延迟注入）
   */
  setAgentRuntime(agentRuntime: any): void {
    this.agentRuntime = agentRuntime;
  }

  // ========== 私有辅助方法 ==========

  /**
   * 从技能名称推断分类
   */
  private inferCategoryFromSkill(skillName: string): CommandCategory {
    const name = skillName.toLowerCase();

    // 创作类
    if (name.includes('writer') || name.includes('writing') ||
        name.includes('title') || name.includes('topic') ||
        name.includes('创作') || name.includes('写作') || name.includes('标题')) {
      return CommandCategory.CREATION;
    }

    // 分析类
    if (name.includes('analy') || name.includes('data') || name.includes('style') ||
        name.includes('分析') || name.includes('数据')) {
      return CommandCategory.ANALYSIS;
    }

    // 工具类
    if (name.includes('image') || name.includes('cover') || name.includes('crop') ||
        name.includes('图') || name.includes('裁剪') || name.includes('封面')) {
      return CommandCategory.TOOLS;
    }

    // 默认为创作类
    return CommandCategory.CREATION;
  }

  /**
   * 提取关键词
   */
  private extractKeywords(name: string, description: string): string[] {
    const keywords: string[] = [];

    // 从名称中提取
    const nameWords = name.split(/[-\s]+/).filter(w => w.length > 2);
    keywords.push(...nameWords);

    // 从描述中提取（中文和英文）
    const descWords = description.split(/[\s，。、]+/).filter(w => w.length > 1);
    keywords.push(...descWords.slice(0, 3)); // 最多取3个

    return [...new Set(keywords)]; // 去重
  }

  /**
   * 根据分类获取图标名称
   */
  private getIconForCategory(category: CommandCategory): string {
    switch (category) {
      case CommandCategory.CREATION:
        return 'PenTool';
      case CommandCategory.ANALYSIS:
        return 'BarChart';
      case CommandCategory.TOOLS:
        return 'Wrench';
      case CommandCategory.MCP:
        return 'Server';
      case CommandCategory.SYSTEM:
        return 'Settings';
      default:
        return 'HelpCircle';
    }
  }

  /**
   * 根据分类获取默认 emoji（小白友好）
   */
  private getDefaultEmoji(category: CommandCategory): string {
    switch (category) {
      case CommandCategory.CREATION:
        return '✍️';  // 创作类
      case CommandCategory.ANALYSIS:
        return '📊';  // 分析类
      case CommandCategory.TOOLS:
        return '🛠️';  // 工具类
      case CommandCategory.MCP:
        return '🔌';  // MCP工具
      case CommandCategory.SYSTEM:
        return '⚙️';  // 系统操作
      default:
        return '❓';  // 未知
    }
  }

  /**
   * 转换input_schema为CommandParameter格式
   */
  private convertInputSchemaToParams(schema: Record<string, unknown>): CommandParameter[] | undefined {
    if (!schema || typeof schema !== 'object') {
      return undefined;
    }

    const params: CommandParameter[] = [];

    // 简单转换逻辑（根据实际schema格式调整）
    if (schema.type === 'object' && schema.properties) {
      const properties = schema.properties as Record<string, unknown>;
      const required = (schema.required as string[]) || [];

      for (const [name, prop] of Object.entries(properties)) {
        const propDef = prop as Record<string, unknown>;

        params.push({
          name,
          type: (propDef.type as any) || 'string',
          description: (propDef.description as string) || name,
          required: required.includes(name)
        });
      }
    }

    return params.length > 0 ? params : undefined;
  }
}
