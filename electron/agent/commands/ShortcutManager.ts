/**
 * 快捷键管理器
 * 统一管理全局快捷键，支持动态注册和冲突检测
 */

import { globalShortcut, BrowserWindow } from 'electron';
import { ShortcutBinding, CommandDefinition } from './types.js';
import { configStore } from '../../config/ConfigStore.js';

export class ShortcutManager {
  private bindings: Map<string, ShortcutBinding> = new Map();
  private commandRegistry: any; // CommandRegistry 实例

  constructor(_mainWindow: BrowserWindow, commandRegistry?: any) {
    this.commandRegistry = commandRegistry;
  }

  /**
   * 注册快捷键
   * @returns 是否注册成功
   */
  register(binding: ShortcutBinding): boolean {
    // 1. 冲突检测
    const conflictId = this.checkConflict(binding.accelerator, binding.id);
    if (conflictId) {
      console.warn(
        `[ShortcutManager] Conflict detected: ${binding.accelerator} already bound to ${conflictId}`
      );
      return false;
    }

    // 2. 注销旧绑定（如果存在）
    if (this.bindings.has(binding.id)) {
      this.unregister(binding.id);
    }

    // 3. 注册到系统
    try {
      const success = globalShortcut.register(binding.accelerator, () => {
        console.log(`[ShortcutManager] Triggered: ${binding.id} (${binding.accelerator})`);
        binding.action();
      });

      if (success) {
        this.bindings.set(binding.id, binding);
        console.log(
          `[ShortcutManager] Registered: ${binding.id} -> ${binding.accelerator}`
        );

        // 持久化到配置
        this.saveToConfig();

        return true;
      } else {
        console.error(
          `[ShortcutManager] Failed to register: ${binding.id} -> ${binding.accelerator}`
        );
        return false;
      }
    } catch (error) {
      console.error(`[ShortcutManager] Error registering shortcut:`, error);
      return false;
    }
  }

  /**
   * 批量注册命令快捷键
   */
  registerFromCommands(commands: CommandDefinition[]): void {
    console.log(`[ShortcutManager] Registering shortcuts for ${commands.length} commands...`);

    commands.forEach(cmd => {
      if (cmd.shortcut) {
        this.register({
          id: cmd.id,
          accelerator: cmd.shortcut,
          action: () => {
            console.log(`[ShortcutManager] Executing command via shortcut: ${cmd.id}`);
            cmd.execute();
          },
          description: cmd.description
        });
      }
    });
  }

  /**
   * 注销快捷键
   */
  unregister(id: string): void {
    const binding = this.bindings.get(id);
    if (binding) {
      globalShortcut.unregister(binding.accelerator);
      this.bindings.delete(id);
      console.log(`[ShortcutManager] Unregistered: ${id}`);

      // 持久化到配置
      this.saveToConfig();
    }
  }

  /**
   * 注销所有快捷键
   */
  unregisterAll(): void {
    console.log(`[ShortcutManager] Unregistering all shortcuts...`);

    for (const [id] of this.bindings) {
      globalShortcut.unregister(this.bindings.get(id)!.accelerator);
    }

    this.bindings.clear();
    this.saveToConfig();
  }

  /**
   * 检查快捷键冲突
   * @returns 冲突的命令ID，如果没有冲突返回null
   */
  checkConflict(accelerator: string, excludeId?: string): string | null {
    for (const [id, binding] of this.bindings) {
      if (id !== excludeId && binding.accelerator === accelerator) {
        return id;
      }
    }

    // 同时检查命令注册表中的快捷键
    if (this.commandRegistry) {
      return this.commandRegistry.checkShortcutConflict(accelerator, excludeId);
    }

    return null;
  }

  /**
   * 获取所有绑定
   */
  getAllBindings(): ShortcutBinding[] {
    return Array.from(this.bindings.values());
  }

  /**
   * 通过ID获取绑定
   */
  getBinding(id: string): ShortcutBinding | undefined {
    return this.bindings.get(id);
  }

  /**
   * 设置CommandRegistry引用（延迟注入）
   */
  setCommandRegistry(registry: any): void {
    this.commandRegistry = registry;
  }

  /**
   * 从配置加载快捷键
   */
  loadFromConfig(): void {
    try {
      const config = configStore.get('shortcuts') as Record<string, string> | undefined;

      if (config) {
        console.log(`[ShortcutManager] Loading ${Object.keys(config).length} shortcuts from config...`);

        for (const [id, accelerator] of Object.entries(config)) {
          // 注意：这里只恢复快捷键绑定，不执行命令
          // 实际的命令执行需要在CommandRegistry初始化后再绑定
          console.log(`[ShortcutManager] Found shortcut in config: ${id} -> ${accelerator}`);
        }
      }
    } catch (error) {
      console.error('[ShortcutManager] Error loading shortcuts from config:', error);
    }
  }

  /**
   * 保存快捷键到配置
   */
  private saveToConfig(): void {
    try {
      const shortcuts: Record<string, string> = {};

      for (const [id, binding] of this.bindings) {
        shortcuts[id] = binding.accelerator;
      }

      configStore.set('shortcuts', shortcuts);
      console.log('[ShortcutManager] Saved shortcuts to config');
    } catch (error) {
      console.error('[ShortcutManager] Error saving shortcuts to config:', error);
    }
  }

  /**
   * 验证快捷键格式是否有效
   */
  static isValidAccelerator(accelerator: string): boolean {
    // 简单验证：包含有效的修饰键和普通键
    const hasModifier = /(Command|Cmd|Control|Ctrl|Alt|Shift|Meta)\+/i.test(accelerator);
    const hasKey = /[A-Z0-9]|\b(Plus|Space|Tab|Return|Enter|Escape|Esc|Up|Down|Left|Right|Home|End|PageUp|PageDown|F\d+)\b/i.test(accelerator);

    return hasModifier && hasKey;
  }

  /**
   * 格式化快捷键显示（用于UI）
   */
  static formatAccelerator(accelerator: string): string {
    return accelerator
      .replace('CommandOrControl', 'CmdOrCtrl')
      .replace('Command', 'Cmd')
      .replace('Control', 'Ctrl')
      .replace(/\+/g, ' + ');
  }
}
