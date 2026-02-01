// ✅ preload 使用标准 electron 导入
import { ipcRenderer, contextBridge, IpcRendererEvent } from 'electron'
import log from 'electron-log'

log.info('✅ [Preload] Electron preload script loaded')

// 🔒 IPC 通道白名单（仅允许渲染进程访问这些通道）
const ALLOWED_CHANNELS = [
  // Agent 相关 - 调用通道
  'agent:send-message',
  'agent:abort',
  'agent:new-session',
  'agent:authorize-folder',
  'agent:get-authorized-folders',
  'agent:set-working-dir',

  // Agent 相关 - 事件监听通道（主进程广播）
  'agent:stream-token',           // 流式响应 token
  'agent:history-update',         // 历史消息更新
  'agent:error',                  // 错误事件
  'agent:complete',               // 任务完成
  'agent:artifact-created',       // 文件创建事件
  'agent:restart-failed',         // Agent 重启失败事件通知
  'agent:ready',                  // Agent 就绪事件
  'agent:delete-confirm-request', // 删除确认请求
  'agent:delete-confirmation',    // 删除确认响应

  // 权限管理
  'permissions:trust-project',    // 信任项目
  'permissions:revoke-trust',     // 取消信任
  'permissions:get-trusted-projects', // 获取信任项目列表

  // Session 管理
  'session:list',
  'session:get',
  'session:load',
  'session:save',
  'session:delete',
  'session:current',

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
  'floating-ball:state-changed',  // 悬浮球状态变化

  // 窗口控制
  'window:minimize',
  'window:maximize',
  'window:close',

  // 配置（仅非敏感操作）
  'config:get-safe',              // 🔒 安全配置获取（不包含 API Key）
  'config:get-all',               // 获取完整配置（包含 API Key）
  'config:set-all',               // 设置完整配置
  'config:get-first-launch',
  'config:set-first-launch',
  'config:get-api-key-status',
  'config:get-setup-status',
  'config:reset-first-launch',
  'config:updated',               // 配置更新广播

  // 个人风格配置
  'config:get-style-config',
  'config:save-article',
  'config:analyze-style',
  'config:update-style-guide',
  'config:reanalyze-style',
  'config:clear-style-config',

  // 快捷键
  'shortcut:update',

  // 应用事件
  'app:crash',                // 应用崩溃事件

  // 更新管理
  'update:check',
  'update:install',
  'update:available',             // 更新可用
  'update:downloaded',            // 更新已下载
  'update:progress',              // 更新进度
  'update:not-available',         // 无更新
  'update:error',                 // 更新错误

  // MCP
  'mcp:get-config',
  'mcp:get-templates',         // 🔧 新增：获取 MCP 模板配置
  'mcp:save-config',
  'mcp:get-status',
  'mcp:reconnect',
  'mcp:state-changed',          // MCP 状态变化广播
  'mcp:get-custom-servers',     // 获取自定义 MCP 服务器列表
  'mcp:repair-config',          // 修复 MCP 配置
  'mcp:add-custom-server',      // 添加自定义 MCP 服务器
  'mcp:update-custom-server',   // 更新自定义 MCP 服务器
  'mcp:remove-custom-server',   // 删除自定义 MCP 服务器
  'mcp:test-connection',        // 测试 MCP 服务器连接
  'mcp:validate-config',        // 验证 MCP 配置
  'mcp:reload-all',             // 重新加载所有 MCP 服务器

  // 技能
  'skills:list',
  'skills:get',
  'skills:save',
  'skills:delete',
  'skills:export',              // 导出技能
  'skills:import-file',         // 从文件导入技能
  'skills:import-url',          // 从 URL 导入技能
  'skills:import-github',       // 从 GitHub 导入技能
  'skills:validate',            // 验证技能内容

  // 通知
  'notification:send',
  'notification:send-work-complete',
  'notification:send-error',
  'notification:send-info',
  'notification:set-enabled',
  'notification:get-enabled',
  'notification:has-permission',

  // 命令面板
  'command-palette:toggle',        // 命令面板切换
  'commands:execute',              // 执行命令
  'commands:search',               // 搜索命令
  'commands:list',                 // 列出所有命令
  'commands:set-shortcut',         // 设置命令快捷键
  'commands:get-shortcuts',        // 获取所有快捷键
  'commands:suggest',              // 命令建议
  'commands:check-conflict',       // 检查快捷键冲突

  // Python
  'python:install-dependency',     // 安装 Python 依赖

  // Slash Command 状态广播
  'slash-command:success',         // 命令执行成功
  'slash-command:error',           // 命令执行错误
  'slash-command:result',          // 命令执行结果
  'slash-command:executing',       // 命令正在执行

  // 权限确认
  'agent:permission-confirm-request',  // 权限确认请求
  'agent:permission-confirmation',     // 权限确认响应

  // 调试通道
  'main-process-message',         // 主进程调试消息
] as const

// 🔒 安全检查函数
function isChannelAllowed(channel: string): boolean {
  return ALLOWED_CHANNELS.includes(channel as any)
}

// 🔒 安全的 invoke 方法（带白名单验证）
function secureInvoke(channel: string, ...args: unknown[]) {
  if (!isChannelAllowed(channel)) {
    log.error(`[Security] ❌ Blocked unauthorized IPC invoke: ${channel}`)
    throw new Error(`Unauthorized IPC channel: ${channel}`)
  }
  return ipcRenderer.invoke(channel, ...args)
}

// 🔒 安全的 send 方法
function secureSend(channel: string, ...args: unknown[]) {
  if (!isChannelAllowed(channel)) {
    log.error(`[Security] ❌ Blocked unauthorized IPC send: ${channel}`)
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
    log.error(`[Security] ❌ Blocked unauthorized IPC listener: ${channel}`)
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
function secureOff(channel: string, listener: (...args: unknown[]) => void) {
  if (!isChannelAllowed(channel)) {
    log.error(`[Security] ❌ Blocked unauthorized IPC off: ${channel}`)
    return
  }
  return ipcRenderer.off(channel, listener)
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

// 🚀 暴露 Electron 环境标记（让渲染进程能检测到是 Electron 环境）
contextBridge.exposeInMainWorld('__IS_ELECTRON__', true)
log.log('✅ [Preload] Exposed __IS_ELECTRON__ to renderer via contextBridge')
log.log('✅ [Preload] Preload script completed successfully')
