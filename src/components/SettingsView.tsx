import { useState, useEffect } from 'react';
import { X, Settings, FolderOpen, Server, Check, Plus } from 'lucide-react';

interface SettingsViewProps {
    onClose: () => void;
}

interface Config {
    apiKey: string;
    doubaoApiKey?: string;
    apiUrl: string;
    model: string;
    authorizedFolders: string[];
    networkAccess: boolean;
    shortcut: string;
}

interface ToolPermission {
    tool: string;
    pathPattern?: string;
    grantedAt: number;
}

export function SettingsView({ onClose }: SettingsViewProps) {
    const [config, setConfig] = useState<Config>({
        apiKey: '',
        doubaoApiKey: '',
        apiUrl: 'https://open.bigmodel.cn/api/coding/paas/v4',
        model: 'GLM-4.7',
        authorizedFolders: [],
        networkAccess: false,
        shortcut: 'Alt+Space'
    });
    const [saved, setSaved] = useState(false);
    const [activeTab, setActiveTab] = useState<'api' | 'folders' | 'advanced'>('api');
    const [isRecordingShortcut, setIsRecordingShortcut] = useState(false);

    // Permissions State
    const [permissions, setPermissions] = useState<ToolPermission[]>([]);

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
        window.ipcRenderer.invoke('config:get-all').then((cfg) => {
            if (cfg) {
                const loadedConfig = cfg as Config;
                // Ensure all properties are initialized to avoid uncontrolled input warning
                const safeConfig = {
                    apiKey: loadedConfig.apiKey || '',
                    doubaoApiKey: loadedConfig.doubaoApiKey || '',
                    apiUrl: loadedConfig.apiUrl || 'https://open.bigmodel.cn/api/coding/paas/v4',
                    model: loadedConfig.model || 'GLM-4.7',
                    authorizedFolders: loadedConfig.authorizedFolders || [],
                    networkAccess: loadedConfig.networkAccess ?? false,
                    shortcut: loadedConfig.shortcut || 'Alt+Space'
                };
                setConfig(safeConfig);
            }
        });
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
        console.log('[SettingsView.handleSave] Saving config:', {
            authorizedFolders: config.authorizedFolders,
            authorizedFoldersCount: config.authorizedFolders?.length
        });
        await window.ipcRenderer.invoke('config:set-all', config);
        setSaved(true);
        setTimeout(() => {
            setSaved(false);
            onClose();
        }, 800);
    };

    const addFolder = async () => {
        const result = await window.ipcRenderer.invoke('dialog:select-folder') as string | null;
        console.log('[SettingsView.addFolder] Selected folder:', result);
        const currentFolders = config.authorizedFolders || [];
        if (result && !currentFolders.includes(result)) {
            const newFolders = [...currentFolders, result];
            console.log('[SettingsView.addFolder] New folders:', newFolders);
            setConfig({ ...config, authorizedFolders: newFolders });
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
                                    <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">API Key</label>
                                    <input
                                        type="password"
                                        value={config.apiKey}
                                        onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                                        placeholder="sk-..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">豆包生图 API Key</label>
                                    <input
                                        type="password"
                                        value={config.doubaoApiKey || ''}
                                        onChange={(e) => setConfig({ ...config, doubaoApiKey: e.target.value })}
                                        placeholder="输入豆包生图 API Key"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                                    />
                                    <p className="text-xs text-slate-400 mt-2">
                                        用于生图技能的 API Key,将自动注入到 Skill 执行环境
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">API URL</label>
                                    <input
                                        type="text"
                                        value={config.apiUrl}
                                        onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                                        placeholder="https://api.anthropic.com"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1.5 uppercase tracking-wider">模型名称</label>
                                    <input
                                        type="text"
                                        value={config.model}
                                        onChange={(e) => setConfig({ ...config, model: e.target.value })}
                                        placeholder="glm-4.7"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                    <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                                        <Server size={12} />
                                        输入模型名称，如 MiniMax-M2.1
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
                                                className="flex items-center justify-between p-3 bg-white border border-stone-200 rounded-lg group"
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <FolderOpen size={16} className="text-stone-400 shrink-0" />
                                                    <span className="text-sm font-mono text-stone-600 truncate">
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

                                {/* Permissions Management */}
                                <div className="space-y-2">
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