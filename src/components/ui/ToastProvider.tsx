import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Toast } from './Toast.js';
import type { ToastProps } from './Toast.js';
import { setGlobalToast } from '../../utils/toast.js';

interface ToastContextValue {
  toast: (props: Omit<ToastProps, 'id' | 'onClose'>) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((props: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, ...props }]);
  }, []);

  const success = useCallback((message: string, duration = 3000) => {
    toast({ type: 'success', message, duration });
  }, [toast]);

  const error = useCallback((message: string, duration = 5000) => {
    toast({ type: 'error', message, duration });
  }, [toast]);

  const warning = useCallback((message: string, duration = 4000) => {
    toast({ type: 'warning', message, duration });
  }, [toast]);

  const info = useCallback((message: string, duration = 3000) => {
    toast({ type: 'info', message, duration });
  }, [toast]);

  const value: ToastContextValue = { toast, success, error, warning, info };

  // 设置全局 toast 引用，以便在非 Hook 环境中使用
  useEffect(() => {
    setGlobalToast(value);
  }, [value]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-md w-full pointer-events-none">
          {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto">
              <Toast
                id={t.id}
                type={t.type}
                message={t.message}
                duration={t.duration}
                onClose={remove}
              />
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
