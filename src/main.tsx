import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { I18nProvider } from './i18n/I18nContext'
import { ThemeProvider } from './theme/ThemeContext'

// Mock IPC for browser development
if (!window.ipcRenderer) {
  console.warn('Electron IPC not available. Using mock implementation for browser development.');
  // @ts-ignore - Mocking for browser dev
  window.ipcRenderer = {
    on: (channel: string, _listener: any) => {
      console.log(`[Mock IPC] on: ${channel}`);
      return () => { };
    },
    off: (channel: string, _listener: any) => {
      console.log(`[Mock IPC] off: ${channel}`);
    },
    send: (channel: string, ...args: any[]) => {
      console.log(`[Mock IPC] send: ${channel}`, args);
    },
    invoke: (channel: string, ...args: any[]) => {
      console.log(`[Mock IPC] invoke: ${channel}`, args);
      // Return basic mocks for essential calls to prevent UI crashes
      if (channel === 'config:get-all') return Promise.resolve({});
      if (channel === 'session:list') return Promise.resolve([]);
      if (channel === 'agent:get-authorized-folders') return Promise.resolve([]);
      if (channel === 'skills:list') return Promise.resolve([]);
      if (channel === 'permissions:list') return Promise.resolve([]);
      if (channel === 'mcp:get-config') return Promise.resolve('{}');
      return Promise.resolve(null);
    }
  };
}

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
