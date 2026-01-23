import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { I18nProvider } from './i18n/I18nContext.js'
import { ThemeProvider } from './theme/ThemeContext.js'

// 🔍 最可靠的 Electron 环境检测
if (typeof window !== 'undefined' && !window.ipcRenderer) {
  console.error('❌ Electron API not available. This app requires Electron to run.');
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
if (window.ipcRenderer) {
  window.ipcRenderer.on('main-process-message', (_event, message) => {
    console.log(message)
  })
}
