import { useState, useEffect } from 'react';
import { Minus, Square, X, HelpCircle } from 'lucide-react';
import { CoworkView } from './components/CoworkView';
import { SettingsView } from './components/SettingsView';
import { UserGuideView } from './components/UserGuideView';
import { ConfirmDialog, useConfirmations } from './components/ConfirmDialog';
import { FloatingBallPage } from './components/FloatingBallPage';
import { UpdateNotification } from './components/UpdateNotification';
import Anthropic from '@anthropic-ai/sdk';

function App() {
  const [history, setHistory] = useState<Anthropic.MessageParam[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserGuide, setShowUserGuide] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'api' | 'folders' | 'advanced'>('api');
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

  const handleSendMessage = async (msg: string | { content: string, images: string[] }) => {
    setIsProcessing(true);
    try {
      const result = await window.ipcRenderer.invoke('agent:send-message', msg) as { error?: string } | undefined;
      if (result?.error) {
        console.error(result.error);
        setIsProcessing(false);
      }
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
    }
  };

  const handleAbort = () => {
    window.ipcRenderer.invoke('agent:abort');
    setIsProcessing(false);
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
          <span className="font-semibold text-slate-700 text-sm tracking-tight">公众号运营牛马</span>
        </div>

        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
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
            onClick={async () => {
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
            onClick={async () => {
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
            onClick={async () => {
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
    </div>
  );
}

export default App;
