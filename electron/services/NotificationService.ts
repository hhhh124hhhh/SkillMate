import { Notification, app } from 'electron';
import log from 'electron-log';
import path from 'path';
import { configStore } from '../config/ConfigStore.js';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface NotificationOptions {
  title: string;
  body: string;
  type?: NotificationType;
  timeout?: number;
  icon?: string;
}

export class NotificationService {
  private enabled: boolean;

  constructor() {
    this.enabled = configStore.get('notifications') ?? true;
  }

  /**
   * 发送通知
   */
  public sendNotification(options: NotificationOptions): Notification | null {
    if (!this.enabled) {
      log.log('[NotificationService] Notifications are disabled');
      return null;
    }

    try {
      const notification = new Notification({
        title: options.title,
        body: options.body,
        icon: options.icon || this.getDefaultIcon(),
        silent: false
      });

      notification.show();

      // 设置超时自动关闭
      if (options.timeout) {
        setTimeout(() => {
          notification.close();
        }, options.timeout);
      }

      return notification;
    } catch (error) {
      log.error('[NotificationService] Failed to send notification:', error);
      return null;
    }
  }

  /**
   * 发送工作完成通知
   */
  public sendWorkCompleteNotification(taskType: string, _result?: string): Notification | null {
    const titles = [
      'SkillMate 任务完成！🎉',
      '任务搞定啦！✨',
      '工作完成，干得漂亮！💪',
      '任务完成✅'
    ];

    const bodies = [
      `已完成${taskType}任务，快来查看结果吧！`,
      `${taskType}搞定了，SkillMate 效率杠杠的！`,
      `任务完成：${taskType}，完美收工！`,
      `${taskType}已完成，准备接下一个挑战！`
    ];

    const title = titles[Math.floor(Math.random() * titles.length)];
    const body = bodies[Math.floor(Math.random() * bodies.length)];

    return this.sendNotification({
      title,
      body,
      type: 'success',
      timeout: 5000
    });
  }

  /**
   * 发送错误通知
   */
  public sendErrorNotification(error: string): Notification | null {
    return this.sendNotification({
      title: 'SkillMate 遇到问题',
      body: error,
      type: 'error',
      timeout: 8000
    });
  }

  /**
   * 发送信息通知
   */
  public sendInfoNotification(title: string, message: string): Notification | null {
    return this.sendNotification({
      title,
      body: message,
      type: 'info',
      timeout: 4000
    });
  }

  /**
   * 启用/禁用通知
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    configStore.set('notifications', enabled);
  }

  /**
   * 检查通知是否启用
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 获取默认图标
   */
  private getDefaultIcon(): string {
    // 使用与主进程一致的图标路径逻辑
    const { VITE_DEV_SERVER_URL, APP_ROOT } = process.env;
    const publicDir = VITE_DEV_SERVER_URL
      ? path.join(APP_ROOT || '', 'public')
      : path.join(APP_ROOT || '', 'dist');
    return path.join(publicDir, 'icon.png');
  }

  /**
   * 检查通知权限
   */
  public hasPermission(): boolean {
    // Electron 的 Notification API 在不同平台上的权限处理不同
    // 这里简化处理，假设都有权限
    return true;
  }
}

// 导出单例
export const notificationService = new NotificationService();
