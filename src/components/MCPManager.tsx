/**
 * MCP 管理器组件（重新设计版）
 * 统一配色方案，简化视觉层次
 */

import { useState, useEffect } from 'react';
import { FileText, Globe, Check, Loader2, AlertCircle, RefreshCw, Wrench } from 'lucide-react';

interface MCPServerConfig {
  disabled?: boolean;
  command?: string;
  args?: string[];
  baseUrl?: string;
  env?: Record<string, string>;
  headers?: Record<string, string>;
}

// 🔧 新增：从模板加载的服务器信息接口
interface MCPServerTemplate {
  name: string;
  displayName: string;
  description?: string;
  category?: string;
  icon: any; // Lucide React 图标组件
}

/**
 * 检查 MCP 配置健康度
 * 返回问题列表和修复建议
 */
function checkConfigHealth(config: Record<string, any>): {
  healthy: boolean;
  issues: string[];
  suggestions: string[];
  canAutoFix: boolean;
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let canAutoFix = false;

  // 检查是否有启用的服务器
  const enabledServers = Object.entries(config).filter(([_, serverConfig]: [string, any]) => !serverConfig?.disabled);
  if (enabledServers.length === 0) {
    issues.push('没有启用的 MCP 服务器');
    suggestions.push('请在上方启用至少一个 MCP 服务器（推荐启用"文件访问"）');
  }

  // 检查每个启用服务器的配置完整性
  for (const [name, serverConfig] of enabledServers) {
    const isStdio = !serverConfig?.type || serverConfig?.type === 'stdio';
    const isHttp = serverConfig?.type === 'streamableHttp';

    if (isStdio) {
      if (!serverConfig?.command || !serverConfig?.args) {
        issues.push(`"${name}" 服务器配置不完整（缺少 command 或 args）`);
        suggestions.push(`点击"修复配置"按钮自动修复配置问题`);
        canAutoFix = true;
      } else if (serverConfig?.args?.includes('ALLOWED_PATH')) {
        issues.push(`"${name}" 服务器路径占位符未替换`);
        suggestions.push(`点击"修复配置"按钮自动替换路径占位符`);
        canAutoFix = true;
      }
    }

    if (isHttp && !serverConfig?.baseUrl) {
      issues.push(`"${name}" 服务器配置不完整（缺少 baseUrl）`);
      suggestions.push(`请在设置中配置完整的服务器 URL`);
    }

    // 检查 API Key 占位符
    const hasPlaceholder = (value: string) =>
      value && (value.includes('YOUR_') || value.includes('API_KEY_HERE') || value.includes('TOKEN_HERE'));

    if (serverConfig?.env && Object.values(serverConfig.env).some(hasPlaceholder)) {
      issues.push(`"${name}" 服务器需要配置 API Key`);
      suggestions.push(`请在设置中配置有效的 API Key，或在通用设置中配置应用 API Key`);
    }

    if (serverConfig?.headers && Object.values(serverConfig.headers).some(hasPlaceholder)) {
      issues.push(`"${name}" 服务器需要配置认证信息`);
      suggestions.push(`请在设置中配置有效的认证 Token 或 API Key`);
    }
  }

  return {
    healthy: issues.length === 0,
    issues,
    suggestions,
    canAutoFix
  };
}

interface MCPServerConfig {
  name: string;
  displayName: string;
  description: string;
  icon: React.ElementType;
  category: 'essential' | 'advanced';
}

interface MCPServerStatus {
  name: string;
  connected: boolean;
  error?: string;
}

// 🔧 修改说明：从硬编码改为动态读取 mcp-templates.json
// 这样可以只显示真正存在的 MCP 服务器
// 移除了 image-gen 和 data-tools（它们在模板中未定义）

export function MCPManager() {
  const [mcpConfig, setMcpConfig] = useState<Record<string, any>>({});
  const [serverStatus, setServerStatus] = useState<MCPServerStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingServer, setTogglingServer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);
  const [baiduApiKey, setBaiduApiKey] = useState('');
  const [doubaoApiKey, setDoubaoApiKey] = useState('');
  const [configuringApiKey, setConfiguringApiKey] = useState(false);

  // 🔧 新增：动态读取的服务器列表
  const [availableServers, setAvailableServers] = useState<MCPServerTemplate[]>([]);

  // 计算配置健康度
  const configHealth = checkConfigHealth(mcpConfig);

  // 加载 MCP 配置和状态
  useEffect(() => {
    const loadMCPData = async () => {
      try {
        // 加载配置
        const config = await window.ipcRenderer.invoke('mcp:get-config') as Record<string, any>;
        setMcpConfig(config.mcpServers || {});

        // 加载状态
        const status = await window.ipcRenderer.invoke('mcp:get-status') as MCPServerStatus[];
        setServerStatus(status);

        // 🔧 新增：动态读取服务器模板
        try {
          // 1. 先获取 JSON 字符串
          console.log('[MCPManager] Fetching templates from IPC...');
          const templateStr = await window.ipcRenderer.invoke('mcp:get-templates') as string;
          console.log('[MCPManager] Raw template string:', templateStr?.substring(0, 200));

          // 2. 解析 JSON 字符串为对象
          const template = JSON.parse(templateStr);
          console.log('[MCPManager] Parsed template:', template);

          // 3. 验证模板格式
          if (!template || !template.mcpServers) {
            console.warn('[MCPManager] Invalid template format:', template);
            setAvailableServers([]);
            return;
          }

          const servers = Object.entries(template.mcpServers || {})
            .filter(([, config]) => {
              // 过滤掉标记为"即将推出"的服务器
              const serverConfig = config as any;
              return !serverConfig._coming_soon;
            })
            .map(([name, config]) => {
              // 生成显示名称映射
              const nameMap: Record<string, string> = {
                'filesystem': '文件访问',
                'fetch': '网页抓取',
                'baidu-search': '网络搜索'
              };

              // 生成图标映射
              const iconMap: Record<string, any> = {
                'filesystem': FileText,
                'fetch': Globe,
                'baidu-search': Globe
              };

              const serverConfig = config as any;

              return {
                name,
                displayName: nameMap[name] || name,
                description: serverConfig.description,
                category: serverConfig._category || 'other',
                icon: iconMap[name] || Wrench  // 默认使用扳手图标
              };
            });

          console.log('[MCPManager] Final servers array:', servers);
          setAvailableServers(servers);
        } catch (err) {
          console.error('[MCPManager] Failed to load server templates:', err);
          // 如果读取模板失败，使用空数组
          setAvailableServers([]);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('[MCPManager] Failed to load MCP data:', err);
        setError('加载 MCP 配置失败');
        setIsLoading(false);
      }
    };

    loadMCPData();

    // 每5秒轮询状态
    const interval = setInterval(async () => {
      try {
        const status = await window.ipcRenderer.invoke('mcp:get-status') as MCPServerStatus[];
        setServerStatus(status);
      } catch (err) {
        console.error('[MCPManager] Failed to poll status:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // 修复配置
  const handleRepairConfig = async () => {
    setIsRepairing(true);
    setError(null);

    try {
      // 调用后端修复配置
      await window.ipcRenderer.invoke('mcp:repair-config');

      // 重新加载配置
      const config = await window.ipcRenderer.invoke('mcp:get-config') as Record<string, any>;
      setMcpConfig(config.mcpServers || {});

      // 重新连接服务器
      await window.ipcRenderer.invoke('mcp:reload-all');

      // 刷新状态
      const status = await window.ipcRenderer.invoke('mcp:get-status') as MCPServerStatus[];
      setServerStatus(status);

      // 显示成功消息
      setError(null); // 清除错误
    } catch (err) {
      console.error('[MCPManager] Failed to repair config:', err);
      setError('修复配置失败');
    } finally {
      setIsRepairing(false);
    }
  };

  // 切换服务器启用/禁用状态
  const handleToggle = async (serverName: string) => {
    setTogglingServer(serverName);
    setError(null);

    try {
      const serverConfig = mcpConfig[serverName];
      const newDisabledState = !serverConfig?.disabled;

      // 🔍 特殊处理：百度千帆需要有效的 API Key 才能启用
      if (serverName === 'baidu-search' && !newDisabledState) {
        const authHeader = serverConfig?.headers?.Authorization || '';
        const hasPlaceholder = authHeader.includes('YOUR_BAIDU_API_KEY_HERE') ||
                               authHeader.includes('YOUR_') ||
                               authHeader.includes('API_KEY_HERE');

        if (hasPlaceholder) {
          setError('⚠️ 请先配置百度千帆 API Key，然后点击"配置并启用"按钮');
          setTogglingServer(null);
          return;
        }
      }

      // 更新配置
      const updatedConfig = {
        ...mcpConfig,
        [serverName]: {
          ...serverConfig,
          disabled: newDisabledState
        }
      };

      // 保存配置
      await window.ipcRenderer.invoke('mcp:save-config', JSON.stringify({ mcpServers: updatedConfig }, null, 2));
      setMcpConfig(updatedConfig);

      // 如果启用服务器，尝试重连
      if (!newDisabledState) {
        await window.ipcRenderer.invoke('mcp:reconnect', serverName);
      }

    } catch (err) {
      console.error('[MCPManager] Failed to toggle server:', err);
      setError('切换服务器状态失败');
    } finally {
      setTogglingServer(null);
    }
  };

  // 手动重连
  const handleReconnect = async (serverName: string) => {
    try {
      await window.ipcRenderer.invoke('mcp:reconnect', serverName);
      // 立即刷新状态
      const status = await window.ipcRenderer.invoke('mcp:get-status') as MCPServerStatus[];
      setServerStatus(status);
    } catch (err) {
      console.error('[MCPManager] Failed to reconnect:', err);
    }
  };

  // 配置百度千帆 API Key
  const handleBaiduApiKeyConfig = async (apiKey: string) => {
    if (!apiKey || apiKey.trim() === '') {
      setError('请输入有效的 API Key');
      return;
    }

    setConfiguringApiKey(true);
    setError(null);

    try {
      // 读取当前配置
      const config = await window.ipcRenderer.invoke('mcp:get-config') as Record<string, any>;
      const servers = config.mcpServers || {};

      // 更新百度搜索配置
      servers['baidu-search'] = {
        ...servers['baidu-search'],
        baseUrl: 'https://qianfan.baidubce.com/v2/ai_search/mcp',  // ✨ 正确的千帆 URL
        headers: {
          ...servers['baidu-search']?.headers,
          Authorization: `Bearer ${apiKey.trim()}`  // ✨ 使用空格而不是加号
        },
        disabled: false  // 自动启用
      };

      // 保存配置
      await window.ipcRenderer.invoke('mcp:save-config', JSON.stringify({ mcpServers: servers }, null, 2));

      // 更新本地状态
      setMcpConfig(servers);

      // 尝试重连百度搜索服务器
      await window.ipcRenderer.invoke('mcp:reconnect', 'baidu-search');

      // 刷新状态
      const status = await window.ipcRenderer.invoke('mcp:get-status') as MCPServerStatus[];
      setServerStatus(status);

      // 清空输入
      setBaiduApiKey('');
    } catch (err) {
      console.error('[MCPManager] Failed to configure Baidu API Key:', err);
      setError('配置 API Key 失败');
    } finally {
      setConfiguringApiKey(false);
    }
  };

  // 配置豆包 API Key
  const handleDoubaoApiKeyConfig = async (apiKey: string) => {
    if (!apiKey || apiKey.trim() === '') {
      setError('请输入有效的 API Key');
      return;
    }

    setConfiguringApiKey(true);
    setError(null);

    try {
      // 读取当前配置
      const config = await window.ipcRenderer.invoke('mcp:get-config') as Record<string, any>;
      const servers = config.mcpServers || {};

      // 更新豆包搜索配置
      servers['doubao-search'] = {
        ...servers['doubao-search'],
        baseUrl: 'https://mcp.coze.cn/v1/plugins/7516843396187766818',
        headers: {
          ...servers['doubao-search']?.headers,
          Authorization: `Bearer ${apiKey.trim()}`  // 豆包使用空格
        },
        disabled: false  // 自动启用
      };

      // 保存配置
      await window.ipcRenderer.invoke('mcp:save-config', JSON.stringify({ mcpServers: servers }, null, 2));

      // 更新本地状态
      setMcpConfig(servers);

      // 尝试重连豆包服务器
      await window.ipcRenderer.invoke('mcp:reconnect', 'doubao-search');

      // 刷新状态
      const status = await window.ipcRenderer.invoke('mcp:get-status') as MCPServerStatus[];
      setServerStatus(status);

      // 清空输入
      setDoubaoApiKey('');
    } catch (err) {
      console.error('[MCPManager] Failed to configure Doubao API Key:', err);
      setError('配置 API Key 失败');
    } finally {
      setConfiguringApiKey(false);
    }
  };

  // 获取服务器状态
  const getServerStatus = (serverName: string) => {
    return serverStatus.find(s => s.name === serverName);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-slate-400">加载 MCP 配置中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <AlertCircle size={18} className="text-red-400" />
          <span className="text-sm text-red-200">{error}</span>
        </div>
      )}

      {/* 配置健康度检查 */}
      {!configHealth.healthy && (
        <div className="p-5 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-yellow-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-200 mb-2">
                配置问题检测
              </p>
              <ul className="text-sm text-yellow-300/80 space-y-1 mb-3">
                {configHealth.issues.map((issue, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-yellow-400">•</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
              <div className="text-sm text-yellow-300/80 mb-3">
                <p className="font-medium text-yellow-200 mb-1">修复建议:</p>
                {configHealth.suggestions.map((suggestion, idx) => (
                  <p key={idx} className="flex items-start gap-2">
                    <span className="text-yellow-400">{idx + 1}.</span>
                    <span>{suggestion}</span>
                  </p>
                ))}
              </div>
              {configHealth.canAutoFix && (
                <button
                  onClick={handleRepairConfig}
                  disabled={isRepairing}
                  className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Wrench size={16} />
                  {isRepairing ? '修复中...' : '一键修复配置'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 已添加的服务器 */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Check className="w-5 h-5 text-green-500" />
          <h3 className="text-lg font-semibold text-white">已添加的服务器</h3>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {availableServers.map(server => {
            const ServerIcon = server.icon;
            const config = mcpConfig[server.name];
            const enabled = !config?.disabled;
            const status = getServerStatus(server.name);
            const isToggling = togglingServer === server.name;

            return (
              <div
                key={server.name}
                className={`group p-5 rounded-2xl border-2 transition-all ${
                  enabled
                    ? 'bg-slate-800/50 border-orange-500/30 hover:border-orange-500/50'
                    : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* 图标 */}
                  <div className={`p-3 rounded-xl ${enabled ? 'bg-orange-500/20' : 'bg-slate-800'}`}>
                    <ServerIcon className={`w-6 h-6 ${enabled ? 'text-orange-500' : 'text-slate-600'}`} />
                  </div>

                  {/* 内容 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={`font-semibold ${enabled ? 'text-white' : 'text-slate-400'}`}>
                        {server.displayName}
                      </h4>
                      {enabled && !status?.connected && (
                        <span className="text-xs px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full border border-yellow-500/30">
                          连接中...
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${enabled ? 'text-slate-400' : 'text-slate-500'}`}>
                      {server.description}
                    </p>

                    {/* 状态 */}
                    {enabled && (
                      <div className="flex items-center gap-4 mt-2">
                        {status?.connected ? (
                          <span className="text-xs text-green-400 flex items-center gap-1.5">
                            <Check size={14} />
                            已连接
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">未连接</span>
                            <button
                              onClick={() => handleReconnect(server.name)}
                              className="text-xs px-2 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-1"
                            >
                              <RefreshCw size={10} />
                              重试
                            </button>
                          </div>
                        )}
                        {status?.error && (
                          <span className="text-xs text-red-400 truncate" title={status.error}>
                            {status.error}
                          </span>
                        )}
                      </div>
                    )}

                    {/* 百度千帆 API Key 配置 */}
                    {server.name === 'baidu-search' && (
                      <div className="mt-3 p-3 bg-slate-700/50 rounded-lg">
                        {/* 🔴 未配置警告 */}
                        {(!enabled || (mcpConfig['baidu-search']?.headers?.Authorization || '').includes('YOUR_BAIDU_API_KEY_HERE')) && (
                          <div className="mb-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <p className="text-xs text-yellow-400 font-medium">
                              ⚠️ 需要配置 API Key 才能使用此功能
                            </p>
                          </div>
                        )}

                        <p className="text-xs text-slate-400 mb-2">
                          配置百度千帆 API Key 后可使用实时搜索功能
                        </p>
                        <p className="text-xs text-blue-300 mb-2">
                          💡 使用方法：输入 API Key → 点击"配置并启用"按钮
                        </p>
                        <p className="text-xs text-yellow-400 mb-2">
                          ⚠️ 格式提示：直接粘贴 API Key（如 bce-v3/ALTAK-xxxxx/Altc/xxxxx），系统会自动添加 "Bearer " 前缀（注意是空格）
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="password"
                            placeholder="请输入百度千帆 API Key"
                            value={baiduApiKey}
                            onChange={(e) => setBaiduApiKey(e.target.value)}
                            disabled={configuringApiKey}
                            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm placeholder:text-slate-500 disabled:opacity-50"
                          />
                          <button
                            onClick={() => handleBaiduApiKeyConfig(baiduApiKey)}
                            disabled={configuringApiKey || !baiduApiKey.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {configuringApiKey ? '配置中...' : '配置并启用'}
                          </button>
                        </div>
                        <a
                          href="https://console.bce.baidu.com/qianfan/planet/apiKey"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block"
                        >
                          如何获取 API Key?
                        </a>
                      </div>
                    )}

                    {/* 豆包 API Key 配置 */}
                    {server.name === 'doubao-search' && (
                      <div className="mt-3 p-3 bg-slate-700/50 rounded-lg">
                        {/* 🔴 未配置警告 */}
                        {(!enabled || (mcpConfig['doubao-search']?.headers?.Authorization || '').includes('YOUR_DOUBAO_API_KEY_HERE')) && (
                          <div className="mb-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                            <p className="text-xs text-yellow-400 font-medium">
                              ⚠️ 需要配置 API Key 才能使用此功能
                            </p>
                          </div>
                        )}

                        <p className="text-xs text-slate-400 mb-2">
                          配置豆包火山引擎 API Key 后可使用 AI 搜索与问答功能
                        </p>
                        <p className="text-xs text-blue-300 mb-2">
                          💡 使用方法：输入 API Key → 点击"配置并启用"按钮
                        </p>
                        <p className="text-xs text-yellow-400 mb-2">
                          ⚠️ 格式提示：直接粘贴 API Key（如 cztei_xxxxxxxxxxxxxx），系统会自动添加 "Bearer " 前缀
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="password"
                            placeholder="请输入豆包 API Key"
                            value={doubaoApiKey}
                            onChange={(e) => setDoubaoApiKey(e.target.value)}
                            disabled={configuringApiKey}
                            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm placeholder:text-slate-500 disabled:opacity-50"
                          />
                          <button
                            onClick={() => handleDoubaoApiKeyConfig(doubaoApiKey)}
                            disabled={configuringApiKey || !doubaoApiKey.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {configuringApiKey ? '配置中...' : '配置并启用'}
                          </button>
                        </div>
                        <a
                          href="https://www.coze.cn/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block"
                        >
                          如何获取 API Key?
                        </a>
                      </div>
                    )}
                  </div>

                  {/* 开关 */}
                  <button
                    onClick={() => handleToggle(server.name)}
                    disabled={isToggling}
                    className={`relative w-14 h-7 rounded-full transition-colors shrink-0 ${
                      enabled
                        ? 'bg-orange-600'
                        : 'bg-slate-700'
                    } ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                      enabled ? 'translate-x-7' : ''
                    }`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 提示信息 */}
      <div className="p-5 bg-orange-500/10 border border-orange-500/30 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div>
            <p className="text-sm font-medium text-orange-200 mb-1">
              需要联网才能使用这些功能
            </p>
            <p className="text-sm text-orange-300/80">
              启用高级功能可能需要配置 API 密钥，具体请参考通用设置中的说明。
            </p>
          </div>
        </div>
      </div>

      {/* 统计和操作 */}
      <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-700">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-slate-400">
              运行中: <span className="text-white font-semibold">{serverStatus.filter(s => s.connected).length}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-slate-400">
              已启用: <span className="text-white font-semibold">{availableServers.filter(s => !mcpConfig[s.name]?.disabled).length}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MCPManager;
