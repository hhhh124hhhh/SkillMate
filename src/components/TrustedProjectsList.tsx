import { useState, useEffect } from 'react';
import { FolderOpen, Shield, ShieldCheck, Trash2, Plus } from 'lucide-react';
import { Button } from './ui/Button.js';

interface TrustedProject {
    path: string;
    trustedAt: number;
    lastUsed: number;
}

interface TrustedProjectsListProps {
    onClose?: () => void;
}

export function TrustedProjectsList({ onClose }: TrustedProjectsListProps) {
    const [trustedProjects, setTrustedProjects] = useState<TrustedProject[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 加载信任项目列表
    const loadTrustedProjects = async () => {
        setLoading(true);
        setError(null);
        try {
            const projects = await window.ipcRenderer.invoke('permissions:get-trusted-projects') as TrustedProject[];
            setTrustedProjects(projects);
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    // 添加信任项目
    const handleAddProject = async () => {
        try {
            const result = await window.ipcRenderer.invoke('dialog:select-folder');
            if (result) {
                const response = await window.ipcRenderer.invoke('permissions:trust-project', result) as { success: boolean };
                const { success } = response;
                if (success) {
                    await loadTrustedProjects(); // 重新加载列表
                } else {
                    setError('所选目录不是有效的项目目录（需要包含 .git 或 package.json）');
                }
            }
        } catch (err) {
            setError((err as Error).message);
        }
    };

    // 取消信任项目
    const handleRevokeTrust = async (projectPath: string) => {
        try {
            await window.ipcRenderer.invoke('permissions:revoke-trust', projectPath);
            await loadTrustedProjects(); // 重新加载列表
        } catch (err) {
            setError((err as Error).message);
        }
    };

    // 格式化日期
    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    useEffect(() => {
        loadTrustedProjects();
    }, []);

    return (
        <div className="p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-green-500/30">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                        <ShieldCheck className="text-green-400" size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-green-300">信任的项目</h3>
                        <p className="text-xs text-slate-400">可直接删除，无需确认</p>
                    </div>
                </div>
                <Button
                    variant="secondary"
                    size="sm"
                    icon={Plus}
                    onClick={handleAddProject}
                    className="border-green-500/50 text-green-300 hover:bg-green-500/10"
                >
                    添加项目
                </Button>
            </div>

            {/* Description */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
                <p className="text-sm text-green-200">
                    💡 信任的项目可以直接执行删除操作，无需每次确认。
                    项目必须包含 <code className="px-1 py-0.5 bg-green-900/50 rounded text-green-300">.git</code> 或 <code className="px-1 py-0.5 bg-green-900/50 rounded text-green-300">package.json</code> 文件。
                </p>
            </div>

            {/* Error */}
            {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive">{error}</p>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">加载中...</p>
                </div>
            )}

            {/* Empty State */}
            {!loading && trustedProjects.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-green-500/30 rounded-lg bg-green-500/5">
                    <Shield className="mx-auto text-green-500/50 mb-3" size={48} />
                    <p className="text-green-400/70 mb-1">还没有信任的项目</p>
                    <p className="text-sm text-green-400/50">点击右上角按钮添加项目</p>
                </div>
            )}

            {/* Project List */}
            {!loading && trustedProjects.length > 0 && (
                <div className="space-y-2">
                    {trustedProjects.map((project) => (
                        <div
                            key={project.path}
                            className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg hover:bg-green-500/15 transition-colors"
                        >
                            {/* Project Info */}
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <FolderOpen className="text-green-400 flex-shrink-0" size={20} />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-green-100 truncate">{project.path}</p>
                                    <p className="text-xs text-green-400/70">
                                        信任于 {formatDate(project.trustedAt)}
                                        {project.lastUsed !== project.trustedAt && ` · 最后使用于 ${formatDate(project.lastUsed)}`}
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <Button
                                variant="ghost"
                                size="sm"
                                icon={Trash2}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border-transparent"
                                onClick={() => handleRevokeTrust(project.path)}
                            >
                                取消信任
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
