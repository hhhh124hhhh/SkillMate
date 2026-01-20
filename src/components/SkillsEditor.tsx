import { useState, useEffect } from 'react';
import { X, Plus, Edit, Trash2, Copy, BookOpen, Code, FolderOpen, Check } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  path: string;
  isBuiltin: boolean;
}

interface SkillsEditorProps {
  onClose: () => void;
}

export function SkillsEditor({ onClose }: SkillsEditorProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [skillContent, setSkillContent] = useState('');
  const [saved, setSaved] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);

  useEffect(() => {
    loadSkills();
  }, []);

  const loadSkills = async () => {
    try {
      const result = await window.ipcRenderer.invoke('skills:list') as Skill[];
      setSkills(result || []);
    } catch (error) {
      console.error('Failed to load skills:', error);
    }
  };

  const handleEdit = async (skill: Skill) => {
    if (skill.isBuiltin) {
      // 内置技能只读，提示复制
      alert('这是内置技能（只读）。如需修改，请先复制到用户目录。');
      return;
    }

    try {
      const content = await window.ipcRenderer.invoke('skills:get', skill.id) as string;
      setEditingSkill(skill);
      setSkillContent(content);
      setCreatingNew(false);
    } catch (error) {
      console.error('Failed to load skill content:', error);
      alert('加载技能失败：' + (error as Error).message);
    }
  };

  const handleSave = async () => {
    if (!editingSkill) return;

    try {
      const result = await window.ipcRenderer.invoke('skills:save', editingSkill.id, skillContent);
      if ((result as { success: boolean }).success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        await loadSkills(); // Reload skills list
      } else {
        alert('保存失败：' + (result as { error?: string }).error);
      }
    } catch (error) {
      console.error('Failed to save skill:', error);
      alert('保存失败：' + (error as Error).message);
    }
  };

  const handleDelete = async (skill: Skill) => {
    if (skill.isBuiltin) {
      alert('无法删除内置技能。');
      return;
    }

    if (!confirm(`确定要删除技能"${skill.name}"吗？此操作不可恢复。`)) {
      return;
    }

    try {
      const result = await window.ipcRenderer.invoke('skills:delete', skill.id);
      if ((result as { success: boolean }).success) {
        await loadSkills(); // Reload skills list
      } else {
        alert('删除失败：' + (result as { error?: string }).error);
      }
    } catch (error) {
      console.error('Failed to delete skill:', error);
      alert('删除失败：' + (error as Error).message);
    }
  };

  const handleCopy = async (skill: Skill) => {
    const newSkillId = `${skill.name}-copy`;
    const newSkillName = `${skill.name} (副本)`;

    try {
      const content = await window.ipcRenderer.invoke('skills:get', skill.id) as string;
      // Update name in frontmatter
      const updatedContent = content.replace(
        /^name:.*$/m,
        `name: ${newSkillName}`
      );

      const result = await window.ipcRenderer.invoke('skills:save', newSkillId, updatedContent);
      if ((result as { success: boolean }).success) {
        await loadSkills();
        alert('技能已复制到用户目录。现在可以编辑副本了。');
      } else {
        alert('复制失败：' + (result as { error?: string }).error);
      }
    } catch (error) {
      console.error('Failed to copy skill:', error);
      alert('复制失败：' + (error as Error).message);
    }
  };

  const handleCreateNew = () => {
    setCreatingNew(true);
    setEditingSkill({ id: '', name: '', path: '', isBuiltin: false });
    setSkillContent(`---
name: new-skill
description: 新技能描述
input_schema:
  type: object
  properties:
    query:
      type: string
      description: 输入参数
---

# 技能说明

这里是技能的具体指令和说明...

## 使用示例

用户如何使用这个技能...
`);
  };

  const handleCancelEdit = () => {
    setEditingSkill(null);
    setSkillContent('');
    setCreatingNew(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl h-[85vh] shadow-2xl flex flex-col overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <Code size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">技能管理</h2>
              <p className="text-xs text-slate-500">管理和编辑自定义AI技能</p>
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
        <div className="flex-1 overflow-hidden">
          {editingSkill ? (
            // 编辑器模式
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 bg-white">
                <div className="flex items-center gap-2">
                  <Edit size={16} className="text-purple-600" />
                  <span className="font-medium text-slate-700">
                    {creatingNew ? '创建新技能' : `编辑: ${editingSkill.name}`}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saved}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                      saved
                        ? 'bg-green-50 text-green-600'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {saved ? <Check size={14} /> : null}
                    {saved ? '已保存' : '保存'}
                  </button>
                </div>
              </div>
              <div className="flex-1 p-4">
                <textarea
                  value={skillContent}
                  onChange={(e) => setSkillContent(e.target.value)}
                  placeholder="输入技能内容（Markdown格式）"
                  className="w-full h-full p-4 font-mono text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none"
                />
              </div>
            </div>
          ) : (
            // 列表模式
            <div className="h-full overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <BookOpen size={16} />
                  <span>已安装 {skills.length} 个技能</span>
                </div>
                <button
                  onClick={handleCreateNew}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  <Plus size={16} />
                  创建新技能
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    className={`group relative bg-white border rounded-xl p-4 transition-all hover:shadow-md ${
                      skill.isBuiltin
                        ? 'border-blue-200 bg-blue-50/30'
                        : 'border-slate-200 hover:border-purple-300'
                    }`}
                  >
                    {/* Badge */}
                    <div className="absolute top-3 right-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          skill.isBuiltin
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {skill.isBuiltin ? '内置' : '自定义'}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className={`p-2 rounded-lg ${
                          skill.isBuiltin ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                        }`}
                      >
                        <Code size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-800 truncate mb-1">
                          {skill.name}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {skill.isBuiltin ? '内置技能，只读' : '用户自定义技能'}
                        </p>
                      </div>
                    </div>

                    {/* Path */}
                    <div className="flex items-center gap-1 text-xs text-slate-400 mb-3">
                      <FolderOpen size={12} />
                      <span className="truncate font-mono">{skill.path}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => handleEdit(skill)}
                        className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          skill.isBuiltin
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                        }`}
                        disabled={skill.isBuiltin}
                      >
                        <Edit size={12} />
                        编辑
                      </button>
                      {skill.isBuiltin ? (
                        <button
                          onClick={() => handleCopy(skill)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                        >
                          <Copy size={12} />
                          复制
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDelete(skill)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={12} />
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Empty State */}
              {skills.length === 0 && (
                <div className="text-center py-12">
                  <Code size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 mb-2">暂无已安装的技能</p>
                  <p className="text-sm text-slate-400 mb-6">
                    点击"创建新技能"开始添加
                  </p>
                  <button
                    onClick={handleCreateNew}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Plus size={18} />
                    创建第一个技能
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Help */}
        {!editingSkill && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-500">
              💡 <strong>提示：</strong>内置技能（蓝色）只读，可以复制后修改。自定义技能（紫色）可以自由编辑和删除。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
