import { useState, useEffect, useRef } from 'react';
import { Square, ArrowUp, ChevronDown, ChevronUp, Download, FolderOpen, MessageCircle, Zap, AlertTriangle, Check, X, Settings, History, Plus, Trash2, PenTool, Search, Layout, Type } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import Anthropic from '@anthropic-ai/sdk';

type Mode = 'chat' | 'work';

interface PermissionRequest {
    id: string;
    tool: string;
    description: string;
    args: Record<string, unknown>;
}

interface SessionSummary {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
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
    const [mode, setMode] = useState<Mode>('work');
    const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
    const [streamingText, setStreamingText] = useState('');
    const [workingDir, setWorkingDir] = useState<string | null>(null);
    const [modelName, setModelName] = useState('glm-4.7');
    const [permissionRequest, setPermissionRequest] = useState<PermissionRequest | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [sessions, setSessions] = useState<SessionSummary[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Load config including model name
    useEffect(() => {
        window.ipcRenderer.invoke('config:get-all').then((cfg) => {
            const config = cfg as { model?: string } | undefined;
            if (config?.model) setModelName(config.model);
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

        // Listen for permission requests
        const removeConfirmListener = window.ipcRenderer.on('agent:confirm-request', (_event, ...args) => {
            const req = args[0] as PermissionRequest;
            setPermissionRequest(req);
        });

        return () => {
            removeStreamListener?.();
            removeHistoryListener?.();
            removeConfirmListener?.();
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

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history, streamingText, images]); // Scroll when images change too

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if ((!input.trim() && images.length === 0) || isProcessing) return;

        setStreamingText('');

        // Send as object if images exist, otherwise string for backward compat
        if (images.length > 0) {
            onSendMessage({ content: input, images });
        } else {
            onSendMessage(input);
        }

        setInput('');
        setImages([]);
    };

    const handleSelectFolder = async () => {
        const folder = await window.ipcRenderer.invoke('dialog:select-folder') as string | null;
        if (folder) {
            setWorkingDir(folder);
            // Set as primary working directory (also authorizes it)
            await window.ipcRenderer.invoke('agent:set-working-dir', folder);
        }
    };

    const handlePermissionResponse = (approved: boolean) => {
        if (permissionRequest) {
            window.ipcRenderer.invoke('agent:confirm-response', {
                id: permissionRequest.id,
                approved
            });
            setPermissionRequest(null);
        }
    };

    // Image Input Handlers
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            Array.from(files).forEach(file => {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const result = e.target?.result as string;
                        if (result) {
                            setImages(prev => [...prev, result]);
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
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

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Focus input on Ctrl/Cmd+L
            if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const toggleBlock = (id: string) => {
        setExpandedBlocks(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const relevantHistory = history.filter(m => (m.role as string) !== 'system');

    return (
        <div className="flex flex-col h-full bg-slate-50 relative">
            {/* Permission Dialog Overlay */}
            {permissionRequest && (
                <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                                <AlertTriangle size={24} className="text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-800 text-lg">操作确认</h3>
                                <p className="text-sm text-slate-500">{permissionRequest.tool}</p>
                            </div>
                        </div>

                        <p className="text-slate-600 mb-4">{permissionRequest.description}</p>

                        {/* Show details if write_file */}
                        {typeof permissionRequest.args?.path === 'string' && (
                            <div className="bg-slate-50 rounded-lg p-3 mb-4 font-mono text-xs text-slate-600 border border-slate-200">
                                <span className="text-slate-400">路径: </span>
                                {permissionRequest.args.path as string}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => handlePermissionResponse(false)}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                <X size={16} />
                                拒绝
                            </button>
                            <button
                                onClick={() => handlePermissionResponse(true)}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm shadow-blue-200"
                            >
                                <Check size={16} />
                                允许
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

            {/* Top Bar with Mode Tabs and Settings */}
            <div className="border-b border-slate-200 bg-white/90 backdrop-blur-sm px-6 py-2.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    {/* Mode Tabs */}
                    <div className="flex items-center gap-0.5 bg-slate-100/80 p-0.5 rounded-lg">
                        <button
                            onClick={() => setMode('chat')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'chat' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <MessageCircle size={14} />
                            Chat
                        </button>
                        <button
                            onClick={() => setMode('work')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'work' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'
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
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="新会话"
                        >
                            <Plus size={16} />
                        </button>
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className={`p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors ${showHistory ? 'bg-blue-50 text-blue-600' : ''}`}
                            title="历史记录"
                        >
                            <History size={16} />
                        </button>
                    </div>
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
                            <History size={14} className="text-blue-500" />
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
                                                className="text-[10px] flex items-center gap-1 text-orange-500 hover:text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full"
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
            <div className="flex-1 overflow-y-auto px-4 py-6" ref={scrollRef}>
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
                                        <span className="inline-block w-2 h-5 bg-blue-500 ml-0.5 animate-pulse" />
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {isProcessing && !streamingText && (
                        <div className="flex items-center gap-2 text-slate-400 text-sm animate-pulse bg-white p-3 rounded-xl border border-slate-100">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                            <span>正在干活中，请稍候...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Input */}
            <div className="border-t border-slate-200 bg-white p-4 shadow-lg shadow-slate-200/50">
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

                    <form onSubmit={handleSubmit}>
                        <div className="input-bar">
                            <button type="button" onClick={handleSelectFolder} className="p-3 text-slate-400 hover:text-slate-600 transition-colors" title="选择工作目录">
                                <FolderOpen size={18} />
                            </button>

                            {/* Image Upload Button */}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-3 text-slate-400 hover:text-slate-600 transition-colors"
                                title="上传图片"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                multiple
                                onChange={handleFileSelect}
                            />

                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onPaste={handlePaste}
                                placeholder={mode === 'chat' ? "输入消息... (Ctrl+L 聚焦)" : workingDir ? "开始干活：找热门选题、批量生成标题、快速写作、文章排版... (Ctrl+L 聚焦)" : "请先选择工作目录"}
                                className="flex-1 bg-transparent text-slate-800 placeholder:text-slate-400 py-3 text-sm focus:outline-none"
                                disabled={isProcessing}
                            />

                            {/* Model Selector */}
                            <div className="flex items-center gap-1.5 px-3 text-xs text-slate-500 border-l border-slate-100">
                                <span className="font-medium max-w-20 truncate">{modelName}</span>
                                <ChevronDown size={12} />
                            </div>

                            <div className="pr-2">
                                {isProcessing ? (
                                    <button
                                        type="button"
                                        onClick={onAbort}
                                        className="p-2.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all"
                                    >
                                        <Square size={16} fill="currentColor" />
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={!input.trim() && images.length === 0}
                                        className={`p-2.5 rounded-lg transition-all ${input.trim() || images.length > 0
                                            ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700 shadow-blue-200'
                                            : 'bg-slate-100 text-slate-300'
                                            }`}
                                    >
                                        <ArrowUp size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </form>

                    <p className="text-[11px] text-slate-400 text-center mt-3">
                        AI 可能会出错，请仔细核查重要信息
                    </p>
                </div>
            </div>
        </div>
    );
}

function MessageItem({ message, expandedBlocks, toggleBlock, showTools, onImageClick }: {
    message: Anthropic.MessageParam,
    expandedBlocks: Set<string>,
    toggleBlock: (id: string) => void,
    showTools: boolean,
    onImageClick: (src: string) => void
}) {
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
                            const imgSource = img.source as { media_type: string; data: string };
                            const src = `data:${imgSource.media_type};base64,${imgSource.data}`;
                            return (
                                <img
                                    key={i}
                                    src={src}
                                    alt="User upload"
                                    className="w-32 h-32 object-cover rounded-xl border border-stone-200 cursor-zoom-in hover:opacity-90 transition-opacity"
                                    onClick={() => onImageClick(src)}
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

function EmptyState({ onAction }: { mode: Mode, workingDir: string | null, onAction: (text: string) => void }) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-8 py-10 animate-in fade-in duration-500">
            <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-500"></div>
                <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center relative border border-white/50 ring-1 ring-black/5 transform group-hover:scale-105 transition-transform duration-300">
                    <img src="/logo_new.svg" alt="Logo" className="w-14 h-14 object-contain" />
                </div>
            </div>
            <div className="space-y-3 max-w-md">
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                    公众号运营牛马
                </h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                    嗨，我是你的私人运营牛马！不止是聊天，更是真正能帮你干活的运营助手，开始干活吧，从选题到发布全流程搞定～
                </p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full max-w-lg px-4">
                {[
                    { icon: Search, label: '找热门选题', action: '帮我找一些热门选题', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
                    { icon: Type, label: '批量标题', action: '帮我生成10个吸引人的标题', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
                    { icon: PenTool, label: '快速写作', action: '帮我快速写一篇运营文章', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
                    { icon: Layout, label: '文章排版', action: '帮我排版这篇文章', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' }
                ].map((item, i) => (
                    <button
                        key={i}
                        onClick={() => onAction(item.action)}
                        className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group text-left hover:border-slate-300"
                    >
                        <div className="p-2.5 rounded-lg bg-slate-50 text-slate-700 group-hover:bg-slate-100 transition-all">
                            <item.icon size={18} />
                        </div>
                        <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
