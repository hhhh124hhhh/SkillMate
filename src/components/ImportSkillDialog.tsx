/**
 * 技能导入对话框组件
 * 支持从本地文件、URL、GitHub 仓库导入技能
 */

import { useState } from 'react';
import {
  X, Upload, Link, Github, Loader2, AlertCircle, CheckCircle,
  FileText, Package
} from 'lucide-react';
import { Button } from './ui/Button';

interface ImportSkillDialogProps {
  open: boolean;
  onClose: () => void;
  onImportSuccess?: (skillId: string) => void;
}

type ImportMethod = 'file' | 'url' | 'github';

export function ImportSkillDialog({ open, onClose, onImportSuccess }: ImportSkillDialogProps) {
  const [method, setMethod] = useState<ImportMethod>('file');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 文件导入状态
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // URL 导入状态
  const [url, setUrl] = useState('');

  // GitHub 导入状态
  const [githubUrl, setGithubUrl] = useState('');

  // 导入结果详情
  const [importDetails, setImportDetails] = useState<{
    imported: number;
    skipped: number;
    failed: number;
    skippedList?: string[];
    failedList?: Array<{ skillId: string; error: string }>;
  } | null>(null);

  if (!open) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setSuccess(null);
    }
  };

  const handleImport = async () => {
    setError(null);
    setSuccess(null);
    setImporting(true);

    try {
      let result: any;

      if (method === 'file') {
        if (!selectedFile) {
          setError('请选择文件');
          setImporting(false);
          return;
        }

        // 读取文件内容
        const content = await selectedFile.text();
        const arrayBuffer = await selectedFile.arrayBuffer();

        // 验证格式
        const validation = await window.ipcRenderer.invoke('skills:validate', content) as { valid: boolean; errors: string[] };
        if (!validation.valid && validation.errors.length > 0) {
          setError(`格式验证失败: ${validation.errors.join(', ')}`);
          setImporting(false);
          return;
        }

        // 导入文件（通过主进程处理）
        result = await window.ipcRenderer.invoke('skills:import-file', selectedFile.path);

      } else if (method === 'url') {
        if (!url.trim()) {
          setError('请输入 URL');
          setImporting(false);
          return;
        }

        result = await window.ipcRenderer.invoke('skills:import-url', url.trim());

      } else if (method === 'github') {
        if (!githubUrl.trim()) {
          setError('请输入 GitHub 仓库 URL');
          setImporting(false);
          return;
        }

        // 验证 GitHub URL 格式
        const githubMatch = githubUrl.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
        if (!githubMatch) {
          setError('无效的 GitHub 仓库 URL，格式应为: https://github.com/user/repo');
          setImporting(false);
          return;
        }

        result = await window.ipcRenderer.invoke('skills:import-github', githubUrl.trim());
      }

      if (result.success) {
        if (method === 'github') {
          const imported = result.skills?.length || 0;
          const skipped = result.skipped?.length || 0;
          const failed = result.failed?.length || 0;

          // 保存详细结果
          setImportDetails({
            imported,
            skipped,
            failed,
            skippedList: result.skipped,
            failedList: result.failed
          });

          // 显示汇总消息
          if (skipped > 0 || failed > 0) {
            setSuccess(
              `导入完成：${imported} 个新增，${skipped} 个跳过，${failed} 个失败`
            );
          } else {
            setSuccess(`成功导入 ${imported} 个技能`);
          }

          if (onImportSuccess && result.skills?.length > 0) {
            onImportSuccess(result.skills[0]);
          }
        } else {
          setSuccess(`成功导入技能: ${result.skillId}`);
          if (onImportSuccess && result.skillId) {
            onImportSuccess(result.skillId);
          }
        }

        // 2秒后关闭对话框（如果有详细信息则延长）
        const delay = method === 'github' && (result.skipped?.length || result.failed?.length) ? 5000 : 2000;
        setTimeout(() => {
          onClose();
          resetForm();
        }, delay);
      } else {
        setError(result.error || '导入失败');
      }
    } catch (err) {
      setError(`导入失败: ${(err as Error).message}`);
    } finally {
      setImporting(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setUrl('');
    setGithubUrl('');
    setError(null);
    setSuccess(null);
    setImportDetails(null);
    setMethod('file');
  };

  const handleClose = () => {
    if (!importing) {
      onClose();
      resetForm();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-2xl mx-4">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-500/20 rounded-xl">
              <Upload className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">导入技能</h2>
              <p className="text-sm text-muted-foreground">从本地文件、URL 或 GitHub 导入技能</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={importing}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 导入方式选择 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              选择导入方式
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setMethod('file')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  method === 'file'
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                }`}
              >
                <FileText size={18} />
                本地文件
              </button>
              <button
                onClick={() => setMethod('url')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  method === 'url'
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                }`}
              >
                <Link size={18} />
                URL
              </button>
              <button
                onClick={() => setMethod('github')}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  method === 'github'
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                }`}
              >
                <Github size={18} />
                GitHub
              </button>
            </div>
          </div>

          {/* 本地文件 */}
          {method === 'file' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-orange-500/50 transition-colors">
                <input
                  type="file"
                  accept=".md,.zip"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="skill-file-input"
                  disabled={importing}
                />
                <label
                  htmlFor="skill-file-input"
                  className="cursor-pointer flex flex-col items-center gap-3"
                >
                  <div className="p-4 bg-orange-500/20 rounded-full">
                    <Upload className="w-8 h-8 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {selectedFile ? selectedFile.name : '点击选择文件'}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      支持 .md 和 .zip 格式
                    </p>
                  </div>
                </label>
              </div>

              {selectedFile && (
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl border border-border">
                  <Package className="w-8 h-8 text-orange-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* URL 导入 */}
          {method === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  技能文件 URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/skill.md"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  disabled={importing}
                />
                <p className="text-xs text-slate-500 mt-2">
                  支持 GitHub raw 链接或其他公开的技能文件 URL
                </p>
              </div>
            </div>
          )}

          {/* GitHub 导入 */}
          {method === 'github' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  GitHub 仓库 URL
                </label>
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/user/skills-repo"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-mono text-sm"
                  disabled={importing}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  将自动递归扫描并导入仓库中的所有技能（支持任意深度的子目录）。已存在的技能会被自动跳过。
                </p>
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <AlertCircle size={18} className="text-red-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-200">导入失败</p>
                <p className="text-xs text-red-300/80 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* 成功提示 */}
          {success && (
            <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
              <CheckCircle size={18} className="text-green-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-200">导入成功</p>
                <p className="text-xs text-green-300/80 mt-1">{success}</p>

                {/* 详细结果 */}
                {importDetails && (importDetails.skipped > 0 || importDetails.failed > 0) && (
                  <div className="mt-3 space-y-2">
                    {importDetails.skipped > 0 && importDetails.skippedList && (
                      <details className="group">
                        <summary className="cursor-pointer text-xs text-yellow-300 hover:text-yellow-200 transition-colors">
                          跳过的技能 ({importDetails.skipped})
                        </summary>
                        <div className="mt-2 pl-4 border-l-2 border-yellow-500/30">
                          <ul className="space-y-1">
                            {importDetails.skippedList.map((skillId) => (
                              <li key={skillId} className="text-xs text-yellow-200/80">
                                • {skillId} (已存在)
                              </li>
                            ))}
                          </ul>
                        </div>
                      </details>
                    )}

                    {importDetails.failed > 0 && importDetails.failedList && (
                      <details className="group">
                        <summary className="cursor-pointer text-xs text-red-300 hover:text-red-200 transition-colors">
                          失败的技能 ({importDetails.failed})
                        </summary>
                        <div className="mt-2 pl-4 border-l-2 border-red-500/30">
                          <ul className="space-y-1">
                            {importDetails.failedList.map(({ skillId, error }) => (
                              <li key={skillId} className="text-xs text-red-200/80">
                                • {skillId}: {error}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 按钮 */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={importing}
            >
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleImport}
              disabled={importing || (method === 'file' && !selectedFile) || (method === 'url' && !url.trim()) || (method === 'github' && !githubUrl.trim())}
              loading={importing}
              icon={importing ? Loader2 : Upload}
            >
              {importing ? '导入中...' : '导入'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImportSkillDialog;
