import { useState, useEffect } from 'react';
import {
  X, Plus, Trash2, Server, Check, AlertCircle, ChevronDown, ChevronUp,
  FileText, Copy, Globe, Terminal, Settings
} from 'lucide-react';

interface MCPServer {
  name?: string;
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

interface MCPServerStatus {
  name: string;
  connected: boolean;
  error?: string;
  retryCount?: number;
}

interface MCPTemplate {
  name: string;
  description: string;
  type: 'stdio' | 'streamableHttp';
  config: MCPServer;
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
  const [editingServer, setEditingServer] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<MCPServer>({});
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<MCPTemplate[]>([]);
  const [mcpStatus, setMcpStatus] = useState<MCPServerStatus[]>([]);

  useEffect(() => {
    loadConfig();
    loadTemplates();

    // 定期刷新 MCP 状态
    const loadStatus = async () => {
      try {
        const status = await window.ipcRenderer.invoke('mcp:get-status') as MCPServerStatus[];
        setMcpStatus(status);
      } catch (error) {
        console.error('Failed to load MCP status:', error);
      }
    };

    loadStatus();
    const interval = setInterval(loadStatus, 5000);

    return () => clearInterval(interval);
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

  const loadTemplates = async () => {
    try {
      const response = await fetch('/resources/mcp-templates.json');
      const text = await response.text();
      const templateConfig = JSON.parse(text);
      const templateList: MCPTemplate[] = [];

      for (const [name, server] of Object.entries(templateConfig.mcpServers || {})) {
        const serverConfig = server as MCPServer;
        templateList.push({
          name,
          description: serverConfig.description || '',
          type: serverConfig.baseUrl ? 'streamableHttp' : 'stdio',
          config: serverConfig as MCPServer
        });
      }

      setTemplates(templateList);
    } catch (error) {
      console.error('Failed to load MCP templates:', error);
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
          type: 'stdio',
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-name'],
          env: {}
        }
      }
    };
    setConfig(newConfig);
    setJsonContent(JSON.stringify(newConfig, null, 2));
    setExpandedServers(new Set([...expandedServers, newServerName]));
    setEditingServer(newServerName);
    setEditForm(newConfig.mcpServers[newServerName]);
  };

  const applyTemplate = (template: MCPTemplate) => {
    const newServerName = template.name;
    const newConfig: MCPConfig = {
      ...config,
      mcpServers: {
        ...config.mcpServers,
        [newServerName]: { ...template.config }
      }
    };
    setConfig(newConfig);
    setJsonContent(JSON.stringify(newConfig, null, 2));
    setExpandedServers(new Set([...expandedServers, newServerName]));
    setShowTemplates(false);
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

    if (editingServer === serverName) {
      setEditingServer(null);
    }
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

  const startEdit = (serverName: string) => {
    const server = config.mcpServers![serverName];
    setEditingServer(serverName);
    setEditForm({ ...server });
  };

  const cancelEdit = () => {
    setEditingServer(null);
    setEditForm({});
  };

  const saveEdit = (serverName: string) => {
    const newConfig: MCPConfig = {
      ...config,
      mcpServers: {
        ...config.mcpServers,
        [serverName]: editForm
      }
    };
    setConfig(newConfig);
    setJsonContent(JSON.stringify(newConfig, null, 2));
    setEditingServer(null);
  };

  const updateFormField = (field: string, value: string | boolean | string[] | Record<string, string> | undefined) => {
    setEditForm({ ...editForm, [field]: value });
  };

  const addEnvVar = () => {
    setEditForm({
      ...editForm,
      env: { ...editForm.env, '': '' }
    });
  };

  const updateEnvVar = (key: string, newKey: string, value: string) => {
    const newEnv = { ...editForm.env };
    delete newEnv[key];
    newEnv[newKey] = value;
    setEditForm({ ...editForm, env: newEnv });
  };

  const removeEnvVar = (key: string) => {
    const newEnv = { ...editForm.env };
    delete newEnv[key];
    setEditForm({ ...editForm, env: newEnv });
  };

  const addHeader = () => {
    setEditForm({
      ...editForm,
      headers: { ...editForm.headers, '': '' }
    });
  };

  const updateHeader = (key: string, newKey: string, value: string) => {
    const newHeaders = { ...editForm.headers };
    delete newHeaders[key];
    newHeaders[newKey] = value;
    setEditForm({ ...editForm, headers: newHeaders });
  };

  const removeHeader = (key: string) => {
    const newHeaders = { ...editForm.headers };
    delete newHeaders[key];
    setEditForm({ ...editForm, headers: newHeaders });
  };

  const handleReconnect = async (serverName: string) => {
    try {
      const success = await window.ipcRenderer.invoke('mcp:reconnect', serverName) as boolean;
      if (success) {
        // 立即刷新状态
        const status = await window.ipcRenderer.invoke('mcp:get-status') as MCPServerStatus[];
        setMcpStatus(status);
      } else {
        alert(`重试连接 ${serverName} 失败，请查看日志了解详情`);
      }
    } catch (error) {
      console.error('Failed to reconnect MCP server:', error);
      alert('重试连接失败：' + (error as Error).message);
    }
  };

  const serverNames = Object.keys(config.mcpServers || {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-100">
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            >
              <FileText size={14} />
              模板库
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Server List */}
          <div className="w-96 border-r border-slate-200 flex flex-col bg-white">
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-700">服务器 ({serverNames.length})</h3>
                <button
                  onClick={addServer}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <Plus size={14} />
                  添加
                </button>
              </div>

              {/* MCP 服务器状态 */}
              {mcpStatus.length > 0 && (
                <div className="mt-3 space-y-2">
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide">连接状态</h4>
                  {mcpStatus.map((server) => (
                    <div
                      key={server.name}
                      className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {server.connected ? (
                          <Check size={14} className="text-green-500 flex-shrink-0" />
                        ) : (
                          <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium text-slate-700 truncate">{server.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {server.retryCount && server.retryCount > 0 && (
                          <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">
                            重试中 ({server.retryCount})
                          </span>
                        )}
                        {!server.connected && (
                          <button
                            onClick={() => handleReconnect(server.name)}
                            className="text-xs px-2 py-1 bg-orange-500 text-white rounded hover:bg-blue-600 transition-colors"
                            title="重新连接"
                          >
                            重试
                          </button>
                        )}
                        {server.error && (
                          <div className="text-xs text-red-600 max-w-[100px] truncate" title={server.error}>
                            {server.error}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {serverNames.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  <Server size={48} className="mx-auto mb-3 text-slate-300" />
                  <p className="mb-2">暂无已配置的 MCP 服务器</p>
                  <p className="text-xs">从模板库添加或创建新服务器</p>
                </div>
              ) : (
                serverNames.map((name) => {
                  const server = config.mcpServers![name];
                  const isExpanded = expandedServers.has(name);
                  const isEditing = editingServer === name;

                  return (
                    <div
                      key={name}
                      className={`border rounded-lg overflow-hidden transition-all ${
                        isEditing ? 'border-green-300 bg-green-50/30' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className="flex items-center justify-between p-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => !isEditing && toggleServer(name)}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {isExpanded && !isEditing ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          <Server size={14} className="text-green-600" />
                          <span className="font-medium text-slate-700 truncate">{name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(name);
                            }}
                            className="p-1 text-orange-500 hover:bg-orange-50 rounded transition-colors"
                            title="编辑"
                          >
                            <Settings size={12} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeServer(name);
                            }}
                            className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="删除"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {isExpanded && !isEditing && (
                        <div className="p-3 bg-white border-t border-slate-200 text-xs space-y-1">
                          <div className="text-slate-600">
                            <span className="text-slate-400">描述:</span> {server.description || '无'}
                          </div>
                          <div className="text-slate-600">
                            <span className="text-slate-400">类型:</span>{' '}
                            <span className={`font-medium ${
                              server.type === 'streamableHttp' ? 'text-purple-600' : 'text-orange-600'
                            }`}>
                              {server.type === 'streamableHttp' ? 'HTTP API' : '命令行'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel - Editor or Templates */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {showTemplates ? (
              // Templates Panel
              <div className="flex-1 overflow-y-auto p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                  <FileText size={20} className="text-green-600" />
                  服务器模板库
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.name}
                      className="border border-slate-200 rounded-xl p-4 hover:border-green-300 hover:shadow-md transition-all cursor-pointer bg-white"
                      onClick={() => applyTemplate(template)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-slate-800">{template.name}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          template.type === 'streamableHttp'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {template.type === 'streamableHttp' ? 'HTTP' : 'STDIO'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">{template.description}</p>
                      <div className="text-xs text-slate-500 font-mono bg-slate-50 p-2 rounded">
                        {template.type === 'stdio'
                          ? `${template.config.command} ${template.config.args?.join(' ') || ''}`
                          : template.config.baseUrl
                        }
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <button className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                          <Copy size={14} />
                          应用模板
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : editingServer ? (
              // Form Editor
              <div className="flex-1 overflow-y-auto p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-800">编辑服务器: {editingServer}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => saveEdit(editingServer)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      <Check size={14} />
                      保存
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      服务器类型 <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => updateFormField('type', 'stdio')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                          editForm.type === 'stdio' || !editForm.type
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <Terminal size={18} />
                        <div className="text-left">
                          <div className="font-medium">命令行 (stdio)</div>
                          <div className="text-xs opacity-75">启动本地进程</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => updateFormField('type', 'streamableHttp')}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                          editForm.type === 'streamableHttp'
                            ? 'border-purple-500 bg-purple-50 text-purple-700'
                            : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <Globe size={18} />
                        <div className="text-left">
                          <div className="font-medium">HTTP API</div>
                          <div className="text-xs opacity-75">连接远程服务</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Common Fields */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      描述
                    </label>
                    <input
                      type="text"
                      value={editForm.description || ''}
                      onChange={(e) => updateFormField('description', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
                      placeholder="例如：文件系统访问服务"
                    />
                  </div>

                  {/* stdio Type Fields */}
                  {(editForm.type === 'stdio' || !editForm.type) && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          启动命令 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={editForm.command || ''}
                          onChange={(e) => updateFormField('command', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 font-mono"
                          placeholder="npx"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          命令参数 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={(editForm.args || []).join(' ')}
                          onChange={(e) => updateFormField('args', e.target.value.split(' '))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 font-mono"
                          placeholder="-y @modelcontextprotocol/server-filesystem /path"
                        />
                        <p className="text-xs text-slate-500 mt-1">参数以空格分隔</p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-slate-700">
                            环境变量
                          </label>
                          <button
                            onClick={addEnvVar}
                            className="text-xs text-green-600 hover:text-green-700 font-medium"
                          >
                            + 添加变量
                          </button>
                        </div>
                        <div className="space-y-2">
                          {Object.entries(editForm.env || {}).map(([key, value]) => (
                            <div key={key} className="flex gap-2">
                              <input
                                type="text"
                                value={key}
                                onChange={(e) => updateEnvVar(key, e.target.value, value as string)}
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 font-mono"
                                placeholder="变量名"
                              />
                              <input
                                type="text"
                                value={value as string}
                                onChange={(e) => updateEnvVar(key, key, e.target.value)}
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 font-mono"
                                placeholder="值"
                              />
                              <button
                                onClick={() => removeEnvVar(key)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                          {Object.keys(editForm.env || {}).length === 0 && (
                            <div className="text-center py-4 text-sm text-slate-400 border border-dashed border-slate-300 rounded-lg">
                              暂无环境变量
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {/* streamableHttp Type Fields */}
                  {editForm.type === 'streamableHttp' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Base URL <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={editForm.baseUrl || ''}
                          onChange={(e) => updateFormField('baseUrl', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 font-mono"
                          placeholder="https://api.example.com/mcp"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-slate-700">
                            HTTP Headers
                          </label>
                          <button
                            onClick={addHeader}
                            className="text-xs text-green-600 hover:text-green-700 font-medium"
                          >
                            + 添加 Header
                          </button>
                        </div>
                        <div className="space-y-2">
                          {Object.entries(editForm.headers || {}).map(([key, value]) => (
                            <div key={key} className="flex gap-2">
                              <input
                                type="text"
                                value={key}
                                onChange={(e) => updateHeader(key, e.target.value, value as string)}
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 font-mono"
                                placeholder="Header 名称"
                              />
                              <input
                                type="text"
                                value={value as string}
                                onChange={(e) => updateHeader(key, key, e.target.value)}
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 font-mono"
                                placeholder="Header 值"
                              />
                              <button
                                onClick={() => removeHeader(key)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                          {Object.keys(editForm.headers || {}).length === 0 && (
                            <div className="text-center py-4 text-sm text-slate-400 border border-dashed border-slate-300 rounded-lg">
                              暂无 HTTP Headers
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              // JSON Editor
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
      "description": "文件系统访问",
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"],
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
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-xs text-blue-800 mb-2 font-medium">
                    📚 MCP 配置说明：
                  </p>
                  <ul className="text-xs text-orange-700 space-y-1 list-disc list-inside">
                    <li><code className="bg-orange-100 px-1 rounded">stdio</code> 类型：使用 <code className="bg-orange-100 px-1 rounded">command</code> 和 <code className="bg-orange-100 px-1 rounded">args</code> 启动进程</li>
                    <li><code className="bg-orange-100 px-1 rounded">streamableHttp</code> 类型：使用 <code className="bg-orange-100 px-1 rounded">baseUrl</code> 连接 HTTP 服务</li>
                    <li>环境变量通过 <code className="bg-orange-100 px-1 rounded">env</code> 字段配置（如 API Key）</li>
                    <li>配置保存位置：<code className="bg-orange-100 px-1 rounded">~/.aiagent/mcp.json</code></li>
                  </ul>
                </div>
              </div>
            )}
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
