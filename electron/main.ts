// ✅ 使用标准 electron 导入
import { app, BrowserWindow, shell, ipcMain, screen, dialog, globalShortcut, Tray, Menu, nativeImage } from 'electron'

import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'
import dotenv from 'dotenv'
import log from 'electron-log'
import { AgentRuntime } from './agent/AgentRuntime.js'
import { pythonRuntime } from './agent/PythonRuntime.js'
import { configStore } from './config/ConfigStore.js'
import { sessionStore } from './config/SessionStore.js'
import { notificationService } from './services/NotificationService.js'
import { auditLogger, setupAuditHooks } from './security/AuditLogger.js'
import { UpdateManager } from './updater/UpdateManager.js'
import Anthropic from '@anthropic-ai/sdk'

// Extend App type to include isQuitting property
declare global {
  namespace Electron {
    interface App {
      isQuitting?: boolean
    }
  }
}

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

// Function to update .env file
function updateEnvFile(key: string, value: string) {
  // 使用项目根目录或开发目录
  const projectRoot = process.env.APP_ROOT || process.cwd();
  const envPath = path.join(projectRoot, '.env');

  try {
    // 确保 .env 文件存在
    if (!fs.existsSync(envPath)) {
      log.log(`[updateEnvFile] .env file not found at ${envPath}, creating...`);
      fs.writeFileSync(envPath, '', 'utf8');
    }

    let content = fs.readFileSync(envPath, 'utf8');
    const regex = new RegExp(`${key}=.*`, 'g');

    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
      log.log(`[updateEnvFile] Updated ${key} in .env file`);
    } else {
      content += `\n${key}=${value}`;
      log.log(`[updateEnvFile] Added ${key} to .env file`);
    }

    fs.writeFileSync(envPath, content.trim());
    log.log(`[updateEnvFile] Successfully saved ${key} to .env file (path: ${envPath})`);
  } catch (error) {
    log.error(`[updateEnvFile] Failed to update .env file:`, error);
  }
}

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

// Internal MCP Server Runner
// MiniMax startup removed
// --- Normal App Initialization ---

let mainWin: BrowserWindow | null = null
let floatingBallWin: BrowserWindow | null = null
let tray: Tray | null = null
let agent: AgentRuntime | null = null
let updateManager: UpdateManager | null = null

// 旧 Agent 实例备份（用于回滚）
let previousAgent: AgentRuntime | null = null
let previousConfig: { apiKey: string; model: string; apiUrl: string } | null = null

// Ball state
let isBallExpanded = false
const BALL_SIZE = 64
const EXPANDED_WIDTH = 280    // 优化宽度以适应更多屏幕位置
const EXPANDED_HEIGHT = 480   // 增加高度以显示完整的对话界面

// ========== 全局异常处理器 ==========
// 防止未捕获异常导致进程崩溃
process.on('uncaughtException', (error: Error) => {
  log.error('[Fatal] Uncaught Exception:', error)
  log.error('[Fatal] Stack:', error.stack)

  // 记录崩溃现场
  const crashInfo = {
    timestamp: new Date().toISOString(),
    error: error.message,
    stack: error.stack,
    config: configStore.getAll()
  }

  // 保存崩溃日志到文件
  try {
    const crashLogPath = path.join(os.homedir(), '.aiagent', 'crash-logs.json')
    fs.mkdirSync(path.dirname(crashLogPath), { recursive: true })
    const crashLogs = JSON.parse(fs.readFileSync(crashLogPath, 'utf8') || '[]')
    crashLogs.push(crashInfo)
    fs.writeFileSync(crashLogPath, JSON.stringify(crashLogs.slice(-10), null, 2))
    log.log('[Fatal] Crash log saved to:', crashLogPath)
  } catch (logError) {
    log.error('[Fatal] Failed to save crash log:', logError)
  }

  // 向所有窗口显示错误通知
  BrowserWindow.getAllWindows().forEach(win => {
    if (!win.isDestroyed()) {
      win.webContents.send('app:crash', {
        message: '应用遇到了严重错误',
        error: error.message
      })
    }
  })

  // 不退出进程，保持应用运行
  log.warn('[Fatal] Process survived uncaught exception')
})

process.on('unhandledRejection', (reason: unknown) => {
  log.error('[Fatal] Unhandled Promise Rejection:', reason)

  if (reason instanceof Error) {
    log.error('[Fatal] Stack:', reason.stack)
  }

  // 不退出进程，保持应用运行
  log.warn('[Fatal] Process survived unhandled rejection')
})

// ✅ 正确：在 app.whenReady() 之前注册全局事件监听器
// 这些监听器会立即生效，不依赖 app 对象的完整初始化
app.on('before-quit', () => {
  app.isQuitting = true
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow()
  }
})

app.whenReady().then(async () => {
  // [Fix] Set specific userData path for dev mode to avoid permission/locking issues
  if (VITE_DEV_SERVER_URL) {
    const devUserData = path.join(process.env.APP_ROOT, '.vscode', 'electron-userdata');
    if (!fs.existsSync(devUserData)) {
      fs.mkdirSync(devUserData, { recursive: true });
    }
    app.setPath('userData', devUserData);
  }

  // Set App User Model ID for Windows notifications
  app.setAppUserModelId('com.wechatflowwork.app')

  // Register Protocol Client
  if (app.isPackaged) {
    app.setAsDefaultProtocolClient('wechatflowwork')
  } else {
    log.log('Skipping protocol registration in Dev mode.')
  }

  // 🔒 0. 初始化审计日志系统
  log.log('[Main] Initializing audit logger...')
  setupAuditHooks()

  // 设置定期清理任务（每天凌晨 2 点清理过期日志）
  setInterval(async () => {
    const now = new Date()
    if (now.getHours() === 2 && now.getMinutes() === 0) {
      log.log('[Main] Running scheduled log cleanup...')
      await auditLogger.cleanupOldLogs()
    }
  }, 60 * 1000) // 每分钟检查一次

  // 启动时立即清理一次过期日志
  await auditLogger.cleanupOldLogs()

  // 记录应用启动事件
  await auditLogger.log(
    'auth',
    'application_started',
    {
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch
    },
    'info'
  )

  log.log('[Main] ✓ Audit logger ready')

  // 0. Initialize Python runtime FIRST
  log.log('[Main] Initializing Python runtime...')
  const pythonReady = await pythonRuntime.initialize();

  if (!pythonReady) {
    log.warn('[Main] ⚠ Python runtime not available, AI skills will not work');
    if (!app.isPackaged) {
      log.error('[Main] Please run "npm run setup-python" first to use AI skills!');
    }
  } else {
    log.log('[Main] ✓ Python runtime ready');
  }

  // 1. Setup IPC handlers FIRST
  // 1. Setup IPC handlers FIRST
  // setupIPCHandlers() - handlers are defined at top level now

  // 2. Create windows
  createMainWindow()
  createFloatingBallWindow()

  // 🔒 2.5. 初始化更新管理器（仅生产环境）
  if (process.env.NODE_ENV === 'production' && mainWin) {
    log.log('[Main] Initializing update manager...')
    updateManager = new UpdateManager(mainWin)
    updateManager.scheduleAutoCheck()
    log.log('[Main] ✓ Update manager ready')
  }

  // 3. Initialize agent AFTER windows are created
  await initializeAgent()

  // 4. Create system tray
  createTray()

  // 5. Register global shortcut
  globalShortcut.register('Alt+Space', () => {
    if (floatingBallWin) {
      if (floatingBallWin.isVisible()) {
        if (isBallExpanded) {
          toggleFloatingBallExpanded()
        }
        floatingBallWin.hide()
      } else {
        floatingBallWin.show()
        floatingBallWin.focus()
      }
    }
  })

  // Show main window in dev mode OR if no API key configured
  if (VITE_DEV_SERVER_URL) {
    mainWin?.show()
  } else {
    // 生产环境：检查是否有 API Key
    const apiKey = configStore.get('apiKey')
    if (!apiKey || apiKey.trim() === '') {
      log.log('[Main] No API Key configured, showing main window for setup')
      mainWin?.show()
    }
  }

  log.log('SkillMate started. Press Alt+Space to toggle floating ball.')
})


//Functions defined outside the block to ensure proper hoisiting and scope access (vars are global to file)

// IPC Handlers

ipcMain.handle('agent:send-message', async (_event, message: string | { content: string, images: string[] }) => {
  if (!agent) throw new Error('Agent not initialized')
  return await agent.processUserMessage(message)
})

ipcMain.handle('agent:abort', () => {
  agent?.abort()
})

ipcMain.handle('agent:new-session', () => {
  agent?.clearHistory()
  const session = sessionStore.createSession()
  return { success: true, sessionId: session.id }
})

// Session Management
ipcMain.handle('session:list', () => {
  return sessionStore.getSessions()
})

ipcMain.handle('session:get', (_, id: string) => {
  return sessionStore.getSession(id)
})

ipcMain.handle('session:load', (_, id: string) => {
  const session = sessionStore.getSession(id)
  if (session && agent) {
    agent.loadHistory(session.messages)
    sessionStore.setCurrentSession(id)
    return { success: true }
  }
  return { error: 'Session not found' }
})

ipcMain.handle('session:save', (_, messages: Anthropic.MessageParam[]) => {
  const currentId = sessionStore.getCurrentSessionId()
  if (currentId) {
    sessionStore.updateSession(currentId, messages)
    return { success: true }
  }
  // Create new session if none exists
  const session = sessionStore.createSession()
  sessionStore.updateSession(session.id, messages)
  return { success: true, sessionId: session.id }
})

ipcMain.handle('session:delete', (_, id: string) => {
  sessionStore.deleteSession(id)
  return { success: true }
})

ipcMain.handle('session:current', () => {
  const id = sessionStore.getCurrentSessionId()
  return id ? sessionStore.getSession(id) : null
})

ipcMain.handle('agent:authorize-folder', (_, folderPath: string) => {
  const folders = configStore.getAll().authorizedFolders || []
  if (!folders.includes(folderPath)) {
    folders.push(folderPath)
    configStore.set('authorizedFolders', folders)
  }
  return true
})

ipcMain.handle('agent:get-authorized-folders', () => {
  return configStore.getAll().authorizedFolders || []
})

// ========== 信任项目管理 IPC 处理器 ==========

import { permissionManager } from './agent/security/PermissionManager.js'

ipcMain.handle('permissions:trust-project', async (_event, projectPath: string) => {
  log.log('[permissions:trust-project] Trusting project:', projectPath)
  const success = permissionManager.trustProject(projectPath)
  return { success }
})

ipcMain.handle('permissions:revoke-trust', async (_event, projectPath: string) => {
  log.log('[permissions:revoke-trust] Revoking trust for project:', projectPath)
  permissionManager.revokeTrust(projectPath)
  return { success: true }
})

ipcMain.handle('permissions:get-trusted-projects', async () => {
  const projects = permissionManager.getTrustedProjects()
  log.log('[permissions:get-trusted-projects] Returning', projects.length, 'trusted projects')
  return projects
})

ipcMain.on('agent:delete-confirmation', async (_event, { id, approved }: { id: string, approved: boolean }) => {
  log.log('[agent:delete-confirmation] Received confirmation for', id, 'approved:', approved)
  if (agent) {
    agent.handleDeleteConfirmation(id, approved)
  }
})

// File system operations for drag and drop
ipcMain.handle('fs:save-temp-file', async (_event, { name, data }: { name: string, data: number[] }) => {
  try {
    // Create temp directory
    const tmpDir = path.join(os.tmpdir(), 'skill-mate')
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true })
    }

    // Save file
    const filePath = path.join(tmpDir, name)
    fs.writeFileSync(filePath, Buffer.from(data))

    log.log(`[fs:save-temp-file] Saved temp file: ${filePath}`)
    return { success: true, path: filePath }
  } catch (error) {
    log.error('[fs:save-temp-file] Failed to save temp file:', error)
    return { success: false, error: (error as Error).message }
  }
})

// File system operations for file preview
ipcMain.handle('fs:read-file', async (_event, filePath: string) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    log.log(`[fs:read-file] Read file: ${filePath}`)
    return content
  } catch (error) {
    log.error('[fs:read-file] Failed to read file:', error)
    throw new Error(`无法读取文件：${(error as Error).message}`)
  }
})

ipcMain.handle('dialog:select-file', async () => {
  const result = await dialog.showOpenDialog(mainWin!, {
    properties: ['openFile'],
    filters: [
      { name: 'Markdown Files', extensions: ['md', 'markdown'] },
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('agent:set-working-dir', (_, folderPath: string) => {
  // Set as first (primary) in the list
  const folders = configStore.getAll().authorizedFolders || []
  const newFolders = [folderPath, ...folders.filter(f => f !== folderPath)]
  configStore.set('authorizedFolders', newFolders)
  return true
})

ipcMain.handle('config:get-all', () => {
  const config = configStore.getAll()
  log.log('[config:get-all] Returning config:', { ...config, apiKey: config.apiKey ? '***' + config.apiKey.slice(-4) : 'empty' })
  return config
})

// 🔒 安全配置获取（不包含 API Key 等敏感信息）
ipcMain.handle('config:get-safe', () => {
  const config = configStore.getAll()
  log.log('[config:get-safe] Current authorizedFolders from store:', {
    count: config.authorizedFolders?.length || 0,
    folders: config.authorizedFolders
  })
  const safeConfig = {
    apiUrl: config.apiUrl,
    model: config.model,
    authorizedFolders: config.authorizedFolders,
    networkAccess: config.networkAccess,
    shortcut: config.shortcut,
    notifications: config.notifications,
    notificationTypes: config.notificationTypes,
    // ❌ 不返回: apiKey, doubaoApiKey, zhipuApiKey
  }
  log.log('[config:get-safe] Returning safeConfig with authorizedFolders:', {
    count: safeConfig.authorizedFolders?.length || 0,
    folders: safeConfig.authorizedFolders
  })
  return safeConfig
})

ipcMain.handle('config:set-all', async (_, cfg) => {
  log.log('[config:set-all] Received config:', {
    apiKey: cfg.apiKey ? '***' + cfg.apiKey.slice(-4) : 'empty',
    apiUrl: cfg.apiUrl,
    model: cfg.model,
    hasApiKey: !!cfg.apiKey
  })

  // ✅ 获取旧配置，用于判断是否需要重启 Agent
  const oldConfig = configStore.getAll()

  // 分别处理每个配置项，避免一个失败影响全部
  const saveErrors: Array<{field: string, error: string}> = []

  // API Key
  try {
    if (cfg.apiKey !== undefined) {
      await configStore.setApiKey(cfg.apiKey)
      log.log('[config:set-all] Saved apiKey, length:', cfg.apiKey.length)
    }
  } catch (error) {
    const errorMsg = (error as Error).message
    saveErrors.push({field: 'apiKey', error: errorMsg})
    log.error('[config:set-all] Failed to save apiKey:', errorMsg)
  }

  // Doubao API Key
  try {
    if (cfg.doubaoApiKey !== undefined) {
      await configStore.setDoubaoApiKey(cfg.doubaoApiKey)
      // ✅ 移除 .env 文件更新，避免触发 Vite 重启（开发模式）
      // 配置已通过 electron-store 持久化，环境变量直接注入到 process.env
      // updateEnvFile('DOUBAO_API_KEY', cfg.doubaoApiKey)
    }
  } catch (error) {
    const errorMsg = (error as Error).message
    saveErrors.push({field: 'doubaoApiKey', error: errorMsg})
    log.error('[config:set-all] Failed to save doubaoApiKey:', errorMsg)
  }

  // Zhipu API Key
  try {
    if (cfg.zhipuApiKey !== undefined) {
      await configStore.setZhipuApiKey(cfg.zhipuApiKey)
    }
  } catch (error) {
    const errorMsg = (error as Error).message
    saveErrors.push({field: 'zhipuApiKey', error: errorMsg})
    log.error('[config:set-all] Failed to save zhipuApiKey:', errorMsg)
  }

  // API URL
  try {
    if (cfg.apiUrl !== undefined) {
      configStore.setApiUrl(cfg.apiUrl)
      log.log('[config:set-all] Saved apiUrl:', cfg.apiUrl)
    }
  } catch (error) {
    const errorMsg = (error as Error).message
    saveErrors.push({field: 'apiUrl', error: errorMsg})
    log.error('[config:set-all] Failed to save apiUrl:', errorMsg)
  }

  // Model
  try {
    if (cfg.model !== undefined) {
      configStore.setModel(cfg.model)
      log.log('[config:set-all] Saved model:', cfg.model)
    }
  } catch (error) {
    const errorMsg = (error as Error).message
    saveErrors.push({field: 'model', error: errorMsg})
    log.error('[config:set-all] Failed to save model:', errorMsg)
  }

  // authorizedFolders（关键修复）
  try {
    // 获取旧的授权文件夹
    const oldFolders = configStore.get('authorizedFolders') || []

    log.log('[config:set-all] Saving authorizedFolders:', {
      count: cfg.authorizedFolders?.length || 0,
      folders: cfg.authorizedFolders
    })

    configStore.set('authorizedFolders', cfg.authorizedFolders || [])
    log.log('[config:set-all] authorizedFolders saved successfully')

    // 验证保存
    const savedFolders = configStore.get('authorizedFolders')
    log.log('[config:set-all] Verification - saved folders:', {
      count: savedFolders?.length || 0,
      folders: savedFolders
    })

    // 🔧 新增：检测授权文件夹变更，更新 MCP 配置
    const newFolders = cfg.authorizedFolders || []
    const foldersChanged =
      oldFolders.length !== newFolders.length ||
      !oldFolders.every((f: string, i: number) => f === newFolders[i])

    if (foldersChanged && agent) {
      log.log('[Main] 🔄 Authorized folders changed, updating MCP config')

      // 异步更新 MCP 配置，不阻塞保存操作
      updateMCPFilesystemPath(newFolders[0] || os.homedir()).catch(err => {
        log.error('[Main] Failed to update MCP config:', err)
      })
    }
  } catch (error) {
    const errorMsg = (error as Error).message
    saveErrors.push({field: 'authorizedFolders', error: errorMsg})
    log.error('[config:set-all] Failed to save authorizedFolders:', errorMsg)
  }

  // Network Access
  try {
    configStore.setNetworkAccess(cfg.networkAccess || false)
  } catch (error) {
    const errorMsg = (error as Error).message
    saveErrors.push({field: 'networkAccess', error: errorMsg})
    log.error('[config:set-all] Failed to save networkAccess:', errorMsg)
  }

  // Shortcut
  try {
    if (cfg.shortcut !== undefined) {
      configStore.set('shortcut', cfg.shortcut)
    }
  } catch (error) {
    const errorMsg = (error as Error).message
    saveErrors.push({field: 'shortcut', error: errorMsg})
    log.error('[config:set-all] Failed to save shortcut:', errorMsg)
  }

  // Notifications
  try {
    if (cfg.notifications !== undefined) {
      configStore.set('notifications', cfg.notifications)
    }
  } catch (error) {
    const errorMsg = (error as Error).message
    saveErrors.push({field: 'notifications', error: errorMsg})
    log.error('[config:set-all] Failed to save notifications:', errorMsg)
  }

  // Notification Types
  try {
    if (cfg.notificationTypes !== undefined) {
      configStore.set('notificationTypes', cfg.notificationTypes)
    }
  } catch (error) {
    const errorMsg = (error as Error).message
    saveErrors.push({field: 'notificationTypes', error: errorMsg})
    log.error('[config:set-all] Failed to save notificationTypes:', errorMsg)
  }

  // 汇总保存错误
  if (saveErrors.length > 0) {
    log.error('[config:set-all] Some fields failed to save:', saveErrors)
  }

  // Verify save
  const savedConfig = configStore.getAll()
  log.log('[config:set-all] Verification after save:', {
    apiKey: savedConfig.apiKey ? '***' + savedConfig.apiKey.slice(-4) : 'empty',
    apiUrl: savedConfig.apiUrl,
    model: savedConfig.model,
    authorizedFoldersCount: savedConfig.authorizedFolders?.length || 0
  })

  // ✅ 仅在关键配置变化时重启 Agent（忽略 undefined 值）
  log.log('[config:set-all] ⚠️ Config comparison details:', {
    cfgApiKey: cfg.apiKey ? '***' + cfg.apiKey.slice(-4) : 'undefined',
    oldApiKey: oldConfig.apiKey ? '***' + oldConfig.apiKey.slice(-4) : 'value',
    apiKeyChanged: cfg.apiKey !== oldConfig.apiKey,
    cfgApiUrl: cfg.apiUrl,
    oldApiUrl: oldConfig.apiUrl,
    apiUrlChanged: cfg.apiUrl !== oldConfig.apiUrl,
    cfgModel: cfg.model,
    oldModel: oldConfig.model,
    modelChanged: cfg.model !== oldConfig.model
  })

  // ✅ 仅在实际有值变更时才重启 Agent（忽略 undefined 和空字符串）
  const shouldRestartAgent =
    (cfg.apiKey !== undefined && cfg.apiKey !== oldConfig.apiKey && cfg.apiKey !== '') ||
    (cfg.apiUrl !== undefined && cfg.apiUrl !== oldConfig.apiUrl && cfg.apiUrl !== '') ||
    (cfg.model !== undefined && cfg.model !== oldConfig.model && cfg.model !== '')

  log.log('[config:set-all] shouldRestartAgent:', shouldRestartAgent)

  if (shouldRestartAgent) {
    log.log('[config:set-all] Reinitializing agent...')

    // ✅ 检查 Agent 重启结果
    const result = await initializeAgent()

    if (!result.success) {
      log.error('[config:set-all] Agent restart failed:', result.error)

      // ✅ 返回失败信息给前端
      return {
        success: false,
        errors: saveErrors,
        agentRestarted: false,
        agentError: result.error || 'Agent 初始化失败'
      }
    }

    log.log('[config:set-all] ✓ Agent restart successful')
  } else {
    log.log('[config:set-all] Non-key config changed, skipping agent restart')

    // 更新环境变量
    if (cfg.doubaoApiKey !== oldConfig.doubaoApiKey && cfg.doubaoApiKey) {
      process.env.DOUBAO_API_KEY = cfg.doubaoApiKey
      log.log('[config:set-all] Updated DOUBAO_API_KEY environment variable')
    }
    if (cfg.zhipuApiKey !== oldConfig.zhipuApiKey && cfg.zhipuApiKey) {
      process.env.ZHIPU_API_KEY = cfg.zhipuApiKey
      log.log('[config:set-all] Updated ZHIPU_API_KEY environment variable')
    }
  }

  // 广播配置更新事件到所有窗口
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('config:updated')
  })
  log.log('[config:set-all] Broadcasted config:updated event to all windows')

  return {
    success: saveErrors.length === 0,
    errors: saveErrors,
    agentRestarted: shouldRestartAgent  // ✅ 返回是否重启了 Agent
  }
})

// ========== 个人风格配置 IPC 通道 ==========

// 获取用户的风格配置
ipcMain.handle('config:get-style-config', () => {
  try {
    const config = configStore.getUserStyleConfig()
    log.log('[config:get-style-config] Returning style config:', {
      articleCount: config?.articles.length || 0,
      learningCount: config?.learningCount || 0,
      hasStyleGuide: !!config?.styleGuide
    })
    return config || {
      articles: [],
      styleGuide: {
        openingHabits: [],
        wordChoice: { technicalLevel: 5, colloquialLevel: 5, humorLevel: 5 },
        structureHabits: [],
        emotionalTone: ''
      },
      lastUpdated: '',
      learningCount: 0
    }
  } catch (error) {
    log.error('[config:get-style-config] Error:', error)
    return {
      articles: [],
      styleGuide: {
        openingHabits: [],
        wordChoice: { technicalLevel: 5, colloquialLevel: 5, humorLevel: 5 },
        structureHabits: [],
        emotionalTone: ''
      },
      lastUpdated: '',
      learningCount: 0
    }
  }
})

// 保存用户文章
ipcMain.handle('config:save-article', async (_event, { content, filename }: { content: string; filename: string }) => {
  try {
    const fs = await import('fs')
    const path = await import('path')
    const os = await import('os')

    // 创建用户文章目录
    const userArticlesDir = path.join(os.homedir(), 'wechatflowwork-user-data', 'user-articles')
    await fs.promises.mkdir(userArticlesDir, { recursive: true })

    // 保存文章
    const articlePath = path.join(userArticlesDir, filename)
    await fs.promises.writeFile(articlePath, content, 'utf-8')

    // 添加到配置
    configStore.addArticlePath(articlePath)

    log.log('[config:save-article] Article saved:', articlePath)
    return { success: true, path: articlePath }
  } catch (error) {
    const errorMsg = (error as Error).message
    log.error('[config:save-article] Failed to save article:', errorMsg)
    return { success: false, error: errorMsg }
  }
})

// 分析用户文章风格
ipcMain.handle('config:analyze-style', async (_event, { articlePaths }: { articlePaths: string[] }) => {
  try {
    log.log('[config:analyze-style] Analyzing', articlePaths.length, 'articles')

    // 读取所有文章内容
    const fs = await import('fs')
    const articlesContent: string[] = []

    for (const articlePath of articlePaths) {
      try {
        const content = await fs.promises.readFile(articlePath, 'utf-8')
        articlesContent.push(content)
      } catch (error) {
        log.error(`[config:analyze-style] Failed to read article: ${articlePath}`, error)
      }
    }

    if (articlesContent.length === 0) {
      throw new Error('没有可用的文章内容')
    }

    // 合并文章内容（使用分隔符）
    const articlesText = articlesContent.join('\n\n=== 文章分隔 ===\n\n')

    // 调用 style-learner Python 脚本
    const { spawn } = await import('child_process')
    const path = await import('path')
    const { app } = await import('electron')

    // 解析 style-learner 脚本路径（与 SkillManager 保持一致）
    let scriptPath: string
    if (app.isPackaged) {
      // 生产模式：尝试 resources/skills 或 skills
      const possiblePath = path.join(process.resourcesPath, 'resources', 'skills', 'style-learner', 'scripts', 'style_learner.py')
      const fallbackPath = path.join(process.resourcesPath, 'skills', 'style-learner', 'scripts', 'style_learner.py')
      try {
        const fs = await import('fs')
        await fs.promises.access(possiblePath)
        scriptPath = possiblePath
      } catch {
        scriptPath = fallbackPath
      }
    } else {
      // 开发模式：使用项目根目录
      scriptPath = path.join(process.cwd(), 'resources', 'skills', 'style-learner', 'scripts', 'style_learner.py')
    }

    log.log('[config:analyze-style] Calling style_learner.py at:', scriptPath)

    const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      const python = spawn('python', [scriptPath], {
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8'
        },
        timeout: 30000, // 30 秒超时
        shell: false // 🔒 禁用 shell，防止命令注入
      })

      let stdout = ''
      let stderr = ''

      python.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      python.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      python.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr })
        } else {
          reject(new Error(`Python script exited with code ${code}: ${stderr}`))
        }
      })

      python.on('error', (error) => {
        reject(error)
      })

      // 发送文章内容到 stdin
      python.stdin.write(JSON.stringify({
        action: 'analyze_style',
        articles: articlesText,
        output_file: 'user-style-analysis.json'
      }))
      python.stdin.end()
    })

    // 解析 Python 脚本的输出
    let analysisResult: any
    try {
      analysisResult = JSON.parse(result.stdout)
    } catch (error) {
      log.error('[config:analyze-style] Failed to parse Python output:', result.stdout)
      throw new Error('解析分析结果失败')
    }

    if (analysisResult.status !== 'success') {
      throw new Error(analysisResult.message || '分析失败')
    }

    // 保存分析结果到文件
    const os = await import('os')
    const userDataDir = path.join(os.homedir(), 'wechatflowwork-user-data')
    await fs.promises.mkdir(userDataDir, { recursive: true })

    const analysisPath = path.join(userDataDir, 'user-style-analysis.json')
    await fs.promises.writeFile(analysisPath, JSON.stringify(analysisResult, null, 2), 'utf-8')

    // 更新配置 - 从 style-learner 的结果中提取风格指南
    const features = analysisResult.style_features || {}

    // 转换 opening_style.patterns 对象为数组
    const openingHabitsArray = features.opening_style?.patterns ?
      Object.entries(features.opening_style.patterns)
        .filter(([_, count]) => (count as number) > 0)
        .map(([name, _]) => name) : []

    const styleGuide = {
      openingHabits: openingHabitsArray,
      wordChoice: {
        technicalLevel: features.language_style?.tone === '专业' ? 7 : 5,
        colloquialLevel: features.language_style?.vocabulary?.includes('通俗') ? 7 : 5,
        humorLevel: 5
      },
      structureHabits: [
        features.content_structure?.structure || '未知',
        `段落数: ${features.content_structure?.paragraph_count?.avg || 0}`,
        `句长: ${features.language_style?.sentence_length?.avg || 0}字`
      ],
      emotionalTone: features.tone_style?.dominant_tone || features.emotion_style?.dominant_emotion || analysisResult.style_description || '',
      // 新增：保存完整分析结果
      fullAnalysis: features
    }

    configStore.updateStyleGuide(styleGuide)

    // 适配结果格式以匹配 PersonalStyleTab 的 AnalysisResult 接口
    const adaptedResult = {
      openingHabits: {
        patterns: Object.keys(features.opening_style?.patterns || {}),
        distribution: features.opening_style?.patterns || {},
        examples: []  // style-learner 不提供示例，返回空数组
      },
      wordChoice: {
        technicalLevel: features.language_style?.tone === '专业' ? 7 : 5,
        colloquialLevel: features.language_style?.vocabulary?.includes('通俗') ? 7 : 5,
        humorLevel: 5,
        frequentWords: {
          colloquial: features.common_phrases_style?.colloquial || [],
          emotional: features.emotion_style?.emotion_scores ? Object.keys(features.emotion_style.emotion_scores) : [],
          technical: features.language_style?.keywords || []
        }
      },
      structureHabits: {
        mainPattern: features.content_structure?.structure || '未知',
        distribution: features.content_structure?.paragraph_count ? {
          '最小': features.content_structure.paragraph_count.min || 0,
          '平均': features.content_structure.paragraph_count.avg || 0,
          '最大': features.content_structure.paragraph_count.max || 0
        } : {},
        paragraphLength: features.content_structure?.paragraph_length || {},
        sentenceLength: features.language_style?.sentence_length || {},
        useSubheadings: false  // style-learner 没有这个字段，默认 false
      },
      emotionalExpression: {
        dominantTone: features.tone_style?.dominant_tone || features.emotion_style?.dominant_emotion || '未知',
        wordDensity: features.emotion_style?.emotion_intensity === '强' ? 30 : 15,  // 估算值
        changePattern: features.emotion_style?.sentiment_trend || '稳定'
      }
    }

    log.log('[config:analyze-style] Analysis complete')
    return {
      success: true,
      result: adaptedResult,
      analysisPath
    }
  } catch (error) {
    const errorMsg = (error as Error).message
    log.error('[config:analyze-style] Failed to analyze:', errorMsg)
    return { success: false, error: errorMsg }
  }
})

// 更新风格指南
ipcMain.handle('config:update-style-guide', async (_event, { styleGuide }: { styleGuide: any }) => {
  try {
    configStore.updateStyleGuide(styleGuide)
    log.log('[config:update-style-guide] Style guide updated')
    return { success: true }
  } catch (error) {
    const errorMsg = (error as Error).message
    log.error('[config:update-style-guide] Failed to update:', errorMsg)
    return { success: false, error: errorMsg }
  }
})

// 重新分析风格
ipcMain.handle('config:reanalyze-style', async () => {
  try {
    const config = configStore.getUserStyleConfig()
    if (!config || config.articles.length === 0) {
      return {
        success: false,
        error: '没有找到用户文章，请先上传文章'
      }
    }

    // 读取所有文章
    const fs = await import('fs')
    const articles: string[] = []

    for (const articlePath of config.articles) {
      try {
        const content = await fs.promises.readFile(articlePath, 'utf-8')
        articles.push(content)
      } catch (error) {
        log.warn('[config:reanalyze-style] Failed to read article:', articlePath)
      }
    }

    if (articles.length === 0) {
      return {
        success: false,
        error: '没有可用的文章内容'
      }
    }

    // 重新分析
    const result = await analyzeArticles(articles)
    return result
  } catch (error) {
    const errorMsg = (error as Error).message
    log.error('[config:reanalyze-style] Failed:', errorMsg)
    return { success: false, error: errorMsg }
  }
})

// 清除风格配置
ipcMain.handle('config:clear-style-config', () => {
  try {
    configStore.clearStyleConfig()
    log.log('[config:clear-style-config] Style config cleared')
    return { success: true }
  } catch (error) {
    const errorMsg = (error as Error).message
    log.error('[config:clear-style-config] Failed:', errorMsg)
    return { success: false, error: errorMsg }
  }
})

// 首次启动配置处理
ipcMain.handle('config:get-first-launch', () => {
  // 使用 ConfigStore 方法获取，支持默认值
  const firstLaunch = configStore.getFirstLaunch()
  log.log('[config:get-first-launch] Returning:', firstLaunch)
  return firstLaunch
})

ipcMain.handle('config:set-first-launch', () => {
  log.log('[config:set-first-launch] Setting to false')
  configStore.setFirstLaunch(false)
  return true
})

// 检测 API Key 是否已设置
ipcMain.handle('config:get-api-key-status', async () => {
  const apiKey = await configStore.getApiKey();
  return {
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length || 0
  };
});

// 检查所有必需配置是否完整
ipcMain.handle('config:get-setup-status', async () => {
  try {
    log.log('[config:get-setup-status] Fetching setup status...');
    const apiKey = await configStore.getApiKey();
    const folders = configStore.getAuthorizedFolders();
    const status = {
      hasApiKey: !!apiKey,
      hasAuthorizedFolders: folders.length > 0,
      isSetupComplete: !!apiKey && folders.length > 0
    };
    log.log('[config:get-setup-status] Returning:', status);
    return status;
  } catch (error) {
    log.error('[config:get-setup-status] Error:', error);
    // 返回默认状态（引导用户重新配置）
    return {
      hasApiKey: false,
      hasAuthorizedFolders: false,
      isSetupComplete: false
    };
  }
});

// 🔒 更新管理器 IPC 处理器
ipcMain.handle('update:check', async () => {
  log.log('[update:check] Manual update check requested')
  await updateManager?.checkForUpdates()
})

ipcMain.handle('update:install', async () => {
  log.log('[update:install] User requested to install update')
  updateManager?.quitAndInstall()
})

// 重置首次启动状态（调试用）
ipcMain.handle('config:reset-first-launch', () => {
  log.log('[config:reset-first-launch] Resetting to true');
  configStore.setFirstLaunch(true);
  return { success: true };
});

// 📦 安装 Python 依赖包
ipcMain.handle('python:install-dependency', async (_, packageName: string) => {
  log.log(`[python:install-dependency] Installing package: ${packageName}`);

  try {
    const pythonExe = pythonRuntime.getPythonExecutable();
    if (!pythonExe) {
      throw new Error('Python runtime not available');
    }

    const libPath = pythonRuntime.getLibPath();
    if (!libPath) {
      throw new Error('Python lib path not available');
    }

    const { spawn } = await import('child_process');

    return new Promise((resolve, reject) => {
      // 🔒 安全检查：验证包名格式，防止命令注入
      const packageNamePattern = /^[a-zA-Z0-9_-]+$/;
      if (!packageNamePattern.test(packageName)) {
        reject(new Error(`Invalid package name: ${packageName}`));
        return;
      }

      const proc = spawn(pythonExe, ['-m', 'pip', 'install', packageName], {
        env: {
          ...process.env,
          PYTHONPATH: libPath,
          PYTHONIOENCODING: 'utf-8'
        },
        timeout: 120000, // 2 分钟超时
        shell: false, // 🔒 禁用 shell，防止命令注入
        cwd: libPath
      });

      let output = '';
      let error = '';

      proc.stdout.on('data', (data) => {
        output += data.toString();
        log.log(`[pip install] ${data.toString().trim()}`);
      });

      proc.stderr.on('data', (data) => {
        error += data.toString();
        log.log(`[pip install] ${data.toString().trim()}`);
      });

      proc.on('close', (code) => {
        log.log(`[python:install-dependency] Process exited with code: ${code}`);
        if (code === 0) {
          resolve({ success: true, output });
        } else {
          reject(new Error(`Installation failed (code ${code}): ${error || output}`));
        }
      });

      proc.on('error', (err) => {
        log.error(`[python:install-dependency] Failed to spawn process:`, err);
        reject(err);
      });
    });
  } catch (error) {
    const err = error as Error;
    log.error(`[python:install-dependency] Installation failed:`, err);
    throw err;
  }
});

// Shortcut update handler
ipcMain.handle('shortcut:update', (_, newShortcut: string) => {
  try {
    globalShortcut.unregisterAll()
    globalShortcut.register(newShortcut, () => {
      if (floatingBallWin) {
        if (floatingBallWin.isVisible()) {
          if (isBallExpanded) {
            toggleFloatingBallExpanded()
          }
          floatingBallWin.hide()
        } else {
          floatingBallWin.show()
          floatingBallWin.focus()
        }
      }
    })
    configStore.set('shortcut', newShortcut)
    return { success: true }
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message }
  }
})

ipcMain.handle('dialog:select-folder', async () => {
  log.log('[dialog:select-folder] Opening folder selection dialog...')
  if (!mainWin) {
    log.error('[dialog:select-folder] ❌ mainWin is null!')
    return null
  }

  try {
    const result = await dialog.showOpenDialog(mainWin, {
      properties: ['openDirectory', 'createDirectory', 'promptToCreate']
    })
    log.log('[dialog:select-folder] Dialog result:', {
      canceled: result.canceled,
      filePaths: result.filePaths
    })

    if (!result.canceled && result.filePaths.length > 0) {
      log.log('[dialog:select-folder] ✅ Selected folder:', result.filePaths[0])
      return result.filePaths[0]
    }
    log.log('[dialog:select-folder] ⚠️ Dialog canceled')
    return null
  } catch (error) {
    log.error('[dialog:select-folder] ❌ Error:', error)
    return null
  }
})

ipcMain.handle('shell:open-path', async (_, filePath: string) => {
  return shell.showItemInFolder(filePath)
})

// Floating Ball specific handlers
ipcMain.handle('floating-ball:toggle', () => {
  toggleFloatingBallExpanded()
})

ipcMain.handle('floating-ball:show-main', () => {
  mainWin?.show()
  mainWin?.focus()
})

ipcMain.handle('floating-ball:start-drag', () => {
  // Enable window dragging
  if (floatingBallWin) {
    floatingBallWin.setMovable(true)
  }
})

ipcMain.handle('floating-ball:move', (_, { deltaX, deltaY }: { deltaX: number, deltaY: number }) => {
  if (floatingBallWin) {
    const [x, y] = floatingBallWin.getPosition()
    floatingBallWin.setPosition(x + deltaX, y + deltaY)
    // Enforce fixed size when expanded to prevent any resizing
    if (isBallExpanded) {
      floatingBallWin.setSize(EXPANDED_WIDTH, EXPANDED_HEIGHT)
    }
  }
})

// Window controls for custom titlebar
ipcMain.handle('window:minimize', async () => {
  log.log('IPC: window:minimize called');
  try {
    if (mainWin && !mainWin.isDestroyed()) {
      log.log('IPC: window:minimize - mainWin exists and not destroyed');
      mainWin.minimize();
      log.log('IPC: window:minimize completed successfully');
      return { success: true, message: 'Window minimized' };
    } else {
      log.error('IPC: window:minimize failed - mainWin is null or destroyed');
      return { success: false, message: 'Main window not available' };
    }
  } catch (error) {
    log.error('IPC: window:minimize error:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
})
ipcMain.handle('window:maximize', async () => {
  log.log('IPC: window:maximize called');
  try {
    if (mainWin && !mainWin.isDestroyed()) {
      log.log('IPC: window:maximize - mainWin exists and not destroyed');
      if (mainWin.isMaximized()) {
        mainWin.unmaximize();
        log.log('IPC: window:maximize - unmaximized successfully');
        return { success: true, message: 'Window unmaximized', isMaximized: false };
      } else {
        mainWin.maximize();
        log.log('IPC: window:maximize - maximized successfully');
        return { success: true, message: 'Window maximized', isMaximized: true };
      }
    } else {
      log.error('IPC: window:maximize failed - mainWin is null or destroyed');
      return { success: false, message: 'Main window not available' };
    }
  } catch (error) {
    log.error('IPC: window:maximize error:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
})
ipcMain.handle('window:close', async () => {
  log.log('IPC: window:close called');
  try {
    if (mainWin && !mainWin.isDestroyed()) {
      log.log('IPC: window:close - mainWin exists and not destroyed');
      mainWin.hide();
      log.log('IPC: window:close completed successfully');
      return { success: true, message: 'Window hidden' };
    } else {
      log.error('IPC: window:close failed - mainWin is null or destroyed');
      return { success: false, message: 'Main window not available' };
    }
  } catch (error) {
    log.error('IPC: window:close error:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
})

// MCP Configuration Handlers
// 统一使用 .aiagent 目录，与 MCPClientService 保持一致
const mcpConfigPath = path.join(os.homedir(), '.aiagent', 'mcp.json');

ipcMain.handle('mcp:get-config', async () => {
  try {
    if (!fs.existsSync(mcpConfigPath)) return '{}';
    return fs.readFileSync(mcpConfigPath, 'utf-8');
  } catch (e) {
    log.error('Failed to read MCP config:', e);
    return '{}';
  }
});

// 🔧 读取 MCP 模板配置
ipcMain.handle('mcp:get-templates', async () => {
  try {
    console.log('[mcp:get-templates] IPC handler called');

    // 根据环境决定模板文件路径
    let templatePath: string;
    if (app.isPackaged) {
      // 生产环境：使用打包后的资源路径
      templatePath = path.join(process.resourcesPath, 'resources', 'mcp-templates.json');
    } else {
      // 开发环境：使用项目根目录
      templatePath = path.join(process.cwd(), 'resources', 'mcp-templates.json');
    }

    console.log('[mcp:get-templates] Template path:', templatePath);
    console.log('[mcp:get-templates] File exists:', fs.existsSync(templatePath));

    if (!fs.existsSync(templatePath)) {
      log.warn('[mcp:get-templates] Template file not found:', templatePath);
      console.warn('[mcp:get-templates] Returning empty template');
      return JSON.stringify({ mcpServers: {} });
    }

    const content = fs.readFileSync(templatePath, 'utf-8');
    console.log('[mcp:get-templates] Read content length:', content.length);
    console.log('[mcp:get-templates] Returning content preview:', content.substring(0, 100));
    return content;
  } catch (e) {
    log.error('[mcp:get-templates] Failed to read template file:', e);
    console.error('[mcp:get-templates] Error:', e);
    return JSON.stringify({ mcpServers: {} });
  }
});

ipcMain.handle('mcp:save-config', async (_, content: string) => {
  try {
    const dir = path.dirname(mcpConfigPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(mcpConfigPath, content, 'utf-8');

    // 🔥 热重载：重新加载 MCP 服务
    if (agent) {
      try {
        await agent.getMCPService().reloadAllServers();
        log.log('[mcp:save-config] ✅ MCP servers reloaded successfully');
      } catch (reloadError) {
        log.error('[mcp:save-config] ⚠️ Failed to reload MCP servers:', reloadError);
        // 不抛出错误，允许保存成功但记录重载失败
      }
    }
    return { success: true };
  } catch (e) {
    log.error('Failed to save MCP config:', e);
    return { success: false, error: (e as Error).message };
  }
});

// 🔧 修复不完整的 MCP 配置
ipcMain.handle('mcp:repair-config', async () => {
  try {
    // 读取用户配置
    const userConfigContent = fs.existsSync(mcpConfigPath)
      ? fs.readFileSync(mcpConfigPath, 'utf-8')
      : '{}';
    const userConfig = JSON.parse(userConfigContent || '{}');

    // 读取模板配置
    const templatesPath = path.join(process.env.APP_ROOT || '', 'resources', 'mcp-templates.json');
    if (!fs.existsSync(templatesPath)) {
      return { success: false, error: '模板配置文件不存在' };
    }
    const templatesContent = fs.readFileSync(templatesPath, 'utf-8');
    const templatesConfig = JSON.parse(templatesContent);

    let repairedCount = 0;
    const repairedServers: string[] = [];

    // 遍历用户配置中的每个服务器
    for (const [serverName, serverConfig] of Object.entries(userConfig.mcpServers || {})) {
      const config = serverConfig as any;

      // 检查配置是否完整（缺少 command 或 args）
      if (!config.command || !config.args) {
        // 从模板中查找完整配置
        if (templatesConfig.mcpServers && templatesConfig.mcpServers[serverName]) {
          const template = templatesConfig.mcpServers[serverName] as any;

          // 保留用户的 disabled 状态
          const wasDisabled = config.disabled;
          const userEnv = config.env || {};

          // 用模板配置替换不完整配置
          userConfig.mcpServers[serverName] = {
            ...template,
            // 保留用户的设置
            disabled: wasDisabled !== undefined ? wasDisabled : template.disabled,
            // 如果用户有自定义 env，则合并（用户值优先）
            env: { ...template.env, ...userEnv }
          };

          repairedCount++;
          repairedServers.push(serverName);
          log.log(`[MCP] ✅ Repaired config for ${serverName}`);
        } else {
          log.warn(`[MCP] ⚠️ No template found for ${serverName}, removing incomplete config`);
          delete userConfig.mcpServers[serverName];
        }
      }
    }

    // 保存修复后的配置
    const dir = path.dirname(mcpConfigPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(mcpConfigPath, JSON.stringify(userConfig, null, 2), 'utf-8');

    log.log(`[MCP] ✅ Repaired ${repairedCount} server(s): ${repairedServers.join(', ')}`);

    return {
      success: true,
      repairedCount,
      repairedServers,
      newConfig: JSON.stringify(userConfig, null, 2)
    };
  } catch (e) {
    log.error('[MCP] Failed to repair config:', e);
    return { success: false, error: (e as Error).message };
  }
});

// Skills Management Handlers
// Helper to get built-in skills directory path
const getBuiltinSkillsDir = () => {
  let sourceDir = path.join(process.cwd(), 'resources', 'skills');
  if (app.isPackaged) {
    const possiblePath = path.join(process.resourcesPath, 'resources', 'skills');
    if (fs.existsSync(possiblePath)) sourceDir = possiblePath;
    else sourceDir = path.join(process.resourcesPath, 'skills');
  }
  return sourceDir;
};

// Helper to get built-in skill names
const getBuiltinSkillNames = () => {
  try {
    const sourceDir = getBuiltinSkillsDir();
    if (fs.existsSync(sourceDir)) {
      return fs.readdirSync(sourceDir).filter(f => fs.statSync(path.join(sourceDir, f)).isDirectory());
    }
  } catch (e) { log.error(e) }
  return [];
};

ipcMain.handle('skills:list', async () => {
  try {
    const skills = [];
    const builtinSkills = new Set<string>();

    // 1. 扫描内置技能目录
    const builtinSkillsDir = getBuiltinSkillsDir();
    log.log(`[skills:list] Builtin skills dir: ${builtinSkillsDir}`);
    log.log(`[skills:list] Directory exists: ${fs.existsSync(builtinSkillsDir)}`);

    if (fs.existsSync(builtinSkillsDir)) {
      const files = fs.readdirSync(builtinSkillsDir);
      log.log(`[skills:list] Found ${files.length} entries in builtin dir`);

      for (const f of files) {
        const filePath = path.join(builtinSkillsDir, f);
        try {
          if (fs.statSync(filePath).isDirectory()) {
            builtinSkills.add(f);
            skills.push({
              id: f,
              name: f,
              path: filePath,
              isBuiltin: true
            });
          }
        } catch { continue; }
      }

      log.log(`[skills:list] Found ${skills.length} builtin skills`);
    } else {
      log.warn(`[skills:list] Builtin skills directory does not exist: ${builtinSkillsDir}`);
    }

    // 2. 扫描用户技能目录
    const userSkillsDir = path.join(os.homedir(), '.aiagent', 'skills');
    log.log(`[skills:list] User skills dir: ${userSkillsDir}`);

    if (fs.existsSync(userSkillsDir)) {
      const files = fs.readdirSync(userSkillsDir);
      for (const f of files) {
        const filePath = path.join(userSkillsDir, f);
        try {
          if (fs.statSync(filePath).isDirectory()) {
            skills.push({
              id: f,
              name: f,
              path: filePath,
              isBuiltin: false
            });
          }
        } catch { continue; }
      }

      log.log(`[skills:list] Found ${skills.filter(s => !s.isBuiltin).length} user skills`);
    }

    log.log(`[skills:list] Total skills to return: ${skills.length}`);
    return skills;
  } catch (e) {
    log.error('Failed to list skills:', e);
    return [];
  }
});

ipcMain.handle('skills:get', async (_, skillId: string) => {
  try {
    // 尝试从内置技能目录读取
    const builtinSkillsDir = getBuiltinSkillsDir();
    let skillPath = path.join(builtinSkillsDir, skillId);
    if (!fs.existsSync(skillPath)) {
      // 如果不存在，尝试从用户技能目录读取
      const userSkillsDir = path.join(os.homedir(), '.aiagent', 'skills');
      skillPath = path.join(userSkillsDir, skillId);
    }

    if (!fs.existsSync(skillPath)) return '';

    // Look for MD file inside
    const files = fs.readdirSync(skillPath);
    const mdFile = files.find(f => f.toLowerCase() === 'skill.md' || f.toLowerCase().endsWith('.md'));

    if (!mdFile) return '';
    return fs.readFileSync(path.join(skillPath, mdFile), 'utf-8');
  } catch (e) {
    log.error('Failed to read skill:', e);
    return '';
  }
});

ipcMain.handle('skills:save', async (_event, skillId: string, content: string) => {
  try {
    const userSkillsDir = path.join(os.homedir(), '.aiagent', 'skills');
    await fs.mkdir(userSkillsDir, { recursive: true } as any);

    const skillPath = path.join(userSkillsDir, skillId, 'SKILL.md');
    await fs.mkdir(path.dirname(skillPath), { recursive: true } as any);
    await fs.writeFile(skillPath, content, 'utf-8' as any);

    log.log(`[skills:save] Saved skill: ${skillId}`);

    // ✨ 重新加载技能列表
    if (agent) {
      await agent.getSkillManager().loadSkills();
    }

    return { success: true };
  } catch (error) {
    log.error('[skills:save] Error:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('skills:delete', async (_event, skillId: string) => {
  try {
    const userSkillsDir = path.join(os.homedir(), '.aiagent', 'skills');
    const skillPath = path.join(userSkillsDir, skillId);

    await fs.rm(skillPath, { recursive: true, force: true } as any);
    log.log(`[skills:delete] Deleted skill: ${skillId}`);

    // Reload skills
    if (agent) {
      await agent.getSkillManager().loadSkills();
    }

    return { success: true };
  } catch (error) {
    log.error('[skills:delete] Error:', error);
    return { success: false, error: (error as Error).message };
  }
});

// ✨ 新增：技能导入/导出相关处理器
ipcMain.handle('skills:import-file', async (_event, filePath: string) => {
  try {
    if (!agent) {
      return { success: false, error: 'Agent 未初始化' };
    }

    const result = await agent.getSkillManager().importSkillFromFile(filePath);
    log.log(`[skills:import-file] Imported from: ${filePath}`);
    return result;
  } catch (error) {
    log.error('[skills:import-file] Error:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('skills:import-url', async (_event, url: string) => {
  try {
    if (!agent) {
      return { success: false, error: 'Agent 未初始化' };
    }

    const result = await agent.getSkillManager().importSkillFromURL(url);
    log.log(`[skills:import-url] Imported from URL: ${url}`);
    return result;
  } catch (error) {
    log.error('[skills:import-url] Error:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('skills:import-github', async (_event, repoUrl: string) => {
  try {
    if (!agent) {
      return { success: false, error: 'Agent 未初始化' };
    }

    const result = await agent.getSkillManager().importSkillFromGitHub(repoUrl);
    log.log(`[skills:import-github] Imported from GitHub: ${repoUrl}`);
    return result;
  } catch (error) {
    log.error('[skills:import-github] Error:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('skills:export', async (_event, skillId: string, outputPath: string) => {
  try {
    if (!agent) {
      return { success: false, error: 'Agent 未初始化' };
    }

    const result = await agent.getSkillManager().exportSkill(skillId, outputPath);
    log.log(`[skills:export] Exported skill: ${skillId} to ${outputPath}`);
    return result;
  } catch (error) {
    log.error('[skills:export] Error:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('skills:validate', async (_event, content: string) => {
  try {
    if (!agent) {
      return { valid: false, errors: ['Agent 未初始化'], warnings: [] };
    }

    const result = agent.getSkillManager().validateSkill(content);
    return result;
  } catch (error) {
    log.error('[skills:validate] Error:', error);
    return {
      valid: false,
      errors: [(error as Error).message],
      warnings: []
    };
  }
});

// Notification handlers
ipcMain.handle('notification:send', (_, options) => {
  return notificationService.sendNotification(options);
});

ipcMain.handle('notification:send-work-complete', (_, taskType, result) => {
  return notificationService.sendWorkCompleteNotification(taskType, result);
});

ipcMain.handle('notification:send-error', (_, error) => {
  return notificationService.sendErrorNotification(error);
});

ipcMain.handle('notification:send-info', (_, title, message) => {
  return notificationService.sendInfoNotification(title, message);
});

ipcMain.handle('notification:set-enabled', (_, enabled) => {
  notificationService.setEnabled(enabled);
  return { success: true };
});

ipcMain.handle('notification:get-enabled', () => {
  return { enabled: notificationService.isEnabled() };
});

ipcMain.handle('notification:has-permission', () => {
  return { hasPermission: notificationService.hasPermission() };
});

// ========== 命令系统 IPC Handlers ==========

// 获取所有命令列表
ipcMain.handle('commands:list', async () => {
  if (!agent) return [];
  const allCommands = agent.commandRegistry.getAll();

  // 移除不可序列化的属性（如 execute 函数）
  return allCommands.map(cmd => ({
    id: cmd.id,
    type: cmd.type,
    name: cmd.name,
    description: cmd.description,
    keywords: cmd.keywords,
    category: cmd.category,
    icon: cmd.icon,
    shortcut: cmd.shortcut,
    params: cmd.params,
    requiresInput: cmd.requiresInput,
    serverName: cmd.serverName
  }));
});

// 搜索命令
ipcMain.handle('commands:search', async (_, options: {
  query?: string;
  category?: string;
  type?: string;
  limit?: number
}) => {
  if (!agent) {
    log.warn('[commands:search] Agent not initialized');
    return [];
  }

  // 防御性检查：等待命令系统初始化完成
  if (agent.commandRegistry.getAll().length === 0) {
    log.warn('[commands:search] Command registry is empty, waiting for initialization...');
    // 短暂等待后重试（最多 3 秒）
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      if (agent.commandRegistry.getAll().length > 0) {
        log.log(`[commands:search] Commands loaded after ${i * 100}ms, total: ${agent.commandRegistry.getAll().length} commands`);
        break;
      }
    }
    // 最终检查
    if (agent.commandRegistry.getAll().length === 0) {
      log.error('[commands:search] Command registry still empty after waiting, returning empty results');
      return [];
    }
  }

  const searchOptions: {
    query?: string;
    category?: string;
    type?: string;
    limit?: number
  } = {
    query: options.query,
    category: options.category as any,
    type: options.type as any,
    limit: options.limit
  };

  const results = agent.commandRegistry.search(searchOptions as any);
  log.log(`[commands:search] Found ${results.length} commands for query: "${options.query || 'all'}"`);

  // 移除不可序列化的属性（如 execute 函数）
  return results.map(cmd => ({
    id: cmd.id,
    type: cmd.type,
    name: cmd.name,
    description: cmd.description,
    keywords: cmd.keywords,
    category: cmd.category,
    icon: cmd.icon,
    shortcut: cmd.shortcut,
    params: cmd.params,
    requiresInput: cmd.requiresInput,
    serverName: cmd.serverName
  }));
});

// 执行命令
ipcMain.handle('commands:execute', async (_, commandId: string, params?: Record<string, unknown>) => {
  if (!agent) return { success: false, error: 'Agent not initialized' };

  const command = agent.commandRegistry.get(commandId);
  if (!command) {
    return { success: false, error: `Command not found: ${commandId}` };
  }

  try {
    await command.execute(params);
    return { success: true };
  } catch (error) {
    log.error(`[Commands] Error executing command ${commandId}:`, error);
    return { success: false, error: (error as Error).message };
  }
});

// 设置快捷键
ipcMain.handle('commands:set-shortcut', async (_, commandId: string, accelerator: string) => {
  if (!agent) return { success: false, error: 'Agent not initialized' };

  const command = agent.commandRegistry.get(commandId);
  if (!command) {
    return { success: false, error: `Command not found: ${commandId}` };
  }

  try {
    const success = agent.shortcutManager.register({
      id: commandId,
      accelerator: accelerator,
      action: () => {
        log.log(`[ShortcutManager] Executing command via shortcut: ${commandId}`);
        command.execute();
      },
      description: command.description
    });

    if (success) {
      // 更新命令定义中的快捷键
      command.shortcut = accelerator;
      return { success: true };
    } else {
      return { success: false, error: 'Shortcut registration failed (possibly conflict)' };
    }
  } catch (error) {
    log.error(`[Commands] Error setting shortcut for ${commandId}:`, error);
    return { success: false, error: (error as Error).message };
  }
});

// 获取所有快捷键
ipcMain.handle('commands:get-shortcuts', async () => {
  if (!agent) return [];
  return agent.shortcutManager.getAllBindings();
});

// Slash command 建议
ipcMain.handle('commands:suggest', async (_, partialInput: string) => {
  if (!agent) return [];
  return agent.slashParser.getSuggestions(partialInput);
});

// 检查快捷键冲突
ipcMain.handle('commands:check-conflict', async (_, accelerator: string, excludeId?: string) => {
  if (!agent) return null;
  return agent.shortcutManager.checkConflict(accelerator, excludeId);
});

// ========== MCP 配置管理 ==========

/**
 * 更新 MCP filesystem 服务器的路径
 * @param newPath 新的文件系统路径
 */
async function updateMCPFilesystemPath(newPath: string) {
  const mcpConfigPath = path.join(os.homedir(), '.aiagent', 'mcp.json');

  try {
    const content = await fs.promises.readFile(mcpConfigPath, 'utf-8');
    const config = JSON.parse(content);

    if (config.mcpServers?.filesystem?.args) {
      const args = config.mcpServers.filesystem.args;
      const pathIndex = args.findIndex((arg: string) =>
        arg.startsWith('/') || arg.startsWith('C:') || arg === 'ALLOWED_PATH'
      );

      if (pathIndex !== -1) {
        args[pathIndex] = newPath;
        await fs.promises.writeFile(mcpConfigPath, JSON.stringify(config, null, 2), 'utf-8');
        log.log('[Main] ✅ MCP filesystem path updated to:', newPath);

        // 重新加载 MCP 客户端以应用新配置
        if (agent) {
          const mcpService = agent.getMCPService();
          await mcpService.loadClients();
          log.log('[Main] ✅ MCP clients reloaded');
        }
      }
    }
  } catch (error) {
    log.error('[Main] Failed to update MCP config:', error);
  }
}

// MCP 状态查询 IPC 处理器
ipcMain.handle('mcp:get-status', async () => {
  if (!agent) {
    return [];
  }

  try {
    const status = agent.getMCPService().getConnectionStatus();
    return status;
  } catch (error) {
    log.error('[mcp:get-status] Failed to get MCP status:', error);
    return [];
  }
});

// MCP 手动重试 IPC 处理器
ipcMain.handle('mcp:reconnect', async (_event, name: string) => {
  if (!agent) {
    return false;
  }

  try {
    const success = await agent.getMCPService().reconnectServer(name);
    return success;
  } catch (error) {
    log.error('[mcp:reconnect] Failed to reconnect MCP server:', error);
    return false;
  }
});

// MCP 重新加载所有服务器 IPC 处理器
ipcMain.handle('mcp:reload-all', async () => {
  if (!agent) {
    return { success: false, error: 'Agent not initialized' };
  }

  try {
    await agent.getMCPService().reloadAllServers();
    return { success: true };
  } catch (error) {
    log.error('[mcp:reload-all] Failed to reload all MCP servers:', error);
    return { success: false, error: String(error) };
  }
});

// MCP 自定义服务器管理 IPC 处理器
ipcMain.handle('mcp:add-custom-server', async (_event, name: string, config: any) => {
  if (!agent) {
    return { success: false, error: 'Agent not initialized' };
  }

  try {
    const success = await agent.getMCPService().addCustomServer(name, config);
    return { success };
  } catch (error) {
    log.error('[mcp:add-custom-server] Failed to add custom server:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('mcp:update-custom-server', async (_event, name: string, config: any) => {
  if (!agent) {
    return { success: false, error: 'Agent not initialized' };
  }

  try {
    const success = await agent.getMCPService().updateCustomServer(name, config);
    return { success };
  } catch (error) {
    log.error('[mcp:update-custom-server] Failed to update custom server:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('mcp:remove-custom-server', async (_event, name: string) => {
  if (!agent) {
    return { success: false, error: 'Agent not initialized' };
  }

  try {
    const success = await agent.getMCPService().removeCustomServer(name);
    return { success };
  } catch (error) {
    log.error('[mcp:remove-custom-server] Failed to remove custom server:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('mcp:get-custom-servers', async () => {
  if (!agent) {
    return {};
  }

  try {
    const servers = agent.getMCPService().getCustomServers();
    return servers;
  } catch (error) {
    log.error('[mcp:get-custom-servers] Failed to get custom servers:', error);
    return {};
  }
});

ipcMain.handle('mcp:test-connection', async (_event, name: string, config: any) => {
  if (!agent) {
    return { success: false, error: 'Agent not initialized' };
  }

  try {
    const result = await agent.getMCPService().testConnection(name, config);
    return result;
  } catch (error) {
    log.error('[mcp:test-connection] Failed to test connection:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('mcp:validate-config', async (_event, config: any) => {
  if (!agent) {
    return { valid: false, errors: ['Agent not initialized'], warnings: [] };
  }

  try {
    const result = agent.getMCPService().validateConfig(config);
    return result;
  } catch (error) {
    log.error('[mcp:validate-config] Failed to validate config:', error);
    return { valid: false, errors: [(error as Error).message], warnings: [] };
  }
});


async function initializeAgent(): Promise<{ success: boolean; error?: string }> {
  const startTime = Date.now()
  log.log('[initializeAgent] =======================================')
  log.log('[initializeAgent] Starting Agent initialization...')

  try {
    const apiKey = await configStore.getApiKey() || process.env.ANTHROPIC_API_KEY
    const model = configStore.getModel()
    const apiUrl = configStore.getApiUrl()

    if (!apiKey || !mainWin) {
      log.warn('[initializeAgent] Missing required config, skipping initialization')
      return { success: false, error: 'Missing API Key or main window' }
    }

    // ✅ 步骤 1: 备份旧 Agent 和配置
    if (agent) {
      previousAgent = agent
      previousConfig = { apiKey, model, apiUrl }
      log.log('[initializeAgent] Backed up previous Agent instance')
    }

    // ✅ 步骤 2: 注入环境变量
    const doubaoApiKey = await configStore.getDoubaoApiKey()
    if (doubaoApiKey) {
      process.env.DOUBAO_API_KEY = doubaoApiKey
      log.log('[initializeAgent] ✅ DOUBAO_API_KEY injected (length: ' + doubaoApiKey.length + ')')
    } else {
      log.log('[initializeAgent] ⚠️ No DOUBAO_API_KEY found')
    }

    const zhipuApiKey = await configStore.getZhipuApiKey()
    if (zhipuApiKey) {
      process.env.ZHIPU_API_KEY = zhipuApiKey
      log.log('[initializeAgent] ✅ ZHIPU_API_KEY injected (length: ' + zhipuApiKey.length + ')')
    } else {
      log.log('[initializeAgent] ⚠️ No ZHIPU_API_KEY found')
    }

    // ✅ 步骤 3: 创建新 Agent 实例
    log.log('[initializeAgent] Creating new AgentRuntime instance...')
    agent = new AgentRuntime(apiKey, mainWin, model, apiUrl)

    if (floatingBallWin) {
      agent.addWindow(floatingBallWin)
    }
    (global as Record<string, unknown>).agent = agent

    // ✅ 步骤 4: 加载历史消息
    const currentSessionId = sessionStore.getCurrentSessionId()
    if (currentSessionId) {
      const session = sessionStore.getSession(currentSessionId)
      if (session && session.messages.length > 0) {
        log.log(`[initializeAgent] Auto-loading session: ${session.title}`)
        agent.loadHistory(session.messages)
      } else {
        log.log('[initializeAgent] Current session is empty, starting fresh')
      }
    } else {
      log.log('[initializeAgent] No current session found, starting fresh')
    }

    // ✅ 步骤 5: 初始化命令系统（带超时保护）
    log.log('[initializeAgent] Initializing Agent...')
    const initPromise = agent.initialize()
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Agent initialization timeout (30s)')), 30000)
    )

    await Promise.race([initPromise, timeoutPromise])
    log.log('[initializeAgent] ✓ Agent initialized successfully')

    // ✅ 步骤 6: 清理旧实例
    previousAgent = null
    previousConfig = null

    const elapsed = Date.now() - startTime
    log.log(`[initializeAgent] ✓ Completed in ${elapsed}ms`)
    log.log('[initializeAgent] Model:', model)
    log.log('[initializeAgent] API URL:', apiUrl)
    log.log('[initializeAgent] =======================================')

    // 通知所有窗口 Agent 已就绪
    BrowserWindow.getAllWindows().forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send('agent:ready')
      }
    })

    return { success: true }

  } catch (error) {
    const elapsed = Date.now() - startTime
    const errorMsg = (error as Error).message
    const errorStack = (error as Error).stack

    log.error(`[initializeAgent] ✗ Failed after ${elapsed}ms:`, errorMsg)
    log.error('[initializeAgent] Stack:', errorStack)

    // ✅ 回滚到旧 Agent 实例
    if (previousAgent && previousConfig) {
      log.log('[initializeAgent] Rolling back to previous Agent instance...')
      // @ts-ignore - previousAgent is callable
      agent = previousAgent
      (global as Record<string, unknown>).agent = agent

      // 恢复配置
      if (previousConfig.apiKey) await configStore.setApiKey(previousConfig.apiKey)
      if (previousConfig.model) configStore.setModel(previousConfig.model)
      if (previousConfig.apiUrl) configStore.setApiUrl(previousConfig.apiUrl)

      log.log('[initializeAgent] ✓ Rollback completed')

      // 通知用户
      BrowserWindow.getAllWindows().forEach(win => {
        if (!win.isDestroyed()) {
          win.webContents.send('agent:restart-failed', {
            error: 'Agent 初始化失败，已恢复到之前的配置',
            rolledBack: true
          })
        }
      })

      return { success: false, error: errorMsg }
    }

    // 没有旧实例可回退，Agent 处于不可用状态
    log.error('[initializeAgent] No previous Agent to rollback to, Agent is unavailable')

    BrowserWindow.getAllWindows().forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send('agent:restart-failed', {
          error: 'Agent 初始化失败，请重新配置',
          rolledBack: false
        })
      }
    })

    return { success: false, error: errorMsg }
  }
}

function createTray() {
  try {
    tray = new Tray(path.join(process.env.VITE_PUBLIC || '', 'icon.png'))
  } catch (e) {
    const blankIcon = nativeImage.createEmpty()
    tray = new Tray(blankIcon)
  }

  tray.setToolTip('公众号助手')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        mainWin?.show()
        mainWin?.focus()
      }
    },
    {
      label: '显示悬浮球',
      click: () => {
        floatingBallWin?.isVisible() ? floatingBallWin?.hide() : floatingBallWin?.show()
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (mainWin) {
      if (mainWin.isVisible()) {
        mainWin.hide()
      } else {
        mainWin.show()
        mainWin.focus()
      }
    }
  })
}

function createMainWindow() {
  const preloadPath = path.join(__dirname, 'preload.cjs')
  log.log('[Main Window] __dirname:', __dirname)
  log.log('[Main Window] preload path:', preloadPath)

  mainWin = new BrowserWindow({
    width: 900,
    height: 750,
    minWidth: 800,
    minHeight: 650,
    frame: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: preloadPath,
      // 🔒 安全配置
      contextIsolation: true,          // 启用上下文隔离（防止渲染进程访问 Node.js）
      nodeIntegration: false,           // 禁用 Node.js 集成
      sandbox: false,                   // ⚠️ 暂时禁用沙箱（待后续调试启用）
      webSecurity: true,                // 启用 Web 安全策略
      allowRunningInsecureContent: false, // 禁止 HTTPS 页面加载 HTTP 资源
    },
    show: false,
  })

  // Remove menu bar
  mainWin.setMenu(null)

  mainWin.once('ready-to-show', () => {
    log.log('Main window ready.')
  })

  mainWin.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWin?.hide()
    }
  })

  // 🔍 调试：检查 preload 是否加载
  mainWin?.webContents.on('did-finish-load', () => {
    log.log('[Main Window] Finished loading')
    mainWin?.webContents.executeJavaScript('typeof window.ipcRenderer')
      .then(result => {
        log.log('[Main Window] window.ipcRenderer type:', result)
        // 发送主进程消息
        mainWin?.webContents.send('main-process-message', (new Date).toLocaleString())
      })
      .catch(err => {
        log.error('[Main Window] Error checking ipcRenderer:', err)
      })
  })

  // 🐛 开发模式下自动打开 DevTools
  if (VITE_DEV_SERVER_URL) {
    mainWin.webContents.openDevTools()
  }

  if (VITE_DEV_SERVER_URL) {
    mainWin.loadURL(VITE_DEV_SERVER_URL)
  } else {
    mainWin.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

function createFloatingBallWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

  floatingBallWin = new BrowserWindow({
    width: BALL_SIZE,
    height: BALL_SIZE,
    x: screenWidth - BALL_SIZE - 20,
    y: screenHeight - BALL_SIZE - 100,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      // 🔒 安全配置
      contextIsolation: true,          // 启用上下文隔离
      nodeIntegration: false,           // 禁用 Node.js 集成
      sandbox: false,                   // ⚠️ 暂时禁用沙箱（待后续调试启用）
      webSecurity: true,                // 启用 Web 安全策略
      allowRunningInsecureContent: false, // 禁止混合内容
    },
    icon: path.join(process.env.VITE_PUBLIC, 'icon.png'),
  })

  if (VITE_DEV_SERVER_URL) {
    floatingBallWin.loadURL(`${VITE_DEV_SERVER_URL}#/floating-ball`)
  } else {
    floatingBallWin.loadFile(path.join(RENDERER_DIST, 'index.html'), { hash: 'floating-ball' })
  }

  floatingBallWin.on('closed', () => {
    if (agent && floatingBallWin) {
      agent.removeWindow(floatingBallWin)
    }
    floatingBallWin = null
  })

  // Add to agent after creation
  floatingBallWin.webContents.on('did-finish-load', () => {
    if (agent && floatingBallWin) {
      agent.addWindow(floatingBallWin)
    }
  })
}

function toggleFloatingBallExpanded() {
  log.log('[FloatingBall] toggleFloatingBallExpanded called, isBallExpanded:', isBallExpanded)
  if (!floatingBallWin) {
    log.error('[FloatingBall] floatingBallWin is null!')
    return
  }

  const [currentX, currentY] = floatingBallWin.getPosition()
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize
  log.log('[FloatingBall] Current position:', currentX, currentY)
  log.log('[FloatingBall] Screen size:', screenWidth, screenHeight)

  if (isBallExpanded) {
    // Collapse - Calculate where ball should go based on current expanded window position
    // Ball's right edge should align with expanded panel's right edge
    // Ball position = (expanded right edge - BALL_SIZE), same Y
    const ballX = currentX + EXPANDED_WIDTH - BALL_SIZE
    const ballY = currentY

    // Clamp to screen bounds
    const finalX = Math.max(0, Math.min(ballX, screenWidth - BALL_SIZE))
    const finalY = Math.max(0, Math.min(ballY, screenHeight - BALL_SIZE))

    log.log('[FloatingBall] Collapsing to:', BALL_SIZE, 'x', BALL_SIZE, 'at', finalX, finalY)
    floatingBallWin.setSize(BALL_SIZE, BALL_SIZE)
    floatingBallWin.setPosition(finalX, finalY)
    isBallExpanded = false
  } else {
    // Expand
    // Horizontal-only expansion: Keep Y same, expand LEFT from ball

    // Keep Y the same - no vertical movement
    // Only move X to the left so ball's right edge stays at same position
    // Ball's right edge = currentX + BALL_SIZE
    // Panel's right edge = newX + EXPANDED_WIDTH = currentX + BALL_SIZE
    // So: newX = currentX + BALL_SIZE - EXPANDED_WIDTH

    let newX = currentX + BALL_SIZE - EXPANDED_WIDTH
    let newY = currentY  // Keep Y the same - NO upward movement

    // Ensure not going negative
    newX = Math.max(0, newX)
    newY = Math.max(0, newY)

    log.log('[FloatingBall] Expanding to:', EXPANDED_WIDTH, 'x', EXPANDED_HEIGHT, 'at', newX, newY)
    floatingBallWin.setSize(EXPANDED_WIDTH, EXPANDED_HEIGHT)
    floatingBallWin.setPosition(newX, newY)
    isBallExpanded = true
  }

  log.log('[FloatingBall] Sending state-changed event:', isBallExpanded)
  floatingBallWin.webContents.send('floating-ball:state-changed', isBallExpanded)
}

// Ensure the ball stays on top
setInterval(() => {
  if (floatingBallWin && !floatingBallWin.isDestroyed()) {
    floatingBallWin.setAlwaysOnTop(true, 'screen-saver')
  }
})

/**
 * 分析文章风格（调用AI）
 */
async function analyzeArticles(articles: string[]): Promise<any> {
  // TODO: 集成 AI API 进行风格分析
  // 目前返回模拟数据
  log.log('[analyzeArticles] Analyzing', articles.length, 'articles (AI integration pending)')

  // 这里应该调用 AI API (如 Anthropic API) 进行风格分析
  // 示例伪代码：
  // const response = await anthropic.messages.create({
  //   model: 'claude-sonnet-4-20250514',
  //   max_tokens: 4096,
  //   messages: [{
  //     role: 'user',
  //     content: generateStyleAnalysisPrompt(articles)
  //   }]
  // })
  // return response.content

  // 返回模拟数据
  return {
    success: true,
    result: {
      openingHabits: {
        patterns: ['先讲故事', '先抛问题'],
        distribution: { '先讲故事': 0.6, '先抛问题': 0.4 },
        examples: articles.slice(0, 3).map((_, i) => `示例${i + 1}...`)
      },
      wordChoice: {
        technicalLevel: 4,
        colloquialLevel: 7,
        humorLevel: 5,
        frequentWords: {
          colloquial: ['说实话', 'emm', '这事儿'],
          emotional: ['震撼', '焦虑', '真香'],
          technical: ['API', '前端']
        }
      },
      structureHabits: {
        mainPattern: '递进式',
        distribution: { '递进式': 0.5, '总分总': 0.3, '其他': 0.2 },
        paragraphLength: { '短': 0.6, '中': 0.3, '长': 0.1 },
        sentenceLength: { '短': 0.7, '中': 0.25, '长': 0.05 },
        useSubheadings: true
      },
      emotionalExpression: {
        dominantTone: '反思 + 激励',
        wordDensity: 8,
        changePattern: '困惑 → 拒绝 → 接受 → 喜欢'
      }
    }
  }
}
