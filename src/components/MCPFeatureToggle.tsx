/**
 * MCP 功能开关组件
 * 将复杂的 MCP 配置简化为小白友好的开关界面
 */

import React, { useState, useEffect } from 'react';
import { Globe, FileText, Image, BarChart, Zap, Settings, ChevronRight, Check } from 'lucide-react';

interface MCPFeature {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
  category: 'essential' | 'advanced';
  requiredServer?: string; // 需要启用的MCP服务器
}

interface MCPFeatureToggleProps {
  onClose: () => void;
}

export const MCPFeatureToggle: React.FC<MCPFeatureToggleProps> = ({ onClose }) => {
  const [features, setFeatures] = useState<MCPFeature[]>([
    {
      id: 'file-access',
      name: '文件访问',
      description: '让AI能够读取和处理本地文件',
      icon: FileText,
      enabled: true,
      category: 'essential',
      requiredServer: 'filesystem'
    },
    {
      id: 'web-search',
      name: '网络搜索',
      description: '让AI能够搜索互联网获取最新信息',
      icon: Globe,
      enabled: true,
      category: 'essential',
      requiredServer: 'web-search'
    },
    {
      id: 'image-generation',
      name: '图片生成',
      description: '让AI能够生成配图和插图',
      icon: Image,
      enabled: false,
      category: 'advanced',
      requiredServer: 'image-gen'
    },
    {
      id: 'data-analysis',
      name: '数据分析',
      description: '让AI能够进行复杂的数据分析和图表生成',
      icon: BarChart,
      enabled: false,
      category: 'advanced',
      requiredServer: 'data-tools'
    }
  ]);

  const [isSaving, setIsSaving] = useState(false);

  // 从配置加载状态
  useEffect(() => {
    const loadMCPStatus = async () => {
      try {
        const status = await window.ipcRenderer.invoke('mcp:get-status') as Array<{
          name: string;
          connected: boolean;
        }>;

        // 更新功能状态
        setFeatures(prev => prev.map(feature => {
          if (!feature.requiredServer) return feature;

          const serverStatus = status.find(s => s.name === feature.requiredServer);
          return {
            ...feature,
            enabled: serverStatus?.connected || false
          };
        }));
      } catch (error) {
        console.error('[MCPFeatureToggle] Failed to load MCP status:', error);
      }
    };

    loadMCPStatus();
  }, []);

  const handleToggle = async (featureId: string) => {
    const feature = features.find(f => f.id === featureId);
    if (!feature || !feature.requiredServer) return;

    const newState = !feature.enabled;

    // 立即更新UI（乐观更新）
    setFeatures(prev => prev.map(f =>
      f.id === featureId ? { ...f, enabled: newState } : f
    ));

    try {
      if (newState) {
        // 启用服务器
        // TODO: 调用启用MCP服务器的IPC
        console.log('[MCPFeatureToggle] Enabling server:', feature.requiredServer);
      } else {
        // 禁用服务器
        // TODO: 调用禁用MCP服务器的IPC
        console.log('[MCPFeatureToggle] Disabling server:', feature.requiredServer);
      }
    } catch (error) {
      // 如果失败，回滚状态
      console.error('[MCPFeatureToggle] Failed to toggle server:', error);
      setFeatures(prev => prev.map(f =>
        f.id === featureId ? { ...f, enabled: !newState } : f
      ));
    }
  };

  const essentialFeatures = features.filter(f => f.category === 'essential');
  const advancedFeatures = features.filter(f => f.category === 'advanced');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">
                  功能增强
                </h3>
                <p className="text-sm text-purple-100 mt-0.5">
                  让AI能帮你做更多事情（需要联网）
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="px-6 py-5 overflow-y-auto max-h-[60vh]">
          {/* 基础功能 */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Check className="w-5 h-5 text-green-600" />
              <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                基础功能（已启用）
              </h4>
            </div>
            <div className="space-y-3">
              {essentialFeatures.map(feature => (
                <div
                  key={feature.id}
                  className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                      <feature.icon className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h5 className="font-medium text-slate-800 dark:text-slate-100">
                        {feature.name}
                      </h5>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-green-600 text-white text-sm font-medium rounded-full">
                    已启用
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 高级功能 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-purple-600" />
              <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                高级功能（可选启用）
              </h4>
            </div>
            <div className="space-y-3">
              {advancedFeatures.map(feature => (
                <div
                  key={feature.id}
                  className={`flex items-center justify-between p-4 border-2 rounded-xl transition-all ${
                    feature.enabled
                      ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg shadow-sm ${
                      feature.enabled
                        ? 'bg-purple-600'
                        : 'bg-slate-100 dark:bg-slate-800'
                    }`}>
                      <feature.icon className={`w-5 h-5 ${
                        feature.enabled ? 'text-white' : 'text-slate-600 dark:text-slate-400'
                      }`} />
                    </div>
                    <div>
                      <h5 className={`font-medium ${
                        feature.enabled
                          ? 'text-purple-900 dark:text-purple-100'
                          : 'text-slate-800 dark:text-slate-100'
                      }`}>
                        {feature.name}
                      </h5>
                      <p className={`text-sm ${
                        feature.enabled
                          ? 'text-purple-700 dark:text-purple-300'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}>
                        {feature.description}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggle(feature.id)}
                    disabled={isSaving}
                    className={`relative w-14 h-8 rounded-full transition-colors ${
                      feature.enabled
                        ? 'bg-purple-600'
                        : 'bg-slate-300 dark:bg-slate-600'
                    } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-sm transition-transform ${
                      feature.enabled ? 'translate-x-6' : ''
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 提示信息 */}
          <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="text-2xl">💡</div>
              <div>
                <p className="text-sm font-medium text-orange-900 dark:text-orange-100 mb-1">
                  需要联网才能使用这些功能
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  启用高级功能可能需要配置 API 密钥，具体请参考设置中的说明。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};

export default MCPFeatureToggle;
