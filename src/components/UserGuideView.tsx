import { useState, useEffect } from 'react';
import { Settings, Code, Server, Shield, Zap, AlertCircle, CheckCircle, X } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog.js';
import { toast } from '../utils/toast.js';

interface UserGuideViewProps {
    onClose: () => void;
}

interface WorkflowStep {
    id: string;
    name: string;
    skill: string;
    description: string;
    icon: React.ReactNode;
    command: string;
}

type SetupStepId = 'apikey' | 'folders' | 'workflow';

interface SetupStatus {
    hasApiKey: boolean;
    hasAuthorizedFolders: boolean;
    isSetupComplete: boolean;
}

const workflowSteps: WorkflowStep[] = [
    {
        id: '1',
        name: '环境配置',
        skill: 'env-setup',
        description: '配置开发环境和依赖',
        icon: <Settings size={20} />,
        command: '检查开发环境'
    },
    {
        id: '2',
        name: 'API Key 设置',
        skill: 'api-config',
        description: '配置 AI 模型访问',
        icon: <Settings size={20} />,
        command: '配置 API Key'
    },
    {
        id: '3',
        name: '技能系统',
        skill: 'skills-system',
        description: '理解技能扩展机制',
        icon: <Code size={20} />,
        command: '查看可用技能'
    },
    {
        id: '4',
        name: 'MCP 集成',
        skill: 'mcp-integration',
        description: '集成外部工具服务',
        icon: <Server size={20} />,
        command: '配置 MCP 服务'
    },
    {
        id: '5',
        name: '权限管理',
        skill: 'permissions',
        description: '管理文件和系统权限',
        icon: <Shield size={20} />,
        command: '查看权限设置'
    },
    {
        id: '6',
        name: '开始使用',
        skill: 'getting-started',
        description: '运行你的第一个 Agent',
        icon: <Zap size={20} />,
        command: '启动 Agent'
    }
];

export function UserGuideView({ onClose }: UserGuideViewProps) {
    const [currentStep, setCurrentStep] = useState<SetupStepId>('apikey');
    const [setupStatus, setSetupStatus] = useState<SetupStatus>({
        hasApiKey: false,
        hasAuthorizedFolders: false,
        isSetupComplete: false
    });
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);

    const handleCloseClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        console.log('[UserGuideView] Close button clicked, setting showCloseConfirm to true');
        setShowCloseConfirm(true);
        console.log('[UserGuideView] showCloseConfirm state updated');
    };

    const handleConfirmClose = () => {
        setShowCloseConfirm(false);
        // 延迟调用 onClose()，确保确认对话框已经完全关闭
        setTimeout(() => {
            onClose();
        }, 100);
    };

    const handleCancelClose = () => {
        setShowCloseConfirm(false);
    };

    // 检测配置状态
    useEffect(() => {
        console.log('[UserGuideView] Fetching setup status...');
        window.ipcRenderer.invoke('config:get-setup-status')
            .then((status: unknown) => {
                console.log('[UserGuideView] Setup status received:', status);
                const typedStatus = status as SetupStatus;
                setSetupStatus(typedStatus);

                // 根据配置状态决定显示哪个步骤
                if (!typedStatus.hasApiKey) {
                    setCurrentStep('apikey');
                } else if (!typedStatus.hasAuthorizedFolders) {
                    setCurrentStep('folders');
                } else {
                    setCurrentStep('workflow');
                }
            })
            .catch((error) => {
                console.error('[UserGuideView] Failed to get setup status:', error);
                // 失败时默认显示 API Key 设置步骤
                setCurrentStep('apikey');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, []);

    // 组件卸载时的清理逻辑
    useEffect(() => {
        // 清理函数
        return () => {
            console.log('[UserGuideView] Component unmounted');
            // 可以在这里添加其他清理逻辑，比如清除定时器等
        };
    }, []);

    const handleSaveApiKey = async () => {
        if (!apiKeyInput.trim()) {
            toast.warning('请输入 API Key');
            return;
        }

        try {
            // 保存 API Key
            await window.ipcRenderer.invoke('config:set-all', {
                apiKey: apiKeyInput,
            });

            // 更新状态并跳转到下一步
            setSetupStatus({ ...setupStatus, hasApiKey: true });
            setCurrentStep('folders');
        } catch (error) {
            console.error('[UserGuideView] Failed to save API Key:', error);
            toast.error('保存 API Key 失败，请重试');
        }
    };

    const handleQuickAuthorize = async () => {
        try {
            // 打开文件夹选择对话框
            const folderPath = await window.ipcRenderer.invoke('dialog:select-folder') as string | null;

            if (!folderPath) {
                // 用户取消选择
                return;
            }

            // 获取当前配置
            const currentConfig = await window.ipcRenderer.invoke('config:get-safe') as { authorizedFolders?: string[] };
            const currentFolders = currentConfig.authorizedFolders || [];

            // 添加新文件夹（避免重复）
            const newFolders = currentFolders.includes(folderPath)
                ? currentFolders
                : [...currentFolders, folderPath];

            // 保存到配置
            await window.ipcRenderer.invoke('config:set-all', {
                authorizedFolders: newFolders
            });

            // 更新状态并跳转到下一步
            setSetupStatus({ ...setupStatus, hasAuthorizedFolders: true });
            setCurrentStep('workflow');

            // 显示成功提示
            toast.success('文件夹授权成功！');
        } catch (error) {
            console.error('[UserGuideView] Failed to authorize folder:', error);
            toast.error('文件夹授权失败，请重试');
        }
    };

    const handleAdvancedSettings = () => {
        try {
            // 发送事件到 App.tsx，请求打开设置页面的"权限"标签
            window.dispatchEvent(new CustomEvent('open-settings', { detail: { tab: 'folders' } }));
            // 延迟调用 onClose()，确保事件已经被处理
            setTimeout(() => {
                onClose();
            }, 100);
        } catch (error) {
            console.error('[UserGuideView] Failed to open settings:', error);
            toast.error('打开设置失败，请重试');
        }
    };

    // 显示加载状态
    if (isLoading) {
        return (
            <div className="h-full w-full bg-slate-50 relative">
                <button
                    onClick={handleCloseClick}
                    className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors z-[99999] pointer-events-auto"
                    aria-label="关闭"
                    style={{ zIndex: 99999, pointerEvents: 'auto', position: 'absolute' }}
                >
                    <X size={20} className="text-slate-500" />
                </button>
                <div className="h-full w-full flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                        <p className="text-slate-600">正在加载...</p>
                    </div>
                </div>
                <ConfirmDialog
                    isOpen={showCloseConfirm}
                    title="确定要关闭配置引导吗？"
                    message="完成配置后才能使用完整功能。您可以稍后在设置中继续配置。"
                    confirmText="稍后配置"
                    cancelText="继续配置"
                    onConfirm={handleConfirmClose}
                    onCancel={handleCancelClose}
                />
            </div>
        );
    }

    // Step 1: API Key 设置
    if (currentStep === 'apikey' && !setupStatus.hasApiKey) {
        return (
            <div className="h-full w-full bg-slate-50 overflow-y-auto relative">
                <button
                    onClick={handleCloseClick}
                    className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors z-[99999] pointer-events-auto"
                    aria-label="关闭"
                    style={{ zIndex: 99999, pointerEvents: 'auto', position: 'absolute' }}
                >
                    <X size={20} className="text-slate-500" />
                </button>
                <div className="max-w-2xl mx-auto px-8 py-12">
                    {/* 欢迎区域 */}
                    <div className="text-center mb-10">
                        <div className="flex justify-center mb-6">
                            <img src="/logo_new.svg" alt="Logo" className="w-24 h-24 object-contain" />
                        </div>
                        <h1 className="text-4xl font-bold text-slate-800 mb-4">
                            欢迎使用 SkillMate
                        </h1>
                        <p className="text-lg text-slate-600">
                            开始使用前，需要先完成 API Key 配置
                        </p>
                    </div>

                    {/* API Key 设置 */}
                    <div className="bg-orange-50 border-2 border-orange-500 p-8 rounded-2xl shadow-lg">
                        <div className="flex flex-col items-center text-center gap-6">
                            <div className="p-4 bg-orange-100 rounded-full">
                                <AlertCircle className="text-orange-600" size={48} />
                            </div>

                            <div className="flex-1 w-full">
                                <h2 className="text-2xl font-bold text-orange-900 mb-4">
                                    🔑 第一步：配置 API Key
                                </h2>
                                <p className="text-orange-800 text-base mb-6 leading-relaxed">
                                    本应用使用智谱 AI（ChatGLM），需要配置 API Key 才能使用。
                                </p>

                                <div className="bg-white p-4 rounded-lg mb-6 text-left">
                                    <p className="text-sm font-medium text-slate-700 mb-3">
                                        如何获取智谱 API Key：
                                    </p>
                                    <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside">
                                        <li>访问 <a href="https://open.bigmodel.cn/" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">智谱AI开放平台</a></li>
                                        <li>注册/登录智谱AI账号</li>
                                        <li>进入「API Keys」页面，创建并复制 API Key</li>
                                        <li>将密钥粘贴到下方输入框中</li>
                                    </ol>
                                </div>

                                <input
                                    type="password"
                                    value={apiKeyInput}
                                    onChange={(e) => setApiKeyInput(e.target.value)}
                                    placeholder="粘贴您的 API Key（格式：xxx.xxx...）"
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg mb-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                />
                            </div>

                            <button
                                onClick={handleSaveApiKey}
                                className="w-full bg-orange-500 text-white px-8 py-4 rounded-xl hover:bg-orange-600 transition-colors text-lg font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
                            >
                                保存 API Key 并继续 →
                            </button>

                            <p className="text-xs text-orange-700">
                                配置完成后，将进入文件夹授权步骤
                            </p>
                        </div>
                    </div>
                </div>
                <ConfirmDialog
                    isOpen={showCloseConfirm}
                    title="确定要关闭配置引导吗？"
                    message="完成配置后才能使用完整功能。您可以稍后在设置中继续配置。"
                    confirmText="稍后配置"
                    cancelText="继续配置"
                    onConfirm={handleConfirmClose}
                    onCancel={handleCancelClose}
                />
            </div>
        );
    }

    // Step 2: 文件夹授权
    if (currentStep === 'folders' && !setupStatus.hasAuthorizedFolders) {
        return (
            <div className="h-full w-full bg-slate-50 overflow-y-auto relative">
                <button
                    onClick={handleCloseClick}
                    className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors z-[99999] pointer-events-auto"
                    aria-label="关闭"
                    style={{ zIndex: 99999, pointerEvents: 'auto', position: 'absolute' }}
                >
                    <X size={20} className="text-slate-500" />
                </button>
                <div className="max-w-2xl mx-auto px-8 py-12">
                    {/* 欢迎区域 */}
                    <div className="text-center mb-10">
                        <div className="flex justify-center mb-6">
                            <img src="/logo_new.svg" alt="Logo" className="w-24 h-24 object-contain" />
                        </div>
                        <h1 className="text-4xl font-bold text-slate-800 mb-4">
                            欢迎使用 SkillMate
                        </h1>
                        <p className="text-lg text-slate-600">
                            继续完成最后一步配置
                        </p>
                    </div>

                    {/* API Key 成功提示 */}
                    {setupStatus.hasApiKey && (
                        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg shadow-sm">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="text-green-600 shrink-0" size={20} />
                                <div>
                                    <h3 className="font-bold text-green-800 mb-1">
                                        ✅ API Key 已配置
                                    </h3>
                                    <p className="text-green-700 text-sm">
                                        您已成功配置 API Key
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 强制引导：文件夹授权 */}
                    <div className="bg-orange-50 border-2 border-orange-500 p-8 rounded-2xl shadow-lg">
                        <div className="flex flex-col items-center text-center gap-6">
                            <div className="p-4 bg-orange-100 rounded-full">
                                <AlertCircle className="text-orange-600" size={48} />
                            </div>

                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-orange-900 mb-4">
                                    🔐 第二步：授权文件夹
                                </h2>
                                <p className="text-orange-800 text-base mb-6 leading-relaxed">
                                    出于安全考虑，AI 需要您的授权才能访问文件系统。<br />
                                    授权后，AI 才能为您创建文件、读取数据、管理项目。
                                </p>

                                <div className="bg-white p-4 rounded-lg mb-6">
                                    <p className="text-sm text-slate-700 font-medium mb-2">授权后，AI 可以：</p>
                                    <ul className="text-left text-sm text-slate-600 space-y-1">
                                        <li className="flex items-center gap-2">
                                            <span className="text-green-500">✓</span>
                                            创建和编辑文件
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="text-green-500">✓</span>
                                            读取项目数据
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="text-green-500">✓</span>
                                            管理项目目录
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={handleQuickAuthorize}
                                    className="flex-1 bg-orange-500 text-white px-6 py-4 rounded-xl hover:bg-orange-600 transition-colors text-base font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
                                >
                                    ⚡ 快速授权
                                </button>
                                <button
                                    onClick={handleAdvancedSettings}
                                    className="flex-1 bg-white text-orange-600 border-2 border-orange-500 px-6 py-4 rounded-xl hover:bg-orange-50 transition-colors text-base font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
                                >
                                    ⚙️ 高级设置
                                </button>
                            </div>

                            <p className="text-xs text-orange-700">
                                授权完成后，返回即可查看完整创作流程
                            </p>
                        </div>
                    </div>
                </div>
                <ConfirmDialog
                    isOpen={showCloseConfirm}
                    title="确定要关闭配置引导吗？"
                    message="完成配置后才能使用完整功能。您可以稍后在设置中继续配置。"
                    confirmText="稍后配置"
                    cancelText="继续配置"
                    onConfirm={handleConfirmClose}
                    onCancel={handleCancelClose}
                />
            </div>
        );
    }

    // Step 3: 创作流程介绍
    return (
        <div className="h-full w-full bg-slate-50 overflow-y-auto relative">
            <button
                onClick={handleCloseClick}
                className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors z-[99999] pointer-events-auto"
                aria-label="关闭"
            >
                <X size={20} className="text-slate-500" />
            </button>
            <div className="max-w-5xl mx-auto px-8 py-12">
                {/* 欢迎区域 */}
                <div className="text-center mb-10">
                    <div className="flex justify-center mb-6">
                        <img src="/logo_new.svg" alt="Logo" className="w-20 h-20 object-contain" />
                    </div>
                    <h1 className="text-4xl font-bold text-slate-800 mb-4">
                        欢迎使用 SkillMate
                    </h1>
                    <p className="text-lg text-slate-600">
                        学习如何构建现代化的 AI 助手应用
                    </p>
                </div>

                {/* 配置成功提示 */}
                <div className="space-y-3 mb-8">
                    {setupStatus.hasApiKey && (
                        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg shadow-sm">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="text-green-600 shrink-0" size={20} />
                                <div>
                                    <h3 className="font-bold text-green-800 mb-1">
                                        ✅ API Key 已配置
                                    </h3>
                                    <p className="text-green-700 text-sm">
                                        您已成功配置智谱 AI API Key
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    {setupStatus.hasAuthorizedFolders && (
                        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg shadow-sm">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="text-green-600 shrink-0" size={20} />
                                <div>
                                    <h3 className="font-bold text-green-800 mb-1">
                                        ✅ 文件夹已授权
                                    </h3>
                                    <p className="text-green-700 text-sm">
                                        您已授权 AI 访问文件系统
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 工作流可视化 */}
                <div className="mb-10">
                    <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">
                        AI Agent 开发流程
                    </h2>
                    <p className="text-center text-slate-600 mb-6">
                        从环境配置到运行 Agent，完整学习路径
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {workflowSteps.map((step) => (
                            <WorkflowCard key={step.id} step={step} />
                        ))}
                    </div>
                </div>

                {/* 开始使用按钮 */}
                <div className="text-center pb-8">
                    <button
                        onClick={() => {
                            // 延迟调用 onClose()，确保 IPC 调用已经开始处理
                            setTimeout(() => {
                                onClose();
                            }, 100);
                            // 标记首次启动已完成
                            window.ipcRenderer.invoke('config:set-first-launch')
                                .catch((error) => {
                                    console.error('[UserGuideView] Failed to set first launch:', error);
                                });
                        }}
                        className="bg-orange-600 text-white px-10 py-3.5 rounded-xl hover:bg-orange-700 transition-colors text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                    >
                        开始使用 →
                    </button>
                    <p className="text-sm text-slate-500 mt-3">
                        随时可以在设置中重新查看此引导
                    </p>
                </div>
                <ConfirmDialog
                    isOpen={showCloseConfirm}
                    title="确定要关闭配置引导吗？"
                    message="完成配置后才能使用完整功能。您可以稍后在设置中继续配置。"
                    confirmText="稍后配置"
                    cancelText="继续配置"
                    onConfirm={handleConfirmClose}
                    onCancel={handleCancelClose}
                />
            </div>
        </div>
    );
}

interface WorkflowCardProps {
    step: WorkflowStep;
}

function WorkflowCard({ step }: WorkflowCardProps) {
    return (
        <div className="bg-white p-5 rounded-xl border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all cursor-default group">
            <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 bg-orange-50 rounded-lg text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                    {step.icon}
                </div>
                <h3 className="font-bold text-slate-800">{step.name}</h3>
            </div>
            <p className="text-sm text-slate-600 mb-3 leading-relaxed">{step.description}</p>
            <code className="text-xs bg-slate-100 px-3 py-2 rounded text-slate-700 block font-mono border border-slate-200">
                {step.command}
            </code>
        </div>
    );
}
