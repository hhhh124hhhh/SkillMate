import { useState, useEffect } from 'react';
import { Minus, Square, X, HelpCircle } from 'lucide-react';
import {
  CoworkView,
  SettingsView,
  UserGuideView,
  FloatingBallPage,
  UpdateNotification,
  CommandPalette,
  ErrorBoundary,
  ToastProvider
} from './components/index.js';
import Anthropic from '@anthropic-ai/sdk';
import type { CommandDefinition as FullCommandDefinition } from '../electron/agent/commands/types.js';

// 前端使用的 CommandDefinition（不包含 execute 函数）
type CommandDefinition = Omit<FullCommandDefinition, 'execute'>;

function App() {
  const [history, setHistory] = useState<Anthropic.MessageParam[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'api' | 'folders' | 'advanced'>('api');
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  // Check if this is the floating ball window
  const isFloatingBall = window.location.hash === '#/floating-ball' || window.location.hash === '#floating-ball';

  // 🧹 清除浏览器缓存（确保干净启动）
  useEffect(() => {
    const clearBrowserStorages = async () => {
      try {
        // 清除 LocalStorage 和 SessionStorage
        localStorage.clear();
        sessionStorage.clear();

        // 清除 IndexedDB
        if (window.indexedDB) {
          try {
            const databases = await window.indexedDB.databases();
            await Promise.all(
              databases.map(db => {
                if (db.name) {
                  return window.indexedDB.deleteDatabase(db.name);
                }
              })
            );
          } catch (error) {
            // 某些浏览器不支持 databases() 方法，静默失败
            console.warn('[App] Could not list IndexedDB databases:', error);
          }
        }

        console.log('[App] ✓ Cleared all browser storages');
      } catch (error) {
        console.error('[App] Failed to clear storages:', error);
      }
    };

    clearBrowserStorages();
  }, []);

  // 深色模式初始化 - 自动跟随系统主题
  useEffect(() => {
    // 检测系统主题偏好
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // 应用主题
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // 首次启动检测
  useEffect(() => {
    const checkFirstLaunch = async () => {
      const firstLaunch = await window.ipcRenderer.invoke('config:get-first-launch') as boolean;
      const config = await window.ipcRenderer.invoke('config:get-all') as { apiKey?: string };

      // 如果是首次启动标记 或者没有配置 API Key，显示用户向导
      if (firstLaunch || !config.apiKey) {
        setIsFirstLaunch(true);
      }
    };

    checkFirstLaunch();
  }, []);

  // 监听打开设置事件（从 UserGuideView 触发）
  useEffect(() => {
    const handleOpenSettings = (event: any) => {
      const { tab } = event.detail;
      if (tab) {
        setSettingsInitialTab(tab);
      }
      setShowSettings(true);
    };

    window.addEventListener('open-settings', handleOpenSettings);
    return () => window.removeEventListener('open-settings', handleOpenSettings);
  }, []);

  // 监听打开用户引导事件
  useEffect(() => {
    const handleOpenUserGuide = () => {
      setShowUserGuide(true);
    };

    window.addEventListener('open-user-guide', handleOpenUserGuide);
    return () => window.removeEventListener('open-user-guide', handleOpenUserGuide);
  }, []);

  useEffect(() => {
    const removeListener = window.ipcRenderer.on('agent:history-update', (_event, ...args) => {
      const updatedHistory = args[0] as Anthropic.MessageParam[];
      setHistory(updatedHistory);
    });

    const removeCompleteListener = window.ipcRenderer.on('agent:complete', () => {
      setIsProcessing(false);
    });

    const removeErrorListener = window.ipcRenderer.on('agent:error', (_event, ...args) => {
      const err = args[0] as string;
      console.error("Agent Error:", err);
      setIsProcessing(false);
    });

    return () => {
      removeListener();
      removeCompleteListener();
      removeErrorListener();
    };
  }, []);

  // 监听 Agent 重启失败和应用崩溃事件
  useEffect(() => {
    const handleAgentRestartFailed = (_event: unknown, ...args: unknown[]) => {
      const data = args[0] as { error: string; rolledBack: boolean };
      const message = data.rolledBack
        ? `Agent 初始化失败，已自动恢复到之前的配置\n\n错误: ${data.error}`
        : `Agent 初始化失败，请检查配置后重试\n\n错误: ${data.error}`;

      alert(`⚠️ ${message}`);
    };

    const handleAppCrash = (_event: unknown, ...args: unknown[]) => {
      const data = args[0] as { message: string; error: string };
      alert(`💥 应用遇到严重错误\n\n${data.message}\n\n错误: ${data.error}\n\n请查看日志: ~/.aiagent/crash-logs.json`);
    };

    const handleAgentReady = () => {
      console.log('✅ Agent is ready');
    };

    const removeAgentFailed = window.ipcRenderer.on('agent:restart-failed', handleAgentRestartFailed);
    const removeAppCrash = window.ipcRenderer.on('app:crash', handleAppCrash);
    const removeAgentReady = window.ipcRenderer.on('agent:ready', handleAgentReady);

    return () => {
      removeAgentFailed();
      removeAppCrash();
      removeAgentReady();
    };
  }, []);

  // 监听命令面板切换事件
  useEffect(() => {
    const removeListener = window.ipcRenderer.on('command-palette:toggle', () => {
      setShowCommandPalette(prev => !prev);
    });

    return () => removeListener();
  }, []);

  const handleSendMessage = async (msg: string | { content: string, images: string[] }) => {
    console.log('[App] handleSendMessage called');
    console.log('[App] Message type:', typeof msg);
    console.log('[App] Message value:', typeof msg === 'string' ? JSON.stringify(msg) : '[object]');

    setIsProcessing(true);
    try {
      console.log('[App] Calling IPC: agent:send-message');
      const result = await window.ipcRenderer.invoke('agent:send-message', msg) as { error?: string } | undefined;
      console.log('[App] IPC result:', result);
      if (result?.error) {
        console.error(result.error);
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('[App] IPC error:', err);
      setIsProcessing(false);
    }
  };

  const handleAbort = () => {
    window.ipcRenderer.invoke('agent:abort');
    setIsProcessing(false);
  };

  const handleCommandExecute = (command: CommandDefinition) => {
    console.log('[CommandPalette] Executing command:', command.id);

    // 技能命令：填充到输入框
    if (command.requiresInput) {
      console.log('[CommandPalette] Skill command, filling input:', command.id);
      // 通过自定义事件通知 CoworkView 填充输入框
      window.dispatchEvent(new CustomEvent('command:fill-input', {
        detail: {
          commandId: command.id,
          commandName: command.name
        }
      }));
      return;
    }

    // 系统命令：通过 IPC 执行
    console.log('[CommandPalette] System command, executing via IPC:', command.id);
    window.ipcRenderer.invoke('commands:execute', command.id)
      .then((result: unknown) => {
        const typedResult = result as { success: boolean; error?: string };
        if (!typedResult.success) {
          console.error('[CommandPalette] Command execution failed:', typedResult.error);
        }
      })
      .catch((error: Error) => {
        console.error('[CommandPalette] Command execution error:', error);
      });
  };

  // If this is the floating ball window, render only the floating ball
  if (isFloatingBall) {
    return <FloatingBallPage />;
  }

  // 如果是首次启动，显示引导页面
  if (isFirstLaunch) {
    return <UserGuideView onClose={() => setIsFirstLaunch(false)} />;
  }

  // Main App - Narrow vertical layout
  return (
    <ErrorBoundary>
      <ToastProvider>
        <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden font-sans">
      {/* Custom Titlebar */}
      <header
        className="h-10 border-b border-slate-200 bg-white/90 backdrop-blur-sm shrink-0 flex items-center justify-between px-3"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <img src="/icon.png" alt="Logo" className="w-6 h-6 object-contain" />
          <span className="font-semibold text-slate-700 text-sm tracking-tight">SkillMate</span>
        </div>

        <div className="flex items-center gap-1 z-50" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {/* 新增：帮助按钮 */}
          <button
            onClick={() => setShowUserGuide(true)}
            className="p-1.5 text-slate-400 hover:text-primaryCustom-600 hover:bg-primaryCustom-50 rounded-md transition-colors"
            title="查看帮助"
          >
            <HelpCircle size={14} />
          </button>

          {/* Window Controls */}
          <button
            onClick={async (e) => {
              e.stopPropagation();
              console.log('Minimize button clicked');
              try {
                console.log('Minimize - Calling window.ipcRenderer.invoke');
                const result = await window.ipcRenderer.invoke('window:minimize');
                console.log('Minimize IPC call successful:', result);
              } catch (error) {
                console.error('Minimize IPC call failed:', error);
              }
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            title="Minimize"
          >
            <Minus size={14} />
          </button>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              console.log('Maximize button clicked');
              try {
                console.log('Maximize - Calling window.ipcRenderer.invoke');
                const result = await window.ipcRenderer.invoke('window:maximize');
                console.log('Maximize IPC call successful:', result);
              } catch (error) {
                console.error('Maximize IPC call failed:', error);
              }
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            title="Maximize"
          >
            <Square size={12} />
          </button>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              console.log('Close button clicked');
              try {
                console.log('Close - Calling window.ipcRenderer.invoke');
                const result = await window.ipcRenderer.invoke('window:close');
                console.log('Close IPC call successful:', result);
              } catch (error) {
                console.error('Close IPC call failed:', error);
              }
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-red-100 hover:text-red-500 rounded-md transition-colors"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {showUserGuide ? (
          <UserGuideView onClose={() => setShowUserGuide(false)} />
        ) : showSettings ? (
          <SettingsView
            onClose={() => setShowSettings(false)}
            initialTab={settingsInitialTab}
          />
        ) : (
          <CoworkView
            history={history}
            onSendMessage={handleSendMessage}
            onAbort={handleAbort}
            isProcessing={isProcessing}
            onOpenSettings={() => {
              setSettingsInitialTab('api');
              setShowSettings(true);
            }}
          />
        )}
      </main>

      {/* Update Notification */}
      <UpdateNotification />

      {/* Command Palette */}
      {!isFloatingBall && !isFirstLaunch && (
        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          onSelectCommand={handleCommandExecute}
        />
      )}
        </div>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
