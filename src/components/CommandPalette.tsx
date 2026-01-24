/**
 * 命令面板组件
 * VS Code 风格的命令选择器
 */

import { useState, useEffect, useRef } from 'react';
import { X, Command, PenTool, BarChart, Wrench, Server, Settings } from 'lucide-react';

// 命令分类枚举（与主进程保持一致）
enum CommandCategory {
  CREATION = '创作',
  ANALYSIS = '分析',
  TOOLS = '工具',
  MCP = 'MCP工具',
  SYSTEM = '系统'
}

// 命令类型枚举
enum CommandType {
  SKILL = 'skill',
  MCP = 'mcp',
  SYSTEM = 'system'
}

export interface CommandDefinition {
  id: string;
  type: CommandType;
  name: string;
  description: string;
  keywords: string[];
  category: CommandCategory;
  icon?: string;
  emoji?: string;
  shortcut?: string;
  requiresInput?: boolean;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCommand: (command: CommandDefinition) => void;
}

export function CommandPalette({ isOpen, onClose, onSelectCommand }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CommandCategory | null>(null);
  const [commands, setCommands] = useState<CommandDefinition[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 搜索命令
  useEffect(() => {
    if (!isOpen) return;

    const searchCommands = async () => {
      const result = await window.ipcRenderer.invoke('commands:search', {
        query,
        category: selectedCategory
      });
      setCommands(result as CommandDefinition[]);
      setSelectedIndex(0);
    };

    searchCommands();
  }, [query, selectedCategory, isOpen]);

  // 自动聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, commands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (commands[selectedIndex]) {
          handleSelect(commands[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, commands, selectedIndex]);

  const handleSelect = (command: CommandDefinition) => {
    onSelectCommand(command);
    onClose();
    setQuery('');
  };

  const getCategoryIcon = (category: CommandCategory) => {
    switch (category) {
      case CommandCategory.CREATION:
        return PenTool;
      case CommandCategory.ANALYSIS:
        return BarChart;
      case CommandCategory.TOOLS:
        return Wrench;
      case CommandCategory.MCP:
        return Server;
      case CommandCategory.SYSTEM:
        return Settings;
      default:
        return Command;
    }
  };

  const getCommandIcon = (type: CommandType, iconName?: string) => {
    if (iconName) {
      // 可以根据iconName返回对应的图标
      return Command;
    }

    switch (type) {
      case CommandType.SKILL:
        return PenTool;
      case CommandType.MCP:
        return Server;
      case CommandType.SYSTEM:
        return Settings;
      default:
        return Command;
    }
  };

  if (!isOpen) return null;

  const CommandIcon = Command;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 搜索框 */}
        <div className="flex items-center px-4 border-b border-slate-200 dark:border-gray-700">
          <CommandIcon size={20} className="text-slate-400 dark:text-gray-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入命令、技能或工具名称..."
            className="flex-1 px-3 py-4 text-lg bg-transparent dark:text-white focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-2 text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* 分类标签 */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-900">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === null
                ? 'bg-orange-600 text-white'
                : 'text-slate-600 hover:bg-slate-200 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            全部
          </button>
          {Object.values(CommandCategory).map(cat => {
            const CategoryIcon = getCategoryIcon(cat);
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                  selectedCategory === cat
                    ? 'bg-orange-600 text-white'
                    : 'text-slate-600 hover:bg-slate-200 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <CategoryIcon size={14} />
                {cat}
              </button>
            );
          })}
        </div>

        {/* 命令列表 */}
        <div className="max-h-96 overflow-y-auto">
          {commands.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-gray-500">
              {query ? '没有找到匹配的命令' : '输入搜索关键词...'}
            </div>
          ) : (
            commands.map((cmd, idx) => {
              const CmdIcon = getCommandIcon(cmd.type, cmd.icon);
              return (
                <div
                  key={cmd.id}
                  onClick={() => handleSelect(cmd)}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                    idx === selectedIndex
                      ? 'bg-orange-50 dark:bg-orange-900/20'
                      : 'hover:bg-slate-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <CmdIcon size={18} className="text-slate-600 dark:text-gray-400" />
                    <div>
                      <div className="font-medium text-slate-800 dark:text-gray-200">{cmd.name}</div>
                      <div className="text-sm text-slate-500 dark:text-gray-400">{cmd.description}</div>
                    </div>
                  </div>
                  {cmd.shortcut && (
                    <kbd className="px-2 py-1 text-xs font-mono text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-gray-700 rounded">
                      {cmd.shortcut.replace('Command', 'Cmd').replace(/\+/g, ' + ')}
                    </kbd>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 底部提示 */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 text-xs text-slate-500 dark:text-gray-400 flex justify-between">
          <span>↑↓ 导航 · Enter 执行 · Esc 关闭</span>
          <span>输入 / 使用 Slash Command</span>
        </div>
      </div>
    </div>
  );
}
