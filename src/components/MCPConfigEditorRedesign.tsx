import { useState, useEffect } from 'react';
import {
  X, Plus, Search, FileText, Terminal, Globe, Trash2, Check,
  Settings, Server, Zap
} from 'lucide-react';
import { showConfirm } from '../utils/dialog.js';

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

interface MCPTemplate {
  name: string;
  description: string;
  type: 'stdio' | 'streamableHttp';
  config: MCPServer;
}

interface MCPConfigEditorRedesignProps {
  onClose: () => void;
}

export function MCPConfigEditorRedesign({ onClose }: MCPConfigEditorRedesignProps) {
  const [config, setConfig] = useState<MCPConfig>({ mcpServers: {} });
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editForm, setEditForm] = useState<MCPServer>({});
  const [showTemplates, setShowTemplates] = useState(false);
  const [showJSONEditor, setShowJSONEditor] = useState(false);
  const [saved, setSaved] = useState(false);
  const [templates, setTemplates] = useState<MCPTemplate[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadConfig();
    loadTemplates();
  }, []);

  const loadConfig = async () => {
    try {
      const content = await window.ipcRenderer.invoke('mcp:get-config') as string;
      const parsed = JSON.parse(content || '{}');
      setConfig(parsed);
      setConnectionStatus(
        Object.keys(parsed.mcpServers || {}).reduce((acc, name) => ({
          ...acc,
          [name]: Math.random() > 0.3 // 模拟连接状态
        }), {})
      );
    } catch (error) {
      console.error('Failed to load MCP config:', error);
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

  const handleSave = async () => {
    try {
      const jsonContent = JSON.stringify(config, null, 2);
      const result = await window.ipcRenderer.invoke('mcp:save-config', jsonContent);
      if ((result as { success: boolean }).success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error('Failed to save MCP config:', error);
    }
  };

  const selectServer = (serverName: string) => {
    setSelectedServer(serverName);
    const server = config.mcpServers![serverName];
    setEditForm({ ...server });
  };

  const addServer = () => {
    const newServerName = `new-server-${Date.now()}`;
    const newServer: MCPServer = {
      description: '新服务器',
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-name'],
      env: {}
    };
    const newConfig: MCPConfig = {
      ...config,
      mcpServers: {
        ...config.mcpServers,
        [newServerName]: newServer
      }
    };
    setConfig(newConfig);
    setSelectedServer(newServerName);
    setEditForm(newServer);
  };

  const removeServer = async (serverName: string) => {
    const confirmed = await showConfirm({
      title: '确认删除',
      message: `确定要删除 MCP 服务器"${serverName}"吗？`,
      confirmText: '确认删除',
      cancelText: '取消'
    });

    if (!confirmed) {
      return;
    }

    const newServers = { ...config.mcpServers };
    delete newServers[serverName];
    const newConfig: MCPConfig = { mcpServers: newServers };
    setConfig(newConfig);

    if (selectedServer === serverName) {
      setSelectedServer(null);
      setEditForm({});
    }
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
    setSelectedServer(newServerName);
    setEditForm({ ...template.config });
    setShowTemplates(false);
  };

  const updateFormField = (field: string, value: any) => {
    setEditForm({ ...editForm, [field]: value });
  };

  const saveCurrentServer = () => {
    if (!selectedServer) return;

    const newConfig: MCPConfig = {
      ...config,
      mcpServers: {
        ...config.mcpServers,
        [selectedServer]: editForm
      }
    };
    setConfig(newConfig);
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

  const filteredServers = Object.entries(config.mcpServers || {}).filter(([name, server]) => {
    const query = searchQuery.toLowerCase();
    return name.toLowerCase().includes(query) ||
           (server.description && server.description.toLowerCase().includes(query));
  });

  const getServerIcon = (name: string) => {
    if (name.includes('zai')) return '🤖';
    if (name.includes('search')) return '🔍';
    if (name.includes('pencil')) return '✏️';
    if (name.includes('web')) return '🌐';
    return '🖧';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-6">
      <div className="w-full max-w-[1400px] h-[85vh] bg-[#0f1419] rounded-xl border border-[#2d343d] shadow-2xl flex flex-col overflow-hidden">
        {/* 工具栏 */}
        <div className="h-[72px] bg-[#252b33] border-b border-[#2d343d] flex items-center px-6 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-orange-500 rounded shadow-[0_0_10px_rgba(59,130,246,0.3)]"></div>
            <h2 className="text-lg font-semibold text-slate-100">MCP 配置</h2>
          </div>

          <div className="flex-1"></div>

          <div className="relative w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="搜索服务器..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 bg-[#0f1419] border border-[#2d343d] rounded-lg pl-10 pr-3 text-sm text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 transition-all"
            />
          </div>

          <button
            onClick={() => setShowTemplates(true)}
            className="h-10 px-4 bg-[#0f1419] border border-[#3d4452] rounded-lg text-sm font-medium text-slate-100 hover:bg-[#2d343d] hover:border-[#4d5566] transition-all flex items-center gap-2"
          >
            <FileText size={16} />
            模板库
          </button>

          <button
            onClick={addServer}
            className="h-10 px-4 bg-orange-500 rounded-lg text-sm font-medium text-white hover:bg-orange-600 transition-all flex items-center gap-2 shadow-[0_2px_8px_rgba(59,130,246,0.3)]"
          >
            <Plus size={16} />
            添加服务器
          </button>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-[#2d343d] rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 主内容区 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧服务器列表 */}
          <div className="w-[340px] bg-[#0f1419] border-r border-[#2d343d] flex flex-col">
            <div className="p-4 border-b border-[#2d343d]">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                已配置的服务器
              </div>
              <div className="text-xs text-cyan-500 font-mono">
                {Object.keys(config.mcpServers || {}).length} 个服务器
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredServers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Server size={48} className="text-slate-700 mb-4" />
                  <div className="text-sm font-semibold text-slate-100 mb-1">暂无服务器</div>
                  <div className="text-xs text-slate-500">添加服务器或从模板库选择</div>
                </div>
              ) : (
                filteredServers.map(([name, server]) => {
                  const isConnected = connectionStatus[name];
                  const isSelected = selectedServer === name;

                  return (
                    <div
                      key={name}
                      onClick={() => selectServer(name)}
                      className={`
                        relative p-4 rounded-lg cursor-pointer transition-all
                        ${isSelected
                          ? 'bg-[#252b33] border-orange-500 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                          : 'bg-[#1a1f26] border-[#2d343d] hover:bg-[#2d343d] hover:border-[#3d4452]'
                        }
                        border
                      `}
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#2d343d] transition-all rounded-l-lg
                        ${isSelected ? '!w-0.5 !bg-orange-500 shadow-[0_0_8px_rgba(59,130,246,1)]' : ''}
                      " />

                      <div className="flex items-center gap-3 mb-2">
                        <div className={`
                          w-2.5 h-2.5 rounded-full
                          ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.2)]' : 'bg-yellow-500'}
                        `}></div>

                        <div className="w-8 h-8 bg-[#0f1419] rounded flex items-center justify-center text-sm">
                          {getServerIcon(name)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-100 truncate">{name}</div>
                        </div>

                        <span className={`
                          text-[10px] font-semibold uppercase px-2 py-0.5 rounded font-mono
                          ${server.type === 'streamableHttp'
                            ? 'bg-cyan-500/15 text-cyan-500'
                            : 'bg-orange-500/15 text-orange-500'
                          }
                        `}>
                          {server.type === 'streamableHttp' ? 'HTTP' : 'stdio'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 line-clamp-2 pl-7">
                        {server.description || '无描述'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 右侧配置面板 */}
          <div className="flex-1 bg-[#1a1f26] flex flex-col overflow-hidden">
            {selectedServer ? (
              <>
                <div className="px-6 py-5 border-b border-[#2d343d] flex items-center justify-between">
                  <div className="text-base font-semibold text-slate-100">服务器配置</div>
                  <div className={`
                    flex items-center gap-2 px-3 py-1.5 bg-[#0f1419] rounded text-sm font-medium
                    ${connectionStatus[selectedServer] ? 'text-green-500' : 'text-yellow-500'}
                  `}>
                    <div className={`
                      w-2 h-2 rounded-full
                      ${connectionStatus[selectedServer] ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.2)]' : 'bg-yellow-500'}
                    `}></div>
                    {connectionStatus[selectedServer] ? '已连接' : '未连接'}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6">
                  {/* 类型选择 */}
                  <div className="mb-8">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">连接类型</div>
                    <div className="h-px bg-[#2d343d] mb-4"></div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => updateFormField('type', 'stdio')}
                        className={`
                          h-[60px] p-3 rounded-lg border-2 flex items-center gap-3 transition-all
                          ${(!editForm.type || editForm.type === 'stdio')
                            ? 'border-orange-500 bg-[#252b33] shadow-[0_0_0_3px_rgba(59,130,246,0.15)]'
                            : 'border-[#2d343d] bg-[#0f1419] hover:border-[#3d4452]'
                          }
                        `}
                      >
                        <div className="w-9 h-9 bg-[#252b33] rounded flex items-center justify-center text-lg">
                          <Terminal size={18} />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-semibold text-slate-100">命令行 (stdio)</div>
                          <div className="text-[11px] text-slate-500">启动本地进程</div>
                        </div>
                      </button>

                      <button
                        onClick={() => updateFormField('type', 'streamableHttp')}
                        className={`
                          h-[60px] p-3 rounded-lg border-2 flex items-center gap-3 transition-all
                          ${editForm.type === 'streamableHttp'
                            ? 'border-orange-500 bg-[#252b33] shadow-[0_0_0_3px_rgba(59,130,246,0.15)]'
                            : 'border-[#2d343d] bg-[#0f1419] hover:border-[#3d4452]'
                          }
                        `}
                      >
                        <div className="w-9 h-9 bg-[#252b33] rounded flex items-center justify-center text-lg">
                          <Globe size={18} />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-semibold text-slate-100">HTTP API</div>
                          <div className="text-[11px] text-slate-500">连接远程服务</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* 基础信息 */}
                  <div className="mb-8">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">基础信息</div>
                    <div className="h-px bg-[#2d343d] mb-4"></div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">服务器名称</label>
                        <input
                          type="text"
                          value={selectedServer}
                          disabled
                          className="w-full h-10 bg-[#0f1419] border border-[#2d343d] rounded px-3 text-sm text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 transition-all opacity-50"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">描述</label>
                        <input
                          type="text"
                          value={editForm.description || ''}
                          onChange={(e) => updateFormField('description', e.target.value)}
                          className="w-full h-10 bg-[#0f1419] border border-[#2d343d] rounded px-3 text-sm text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 transition-all"
                          placeholder="例如：AI 辅助工具"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 连接配置 */}
                  <div className="mb-8">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">连接配置</div>
                    <div className="h-px bg-[#2d343d] mb-4"></div>

                    {(!editForm.type || editForm.type === 'stdio') ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-2">启动命令</label>
                          <input
                            type="text"
                            value={editForm.command || ''}
                            onChange={(e) => updateFormField('command', e.target.value)}
                            className="w-full h-10 bg-[#0f1419] border border-[#2d343d] rounded px-3 text-sm text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 transition-all font-mono"
                            placeholder="npx"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-2">命令参数</label>
                          <input
                            type="text"
                            value={(editForm.args || []).join(' ')}
                            onChange={(e) => updateFormField('args', e.target.value.split(' '))}
                            className="w-full h-10 bg-[#0f1419] border border-[#2d343d] rounded px-3 text-sm text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 transition-all font-mono"
                            placeholder="-y @package/name"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-slate-400">环境变量</label>
                            <button
                              onClick={addEnvVar}
                              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-[#2d343d] rounded transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          <div className="bg-[#0f1419] border border-[#2d343d] rounded overflow-hidden">
                            {Object.entries(editForm.env || {}).map(([key, value]) => (
                              <div key={key} className="flex gap-2 p-2 border-b border-[#2d343d] last:border-b-0">
                                <input
                                  type="text"
                                  value={key}
                                  onChange={(e) => updateEnvVar(key, e.target.value, value as string)}
                                  className="flex-1 h-9 bg-transparent border-none px-2 text-sm text-slate-100 font-mono focus:outline-none"
                                  placeholder="变量名"
                                />
                                <input
                                  type={key.includes('KEY') || key.includes('TOKEN') ? 'password' : 'text'}
                                  value={value as string}
                                  onChange={(e) => updateEnvVar(key, key, e.target.value)}
                                  className="flex-1 h-9 bg-transparent border-none px-2 text-sm text-slate-100 font-mono focus:outline-none"
                                  placeholder="值"
                                />
                                <button
                                  onClick={() => removeEnvVar(key)}
                                  className="w-7 h-7 text-slate-500 hover:text-red-500 hover:bg-[#2d343d] rounded transition-colors flex items-center justify-center"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                            {Object.keys(editForm.env || {}).length === 0 && (
                              <div className="text-center py-4 text-sm text-slate-500">
                                暂无环境变量
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-2">Base URL</label>
                          <input
                            type="text"
                            value={editForm.baseUrl || ''}
                            onChange={(e) => updateFormField('baseUrl', e.target.value)}
                            className="w-full h-10 bg-[#0f1419] border border-[#2d343d] rounded px-3 text-sm text-slate-100 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15 transition-all font-mono"
                            placeholder="https://api.example.com/mcp"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-slate-400">HTTP Headers</label>
                            <button
                              onClick={addHeader}
                              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-[#2d343d] rounded transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          <div className="bg-[#0f1419] border border-[#2d343d] rounded overflow-hidden">
                            {Object.entries(editForm.headers || {}).map(([key, value]) => (
                              <div key={key} className="flex gap-2 p-2 border-b border-[#2d343d] last:border-b-0">
                                <input
                                  type="text"
                                  value={key}
                                  onChange={(e) => updateHeader(key, e.target.value, value as string)}
                                  className="flex-1 h-9 bg-transparent border-none px-2 text-sm text-slate-100 font-mono focus:outline-none"
                                  placeholder="Header 名称"
                                />
                                <input
                                  type="text"
                                  value={value as string}
                                  onChange={(e) => updateHeader(key, key, e.target.value)}
                                  className="flex-1 h-9 bg-transparent border-none px-2 text-sm text-slate-100 font-mono focus:outline-none"
                                  placeholder="Header 值"
                                />
                                <button
                                  onClick={() => removeHeader(key)}
                                  className="w-7 h-7 text-slate-500 hover:text-red-500 hover:bg-[#2d343d] rounded transition-colors flex items-center justify-center"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                            {Object.keys(editForm.headers || {}).length === 0 && (
                              <div className="text-center py-4 text-sm text-slate-500">
                                暂无 HTTP Headers
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="px-6 py-5 border-t border-[#2d343d] bg-[#252b33] flex gap-3 justify-end">
                  <button
                    onClick={() => setSelectedServer(null)}
                    className="h-10 px-4 bg-[#0f1419] border border-[#3d4452] rounded-lg text-sm font-medium text-slate-100 hover:bg-[#2d343d] hover:border-[#4d5566] transition-all"
                  >
                    取消
                  </button>
                  <button
                    className="h-10 px-4 bg-[#0f1419] border border-[#3d4452] rounded-lg text-sm font-medium text-slate-100 hover:bg-[#2d343d] hover:border-[#4d5566] transition-all flex items-center gap-2"
                  >
                    <Zap size={14} />
                    测试连接
                  </button>
                  <button
                    onClick={() => { saveCurrentServer(); handleSave(); }}
                    className="h-10 px-4 bg-orange-500 rounded-lg text-sm font-medium text-white hover:bg-orange-600 transition-all flex items-center gap-2 shadow-[0_2px_8px_rgba(59,130,246,0.3)]"
                  >
                    <Check size={14} />
                    保存配置
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Server size={64} className="text-slate-700 mx-auto mb-4" />
                  <div className="text-lg font-semibold text-slate-100 mb-2">选择一个服务器</div>
                  <div className="text-sm text-slate-500">从左侧列表选择服务器以查看和编辑配置</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 模板库弹窗 */}
        {showTemplates && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-6 z-10">
            <div className="w-full max-w-4xl max-h-[80vh] bg-[#1a1f26] rounded-xl border border-[#2d343d] shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-[#2d343d] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-orange-500" />
                  <h3 className="text-lg font-semibold text-slate-100">服务器模板库</h3>
                </div>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="p-2 text-slate-400 hover:text-slate-100 hover:bg-[#2d343d] rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(80vh-100px)]">
                <div className="grid grid-cols-2 gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.name}
                      onClick={() => applyTemplate(template)}
                      className="bg-[#0f1419] border border-[#2d343d] rounded-xl p-5 hover:border-orange-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-semibold text-slate-100">{template.name}</h4>
                        <span className={`
                          text-xs px-2 py-1 rounded-full font-mono font-medium
                          ${template.type === 'streamableHttp'
                            ? 'bg-cyan-500/15 text-cyan-500'
                            : 'bg-orange-500/15 text-orange-500'
                          }
                        `}>
                          {template.type === 'streamableHttp' ? 'HTTP' : 'STDIO'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mb-4">{template.description}</p>
                      <div className="text-xs text-slate-500 font-mono bg-[#252b33] p-2 rounded">
                        {template.type === 'stdio'
                          ? `${template.config.command} ${template.config.args?.join(' ') || ''}`
                          : template.config.baseUrl
                        }
                      </div>
                      <div className="mt-4 pt-4 border-t border-[#2d343d]">
                        <button className="w-full h-10 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all text-sm font-medium flex items-center justify-center gap-2 group-hover:shadow-[0_2px_8px_rgba(59,130,246,0.3)]">
                          <Plus size={14} />
                          应用模板
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
