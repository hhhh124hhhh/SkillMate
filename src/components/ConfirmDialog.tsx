import { Check, X, AlertCircle, Trash2, FolderOpen } from 'lucide-react';
import { Button } from './ui/Button.js';

interface ConfirmDialogProps {
    // 简单确认对话框
    isOpen?: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;

    // 删除确认对话框
    type?: 'general' | 'delete';
    deleteOperation?: {
        type: 'delete_file' | 'delete_directory';
        path: string;
        itemCount?: number;
    };
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = '确定',
    cancelText = '取消',
    onConfirm,
    onCancel,
    type = 'general',
    deleteOperation
}: ConfirmDialogProps) {
    // 如果未打开，返回 null
    if (!isOpen) {
        return null;
    }

    // 删除确认对话框
    if (type === 'delete' && deleteOperation) {
        const isDirectory = deleteOperation.type === 'delete_directory';
        const itemCount = deleteOperation.itemCount || 1;

        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
                <div className="bg-background border border-border rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="p-5 border-b border-border bg-red-500/10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-500/20 rounded-full">
                                {isDirectory ? (
                                    <Trash2 className="text-red-500" size={24} />
                                ) : (
                                    <FolderOpen className="text-red-500" size={24} />
                                )}
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg">
                                    {isDirectory ? '确认删除目录' : '确认删除文件'}
                                </h3>
                            </div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-6">
                        <div className="space-y-3">
                            {/* 操作详情 */}
                            <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">将删除：</p>
                                <p className="text-sm font-mono bg-background p-2 rounded break-all">
                                    {deleteOperation.path}
                                </p>
                                {isDirectory && (
                                    <p className="text-xs text-muted-foreground mt-2">
                                        包含 {itemCount} 个项目
                                    </p>
                                )}
                            </div>

                            {/* 警告信息 */}
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={16} />
                                <p>此操作将永久删除文件，无法恢复</p>
                            </div>

                            {/* 信任项目提示 */}
                            {!isDirectory && (
                                <p className="text-xs text-muted-foreground">
                                    💡 提示：如果这是一个项目目录，你可以信任该项目以避免每次删除时都确认
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 p-5 border-t border-border bg-muted/30">
                        <Button
                            variant="secondary"
                            icon={X}
                            className="flex-1"
                            onClick={() => {
                                if (typeof onCancel === 'function') {
                                    onCancel();
                                }
                            }}
                        >
                            取消删除
                        </Button>
                        <Button
                            variant="primary"
                            icon={Trash2}
                            className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                            onClick={() => {
                                if (typeof onConfirm === 'function') {
                                    onConfirm();
                                }
                            }}
                        >
                            确认删除
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // 通用确认对话框
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
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
                    <Button
                        variant="secondary"
                        icon={X}
                        className="flex-1"
                        onClick={() => {
                            if (typeof onCancel === 'function') {
                                onCancel();
                            }
                        }}
                    >
                        {cancelText}
                    </Button>
                    <Button
                        variant="primary"
                        icon={Check}
                        className="flex-1"
                        onClick={() => {
                            if (typeof onConfirm === 'function') {
                                onConfirm();
                            }
                        }}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
}

