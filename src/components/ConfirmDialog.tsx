import { useState } from 'react';
import { AlertTriangle, Check, X, AlertCircle } from 'lucide-react';

interface ConfirmationRequest {
    id: string;
    tool: string;
    description: string;
    args: Record<string, unknown>;
}

interface ConfirmDialogProps {
    // 模式 1: 工具操作确认
    request: ConfirmationRequest | null;
    onConfirm: ((id: string, remember: boolean, tool: string, path?: string) => void) | (() => void);
    onDeny: ((id: string) => void) | (() => void);
    
    // 模式 2: 简单确认对话框
    isOpen?: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    onCancel?: () => void;
}

export function ConfirmDialog({
    request,
    onConfirm,
    onDeny,
    isOpen,
    title,
    message,
    confirmText = '确定',
    cancelText = '取消',
    onCancel
}: ConfirmDialogProps) {
    const [remember, setRemember] = useState(false);

    // 检查是否使用模式 2 (简单确认对话框)
    const isSimpleMode = isOpen !== undefined && request === null;

    // 如果两种模式都不激活，返回 null
    if ((!request && !isSimpleMode) || (isSimpleMode && !isOpen)) return null;

    // 模式 1: 工具操作确认
    if (request && !isSimpleMode) {
        const path = (request.args?.path || request.args?.cwd) as string | undefined;

        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-background border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="p-5 border-b border-border bg-amber-500/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500/20 rounded-full">
                                <AlertTriangle className="text-amber-500" size={24} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">操作确认</h3>
                                <p className="text-sm text-muted-foreground">请确认是否执行此操作</p>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-5 space-y-4">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">工具</p>
                            <p className="font-mono text-sm bg-secondary/50 px-3 py-2 rounded-lg">{request.tool}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">描述</p>
                            <p className="text-foreground">{request.description}</p>
                        </div>
                        {request.args && Object.keys(request.args).length > 0 && (
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">参数</p>
                                <pre className="bg-secondary/50 p-3 rounded-lg text-xs font-mono overflow-x-auto max-h-32">
                                    {JSON.stringify(request.args, null, 2)}
                                </pre>
                            </div>
                        )}
                        {/* Remember checkbox */}
                        <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-secondary/30 transition-colors">
                            <input
                                type="checkbox"
                                checked={remember}
                                onChange={(e) => setRemember(e.target.checked)}
                                className="w-4 h-4 rounded accent-primary"
                            />
                            <span className="text-sm text-muted-foreground">记住此选择，以后自动执行</span>
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 p-5 border-t border-border bg-muted/30">
                        <button
                            onClick={() => {
                                setRemember(false);
                                if (typeof onDeny === 'function') {
                                    onDeny(request.id);
                                }
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-colors font-medium"
                        >
                            <X size={18} /> 拒绝
                        </button>
                        <button
                            onClick={() => {
                                if (typeof onConfirm === 'function') {
                                    onConfirm(request.id, remember, request.tool, path);
                                }
                                setRemember(false);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium"
                        >
                            <Check size={18} /> 允许
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 模式 2: 简单确认对话框
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-background border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-5 border-b border-border bg-amber-500/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-full">
                            <AlertCircle className="text-amber-500" size={24} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">{title || '确认操作'}</h3>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-foreground leading-relaxed">{message}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 p-5 border-t border-border bg-muted/30">
                    <button
                        onClick={() => {
                            if (typeof onCancel === 'function') {
                                onCancel();
                            } else if (typeof onDeny === 'function') {
                                onDeny();
                            }
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-muted-foreground rounded-xl hover:bg-secondary/80 transition-colors font-medium"
                    >
                        <X size={18} /> {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            if (typeof onConfirm === 'function') {
                                onConfirm();
                            }
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium"
                    >
                        <Check size={18} /> {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Re-export useConfirmations for convenience
export { useConfirmations } from './useConfirmations';

