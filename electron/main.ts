import { app, BrowserWindow, shell, ipcMain, screen, dialog, globalShortcut, Tray, Menu, nativeImage } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'
import dotenv from 'dotenv'
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
  const envPath = path.join(process.env.APP_ROOT || '', '.env')
  
  try {
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, 'utf8')
      const regex = new RegExp(`${key}=.*`, 'g')
      
      if (regex.test(content)) {
        // Replace existing value
        content = content.replace(regex, `${key}=${value}`)
        console.log(`[updateEnvFile] Updated ${key} in .env file`)
      } else {
        // Add new value
        content += `\n${key}=${value}`
        console.log(`[updateEnvFile] Added ${key} to .env file`)
      }
      
      fs.writeFileSync(envPath, content)
      console.log(`[updateEnvFile] Saved ${key} to .env file`)
    } else {
      console.log(`[updateEnvFile] .env file not found at ${envPath}`)
    }
  } catch (error) {
    console.error(`[updateEnvFile] Failed to update .env file:`, error)
  }
}

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

// [Fix] Set specific userData path for dev mode to avoid permission/locking issues
if (VITE_DEV_SERVER_URL) {
  const devUserData = path.join(process.env.APP_ROOT, '.vscode', 'electron-userdata');
  if (!fs.existsSync(devUserData)) {
    fs.mkdirSync(devUserData, { recursive: true });
  }
  app.setPath('userData', devUserData);
}

// Internal MCP Server Runner
// MiniMax startup removed
// --- Normal App Initialization ---

let mainWin: BrowserWindow | null = null
let floatingBallWin: BrowserWindow | null = null
let tray: Tray | null = null
let agent: AgentRuntime | null = null
let updateManager: UpdateManager | null = null

// Ball state
let isBallExpanded = false
const BALL_SIZE = 64
const EXPANDED_WIDTH = 340    // Match w-80 (320px) + padding
const EXPANDED_HEIGHT = 480   // 增加高度以显示完整的对话界面

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
  // Set App User Model ID for Windows notifications
  app.setAppUserModelId('com.wechatflowwork.app')

  // Register Protocol Client
  if (app.isPackaged) {
    app.setAsDefaultProtocolClient('wechatflowwork')
  } else {
    console.log('Skipping protocol registration in Dev mode.')
  }

  // 🔒 0. 初始化审计日志系统
  console.log('[Main] Initializing audit logger...')
  setupAuditHooks()

  // 设置定期清理任务（每天凌晨 2 点清理过期日志）
  setInterval(async () => {
    const now = new Date()
    if (now.getHours() === 2 && now.getMinutes() === 0) {
      console.log('[Main] Running scheduled log cleanup...')
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

  console.log('[Main] ✓ Audit logger ready')

  // 0. Initialize Python runtime FIRST
  console.log('[Main] Initializing Python runtime...')
  const pythonReady = await pythonRuntime.initialize();

  if (!pythonReady) {
    console.warn('[Main] ⚠ Python runtime not available, AI skills will not work');
    if (!app.isPackaged) {
      console.error('[Main] Please run "npm run setup-python" first to use AI skills!');
    }
  } else {
    console.log('[Main] ✓ Python runtime ready');
  }

  // 1. Setup IPC handlers FIRST
  // 1. Setup IPC handlers FIRST
  // setupIPCHandlers() - handlers are defined at top level now

  // 2. Create windows
  createMainWindow()
  createFloatingBallWindow()

  // 🔒 2.5. 初始化更新管理器（仅生产环境）
  if (process.env.NODE_ENV === 'production' && mainWin) {
    console.log('[Main] Initializing update manager...')
    updateManager = new UpdateManager(mainWin)
    updateManager.scheduleAutoCheck()
    console.log('[Main] ✓ Update manager ready')
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

  // Show main window in dev mode
  if (VITE_DEV_SERVER_URL) {
    mainWin?.show()
  }

  console.log('WeChat_Flowwork started. Press Alt+Space to toggle floating ball.')
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

ipcMain.handle('agent:confirm-response', (_, { id, approved, remember, tool, path }: { id: string, approved: boolean, remember?: boolean, tool?: string, path?: string }) => {
  if (approved && remember && tool) {
    configStore.addPermission(tool, path)
    console.log(`[Permission] Saved: ${tool} for path: ${path || '*'}`)
  }
  agent?.handleConfirmResponse(id, approved)
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

// Permission Management
ipcMain.handle('permissions:list', () => {
  return configStore.getAllowedPermissions()
})

ipcMain.handle('permissions:revoke', (_, { tool, pathPattern }: { tool: string, pathPattern?: string }) => {
  configStore.removePermission(tool, pathPattern)
  return { success: true }
})

ipcMain.handle('permissions:clear', () => {
  configStore.clearAllPermissions()
  return { success: true }
})

// File system operations for drag and drop
ipcMain.handle('fs:save-temp-file', async (_event, { name, data }: { name: string, data: number[] }) => {
  try {
    // Create temp directory
    const tmpDir = path.join(os.tmpdir(), 'wechat-flowwork')
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true })
    }

    // Save file
    const filePath = path.join(tmpDir, name)
    fs.writeFileSync(filePath, Buffer.from(data))

    console.log(`[fs:save-temp-file] Saved temp file: ${filePath}`)
    return { success: true, path: filePath }
  } catch (error) {
    console.error('[fs:save-temp-file] Failed to save temp file:', error)
    return { success: false, error: (error as Error).message }
  }
})

// File system operations for file preview
ipcMain.handle('fs:read-file', async (_event, filePath: string) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    console.log(`[fs:read-file] Read file: ${filePath}`)
    return content
  } catch (error) {
    console.error('[fs:read-file] Failed to read file:', error)
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
  console.log('[config:get-all] Returning config:', { ...config, apiKey: config.apiKey ? '***' + config.apiKey.slice(-4) : 'empty' })
  return config
})

// 🔒 安全配置获取（不包含 API Key 等敏感信息）
ipcMain.handle('config:get-safe', () => {
  const config = configStore.getAll()
  console.log('[config:get-safe] Current authorizedFolders from store:', {
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
  console.log('[config:get-safe] Returning safeConfig with authorizedFolders:', {
    count: safeConfig.authorizedFolders?.length || 0,
    folders: safeConfig.authorizedFolders
  })
  return safeConfig
})

ipcMain.handle('config:set-all', async (_, cfg) => {
  console.log('[config:set-all] Received config:', {
    apiKey: cfg.apiKey ? '***' + cfg.apiKey.slice(-4) : 'empty',
    apiUrl: cfg.apiUrl,
    model: cfg.model,
    hasApiKey: !!cfg.apiKey
  })

  // 分别处理每个配置项，避免一个失败影响全部
  const saveErrors: Array<{field: string, error: string}> = []

  // API Key
  try {
    if (cfg.apiKey !== undefined) {
      await configStore.setApiKey(cfg.apiKey)
      console.log('[config:set-all] Saved apiKey, length:', cfg.apiKey.length)
    }
  } catch (error) {
    const errorMsg = (error as Error).message
    saveErrors.push({field: 'apiKey', error: errorMsg})
    console.error('[config:set-all] Failed to save apiKey:', errorMsg)
  }

  // Doubao API Key
  try {
    if (cfg.doubaoApiKey !== undefined) {
      await configStore.setDoubaoApiKey(cfg.doubaoApiKey)
      // Update .env file
      updateEnvFile('DOUBAO_API_KEY', cfg.doubaoApiKey)
    }
  } catch (error) {
    const errorMsg = (error as Error).message
    saveErrors.push({field: 'doubaoApiKey', error: errorMsg})
    console.error('[config:set-all] Failed to save doubaoApiKey:', errorMsg)
  }

  // Zhipu API Key
  try {
    if (cfg.zhipuApiKey !== undefined) {
      await configStore.setZhipuApiKey(cfg.zhipuApiKey)
    }
  } catch (error) {
    const errorMsg = (error as Error).message
    saveErrors.push({field: 'zhipuApiKey', error: errorMsg})
    console.error('[config:set-all] Failed to save zhipuApiKey:', errorMsg)
  }

  // API URL
  try {
    if (cfg.apiUrl !== undefined) {
      configStore.setApiUrl(cfg.apiUrl)
      console.log('[config:set-all] Saved apiUrl:', cfg.apiUrl)
    }
  } catch (error) {
    const errorMsg = (error as Error).message
    saveErrors.push({field: 'apiUrl', error: errorMsg})
    console.error('[config:set-all] Failed to save apiUrl:', errorMsg)
  }

  // Model
  try {
    if (cfg.model !== undefined) {
      configStore.setModel(cfg.model)
      console.log('[config:set-all] Saved model:', cfg.model)
    }
  } catch (error) {
    const errorMsg = (error as Error).message
    saveErrors.push({field: 'model', error: errorMsg})
    console.error('[config:set-all] Failed to save model:', errorMsg)
  }

  // authorizedFolders（关键修复）
  try {
    console.log('[config:set-all] Saving authorizedFolders:', {
      count: cfg.authorizedFolders?.length || 0,
      folders: cfg.authorizedFolders
    })

    configStore.set('authorizedFolders', cfg.authorizedFolders || [])
    console.log('[config:set-all] authorizedFolders saved successfully')

    // 验证保存
    const savedFolders = configStore.get('authorizedFolders')
    console.log('[config:set-all] Verification - saved folders:', {
      count: savedFolders?.length || 0,
      folders: savedFolders
    })
  } catch (error) {
    const errorMsg = (error as Error).message
    saveErrors.push({field: 'authorizedFolders', error: errorMsg})
    console.error('[config:set-all] Failed to save authorizedFolders:', errorMsg)
  }

  // Network Access
  try {
    configStore.setNetworkAccess(cfg.networkAccess || false)
  } catch (error) {
    const errorMsg = (error as Error).message
    saveErrors.push({field: 'networkAccess', error: errorMsg})
    console.error('[config:set-all] Failed to save networkAccess:', errorMsg)
  }

  // Shortcut
  try {
    if (cfg.shortcut !== undefined) {
      configStore.set('shortcut', cfg.shortcut)
    }
  } catch (error) {
    const errorMsg = (error as Error).message
    saveErrors.push({field: 'shortcut', error: errorMsg})
    console.error('[config:set-all] Failed to save shortcut:', errorMsg)
  }

  // Notifications
  try {
    if (cfg.notifications !== undefined) {
      configStore.set('notifications', cfg.notifications)
    }
  } catch (error) {
    const errorMsg = (error as Error).message
    saveErrors.push({field: 'notifications', error: errorMsg})
    console.error('[config:set-all] Failed to save notifications:', errorMsg)
  }

  // Notification Types
  try {
    if (cfg.notificationTypes !== undefined) {
      configStore.set('notificationTypes', cfg.notificationTypes)
    }
  } catch (error) {
    const errorMsg = (error as Error).message
    saveErrors.push({field: 'notificationTypes', error: errorMsg})
    console.error('[config:set-all] Failed to save notificationTypes:', errorMsg)
  }

  // 汇总保存错误
  if (saveErrors.length > 0) {
    console.error('[config:set-all] Some fields failed to save:', saveErrors)
  }

  // Verify save
  const savedConfig = configStore.getAll()
  console.log('[config:set-all] Verification after save:', {
    apiKey: savedConfig.apiKey ? '***' + savedConfig.apiKey.slice(-4) : 'empty',
    apiUrl: savedConfig.apiUrl,
    model: savedConfig.model,
    authorizedFoldersCount: savedConfig.authorizedFolders?.length || 0
  })

  // Reinitialize agent
  await initializeAgent()

  // 广播配置更新事件到所有窗口
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('config:updated')
  })
  console.log('[config:set-all] Broadcasted config:updated event to all windows')

  return {
    success: saveErrors.length === 0,
    errors: saveErrors
  }
})

// ========== 个人风格配置 IPC 通道 ==========

// 获取用户的风格配置
ipcMain.handle('config:get-style-config', () => {
  try {
    const config = configStore.getUserStyleConfig()
    console.log('[config:get-style-config] Returning style config:', {
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
    console.error('[config:get-style-config] Error:', error)
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

    console.log('[config:save-article] Article saved:', articlePath)
    return { success: true, path: articlePath }
  } catch (error) {
    const errorMsg = (error as Error).message
    console.error('[config:save-article] Failed to save article:', errorMsg)
    return { success: false, error: errorMsg }
  }
})

// 分析用户文章风格
ipcMain.handle('config:analyze-style', async (_event, { articlePaths }: { articlePaths: string[] }) => {
  try {
    console.log('[config:analyze-style] Analyzing', articlePaths.length, 'articles')

    // 读取所有文章内容
    const fs = await import('fs')
    const articlesContent: string[] = []

    for (const articlePath of articlePaths) {
      try {
        const content = await fs.promises.readFile(articlePath, 'utf-8')
        articlesContent.push(content)
      } catch (error) {
        console.error(`[config:analyze-style] Failed to read article: ${articlePath}`, error)
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

    console.log('[config:analyze-style] Calling style_learner.py at:', scriptPath)

    const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      const python = spawn('python', [scriptPath], {
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8'
        }
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
      console.error('[config:analyze-style] Failed to parse Python output:', result.stdout)
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

    console.log('[config:analyze-style] Analysis complete')
    return {
      success: true,
      result: adaptedResult,
      analysisPath
    }
  } catch (error) {
    const errorMsg = (error as Error).message
    console.error('[config:analyze-style] Failed to analyze:', errorMsg)
    return { success: false, error: errorMsg }
  }
})

// 更新风格指南
ipcMain.handle('config:update-style-guide', async (_event, { styleGuide }: { styleGuide: any }) => {
  try {
    configStore.updateStyleGuide(styleGuide)
    console.log('[config:update-style-guide] Style guide updated')
    return { success: true }
  } catch (error) {
    const errorMsg = (error as Error).message
    console.error('[config:update-style-guide] Failed to update:', errorMsg)
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
        console.warn('[config:reanalyze-style] Failed to read article:', articlePath)
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
    console.error('[config:reanalyze-style] Failed:', errorMsg)
    return { success: false, error: errorMsg }
  }
})

// 清除风格配置
ipcMain.handle('config:clear-style-config', () => {
  try {
    configStore.clearStyleConfig()
    console.log('[config:clear-style-config] Style config cleared')
    return { success: true }
  } catch (error) {
    const errorMsg = (error as Error).message
    console.error('[config:clear-style-config] Failed:', errorMsg)
    return { success: false, error: errorMsg }
  }
})

// 首次启动配置处理
ipcMain.handle('config:get-first-launch', () => {
  // 使用 ConfigStore 方法获取，支持默认值
  const firstLaunch = configStore.getFirstLaunch()
  console.log('[config:get-first-launch] Returning:', firstLaunch)
  return firstLaunch
})

ipcMain.handle('config:set-first-launch', () => {
  console.log('[config:set-first-launch] Setting to false')
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
    console.log('[config:get-setup-status] Fetching setup status...');
    const apiKey = await configStore.getApiKey();
    const folders = configStore.getAuthorizedFolders();
    const status = {
      hasApiKey: !!apiKey,
      hasAuthorizedFolders: folders.length > 0,
      isSetupComplete: !!apiKey && folders.length > 0
    };
    console.log('[config:get-setup-status] Returning:', status);
    return status;
  } catch (error) {
    console.error('[config:get-setup-status] Error:', error);
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
  console.log('[update:check] Manual update check requested')
  await updateManager?.checkForUpdates()
})

ipcMain.handle('update:install', async () => {
  console.log('[update:install] User requested to install update')
  updateManager?.quitAndInstall()
})

// 重置首次启动状态（调试用）
ipcMain.handle('config:reset-first-launch', () => {
  console.log('[config:reset-first-launch] Resetting to true');
  configStore.setFirstLaunch(true);
  return { success: true };
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
  console.log('[dialog:select-folder] Opening folder selection dialog...')
  if (!mainWin) {
    console.error('[dialog:select-folder] ❌ mainWin is null!')
    return null
  }

  try {
    const result = await dialog.showOpenDialog(mainWin, {
      properties: ['openDirectory', 'createDirectory', 'promptToCreate']
    })
    console.log('[dialog:select-folder] Dialog result:', {
      canceled: result.canceled,
      filePaths: result.filePaths
    })

    if (!result.canceled && result.filePaths.length > 0) {
      console.log('[dialog:select-folder] ✅ Selected folder:', result.filePaths[0])
      return result.filePaths[0]
    }
    console.log('[dialog:select-folder] ⚠️ Dialog canceled')
    return null
  } catch (error) {
    console.error('[dialog:select-folder] ❌ Error:', error)
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
  console.log('IPC: window:minimize called');
  try {
    if (mainWin && !mainWin.isDestroyed()) {
      console.log('IPC: window:minimize - mainWin exists and not destroyed');
      mainWin.minimize();
      console.log('IPC: window:minimize completed successfully');
      return { success: true, message: 'Window minimized' };
    } else {
      console.error('IPC: window:minimize failed - mainWin is null or destroyed');
      return { success: false, message: 'Main window not available' };
    }
  } catch (error) {
    console.error('IPC: window:minimize error:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
})
ipcMain.handle('window:maximize', async () => {
  console.log('IPC: window:maximize called');
  try {
    if (mainWin && !mainWin.isDestroyed()) {
      console.log('IPC: window:maximize - mainWin exists and not destroyed');
      if (mainWin.isMaximized()) {
        mainWin.unmaximize();
        console.log('IPC: window:maximize - unmaximized successfully');
        return { success: true, message: 'Window unmaximized', isMaximized: false };
      } else {
        mainWin.maximize();
        console.log('IPC: window:maximize - maximized successfully');
        return { success: true, message: 'Window maximized', isMaximized: true };
      }
    } else {
      console.error('IPC: window:maximize failed - mainWin is null or destroyed');
      return { success: false, message: 'Main window not available' };
    }
  } catch (error) {
    console.error('IPC: window:maximize error:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
})
ipcMain.handle('window:close', async () => {
  console.log('IPC: window:close called');
  try {
    if (mainWin && !mainWin.isDestroyed()) {
      console.log('IPC: window:close - mainWin exists and not destroyed');
      mainWin.hide();
      console.log('IPC: window:close completed successfully');
      return { success: true, message: 'Window hidden' };
    } else {
      console.error('IPC: window:close failed - mainWin is null or destroyed');
      return { success: false, message: 'Main window not available' };
    }
  } catch (error) {
    console.error('IPC: window:close error:', error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
})

// MCP Configuration Handlers
const mcpConfigPath = path.join(os.homedir(), '.wechatflowwork', 'mcp.json');

ipcMain.handle('mcp:get-config', async () => {
  try {
    if (!fs.existsSync(mcpConfigPath)) return '{}';
    return fs.readFileSync(mcpConfigPath, 'utf-8');
  } catch (e) {
    console.error('Failed to read MCP config:', e);
    return '{}';
  }
});

ipcMain.handle('mcp:save-config', async (_, content: string) => {
  try {
    const dir = path.dirname(mcpConfigPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(mcpConfigPath, content, 'utf-8');

    // Update agent services
    if (agent) {
      // We might need to reload MCP client here, but for now just saving is enough.
      // The user might need to restart app or we can add a reload capability later.
    }
    return { success: true };
  } catch (e) {
    console.error('Failed to save MCP config:', e);
    return { success: false, error: (e as Error).message };
  }
});

// Skills Management Handlers
const skillsDir = path.join(os.homedir(), '.opencowork', 'skills');

// Helper to get built-in skill names
const getBuiltinSkillNames = () => {
  try {
    let sourceDir = path.join(process.cwd(), 'resources', 'skills');
    if (app.isPackaged) {
      const possiblePath = path.join(process.resourcesPath, 'resources', 'skills');
      if (fs.existsSync(possiblePath)) sourceDir = possiblePath;
      else sourceDir = path.join(process.resourcesPath, 'skills');
    }
    if (fs.existsSync(sourceDir)) {
      return fs.readdirSync(sourceDir).filter(f => fs.statSync(path.join(sourceDir, f)).isDirectory());
    }
  } catch (e) { console.error(e) }
  return [];
};

ipcMain.handle('skills:list', async () => {
  try {
    if (!fs.existsSync(skillsDir)) return [];
    const builtinSkills = getBuiltinSkillNames();
    const files = fs.readdirSync(skillsDir);

    return files.filter(f => {
      try { return fs.statSync(path.join(skillsDir, f)).isDirectory(); } catch { return false; }
    }).map(f => ({
      id: f,
      name: f,
      path: path.join(skillsDir, f),
      isBuiltin: builtinSkills.includes(f)
    }));
  } catch (e) {
    console.error('Failed to list skills:', e);
    return [];
  }
});

ipcMain.handle('skills:get', async (_, skillId: string) => {
  try {
    const skillPath = path.join(skillsDir, skillId);
    if (!fs.existsSync(skillPath)) return '';

    // Look for MD file inside
    const files = fs.readdirSync(skillPath);
    const mdFile = files.find(f => f.toLowerCase().endsWith('.md'));

    if (!mdFile) return '';
    return fs.readFileSync(path.join(skillPath, mdFile), 'utf-8');
  } catch (e) {
    console.error('Failed to read skill:', e);
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

    console.log(`[skills:save] Saved skill: ${skillId}`);
    return { success: true };
  } catch (error) {
    console.error('[skills:save] Error:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('skills:delete', async (_event, skillId: string) => {
  try {
    const userSkillsDir = path.join(os.homedir(), '.aiagent', 'skills');
    const skillPath = path.join(userSkillsDir, skillId);

    await fs.rm(skillPath, { recursive: true, force: true } as any);
    console.log(`[skills:delete] Deleted skill: ${skillId}`);

    // Reload skills
    if (agent) {
      await agent.getSkillManager().loadSkills();
    }

    return { success: true };
  } catch (error) {
    console.error('[skills:delete] Error:', error);
    return { success: false, error: (error as Error).message };
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
  if (!agent) return [];

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
    console.error(`[Commands] Error executing command ${commandId}:`, error);
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
        console.log(`[ShortcutManager] Executing command via shortcut: ${commandId}`);
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
    console.error(`[Commands] Error setting shortcut for ${commandId}:`, error);
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


async function initializeAgent() {
  const apiKey = await configStore.getApiKey() || process.env.ANTHROPIC_API_KEY

  // 注入豆包 API Key 到环境变量,供 Skills 使用
  const doubaoApiKey = await configStore.getDoubaoApiKey()
  if (doubaoApiKey) {
    process.env.DOUBAO_API_KEY = doubaoApiKey
    console.log('Doubao API Key已配置并注入到环境变量')
  }

  // 注入智谱 API Key 到环境变量,供 Skills 使用
  const zhipuApiKey = await configStore.getZhipuApiKey()
  if (zhipuApiKey) {
    process.env.ZHIPU_API_KEY = zhipuApiKey
    console.log('Zhipu API Key已配置并注入到环境变量')
  }

  if (apiKey && mainWin) {
    agent = new AgentRuntime(apiKey, mainWin, configStore.getModel(), configStore.getApiUrl())
    // Add floating ball window to receive updates
    if (floatingBallWin) {
      agent.addWindow(floatingBallWin)
    }
    (global as Record<string, unknown>).agent = agent

    // 自动加载当前会话的历史记录
    const currentSessionId = sessionStore.getCurrentSessionId()
    if (currentSessionId) {
      const session = sessionStore.getSession(currentSessionId)
      if (session && session.messages.length > 0) {
        console.log(`[Main] Auto-loading session: ${session.title} (${session.messages.length} messages)`)
        agent.loadHistory(session.messages)
      } else {
        console.log('[Main] Current session is empty, starting fresh')
      }
    } else {
      console.log('[Main] No current session found, starting fresh')
    }

    // Trigger async initialization for MCP and Skills
    agent.initialize().catch(err => console.error('Agent initialization failed:', err));

    console.log('Agent initialized with model:', configStore.getModel())
    console.log('API URL:', configStore.getApiUrl())
  } else {
    console.warn('No API Key found. Please configure in Settings.')
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
  console.log('[Main Window] __dirname:', __dirname)
  console.log('[Main Window] preload path:', preloadPath)

  mainWin = new BrowserWindow({
    width: 900,
    height: 750,
    minWidth: 800,
    minHeight: 650,
    icon: path.join(process.env.VITE_PUBLIC || '', 'icon.png'),
    frame: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: preloadPath,
      // 🔒 安全配置
      contextIsolation: true,          // 启用上下文隔离（防止渲染进程访问 Node.js）
      nodeIntegration: false,           // 禁用 Node.js 集成（默认值，显式声明）
      sandbox: false,                   // 暂时禁用沙箱（preload 需要访问 Node.js 的某些功能）
      webSecurity: true,                // 启用 Web 安全策略
      allowRunningInsecureContent: false, // 禁止 HTTPS 页面加载 HTTP 资源
    },
    show: false,
  })

  // Remove menu bar
  mainWin.setMenu(null)

  mainWin.once('ready-to-show', () => {
    console.log('Main window ready.')
  })

  mainWin.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      mainWin?.hide()
    }
  })

  // 🔍 调试：检查 preload 是否加载
  mainWin?.webContents.on('did-finish-load', () => {
    console.log('[Main Window] Finished loading')
    mainWin?.webContents.executeJavaScript('typeof window.ipcRenderer')
      .then(result => {
        console.log('[Main Window] window.ipcRenderer type:', result)
        // 发送主进程消息
        mainWin?.webContents.send('main-process-message', (new Date).toLocaleString())
      })
      .catch(err => {
        console.error('[Main Window] Error checking ipcRenderer:', err)
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
      sandbox: false,                   // 暂时禁用沙箱
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
  console.log('[FloatingBall] toggleFloatingBallExpanded called, isBallExpanded:', isBallExpanded)
  if (!floatingBallWin) {
    console.error('[FloatingBall] floatingBallWin is null!')
    return
  }

  const [currentX, currentY] = floatingBallWin.getPosition()
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize
  console.log('[FloatingBall] Current position:', currentX, currentY)
  console.log('[FloatingBall] Screen size:', screenWidth, screenHeight)

  if (isBallExpanded) {
    // Collapse - Calculate where ball should go based on current expanded window position
    // Ball's right edge should align with expanded panel's right edge
    // Ball position = (expanded right edge - BALL_SIZE), same Y
    const ballX = currentX + EXPANDED_WIDTH - BALL_SIZE
    const ballY = currentY

    // Clamp to screen bounds
    const finalX = Math.max(0, Math.min(ballX, screenWidth - BALL_SIZE))
    const finalY = Math.max(0, Math.min(ballY, screenHeight - BALL_SIZE))

    console.log('[FloatingBall] Collapsing to:', BALL_SIZE, 'x', BALL_SIZE, 'at', finalX, finalY)
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

    console.log('[FloatingBall] Expanding to:', EXPANDED_WIDTH, 'x', EXPANDED_HEIGHT, 'at', newX, newY)
    floatingBallWin.setSize(EXPANDED_WIDTH, EXPANDED_HEIGHT)
    floatingBallWin.setPosition(newX, newY)
    isBallExpanded = true
  }

  console.log('[FloatingBall] Sending state-changed event:', isBallExpanded)
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
  console.log('[analyzeArticles] Analyzing', articles.length, 'articles (AI integration pending)')

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
