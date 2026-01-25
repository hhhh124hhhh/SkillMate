/**
 * 依赖安装对话框
 * 当技能需要额外依赖时，显示友好的安装提示
 */

import React, { useState } from 'react';
import { X, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';

export interface DependencyInstallDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  solution: string;
  canAutoFix: boolean;
  onInstall: () => Promise<boolean>;
  onDismiss: () => void;
}

export const DependencyInstallDialog: React.FC<DependencyInstallDialogProps> = ({
  isOpen,
  title,
  message,
  solution,
  canAutoFix,
  onInstall,
  onDismiss
}) => {
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const [installError, setInstallError] = useState(false);

  if (!isOpen) return null;

  const handleInstall = async () => {
    setIsInstalling(true);
    setInstallError(false);

    try {
      const success = await onInstall();
      if (success) {
        setInstallSuccess(true);
        // 2秒后自动关闭
        setTimeout(() => {
          onDismiss();
          setInstallSuccess(false);
        }, 2000);
      } else {
        setInstallError(true);
      }
    } catch (error) {
      console.error('[DependencyInstallDialog] Install failed:', error);
      setInstallError(true);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* 头部 */}
        <div className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {installSuccess ? (
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              ) : installError ? (
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
              ) : (
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                  <Download className="w-6 h-6 text-orange-600 dark:text-orange-300" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  {title}
                </h3>
                {!installSuccess && !installError && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                    💡 只需要安装一次
                  </p>
                )}
              </div>
            </div>
            {!isInstalling && !installSuccess && (
              <button
                onClick={onDismiss}
                className="p-1 hover:bg-white/10 rounded-full transition-colors"
                aria-label="关闭"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* 内容 */}
        <div className="px-6 py-5">
          {installSuccess ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                安装成功！
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                现在可以正常使用这个功能了
              </p>
            </div>
          ) : installError ? (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                安装失败
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                自动安装遇到了问题，请尝试手动安装
              </p>
              <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-3 text-left">
                <p className="text-xs font-mono text-slate-700 dark:text-slate-300 mb-2">
                  手动安装步骤：
                </p>
                <ol className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-decimal list-inside">
                  <li>打开命令行（Terminal）</li>
                  <li>输入安装命令</li>
                  <li>重启应用后重试</li>
                </ol>
              </div>
            </div>
          ) : (
            <>
              <p className="text-slate-700 dark:text-slate-300 mb-4">
                {message}
              </p>

              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">💡</div>
                  <div>
                    <p className="text-sm font-medium text-orange-900 dark:text-orange-100 mb-1">
                      解决方案
                    </p>
                    <p className="text-sm text-orange-700 dark:text-orange-200">
                      {solution}
                    </p>
                  </div>
                </div>
              </div>

              {canAutoFix && (
                <div className="mt-4 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>
                    安装过程可能需要 1-2 分钟，请耐心等待。安装只需一次，以后就不用再装了。
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* 底部按钮 */}
        {!installSuccess && !installError && (
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-end gap-3">
            <Button
              variant="secondary"
              onClick={onDismiss}
              disabled={isInstalling}
            >
              稍后手动安装
            </Button>
            {canAutoFix && (
              <Button
                variant="primary"
                onClick={handleInstall}
                disabled={isInstalling}
                loading={isInstalling}
                icon={isInstalling ? Loader2 : Download}
              >
                {isInstalling ? '安装中...' : '自动安装'}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DependencyInstallDialog;
