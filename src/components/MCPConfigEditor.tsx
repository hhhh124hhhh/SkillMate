import { useState, useEffect } from 'react';
import {
  X, Plus, Trash2, Server, Check, AlertCircle, ChevronDown,
  Settings, Terminal, Globe, Zap, Eye, EyeOff,
  FolderTree, Database, Wrench, ExternalLink, RefreshCw,
  Sparkles, Play, TestTube
} from 'lucide-react';
import { useToast } from './ui/ToastProvider';
import { ConfirmDialog } from './ConfirmDialog';
import { Button } from './ui/Button';

interface MCPServer {
  name?: string;
  description?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  type?: 'stdio' | 'streamableHttp';
  baseUrl?: string;
  headers?: Record<string, string>;
  isCustom?: boolean;
  disabled?: boolean;
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
  category: 'filesystem' | 'database' | 'api' | 'development' | 'other';
  type: 'stdio' | 'streamableHttp';
  config: MCPServer;
  popular?: boolean;
}

interface MCPConfigEditorProps {
  onClose: () => void;
}

export function MCPConfigEditor({ onClose }: MCPConfigEditorProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<MCPConfig>({ mcpServers: {} });
  const [saved, setSaved] = useState(false);
  const [editingServer, setEditingServer] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<MCPServer>({});
  const [showMarketplace, setShowMarketplace] = useState(true);
  const [templates, setTemplates] = useState<MCPTemplate[]>([]);
  const [mcpStatus, setMcpStatus] = useState<MCPServerStatus[]>([]);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [showCustomServerForm, setShowCustomServerForm] = useState(false);
  const [customServers, setCustomServers] = useState<Record<string, MCPServer>>({});
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; message?: string; duration?: number }>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; serverName: string }>({ show: false, serverName: '' });

  useEffect(() => {
    loadConfig();
    loadTemplates();
    loadCustomServers();

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

  const loadCustomServers = async () => {
    try {
      const servers = await window.ipcRenderer.invoke('mcp:get-custom-servers') as Record<string, MCPServer>;
      setCustomServers(servers);
    } catch (error) {
      console.error('Failed to load custom servers:', error);
    }
  };

  const loadConfig = async () => {
    try {
      const content = await window.ipcRenderer.invoke('mcp:get-config') as string;
      const parsed = JSON.parse(content || '{}');

      // 🔧 检测不完整的配置并自动修复
      let hasIncompleteConfig = false;
      for (const [name, server] of Object.entries(parsed.mcpServers || {})) {
        const config = server as any;
        // 检查是否缺少必需字段（command 和 args）
        if (!config.command || !config.args) {
          hasIncompleteConfig = true;
          console.warn(`[MCP] Incomplete config detected for ${name}`, config);
        }
      }

      if (hasIncompleteConfig) {
        console.log('[MCP] Incomplete configs detected, attempting auto-repair...');
        const repairResult = await window.ipcRenderer.invoke('mcp:repair-config') as {
          success: boolean;
          repairedCount?: number;
          repairedServers?: string[];
          newConfig?: string;
          error?: string;
        };

        if (repairResult.success && repairResult.newConfig) {
          console.log(`[MCP] ✅ Auto-repaired ${repairResult.repairedCount} server(s):`, repairResult.repairedServers);
          // 使用修复后的配置
          const repairedParsed = JSON.parse(repairResult.newConfig);
          setConfig(repairedParsed);

          // 显示修复提示
          if (repairResult.repairedCount && repairResult.repairedCount > 0) {
            setTimeout(() => {
              toast.success(`已自动修复 ${repairResult.repairedCount} 个 MCP 配置：${repairResult.repairedServers?.join(', ')}`);
            }, 100);
          }
        } else {
          console.error('[MCP] Auto-repair failed:', repairResult.error);
          // 即使修复失败，也加载原配置
          setConfig(parsed);
        }
      } else {
        // 配置完整，直接加载
        setConfig(parsed);
      }
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

      // 添加分类和受欢迎程度标记
      for (const [name, server] of Object.entries(templateConfig.mcpServers || {})) {
        const serverConfig = server as MCPServer;

        // 智能分类
        let category: MCPTemplate['category'] = 'other';
        const nameLower = name.toLowerCase();
        const descLower = (serverConfig.description || '').toLowerCase();

        if (nameLower.includes('filesystem') || nameLower.includes('file') || descLower.includes('文件')) {
          category = 'filesystem';
        } else if (nameLower.includes('database') || nameLower.includes('postgres') || nameLower.includes('sqlite')) {
          category = 'database';
        } else if (nameLower.includes('api') || nameLower.includes('http') || descLower.includes('API')) {
          category = 'api';
        } else if (nameLower.includes('github') || nameLower.includes('git') || descLower.includes('开发')) {
          category = 'development';
        }

        templateList.push({
          name,
          description: serverConfig.description || '',
          category,
          type: serverConfig.baseUrl ? 'streamableHttp' : 'stdio',
          config: serverConfig as MCPServer,
          popular: ['filesystem', 'postgres', 'sqlite', 'github'].some(k => nameLower.includes(k))
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
      } else {
        toast.error('保存失败：' + (result as { error?: string }).error);
      }
    } catch (error) {
      console.error('Failed to save MCP config:', error);
      toast.error('保存失败：' + (error as Error).message);
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
    setShowMarketplace(false);

    // 如果需要环境变量，自动进入编辑模式
    if (Object.keys(template.config.env || {}).length > 0) {
      setEditingServer(newServerName);
      setEditForm({ ...template.config });
    }
  };

  const removeServer = (serverName: string) => {
    if (!confirm(`确定要移除 "${serverName}" 吗？`)) {
      return;
    }

    const newServers = { ...config.mcpServers };
    delete newServers[serverName];
    const newConfig: MCPConfig = { mcpServers: newServers };
    setConfig(newConfig);

    if (editingServer === serverName) {
      setEditingServer(null);
    }
  };

  const startEdit = (serverName: string) => {
    const server = config.mcpServers![serverName];
    setEditingServer(serverName);
    setEditForm({ ...server });
    setShowMarketplace(false);
  };

  const cancelEdit = () => {
    setEditingServer(null);
    setEditForm({});
  };

  const saveEdit = async (serverName: string) => {
    // 1. 验证配置
    const validation = validateServerConfig(editForm);
    if (!validation.valid) {
      toast.error('❌ 配置验证失败：\n' + validation.errors.join('\n'));
      return;
    }

    // 2. 更新配置
    const newConfig: MCPConfig = {
      ...config,
      mcpServers: {
        ...config.mcpServers,
        [serverName]: editForm
      }
    };

    // 3. 保存到文件
    try {
      const jsonContent = JSON.stringify(newConfig, null, 2);
      const result = await window.ipcRenderer.invoke('mcp:save-config', jsonContent);

      if ((result as { success: boolean }).success) {
        setConfig(newConfig);
        setEditingServer(null);
        toast.success(`✅ "${serverName}" 配置已保存并自动启用`);

        // 重新加载 MCP 服务器以应用配置
        try {
          await window.ipcRenderer.invoke('mcp:reload-all');
          console.log(`[MCP] ✅ "${serverName}" 已保存，服务器已重载`);
        } catch (reloadError) {
          console.error('[MCP] 重载服务器失败:', reloadError);
        }
      } else {
        toast.error('❌ 保存失败：' + (result as { error?: string }).error);
      }
    } catch (error) {
      console.error('Failed to save server config:', error);
      toast.error('❌ 保存失败：' + (error as Error).message);
    }
  };

  // 配置验证函数
  const validateServerConfig = (server: MCPServer): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (server.type === 'streamableHttp') {
      // 检查 baseUrl
      if (!server.baseUrl) {
        errors.push('缺少 API 地址 (baseUrl)');
      }

      // 检查 headers
      if (server.headers) {
        const authHeader = server.headers['Authorization'];
        if (!authHeader) {
          errors.push('缺少 Authorization header');
        } else {
          // 检查占位符
          if (authHeader.includes('YOUR_') || authHeader.includes('API_KEY_HERE')) {
            errors.push('Authorization header 包含占位符（请替换为实际的 API Key）');
          }
          // 检查格式
          else if (!authHeader.startsWith('Bearer ')) {
            errors.push('Authorization 格式错误（应为 "Bearer KEY"，注意 Bearer 后面是空格不是加号）');
          }
          // 检查 API Key 格式（百度千帆）
          else if (authHeader.startsWith('Bearer ')) {
            const apiKey = authHeader.replace('Bearer ', '');
            if (!apiKey.startsWith('bce-v3/') && !apiKey.startsWith('sk-')) {
              errors.push('API Key 格式可能不正确（千帆 AppBuilder 应以 "bce-v3/" 开头）');
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  };

  // 自动保存：编辑表单变化 1 秒后自动保存
  useEffect(() => {
    if (editingServer && editForm && Object.keys(editForm).length > 0) {
      // 防抖：1秒后自动保存
      const saveTimer = setTimeout(async () => {
        // 验证配置
        const validation = validateServerConfig(editForm);

        // 只有配置有效时才自动保存
        if (validation.valid) {
          const newConfig: MCPConfig = {
            ...config,
            mcpServers: {
              ...config.mcpServers,
              [editingServer]: editForm
            }
          };

          try {
            const jsonContent = JSON.stringify(newConfig, null, 2);
            const result = await window.ipcRenderer.invoke('mcp:save-config', jsonContent);

            if ((result as { success: boolean }).success) {
              setConfig(newConfig);
              console.log(`[Auto-save] ✅ "${editingServer}" 已自动保存`);

              // 重新加载 MCP 服务器以应用配置
              try {
                await window.ipcRenderer.invoke('mcp:reload-all');
                console.log(`[Auto-save] ✅ "${editingServer}" 服务器已重载`);
              } catch (reloadError) {
                console.error('[Auto-save] 重载服务器失败:', reloadError);
              }
            }
          } catch (error) {
            console.error('[Auto-save] 自动保存失败:', error);
          }
        } else {
          // 配置无效，记录警告但不保存
          console.warn('[Auto-save] 配置验证失败，跳过自动保存:', validation.errors);
        }
      }, 1000);

      return () => clearTimeout(saveTimer);
    }
  }, [editForm, editingServer, config]);

  const updateFormField = (field: string, value: any) => {
    setEditForm({ ...editForm, [field]: value });
  };

  const updateEnvVar = (key: string, value: string) => {
    const newEnv = { ...editForm.env };
    newEnv[key] = value;
    setEditForm({ ...editForm, env: newEnv });
  };

  const removeEnvVar = (key: string) => {
    const newEnv = { ...editForm.env };
    delete newEnv[key];
    setEditForm({ ...editForm, env: newEnv });
  };

  const updateHeader = (key: string, value: string) => {
    const newHeaders = { ...editForm.headers };
    newHeaders[key] = value;
    setEditForm({ ...editForm, headers: newHeaders });
  };

  const handleReconnect = async (serverName: string) => {
    try {
      const success = await window.ipcRenderer.invoke('mcp:reconnect', serverName) as boolean;
      if (success) {
        const status = await window.ipcRenderer.invoke('mcp:get-status') as MCPServerStatus[];
        setMcpStatus(status);
      } else {
        toast.error(`重试连接 ${serverName} 失败`);
      }
    } catch (error) {
      console.error('Failed to reconnect MCP server:', error);
    }
  };

  // 自定义服务器管理函数
  const handleAddCustomServer = async (serverConfig: MCPServer) => {
    try {
      const serverName = serverConfig.name || `custom-${Date.now()}`;
      const result = await window.ipcRenderer.invoke('mcp:add-custom-server', serverName, {
        ...serverConfig,
        isCustom: true
      }) as { success: boolean; error?: string };

      if (result.success) {
        await loadCustomServers();
        await loadConfig();
        setShowCustomServerForm(false);
        setEditForm({});
        toast.success('自定义服务器添加成功！');
      } else {
        toast.error(`添加失败：${result.error}`);
      }
    } catch (error) {
      console.error('Failed to add custom server:', error);
      toast.error('添加自定义服务器时发生错误');
    }
  };

  const handleUpdateCustomServer = async (serverName: string, serverConfig: MCPServer) => {
    try {
      const result = await window.ipcRenderer.invoke('mcp:update-custom-server', serverName, {
        ...serverConfig,
        isCustom: true
      }) as { success: boolean; error?: string };

      if (result.success) {
        await loadCustomServers();
        await loadConfig();
        setEditingServer(null);
        setEditForm({});
        toast.success('自定义服务器更新成功！');
      } else {
        toast.error(`更新失败：${result.error}`);
      }
    } catch (error) {
      console.error('Failed to update custom server:', error);
      toast.error('更新自定义服务器时发生错误');
    }
  };

  const handleRemoveCustomServer = async (serverName: string) => {
    // 显示确认对话框
    setDeleteConfirm({ show: true, serverName });
  };

  // 实际执行删除操作
  const handleDeleteConfirm = async () => {
    const { serverName } = deleteConfirm;
    setDeleteConfirm({ show: false, serverName: '' });

    try {
      const result = await window.ipcRenderer.invoke('mcp:remove-custom-server', serverName) as { success: boolean; error?: string };

      if (result.success) {
        await loadCustomServers();
        await loadConfig();
        if (editingServer === serverName) {
          setEditingServer(null);
        }
        toast.success('自定义服务器已删除');
      } else {
        toast.error(`删除失败：${result.error}`);
      }
    } catch (error) {
      console.error('Failed to remove custom server:', error);
      toast.error('删除自定义服务器时发生错误');
    }
  };

  // 取消删除操作
  const handleDeleteCancel = () => {
    setDeleteConfirm({ show: false, serverName: '' });
  };

  const handleTestConnection = async (serverName: string, serverConfig: MCPServer) => {
    setTestingConnection(serverName);
    setTestResult({ ...testResult, [serverName]: { success: false } });

    try {
      const result = await window.ipcRenderer.invoke('mcp:test-connection', serverName, serverConfig) as {
        success: boolean;
        error?: string;
        duration?: number;
      };

      setTestResult({
        ...testResult,
        [serverName]: {
          success: result.success,
          message: result.success ? '连接成功' : result.error,
          duration: result.duration
        }
      });

      if (result.success) {
        toast.success(`连接测试成功！耗时：${result.duration}ms`);
      } else {
        toast.error(`连接测试失败：${result.error}`);
      }
    } catch (error) {
      console.error('Failed to test connection:', error);
      setTestResult({
        ...testResult,
        [serverName]: {
          success: false,
          message: (error as Error).message
        }
      });
      toast.error('测试连接时发生错误');
    } finally {
      setTestingConnection(null);
    }
  };

  const getCategoryInfo = (category: MCPTemplate['category']) => {
    const categories = {
      filesystem: { icon: FolderTree, label: '文件系统', color: 'text-blue-600', bg: 'bg-blue-50' },
      database: { icon: Database, label: '数据库', color: 'text-green-600', bg: 'bg-green-50' },
      api: { icon: Globe, label: 'API 服务', color: 'text-purple-600', bg: 'bg-purple-50' },
      development: { icon: Wrench, label: '开发工具', color: 'text-orange-600', bg: 'bg-orange-50' },
      other: { icon: Zap, label: '其他', color: 'text-gray-600', bg: 'bg-gray-50' }
    };
    return categories[category];
  };

  const installedServers = Object.keys(config.mcpServers || {});

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 rounded-2xl w-full max-w-5xl h-[92vh] shadow-2xl flex flex-col overflow-hidden border border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg shadow-orange-500/20">
                <Server size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">MCP 扩展配置</h1>
                <p className="text-xs text-slate-400 mt-0.5">管理 Model Context Protocol 服务</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowMarketplace(!showMarketplace)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                showMarketplace
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {showMarketplace ? <Server size={16} /> : <Check size={16} />}
              {showMarketplace ? '扩展市场' : '已安装'}
            </button>
            <button
              onClick={onClose}
              className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {showCustomServerForm ? (
            // Custom Server Form View
            <CustomServerForm
              editForm={editForm}
              setEditForm={setEditForm}
              onSave={handleAddCustomServer}
              onCancel={() => {
                setShowCustomServerForm(false);
                setEditForm({});
              }}
              testingConnection={testingConnection}
              testResult={testResult}
              onTestConnection={handleTestConnection}
            />
          ) : showMarketplace ? (
            // Marketplace View
            <div className="p-6 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">扩展市场</h2>
                  <p className="text-slate-400 text-sm">一键安装，无需复杂配置</p>
                </div>
                <button
                  onClick={() => setShowCustomServerForm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg transition-all text-sm font-medium shadow-lg shadow-purple-500/20"
                >
                  <Sparkles size={16} />
                  添加自定义服务器
                </button>
              </div>

              {/* Popular Section */}
              {templates.filter(t => t.popular).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Zap size={18} className="text-orange-500" />
                    <h3 className="text-lg font-semibold text-white">热门推荐</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.filter(t => t.popular).map((template) => {
                      const categoryInfo = getCategoryInfo(template.category);
                      const CategoryIcon = categoryInfo.icon;
                      const isInstalled = installedServers.includes(template.name);
                      const status = mcpStatus.find(s => s.name === template.name);

                      return (
                        <div
                          key={template.name}
                          className={`group relative rounded-xl p-5 transition-all border ${
                            isInstalled
                              ? 'bg-slate-800/50 border-slate-700'
                              : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/50'
                          }`}
                        >
                          {isInstalled && status && (
                            <div className="absolute top-4 right-4">
                              {status.connected ? (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/20 border border-green-500/30 rounded-lg">
                                  <Check size={14} className="text-green-500" />
                                  <span className="text-xs font-medium text-green-400">运行中</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/20 border border-red-500/30 rounded-lg">
                                  <AlertCircle size={14} className="text-red-500" />
                                  <span className="text-xs font-medium text-red-400">离线</span>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-lg ${categoryInfo.bg} ${categoryInfo.color}`}>
                              <CategoryIcon size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="text-lg font-semibold text-white">{template.name}</h4>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  template.type === 'streamableHttp'
                                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                    : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                                }`}>
                                  {template.type === 'streamableHttp' ? 'HTTP' : 'STDIO'}
                                </span>
                              </div>
                              <p className="text-sm text-slate-400 mb-4 line-clamp-2">{template.description}</p>

                              <div className="flex items-center gap-2">
                                {isInstalled ? (
                                  <>
                                    <button
                                      onClick={() => startEdit(template.name)}
                                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors text-sm font-medium"
                                    >
                                      <Settings size={14} />
                                      配置
                                    </button>
                                    <button
                                      onClick={() => removeServer(template.name)}
                                      className="px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                      title="移除"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => applyTemplate(template)}
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium shadow-lg shadow-orange-500/20"
                                  >
                                    <Plus size={16} />
                                    安装
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* All Categories */}
              {templates.filter(t => !t.popular).length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">所有扩展</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {templates.filter(t => !t.popular).map((template) => {
                      const categoryInfo = getCategoryInfo(template.category);
                      const CategoryIcon = categoryInfo.icon;
                      const isInstalled = installedServers.includes(template.name);

                      return (
                        <div
                          key={template.name}
                          className={`group p-4 rounded-lg transition-all border cursor-pointer ${
                            isInstalled
                              ? 'bg-slate-800/50 border-slate-700'
                              : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600'
                          }`}
                          onClick={() => !isInstalled && applyTemplate(template)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${categoryInfo.bg} ${categoryInfo.color}`}>
                              <CategoryIcon size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-white truncate">{template.name}</h4>
                                {isInstalled && (
                                  <Check size={14} className="text-green-500 flex-shrink-0" />
                                )}
                              </div>
                              <p className="text-xs text-slate-500 truncate mt-0.5">{template.description}</p>
                            </div>
                            {!isInstalled && (
                              <Plus size={16} className="text-slate-500 group-hover:text-orange-500 transition-colors" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : editingServer ? (
            // Editor View
            <div className="p-6 max-w-3xl mx-auto">
              <button
                onClick={() => {
                  cancelEdit();
                  setShowMarketplace(true);
                }}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
              >
                ← 返回市场
              </button>

              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-orange-500/20 rounded-xl">
                    <Settings size={24} className="text-orange-500" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{editingServer}</h2>
                    <p className="text-sm text-slate-400 mt-0.5">{editForm.description || 'MCP 服务'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                {/* Status Card */}
                {(() => {
                  const status = mcpStatus.find(s => s.name === editingServer);
                  if (!status) return null;

                  return (
                    <div className={`p-4 rounded-xl border ${
                      status.connected
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {status.connected ? (
                            <Check size={24} className="text-green-500" />
                          ) : (
                            <AlertCircle size={24} className="text-red-500" />
                          )}
                          <div>
                            <p className={`font-semibold ${status.connected ? 'text-green-400' : 'text-red-400'}`}>
                              {status.connected ? '已连接' : '未连接'}
                            </p>
                            {status.error && (
                              <p className="text-sm text-red-300 mt-0.5">{status.error}</p>
                            )}
                          </div>
                        </div>
                        {!status.connected && (
                          <button
                            onClick={() => handleReconnect(editingServer)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium"
                          >
                            <RefreshCw size={14} />
                            重试
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Environment Variables */}
                {editForm.env && Object.keys(editForm.env).length > 0 && (
                  <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Terminal size={18} className="text-orange-500" />
                      环境变量配置
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                      某些扩展需要 API Key 或其他凭证才能正常工作
                    </p>

                    <div className="space-y-3">
                      {Object.entries(editForm.env).map(([key, value]) => (
                        <div key={key}>
                          <label className="block text-sm font-medium text-slate-300 mb-1.5">
                            {key}
                          </label>
                          <div className="flex gap-2">
                            <input
                              type={showSecret[key] ? 'text' : 'password'}
                              value={value}
                              onChange={(e) => updateEnvVar(key, e.target.value)}
                              className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-mono"
                              placeholder={`输入 ${key}`}
                            />
                            <button
                              onClick={() => setShowSecret({ ...showSecret, [key]: !showSecret[key] })}
                              className="p-2.5 text-slate-400 hover:text-white bg-slate-700 rounded-lg transition-colors"
                            >
                              {showSecret[key] ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* HTTP Headers Configuration */}
                {editForm.headers && Object.keys(editForm.headers).length > 0 && (
                  <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Globe size={18} className="text-purple-500" />
                      HTTP 请求头配置
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">
                      HTTP 服务器的认证凭证和自定义请求头
                    </p>

                    <div className="space-y-3">
                      {Object.entries(editForm.headers).map(([key, value]) => (
                        <div key={key}>
                          <label className="block text-sm font-medium text-slate-300 mb-1.5">
                            {key}
                          </label>
                          <div className="flex gap-2">
                            <input
                              type={showSecret[key] ? 'text' : 'password'}
                              value={value}
                              onChange={(e) => updateHeader(key, e.target.value)}
                              className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono"
                              placeholder={`输入 ${key}`}
                            />
                            <button
                              onClick={() => setShowSecret({ ...showSecret, [key]: !showSecret[key] })}
                              className="p-2.5 text-slate-400 hover:text-white bg-slate-700 rounded-lg transition-colors"
                            >
                              {showSecret[key] ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Advanced Config */}
                <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/50">
                  <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer list-none">
                      <h3 className="text-lg font-semibold text-slate-300 flex items-center gap-2">
                        <ExternalLink size={18} />
                        高级配置
                      </h3>
                      <ChevronDown size={20} className="text-slate-500 group-open:rotate-180 transition-transform" />
                    </summary>

                    <div className="mt-4 space-y-4 pt-4 border-t border-slate-700">
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">服务类型</label>
                        <div className="px-3 py-2 bg-slate-900 rounded-lg border border-slate-700">
                          <span className={`text-sm font-medium ${
                            editForm.type === 'streamableHttp' ? 'text-purple-400' : 'text-orange-400'
                          }`}>
                            {editForm.type === 'streamableHttp' ? 'HTTP API' : '命令行 (STDIO)'}
                          </span>
                        </div>
                      </div>

                      {editForm.command && (
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1.5">启动命令</label>
                          <div className="px-3 py-2 bg-slate-900 rounded-lg border border-slate-700 font-mono text-sm text-slate-300">
                            {editForm.command} {(editForm.args || []).join(' ')}
                          </div>
                        </div>
                      )}

                      {editForm.baseUrl && (
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-1.5">API 地址</label>
                          <div className="px-3 py-2 bg-slate-900 rounded-lg border border-slate-700 font-mono text-sm text-slate-300">
                            {editForm.baseUrl}
                          </div>
                        </div>
                      )}
                    </div>
                  </details>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                  <button
                    onClick={() => removeServer(editingServer)}
                    className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Trash2 size={16} />
                    移除扩展
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={cancelEdit}
                      className="px-5 py-2.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => saveEdit(editingServer)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium shadow-lg shadow-orange-500/20"
                    >
                      <Check size={16} />
                      保存配置
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Installed Servers View
            <div className="p-6">
              <button
                onClick={() => setShowMarketplace(true)}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
              >
                ← 返回市场
              </button>

              {installedServers.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Server size={36} className="text-slate-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">暂无已安装的扩展</h3>
                  <p className="text-slate-400 text-sm mb-6">从扩展市场安装 MCP 服务</p>
                  <button
                    onClick={() => setShowMarketplace(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                  >
                    <Plus size={18} />
                    浏览扩展市场
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {installedServers.map((serverName) => {
                    const server = config.mcpServers![serverName];
                    const status = mcpStatus.find(s => s.name === serverName);

                    return (
                      <div
                        key={serverName}
                        className="bg-slate-800/50 rounded-xl p-5 border border-slate-700 hover:border-slate-600 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className={`p-3 rounded-xl ${
                              status?.connected
                                ? 'bg-green-500/20'
                                : 'bg-red-500/20'
                            }`}>
                              {status?.connected ? (
                                <Check size={24} className="text-green-500" />
                              ) : (
                                <AlertCircle size={24} className="text-red-500" />
                              )}
                            </div>

                            <div>
                              <h3 className="text-lg font-semibold text-white mb-1">{serverName}</h3>
                              <p className="text-sm text-slate-400 mb-3">{server.description || 'MCP 服务'}</p>

                              {status && (
                                <div className="flex items-center gap-3 text-sm">
                                  <span className={status.connected ? 'text-green-400' : 'text-red-400'}>
                                    {status.connected ? '已连接' : '未连接'}
                                  </span>
                                  {status.error && (
                                    <span className="text-red-300">· {status.error}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {!status?.connected && (
                              <button
                                onClick={() => handleReconnect(serverName)}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                title="重新连接"
                              >
                                <RefreshCw size={18} />
                              </button>
                            )}
                            <button
                              onClick={() => startEdit(serverName)}
                              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                              title="配置"
                            >
                              <Settings size={18} />
                            </button>
                            <button
                              onClick={() => removeServer(serverName)}
                              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="移除"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              修改配置后需要重启应用才能生效
            </p>
            <button
              onClick={handleSave}
              disabled={saved}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                saved
                  ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg'
              }`}
            >
              {saved ? <Check size={16} /> : null}
              {saved ? '已保存' : '保存并应用'}
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* 删除确认对话框 */}
    <ConfirmDialog
      isOpen={deleteConfirm.show}
      title="确认删除"
      message={`确定要删除自定义服务器 "${deleteConfirm.serverName}" 吗？此操作不可撤销。`}
      confirmText="删除"
      cancelText="取消"
      onConfirm={handleDeleteConfirm}
    onCancel={handleDeleteCancel}
  />
    </>
  );
}

// 自定义服务器表单组件
interface CustomServerFormProps {
  editForm: MCPServer;
  setEditForm: (form: MCPServer) => void;
  onSave: (config: MCPServer) => void;
  onCancel: () => void;
  testingConnection: string | null;
  testResult: Record<string, { success: boolean; message?: string; duration?: number }>;
  onTestConnection: (name: string, config: MCPServer) => void;
}

function CustomServerForm({
  editForm,
  setEditForm,
  onSave,
  onCancel,
  testingConnection,
  testResult,
  onTestConnection
}: CustomServerFormProps) {
  const { toast } = useToast();
  const [serverType, setServerType] = useState<'stdio' | 'streamableHttp'>('stdio');

  const updateField = (field: keyof MCPServer, value: any) => {
    setEditForm({ ...editForm, [field]: value });
  };

  const parseArgs = (argsString: string) => {
    return argsString.split(' ').filter(arg => arg.length > 0);
  };

  const parseJson = (jsonString: string) => {
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  };

  const handleSave = () => {
    // 验证必填字段
    if (!editForm.name) {
      toast.warning('请输入服务器名称');
      return;
    }

    if (serverType === 'stdio' && !editForm.command) {
      toast.warning('请输入启动命令');
      return;
    }

    if (serverType === 'streamableHttp' && !editForm.baseUrl) {
      toast.warning('请输入服务器URL');
      return;
    }

    // 构建配置
    const config: MCPServer = {
      ...editForm,
      type: serverType,
      isCustom: true
    };

    onSave(config);
  };

  const handleTest = () => {
    const serverName = editForm.name || 'test-server';
    const config: MCPServer = {
      ...editForm,
      type: serverType
    };
    onTestConnection(serverName, config);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
      >
        ← 返回市场
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg shadow-purple-500/20">
            <Sparkles size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">添加自定义 MCP 服务器</h2>
            <p className="text-sm text-slate-400 mt-0.5">配置您自己的 Model Context Protocol 服务</p>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {/* 基本信息 */}
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Server size={18} className="text-purple-500" />
            基本信息
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                服务器名称 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={editForm.name || ''}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="例如: my-custom-server"
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                描述（可选）
              </label>
              <textarea
                value={editForm.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="简单描述这个服务器的用途..."
                rows={2}
                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder:text-slate-600 resize-none"
              />
            </div>
          </div>
        </div>

        {/* 连接类型 */}
        <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Globe size={18} className="text-purple-500" />
            连接类型
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setServerType('stdio')}
              className={`p-4 rounded-lg border-2 transition-all ${
                serverType === 'stdio'
                  ? 'bg-orange-500/20 border-orange-500'
                  : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <Terminal size={24} className={serverType === 'stdio' ? 'text-orange-500' : 'text-slate-500'} />
                <span className={`text-sm font-medium ${serverType === 'stdio' ? 'text-orange-400' : 'text-slate-400'}`}>
                  STDIO
                </span>
                <span className="text-xs text-slate-500">本地进程</span>
              </div>
            </button>

            <button
              onClick={() => setServerType('streamableHttp')}
              className={`p-4 rounded-lg border-2 transition-all ${
                serverType === 'streamableHttp'
                  ? 'bg-purple-500/20 border-purple-500'
                  : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <Globe size={24} className={serverType === 'streamableHttp' ? 'text-purple-500' : 'text-slate-500'} />
                <span className={`text-sm font-medium ${serverType === 'streamableHttp' ? 'text-purple-400' : 'text-slate-400'}`}>
                  HTTP
                </span>
                <span className="text-xs text-slate-500">远程服务</span>
              </div>
            </button>
          </div>
        </div>

        {/* STDIO 配置 */}
        {serverType === 'stdio' && (
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Terminal size={18} className="text-orange-500" />
              STDIO 配置
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  启动命令 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.command || ''}
                  onChange={(e) => updateField('command', e.target.value)}
                  placeholder="例如: node, npx, python"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder:text-slate-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  参数 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={(editForm.args || []).join(' ')}
                  onChange={(e) => updateField('args', parseArgs(e.target.value))}
                  placeholder="例如: -y @modelcontextprotocol/server-filesystem /path/to/dir"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 placeholder:text-slate-600 font-mono"
                />
                <p className="text-xs text-slate-500 mt-1.5">多个参数用空格分隔</p>
              </div>
            </div>
          </div>
        )}

        {/* HTTP 配置 */}
        {serverType === 'streamableHttp' && (
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Globe size={18} className="text-purple-500" />
              HTTP 配置
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  服务器 URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.baseUrl || ''}
                  onChange={(e) => updateField('baseUrl', e.target.value)}
                  placeholder="https://api.example.com/mcp"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder:text-slate-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  请求头（JSON格式，可选）
                </label>
                <textarea
                  value={editForm.headers ? JSON.stringify(editForm.headers, null, 2) : ''}
                  onChange={(e) => {
                    const parsed = parseJson(e.target.value);
                    if (parsed) updateField('headers', parsed);
                  }}
                  placeholder='{"Authorization": "Bearer YOUR_TOKEN"}'
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder:text-slate-600 font-mono resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* 环境变量 */}
        <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/50">
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <h3 className="text-lg font-semibold text-slate-300 flex items-center gap-2">
                <Terminal size={18} />
                环境变量（可选）
              </h3>
              <ChevronDown size={20} className="text-slate-500 group-open:rotate-180 transition-transform" />
            </summary>

            <div className="mt-4 pt-4 border-t border-slate-700">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1.5">
                  环境变量（JSON格式）
                </label>
                <textarea
                  value={editForm.env ? JSON.stringify(editForm.env, null, 2) : ''}
                  onChange={(e) => {
                    const parsed = parseJson(e.target.value);
                    if (parsed) updateField('env', parsed);
                  }}
                  placeholder='{"API_KEY": "your-api-key"}'
                  rows={4}
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder:text-slate-600 font-mono resize-none"
                />
                <p className="text-xs text-slate-500 mt-1.5">某些MCP服务器需要API Key等环境变量</p>
              </div>
            </div>
          </details>
        </div>

        {/* 测试连接 */}
        {editForm.name && (
          <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TestTube size={18} className="text-green-500" />
              测试连接
            </h3>

            <div className="flex items-center gap-3">
              <button
                onClick={handleTest}
                disabled={testingConnection === editForm.name}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20"
              >
                {testingConnection === editForm.name ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    测试中...
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    测试连接
                  </>
                )}
              </button>

              {testResult[editForm.name!] && (
                <div className={`flex-1 px-4 py-2 rounded-lg ${
                  testResult[editForm.name!].success
                    ? 'bg-green-500/20 border border-green-500/30'
                    : 'bg-red-500/20 border border-red-500/30'
                }`}>
                  <p className={`text-sm font-medium ${
                    testResult[editForm.name!].success ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {testResult[editForm.name!].message}
                    {testResult[editForm.name!].duration && ` (${testResult[editForm.name!].duration}ms)`}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
          >
            取消
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg transition-all text-sm font-medium shadow-lg shadow-purple-500/20"
          >
            <Sparkles size={16} />
            添加服务器
          </button>
        </div>
      </div>
    </div>
  );
}

export default MCPConfigEditor;
