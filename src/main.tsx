import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { I18nProvider } from './i18n/I18nContext.js'
import { ThemeProvider } from './theme/ThemeContext.js'

// 🛡️ Mock IPC for browser development with localStorage persistence
// 🔍 最可靠的 Electron 环境检测（使用 preload 设置的标记）
const isElectron = () => {
  // 方法 0：检查 preload 脚本设置的标记（最可靠）
  if (window.__IS_ELECTRON__ === true) {
    console.log('✅ [IPC] Detected Electron via __IS_ELECTRON__ flag');
    return true;
  }

  // 方法 1：检查全局的 process 变量（Node.js 集成）
  if (typeof process !== 'undefined' && process.versions && process.versions.electron) {
    console.log('✅ [IPC] Detected Electron via process.versions.electron:', process.versions.electron);
    return true;
  }

  // 方法 2：检查用户代理字符串
  if (navigator.userAgent.includes('Electron')) {
    console.log('✅ [IPC] Detected Electron via userAgent');
    return true;
  }

  // 方法 3：检查 preload 注入的 ipcRenderer（contextBridge 暴露的）
  if (window.ipcRenderer &&
      typeof window.ipcRenderer.invoke === 'function' &&
      typeof window.ipcRenderer.on === 'function') {
    console.log('✅ [IPC] Detected Electron via window.ipcRenderer');
    return true;
  }

  console.warn('⚠️ [IPC] Not in Electron environment (browser mode)');
  console.warn('[IPC] __IS_ELECTRON__:', typeof window.__IS_ELECTRON__);
  console.warn('[IPC] navigator.userAgent:', navigator.userAgent);
  console.warn('[IPC] window.ipcRenderer:', window.ipcRenderer);
  return false;
};

// 📦 Mock 配置存储（使用 localStorage 模拟持久化）
const getMockConfig = () => {
  const saved = localStorage.getItem('mock_config');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('[Mock IPC] Failed to parse saved config:', e);
    }
  }
  return {
    apiUrl: 'https://open.bigmodel.cn/api/anthropic',
    model: 'GLM-4.7',
    authorizedFolders: [],
    networkAccess: false,
    shortcut: 'Alt+Space',
    notifications: true,
    notificationTypes: {
      workComplete: true,
      error: true,
      info: true
    }
  };
};

const saveMockConfig = (config: any) => {
  const currentConfig = getMockConfig();
  const newConfig = { ...currentConfig, ...config };
  localStorage.setItem('mock_config', JSON.stringify(newConfig));
  console.log('[Mock IPC] 💾 Config saved to localStorage:', newConfig);
  return newConfig;
};

if (!isElectron()) {
  console.warn('⚠️ [IPC] Electron IPC not available. Using mock implementation for browser development.');
  console.warn('📌 If you see this in Electron window, there is a preload loading issue!');

  // @ts-ignore - Mocking for browser dev
  window.ipcRenderer = {
    // 存储事件监听器
    _listeners: {} as Record<string, Set<Function>>,

    on: function(channel: string, listener: any) {
      console.log(`[Mock IPC] on: ${channel}`);
      if (!this._listeners[channel]) {
        this._listeners[channel] = new Set();
      }
      this._listeners[channel].add(listener);

      // 返回清理函数
      return () => {
        this._listeners[channel]?.delete(listener);
      };
    },
    off: function(channel: string, listener: any) {
      console.log(`[Mock IPC] off: ${channel}`);
      this._listeners[channel]?.delete(listener);
    },
    send: function(channel: string, ...args: any[]) {
      console.log(`[Mock IPC] send: ${channel}`, args);
    },
    // 模拟事件发送（用于配置更新广播）
    emit: function(channel: string, ...args: any[]) {
      console.log(`[Mock IPC] emit: ${channel}`, args);
      const listeners = this._listeners[channel];
      if (listeners) {
        listeners.forEach(listener => {
          try {
            listener(null, ...args);
          } catch (e) {
            console.error(`[Mock IPC] Error in listener for ${channel}:`, e);
          }
        });
      }
    },
    invoke: (channel: string, ...args: any[]) => {
      console.log(`[Mock IPC] invoke: ${channel}`, args);

      // 配置相关
      if (channel === 'config:get-safe') {
        const config = getMockConfig();
        // 🔒 不返回敏感信息（API Key）
        const { apiKey, ...safeConfig } = config;
        return Promise.resolve(safeConfig);
      }
      if (channel === 'config:get-all') {
        return Promise.resolve(getMockConfig());
      }
      if (channel === 'config:set-all') {
        const newConfig = saveMockConfig(args[0]);
        // 触发配置更新事件（使用 setTimeout 确保在下一个事件循环）
        setTimeout(() => {
          // @ts-ignore
          window.ipcRenderer.emit?.('config:updated');
        }, 100);
        return Promise.resolve(true);
      }
      if (channel === 'config:get-api-key-status') {
        const config = getMockConfig();
        return Promise.resolve({ hasApiKey: !!config.apiKey });
      }

      // 会话相关
      if (channel === 'session:list') return Promise.resolve([]);
      if (channel === 'session:save') return Promise.resolve(true);
      if (channel === 'session:load') return Promise.resolve(null);
      if (channel === 'session:delete') return Promise.resolve(true);

      // Agent 相关
      if (channel === 'agent:get-authorized-folders') {
        const config = getMockConfig();
        return Promise.resolve(config.authorizedFolders || []);
      }

      // 技能和权限
      if (channel === 'skills:list') return Promise.resolve([]);
      if (channel === 'permissions:list') return Promise.resolve([]);
      if (channel === 'permissions:clear') return Promise.resolve(true);
      if (channel === 'mcp:get-config') return Promise.resolve('{}');

      // 对话框相关
      if (channel === 'dialog:select-folder') {
        console.warn('[Mock IPC] ⚠️ Folder selection is only available in Electron environment');
        // 在浏览器中模拟用户选择了一个文件夹
        const mockPath = 'C:\\Users\\Demo\\Projects';
        console.log(`[Mock IPC] 📁 Simulated folder selection: ${mockPath}`);
        alert(`[浏览器模式] 模拟选择了文件夹：\n${mockPath}\n\n请在 Electron 环境中测试实际功能！`);
        return Promise.resolve(mockPath);
      }
      if (channel === 'dialog:select-file') {
        console.warn('[Mock IPC] ⚠️ File selection is only available in Electron environment');
        return Promise.resolve(null);
      }

      // 窗口控制（明确标记为 mock，只在浏览器中使用）
      if (channel === 'window:minimize') {
        console.warn('[Mock IPC] ⚠️ Window minimize is only available in Electron!');
        return Promise.resolve({ success: true, message: 'Window minimized (MOCK)' });
      }
      if (channel === 'window:maximize') {
        console.warn('[Mock IPC] ⚠️ Window maximize is only available in Electron!');
        return Promise.resolve({ success: true, message: 'Window maximized (MOCK)', isMaximized: true });
      }
      if (channel === 'window:close') {
        console.warn('[Mock IPC] ⚠️ Window close is only available in Electron!');
        return Promise.resolve({ success: true, message: 'Window hidden (MOCK)' });
      }

      // 设置状态
      if (channel === 'config:get-setup-status') {
        const config = getMockConfig();
        return Promise.resolve({
          hasApiKey: !!config.apiKey,
          hasAuthorizedFolders: (config.authorizedFolders?.length || 0) > 0,
          isSetupComplete: !!config.apiKey && (config.authorizedFolders?.length || 0) > 0
        });
      }
      if (channel === 'config:get-first-launch') return Promise.resolve(true);
      if (channel === 'config:set-first-launch') {
        localStorage.setItem('mock_first_launch', 'false');
        return Promise.resolve(true);
      }
      if (channel === 'config:reset-first-launch') {
        localStorage.removeItem('mock_first_launch');
        return Promise.resolve({ success: true });
      }

      // 默认返回 null
      return Promise.resolve(null);
    }
  };
}

// 🔍 调试：确认使用的是真正的 Electron IPC 还是 mock
if (isElectron()) {
  console.log('✅ [IPC] Using real Electron IPC (from preload)');
} else {
  console.log('⚠️ [IPC] Using MOCK IPC (browser mode) with localStorage persistence');
}

// 🐛 添加全局错误捕获
window.addEventListener('error', (event) => {
  console.error('🔴 Global Error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🔴 Unhandled Promise Rejection:', event.reason);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>,
)

// Use contextBridge
window.ipcRenderer.on('main-process-message', (_event, message) => {
  console.log(message)
})
