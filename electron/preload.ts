import { ipcRenderer, contextBridge, IpcRendererEvent } from 'electron'

// 🔒 IPC 通道白名单（仅允许渲染进程访问这些通道）
const ALLOWED_CHANNELS = [
  // Agent 相关
  'agent:send-message',
  'agent:abort',
  'agent:confirm-response',
  'agent:new-session',
  'agent:authorize-folder',
  'agent:get-authorized-folders',
  'agent:set-working-dir',
  'agent:security-warning',  // 🔒 安全警告
  'agent:privacy-warning',   // 🔒 隐私警告

  // Session 管理
  'session:list',
  'session:get',
  'session:load',
  'session:save',
  'session:delete',
  'session:current',

  // 权限管理
  'permissions:list',
  'permissions:revoke',
  'permissions:clear',

  // 文件系统
  'fs:save-temp-file',
  'fs:read-file',

  // 对话框
  'dialog:select-folder',
  'dialog:select-file',

  // Shell 操作
  'shell:open-path',

  // 悬浮球
  'floating-ball:toggle',
  'floating-ball:show-main',
  'floating-ball:start-drag',
  'floating-ball:move',

  // 窗口控制
  'window:minimize',
  'window:maximize',
  'window:close',

  // 配置（仅非敏感操作）
  'config:get-safe',              // 🔒 安全配置获取（不包含 API Key）
  'config:get-first-launch',
  'config:set-first-launch',
  'config:get-api-key-status',
  'config:get-setup-status',
  'config:reset-first-launch',

  // 快捷键
  'shortcut:update',

  // 更新管理
  'update:check',
  'update:install',

  // MCP
  'mcp:get-config',
  'mcp:save-config',

  // 技能
  'skills:list',
  'skills:get',
  'skills:save',
  'skills:delete',

  // 通知
  'notification:send',
  'notification:send-work-complete',
  'notification:send-error',
  'notification:send-info',
  'notification:set-enabled',
  'notification:get-enabled',
  'notification:has-permission',
] as const

// 🔒 安全检查函数
function isChannelAllowed(channel: string): boolean {
  return ALLOWED_CHANNELS.includes(channel as any)
}

// 🔒 安全的 invoke 方法（带白名单验证）
function secureInvoke(channel: string, ...args: unknown[]) {
  if (!isChannelAllowed(channel)) {
    console.error(`[Security] ❌ Blocked unauthorized IPC invoke: ${channel}`)
    throw new Error(`Unauthorized IPC channel: ${channel}`)
  }
  return ipcRenderer.invoke(channel, ...args)
}

// 🔒 安全的 send 方法
function secureSend(channel: string, ...args: unknown[]) {
  if (!isChannelAllowed(channel)) {
    console.error(`[Security] ❌ Blocked unauthorized IPC send: ${channel}`)
    return
  }
  return ipcRenderer.send(channel, ...args)
}

// 🔒 安全的 on 方法
function secureOn(
  channel: string,
  listener: (event: IpcRendererEvent, ...args: unknown[]) => void
) {
  if (!isChannelAllowed(channel)) {
    console.error(`[Security] ❌ Blocked unauthorized IPC listener: ${channel}`)
    throw new Error(`Unauthorized IPC channel: ${channel}`)
  }
  const subscription = (_event: IpcRendererEvent, ...eventArgs: unknown[]) =>
    listener(_event, ...eventArgs)
  ipcRenderer.on(channel, subscription)
  return () => {
    ipcRenderer.removeListener(channel, subscription)
  }
}

// 🔒 安全的 off 方法
function secureOff(channel: string, ...args: unknown[]) {
  if (!isChannelAllowed(channel)) {
    console.error(`[Security] ❌ Blocked unauthorized IPC off: ${channel}`)
    return
  }
  return ipcRenderer.off(channel, ...args)
}

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on: secureOn,
  off: secureOff,
  send: secureSend,
  invoke: secureInvoke,

  // You can expose other APTs you need here.
  // ...
})
