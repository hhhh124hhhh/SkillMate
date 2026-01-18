import { useState, useEffect } from 'react';
import { X, Maximize2, Minimize2, Copy, Download } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer.js';

interface FilePreviewProps {
  filePath: string | null;
  onClose: () => void;
}

export function FilePreview({ filePath, onClose }: FilePreviewProps) {
  const [content, setContent] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(  null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!filePath) {
      setContent('');
      setError(null);
      return;
    }

    const loadFile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await window.ipcRenderer.invoke('fs:read-file', filePath);
        setContent(result as string);
      } catch (err) {
        console.error('Failed to load file:', err);
        setError(`无法读取文件：${err}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadFile();
  }, [filePath]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    // TODO: Show success message
  };

  const handleDownload = () => {
    // Create a blob and download
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filePath?.split('/').pop() || 'document.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getFileExtension = (path: string) => {
    const ext = path.split('.').pop()?.toLowerCase();
    return ext || '';
  };

  const isMarkdown = filePath ? ['md', 'markdown'].includes(getFileExtension(filePath)) : false;

  if (!filePath) {
    return null;
  }

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center ${isFullscreen ? 'p-0' : 'p-4'}`}>
      <div className={`bg-white rounded-lg shadow-2xl flex flex-col ${isFullscreen ? 'w-full h-full rounded-none' : 'max-w-4xl w-full max-h-[80vh]'}`}>
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              {filePath.split('/').pop()}
            </span>
            {isLoading && (
              <span className="text-xs text-gray-500">加载中...</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-gray-100 rounded"
              title={isFullscreen ? "退出全屏" : "全屏"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            {isMarkdown && (
              <>
                <button
                  onClick={handleCopy}
                  className="p-2 hover:bg-gray-100 rounded"
                  title="复制内容"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-2 hover:bg-gray-100 rounded"
                  title="下载文件"
                >
                  <Download className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {isLoading && (
            <div className="flex items-center justify-center h-full text-gray-500">
              加载中...
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full text-red-500">
              {error}
            </div>
          )}

          {!isLoading && !error && content && (
            <div className="prose prose-sm max-w-none">
              {isMarkdown ? (
                <MarkdownRenderer content={content} />
              ) : (
                <pre className="whitespace-pre-wrap text-sm">{content}</pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
