import React, { useEffect } from 'react';
import { Check, X, AlertTriangle, Info } from 'lucide-react';
import { cn } from '../../utils/cn.js';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  onClose?: (id: string) => void;
}

const icons = {
  success: Check,
  error: X,
  warning: AlertTriangle,
  info: Info
};

const styles = {
  success: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
  error: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
  warning: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200',
  info: 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-200'
};

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  message,
  duration = 3000,
  onClose
}) => {
  const Icon = icons[type];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose?.(id);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg',
      'animate-in slide-in-from-top-full fade-in duration-300',
      styles[type]
    )}>
      <Icon size={20} className="shrink-0" />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={() => onClose?.(id)}
        className="p-1 hover:bg-black/5 dark:hover:bg-black/20 rounded transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
};
