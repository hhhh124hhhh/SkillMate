/**
 * 无感升级通知组件
 *
 * 显示更新状态：
 * - 发现新版本
 * - 下载进度
 * - 下载完成，待安装
 * - 更新错误
 */

import { useEffect, useState } from 'react'
import { Download, Check, AlertCircle, X, RefreshCw, Zap } from 'lucide-react'

interface UpdateInfo {
  version?: string
  releaseDate?: string
  releaseNotes?: string
}

interface UpdateState {
  visible: boolean
  status: 'available' | 'downloading' | 'downloaded' | 'error' | 'not-available'
  info?: UpdateInfo
  progress?: {
    percent: number
    transferred: string
    total: string
    bytesPerSecond: string
  }
  error?: {
    message: string
    name: string
  }
}

export function UpdateNotification() {
  const [state, setState] = useState<UpdateState>({
    visible: false,
    status: 'available'
  })

  useEffect(() => {
    // 监听更新事件
    const handleUpdateAvailable = (info: { version: string }) => {
      setState({
        visible: true,
        status: 'downloading',
        info: { version: info.version }
      })
    }

    const handleUpdateDownloaded = (info: { version: string }) => {
      setState({
        visible: true,
        status: 'downloaded',
        info: { version: info.version }
      })
    }

    const handleUpdateProgress = (progress: number) => {
      setState(prev => ({
        ...prev,
        visible: true,
        status: 'downloading',
        progress: {
          percent: progress,
          transferred: '',
          total: '',
          bytesPerSecond: ''
        }
      }))
    }

    const handleUpdateNotAvailable = () => {
      // 不显示"无更新"通知，静默处理
      console.log('[Update] Already up to date')
    }

    const handleUpdateError = (error: string) => {
      setState({
        visible: true,
        status: 'error',
        error: { message: error, name: 'UpdateError' }
      })

      // 3秒后自动隐藏错误提示
      setTimeout(() => {
        setState(prev => ({ ...prev, visible: false }))
      }, 3000)
    }

    // 注册事件监听器
    window.api?.onUpdateAvailable?.(handleUpdateAvailable)
    window.api?.onUpdateDownloaded?.(handleUpdateDownloaded)
    window.api?.onUpdateProgress?.(handleUpdateProgress)
    window.api?.onUpdateNotAvailable?.(handleUpdateNotAvailable)
    window.api?.onUpdateError?.(handleUpdateError)

    // 清理函数
    return () => {
      // 移除事件监听器（如果需要）
    }
  }, [])

  const handleClose = () => {
    setState(prev => ({ ...prev, visible: false }))
  }

  const handleCheckForUpdates = async () => {
    await window.api?.invoke?.('update:check')
  }

  const handleInstallNow = async () => {
    await window.api?.invoke?.('update:install')
  }

  if (!state.visible) return null

  return (
    <div className="fixed top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 max-w-sm animate-slide-in z-50">
      {/* 关闭按钮 */}
      <button
        onClick={handleClose}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        aria-label="关闭"
      >
        <X className="w-4 h-4" />
      </button>

      {/* 标题和图标 */}
      <div className="flex items-start gap-3 pr-6">
        {state.status === 'downloading' && (
          <div className="flex-shrink-0">
            <RefreshCw className="w-5 h-5 text-orange-500 animate-spin" />
          </div>
        )}
        {state.status === 'downloaded' && (
          <div className="flex-shrink-0">
            <Check className="w-5 h-5 text-green-500" />
          </div>
        )}
        {state.status === 'error' && (
          <div className="flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
        )}
        {state.status === 'available' && (
          <div className="flex-shrink-0">
            <Download className="w-5 h-5 text-orange-500" />
          </div>
        )}

        <div className="flex-1">
          {/* 标题 */}
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {state.status === 'downloading' && '正在下载更新'}
            {state.status === 'downloaded' && '更新已准备就绪'}
            {state.status === 'error' && '更新失败'}
            {state.status === 'available' && '发现新版本'}
          </h3>

          {/* 版本信息 */}
          {state.info?.version && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              版本 {state.info.version}
            </p>
          )}

          {/* 下载进度 */}
          {state.status === 'downloading' && state.progress && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${state.progress.percent}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                <span>{state.progress.transferred} / {state.progress.total}</span>
                <span>{state.progress.bytesPerSecond}/s</span>
              </div>
            </div>
          )}

          {/* 错误信息 */}
          {state.status === 'error' && state.error && (
            <p className="text-sm text-red-600 dark:text-red-400 mb-2">
              {state.error.message}
            </p>
          )}

          {/* 下载完成提示 */}
          {state.status === 'downloaded' && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              更新已下载完成，将在退出时自动安装
            </p>
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2 mt-3">
        {state.status === 'downloaded' && (
          <>
            <button
              onClick={handleInstallNow}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-500 hover:bg-blue-600 text-white rounded-md transition-colors text-sm font-medium"
            >
              <Zap className="w-4 h-4" />
              立即重启
            </button>
            <button
              onClick={handleClose}
              className="px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors text-sm"
            >
              退出时安装
            </button>
          </>
        )}

        {state.status === 'error' && (
          <button
            onClick={handleCheckForUpdates}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            重试
          </button>
        )}
      </div>
    </div>
  )
}
