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
import pkg from 'electron-updater'
import { BrowserWindow } from 'electron'
import log from 'electron-log'

const { autoUpdater } = pkg

export class UpdateManager {
  private mainWindow: BrowserWindow | null = null
  private isDownloading = false

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
    this.configureUpdater()
    this.registerEvents()
  }

  private configureUpdater() {
    // GitHub Releases 配置
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'hhhh124hhhh',
      repo: 'wechat-flowwork'
    })

    // 自动下载更新
    autoUpdater.autoDownload = true

    // 退出时自动安装（无感升级关键）
    autoUpdater.autoInstallOnAppQuit = true

    // 开发环境禁用更新
    if (process.env.NODE_ENV === 'development') {
      autoUpdater.autoDownload = false
      console.log('[Update] Auto-update disabled in development mode')
    }

    // 配置日志
    log.transports.file.level = 'info'
    autoUpdater.logger = log
  }

  private registerEvents() {
    // 发现更新
    autoUpdater.on('update-available', (info: UpdateInfo) => {
      console.log('[Update] Update available:', info.version)

      this.mainWindow?.webContents.send('update:available', {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      })

      log.info(`[Update] New version available: ${info.version}`)
    })

    // 更新已下载
    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      console.log('[Update] Update downloaded:', info.version)
      this.isDownloading = false

      this.mainWindow?.webContents.send('update:downloaded', {
        version: info.version,
        releaseDate: info.releaseDate
      })

      log.info(`[Update] Update downloaded: ${info.version}`)
    })

    // 下载进度
    autoUpdater.on('download-progress', (progress) => {
      console.log(`[Update] Download progress: ${progress.percent}%`)

      this.mainWindow?.webContents.send('update:progress', {
        percent: Math.floor(progress.percent),
        transferred: this.formatBytes(progress.transferred),
        total: this.formatBytes(progress.total),
        bytesPerSecond: this.formatBytes(progress.bytesPerSecond)
      })
    })

    // 无更新
    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      console.log('[Update] No update available, current version:', info.version)

      this.mainWindow?.webContents.send('update:not-available', {
        version: info.version
      })

      log.info('[Update] No update available')
    })

    // 错误处理
    autoUpdater.on('error', (error: Error) => {
      console.error('[Update] Error:', error)
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
      console.log('[Update] Skipped in development mode')
      this.mainWindow?.webContents.send('update:not-available', {
        version: 'dev'
      })
      return
    }

    if (this.isDownloading) {
      console.log('[Update] Already downloading, skip check')
      return
    }

    try {
      console.log('[Update] Checking for updates...')
      log.info('[Update] Checking for updates...')

      await autoUpdater.checkForUpdates()
    } catch (error) {
      console.error('[Update] Failed to check for updates:', error)
      log.error('[Update] Failed to check for updates:', error)
    }
  }

  /**
   * 立即安装并重启（紧急更新用）
   */
  public quitAndInstall(): void {
    console.log('[Update] Quitting and installing update...')
    log.info('[Update] Quitting and installing update')

    autoUpdater.quitAndInstall(true, true)
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
    const { app } = require('electron')
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
