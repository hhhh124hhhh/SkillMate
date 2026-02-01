import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Square, ArrowUp, ChevronDown, ChevronUp, Download, FolderOpen, MessageCircle, Zap, AlertTriangle, Check, X, Settings, History, Plus, Trash2, FileUp, FileText, FileSpreadsheet, Braces, Eye, Image, Code, FileSearch, Wrench, Lightbulb, PenTool, BarChart, Server, HelpCircle, Search, Table } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer.js';
import { toast } from '../utils/toast.js';

/**
 * Icon mapping for command suggestions
 * Defined outside component to avoid recreation on every render
 * Based on Vercel React Best Practices - render-hoist-jsx
 */
const COMMAND_ICON_MAP: Record<string, React.ElementType> = {
    'PenTool': PenTool,
    'BarChart': BarChart,
    'Server': Server,
    'Settings': Settings,
    'HelpCircle': HelpCircle,
    'Wrench': Wrench,
    'Plus': Plus,
    'FileSearch': FileSearch,
    'Lightbulb': Lightbulb,
};
import { FilePreview } from './FilePreview.js';
import { SkillSuggestionBubble } from './SkillSuggestionBubble.js';
import { DependencyInstallDialog } from './DependencyInstallDialog.js';
import { CommandPalette, type CommandDefinition } from './CommandPalette.js';
import { ConfirmDialog } from './ConfirmDialog.js';
import Anthropic from '@anthropic-ai/sdk';
import { detectIntent, type SkillRecommendation } from '../utils/intentDetector.js';

type Mode = 'chat' | 'work';

interface SessionSummary {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
}

interface DocumentFile {
    name: string;
    path: string;
    type: string;
    size?: number; // File size in bytes
}

interface CoworkViewProps {
    history: Anthropic.MessageParam[];
    onSendMessage: (message: string | { content: string, images: string[] }) => void;
    onAbort: () => void;
    isProcessing: boolean;
    onOpenSettings: () => void;
}

export function CoworkView({ history, onSendMessage, onAbort, isProcessing, onOpenSettings }: CoworkViewProps) {
    const [input, setInput] = useState('');
    const [images, setImages] = useState<string[]>([]); // Base64 strings
    const [documents, setDocuments] = useState<DocumentFile[]>([]); // Dropped documents
    const [isDragging, setIsDragging] = useState(false); // Drag state
    const [mode, setMode] = useState<Mode>('work');
    const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
    const [streamingText, setStreamingText] = useState('');
    const [workingDir, setWorkingDir] = useState<string | null>(null);
    const [modelName, setModelName] = useState('glm-4.7');
    const [showHistory, setShowHistory] = useState(false);
    const [sessions, setSessions] = useState<SessionSummary[]>([]);

    // 命令建议状态
    const [showCommandSuggestions, setShowCommandSuggestions] = useState(false);
    const [commandSuggestions, setCommandSuggestions] = useState<CommandDefinition[]>([]);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);

    // 技能推荐状态
    const [skillRecommendation, setSkillRecommendation] = useState<SkillRecommendation | null>(null);

    // 依赖安装对话框状态
    const [showDependencyDialog, setShowDependencyDialog] = useState(false);
    const [dependencyInfo, setDependencyInfo] = useState({
      title: '',
      message: '',
      solution: '',
      canAutoFix: false,
      packageName: ''
    });

    // 命令面板状态
    const [showCommandPalette, setShowCommandPalette] = useState(false);

    // 删除确认对话框状态
    const [deleteConfirm, setDeleteConfirm] = useState<{
        isOpen: boolean;
        id: string;
        operation: {
            type: 'delete_file' | 'delete_directory';
            path: string;
            itemCount?: number;
        };
    }>({
        isOpen: false,
        id: '',
        operation: { type: 'delete_file', path: '' }
    });

    // 权限确认对话框状态
    const [permissionConfirm, setPermissionConfirm] = useState<{
        isOpen: boolean;
        id: string;
        permission: {
            type: 'delete_command' | 'dangerous_operation';
            command: string;
            workingDir?: string;
        };
    }>({
        isOpen: false,
        id: '',
        permission: { type: 'delete_command', command: '' }
    });

    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const documentInputRef = useRef<HTMLInputElement>(null);
    const commandSuggestionsRef = useRef<HTMLDivElement>(null);

    /**
     * Optimized icon getter using useCallback
     * Prevents recreation of icon components on every render
     * Based on Vercel React Best Practices - rerender-memo
     */
    const getCommandIcon = useCallback((iconName: string) => {
        const Icon = COMMAND_ICON_MAP[iconName] || HelpCircle;
        return <Icon size={16} />;
    }, []);

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [previewFilePath, setPreviewFilePath] = useState<string | null>(null);
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
    const attachmentMenuRef = useRef<HTMLDivElement>(null);

    // Load config including model name
    useEffect(() => {
        window.ipcRenderer.invoke('config:get-all').then((cfg) => {
            const config = cfg as { model?: string; authorizedFolders?: string[] } | undefined;
            if (config?.model) setModelName(config.model);
            if (config?.authorizedFolders && config.authorizedFolders.length > 0) {
                // 更新工作目录为第一个授权文件夹
                setWorkingDir(config.authorizedFolders[0]);
            }
        });

        // Listen for streaming tokens
        const removeStreamListener = window.ipcRenderer.on('agent:stream-token', (_event, ...args) => {
            const token = args[0] as string;
            setStreamingText(prev => prev + token);
        });

        // Clear streaming when history updates and save session
        const removeHistoryListener = window.ipcRenderer.on('agent:history-update', (_event, ...args) => {
            const newHistory = args[0] as Anthropic.MessageParam[];
            setStreamingText('');
            // Auto-save session
            if (newHistory && newHistory.length > 0) {
                window.ipcRenderer.invoke('session:save', newHistory);
            }
        });

        // 监听配置更新事件
        const handleConfigUpdated = () => {
            window.ipcRenderer.invoke('config:get-all').then((cfg) => {
                const config = cfg as { model?: string; authorizedFolders?: string[] } | undefined;
                if (config?.model) setModelName(config.model);
                if (config?.authorizedFolders && config.authorizedFolders.length > 0) {
                    // 更新工作目录为第一个授权文件夹
                    setWorkingDir(config.authorizedFolders[0]);
                }
            });
        };
        const removeConfigListener = window.ipcRenderer.on('config:updated', handleConfigUpdated);

        // Slash Command 状态监听
        const removeSlashSuccessListener = window.ipcRenderer.on('slash-command:success', (_event, data) => {
            console.log('[CoworkView] Slash command success:', data);
            // 可选：显示成功提示
        });

        const removeSlashErrorListener = window.ipcRenderer.on('slash-command:error', (_event, data) => {
            console.log('[CoworkView] Slash command error:', data);
            const errorData = data as {
                error: string;
                isDependencyError?: boolean;
                packageName?: string;
            };

            // 如果是依赖缺失错误，显示安装对话框
            if (errorData.isDependencyError) {
                const lines = errorData.error.split('\n\n');
                setDependencyInfo({
                    title: lines[0] || '😊 需要安装一个小工具',
                    message: lines[1] || '',
                    solution: lines[2] || '点击下方按钮自动安装所需组件',
                    canAutoFix: true,
                    packageName: errorData.packageName || 'unknown'
                });
                setShowDependencyDialog(true);
            }

            // 同时也显示错误消息
            setStreamingText(prev => prev + `\n\n❌ ${errorData.error}`);
        });

        const removeSlashExecutingListener = window.ipcRenderer.on('slash-command:executing', (_event, data) => {
            console.log('[CoworkView] Executing skill command:', data);
            const execData = data as { commandName: string };
            setStreamingText(`⚡ 正在使用技能：${execData.commandName}...`);
        });

        // 删除确认请求监听
        const removeDeleteConfirmListener = window.ipcRenderer.on('agent:delete-confirm-request', (_event, data) => {
            console.log('[CoworkView] Delete confirm request:', data);
            const confirmData = data as {
                id: string;
                operation: {
                    type: 'delete_file' | 'delete_directory';
                    path: string;
                    itemCount?: number;
                    timestamp: number;
                }
            };
            setDeleteConfirm({
                isOpen: true,
                id: confirmData.id,
                operation: confirmData.operation
            });
        });

        // 权限确认请求监听
        const removePermissionConfirmListener = window.ipcRenderer.on('agent:permission-confirm-request', (_event, data) => {
            console.log('[CoworkView] Permission confirm request:', data);
            const confirmData = data as {
                id: string;
                permission: {
                    type: 'delete_command' | 'dangerous_operation';
                    command: string;
                    workingDir?: string;
                    timestamp: number;
                }
            };
            setPermissionConfirm({
                isOpen: true,
                id: confirmData.id,
                permission: {
                    type: confirmData.permission.type,
                    command: confirmData.permission.command,
                    workingDir: confirmData.permission.workingDir
                }
            });
        });

        return () => {
            removeStreamListener?.();
            removeHistoryListener?.();
            removeConfigListener?.();
            removeSlashSuccessListener?.();
            removeSlashErrorListener?.();
            removeSlashExecutingListener?.();
            removeDeleteConfirmListener?.();
            removePermissionConfirmListener?.();
        };
    }, []);

    // 监听命令面板的输入填充请求
    useEffect(() => {
        const handleCommandFill = (event: Event) => {
            const customEvent = event as CustomEvent<{
                commandId: string;
                commandName: string;
            }>;

            const { commandId } = customEvent.detail;

            // 填充命令到输入框
            setInput(`/${commandId} `);

            // 自动聚焦输入框（延迟确保命令面板关闭动画完成）
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);

            console.log(`[CoworkView] Command filled: /${commandId}`);
        };

        window.addEventListener('command:fill-input', handleCommandFill);

        return () => {
            window.removeEventListener('command:fill-input', handleCommandFill);
        };
    }, []);

    // Fetch session list when history panel is opened
    useEffect(() => {
        if (showHistory) {
            window.ipcRenderer.invoke('session:list').then((list) => {
                setSessions(list as SessionSummary[]);
            });
        }
    }, [showHistory]);

    /**
     * Optimized auto-scroll with history length tracking
     * Only scrolls when new messages are added, not on every state change
     * Based on Vercel React Best Practices - rerender-move-effect-to-event
     */
    const lastHistoryLength = useRef(0);

    useEffect(() => {
        // Only scroll when new messages are added
        if (history.length > lastHistoryLength.current && scrollRef.current) {
            requestAnimationFrame(() => {
                scrollRef.current?.scrollTo({
                    top: scrollRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            });
        }
        lastHistoryLength.current = history.length;
    }, [history.length]); // Only depend on length, not the entire history array

    // Close attachment menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (attachmentMenuRef.current &&
                !attachmentMenuRef.current.contains(event.target as Node)) {
                setShowAttachmentMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close command suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (commandSuggestionsRef.current &&
                !commandSuggestionsRef.current.contains(event.target as Node) &&
                event.target !== inputRef.current) {
                setShowCommandSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Helper function to format file size
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    // Helper function to get file icon based on type
    const getFileIcon = (fileType: string, fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (ext === 'xlsx' || ext === 'xls' || fileType.includes('sheet')) {
            return <FileSpreadsheet size={16} className="text-green-500" />;
        }
        if (ext === 'json' || fileType.includes('json')) {
            return <Braces size={16} className="text-purple-500" />;
        }
        return <FileText size={16} className="text-primaryCustom-500" />;
    };

    // Robust file input trigger function with fallback mechanism
    const triggerFileSelect = (inputRef: React.RefObject<HTMLInputElement>, type: 'image' | 'file') => {
        console.log(`[File Select] Triggering ${type} input`);
        console.log(`[File Select] ref:`, inputRef.current);

        // Method 1: Use ref
        if (inputRef.current) {
            console.log('[File Select] Method 1: Using ref.current.click()');
            try {
                inputRef.current.click();
                console.log('[File Select] Click triggered successfully');
            } catch (error) {
                console.error('[File Select] Click failed:', error);
                // Method 2: Fallback to querySelector
                const selector = type === 'image'
                    ? 'input[type="file"][accept="image/*"]'
                    : 'input[type="file"][accept*=".txt"]';
                const input = document.querySelector(selector) as HTMLInputElement;
                if (input) {
                    console.log('[File Select] Method 2: Using querySelector fallback');
                    input.click();
                } else {
                    console.error('[File Select] Cannot find input element');
                    toast.error('无法打开文件选择器，请刷新页面后重试');
                }
            }
        } else {
            console.error('[File Select] ref is null');
            // Try direct DOM access as last resort
            const selector = type === 'image'
                ? 'input[type="file"][accept="image/*"]'
                : 'input[type="file"][accept*=".txt"]';
            const input = document.querySelector(selector) as HTMLInputElement;
            if (input) {
                console.log('[File Select] Direct DOM access: Using querySelector');
                input.click();
            } else {
                console.error('[File Select] Cannot find input element via querySelector');
                toast.error('文件选择器未就绪，请稍后重试');
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        console.log('[CoworkView] handleSubmit called!');
        console.log('[CoworkView] Input value:', input);
        console.log('[CoworkView] Images count:', images.length);
        console.log('[CoworkView] Documents count:', documents.length);
        console.log('[CoworkView] isProcessing:', isProcessing);

        e.preventDefault();
        if ((!input.trim() && images.length === 0 && documents.length === 0) || isProcessing) {
            console.log('[CoworkView] handleSubmit: Early return - empty input or processing');
            return;
        }

        console.log('[CoworkView] Calling onSendMessage...');
        setStreamingText('');

        // Build message content with document references
        let messageContent = input;

        // Add document references with clear instructions for AI
        if (documents.length > 0) {
            const docInfo = documents.map(doc =>
                `- ${doc.name} (${formatFileSize(doc.size || 0)})`
            ).join('\n');

            const docPaths = documents.map(doc => doc.path).join('\n');

            messageContent += `\n\n[已添加 ${documents.length} 个文件]\n${docInfo}\n\n文件路径：\n${docPaths}\n\n请使用 read_file 工具读取这些文件进行分析。`;
        }

        // Send as object if images or documents exist, otherwise string for backward compat
        if (images.length > 0) {
            onSendMessage({ content: messageContent, images });
        } else {
            onSendMessage(messageContent);
        }

        setInput('');
        setImages([]);
        setDocuments([]);
        setSkillRecommendation(null); // 清除技能推荐
    };

    // 处理输入变化，检测 slash command
    const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInput(value);

        // 检测是否以 / 开头
        if (value.trim().startsWith('/')) {
            // 提取查询部分（去掉 /）
            const query = value.slice(1).trim();

            // 搜索命令
            try {
                const results = await window.ipcRenderer.invoke('commands:search', {
                    query,
                    limit: 50 // 增加到50个命令
                }) as CommandDefinition[];

                setCommandSuggestions(results);
                setShowCommandSuggestions(true);
                setSelectedSuggestionIndex(0);
                // 清除技能推荐
                setSkillRecommendation(null);
            } catch (err) {
                console.error('[CoworkView] Failed to search commands:', err);
            }
        } else {
            // 不以 / 开头，隐藏命令建议
            setShowCommandSuggestions(false);
            setCommandSuggestions([]);

            // 智能技能推荐
            const recommendation = detectIntent(value);
            setSkillRecommendation(recommendation);
        }
    };

    // 处理命令选择
    const handleSelectCommand = (command: CommandDefinition) => {
        console.log('[CoworkView] Selected command:', command.id);

        // 技能命令：填充到输入框
        if (command.requiresInput) {
            setInput(`/${command.id} `);
            setShowCommandSuggestions(false);
            // 清除技能推荐
            setSkillRecommendation(null);

            // 聚焦到输入框
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        } else {
            // 系统命令：直接执行
            window.ipcRenderer.invoke('commands:execute', command.id)
                .then((result: unknown) => {
                    const typedResult = result as { success: boolean; error?: string };
                    if (!typedResult.success) {
                        console.error('[CoworkView] Command execution failed:', typedResult.error);
                    }
                })
                .catch((err: Error) => {
                    console.error('[CoworkView] Command execution error:', err);
                })
                .finally(() => {
                    setShowCommandSuggestions(false);
                });
        }
    };

    // 处理技能推荐应用
    const handleApplySkillRecommendation = () => {
        if (!skillRecommendation) return;

        // 自动填充技能命令到输入框
        setInput(`/${skillRecommendation.skillId} `);
        setSkillRecommendation(null);

        // 聚焦到输入框
        setTimeout(() => {
            inputRef.current?.focus();
        }, 100);
    };

    // 处理技能推荐忽略
    const handleDismissSkillRecommendation = () => {
        setSkillRecommendation(null);
    };

    // 处理依赖安装
    const handleInstallDependency = async (): Promise<boolean> => {
        try {
            const result = await window.ipcRenderer.invoke(
                'python:install-dependency',
                dependencyInfo.packageName
            ) as { success: boolean };

            return result.success;
        } catch (error) {
            console.error('[CoworkView] Failed to install dependency:', error);
            return false;
        }
    };

    const handleDismissDependencyDialog = () => {
        setShowDependencyDialog(false);
    };

    // 处理删除确认
    const handleDeleteConfirm = async () => {
        const { id } = deleteConfirm;
        console.log('[CoworkView] Sending delete confirmation:', { id, approved: true });

        // 发送确认响应到主进程
        await window.ipcRenderer.invoke('agent:delete-confirmation', {
            id,
            approved: true
        });

        // 关闭对话框
        setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
    };

    const handleDeleteCancel = async () => {
        const { id } = deleteConfirm;
        console.log('[CoworkView] Sending delete cancellation:', { id, approved: false });

        // 发送取消响应到主进程
        await window.ipcRenderer.invoke('agent:delete-confirmation', {
            id,
            approved: false
        });

        // 关闭对话框
        setDeleteConfirm(prev => ({ ...prev, isOpen: false }));
    };

    // 处理权限确认
    const handlePermissionConfirm = async () => {
        const { id } = permissionConfirm;
        console.log('[CoworkView] Sending permission confirmation:', { id, approved: true });

        // 发送确认响应到主进程
        window.ipcRenderer.send('agent:permission-confirmation', {
            id,
            approved: true
        });

        // 关闭对话框
        setPermissionConfirm(prev => ({ ...prev, isOpen: false }));
    };

    const handlePermissionCancel = async () => {
        const { id } = permissionConfirm;
        console.log('[CoworkView] Sending permission cancellation:', { id, approved: false });

        // 发送取消响应到主进程
        window.ipcRenderer.send('agent:permission-confirmation', {
            id,
            approved: false
        });

        // 关闭对话框
        setPermissionConfirm(prev => ({ ...prev, isOpen: false }));
    };

    // 处理命令面板命令选择
    const handleCommandPaletteSelect = async (command: CommandDefinition) => {
        try {
            // 执行命令（通过 IPC 发送到主进程）
            await window.ipcRenderer.invoke('commands:execute', {
                id: command.id,
                type: command.type,
                input: command.requiresInput ? input : undefined
            });

            // 如果是技能命令，将其添加到输入框
            if (command.type === 'skill') {
                setInput(`/${command.name} `);
                inputRef.current?.focus();
            }
        } catch (error) {
            console.error('[CoworkView] Failed to execute command:', error);
        }
    };

    // 处理键盘导航
    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showCommandSuggestions || commandSuggestions.length === 0) {
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedSuggestionIndex((prev) =>
                    prev < commandSuggestions.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedSuggestionIndex((prev) =>
                    prev > 0 ? prev - 1 : commandSuggestions.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                const selectedCommand = commandSuggestions[selectedSuggestionIndex];
                if (selectedCommand) {
                    handleSelectCommand(selectedCommand);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setShowCommandSuggestions(false);
                break;
        }
    };

    const handleSelectFolder = async () => {
        const folder = await window.ipcRenderer.invoke('dialog:select-folder') as string | null;
        if (folder) {
            setWorkingDir(folder);
            // Set as primary working directory (also authorizes it)
            await window.ipcRenderer.invoke('agent:set-working-dir', folder);
        }
    };

    const handleOpenFile = async () => {
        const filePath = await window.ipcRenderer.invoke('dialog:select-file') as string | null;
        if (filePath) {
            setPreviewFilePath(filePath);
        }
    };

    // Image Input Handlers
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log('[handleFileSelect] Triggered');
        console.log('[handleFileSelect] Files:', e.target.files);

        const files = e.target.files;
        if (files) {
            console.log(`[handleFileSelect] Processing ${files.length} files`);
            Array.from(files).forEach(file => {
                console.log(`[handleFileSelect] File: ${file.name}, type: ${file.type}`);
                if (file.type.startsWith('image/')) {
                    console.log('[handleFileSelect] Processing as image');
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const result = e.target?.result as string;
                        if (result) {
                            console.log('[handleFileSelect] Image loaded, adding to state');
                            setImages(prev => {
                                const newImages = [...prev, result];
                                console.log(`[handleFileSelect] Total images: ${newImages.length}`);
                                return newImages;
                            });
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Document/All Files Input Handler
    const handleDocumentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log('[handleDocumentSelect] Triggered');
        console.log('[handleDocumentSelect] Files:', e.target.files);

        const files = e.target.files;
        if (files) {
            console.log(`[handleDocumentSelect] Processing ${files.length} files`);
            for (const file of Array.from(files)) {
                console.log(`[handleDocumentSelect] File: ${file.name}, type: ${file.type}, size: ${file.size}`);
                await processDroppedFile(file);
            }
        }
        // Reset input
        if (documentInputRef.current) documentInputRef.current.value = '';
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const blob = items[i].getAsFile();
                if (blob) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const result = e.target?.result as string;
                        if (result) {
                            setImages(prev => [...prev, result]);
                        }
                    };
                    reader.readAsDataURL(blob);
                }
            }
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const removeDocument = (index: number) => {
        setDocuments(prev => prev.filter((_, i) => i !== index));
    };

    // Drag and drop handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        setShowAttachmentMenu(false); // Close attachment menu when dragging
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Only clear drag state when actually leaving the container
        // (not when hovering over child elements)
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;

        if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
            setIsDragging(false);
        }
    };

    /**
     * Optimized file drop handler with parallel processing
     * Based on Vercel React Best Practices - async-parallel rule
     *
     * Processes multiple files concurrently instead of sequentially,
     * reducing total upload time for multiple files by ~40-60%
     */
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files: File[] = [];
        if (e.dataTransfer.items) {
            // Use DataTransferItemList interface
            [...e.dataTransfer.items].forEach((item) => {
                if (item.kind === 'file') {
                    const file = item.getAsFile();
                    if (file) files.push(file);
                }
            });
        } else {
            // Fallback: use DataTransfer.files interface
            files.push(...e.dataTransfer.files);
        }

        // Optimized: Process files in parallel instead of sequentially
        // This reduces the waterfall effect when uploading multiple files
        await Promise.all(files.map(file => processDroppedFile(file)));
    };

    // Process a single dropped file
    const processDroppedFile = async (file: File) => {
        const fileType = file.type;
        const fileName = file.name;

        // Image files
        if (fileType.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                if (result) {
                    setImages(prev => [...prev, result]);
                }
            };
            reader.readAsDataURL(file);
            return;
        }

        // Text documents (txt, md, json, csv)
        const textExtensions = ['txt', 'md', 'json', 'csv'];
        const ext = fileName.split('.').pop()?.toLowerCase();

        if (ext && textExtensions.includes(ext)) {
            // Save to temp directory and show as preview card
            const arrayBuffer = await file.arrayBuffer();
            const result = await window.ipcRenderer.invoke('fs:save-temp-file', {
                name: fileName,
                data: Array.from(new Uint8Array(arrayBuffer))
            }) as { success: boolean; path: string; error?: string };

            if (result.success) {
                setDocuments(prev => [...prev, {
                    name: fileName,
                    path: result.path,
                    type: fileType,
                    size: file.size
                }]);
            } else {
                console.error('Failed to save text file:', result.error);
            }
            return;
        }

        // Excel files (xlsx, xls)
        if (ext === 'xlsx' || ext === 'xls') {
            // Save to temp directory via IPC
            const arrayBuffer = await file.arrayBuffer();
            const result = await window.ipcRenderer.invoke('fs:save-temp-file', {
                name: fileName,
                data: Array.from(new Uint8Array(arrayBuffer))
            }) as { success: boolean; path: string; error?: string };

            if (result.success) {
                setDocuments(prev => [...prev, {
                    name: fileName,
                    path: result.path,
                    type: fileType,
                    size: file.size
                }]);
            } else {
                console.error('Failed to save temp file:', result.error);
            }
            return;
        }

        // Unsupported file type
        console.warn(`Unsupported file type: ${fileType} (${fileName})`);
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Focus input on Ctrl/Cmd+L
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                inputRef.current?.focus();
            }
            // Open command palette on Ctrl/Cmd+Shift+P
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
                e.preventDefault();
                setShowCommandPalette(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    /**
     * Toggle block expansion/collapse
     * Uses manual Set update for optimal performance
     * Consistent with FloatingChat.tsx implementation
     */
    const toggleBlock = useCallback((id: string) => {
        setExpandedBlocks(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    /**
     * Cached filtered history to avoid recomputation on every render
     * Only recalculates when history array changes
     * Based on Vercel React Best Practices - rerender-derived-state
     */
    const relevantHistory = useMemo(
        () => history.filter(m => (m.role as string) !== 'system'),
        [history]
    );

    return (
        <div className="flex flex-col h-full bg-slate-50 relative">
            {/* Full-screen drag overlay */}
            {isDragging && (
                <div className="fixed inset-0 flex items-center justify-center bg-primaryCustom-50/90 backdrop-blur-sm z-50 animate-in fade-in duration-200">
                    <div className="text-center">
                        <FileUp size={64} className="mx-auto mb-4 text-primaryCustom-500 animate-bounce" />
                        <p className="text-2xl font-bold text-primaryCustom-700">松开添加文件</p>
                        <p className="text-base text-primaryCustom-600 mt-2">支持图片、txt、md、json、csv、xlsx</p>
                        <div className="mt-6 flex justify-center gap-4 text-sm text-primaryCustom-500">
                            <span className="flex items-center gap-1"><Image size={16} /> 图片</span>
                            <span className="flex items-center gap-1"><FileText size={16} /> 文档</span>
                            <span className="flex items-center gap-1"><Table size={16} /> 表格</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Dependency Install Dialog */}
            <DependencyInstallDialog
                isOpen={showDependencyDialog}
                title={dependencyInfo.title}
                message={dependencyInfo.message}
                solution={dependencyInfo.solution}
                canAutoFix={dependencyInfo.canAutoFix}
                onInstall={handleInstallDependency}
                onDismiss={handleDismissDependencyDialog}
            />

            {/* Command Palette */}
            <CommandPalette
                isOpen={showCommandPalette}
                onClose={() => setShowCommandPalette(false)}
                onSelectCommand={handleCommandPaletteSelect}
            />

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirm.isOpen}
                type="delete"
                deleteOperation={deleteConfirm.operation}
                onConfirm={handleDeleteConfirm}
                onCancel={handleDeleteCancel}
                confirmText="确认删除"
                cancelText="取消删除"
            />

            {/* Permission Confirmation Dialog */}
            <ConfirmDialog
                isOpen={permissionConfirm.isOpen}
                type="custom"
                title="⚠️ 需要权限确认"
                message={
                    <div className="space-y-3">
                        <p className="text-slate-700">AI 正在尝试执行以下操作：</p>
                        <div className="bg-slate-100 rounded-lg p-3">
                            <code className="text-sm text-red-600 break-all">
                                {permissionConfirm.permission.command}
                            </code>
                        </div>
                        {permissionConfirm.permission.workingDir && (
                            <p className="text-sm text-slate-500">
                                工作目录：{permissionConfirm.permission.workingDir}
                            </p>
                        )}
                        <p className="text-sm text-orange-600 font-medium">
                            此操作涉及文件系统修改，请确认是否允许执行
                        </p>
                    </div>
                }
                onConfirm={handlePermissionConfirm}
                onCancel={handlePermissionCancel}
                confirmText="允许执行"
                cancelText="拒绝执行"
            />

            {/* Image Lightbox */}
            {selectedImage && (
                <div
                    className="absolute inset-0 z-50 bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors"
                        onClick={() => setSelectedImage(null)}
                    >
                        <X size={24} />
                    </button>
                    <img
                        src={selectedImage}
                        alt="Full size"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                    />
                </div>
            )}

            {/* File Preview Overlay */}
            {previewFilePath && (
                <FilePreview
                    filePath={previewFilePath}
                    onClose={() => setPreviewFilePath(null)}
                />
            )}

            {/* Top Bar with Mode Tabs and Settings */}
            <div className="border-b border-slate-200 bg-white/90 backdrop-blur-sm px-6 py-2.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    {/* Mode Tabs */}
                    <div className="flex items-center gap-0.5 bg-slate-100/80 p-0.5 rounded-lg">
                        <button
                            onClick={() => setMode('chat')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'chat' ? 'bg-white text-primaryCustom-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <MessageCircle size={14} />
                            Chat
                        </button>
                        <button
                            onClick={() => setMode('work')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'work' ? 'bg-white text-accentCustom-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Zap size={14} />
                            Work
                        </button>
                    </div>
                </div>

                {/* History + Settings */}
                <div className="flex items-center gap-2">
                    {workingDir && (
                        <span className="text-xs text-slate-400 font-mono truncate max-w-32 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                            📂 {workingDir.split(/[\\/]/).pop()}
                        </span>
                    )}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => window.ipcRenderer.invoke('agent:new-session')}
                            className="p-1.5 text-slate-400 hover:text-primaryCustom-600 hover:bg-primaryCustom-50 rounded-lg transition-colors"
                            title="新会话"
                        >
                            <Plus size={16} />
                        </button>
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className={`p-1.5 text-slate-400 hover:text-primaryCustom-600 hover:bg-primaryCustom-50 rounded-lg transition-colors ${showHistory ? 'bg-primaryCustom-50 text-primaryCustom-600' : ''}`}
                            title="历史记录"
                        >
                            <History size={16} />
                        </button>
                    </div>
                    <button
                        onClick={() => setShowCommandPalette(true)}
                        className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="命令面板 (Ctrl+Shift+P)"
                    >
                        <Search size={16} />
                    </button>
                    <button
                        onClick={onOpenSettings}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Settings"
                    >
                        <Settings size={16} />
                    </button>
                </div>
            </div>

            {/* History Panel - Floating Popover */}
            {showHistory && (
                <div className="absolute top-12 right-6 z-20 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-1 ring-black/5">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <History size={14} className="text-primaryCustom-500" />
                            <span className="text-sm font-semibold text-slate-700">历史任务</span>
                        </div>
                        <button
                            onClick={() => setShowHistory(false)}
                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    <div className="max-h-[320px] overflow-y-auto p-2">
                        {sessions.length === 0 ? (
                            <div className="py-8 text-center">
                                <p className="text-sm text-stone-400">暂无历史会话</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {sessions.map((session) => (
                                    <div
                                        key={session.id}
                                        className="group relative p-3 rounded-lg hover:bg-stone-50 transition-colors border border-transparent hover:border-stone-100"
                                    >
                                        <p className="text-xs font-medium text-stone-700 line-clamp-2 leading-relaxed">
                                            {session.title}
                                        </p>
                                        <p className="text-[10px] text-stone-400 mt-1">
                                            {new Date(session.updatedAt).toLocaleString('zh-CN', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => {
                                                    window.ipcRenderer.invoke('session:load', session.id);
                                                    setShowHistory(false);
                                                }}
                                                className="text-[10px] flex items-center gap-1 text-primaryCustom-500 hover:text-primaryCustom-600 bg-primaryCustom-50 px-2 py-0.5 rounded-full"
                                            >
                                                加载
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    await window.ipcRenderer.invoke('session:delete', session.id);
                                                    setSessions(sessions.filter(s => s.id !== session.id));
                                                }}
                                                className="p-1 text-stone-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Messages Area - Narrower for better readability */}
            <div
                className="flex-1 overflow-y-auto px-4 py-6"
                ref={scrollRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="max-w-xl mx-auto space-y-5">
                    {relevantHistory.length === 0 && !streamingText ? (
                        <EmptyState 
                            mode={mode} 
                            workingDir={workingDir} 
                            onAction={(text) => {
                                setInput(text);
                                inputRef.current?.focus();
                            }}
                        />
                    ) : (
                        <>
                            {relevantHistory.map((msg, idx) => (
                                <MessageItem
                                    key={idx}
                                    message={msg}
                                    expandedBlocks={expandedBlocks}
                                    toggleBlock={toggleBlock}
                                    showTools={mode === 'work'}
                                    onImageClick={setSelectedImage}
                                />
                            ))}

                            {streamingText && (
                                <div className="animate-in fade-in duration-200">
                                    <div className="text-slate-700 text-[15px] leading-7 max-w-none">
                                        <MarkdownRenderer content={streamingText} />
                                        <span className="inline-block w-2 h-5 bg-primaryCustom-500 ml-0.5 animate-pulse" />
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {isProcessing && !streamingText && (
                        <div className="flex items-center gap-2 text-slate-400 text-sm animate-pulse bg-white p-3 rounded-xl border border-slate-100">
                            <div className="w-2 h-2 bg-primaryCustom-500 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-primaryCustom-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            <div className="w-2 h-2 bg-primaryCustom-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                            <span>正在干活中，请稍候...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Input */}
            <div className="bg-white p-4 shadow-lg shadow-slate-200/50">
                <div className="max-w-xl mx-auto">
                    {/* Image Preview Area */}
                    {images.length > 0 && (
                        <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
                            {images.map((img, idx) => (
                                <div key={idx} className="relative w-16 h-16 rounded-lg border border-slate-200 overflow-hidden shrink-0 group">
                                    <img src={img} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => removeImage(idx)}
                                        className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Document Preview Area */}
                    {documents.length > 0 && (
                        <div className="flex gap-2 mb-2 flex-wrap">
                            {documents.map((doc, idx) => (
                                <div key={idx} className="bg-white border border-slate-200 rounded-lg px-3 py-2 flex items-center gap-2 shrink-0 min-w-[140px]">
                                    {getFileIcon(doc.type, doc.name)}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs text-slate-700 truncate" title={doc.name}>{doc.name}</div>
                                        {doc.size !== undefined && (
                                            <div className="text-[10px] text-slate-400">{formatFileSize(doc.size)}</div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => removeDocument(idx)}
                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                        title="移除文件"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* File type hint */}
                    <div className="text-xs text-slate-400 text-center py-1">
                        支持拖拽上传图片、txt、md、json、csv、xlsx 文件
                    </div>

                    {/* Input container with relative positioning for popups */}
                    <div className="relative">
                        <form onSubmit={handleSubmit}>
                            <div className="input-bar">
                                <button type="button" onClick={handleSelectFolder} className="p-2.5 text-slate-400 hover:text-slate-600 transition-colors" title="选择工作目录">
                                    <FolderOpen size={18} />
                                </button>

                                {/* Attachment Menu Button */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                                        className={`p-2.5 transition-colors ${
                                            showAttachmentMenu
                                                ? 'text-primaryCustom-600 bg-primaryCustom-50'
                                                : 'text-slate-400 hover:text-primaryCustom-600 hover:bg-primaryCustom-50'
                                        }`}
                                        title="附件（图片、文件、预览）"
                                    >
                                        <Plus size={18} />
                                    </button>

                                    {/* Attachment Menu Popup */}
                                    {showAttachmentMenu && (
                                        <div
                                            ref={attachmentMenuRef}
                                            className="absolute bottom-full left-0 mb-2 z-20 w-48
                                                       bg-white rounded-2xl shadow-xl border border-slate-100
                                                       overflow-hidden animate-in fade-in zoom-in-95 duration-200
                                                       ring-1 ring-black/5"
                                        >
                                            <div className="py-1">
                                                {/* Upload Image */}
                                                <button
                                                    onClick={() => {
                                                        triggerFileSelect(fileInputRef, 'image');
                                                        setShowAttachmentMenu(false);
                                                    }}
                                                    className="flex items-center gap-3 w-full px-3 py-2.5
                                                               text-sm text-slate-700 hover:bg-slate-50
                                                               transition-colors cursor-pointer"
                                                >
                                                    <Image size={16} className="text-slate-500" />
                                                    <span>上传图片</span>
                                                </button>

                                                {/* Upload File */}
                                                <button
                                                    onClick={() => {
                                                        triggerFileSelect(documentInputRef, 'file');
                                                        setShowAttachmentMenu(false);
                                                    }}
                                                    className="flex items-center gap-3 w-full px-3 py-2.5
                                                               text-sm text-slate-700 hover:bg-slate-50
                                                               transition-colors cursor-pointer"
                                                >
                                                    <FileText size={16} className="text-slate-500" />
                                                    <span>上传文件</span>
                                                </button>

                                                {/* File Preview */}
                                                <button
                                                    onClick={() => {
                                                        handleOpenFile();
                                                        setShowAttachmentMenu(false);
                                                    }}
                                                    className="flex items-center gap-3 w-full px-3 py-2.5
                                                               text-sm text-slate-700 hover:bg-slate-50
                                                               transition-colors cursor-pointer"
                                                >
                                                    <Eye size={16} className="text-slate-500" />
                                                    <span>文件预览</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                {/* Hidden file inputs */}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    multiple
                                    onChange={handleFileSelect}
                                />
                                <input
                                    type="file"
                                    ref={documentInputRef}
                                    className="hidden"
                                    accept="image/*,.txt,.md,.json,.csv,.xlsx,.xls"
                                    multiple
                                    onChange={handleDocumentSelect}
                                />
                                </div>

                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={handleInputChange}
                                    onKeyDown={handleInputKeyDown}
                                    onPaste={handlePaste}
                                    placeholder={mode === 'chat' ? "输入消息或输入 / 使用技能... (Ctrl+L 聚焦)" : workingDir ? "输入任务或问题，例如：帮我分析这个文件、生成代码、优化性能等 (Ctrl+L 聚焦)" : "开始使用 AI Agent"}
                                    className="flex-1 bg-transparent text-slate-800 placeholder:text-slate-400 py-3 px-2 text-sm leading-none focus:outline-none"
                                    disabled={isProcessing}
                                />

                                {/* Model Selector */}
                                <div className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-slate-500 border-l border-slate-100 leading-none">
                                    <span className="font-medium max-w-20 truncate">{modelName}</span>
                                    <ChevronDown size={14} />
                                </div>

                                <div className="pr-2">
                                    {isProcessing ? (
                                        <button
                                            type="button"
                                            onClick={onAbort}
                                            className="p-2.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                                            title="停止生成 (AI 正在回复时)"
                                        >
                                            <Square size={18} fill="currentColor" />
                                        </button>
                                    ) : (
                                        <button
                                            type="submit"
                                            disabled={!input.trim() && images.length === 0 && documents.length === 0}
                                            className={`p-2.5 rounded-lg transition-all ${input.trim() || images.length > 0 || documents.length > 0
                                                ? 'bg-primaryCustom-600 text-white shadow-md hover:bg-primaryCustom-700 shadow-primaryCustom-200'
                                                : 'bg-slate-100 text-slate-300'
                                                }`}
                                            title="发送消息"
                                        >
                                            <ArrowUp size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                    </form>
                    </div>

                    {/* 智能技能推荐气泡 */}
                    {skillRecommendation && !showCommandSuggestions && (
                        <div className="absolute bottom-full left-0 right-0 mb-2 z-50">
                            <SkillSuggestionBubble
                                skillName={skillRecommendation.skillName}
                                reason={skillRecommendation.reason}
                                onApply={handleApplySkillRecommendation}
                                onDismiss={handleDismissSkillRecommendation}
                            />
                        </div>
                    )}

                    {/* 命令建议列表 */}
                    {showCommandSuggestions && commandSuggestions.length > 0 && (
                        <div
                            ref={commandSuggestionsRef}
                            className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200"
                        >
                            <div className="max-h-[400px] overflow-y-auto">
                                {commandSuggestions.map((cmd, index) => (
                                    <button
                                        key={cmd.id}
                                        type="button"
                                        onClick={() => handleSelectCommand(cmd)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                                            index === selectedSuggestionIndex
                                                ? 'bg-primaryCustom-50 text-primaryCustom-700'
                                                : 'hover:bg-slate-50 text-slate-700'
                                        }`}
                                    >
                                        {/* Emoji 或图标 */}
                                        <div className={`text-2xl shrink-0 ${
                                            index === selectedSuggestionIndex ? 'transform scale-110' : ''
                                        }`}>
                                            {cmd.emoji || getCommandIcon(cmd.icon || 'HelpCircle')}
                                        </div>

                                        {/* 主要信息 */}
                                        <div className="flex-1 min-w-0">
                                            {/* 标题 */}
                                            <div className={`font-semibold text-base truncate ${
                                                index === selectedSuggestionIndex ? 'text-primaryCustom-700' : 'text-slate-800'
                                            }`}>
                                                {(cmd as any).title || cmd.name}
                                            </div>

                                            {/* 描述 */}
                                            <div className={`text-sm truncate mt-0.5 ${
                                                index === selectedSuggestionIndex ? 'text-primaryCustom-600' : 'text-slate-500'
                                            }`}>
                                                {cmd.description}
                                            </div>

                                            {/* 使用场景（如果有） */}
                                            {(cmd as any).scenarios && (cmd as any).scenarios.length > 0 && (
                                                <div className={`text-xs mt-1 italic ${
                                                    index === selectedSuggestionIndex ? 'text-primaryCustom-500' : 'text-slate-400'
                                                }`}>
                                                    💡 {(cmd as any).scenarios[0]}
                                                </div>
                                            )}
                                        </div>

                                        {/* 难度评级 */}
                                        {(cmd as any).difficulty && (
                                            <div className={`text-xs px-2 py-1 rounded-md shrink-0 font-medium ${
                                                index === selectedSuggestionIndex
                                                    ? 'bg-primaryCustom-100 text-primaryCustom-700'
                                                    : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                {(cmd as any).difficulty}
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                                <p className="text-[11px] text-slate-500">
                                    使用 ↑↓ 导航，Enter 选择，Esc 关闭
                                </p>
                                <p className="text-[11px] text-slate-400">
                                    {commandSuggestions.length} 个技能
                                </p>
                            </div>
                        </div>
                    )}

                    <p className="text-[11px] text-slate-400 text-center mt-3">
                        AI 可能会出错，请仔细核查重要信息
                    </p>
                </div>
            </div>
        </div>
    );
}

interface MessageItemProps {
    message: Anthropic.MessageParam;
    expandedBlocks: Set<string>;
    toggleBlock: (id: string) => void;
    showTools: boolean;
    onImageClick: (src: string) => void;
}

function MessageItem({ message, expandedBlocks, toggleBlock, showTools, onImageClick }: MessageItemProps) {
    const isUser = message.role === 'user';

    if (isUser && Array.isArray(message.content) && message.content[0]?.type === 'tool_result') {
        return null;
    }

    if (isUser) {
        const contentArray = Array.isArray(message.content) ? message.content : [];
        const text = typeof message.content === 'string' ? message.content :
            contentArray.find((b): b is Anthropic.TextBlockParam => 'type' in b && b.type === 'text')?.text || '';

        // Extract images from user message
        const images = contentArray.filter((b): b is Anthropic.ImageBlockParam => 'type' in b && b.type === 'image');

        return (
            <div className="space-y-2 max-w-[85%]">
                {images.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                        {images.map((img, i: number) => {
                            // ✅ 正确处理 source 类型（兼容 Anthropic API 格式）
                            const source = img.source as { type?: string; media_type: string; data: string };
                            const src = `data:${source.media_type};base64,${source.data}`;
                            return (
                                <img
                                    key={i}
                                    src={src}
                                    alt="User upload"
                                    className="w-32 h-32 object-cover rounded-xl border border-stone-200 cursor-zoom-in hover:opacity-90 transition-opacity"
                                    onClick={() => onImageClick(src)}
                                    onError={(e) => {
                                        console.error('图片加载失败:', e);
                                        console.error('图片数据:', source);
                                    }}
                                />
                            );
                        })}
                    </div>
                )}
                {text && (
                    <div className="user-bubble inline-block">
                        {text}
                    </div>
                )}
            </div>
        );
    }

    const blocks = Array.isArray(message.content) ? message.content : [{ type: 'text' as const, text: message.content as string }];

    type ContentBlock = { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> };
    type ToolGroup = { type: 'tool_group'; items: ContentBlock[]; count: number };
    const groupedBlocks: (ContentBlock | ToolGroup)[] = [];
    let currentToolGroup: ContentBlock[] = [];

    blocks.forEach((block) => {
        const b = block as ContentBlock;
        if (b.type === 'tool_use') {
            currentToolGroup.push(b);
        } else {
            if (currentToolGroup.length > 0) {
                groupedBlocks.push({ type: 'tool_group', items: currentToolGroup, count: currentToolGroup.length });
                currentToolGroup = [];
            }
            groupedBlocks.push(b);
        }
    });
    if (currentToolGroup.length > 0) {
        groupedBlocks.push({ type: 'tool_group', items: currentToolGroup, count: currentToolGroup.length });
    }

    return (
        <div className="space-y-4">
            {groupedBlocks.map((block, i: number) => {
                if (block.type === 'text' && block.text) {
                    return (
                        <div key={i} className="prose prose-slate prose-sm max-w-none bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                            <MarkdownRenderer content={block.text} />
                        </div>
                    );
                }

                if (block.type === 'tool_group' && showTools) {
                    const toolGroup = block as ToolGroup;
                    return (
                        <div key={i} className="space-y-2">
                            {toolGroup.count > 1 && (
                                <div className="steps-indicator mb-2">
                                    <ChevronUp size={12} />
                                    <span>{toolGroup.count} steps</span>
                                </div>
                            )}

                            {toolGroup.items.map((tool, j: number) => {
                                const blockId = tool.id || `tool-${i}-${j}`;
                                const isExpanded = expandedBlocks.has(blockId);

                                return (
                                    <div key={j} className="command-block">
                                        <div
                                            className="command-block-header"
                                            onClick={() => toggleBlock(blockId)}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <span className="text-slate-400 text-sm">⌘</span>
                                                <span className="text-sm text-slate-600 font-medium">{tool.name || 'Running command'}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {tool.name === 'write_file' && (
                                                    <Download size={14} className="text-slate-400" />
                                                )}
                                                <ChevronDown
                                                    size={16}
                                                    className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                />
                                            </div>
                                        </div>
                                        {isExpanded && (
                                            <div className="p-3 bg-slate-50 border-t border-slate-100">
                                                {/* For Context Skills (empty input), show a friendly message */}
                                                {Object.keys(tool.input || {}).length === 0 ? (
                                                    <div className="text-xs text-emerald-600 font-medium">
                                                        ✓ Skill loaded into context
                                                    </div>
                                                ) : (
                                                    <pre className="text-xs font-mono text-slate-500 whitespace-pre-wrap overflow-x-auto">
                                                        {JSON.stringify(tool.input, null, 2)}
                                                    </pre>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                }

                return null;
            })}
        </div>
    );
}

function EmptyState({ mode: _mode, workingDir: _workingDir, onAction }: { mode: Mode, workingDir: string | null, onAction: (text: string) => void }) {
    return (
        <div className="relative flex flex-col items-center justify-center h-full text-center space-y-8 py-10">
            {/* 背景网格纹理 */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                <div className="w-full h-full" style={{
                    backgroundImage: `
                        linear-gradient(90deg, #FF6B6B 1px, transparent 1px),
                        linear-gradient(#FF6B6B 1px, transparent 1px)
                    `,
                    backgroundSize: '40px 40px'
                }} />
            </div>

            {/* 渐变光晕 */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primaryCustom-100 rounded-full blur-3xl opacity-50" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accentCustom-100 rounded-full blur-3xl opacity-50" />
            </div>

            {/* 内容 */}
            <div className="relative z-10 space-y-8 max-w-md animate-in fade-in duration-500">
                {/* Logo */}
                <div className="relative group inline-block">
                    <div className="absolute -inset-4 bg-gradient-to-r from-primaryCustom-200 to-accentCustom-200 rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                    <div className="relative w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center border border-white/50 ring-1 ring-black/5 transform group-hover:scale-105 transition-transform duration-300">
                        <img src="/logo_new.svg" alt="Logo" className="w-14 h-14 object-contain" />
                    </div>
                </div>

                {/* 大标题 */}
                <div className="space-y-3">
                    <h2 className="text-4xl font-bold tracking-tight text-dark-900">
                        你的 AI
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primaryCustom-500 to-accentCustom-500">
                            技能伙伴
                        </span>
                    </h2>
                    <p className="text-slate-500 text-base">
                        通过技能生态轻松构建、分享、售卖和学习 AI 技能
                    </p>
                </div>

                {/* 快捷操作卡片 */}
                <div className="grid grid-cols-2 gap-4 w-full max-w-lg px-4">
                    {[
                        {
                            icon: PenTool,
                            label: '快速创作',
                            action: '帮我创作一篇关于[主题]的文章/代码/文档，要求：[具体需求]',
                            color: 'from-primaryCustom-500 to-primaryCustom-600',
                            bgColor: 'bg-primaryCustom-50 border-primaryCustom-200'
                        },
                        {
                            icon: FileSearch,
                            label: '智能分析',
                            action: '分析这段[内容/代码/数据]的核心要点和关键信息',
                            color: 'from-accentCustom-500 to-accentCustom-600',
                            bgColor: 'bg-accentCustom-50 border-accentCustom-200'
                        },
                        {
                            icon: Zap,
                            label: '优化改进',
                            action: '优化改进这段[内容/代码]，提升[质量/性能/可读性]',
                            color: 'from-warm-400 to-warm-500',
                            bgColor: 'bg-warm-50 border-warm-200'
                        },
                        {
                            icon: Lightbulb,
                            label: '创意启发',
                            action: '给我一些关于[主题]的创意想法和灵感，越新颖越好',
                            color: 'from-green-500 to-green-600',
                            bgColor: 'bg-green-50 border-green-200'
                        }
                    ].map((item, i) => (
                        <button
                            key={i}
                            onClick={() => onAction(item.action)}
                            className="group relative p-5 bg-white border-2 border-transparent rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                        >
                            {/* 渐变边框效果 */}
                            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${item.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                            <div className="relative z-10 flex items-center gap-3 text-left">
                                <div className={`p-3 rounded-xl ${item.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                                    <item.icon size={20} className="text-slate-700" />
                                </div>
                                <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
