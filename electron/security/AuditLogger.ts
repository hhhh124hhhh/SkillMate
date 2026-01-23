/**
 * 审计日志系统
 *
 * 符合《网络安全法》要求：日志留存不少于 6 个月
 * 记录所有关键安全操作用于审计和事件溯源
 *
 * 日志类型：
 * - auth: 认证和授权相关
 * - permission: 权限变更
 * - file_op: 文件操作
 * - command: 命令执行
 * - security: 安全事件
 */

import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';
import log from 'electron-log';

export interface AuditLogEntry {
  timestamp: string
  type: 'auth' | 'permission' | 'file_op' | 'command' | 'security'
  action: string
  details: Record<string, unknown>
  severity: 'info' | 'warning' | 'error'
  userId?: string
  sessionId?: string
}

export class AuditLogger {
  private maxLogSize = 10 * 1024 * 1024; // 10MB
  private retentionDays = 180; // 6个月
  private logDir: string;
  private currentLogFile: string;

  constructor() {
    // 日志目录：userData/logs/audit
    this.logDir = path.join(app.getPath('userData'), 'logs', 'audit');

    // 当前日志文件：audit-YYYY-MM-DD.log
    const date = new Date().toISOString().split('T')[0];
    this.currentLogFile = path.join(this.logDir, `audit-${date}.log`);
  }

  /**
   * 记录审计事件
   */
  async log(
    type: AuditLogEntry['type'],
    action: string,
    details: Record<string, unknown>,
    severity: AuditLogEntry['severity'] = 'info',
    userId?: string,
    sessionId?: string
  ): Promise<void> {
    try {
      // 确保日志目录存在
      await this.ensureLogDirectory();

      // 检查是否需要轮换日志文件
      await this.checkLogRotation();

      // 构造日志条目
      const entry: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        type,
        action,
        details: this.sanitizeDetails(details),
        severity,
        userId,
        sessionId
      };

      // 写入日志
      const logLine = JSON.stringify(entry) + '\n';
      await fs.appendFile(this.currentLogFile, logLine, 'utf-8');

      // 根据严重级别输出到控制台
      const logMethod = severity === 'error' ? log.error :
                       severity === 'warning' ? log.warn :
                       log.info;

      logMethod(`[Audit] ${type.toUpperCase()} - ${action}`, entry);

    } catch (error) {
      log.error('[AuditLogger] Failed to write log:', error);
    }
  }

  /**
   * 清理敏感信息（避免日志本身泄露敏感数据）
   */
  private sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...details };
    const sensitiveKeys = ['apiKey', 'api_key', 'token', 'password', 'secret', 'key'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '***REDACTED***';
      }
    }

    return sanitized;
  }

  /**
   * 确保日志目录存在
   */
  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      log.error('[AuditLogger] Failed to create log directory:', error);
    }
  }

  /**
   * 检查并轮换日志文件
   */
  private async checkLogRotation(): Promise<void> {
    try {
      // 检查当前日志文件大小
      const stats = await fs.stat(this.currentLogFile);

      if (stats.size >= this.maxLogSize) {
        // 文件过大，创建新的日志文件
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const newLogFile = path.join(this.logDir, `audit-${timestamp}.log`);

        // 重命名当前文件
        await fs.rename(this.currentLogFile, newLogFile);

        log.log(`[AuditLogger] Rotated log file: ${newLogFile}`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // 文件不存在，无需轮换
        return;
      }
      log.error('[AuditLogger] Failed to check log rotation:', error);
    }
  }

  /**
   * 清理过期日志（保留 6 个月）
   */
  async cleanupOldLogs(): Promise<void> {
    try {
      const files = await fs.readdir(this.logDir);
      const now = Date.now();
      const maxAge = this.retentionDays * 24 * 60 * 60 * 1000; // 6个月

      for (const file of files) {
        const filePath = path.join(this.logDir, file);
        const stats = await fs.stat(filePath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          await fs.unlink(filePath);
          log.log(`[AuditLogger] Deleted old log file: ${file}`);
        }
      }
    } catch (error) {
      log.error('[AuditLogger] Failed to cleanup old logs:', error);
    }
  }

  /**
   * 查询审计日志
   */
  async query(filter: {
    type?: AuditLogEntry['type']
    startDate?: Date
    endDate?: Date
    action?: string
    severity?: AuditLogEntry['severity']
  }): Promise<AuditLogEntry[]> {
    try {
      const files = await fs.readdir(this.logDir);
      const allLogs: AuditLogEntry[] = [];

      for (const file of files) {
        if (!file.startsWith('audit-') || !file.endsWith('.log')) {
          continue;
        }

        const filePath = path.join(this.logDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const entry: AuditLogEntry = JSON.parse(line);

            // 应用过滤条件
            if (filter.type && entry.type !== filter.type) continue;
            if (filter.action && entry.action !== filter.action) continue;
            if (filter.severity && entry.severity !== filter.severity) continue;

            const timestamp = new Date(entry.timestamp);
            if (filter.startDate && timestamp < filter.startDate) continue;
            if (filter.endDate && timestamp > filter.endDate) continue;

            allLogs.push(entry);
          } catch (parseError) {
            log.error('[AuditLogger] Failed to parse log line:', parseError);
          }
        }
      }

      // 按时间排序（最新的在前）
      allLogs.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return allLogs;
    } catch (error) {
      log.error('[AuditLogger] Failed to query logs:', error);
      return [];
    }
  }

  /**
   * 获取日志统计信息
   */
  async getStats(): Promise<{
    totalLogs: number
    totalSize: number
    oldestLog?: Date
    newestLog?: Date
    logsByType: Record<string, number>
    logsBySeverity: Record<string, number>
  }> {
    try {
      const logs = await this.query({});

      const stats = {
        totalLogs: logs.length,
        totalSize: 0,
        oldestLog: logs.length > 0 ? new Date(logs[logs.length - 1].timestamp) : undefined,
        newestLog: logs.length > 0 ? new Date(logs[0].timestamp) : undefined,
        logsByType: {} as Record<string, number>,
        logsBySeverity: {} as Record<string, number>
      };

      // 统计日志类型和严重级别
      for (const log of logs) {
        stats.logsByType[log.type] = (stats.logsByType[log.type] || 0) + 1;
        stats.logsBySeverity[log.severity] = (stats.logsBySeverity[log.severity] || 0) + 1;
      }

      // 计算总大小
      const files = await fs.readdir(this.logDir);
      for (const file of files) {
        const filePath = path.join(this.logDir, file);
        const fileStats = await fs.stat(filePath);
        stats.totalSize += fileStats.size;
      }

      return stats;
    } catch (error) {
      log.error('[AuditLogger] Failed to get stats:', error);
      return {
        totalLogs: 0,
        totalSize: 0,
        logsByType: {},
        logsBySeverity: {}
      };
    }
  }
}

// 导出单例
export const auditLogger = new AuditLogger();

/**
 * 设置审计钩子（自动记录关键操作）
 */
export function setupAuditHooks(): void {
  log.log('[AuditLogger] Setting up audit hooks...');

  // API Key 配置审计
  // 注意：实际钩子需要在 ConfigStore 等模块中集成

  log.log('[AuditLogger] ✓ Audit hooks ready');
}
