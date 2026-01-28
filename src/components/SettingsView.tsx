import { useState, useEffect } from 'react';
import { X, Settings, FolderOpen, Server, Check, Plus, Code, Palette, Search, ChevronRight, House, Sliders } from 'lucide-react';
import { SkillsEditor } from './SkillsEditor.js';
import { MCPConfigEditor } from './MCPConfigEditor.js';
import { QuickActionsEditor } from './QuickActionsEditor.js';
import { SkillsManager } from './SkillsManager.js';
import { MCPManager } from './MCPManager.js';
import { TrustedProjectsList } from './TrustedProjectsList.js';
import { toast } from '../utils/toast.js';

interface SettingsViewProps {
    onClose: () => void;
    initialTab?: 'api' | 'folders' | 'advanced' | 'skills' | 'mcp' | 'quickactions';
}

interface Config {
    apiKey: string;
    doubaoApiKey?: string;
    zhipuApiKey?: string;
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

// 导航配置
const NAVIGATION_ITEMS = [
    { id: 'api' as const, label: '通用设置', icon: House, description: 'API 配置' },
    { id: 'folders' as const, label: '权限管理', icon: FolderOpen, description: '文件夹授权' },
    { id: 'skills' as const, label: '技能管理', icon: Code, description: 'AI 技能配置' },
    { id: 'mcp' as const, label: 'MCP 扩展', icon: Server, description: '功能增强' },
    { id: 'quickactions' as const, label: '快捷操作', icon: Palette, description: '自定义操作' },
    { id: 'advanced' as const, label: '高级设置', icon: Sliders, description: '系统偏好' },
];

export function SettingsView({ onClose, initialTab = 'api' }: SettingsViewProps) {
    const [config, setConfig] = useState<Config>({
        apiKey: '',
        doubaoApiKey: '',
        apiUrl: 'https://open.bigmodel.cn/api/paas/v4/',
        model: 'glm-4-plus',
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
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [activeTab, setActiveTab] = useState<'api' | 'folders' | 'advanced' | 'skills' | 'mcp' | 'quickactions'>(initialTab);
    const [isRecordingShortcut, setIsRecordingShortcut] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // 简单模式状态
    const [mcpSimpleMode, setMcpSimpleMode] = useState(true);
    const [skillsSimpleMode, setSkillsSimpleMode] = useState(true);

    // API Key 状态
    const [hasApiKey, setHasApiKey] = useState(false);

    useEffect(() => {
        window.ipcRenderer.invoke('config:get-all').then((cfg) => {
            if (cfg) {
                const loadedConfig = cfg as Partial<Config>;
                setConfig({
                    apiKey: loadedConfig.apiKey || '',
                    doubaoApiKey: loadedConfig.doubaoApiKey || '',
                    zhipuApiKey: loadedConfig.zhipuApiKey || '',
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
                });
            }
        });

        window.ipcRenderer.invoke('config:get-api-key-status').then((status) => {
            setHasApiKey((status as { hasApiKey: boolean }).hasApiKey);
        });

        const handleConfigUpdated = () => {
            window.ipcRenderer.invoke('config:get-all').then((cfg) => {
                if (cfg) {
                    const loadedConfig = cfg as Partial<Config>;
                    setConfig(prevConfig => ({
                        ...prevConfig,
                        apiKey: loadedConfig.apiKey || '',
                        doubaoApiKey: loadedConfig.doubaoApiKey || '',
                        zhipuApiKey: loadedConfig.zhipuApiKey || '',
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

            window.ipcRenderer.invoke('config:get-api-key-status').then((status) => {
                setHasApiKey((status as { hasApiKey: boolean }).hasApiKey);
            });
        };

        const removeConfigListener = window.ipcRenderer.on('config:updated', handleConfigUpdated);

        return () => {
            removeConfigListener?.();
        };
    }, []);

    // Shortcut recording handler
    const handleShortcutKeyDown = (e: React.KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();

        const parts: string[] = [];
        if (e.ctrlKey) parts.push('Ctrl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');
        if (e.metaKey) parts.push('Meta');

        const key = e.key;
        if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
            const normalizedKey = key === ' ' ? 'Space' : key.length === 1 ? key.toUpperCase() : key;
            parts.push(normalizedKey);
        }

        const isFunctionKey = /^F\d{1,2}$/.test(parts[parts.length - 1] || '');
        if (parts.length >= 1 && (isFunctionKey || parts.length >= 2)) {
            const newShortcut = parts.join('+');
            setConfig({ ...config, shortcut: newShortcut });
            setIsRecordingShortcut(false);
            window.ipcRenderer.invoke('shortcut:update', newShortcut);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveMessage('正在保存配置...');

        try {
            const result = await window.ipcRenderer.invoke('config:set-all', config) as {
                success: boolean;
                agentRestarted: boolean;
                agentError?: string;
                errors?: Array<{field: string, error: string}>
            };

            // ✅ 检查 Agent 重启错误
            if (result.agentError) {
                setSaveMessage('配置已保存，但 Agent 重启失败');
                setSaved(false);

                // 显示错误 Toast
                toast.error(`Agent 重启失败: ${result.agentError}`);

                setIsSaving(false);
                return;
            }

            // ✅ 检查字段保存错误
            if (result.errors && result.errors.length > 0) {
                setSaveMessage('部分配置保存失败');
                setSaved(false);

                const errorMessages = result.errors.map(e => `${e.field}: ${e.error}`).join(', ');
                toast.error(`部分配置保存失败: ${errorMessages}`);

                setIsSaving(false);
                return;
            }

            if (result.agentRestarted) {
                setSaveMessage('正在应用新配置...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                await new Promise(resolve => setTimeout(resolve, 800));
            }

            setSaved(true);
            setSaveMessage('✅ 配置已保存');

            setTimeout(() => {
                setSaved(false);
                setIsSaving(false);
                setSaveMessage('');
                onClose();
            }, 500);
        } catch (error) {
            console.error('Failed to save config:', error);
            setSaveMessage('保存失败，请重试');
            setSaved(false);

            toast.error(`保存配置时出错: ${(error as Error).message}`);
        } finally {
            // 确保在所有情况下都重置保存状态（除非已经重置）
            // 注意：这里不要立即重置，让各个分支控制
        }
    };

    const addFolder = async () => {
        try {
            const result = await window.ipcRenderer.invoke('dialog:select-folder') as string | null;
            const currentFolders = config.authorizedFolders || [];
            if (result && !currentFolders.includes(result)) {
                setConfig({ ...config, authorizedFolders: [...currentFolders, result] });
            }
        } catch (error) {
            toast.error('打开文件夹选择对话框失败：' + (error as Error).message);
        }
    };

    const removeFolder = (folder: string) => {
        const currentFolders = config.authorizedFolders || [];
        setConfig({ ...config, authorizedFolders: currentFolders.filter(f => f !== folder) });
    };

    // 过滤导航项
    const filteredNavItems = NAVIGATION_ITEMS.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeNavItem = NAVIGATION_ITEMS.find(item => item.id === activeTab);
    const ActiveIcon = activeNavItem?.icon || Settings;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4" style={{ top: '40px' }}>
            <div className="bg-slate-900 rounded-2xl w-full max-w-6xl h-[calc(92vh-40px)] shadow-2xl flex flex-col overflow-hidden border border-slate-800">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg shadow-orange-500/20">
                            <Settings size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight">设置</h1>
                            <p className="text-xs text-slate-400 mt-0.5">自定义你的 SkillMate 体验</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar */}
                    <div className="w-72 bg-slate-900/50 border-r border-slate-800 flex flex-col">
                        {/* Search */}
                        <div className="p-4 border-b border-slate-800">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="搜索设置..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                />
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-1">
                            {filteredNavItems.map(item => {
                                const Icon = item.icon;
                                const isActive = activeTab === item.id;

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                                            isActive
                                                ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20'
                                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                        }`}
                                    >
                                        <Icon size={18} className={isActive ? 'text-white' : ''} />
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-sm font-semibold truncate ${isActive ? 'text-white' : ''}`}>
                                                {item.label}
                                            </div>
                                            <div className={`text-xs truncate ${isActive ? 'text-orange-100' : 'text-slate-500'}`}>
                                                {item.description}
                                            </div>
                                        </div>
                                        {isActive && <ChevronRight size={16} className="text-white" />}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Footer Info */}
                        <div className="p-4 border-t border-slate-800">
                            <div className="text-xs text-slate-500 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span>SkillMate</span>
                                    <span>v1.0.0</span>
                                </div>
                                <div>© 2026 技伴</div>
                            </div>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto bg-slate-900">
                        {/* Breadcrumb */}
                        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 px-8 py-4">
                            <div className="flex items-center gap-2 text-sm">
                                <Settings className="w-4 h-4 text-slate-500" />
                                <span className="text-slate-500">设置</span>
                                <ChevronRight className="w-4 h-4 text-slate-600" />
                                <div className="flex items-center gap-2">
                                    <ActiveIcon className="w-4 h-4 text-orange-500" />
                                    <span className="text-white font-medium">{activeNavItem?.label}</span>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-8">
                            {activeTab === 'api' && (
                                <div className="max-w-2xl space-y-8">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white mb-2">通用设置</h2>
                                        <p className="text-slate-400">配置 API 密钥和基础设置</p>
                                    </div>

                                    {/* API Key */}
                                    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-300 mb-3">
                                                API Key
                                            </label>
                                            <input
                                                type="password"
                                                value={config.apiKey}
                                                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                                                placeholder={hasApiKey ? "••••••••••••••••" : "sk-..."}
                                                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                            />
                                            {hasApiKey && config.apiKey === '' && (
                                                <p className="text-xs text-green-400 mt-2 flex items-center gap-1.5">
                                                    <Check className="w-3.5 h-3.5" />
                                                    已配置 API Key
                                                </p>
                                            )}
                                        </div>

                                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                                            <p className="text-sm font-medium text-orange-200 mb-2">
                                                如何获取智谱 AI API Key？
                                            </p>
                                            <ol className="text-xs text-orange-300/80 space-y-1.5 list-decimal list-inside">
                                                <li>访问 <a href="https://open.bigmodel.cn" target="_blank" rel="noopener noreferrer" className="underline hover:text-orange-200">智谱 AI 开放平台</a></li>
                                                <li>注册/登录并进入「API Key」页面</li>
                                                <li>生成并复制 API Key</li>
                                            </ol>
                                        </div>
                                    </div>

                                    {/* 豆包 API Key */}
                                    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-slate-300 mb-3">
                                                豆包生图 API Key
                                            </label>
                                            <input
                                                type="password"
                                                value={config.doubaoApiKey || ''}
                                                onChange={(e) => setConfig({ ...config, doubaoApiKey: e.target.value })}
                                                placeholder="输入豆包生图 API Key"
                                                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                            />
                                        </div>

                                        {/* 豆包 API Key 获取引导 */}
                                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-4">
                                            <p className="text-sm font-medium text-purple-200 mb-2">
                                                如何获取豆包 API Key？
                                            </p>
                                            <ol className="text-xs text-purple-300/80 space-y-1.5 list-decimal list-inside">
                                                <li>访问 <a href="https://console.volcengine.com/ark" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-200">火山引擎豆包控制台</a></li>
                                                <li>注册/登录并进入「API Key 管理」页面</li>
                                                <li>创建并复制 API Key</li>
                                            </ol>
                                        </div>

                                        <p className="text-xs text-slate-500">
                                            用于生图技能的 API Key，将自动注入到技能执行环境
                                        </p>
                                    </div>

                                    {/* API URL & Model */}
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                                            <label className="block text-sm font-medium text-slate-300 mb-3">
                                                API URL
                                            </label>
                                            <input
                                                type="text"
                                                value={config.apiUrl}
                                                onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                                                placeholder="https://open.bigmodel.cn/api/paas/v4/"
                                                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                            />
                                        </div>

                                        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                                            <label className="block text-sm font-medium text-slate-300 mb-3">
                                                模型名称
                                            </label>
                                            <input
                                                type="text"
                                                value={config.model}
                                                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                                                placeholder="glm-4.7"
                                                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                            />
                                        </div>
                                    </div>

                                    {/* Save Button */}
                                    <div className="pt-4 border-t border-slate-800">
                                        <button
                                            onClick={handleSave}
                                            disabled={isSaving}
                                            className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                                                isSaving
                                                    ? 'bg-slate-600/50 text-slate-400 cursor-not-allowed'
                                                    : saved
                                                    ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                                                    : 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-500/20'
                                            }`}
                                        >
                                            {isSaving ? (
                                                <>
                                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                    {saveMessage || '保存中...'}
                                                </>
                                            ) : saved ? (
                                                <>
                                                    <Check size={18} />
                                                    {saveMessage || '已保存设置'}
                                                </>
                                            ) : (
                                                '保存设置'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'folders' && (
                                <div className="max-w-2xl space-y-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white mb-2">权限管理</h2>
                                        <p className="text-slate-400">管理 AI 可以访问的文件夹</p>
                                    </div>

                                    {/* ========== 模块1: 授权文件夹（蓝色主题） ========== */}
                                    <div className="bg-slate-800/50 border-2 border-blue-500/30 rounded-2xl p-5 space-y-4">
                                        {/* 模块标题 */}
                                        <div className="flex items-center gap-2 pb-3 border-b border-blue-500/30">
                                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                                <FolderOpen className="text-blue-400" size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-blue-300">授权文件夹</h3>
                                                <p className="text-xs text-slate-400">AI 可访问的基础路径</p>
                                            </div>
                                        </div>

                                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
                                            <p className="text-sm text-blue-200">
                                                🔒 出于安全考虑，AI 只能访问以下授权的文件夹及其子文件夹。
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                        {(config.authorizedFolders || []).length === 0 ? (
                                            <div className="text-center py-16 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/30">
                                                <FolderOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                                <p className="text-slate-500">暂无授权文件夹</p>
                                                <p className="text-xs text-slate-600 mt-1">点击下方按钮添加文件夹</p>
                                            </div>
                                        ) : (
                                            (config.authorizedFolders || []).map((folder, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center gap-4 p-4 bg-slate-800/50 border border-slate-700 rounded-xl group hover:border-slate-600 transition-all"
                                                >
                                                    <div className="p-2.5 bg-orange-500/20 rounded-lg">
                                                        <FolderOpen className="w-5 h-5 text-orange-500" />
                                                    </div>
                                                    <span className="flex-1 text-sm font-mono text-slate-300 truncate">
                                                        {folder}
                                                    </span>
                                                    <button
                                                        onClick={() => removeFolder(folder)}
                                                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                        </div>

                                        <button
                                            onClick={addFolder}
                                            className="w-full py-3 border-2 border-dashed border-blue-500/50 text-blue-300 hover:text-blue-200 hover:bg-blue-500/10 rounded-xl transition-all flex items-center justify-center gap-2 font-medium"
                                        >
                                            <Plus size={18} />
                                            添加授权文件夹
                                        </button>
                                    </div>

                                    {/* ========== 模块2: 信任的项目（绿色主题） ========== */}
                                    <div className="bg-slate-800/50 border-2 border-green-500/30 rounded-2xl overflow-hidden">
                                        <TrustedProjectsList />
                                    </div>

                                    <div className="pt-4 border-t border-slate-800">
                                        <button
                                            onClick={handleSave}
                                            disabled={isSaving}
                                            className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                                                isSaving
                                                    ? 'bg-slate-600/50 text-slate-400 cursor-not-allowed'
                                                    : saved
                                                    ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                                                    : 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-500/20'
                                            }`}
                                        >
                                            {isSaving ? (
                                                <>
                                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                    {saveMessage || '保存中...'}
                                                </>
                                            ) : saved ? (
                                                <>
                                                    <Check size={18} />
                                                    {saveMessage || '已保存设置'}
                                                </>
                                            ) : (
                                                '保存设置'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'advanced' && (
                                <div className="max-w-2xl space-y-8">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white mb-2">高级设置</h2>
                                        <p className="text-slate-400">系统偏好和权限管理</p>
                                    </div>

                                    {/* 快捷键 */}
                                    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-white font-semibold">全局快捷键</p>
                                                <p className="text-sm text-slate-400 mt-1">呼出悬浮球</p>
                                            </div>
                                            {isRecordingShortcut ? (
                                                <input
                                                    type="text"
                                                    autoFocus
                                                    className="px-4 py-2 text-sm border-2 border-orange-500 rounded-xl bg-orange-500/10 text-orange-400 font-mono outline-none animate-pulse w-32"
                                                    placeholder="按下快捷键..."
                                                    onKeyDown={handleShortcutKeyDown}
                                                    onBlur={() => setIsRecordingShortcut(false)}
                                                    readOnly
                                                />
                                            ) : (
                                                <button
                                                    onClick={() => setIsRecordingShortcut(true)}
                                                    className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-mono transition-colors"
                                                >
                                                    {config.shortcut}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* 通知设置 */}
                                    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-white font-semibold">桌面通知</p>
                                                <p className="text-sm text-slate-400 mt-1">工作完成时通知您</p>
                                            </div>
                                            <button
                                                onClick={() => setConfig({ ...config, notifications: !config.notifications })}
                                                className={`relative w-12 h-6 rounded-full transition-colors ${
                                                    config.notifications ? 'bg-orange-600' : 'bg-slate-700'
                                                }`}
                                            >
                                                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                                                    config.notifications ? 'translate-x-6' : ''
                                                }`} />
                                            </button>
                                        </div>

                                        {config.notifications && (
                                            <div className="space-y-3 pt-4 border-t border-slate-700">
                                                <p className="text-sm font-medium text-slate-300">通知类型</p>
                                                {[
                                                    { key: 'workComplete' as const, label: '工作完成通知' },
                                                    { key: 'error' as const, label: '错误通知' },
                                                    { key: 'info' as const, label: '信息通知' }
                                                ].map((type) => (
                                                    <div key={type.key} className="flex items-center justify-between">
                                                        <span className="text-sm text-slate-400">{type.label}</span>
                                                        <button
                                                            onClick={() => setConfig({
                                                                ...config,
                                                                notificationTypes: {
                                                                    ...config.notificationTypes,
                                                                    [type.key]: !config.notificationTypes[type.key]
                                                                }
                                                            })}
                                                            className={`relative w-10 h-5 rounded-full transition-colors ${
                                                                config.notificationTypes[type.key] ? 'bg-orange-500' : 'bg-slate-700'
                                                            }`}
                                                        >
                                                            <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                                                                config.notificationTypes[type.key] ? 'translate-x-5' : ''
                                                            }`} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* 用户引导 */}
                                    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-white font-semibold">用户引导</p>
                                                <p className="text-sm text-slate-400 mt-1">重新查看首次启动引导</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    window.dispatchEvent(new CustomEvent('open-user-guide'));
                                                    onClose();
                                                }}
                                                className="px-4 py-2 text-sm bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors font-medium"
                                            >
                                                查看引导
                                            </button>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-800">
                                        <button
                                            onClick={handleSave}
                                            disabled={isSaving}
                                            className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                                                isSaving
                                                    ? 'bg-slate-600/50 text-slate-400 cursor-not-allowed'
                                                    : saved
                                                    ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                                                    : 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-500/20'
                                            }`}
                                        >
                                            {isSaving ? (
                                                <>
                                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                    {saveMessage || '保存中...'}
                                                </>
                                            ) : saved ? (
                                                <>
                                                    <Check size={18} />
                                                    {saveMessage || '已保存设置'}
                                                </>
                                            ) : (
                                                '保存设置'
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'skills' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white mb-2">技能管理</h2>
                                            <p className="text-slate-400">管理 AI 技能（开箱即用的 16 个公众号创作技能）</p>
                                        </div>
                                        <button
                                            onClick={() => setSkillsSimpleMode(!skillsSimpleMode)}
                                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                                        >
                                            <Settings size={16} />
                                            {skillsSimpleMode ? '高级编辑' : '简化模式'}
                                        </button>
                                    </div>

                                    {/* 技能使用说明 */}
                                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5">
                                        <div className="flex items-start gap-3">
                                            <div className="text-2xl">💡</div>
                                            <div>
                                                <p className="text-sm font-medium text-blue-200 mb-2">
                                                    如何使用技能？
                                                </p>
                                                <ul className="text-xs text-blue-300/80 space-y-1">
                                                    <li>• 在聊天框输入 <code className="px-2 py-0.5 bg-blue-500/20 rounded text-blue-200 font-mono">/</code> 可以快速调用技能</li>
                                                    <li>• 按 <code className="px-2 py-0.5 bg-blue-500/20 rounded text-blue-200 font-mono">Ctrl+Shift+P</code> 打开命令面板浏览所有技能</li>
                                                    <li>• 在这里可以启用/禁用技能，禁用的技能不会显示在命令面板中</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    {skillsSimpleMode ? (
                                        <SkillsManager onOpenAdvanced={() => setSkillsSimpleMode(false)} />
                                    ) : (
                                        <SkillsEditor onClose={onClose} />
                                    )}
                                </div>
                            )}

                            {activeTab === 'mcp' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white mb-2">MCP 扩展</h2>
                                            <p className="text-slate-400">让 AI 能帮你做更多事情</p>
                                        </div>
                                        <button
                                            onClick={() => setMcpSimpleMode(!mcpSimpleMode)}
                                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                                        >
                                            <Settings size={16} />
                                            {mcpSimpleMode ? '高级编辑' : '简化模式'}
                                        </button>
                                    </div>

                                    {mcpSimpleMode ? (
                                        <MCPManager />
                                    ) : (
                                        <MCPConfigEditor onClose={onClose} />
                                    )}
                                </div>
                            )}

                            {activeTab === 'quickactions' && (
                                <QuickActionsEditor onClose={onClose} />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
