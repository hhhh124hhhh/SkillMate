import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X, Plus, Edit, Trash2, Copy, BookOpen, Code, FolderOpen, Check,
  FileText, AlertCircle, Eye, Type
} from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  path: string;
  isBuiltin: boolean;
}

interface SkillFrontmatter {
  name: string;
  description: string;
  input_schema?: {
    type: string;
    properties?: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
  [key: string]: unknown;
}

interface SkillTemplate {
  id: string;
  name: string;
  description: string;
  frontmatter: SkillFrontmatter;
  content: string;
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
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState<SkillTemplate[]>([]);
  const [activeTab, setActiveTab] = useState<'form' | 'preview' | 'code'>('form');

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formHasInputSchema, setFormHasInputSchema] = useState(false);
  const [formProperties, setFormProperties] = useState<Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
  }>>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    loadSkills();
    // loadTemplates will be called after skills are loaded
  }, []);

  useEffect(() => {
    if (skills.length > 0) {
      loadTemplates();
    }
  }, [skills]); // eslint-disable-line react-hooks/exhaustive-deps

  // Parse frontmatter from content
  const parseFrontmatter = (content: string): { frontmatter: SkillFrontmatter; content: string } => {
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) {
      return { frontmatter: { name: '', description: '' }, content };
    }

    try {
      const yamlText = match[1];
      const frontmatter: SkillFrontmatter = {
        name: yamlText.match(/^name:\s*(.+)$/m)?.[1] || '',
        description: yamlText.match(/^description:\s*(.+)$/m)?.[1] || '',
      };

      // Parse input_schema if exists
      const inputSchemaMatch = yamlText.match(/input_schema:\s*\n([\s\S]*?)(?=\n\w+:|\n---|\n*$)/);
      if (inputSchemaMatch) {
        // Simple parsing - in production, use a proper YAML parser
        frontmatter.input_schema = {
          type: 'object',
          properties: {},
          required: []
        };
      }

      return { frontmatter, content: match[2] };
    } catch (error) {
      console.error('Failed to parse frontmatter:', error);
      return { frontmatter: { name: '', description: '' }, content: match[2] || content };
    }
  };

  // Generate frontmatter from form state
  const generateFrontmatter = (): string => {
    let yaml = `---\n`;
    yaml += `name: ${formName}\n`;
    yaml += `description: ${formDescription}\n`;

    if (formHasInputSchema && formProperties.length > 0) {
      yaml += `input_schema:\n`;
      yaml += `  type: object\n`;
      yaml += `  properties:\n`;
      formProperties.forEach((prop) => {
        yaml += `    ${prop.name}:\n`;
        yaml += `      type: ${prop.type}\n`;
        if (prop.description) {
          yaml += `      description: ${prop.description}\n`;
        }
      });
      const required = formProperties.filter((p) => p.required).map((p) => p.name);
      if (required.length > 0) {
        yaml += `  required:\n`;
        required.forEach((r) => {
          yaml += `    - ${r}\n`;
        });
      }
    }

    yaml += `---\n`;
    return yaml;
  };

  // Generate full content from form state
  const generateFullContent = useCallback((): string => {
    const frontmatter = generateFrontmatter();
    const content = skillContent.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/)?.[1] || skillContent;
    return frontmatter + content;
  }, [formName, formDescription, formHasInputSchema, formProperties, skillContent]); // eslint-disable-line react-hooks/exhaustive-deps

  // Validate skill
  const validateSkill = (): string[] => {
    const errors: string[] = [];

    if (!formName) {
      errors.push('技能名称不能为空');
    } else if (!/^[a-z0-9-]+$/.test(formName)) {
      errors.push('技能名称只能包含小写字母、数字和连字符');
    }

    if (!formDescription) {
      errors.push('技能描述不能为空');
    } else if (formDescription.length < 10) {
      errors.push('技能描述至少需要 10 个字符');
    }

    if (formHasInputSchema) {
      formProperties.forEach((prop, index) => {
        if (!prop.name) {
          errors.push(`参数 ${index + 1} 的名称不能为空`);
        }
        if (!prop.type) {
          errors.push(`参数 ${index + 1} 的类型不能为空`);
        }
      });
    }

    return errors;
  };

  // Update form state when content changes
  useEffect(() => {
    if (editingSkill && skillContent) {
      const { frontmatter } = parseFrontmatter(skillContent);
      setFormName(frontmatter.name);
      setFormDescription(frontmatter.description);
      setFormHasInputSchema(!!frontmatter.input_schema);

      // Parse properties (simplified)
      if (frontmatter.input_schema?.properties) {
        const props = Object.entries(frontmatter.input_schema.properties).map(([name, config]: [string, unknown]) => {
          const conf = config as { type?: string; description?: string };
          return {
            name,
            type: conf.type || 'string',
            description: conf.description || '',
            required: frontmatter.input_schema?.required?.includes(name) || false
          };
        });
        setFormProperties(props);
      }
    }
  }, [editingSkill, skillContent]);

  const loadSkills = async () => {
    try {
      const result = await window.ipcRenderer.invoke('skills:list') as Skill[];
      setSkills(result || []);
    } catch (error) {
      console.error('Failed to load skills:', error);
    }
  };

  const loadTemplates = useCallback(async () => {
    try {
      // Load builtin skills as templates
      const builtinSkills = skills.filter((s) => s.isBuiltin);
      const templateList: SkillTemplate[] = [];

      for (const skill of builtinSkills.slice(0, 6)) { // Limit to 6 templates
        try {
          const content = await window.ipcRenderer.invoke('skills:get', skill.id) as string;
          const { frontmatter } = parseFrontmatter(content);
          templateList.push({
            id: skill.id,
            name: skill.name,
            description: frontmatter.description || skill.name,
            frontmatter,
            content
          });
        } catch (error) {
          console.error('Failed to load skill template:', error);
        }
      }

      setTemplates(templateList);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }, [skills]);

  const handleEdit = async (skill: Skill) => {
    if (skill.isBuiltin) {
      alert('这是内置技能（只读）。如需修改，请先复制到用户目录。');
      return;
    }

    try {
      const content = await window.ipcRenderer.invoke('skills:get', skill.id) as string;
      setEditingSkill(skill);
      setSkillContent(content);
      setCreatingNew(false);
      setActiveTab('form');
    } catch (error) {
      console.error('Failed to load skill content:', error);
      alert('加载技能失败：' + (error as Error).message);
    }
  };

  const handleSave = async () => {
    if (!editingSkill) return;

    // Validate
    const errors = validateSkill();
    setValidationErrors(errors);

    if (errors.length > 0) {
      setActiveTab('form');
      return;
    }

    try {
      const finalContent = activeTab === 'form' ? generateFullContent() : skillContent;
      const skillId = creatingNew ? formName : editingSkill.id;
      const result = await window.ipcRenderer.invoke('skills:save', skillId, finalContent);
      if ((result as { success: boolean }).success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        await loadSkills();
        if (creatingNew) {
          setCreatingNew(false);
          setEditingSkill(null);
        }
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
        await loadSkills();
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
    const newSkillName = `${skill.name}-copy`;

    try {
      const content = await window.ipcRenderer.invoke('skills:get', skill.id) as string;
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
    setFormName('new-skill');
    setFormDescription('');
    setFormHasInputSchema(false);
    setFormProperties([]);
    setValidationErrors([]);
    setSkillContent(`---
name: new-skill
description: 新技能描述
---

# 技能说明

这里是技能的具体指令和说明...

## 使用示例

用户如何使用这个技能...
`);
    setActiveTab('form');
  };

  const handleApplyTemplate = async (template: SkillTemplate) => {
    const newSkillName = `${template.name}-custom`;
    setCreatingNew(true);
    setEditingSkill({ id: '', name: newSkillName, path: '', isBuiltin: false });
    setFormName(newSkillName);
    setFormDescription(template.frontmatter.description);
    setFormHasInputSchema(!!template.frontmatter.input_schema);
    setSkillContent(template.content.replace(/^name:.*$/m, `name: ${newSkillName}`));
    setShowTemplates(false);
    setActiveTab('form');
  };

  const handleCancelEdit = () => {
    setEditingSkill(null);
    setSkillContent('');
    setCreatingNew(false);
    setFormName('');
    setFormDescription('');
    setFormHasInputSchema(false);
    setFormProperties([]);
    setValidationErrors([]);
  };

  const addProperty = () => {
    setFormProperties([...formProperties, { name: '', type: 'string', description: '', required: false }]);
  };

  const updateProperty = (index: number, field: string, value: string | boolean) => {
    const newProps = [...formProperties];
    newProps[index] = { ...newProps[index], [field]: value };
    setFormProperties(newProps);
  };

  const removeProperty = (index: number) => {
    setFormProperties(formProperties.filter((_, i) => i !== index));
  };

  // Preview content
  const previewContent = useMemo(() => {
    if (activeTab === 'form') {
      return generateFullContent();
    }
    return skillContent;
  }, [activeTab, generateFullContent, skillContent]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-7xl h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <Code size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">技能管理</h2>
              <p className="text-xs text-slate-500">管理和编辑自定义 AI 技能</p>
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
        <div className="flex-1 overflow-hidden flex">
          {!editingSkill ? (
            // Skills List
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <BookOpen size={16} />
                  <span>已安装 {skills.length} 个技能</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                  >
                    <FileText size={16} />
                    模板库
                  </button>
                  <button
                    onClick={handleCreateNew}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                  >
                    <Plus size={16} />
                    创建新技能
                  </button>
                </div>
              </div>

              {showTemplates ? (
                // Templates Grid
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="group relative bg-white border-2 border-orange-200 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer hover:border-orange-400"
                      onClick={() => handleApplyTemplate(template)}
                    >
                      <div className="absolute top-3 right-3">
                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-orange-100 text-orange-700">
                          模板
                        </span>
                      </div>
                      <div className="flex items-start gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                          <FileText size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-800 truncate mb-1">{template.name}</h3>
                          <p className="text-xs text-slate-500 line-clamp-2">{template.description}</p>
                        </div>
                      </div>
                      <button className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors">
                        <Copy size={12} />
                        使用模板
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                // Skills Grid
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {skills.map((skill) => (
                    <div
                      key={skill.id}
                      className={`group relative bg-white border rounded-xl p-4 transition-all hover:shadow-md ${
                        skill.isBuiltin
                          ? 'border-orange-200 bg-orange-50/30'
                          : 'border-slate-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="absolute top-3 right-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            skill.isBuiltin
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {skill.isBuiltin ? '内置' : '自定义'}
                        </span>
                      </div>

                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className={`p-2 rounded-lg ${
                            skill.isBuiltin ? 'bg-orange-100 text-orange-600' : 'bg-purple-100 text-purple-600'
                          }`}
                        >
                          <Code size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-800 truncate mb-1">{skill.name}</h3>
                          <p className="text-xs text-slate-500">{skill.isBuiltin ? '内置技能，只读' : '用户自定义技能'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-slate-400 mb-3">
                        <FolderOpen size={12} />
                        <span className="truncate font-mono">{skill.path}</span>
                      </div>

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
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-medium bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
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
              )}

              {skills.length === 0 && !showTemplates && (
                <div className="text-center py-12">
                  <Code size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 mb-2">暂无已安装的技能</p>
                  <p className="text-sm text-slate-400 mb-6">点击"创建新技能"或从"模板库"选择</p>
                </div>
              )}
            </div>
          ) : (
            // Editor
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Editor Header */}
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

              {/* Editor Tabs */}
              <div className="flex items-center gap-1 px-6 py-2 border-b border-slate-100 bg-slate-50">
                <button
                  onClick={() => setActiveTab('form')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'form'
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-slate-600 hover:bg-white/50'
                  }`}
                >
                  <Type size={14} />
                  表单编辑
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'preview'
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-slate-600 hover:bg-white/50'
                  }`}
                >
                  <Eye size={14} />
                  预览
                </button>
                <button
                  onClick={() => setActiveTab('code')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'code'
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-slate-600 hover:bg-white/50'
                  }`}
                >
                  <Code size={14} />
                  源代码
                </button>
              </div>

              {/* Editor Content */}
              <div className="flex-1 overflow-hidden">
                {activeTab === 'form' ? (
                  // Form Editor
                  <div className="h-full overflow-y-auto p-6">
                    {/* Validation Errors */}
                    {validationErrors.length > 0 && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-700 text-sm font-medium mb-2">
                          <AlertCircle size={14} />
                          <span>验证错误</span>
                        </div>
                        <ul className="text-sm text-red-600 space-y-1 list-disc list-inside">
                          {validationErrors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="space-y-6 max-w-3xl">
                      {/* Name */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          技能名称 <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-mono"
                          placeholder="my-skill"
                        />
                        <p className="text-xs text-slate-500 mt-1">只能包含小写字母、数字和连字符</p>
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          技能描述 <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={formDescription}
                          onChange={(e) => setFormDescription(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none"
                          placeholder="详细描述这个技能的功能和使用场景..."
                        />
                        <p className="text-xs text-slate-500 mt-1">{formDescription.length} / 10 最小字符</p>
                      </div>

                      {/* Input Schema Toggle */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-slate-700">
                            输入参数（input_schema）
                          </label>
                          <button
                            onClick={() => setFormHasInputSchema(!formHasInputSchema)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              formHasInputSchema ? 'bg-purple-600' : 'bg-slate-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                formHasInputSchema ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        <p className="text-xs text-slate-500">
                          {formHasInputSchema
                            ? '定义技能接受的输入参数（可选）'
                            : '此技能不需要输入参数'}
                        </p>
                      </div>

                      {/* Input Schema Properties */}
                      {formHasInputSchema && (
                        <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700">参数列表</span>
                            <button
                              onClick={addProperty}
                              className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                            >
                              + 添加参数
                            </button>
                          </div>

                          {formProperties.length === 0 ? (
                            <div className="text-center py-4 text-sm text-slate-400 border border-dashed border-slate-300 rounded-lg">
                              暂无参数，点击"添加参数"开始
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {formProperties.map((prop, index) => (
                                <div key={index} className="border border-slate-200 rounded-lg p-3 space-y-2">
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={prop.name}
                                      onChange={(e) => updateProperty(index, 'name', e.target.value)}
                                      className="flex-1 px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-mono"
                                      placeholder="参数名"
                                    />
                                    <select
                                      value={prop.type}
                                      onChange={(e) => updateProperty(index, 'type', e.target.value)}
                                      className="px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                                    >
                                      <option value="string">string</option>
                                      <option value="number">number</option>
                                      <option value="boolean">boolean</option>
                                      <option value="array">array</option>
                                      <option value="object">object</option>
                                    </select>
                                    <button
                                      onClick={() => removeProperty(index)}
                                      className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                  <input
                                    type="text"
                                    value={prop.description}
                                    onChange={(e) => updateProperty(index, 'description', e.target.value)}
                                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                                    placeholder="参数描述（可选）"
                                  />
                                  <label className="flex items-center gap-2 text-sm text-slate-600">
                                    <input
                                      type="checkbox"
                                      checked={prop.required}
                                      onChange={(e) => updateProperty(index, 'required', e.target.checked)}
                                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                    />
                                    必需参数
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Help Text */}
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-xs text-blue-800 font-medium mb-1">💡 技能格式说明</p>
                        <ul className="text-xs text-orange-700 space-y-1 list-disc list-inside">
                          <li>技能名称：唯一标识，英文，使用连字符</li>
                          <li>技能描述：清晰说明功能和触发条件</li>
                          <li>输入参数：可选，定义技能接受的参数</li>
                          <li>下方文本区域：技能的具体指令（Markdown 格式）</li>
                        </ul>
                      </div>

                      {/* Content Editor */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          技能内容（Markdown）
                        </label>
                        <textarea
                          value={skillContent.replace(/^---\n[\s\S]*?\n---\n/, '')}
                          onChange={(e) => {
                            const frontmatter = generateFrontmatter();
                            setSkillContent(frontmatter + e.target.value);
                          }}
                          rows={12}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-mono resize-none"
                          placeholder="# 技能说明&#10;&#10;这里是技能的具体指令...&#10;&#10;## 使用示例&#10;&#10;用户如何使用这个技能..."
                        />
                      </div>
                    </div>
                  </div>
                ) : activeTab === 'preview' ? (
                  // Preview
                  <div className="h-full overflow-y-auto p-6">
                    <div className="max-w-3xl">
                      <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
                        <Eye size={14} />
                        <span className="font-medium">实时预览</span>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <pre className="text-sm font-mono whitespace-pre-wrap break-words">{previewContent}</pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Code Editor
                  <div className="h-full p-4">
                    <textarea
                      value={skillContent}
                      onChange={(e) => setSkillContent(e.target.value)}
                      className="w-full h-full p-4 font-mono text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none"
                      spellCheck={false}
                    />
                  </div>
                )}
              </div>
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
