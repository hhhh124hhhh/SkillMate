/**
 * 全局 Toast 辅助函数
 * 用于在不支持 React Hook 的地方调用 toast（如普通函数、事件处理器等）
 */

import { useToast } from '../components/ui/ToastProvider';

// 保存全局 toast 函数的引用
let globalToast: ReturnType<typeof useToast> | null = null;

/**
 * 设置全局 toast 引用（由 ToastProvider 内部调用）
 */
export function setGlobalToast(toast: ReturnType<typeof useToast>) {
  globalToast = toast;
}

/**
 * 全局 toast 辅助函数
 */
export const toast = {
  success: (message: string, duration?: number) => {
    if (globalToast) {
      globalToast.success(message, duration);
    } else {
      console.warn('[Toast] Global toast not initialized. Using fallback alert.');
      console.log(`[Toast Success] ${message}`);
    }
  },
  error: (message: string, duration?: number) => {
    if (globalToast) {
      globalToast.error(message, duration);
    } else {
      console.warn('[Toast] Global toast not initialized. Using fallback alert.');
      console.error(`[Toast Error] ${message}`);
    }
  },
  warning: (message: string, duration?: number) => {
    if (globalToast) {
      globalToast.warning(message, duration);
    } else {
      console.warn('[Toast] Global toast not initialized. Using fallback alert.');
      console.warn(`[Toast Warning] ${message}`);
    }
  },
  info: (message: string, duration?: number) => {
    if (globalToast) {
      globalToast.info(message, duration);
    } else {
      console.warn('[Toast] Global toast not initialized. Using fallback alert.');
      console.info(`[Toast Info] ${message}`);
    }
  }
};
