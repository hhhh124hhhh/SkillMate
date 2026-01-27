/**
 * 自定义 Dialog 工具函数
 * 用于替代原生 confirm()，提供美观的确认对话框
 */

import { createRoot } from 'react-dom/client';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

/**
 * 显示确认对话框
 * @param options 对话框配置
 * @returns Promise<boolean> - 用户是否确认
 */
export async function showConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    // 查找或创建 dialog-root
    let dialogRoot = document.getElementById('dialog-root');
    if (!dialogRoot) {
      dialogRoot = document.createElement('div');
      dialogRoot.id = 'dialog-root';
      document.body.appendChild(dialogRoot);
    }

    const root = createRoot(dialogRoot);

    const handleConfirm = () => {
      resolve(true);
      cleanup();
    };

    const handleCancel = () => {
      resolve(false);
      cleanup();
    };

    const cleanup = () => {
      try {
        root.unmount();
      } catch (e) {
        // Ignore unmount errors
      }
    };

    root.render(
      <ConfirmDialog
        isOpen={true}
        title={options.title || '确认操作'}
        message={options.message}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );
  });
}
