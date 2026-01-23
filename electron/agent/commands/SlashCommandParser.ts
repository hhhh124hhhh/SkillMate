/**
 * Slash Command 解析器
 * 识别并解析 /command 格式的输入
 */

import type { ParsedCommand } from './types.js';
import { CommandRegistry } from './CommandRegistry.js';

export class SlashCommandParser {
  private registry: CommandRegistry;

  constructor(registry: CommandRegistry) {
    this.registry = registry;
  }

  /**
   * 解析用户输入
   * @param input 用户输入的文本
   * @returns 解析结果或null（如果不是slash command）
   */
  parse(input: string): ParsedCommand | null {
    console.log('[SlashCommandParser] Input:', JSON.stringify(input));

    const trimmed = input.trim();
    console.log('[SlashCommandParser] Trimmed:', JSON.stringify(trimmed));
    console.log('[SlashCommandParser] Starts with /:', trimmed.startsWith('/'));

    // 1. 检测 slash command
    if (!trimmed.startsWith('/')) {
      console.log('[SlashCommandParser] Not a slash command, returning null');
      return null;
    }

    // 2. 提取命令部分（去掉 /）
    const content = trimmed.slice(1).trim();
    console.log('[SlashCommandParser] Content after removing /:', JSON.stringify(content));

    if (!content) {
      console.log('[SlashCommandParser] Empty content, returning null');
      return null; // 只有斜杠，没有命令
    }

    // 3. 分割命令名和参数
    const parts = content.split(/\s+/);
    const commandName = parts[0];
    const args = parts.slice(1);
    console.log('[SlashCommandParser] Command name:', JSON.stringify(commandName));
    console.log('[SlashCommandParser] Args:', args);

    // 4. 查找匹配的命令
    console.log('[SlashCommandParser] Attempting to get command from registry...');
    // 尝试直接匹配ID
    let command = this.registry.get(commandName);
    console.log('[SlashCommandParser] Direct lookup result:', command ? 'FOUND' : 'NOT FOUND');

    // 如果没找到，尝试模糊搜索
    if (!command) {
      console.log('[SlashCommandParser] Trying fuzzy search...');
      const matches = this.registry.search({ query: commandName, limit: 1 });
      console.log('[SlashCommandParser] Fuzzy search results:', matches.length);
      if (matches.length > 0) {
        command = matches[0];
        console.log('[SlashCommandParser] Using fuzzy match:', command.id);
      }
    }

    if (!command) {
      console.log('[SlashCommandParser] Command not found, returning null');
      console.log('[SlashCommandParser] Available commands:', this.registry.getAll().map(c => c.id));
      return null; // 未找到匹配的命令
    }

    console.log('[SlashCommandParser] Command found:', command.id, 'Type:', command.type);

    // 5. 解析参数
    const params = this.parseParams(command, args);

    // 6. 计算剩余输入
    const remainingInput = args.join(' ');

    console.log('[SlashCommandParser] Parsed successfully:', { commandId: command.id, remainingInput });

    return {
      command,
      params,
      remainingInput
    };
  }

  /**
   * 解析参数
   * 支持:
   * - 位置参数: /ai-writer 写一篇文章
   * - 命名参数: /ai-writer --topic "AI技术"
   */
  private parseParams(command: any, args: string[]): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    // 如果命令没有定义参数，将所有输入作为位置参数
    if (!command.params || command.params.length === 0) {
      return { _args: args.join(' ') };
    }

    // 解析命名参数 (--key value)
    let i = 0;
    while (i < args.length) {
      const arg = args[i];

      if (arg.startsWith('--')) {
        // 命名参数
        const key = arg.slice(2);
        const value = args[i + 1];

        if (value && !value.startsWith('--')) {
          params[key] = value;
          i += 2;
        } else {
          // 布尔标志
          params[key] = true;
          i += 1;
        }
      } else {
        // 位置参数
        if (!params._positional) {
          params._positional = [];
        }
        (params._positional as string[]).push(arg);
        i += 1;
      }
    }

    return params;
  }

  /**
   * 获取自动完成建议
   * @param partialInput 部分输入（包含 / ）
   * @returns 匹配的命令列表
   */
  getSuggestions(partialInput: string): any[] {
    const trimmed = partialInput.trim();

    if (!trimmed.startsWith('/')) {
      return [];
    }

    // 提取查询部分
    const query = trimmed.slice(1).trim().toLowerCase();

    if (!query) {
      // 只输入了 /，返回所有命令
      return this.registry.getAll();
    }

    // 搜索匹配的命令
    return this.registry.search({
      query,
      limit: 8 // 最多返回8个建议
    });
  }

  /**
   * 检查输入是否为slash command
   */
  isSlashCommand(input: string): boolean {
    return input.trim().startsWith('/');
  }

  /**
   * 提取命令名称（不执行解析）
   */
  extractCommandName(input: string): string | null {
    const trimmed = input.trim();

    if (!trimmed.startsWith('/')) {
      return null;
    }

    const content = trimmed.slice(1).trim();
    const parts = content.split(/\s+/);

    return parts[0] || null;
  }
}
