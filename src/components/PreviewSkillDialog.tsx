/**
 * 技能预览对话框组件
 * 预览技能完整内容，支持一键安装
 */

import { useState } from 'react';
import {
  X, Eye, Download, FileText, Code, FolderOpen, Check,
  Loader2, Copy, Star, Tag
} from 'lucide-react';
import { saveAs } from 'file-saver';
import { Button } from './ui/Button';

interface SupportingFile {
  path: string;
  name: string;
  type: 'script' | 'reference' | 'example' | 'other';
  size: number;
}

interface SkillPreviewData {
  id: string;
  name: string;
  description: string;
  content: string;
  frontmatter: {
    name?: string;
    title?: string;
    description?: string;
    emoji?: string;
    difficulty?: string;
    scenarios?: string[];
    category?: string;
    tags?: string[];
  };
  supportingFiles: SupportingFile[];
}

interface PreviewSkillDialogProps {
  skill: SkillPreviewData;
  open: boolean;
  onClose: () => void;
  onInstall?: (skillId: string) => void;
}

export function PreviewSkillDialog({ skill, open, onClose, onInstall }: PreviewSkillDialogProps) {
  const [installing, setInstalling] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'frontmatter' | 'files'>('content');
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleInstall = async () => {
    setInstalling(true);
    try {
      // 保存技能到用户目录
      const result = await window.ipcRenderer.invoke('skills:save', skill.id, skill.content);

      if (result.success) {
        if (onInstall) {
          onInstall(skill.id);
        }
        // 关闭对话框
        setTimeout(() => onClose(), 500);
      }
    } catch (error) {
      console.error('安装失败:', error);
    } finally {
      setInstalling(false);
    }
  };

  const handleExport = async () => {
    try {
      // 创建一个包含技能内容的 Blob
      const blob = new Blob([skill.content], { type: 'text/markdown' });
      saveAs(blob, `${skill.id}.md`);
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(skill.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'script': return <Code className="w-4 h-4 text-green-400" />;
      case 'reference': return <FileText className="w-4 h-4 text-blue-400" />;
      case 'example': return <Star className="w-4 h-4 text-yellow-400" />;
      default: return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const { frontmatter } = skill;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-500/20 rounded-xl">
              <Eye className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{frontmatter.title || skill.name}</h2>
              <p className="text-sm text-slate-400">技能预览</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 元数据卡片 */}
          <div className="mb-6 p-5 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="flex items-start gap-4">
              {frontmatter.emoji && (
                <div className="text-5xl">{frontmatter.emoji}</div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-white">{frontmatter.title || skill.name}</h3>
                  {frontmatter.difficulty && (
                    <span className="text-sm text-yellow-500">{frontmatter.difficulty}</span>
                  )}
                </div>
                <p className="text-sm text-slate-300 mb-3">{frontmatter.description}</p>

                {/* 标签和分类 */}
                <div className="flex flex-wrap gap-2">
                  {frontmatter.category && (
                    <span className="text-xs px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      {frontmatter.category}
                    </span>
                  )}
                  {frontmatter.tags?.map((tag, idx) => (
                    <span key={idx} className="text-xs px-2 py-1 rounded-lg bg-slate-700 text-slate-300 flex items-center gap-1">
                      <Tag size={10} />
                      {tag}
                    </span>
                  ))}
                  {frontmatter.scenarios?.slice(0, 3).map((scenario, idx) => (
                    <span key={idx} className="text-xs px-2 py-1 rounded-lg bg-slate-700 text-slate-400">
                      {scenario}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 标签页 */}
          <div className="flex items-center gap-2 mb-4 p-1 bg-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('content')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'content'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <FileText size={16} />
              技能内容
            </button>
            <button
              onClick={() => setActiveTab('frontmatter')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'frontmatter'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Code size={16} />
              Frontmatter
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'files'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <FolderOpen size={16} />
              辅助文件
              {skill.supportingFiles.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-orange-500">
                  {skill.supportingFiles.length}
                </span>
              )}
            </button>
          </div>

          {/* 内容显示 */}
          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
            {activeTab === 'content' && (
              <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                {skill.content}
              </pre>
            )}

            {activeTab === 'frontmatter' && (
              <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap break-words">
                {skill.content.split('---')[1] || 'No frontmatter found'}
              </pre>
            )}

            {activeTab === 'files' && (
              <div className="space-y-2">
                {skill.supportingFiles.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>此技能没有辅助文件</p>
                  </div>
                ) : (
                  skill.supportingFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-700"
                    >
                      {getFileIcon(file.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{file.name}</p>
                        <p className="text-xs text-slate-500">{file.path}</p>
                      </div>
                      <span className="text-xs text-slate-500">{formatFileSize(file.size)}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex items-center justify-between p-6 border-t border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              icon={copied ? Check : Copy}
            >
              {copied ? '已复制' : '复制'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExport}
              icon={Download}
            >
              导出
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={installing}
            >
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleInstall}
              disabled={installing}
              loading={installing}
              icon={installing ? Loader2 : Download}
            >
              {installing ? '安装中...' : '一键安装'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PreviewSkillDialog;
