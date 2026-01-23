import { useState, useEffect } from 'react';
import { Minus, Square, X, HelpCircle, Command } from 'lucide-react';
import { CoworkView } from './components/CoworkView.js';
import { SettingsView } from './components/SettingsView.js';
import { UserGuideView } from './components/UserGuideView.js';
import { ConfirmDialog, useConfirmations } from './components/ConfirmDialog.js';
import { FloatingBallPage } from './components/FloatingBallPage.js';
import { UpdateNotification } from './components/UpdateNotification.js';
import { CommandPalette } from './components/CommandPalette.js';
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
  const { pendingRequest, handleConfirm, handleDeny } = useConfirmations();

  // Check if this is the floating ball window
  const isFloatingBall = window.location.hash === '#/floating-ball' || window.location.hash === '#floating-ball';

  // 首次启动检测
  useEffect(() => {
    window.ipcRenderer.invoke('config:get-first-launch').then((result) => {
      if (result) {
        setIsFirstLaunch(true);
      }
    });
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
    return (
      <>
        <UserGuideView onClose={() => setIsFirstLaunch(false)} />
        <ConfirmDialog
          request={pendingRequest}
          onConfirm={handleConfirm}
          onDeny={handleDeny}
        />
      </>
    );
  }

  // Main App - Narrow vertical layout
  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col overflow-hidden font-sans">
      {/* Custom Titlebar */}
      <header
        className="h-10 border-b border-slate-200 bg-white/90 backdrop-blur-sm shrink-0 flex items-center justify-between px-3"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <img src="/logo_new.svg" alt="Logo" className="w-6 h-6 object-contain" />
          <span className="font-semibold text-slate-700 text-sm tracking-tight">AI Agent Desktop</span>
        </div>

        <div className="flex items-center gap-1 z-50" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {/* 命令面板按钮 */}
          <button
            onClick={() => {
              console.log('Command Palette button clicked');
              setShowCommandPalette(true);
            }}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            title="打开命令面板 (Ctrl+Shift+P)"
          >
            <Command size={14} />
          </button>

          {/* 新增：帮助按钮 */}
          <button
            onClick={() => setShowUserGuide(true)}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
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

      {/* Confirmation Dialog */}
      <ConfirmDialog
        request={pendingRequest}
        onConfirm={handleConfirm}
        onDeny={handleDeny}
      />

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
  );
}

export default App;
