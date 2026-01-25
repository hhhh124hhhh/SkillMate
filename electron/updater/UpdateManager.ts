/**
 * 无感升级管理器
 *
 * 基于 electron-updater 实现 GitHub Releases 自动更新
 * 特性：
 * - 后台下载更新（不干扰用户使用）
 * - 退出时自动安装
 * - 清晰的进度提示
 * - 增量更新（节省 80%+ 带宽）
 */

import type { UpdateInfo } from 'electron-updater'
import { BrowserWindow, app } from 'electron'
import log from 'electron-log'

export class UpdateManager {
  private mainWindow: BrowserWindow | null = null
  private isDownloading = false
  private autoUpdater: any = null

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
    this.configureUpdater()
    this.registerEvents()
  }

  private getAutoUpdater() {
    if (!this.autoUpdater) {
      // 延迟导入 autoUpdater，确保 app 已经 ready
      const pkg = require('electron-updater')
      this.autoUpdater = pkg.autoUpdater
    }
    return this.autoUpdater
  }

  private configureUpdater() {
    // GitHub Releases 配置
    this.getAutoUpdater().setFeedURL({
      provider: 'github',
      owner: 'hhhh124hhhh',
      repo: 'skill-mate'
    })

    // 自动下载更新
    this.getAutoUpdater().autoDownload = true

    // 退出时自动安装（无感升级关键）
    this.getAutoUpdater().autoInstallOnAppQuit = true

    // 开发环境禁用更新
    if (process.env.NODE_ENV === 'development') {
      this.getAutoUpdater().autoDownload = false
      log.log('[Update] Auto-update disabled in development mode')
    }

    // 配置日志
    log.transports.file.level = 'info'
    this.getAutoUpdater().logger = log
  }

  private registerEvents() {
    // 发现更新
    this.getAutoUpdater().on('update-available', (info: UpdateInfo) => {
      log.log('[Update] Update available:', info.version)

      this.mainWindow?.webContents.send('update:available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      })

      log.info(`[Update] New version available: ${info.version}`)
    })

    // 更新已下载
    this.getAutoUpdater().on('update-downloaded', (info: UpdateInfo) => {
      log.log('[Update] Update downloaded:', info.version)
      this.isDownloading = false

      this.mainWindow?.webContents.send('update:downloaded', {
        version: info.version,
        releaseDate: info.releaseDate
      })

      log.info(`[Update] Update downloaded: ${info.version}`)
    })

    // 下载进度
    this.getAutoUpdater().on('download-progress', (progress) => {
      log.log(`[Update] Download progress: ${progress.percent}%`)

      this.mainWindow?.webContents.send('update:progress', {
        percent: Math.floor(progress.percent),
        transferred: this.formatBytes(progress.transferred),
        total: this.formatBytes(progress.total),
        bytesPerSecond: this.formatBytes(progress.bytesPerSecond)
      })
    })

    // 无更新
    this.getAutoUpdater().on('update-not-available', (info: UpdateInfo) => {
      log.log('[Update] No update available, current version:', info.version)

      this.mainWindow?.webContents.send('update:not-available', {
        version: info.version
      })

      log.info('[Update] No update available')
    })

    // 错误处理
    this.getAutoUpdater().on('error', (error: Error) => {
      log.error('[Update] Error:', error)
      this.isDownloading = false

      this.mainWindow?.webContents.send('update:error', {
        message: error.message,
        name: error.name
      })

      log.error('[Update] Error:', error)
    })
  }

  /**
   * 检查更新
   */
  public async checkForUpdates(): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      log.log('[Update] Skipped in development mode')
      this.mainWindow?.webContents.send('update:not-available', {
        version: 'dev'
      })
      return
    }

    if (this.isDownloading) {
      log.log('[Update] Already downloading, skip check')
      return
    }

    try {
      log.log('[Update] Checking for updates...')
      log.info('[Update] Checking for updates...')

      await this.getAutoUpdater().checkForUpdates()
    } catch (error) {
      log.error('[Update] Failed to check for updates:', error)
      log.error('[Update] Failed to check for updates:', error)
    }
  }

  /**
   * 立即安装并重启（紧急更新用）
   */
  public quitAndInstall(): void {
    log.log('[Update] Quitting and installing update...')
    log.info('[Update] Quitting and installing update')

    this.getAutoUpdater().quitAndInstall(true, true)
  }

  /**
   * 格式化字节数
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'

    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * 获取当前版本
   */
  public getCurrentVersion(): string {
    return app.getVersion()
  }

  /**
   * 定期检查更新（每小时一次）
   */
  public scheduleAutoCheck(): void {
    if (process.env.NODE_ENV === 'development') {
      return
    }

    // 每小时检查一次更新
    setInterval(async () => {
      await this.checkForUpdates()
    }, 60 * 60 * 1000)

    // 启动后 5 分钟首次检查
    setTimeout(async () => {
      await this.checkForUpdates()
    }, 5 * 60 * 1000)

    log.info('[Update] Scheduled automatic updates (every hour)')
  }
}
