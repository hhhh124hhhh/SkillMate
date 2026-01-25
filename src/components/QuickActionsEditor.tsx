import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, Palette, Loader2 } from 'lucide-react';

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
  { id: 'Code', emoji: '💻', name: '代码' },
  { id: 'FileSearch', emoji: '🔍', name: '搜索' },
  { id: 'Wrench', emoji: '🔧', name: '工具' },
  { id: 'Lightbulb', emoji: '💡', name: '创意' },
  { id: 'Zap', emoji: '⚡', name: '快速' },
  { id: 'Cpu', emoji: '🖥️', name: '计算机' },
  { id: 'Search', emoji: '🔎', name: '查找' },
  { id: 'Type', emoji: '✏️', name: '写作' },
  { id: 'PenTool', emoji: '📝', name: '编辑' },
  { id: 'Layout', emoji: '📐', name: '设计' },
  { id: 'Image', emoji: '🖼️', name: '图片' },
  { id: 'FolderOpen', emoji: '📁', name: '文件夹' },
  { id: 'Database', emoji: '🗄️', name: '数据库' },
  { id: 'GitBranch', emoji: '🌿', name: 'Git' },
  { id: 'Terminal', emoji: '⌨️', name: '终端' },
  { id: 'Settings', emoji: '⚙️', name: '设置' },
  { id: 'HelpCircle', emoji: '❓', name: '帮助' }
];

// 深色主题颜色
const colorThemes = [
  { name: '橙色', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
  { name: '绿色', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' },
  { name: '黄色', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
  { name: '紫色', color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30' },
  { name: '红色', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
  { name: '青色', color: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30' },
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
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadQuickActions();
  }, []);

  const loadQuickActions = async () => {
    setIsLoading(true);
    try {
      const config = await window.ipcRenderer.invoke('config:get-all') as { quickActions?: QuickAction[] };
      setQuickActions(config.quickActions || defaultQuickActions);
    } catch (error) {
      console.error('Failed to load quick actions:', error);
      setQuickActions(defaultQuickActions);
    } finally {
      setIsLoading(false);
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
      prompt: '请描述你的需求...',
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
    if (editingId === id) {
      setEditingId(null);
    }
  };

  const handleResetDefaults = () => {
    if (!confirm('确定要恢复默认设置吗？这将清除所有自定义按钮。')) {
      return;
    }
    setQuickActions(defaultQuickActions);
    setEditingId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-slate-400">加载快捷操作配置中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 标题和操作 */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white mb-2">快捷操作配置</h2>
          <p className="text-slate-400">自定义主界面的快捷操作按钮（最多可配置 8 个）</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleResetDefaults}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            恢复默认
          </button>
          <button
            onClick={handleAdd}
            disabled={quickActions.length >= 8}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} />
            添加按钮
          </button>
        </div>
      </div>

      {/* 说明 */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div>
            <p className="text-sm font-medium text-blue-200 mb-1">
              快捷操作使用说明
            </p>
            <ul className="text-xs text-blue-300/80 space-y-0.5">
              <li>• 快捷按钮会显示在主界面右侧，方便快速调用常用功能</li>
              <li>• 点击按钮后会自动将预设提示词发送给 AI</li>
              <li>• 可以自定义图标、颜色、标签和提示词模板</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 按钮列表 */}
      {quickActions.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/30">
          <Palette className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-400 mb-2">暂无快捷按钮</h3>
          <p className="text-sm text-slate-500">点击"添加按钮"开始配置</p>
        </div>
      ) : (
        <div className="space-y-4">
          {quickActions.map((action, index) => {
            const iconInfo = availableIcons.find(i => i.id === action.icon);
            const isEditing = editingId === action.id;

            return (
              <div
                key={action.id}
                className={`group relative p-5 rounded-2xl border-2 transition-all ${
                  isEditing
                    ? 'bg-slate-800/50 border-orange-500/50 shadow-lg'
                    : 'bg-slate-800/30 border-slate-700 hover:border-slate-600'
                }`}
              >
                {isEditing ? (
                  // 编辑模式
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {/* 图标选择 */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">图标</label>
                        <div className="grid grid-cols-4 gap-2">
                          {availableIcons.map(icon => {
                            const isSelected = editForm.icon === icon.id;
                            return (
                              <button
                                key={icon.id}
                                onClick={() => setEditForm({ ...editForm, icon: icon.id })}
                                className={`p-2 rounded-lg text-xl transition-all ${
                                  isSelected
                                    ? 'bg-orange-500/20 border-2 border-orange-500'
                                    : 'bg-slate-900 border-2 border-transparent hover:border-slate-600'
                                }`}
                                title={icon.name}
                              >
                                {icon.emoji}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 颜色主题 */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">颜色主题</label>
                        <div className="grid grid-cols-3 gap-2">
                          {colorThemes.map((theme, i) => {
                            const isSelected = editForm.color === theme.color;
                            return (
                              <button
                                key={i}
                                onClick={() => setEditForm({ ...editForm, ...theme })}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                  isSelected
                                    ? 'bg-slate-700 text-white'
                                    : 'bg-slate-900 text-slate-400 hover:text-slate-300'
                                }`}
                              >
                                <span className="mr-1.5">{isSelected ? '●' : '○'}</span>
                                {theme.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* 按钮标签 */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">按钮标签</label>
                      <input
                        type="text"
                        value={editForm.label}
                        onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                        placeholder="例如：代码生成"
                      />
                    </div>

                    {/* 预设提示词 */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">预设提示词</label>
                      <textarea
                        value={editForm.prompt}
                        onChange={(e) => setEditForm({ ...editForm, prompt: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none font-mono"
                        rows={3}
                        placeholder="例如：帮我生成一个函数，功能是：[描述你的需求]"
                      />
                      <p className="text-xs text-slate-500 mt-1.5">
                        支持 [描述你的需求] 这样的占位符，使用时会提示用户输入
                      </p>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={handleSaveEdit}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors text-sm font-medium"
                      >
                        <Check size={16} />
                        保存
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => handleDelete(action.id)}
                        className="ml-auto px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ) : (
                  // 预览模式
                  <div className="flex items-center gap-4">
                    {/* 图标预览 */}
                    <div className={`p-4 rounded-xl ${action.bg} ${action.color} text-2xl`}>
                      {iconInfo?.emoji || '📌'}
                    </div>

                    {/* 内容 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-semibold ${action.color}`}>
                          {action.label}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-400 rounded-full">
                          #{index + 1}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-mono line-clamp-2">
                        {action.prompt}
                      </p>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(action)}
                        className="p-2.5 text-slate-500 hover:text-orange-400 hover:bg-slate-700 rounded-xl transition-all"
                        title="编辑"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(action.id)}
                        className="p-2.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                        title="删除"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 底部保存栏 */}
      <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-700">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-orange-500" />
            <span className="text-slate-400">
              已配置: <span className="text-white font-semibold">{quickActions.length}</span> / 8
            </span>
          </div>
          <p className="text-xs text-slate-500">
            修改后会立即应用到主界面
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saved}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            saved
              ? 'bg-green-600/20 text-green-400 border border-green-500/30'
              : 'bg-orange-600 text-white hover:bg-orange-700 shadow-lg shadow-orange-500/20'
          }`}
        >
          {saved ? <Check size={18} /> : null}
          {saved ? '已保存' : '保存配置'}
        </button>
      </div>
    </div>
  );
}

export default QuickActionsEditor;
