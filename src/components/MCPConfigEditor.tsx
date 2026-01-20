import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Server, Check, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface MCPServer {
  name: string;
  description?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  type?: 'stdio' | 'streamableHttp';
  baseUrl?: string;
  headers?: Record<string, string>;
}

interface MCPConfig {
  mcpServers: Record<string, MCPServer>;
}

interface MCPConfigEditorProps {
  onClose: () => void;
}

export function MCPConfigEditor({ onClose }: MCPConfigEditorProps) {
  const [config, setConfig] = useState<MCPConfig>({ mcpServers: {} });
  const [jsonContent, setJsonContent] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [saved, setSaved] = useState(false);
  const [expandedServers, setExpandedServers] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const content = await window.ipcRenderer.invoke('mcp:get-config') as string;
      setJsonContent(content || JSON.stringify({ mcpServers: {} }, null, 2));
      const parsed = JSON.parse(content || '{}');
      setConfig(parsed);
      setJsonError('');
    } catch (error) {
      console.error('Failed to load MCP config:', error);
      setJsonError('加载配置失败');
    }
  };

  const handleJsonChange = (value: string) => {
    setJsonContent(value);

    try {
      const parsed = JSON.parse(value);
      setConfig(parsed);
      setJsonError('');
    } catch (error) {
      setJsonError('JSON 格式无效: ' + (error as Error).message);
    }
  };

  const handleSave = async () => {
    if (jsonError) {
      alert('请先修正 JSON 格式错误');
      return;
    }

    try {
      const result = await window.ipcRenderer.invoke('mcp:save-config', jsonContent);
      if ((result as { success: boolean }).success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        alert('保存失败：' + (result as { error?: string }).error);
      }
    } catch (error) {
      console.error('Failed to save MCP config:', error);
      alert('保存失败：' + (error as Error).message);
    }
  };

  const addServer = () => {
    const newServerName = `new-server-${Date.now()}`;
    const newConfig: MCPConfig = {
      ...config,
      mcpServers: {
        ...config.mcpServers,
        [newServerName]: {
          description: '新服务器',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-filesystem'],
          env: {}
        }
      }
    };
    setConfig(newConfig);
    setJsonContent(JSON.stringify(newConfig, null, 2));
    setExpandedServers(new Set([...expandedServers, newServerName]));
  };

  const removeServer = (serverName: string) => {
    if (!confirm(`确定要删除 MCP 服务器"${serverName}"吗？`)) {
      return;
    }

    const newServers = { ...config.mcpServers };
    delete newServers[serverName];
    const newConfig: MCPConfig = { mcpServers: newServers };
    setConfig(newConfig);
    setJsonContent(JSON.stringify(newConfig, null, 2));
  };

  const toggleServer = (serverName: string) => {
    const newExpanded = new Set(expandedServers);
    if (newExpanded.has(serverName)) {
      newExpanded.delete(serverName);
    } else {
      newExpanded.add(serverName);
    }
    setExpandedServers(newExpanded);
  };

  const serverNames = Object.keys(config.mcpServers || {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg text-green-600">
              <Server size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">MCP 配置</h2>
              <p className="text-xs text-slate-500">管理 Model Context Protocol 服务器</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Server List */}
          <div className="px-6 py-4 border-b border-slate-100 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700">已配置的服务器 ({serverNames.length})</h3>
              <button
                onClick={addServer}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                <Plus size={14} />
                添加服务器
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {serverNames.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">
                  暂无已配置的 MCP 服务器
                </div>
              ) : (
                serverNames.map((name) => {
                  const server = config.mcpServers![name];
                  const isExpanded = expandedServers.has(name);

                  return (
                    <div key={name} className="border border-slate-200 rounded-lg overflow-hidden">
                      <div
                        className="flex items-center justify-between p-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => toggleServer(name)}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          <Server size={14} className="text-green-600" />
                          <span className="font-medium text-slate-700 truncate">{name}</span>
                          {server.description && (
                            <span className="text-xs text-slate-500 truncate">
                              - {server.description}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeServer(name);
                          }}
                          className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="p-3 bg-white border-t border-slate-200 text-xs font-mono text-slate-600 space-y-1">
                          {server.command && (
                            <div><span className="text-slate-400">command:</span> {server.command}</div>
                          )}
                          {server.args && (
                            <div><span className="text-slate-400">args:</span> {JSON.stringify(server.args)}</div>
                          )}
                          {server.baseUrl && (
                            <div><span className="text-slate-400">baseUrl:</span> {server.baseUrl}</div>
                          )}
                          {server.type && (
                            <div><span className="text-slate-400">type:</span> {server.type}</div>
                          )}
                          {server.env && Object.keys(server.env).length > 0 && (
                            <div><span className="text-slate-400">env:</span> {JSON.stringify(server.env)}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* JSON Editor */}
          <div className="flex-1 flex flex-col p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-700">配置 (JSON)</h3>
              {jsonError && (
                <div className="flex items-center gap-1 text-red-600 text-sm">
                  <AlertCircle size={14} />
                  <span>{jsonError}</span>
                </div>
              )}
            </div>

            <div className="flex-1 relative">
              <textarea
                value={jsonContent}
                onChange={(e) => handleJsonChange(e.target.value)}
                placeholder={`{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"],
      "env": {}
    }
  }
}`}
                className={`w-full h-full p-4 font-mono text-sm border rounded-xl resize-none focus:outline-none focus:ring-2 transition-all ${
                  jsonError
                    ? 'border-red-300 bg-red-50 focus:ring-red-500/20'
                    : 'border-slate-200 bg-slate-50 focus:ring-green-500/20'
                }`}
                spellCheck={false}
              />
            </div>

            {/* Help Text */}
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800 mb-2 font-medium">
                📚 MCP 配置说明：
              </p>
              <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                <li><code className="bg-blue-100 px-1 rounded">stdio</code> 类型：使用 <code className="bg-blue-100 px-1 rounded">command</code> 和 <code className="bg-blue-100 px-1 rounded">args</code> 启动进程</li>
                <li><code className="bg-blue-100 px-1 rounded">streamableHttp</code> 类型：使用 <code className="bg-blue-100 px-1 rounded">baseUrl</code> 连接 HTTP 服务</li>
                <li>环境变量通过 <code className="bg-blue-100 px-1 rounded">env</code> 字段配置（如 API Key）</li>
                <li>配置保存位置：<code className="bg-blue-100 px-1 rounded">~/.aiagent/mcp.json</code></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              修改配置后需要重启应用才能生效
            </p>
            <button
              onClick={handleSave}
              disabled={!!jsonError || saved}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 ${
                saved
                  ? 'bg-green-50 text-green-600 border border-green-200'
                  : 'bg-green-600 text-white hover:bg-green-700 shadow-green-200'
              } ${jsonError ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {saved ? <Check size={16} /> : null}
              {saved ? '已保存' : '保存配置'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
