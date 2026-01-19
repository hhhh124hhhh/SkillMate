import { useState, useEffect } from 'react';
import { X, Settings, FolderOpen, Server, Check, Plus, Sparkles } from 'lucide-react';
import { PersonalStyleTab } from './PersonalStyleTab.js';

// 路径规范化辅助函数（处理 Windows 路径格式差异）
const normalizePath = (filePath: string): string => {
    if (!filePath) return '';
    // 移除首尾空格
    let normalized = filePath.trim();
    // 统一使用反斜杠（Windows 风格）
    normalized = normalized.replace(/\//g, '\\');
    // 移除末尾的反斜杠
    normalized = normalized.replace(/\\+$/, '');
    // Windows 不区分大小写，转为小写用于比较
    return normalized.toLowerCase();
};

// 检查路径是否已存在（忽略大小写和斜杠格式）
const isFolderInList = (folder: string, folderList: string[]): boolean => {
    const normalized = normalizePath(folder);
    return folderList.some(f => normalizePath(f) === normalized);
};

interface SettingsViewProps {
    onClose: () => void;
    initialTab?: 'api' | 'folders' | 'advanced' | 'personalStyle';
}

interface Config {
    apiKey: string;
    doubaoApiKey?: string;
    apiUrl: string;
    model: string;
    authorizedFolders: string[];
    networkAccess: boolean;
    shortcut: string;
    notifications: boolean;
    notificationTypes: {
        workComplete: boolean;
        error: boolean;
        info: boolean;
    };
}

interface ToolPermission {
    tool: string;
    pathPattern?: string;
    grantedAt: number;
}

export function SettingsView({ onClose, initialTab = 'api' }: SettingsViewProps) {
    const [config, setConfig] = useState<Config>({
        apiKey: '',
        doubaoApiKey: '',
        apiUrl: 'https://open.bigmodel.cn/api/anthropic',
        model: 'GLM-4.7',
        authorizedFolders: [],
        networkAccess: false,
        shortcut: 'Alt+Space',
        notifications: true,
        notificationTypes: {
            workComplete: true,
            error: true,
            info: true
        }
    });
    const [saved, setSaved] = useState(false);
    const [activeTab, setActiveTab] = useState<'api' | 'folders' | 'advanced' | 'personalStyle'>(initialTab);
    const [isRecordingShortcut, setIsRecordingShortcut] = useState(false);
    const [lastAddedFolder, setLastAddedFolder] = useState<string | null>(null); // 用于高亮最新添加的文件夹

    // Permissions State
    const [permissions, setPermissions] = useState<ToolPermission[]>([]);

    // API Key 状态
    const [hasApiKey, setHasApiKey] = useState(false);

    const loadPermissions = () => {
        window.ipcRenderer.invoke('permissions:list').then(list => setPermissions(list as ToolPermission[]));
    };

    const revokePermission = async (tool: string, pathPattern?: string) => {
        await window.ipcRenderer.invoke('permissions:revoke', { tool, pathPattern });
        loadPermissions();
    };

    const clearAllPermissions = async () => {
        if (confirm('确定要清除所有已授权的权限吗？')) {
            await window.ipcRenderer.invoke('permissions:clear');
            loadPermissions();
        }
    };

    useEffect(() => {
        // 🔒 使用安全的配置获取（不包含 API Key）
        window.ipcRenderer.invoke('config:get-safe').then((cfg) => {
            if (cfg) {
                const loadedConfig = cfg as Partial<Config>;
                // Ensure all properties are initialized to avoid uncontrolled input warning
                const safeConfig = {
                    apiKey: '', // 🔒 API Key 不从配置加载，保持为空
                    doubaoApiKey: '', // 🔒 API Key 不从配置加载
                    apiUrl: loadedConfig.apiUrl || 'https://open.bigmodel.cn/api/anthropic',
                    model: loadedConfig.model || 'GLM-4.7',
                    authorizedFolders: loadedConfig.authorizedFolders || [],
                    networkAccess: loadedConfig.networkAccess ?? false,
                    shortcut: loadedConfig.shortcut || 'Alt+Space',
                    notifications: loadedConfig.notifications ?? true,
                    notificationTypes: {
                        workComplete: loadedConfig.notificationTypes?.workComplete ?? true,
                        error: loadedConfig.notificationTypes?.error ?? true,
                        info: loadedConfig.notificationTypes?.info ?? true
                    }
                };
                setConfig(safeConfig);
            }
        });

        // 检查 API Key 状态
        window.ipcRenderer.invoke('config:get-api-key-status').then((status) => {
            setHasApiKey((status as { hasApiKey: boolean }).hasApiKey);
        });

        // 监听配置更新事件
        const handleConfigUpdated = () => {
            // 重新加载配置
            window.ipcRenderer.invoke('config:get-safe').then((cfg) => {
                if (cfg) {
                    const loadedConfig = cfg as Partial<Config>;
                    setConfig(prevConfig => ({
                        ...prevConfig,
                        apiUrl: loadedConfig.apiUrl || 'https://open.bigmodel.cn/api/anthropic',
                        model: loadedConfig.model || 'GLM-4.7',
                        authorizedFolders: loadedConfig.authorizedFolders || [],
                        networkAccess: loadedConfig.networkAccess ?? false,
                        shortcut: loadedConfig.shortcut || 'Alt+Space',
                        notifications: loadedConfig.notifications ?? true,
                        notificationTypes: {
                            workComplete: loadedConfig.notificationTypes?.workComplete ?? true,
                            error: loadedConfig.notificationTypes?.error ?? true,
                            info: loadedConfig.notificationTypes?.info ?? true
                        }
                    }));
                }
            });

            // 重新检查 API Key 状态
            window.ipcRenderer.invoke('config:get-api-key-status').then((status) => {
                setHasApiKey((status as { hasApiKey: boolean }).hasApiKey);
            });
        };

        // 使用 on 方法，它会返回清理函数
        const removeConfigListener = window.ipcRenderer.on('config:updated', handleConfigUpdated);

        return () => {
            // 使用返回的清理函数
            removeConfigListener?.();
        };
    }, []);

    useEffect(() => {
        if (activeTab === 'advanced') {
            loadPermissions();
        }
    }, [activeTab]);

    // Shortcut recording handler
    const handleShortcutKeyDown = (e: React.KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const parts: string[] = [];
        if (e.ctrlKey) parts.push('Ctrl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');
        if (e.metaKey) parts.push('Meta');

        // Add the actual key (filter out modifier keys)
        const key = e.key;
        if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
            // Normalize key names
            const normalizedKey = key === ' ' ? 'Space' : key.length === 1 ? key.toUpperCase() : key;
            parts.push(normalizedKey);
        }

        // Allow single function keys (F1-F12) or modifier + key combinations
        const isFunctionKey = /^F\d{1,2}$/.test(parts[parts.length - 1] || '');
        if (parts.length >= 1 && (isFunctionKey || parts.length >= 2)) {
            const newShortcut = parts.join('+');
            setConfig({ ...config, shortcut: newShortcut });
            setIsRecordingShortcut(false);
            // Update the global shortcut via IPC
            window.ipcRenderer.invoke('shortcut:update', newShortcut);
        }
    };

    const handleSave = async () => {
        console.log('[SettingsView.handleSave] === Starting save ===');
        console.log('[SettingsView.handleSave] Full config object:', config);
        console.log('[SettingsView.handleSave] authorizedFolders:', config.authorizedFolders);
        console.log('[SettingsView.handleSave] authorizedFolders count:', config.authorizedFolders?.length);

        const configToSend = {
            apiKey: config.apiKey,
            doubaoApiKey: config.doubaoApiKey,
            apiUrl: config.apiUrl,
            model: config.model,
            authorizedFolders: config.authorizedFolders,
            networkAccess: config.networkAccess,
            shortcut: config.shortcut,
            notifications: config.notifications,
            notificationTypes: config.notificationTypes
        };
        console.log('[SettingsView.handleSave] Sending config to IPC:', configToSend);

        await window.ipcRenderer.invoke('config:set-all', configToSend);
        setSaved(true);
        setTimeout(() => {
            setSaved(false);
            onClose();
        }, 800);
    };

    const addFolder = async () => {
        try {
            console.log('[SettingsView.addFolder] Invoking dialog:select-folder...');
            const result = await window.ipcRenderer.invoke('dialog:select-folder') as string | null;
            console.log('[SettingsView.addFolder] Selected folder:', result);

            if (!result) {
                console.log('[SettingsView.addFolder] No folder selected (user canceled)');
                return;
            }

            const currentFolders = config.authorizedFolders || [];

            // 使用新的去重逻辑（忽略大小写和斜杠格式）
            if (isFolderInList(result, currentFolders)) {
                console.log('[SettingsView.addFolder] Folder already in list:', result);
                alert('该文件夹已在授权列表中');
                return;
            }

            // 添加新文件夹（保持原始路径格式）
            const newFolders = [...currentFolders, result];
            console.log('[SettingsView.addFolder] Adding folder. New list:', newFolders);

            // 确保状态更新
            setConfig(prev => ({
                ...prev,
                authorizedFolders: newFolders
            }));

            // 高亮最新添加的文件夹（3秒后取消高亮）
            setLastAddedFolder(result);
            setTimeout(() => setLastAddedFolder(null), 3000);

            console.log('[SettingsView.addFolder] Folder added successfully:', result);
        } catch (error) {
            console.error('[SettingsView.addFolder] Error:', error);
            alert('打开文件夹选择对话框失败：' + (error as Error).message);
        }
    };

    const removeFolder = (folder: string) => {
        const currentFolders = config.authorizedFolders || [];
        setConfig({ ...config, authorizedFolders: currentFolders.filter(f => f !== folder) });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-2xl h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-slate-100 ring-1 ring-black/5 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <Settings size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">设置</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 overflow-x-auto shrink-0 bg-white px-2">
                    {[
                        { id: 'api' as const, label: '通用', icon: <Settings size={14} /> },
                        { id: 'folders' as const, label: '权限', icon: <FolderOpen size={14} /> },
                        { id: 'personalStyle' as const, label: '个人风格', icon: <Sparkles size={14} /> },
                        { id: 'advanced' as const, label: '高级', icon: <Settings size={14} /> },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${activeTab === tab.id
                                ? 'text-blue-600 border-blue-600 bg-blue-50/50'
                                : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            {/*tab.icon*/}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-0 overflow-y-auto flex-1 bg-white">
                    <div className="p-6 space-y-6">
                        {activeTab === 'api' && (
                            <>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wider">API Key</label>
                                    <input
                                        type="password"
                                        value={config.apiKey}
                                        onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                                        placeholder={hasApiKey ? "••••••••••••••••" : "sk-..."}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                    {hasApiKey && config.apiKey === '' && (
                                        <p className="text-xs text-green-600 mt-1.5 flex items-center gap-1">
                                            <Check className="w-3.5 h-3.5" />
                                            已配置
                                        </p>
                                    )}
                                    {/* 新增：获取 API Key 说明 */}
                                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <p className="text-xs font-medium text-blue-900 mb-2">
                                            如何获取智谱 AI API Key？
                                        </p>
                                        <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                                            <li>访问 <a href="https://open.bigmodel.cn" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">智谱 AI 开放平台</a></li>
                                            <li>注册/登录并进入「API Key」页面</li>
                                            <li>生成并复制 API Key</li>
                                        </ol>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wider">豆包生图 API Key</label>
                                    <input
                                        type="password"
                                        value={config.doubaoApiKey || ''}
                                        onChange={(e) => setConfig({ ...config, doubaoApiKey: e.target.value })}
                                        placeholder="输入豆包生图 API Key"
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                    <p className="text-xs text-slate-600 mt-2">
                                        用于生图技能的 API Key,将自动注入到 Skill 执行环境
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wider">API URL</label>
                                    <input
                                        type="text"
                                        value={config.apiUrl}
                                        onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                                        placeholder="https://api.anthropic.com"
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1.5 uppercase tracking-wider">模型名称</label>
                                    <input
                                        type="text"
                                        value={config.model}
                                        onChange={(e) => setConfig({ ...config, model: e.target.value })}
                                        placeholder="glm-4.7"
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-base text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                    <p className="text-xs text-slate-600 mt-2 flex items-center gap-1">
                                        <Server size={12} />
                                        当前使用模型：GLM-4.7（固定）
                                    </p>
                                </div>
                                
                                <div className="pt-4 border-t border-slate-100">
                                    <button
                                        onClick={handleSave}
                                        disabled={saved}
                                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm ${saved
                                            ? 'bg-green-50 text-green-600 border border-green-200'
                                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                                            }`}
                                    >
                                        {saved ? <Check size={16} /> : null}
                                        {saved ? '已保存设置' : '保存设置'}
                                    </button>
                                </div>
                            </>
                        )}

                        {activeTab === 'folders' && (
                            <>
                                <div className="bg-blue-50 text-blue-700 rounded-lg p-3 text-xs">
                                    出于安全考虑，AI 只能访问以下授权的文件夹及其子文件夹。
                                </div>

                                {(config.authorizedFolders || []).length === 0 ? (
                                    <div className="text-center py-8 text-stone-400 border-2 border-dashed border-stone-200 rounded-xl">
                                        <p className="text-sm">暂无授权文件夹</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {(config.authorizedFolders || []).map((folder, idx) => (
                                            <div
                                                key={idx}
                                                className={`flex items-center justify-between p-3 bg-white border rounded-lg group transition-all ${
                                                    folder === lastAddedFolder
                                                        ? 'border-green-400 bg-green-50'
                                                        : 'border-stone-200'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <FolderOpen size={16} className={`shrink-0 ${folder === lastAddedFolder ? 'text-green-600' : 'text-stone-400'}`} />
                                                    <span className={`text-sm font-mono truncate ${folder === lastAddedFolder ? 'text-green-700' : 'text-stone-600'}`}>
                                                        {folder}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => removeFolder(folder)}
                                                    className="p-1 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <button
                                    onClick={addFolder}
                                    className="w-full py-2.5 border border-dashed border-stone-300 text-stone-500 hover:text-orange-600 hover:border-orange-500 hover:bg-orange-50 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                                >
                                    <Plus size={16} />
                                    添加文件夹
                                </button>

                                <div className="text-xs text-slate-500 mt-2 text-center">
                                    💡 提示：添加文件夹后请点击"保存设置"按钮以保存更改
                                </div>

                                <div className="pt-4 border-t border-slate-100">
                                    <button
                                        onClick={handleSave}
                                        disabled={saved}
                                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm ${saved
                                            ? 'bg-green-50 text-green-600 border border-green-200'
                                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                                            }`}
                                    >
                                        {saved ? <Check size={16} /> : null}
                                        {saved ? '已保存设置' : '保存设置'}
                                    </button>
                                </div>
                            </>
                        )}

                        {activeTab === 'personalStyle' && (
                            <PersonalStyleTab onConfigChange={() => {/* 配置变化时的回调 */}} />
                        )}

                        {activeTab === 'advanced' && (
                            <>
                                <div className="flex items-center justify-between p-3 bg-white border border-stone-200 rounded-lg">
                                    <div>
                                        <p className="text-sm font-medium text-stone-700">快捷键</p>
                                        <p className="text-xs text-stone-400">{config.shortcut} 呼出悬浮球</p>
                                    </div>
                                    {isRecordingShortcut ? (
                                        <input
                                            type="text"
                                            autoFocus
                                            className="px-3 py-1.5 text-sm border border-orange-400 rounded-lg bg-orange-50 text-orange-600 font-medium outline-none animate-pulse"
                                            placeholder="按下快捷键..."
                                            onKeyDown={handleShortcutKeyDown}
                                            onBlur={() => setIsRecordingShortcut(false)}
                                            readOnly
                                        />
                                    ) : (
                                        <button
                                            onClick={() => setIsRecordingShortcut(true)}
                                            className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg hover:bg-stone-50 text-stone-600"
                                        >
                                            {config.shortcut}
                                        </button>
                                    )}
                                </div>

                                {/* Notifications Settings */}
                                <div className="space-y-3">
                                    <p className="text-sm font-medium text-stone-700">通知设置</p>
                                    <div className="flex items-center justify-between p-3 bg-white border border-stone-200 rounded-lg">
                                        <div>
                                            <p className="text-sm text-stone-700">启用桌面通知</p>
                                            <p className="text-xs text-stone-400">牛马工作完成时会通知您</p>
                                        </div>
                                        <div className="relative inline-block w-10 h-5 transition duration-200 ease-in-out">
                                            <input
                                                type="checkbox"
                                                checked={config.notifications}
                                                onChange={(e) => setConfig({ ...config, notifications: e.target.checked })}
                                                className="sr-only"
                                            />
                                            <span className={`block h-5 rounded-full transition duration-200 ease-in-out ${config.notifications ? 'bg-blue-600' : 'bg-stone-200'}`}>
                                                <span className={`absolute left-0.5 top-0.5 w-4 h-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${config.notifications ? 'translate-x-5' : ''}`}></span>
                                            </span>
                                        </div>
                                    </div>
                                    {config.notifications && (
                                        <div className="space-y-2 pl-2">
                                            <p className="text-xs font-medium text-stone-600">通知类型</p>
                                            {[
                                                { key: 'workComplete' as const, label: '工作完成通知', description: '牛马完成工作时通知' },
                                                { key: 'error' as const, label: '错误通知', description: '发生错误时通知' },
                                                { key: 'info' as const, label: '信息通知', description: '其他信息通知' }
                                            ].map((type) => (
                                                <div key={type.key} className="flex items-center justify-between p-2 bg-stone-50 rounded-lg">
                                                    <div>
                                                        <p className="text-sm text-stone-700">{type.label}</p>
                                                        <p className="text-xs text-stone-400">{type.description}</p>
                                                    </div>
                                                    <div className="relative inline-block w-8 h-4 transition duration-200 ease-in-out">
                                                        <input
                                                            type="checkbox"
                                                            checked={config.notificationTypes[type.key]}
                                                            onChange={(e) => setConfig({
                                                                ...config,
                                                                notificationTypes: {
                                                                    ...config.notificationTypes,
                                                                    [type.key]: e.target.checked
                                                                }
                                                            })}
                                                            className="sr-only"
                                                        />
                                                        <span className={`block h-4 rounded-full transition duration-200 ease-in-out ${config.notificationTypes[type.key] ? 'bg-blue-500' : 'bg-stone-200'}`}>
                                                            <span className={`absolute left-0.5 top-0.5 w-3 h-3 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${config.notificationTypes[type.key] ? 'translate-x-4' : ''}`}></span>
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Permissions Management */}
                                <div className="space-y-2 mt-6">
                                    <p className="text-sm font-medium text-stone-700">已授权的权限</p>
                                    {(permissions || []).length === 0 ? (
                                        <p className="text-xs text-stone-400 p-3 bg-stone-50 rounded-lg">暂无已保存的权限</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {(permissions || []).map((p, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 bg-white border border-stone-200 rounded-lg">
                                                    <div className="flex-1">
                                                        <p className="text-sm font-mono text-stone-700">{p.tool}</p>
                                                        <p className="text-xs text-stone-400">{p.pathPattern === '*' ? '所有路径' : p.pathPattern}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => revokePermission(p.tool, p.pathPattern)}
                                                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                                                    >
                                                        撤销
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                onClick={clearAllPermissions}
                                                className="w-full px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                                            >
                                                清除所有权限
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* 新增分隔线 */}
                                <div className="border-t border-slate-200 my-6"></div>

                                {/* 新增：引导管理 */}
                                <div className="space-y-3">
                                    <p className="text-sm font-medium text-stone-700">引导管理</p>

                                    <div className="flex items-center justify-between p-3 bg-white border border-stone-200 rounded-lg">
                                        <div>
                                            <p className="text-sm text-stone-700">查看用户引导</p>
                                            <p className="text-xs text-stone-400">重新查看首次启动引导流程</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                window.dispatchEvent(new CustomEvent('open-user-guide'));
                                                onClose();
                                            }}
                                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                        >
                                            查看引导
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100">
                                    <button
                                        onClick={handleSave}
                                        disabled={saved}
                                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all shadow-sm ${saved
                                            ? 'bg-green-50 text-green-600 border border-green-200'
                                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                                            }`}
                                    >
                                        {saved ? <Check size={16} /> : null}
                                        {saved ? '已保存设置' : '保存设置'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}