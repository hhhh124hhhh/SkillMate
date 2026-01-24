import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Check, Palette } from 'lucide-react';

interface QuickAction {
  id: string;
  icon: string;
  label: string;
  prompt: string;
  color: string;
  bg: string;
  border: string;
}

interface QuickActionsEditorProps {
  onClose: () => void;
}

// 可用的图标列表
const availableIcons = [
  'Code', 'FileSearch', 'Wrench', 'Lightbulb', 'Zap', 'Cpu',
  'Search', 'Type', 'PenTool', 'Layout', 'Image', 'FolderOpen',
  'Database', 'GitBranch', 'Terminal', 'Settings', 'HelpCircle'
];

// 颜色主题
const colorThemes = [
  { name: '蓝色', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  { name: '绿色', color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  { name: '橙色', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  { name: '紫色', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  { name: '红色', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  { name: '青色', color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-200' },
];

// 默认快捷按钮
const defaultQuickActions: QuickAction[] = [
  { id: '1', icon: 'Code', label: '代码生成', prompt: '帮我生成一个函数，功能是：[描述你的需求]', ...colorThemes[0] },
  { id: '2', icon: 'FileSearch', label: '代码分析', prompt: '分析这个代码的功能和改进建议', ...colorThemes[1] },
  { id: '3', icon: 'Wrench', label: '问题诊断', prompt: '帮我调试这段代码，找出错误原因', ...colorThemes[2] },
  { id: '4', icon: 'Lightbulb', label: '方案设计', prompt: '帮我设计一个解决方案，需求是：[描述需求]', ...colorThemes[3] }
];

export function QuickActionsEditor({ onClose }: QuickActionsEditorProps) {
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<QuickAction>({
    id: '',
    icon: 'Code',
    label: '',
    prompt: '',
    ...colorThemes[0]
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadQuickActions();
  }, []);

  const loadQuickActions = async () => {
    try {
      const config = await window.ipcRenderer.invoke('config:get-all') as { quickActions?: QuickAction[] };
      setQuickActions(config.quickActions || defaultQuickActions);
    } catch (error) {
      console.error('Failed to load quick actions:', error);
      setQuickActions(defaultQuickActions);
    }
  };

  const handleSave = async () => {
    try {
      await window.ipcRenderer.invoke('config:set-all', { quickActions });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save quick actions:', error);
      alert('保存失败：' + (error as Error).message);
    }
  };

  const handleAdd = () => {
    const newAction: QuickAction = {
      id: Date.now().toString(),
      icon: 'Code',
      label: '新按钮',
      prompt: '',
      ...colorThemes[0]
    };
    setQuickActions([...quickActions, newAction]);
    setEditingId(newAction.id);
    setEditForm(newAction);
  };

  const handleEdit = (action: QuickAction) => {
    setEditingId(action.id);
    setEditForm(action);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({
      id: '',
      icon: 'Code',
      label: '',
      prompt: '',
      ...colorThemes[0]
    });
  };

  const handleSaveEdit = () => {
    const updated = quickActions.map(action =>
      action.id === editForm.id ? editForm : action
    );
    setQuickActions(updated);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (!confirm('确定要删除这个快捷按钮吗？')) {
      return;
    }
    setQuickActions(quickActions.filter(action => action.id !== id));
  };

  const handleResetDefaults = () => {
    if (!confirm('确定要恢复默认设置吗？这将清除所有自定义按钮。')) {
      return;
    }
    setQuickActions(defaultQuickActions);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <Palette size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">快捷操作配置</h2>
              <p className="text-xs text-slate-500">自定义主界面的快捷操作按钮</p>
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
        <div className="flex-1 overflow-y-auto p-6">
          {/* 操作按钮 */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-slate-600">
              已配置 {quickActions.length} 个快捷按钮
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleResetDefaults}
                className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                恢复默认
              </button>
              <button
                onClick={handleAdd}
                className="flex items-center gap-2 px-4 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                <Plus size={14} />
                添加按钮
              </button>
            </div>
          </div>

          {/* 按钮列表 */}
          <div className="space-y-4">
            {quickActions.map((action) => (
              <div
                key={action.id}
                className={`border rounded-xl p-4 transition-all ${
                  editingId === action.id
                    ? 'border-purple-300 bg-purple-50/30'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {editingId === action.id ? (
                  // 编辑模式
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">图标</label>
                        <select
                          value={editForm.icon}
                          onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                        >
                          {availableIcons.map(icon => (
                            <option key={icon} value={icon}>{icon}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">颜色主题</label>
                        <select
                          value={colorThemes.findIndex(t => t.color === editForm.color)}
                          onChange={(e) => {
                            const theme = colorThemes[parseInt(e.target.value)];
                            setEditForm({ ...editForm, ...theme });
                          }}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                        >
                          {colorThemes.map((theme, i) => (
                            <option key={i} value={i}>{theme.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">按钮标签</label>
                      <input
                        type="text"
                        value={editForm.label}
                        onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                        placeholder="例如：代码生成"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">预设提示词</label>
                      <textarea
                        value={editForm.prompt}
                        onChange={(e) => setEditForm({ ...editForm, prompt: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none"
                        rows={3}
                        placeholder="例如：帮我生成一个函数，功能是：[描述你的需求]"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={handleSaveEdit}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                      >
                        <Check size={14} />
                        保存
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => handleDelete(action.id)}
                        className="ml-auto px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ) : (
                  // 预览模式
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${editForm.bg} ${editForm.color}`}>
                      {getIconComponent(action.icon)}
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-semibold text-slate-800 mb-1`}>{action.label}</h3>
                      <p className="text-xs text-slate-500 font-mono truncate">{action.prompt}</p>
                    </div>
                    <button
                      onClick={() => handleEdit(action)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(action.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {quickActions.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Palette size={48} className="mx-auto mb-4 text-slate-300" />
              <p className="text-sm">暂无快捷按钮</p>
              <p className="text-xs mt-2">点击"添加按钮"开始配置</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              修改后会立即应用到主界面
            </p>
            <button
              onClick={handleSave}
              disabled={saved}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center gap-2 ${
                saved
                  ? 'bg-green-50 text-green-600 border border-green-200'
                  : 'bg-purple-600 text-white hover:bg-purple-700 shadow-purple-200'
              } ${saved ? '' : 'hover:shadow-lg hover:-translate-y-0.5'}`}
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

// 图标组件映射函数
function getIconComponent(iconName: string) {
  const icons: Record<string, React.ReactNode> = {
    Code: <span className="text-lg">💻</span>,
    FileSearch: <span className="text-lg">🔍</span>,
    Wrench: <span className="text-lg">🔧</span>,
    Lightbulb: <span className="text-lg">💡</span>,
    Zap: <span className="text-lg">⚡</span>,
    Cpu: <span className="text-lg">🖥️</span>,
    Search: <span className="text-lg">🔎</span>,
    Type: <span className="text-lg">✏️</span>,
    PenTool: <span className="text-lg">📝</span>,
    Layout: <span className="text-lg">📐</span>,
    Image: <span className="text-lg">🖼️</span>,
    FolderOpen: <span className="text-lg">📁</span>,
    Database: <span className="text-lg">🗄️</span>,
    GitBranch: <span className="text-lg">🌿</span>,
    Terminal: <span className="text-lg">⌨️</span>,
    Settings: <span className="text-lg">⚙️</span>,
    HelpCircle: <span className="text-lg">❓</span>
  };
  return icons[iconName] || <span className="text-lg">📌</span>;
}
