import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, Edit, Trash2, Copy, BookOpen, Code, FolderOpen, Check,
  FileText, AlertCircle, Eye, Type, X, Loader2, Zap, Download, Upload
} from 'lucide-react';
import ImportSkillDialog from './ImportSkillDialog';
import PreviewSkillDialog from './PreviewSkillDialog';
import { saveAs } from 'file-saver';
import { Button } from './ui/Button';

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
  const [activeTab, setActiveTab] = useState<'list' | 'form' | 'preview' | 'code'>('list');
  const [isLoading, setIsLoading] = useState(false);

  // ✨ 新增状态
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [selectedPreviewSkill, setSelectedPreviewSkill] = useState<SkillTemplate | null>(null);

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
  }, []);

  useEffect(() => {
    if (skills.length > 0 && !editingSkill) {
      loadTemplates();
    }
  }, [skills, editingSkill]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (editingSkill && skillContent && activeTab === 'form') {
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
  }, [editingSkill, skillContent, activeTab]);

  const loadSkills = async () => {
    setIsLoading(true);
    try {
      const result = await window.ipcRenderer.invoke('skills:list') as Skill[];
      setSkills(result || []);
    } catch (error) {
      console.error('Failed to load skills:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplates = useCallback(async () => {
    try {
      // Load builtin skills as templates
      const builtinSkills = skills.filter((s) => s.isBuiltin);
      const templateList: SkillTemplate[] = [];

      for (const skill of builtinSkills) {
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
          setActiveTab('list');
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

  // ✨ 新增：导出技能
  const handleExport = async (skill: Skill) => {
    try {
      // 获取技能内容
      const content = await window.ipcRenderer.invoke('skills:get', skill.id) as string;

      // 创建 Blob 并保存
      const blob = new Blob([content], { type: 'text/markdown' });
      saveAs(blob, `${skill.name}.md`);

      console.log(`导出技能: ${skill.name}`);
    } catch (error) {
      console.error('Failed to export skill:', error);
      alert('导出失败：' + (error as Error).message);
    }
  };

  // ✨ 新增：预览技能
  const handlePreview = async (template: SkillTemplate) => {
    setSelectedPreviewSkill(template);
    setShowPreviewDialog(true);
  };

  // ✨ 新增：导入成功回调
  const handleImportSuccess = async (skillId: string) => {
    await loadSkills();
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
    setActiveTab('list');
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
    <div className="max-w-5xl mx-auto space-y-6">
      {!editingSkill ? (
        <>
          {/* 标题和操作 */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">技能高级编辑</h2>
              <p className="text-slate-400">管理和编辑自定义 AI 技能（{skills.length} 个已安装）</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowImportDialog(true)}
                icon={Upload}
              >
                导入技能
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowTemplates(!showTemplates)}
                icon={FileText}
              >
                {showTemplates ? '返回列表' : '模板库'}
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateNew}
                icon={Plus}
              >
                创建新技能
              </Button>
            </div>
          </div>

          {/* 说明 */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">💡</div>
              <div>
                <p className="text-sm font-medium text-blue-200 mb-1">
                  技能高级编辑说明
                </p>
                <ul className="text-xs text-blue-300/80 space-y-0.5">
                  <li>• 内置技能只读，可以复制后修改</li>
                  <li>• 自定义技能可以自由编辑和删除</li>
                  <li>• 支持表单编辑、实时预览和源代码编辑</li>
                  <li>• 从模板库快速创建新技能</li>
                </ul>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto mb-4" />
                <p className="text-slate-400">加载技能中...</p>
              </div>
            </div>
          ) : showTemplates ? (
            // 模板库
            <>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-orange-500" />
                <h3 className="text-lg font-semibold text-white">技能模板库</h3>
                <span className="ml-2 text-xs text-slate-500">({templates.length} 个可用模板)</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => {
                  const isBuiltin = skills.some(s => s.id === template.id);

                  return (
                    <div
                      key={template.id}
                      className={`group relative p-5 rounded-2xl border-2 transition-all ${
                        isBuiltin
                          ? 'bg-slate-800/50 border-blue-500/30'
                          : 'bg-slate-800/30 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="absolute top-4 right-4">
                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          内置
                        </span>
                      </div>

                      <div className="flex items-start gap-3 mb-4">
                        <div className="p-3 rounded-xl bg-blue-500/20">
                          <FileText className="w-6 h-6 text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-white mb-1">{template.name}</h4>
                          <p className="text-sm text-slate-400 line-clamp-2">{template.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePreview(template)}
                          className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                        >
                          <Eye size={14} />
                          预览
                        </button>
                        <button
                          onClick={() => handleApplyTemplate(template)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors text-sm font-medium"
                        >
                          <Copy size={14} />
                          使用模板
                        </button>
                        {isBuiltin && (
                          <button
                            onClick={() => {
                              const skill = skills.find(s => s.id === template.id);
                              if (skill) handleEdit(skill);
                            }}
                            className="px-4 py-2 text-sm text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                          >
                            查看
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            // 技能列表
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {skills.map((skill) => {
                  const isBuiltin = skill.isBuiltin;

                  return (
                    <div
                      key={skill.id}
                      className={`group relative p-5 rounded-2xl border-2 transition-all ${
                        isBuiltin
                          ? 'bg-slate-800/50 border-blue-500/30'
                          : 'bg-slate-800/30 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="absolute top-4 right-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          isBuiltin
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                        }`}>
                          {isBuiltin ? '内置' : '自定义'}
                        </span>
                      </div>

                      <div className="flex items-start gap-3 mb-4">
                        <div className={`p-3 rounded-xl ${
                          isBuiltin ? 'bg-blue-500/20' : 'bg-orange-500/20'
                        }`}>
                          <Code className={`w-6 h-6 ${
                            isBuiltin ? 'text-blue-400' : 'text-orange-400'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-lg font-semibold text-white truncate mb-1">{skill.name}</h4>
                          <p className="text-xs text-slate-500 mb-3">{skill.path}</p>
                          <p className={`text-xs ${isBuiltin ? 'text-blue-300' : 'text-slate-500'}`}>
                            {isBuiltin ? '内置技能，只读' : '用户自定义技能'}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {!isBuiltin ? (
                          <button
                            onClick={() => handleEdit(skill)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors text-sm font-medium"
                          >
                            <Edit size={14} />
                            编辑
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEdit(skill)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 text-slate-400 rounded-xl hover:bg-slate-700 transition-colors text-sm font-medium"
                          >
                            <Eye size={14} />
                            查看
                          </button>
                        )}
                        <button
                          onClick={() => handleCopy(skill)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white rounded-xl transition-colors text-sm font-medium"
                        >
                          <Copy size={14} />
                          复制
                        </button>
                        <button
                          onClick={() => handleExport(skill)}
                          className="p-2 text-slate-400 hover:text-green-400 hover:bg-green-500/10 rounded-xl transition-all"
                          title="导出技能"
                        >
                          <Download size={16} />
                        </button>
                        {!isBuiltin && (
                          <button
                            onClick={() => handleDelete(skill)}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {skills.length === 0 && (
                <div className="text-center py-16 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/30">
                  <Code className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-400 mb-2">暂无已安装的技能</h3>
                  <p className="text-sm text-slate-500">从模板库选择或创建新技能</p>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        // 编辑器
        <>
          {/* 编辑器头部 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-orange-500/20 rounded-xl">
                <Edit size={20} className="text-orange-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {creatingNew ? '创建新技能' : `编辑: ${editingSkill.name}`}
                </h3>
                <p className="text-sm text-slate-400 mt-0.5">
                  {creatingNew ? '填写技能信息开始创建' : '修改技能内容'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={handleCancelEdit}
              >
                取消
              </Button>
              <Button
                variant={saved ? 'secondary' : 'primary'}
                onClick={handleSave}
                disabled={saved}
                icon={saved ? Check : undefined}
              >
                {saved ? '已保存' : '保存'}
              </Button>
            </div>
          </div>

          {/* 编辑器标签页 */}
          <div className="flex items-center gap-2 mb-6 p-1 bg-slate-800 rounded-xl">
            <button
              onClick={() => setActiveTab('form')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'form'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Type size={16} />
              表单编辑
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'preview'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Eye size={16} />
              实时预览
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'code'
                  ? 'bg-primary text-primary-foreground shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Code size={16} />
              源代码
            </button>
          </div>

          {/* 验证错误 */}
          {validationErrors.length > 0 && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={16} className="text-red-400" />
                <span className="text-sm font-medium text-red-200">验证错误</span>
              </div>
              <ul className="text-xs text-red-300/80 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 编辑器内容 */}
          {activeTab === 'form' ? (
            // 表单编辑
            <div className="space-y-6">
              {/* 技能名称 */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  技能名称 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                  placeholder="my-skill"
                />
                <p className="text-xs text-slate-500 mt-1.5">只能包含小写字母、数字和连字符，作为技能的唯一标识</p>
              </div>

              {/* 技能描述 */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  技能描述 <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none transition-all"
                  placeholder="详细描述这个技能的功能和使用场景..."
                />
                <p className="text-xs text-slate-500 mt-1.5">{formDescription.length} / 10 最小字符</p>
              </div>

              {/* 输入参数开关 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-slate-300">
                    输入参数（input_schema）
                  </label>
                  <button
                    onClick={() => setFormHasInputSchema(!formHasInputSchema)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      formHasInputSchema ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                      formHasInputSchema ? 'translate-x-6' : ''
                    }`} />
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  {formHasInputSchema
                    ? '定义技能接受的输入参数（可选）'
                    : '此技能不需要输入参数'}
                </p>
              </div>

              {/* 参数列表 */}
              {formHasInputSchema && (
                <div className="bg-slate-800/30 rounded-2xl p-5 border border-slate-700 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-300">参数列表</span>
                    <button
                      onClick={addProperty}
                      className="text-xs text-orange-400 hover:text-orange-300 font-medium"
                    >
                      + 添加参数
                    </button>
                  </div>

                  {formProperties.length === 0 ? (
                    <div className="text-center py-6 text-sm text-slate-500 border border-dashed border-slate-600 rounded-xl">
                      暂无参数，点击"添加参数"开始
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formProperties.map((prop, index) => (
                        <div key={index} className="bg-slate-900 rounded-xl p-4 space-y-3 border border-slate-700">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={prop.name}
                              onChange={(e) => updateProperty(index, 'name', e.target.value)}
                              className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-mono"
                              placeholder="参数名"
                            />
                            <select
                              value={prop.type}
                              onChange={(e) => updateProperty(index, 'type', e.target.value)}
                              className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                            >
                              <option value="string">string</option>
                              <option value="number">number</option>
                              <option value="boolean">boolean</option>
                              <option value="array">array</option>
                              <option value="object">object</option>
                            </select>
                            <button
                              onClick={() => removeProperty(index)}
                              className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <input
                            type="text"
                            value={prop.description}
                            onChange={(e) => updateProperty(index, 'description', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all"
                            placeholder="参数描述（可选）"
                          />
                          <label className="flex items-center gap-2 text-sm text-slate-400">
                            <input
                              type="checkbox"
                              checked={prop.required}
                              onChange={(e) => updateProperty(index, 'required', e.target.checked)}
                              className="rounded border-slate-600 text-orange-500 focus:ring-orange-500"
                            />
                            必需参数
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 技能内容 */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  技能内容（Markdown）
                </label>
                <textarea
                  value={skillContent.replace(/^---\n[\s\S]*?\n---\n/, '')}
                  onChange={(e) => {
                    const frontmatter = generateFrontmatter();
                    setSkillContent(frontmatter + e.target.value);
                  }}
                  rows={12}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-mono resize-none transition-all"
                  placeholder="# 技能说明&#10;&#10;这里是技能的具体指令...&#10;&#10;## 使用示例&#10;&#10;用户如何使用这个技能..."
                />
              </div>

              {/* 帮助提示 */}
              <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">💡</div>
                  <div>
                    <p className="text-sm font-medium text-orange-200 mb-1">技能格式说明</p>
                    <ul className="text-xs text-orange-300/80 space-y-1">
                      <li>技能名称：唯一标识，英文，使用连字符</li>
                      <li>技能描述：清晰说明功能和触发条件</li>
                      <li>输入参数：可选，定义技能接受的参数</li>
                      <li>下方文本区域：技能的具体指令（Markdown 格式）</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'preview' ? (
            // 实时预览
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-5 h-5 text-orange-500" />
                <h3 className="text-lg font-semibold text-white">实时预览</h3>
              </div>
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap break-words">{previewContent}</pre>
              </div>
            </div>
          ) : (
            // 源代码编辑
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Code className="w-5 h-5 text-orange-500" />
                <h3 className="text-lg font-semibold text-white">源代码编辑</h3>
              </div>
              <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700">
                <textarea
                  value={skillContent}
                  onChange={(e) => setSkillContent(e.target.value)}
                  rows={16}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/20 resize-none transition-all"
                  spellCheck={false}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* ✨ 导入对话框 */}
      <ImportSkillDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImportSuccess={handleImportSuccess}
      />

      {/* ✨ 预览对话框 */}
      {selectedPreviewSkill && (
        <PreviewSkillDialog
          skill={{
            id: selectedPreviewSkill.id,
            name: selectedPreviewSkill.name,
            description: selectedPreviewSkill.description,
            content: selectedPreviewSkill.content,
            frontmatter: selectedPreviewSkill.frontmatter,
            // @ts-ignore - supportingFiles is optional
            supportingFiles: selectedPreviewSkill.supportingFiles || []
          } as any}
          open={showPreviewDialog}
          onClose={() => {
            setShowPreviewDialog(false);
            setSelectedPreviewSkill(null);
          }}
        />
      )}
    </div>
  );
}

export default SkillsEditor;
