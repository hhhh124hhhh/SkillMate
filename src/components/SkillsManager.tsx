/**
 * 技能管理器组件（重新设计版）
 * 卡片式布局，深色主题，更好的视觉层次
 */

import { useState, useEffect } from 'react';
import { Settings, Loader2, AlertCircle, Filter, Search, Zap, Check } from 'lucide-react';
import * as yaml from 'js-yaml';

interface Skill {
  id: string;
  name: string;
  path: string;
  isBuiltin: boolean;
}

interface SkillConfig {
  name: string;
  title?: string;
  description: string;
  emoji?: string;
  difficulty?: string;
  scenarios?: string[];
  category?: string;
}

interface SkillsManagerProps {
  onOpenAdvanced: () => void;
}

const CATEGORY_FILTERS = [
  { id: 'daily-office', name: '日常办公', icon: '⭐' },
  { id: 'visual', name: '视觉创作', icon: '🖼️' },
  { id: 'creation', name: '内容创作', icon: '📝' },
  { id: 'tools', name: '辅助工具', icon: '⚙️' }
];

// 技能分类映射（按功能分类）
const SKILL_CATEGORY_MAP: Record<string, 'daily-office' | 'visual' | 'creation' | 'tools'> = {
  // 日常办公（7个）- Word、Excel、PPT、PDF、去AI味、头脑风暴、内部通信
  'docx-editor': 'daily-office',
  'xlsx-analyzer': 'daily-office',
  'pdf-processor': 'daily-office',
  'pptx-processor': 'daily-office',
  'natural-writer': 'daily-office',
  'brainstorming': 'daily-office',
  'internal-comms': 'daily-office',

  // 视觉创作（6个）- 图片生成、裁剪、理解、设计
  'image-generation': 'visual',
  'image-cropper': 'visual',
  'image-understanding': 'visual',
  'canvas-design': 'visual',
  'algorithmic-art': 'visual',
  'article-illustrator': 'visual',

  // 内容创作（10个）- 公众号写作、选题、标题、封面等
  'ai-writer': 'creation',
  'topic-selector': 'creation',
  'title-generator': 'creation',
  'cover-generator': 'creation',
  'wechat-writing': 'creation',
  'style-learner': 'creation',
  'smart-layout': 'creation',
  'data-analyzer': 'creation',
  'data-writer': 'creation',
  'webapp-testing': 'creation',

  // 辅助工具（3个）- 时间、计划、范围指南
  'get_current_time': 'tools',
  'writing-plans': 'tools',
  'scope-guide': 'tools'
};

export function SkillsManager({ onOpenAdvanced }: SkillsManagerProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [skillConfigs, setSkillConfigs] = useState<Record<string, SkillConfig>>({});
  const [disabledSkills, setDisabledSkills] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingSkill, setTogglingSkill] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('daily-office');
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 加载技能列表和配置
  useEffect(() => {
    const loadSkills = async () => {
      try {
        // 加载技能列表
        const skillList = await window.ipcRenderer.invoke('skills:list') as Skill[];
        setSkills(skillList);

        // 加载每个技能的配置
        const configs: Record<string, SkillConfig> = {};
        for (const skill of skillList) {
          try {
            console.log(`[SkillsManager] Loading ${skill.id}...`);
            const content = await window.ipcRenderer.invoke('skills:get', skill.id) as string;
            console.log(`[SkillsManager] ${skill.id} content length:`, content?.length || 0);
            console.log(`[SkillsManager] ${skill.id} content preview:`, content?.substring(0, 100));

            if (content) {
              // 解析 frontmatter（支持 CRLF 和 LF 换行符）
              const match = content.match(/^---\r?\n([\s\S]+?)\r?\n---/);
              console.log(`[SkillsManager] ${skill.id} frontmatter match:`, !!match);

              if (match) {
                // ✨ 使用 js-yaml 正确解析 YAML
                console.log(`[SkillsManager] Raw frontmatter for ${skill.id}:`, match[1]);
                const frontmatter = yaml.load(match[1]) as Record<string, any>;
                console.log(`[SkillsManager] Parsed frontmatter for ${skill.id}:`, frontmatter);

                // ✨ 验证解析结果（增强类型检查，排除数组）
                if (!frontmatter ||
                    typeof frontmatter !== 'object' ||
                    Array.isArray(frontmatter)) {
                  console.error(`[SkillsManager] Invalid frontmatter for ${skill.id}:`, frontmatter);
                  console.error(`[SkillsManager] Type:`, typeof frontmatter);
                  console.error(`[SkillsManager] Is Array:`, Array.isArray(frontmatter));
                  // 使用默认配置
                  configs[skill.id] = {
                    name: skill.id,
                    title: skill.id,
                    description: '暂无描述',
                    emoji: undefined,
                    difficulty: '⭐⭐⭐',
                    scenarios: [],
                    category: SKILL_CATEGORY_MAP[skill.id] || 'tools'
                  };
                } else {
                  // ✨ 辅助函数：支持中英文字段名
                  const getFrontmatterValue = (keys: string[], defaultValue: any = undefined): any => {
                    // ✨ 诊断：记录每次调用
                    console.log(`[SkillsManager] getFrontmatterValue called for ${skill.id} with keys:`, keys);

                    for (const key of keys) {
                      if (frontmatter && frontmatter[key] !== undefined) {
                        console.log(`[SkillsManager] ✓ Found value for key "${key}":`, frontmatter[key]);
                        return frontmatter[key];
                      }
                    }
                    console.log(`[SkillsManager] ✗ No value found, using default:`, defaultValue);
                    return defaultValue;
                  };

                  // 解析 scenarios（确保是数组）
                  let scenarios: string[] = [];
                  const scenariosValue = getFrontmatterValue(['scenarios', '场景']);
                  if (Array.isArray(scenariosValue)) {
                    scenarios = scenariosValue;
                  } else if (typeof scenariosValue === 'string') {
                    scenarios = [scenariosValue];
                  }

                  configs[skill.id] = {
                    name: skill.id,
                    title: getFrontmatterValue(['title']) || getFrontmatterValue(['name']) || skill.id,
                    description: getFrontmatterValue(['description']) || '暂无描述',
                    emoji: getFrontmatterValue(['emoji']),
                    difficulty: getFrontmatterValue(['difficulty', '使用难度']) || '⭐⭐⭐',
                    scenarios: scenarios,
                    // ✨ 优先使用映射，其次使用 frontmatter，最后默认为 'tools'
                    category: SKILL_CATEGORY_MAP[skill.id] ||
                             getFrontmatterValue(['category', '分类']) ||
                             'tools'
                  };

                  console.log(`[SkillsManager] Config for ${skill.id}:`, configs[skill.id]);
                }
              } else {
                // 如果没有 frontmatter，使用默认配置
                configs[skill.id] = {
                  name: skill.id,
                  title: skill.id,
                  description: '暂无描述',
                  emoji: undefined,
                  difficulty: '⭐⭐⭐',
                  scenarios: [],
                  category: SKILL_CATEGORY_MAP[skill.id] || 'tools'
                };
              }
            }
          } catch (err) {
            console.error(`[SkillsManager] Failed to load skill ${skill.id}:`, err);
            console.error(`[SkillsManager] Error details:`, (err as Error).message);
            console.error(`[SkillsManager] Stack trace:`, (err as Error).stack);
            // 解析失败时使用默认配置
            configs[skill.id] = {
              name: skill.id,
              title: skill.id,
              description: '暂无描述',
              emoji: undefined,
              difficulty: '⭐⭐⭐',
              scenarios: [],
              category: SKILL_CATEGORY_MAP[skill.id] || 'tools'
            };
          }
        }

        // ✨ 关键调试：打印所有配置，验证状态更新前的数据
        console.log('[SkillsManager] === Setting skill configs state ===');
        console.log('[SkillsManager] Total configs:', Object.keys(configs).length);
        console.log('[SkillsManager] All configs:', JSON.stringify(configs, null, 2));
        console.log('[SkillsManager] === End of configs ===');

        setSkillConfigs(configs);

        // ✨ 监听状态更新：验证 skillConfigs 是否真的更新了
        console.log('[SkillsManager] setSkillConfigs called, about to verify state update...');

        // 加载禁用的技能列表
        const config = await window.ipcRenderer.invoke('config:get-all') as Record<string, any>;
        setDisabledSkills(config.disabledSkills || []);

        setIsLoading(false);
      } catch (err) {
        console.error('[SkillsManager] Failed to load skills:', err);
        setError('加载技能列表失败');
        setIsLoading(false);
      }
    };

    loadSkills();
  }, []);

  // ✨ 监控 skillConfigs 状态变化
  useEffect(() => {
    console.log('[SkillsManager] skillConfigs state updated!');
    console.log('[SkillsManager] Total configs in state:', Object.keys(skillConfigs).length);

    // 检查前 3 个技能的配置
    const firstThreeSkills = Object.keys(skillConfigs).slice(0, 3);
    firstThreeSkills.forEach(skillId => {
      const config = skillConfigs[skillId];
      console.log(`[SkillsManager] ${skillId} in state:`, {
        description: config?.description,
        difficulty: config?.difficulty
      });
    });
  }, [skillConfigs]);

  // 切换技能启用/禁用状态
  const handleToggle = async (skillId: string) => {
    setTogglingSkill(skillId);
    setError(null);

    try {
      const newDisabledSkills = disabledSkills.includes(skillId)
        ? disabledSkills.filter(id => id !== skillId)
        : [...disabledSkills, skillId];

      // 保存到配置
      await window.ipcRenderer.invoke('config:set-all', {
        disabledSkills: newDisabledSkills
      });

      setDisabledSkills(newDisabledSkills);
    } catch (err) {
      console.error('[SkillsManager] Failed to toggle skill:', err);
      setError('切换技能状态失败');
    } finally {
      setTogglingSkill(null);
    }
  };

  // 过滤技能
  const filteredSkills = skills.filter(skill => {
    const config = skillConfigs[skill.id];
    if (!config) return false;

    // 分类过滤
    if (config.category !== selectedCategory) {
      return false;
    }

    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        config.title?.toLowerCase().includes(query) ||
        config.description.toLowerCase().includes(query) ||
        config.name.toLowerCase().includes(query)
      );
    }

    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-slate-400">加载技能中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 搜索和过滤 */}
      <div className="flex items-center gap-4">
        {/* 搜索框 */}
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索技能..."
            className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
        </div>

        {/* 分类过滤 */}
        <div className="flex gap-2">
          {CATEGORY_FILTERS.map(filter => {
            const isActive = selectedCategory === filter.id;
            const count = skills.filter(s => skillConfigs[s.id]?.category === filter.id).length;

            return (
              <button
                key={filter.id}
                onClick={() => setSelectedCategory(filter.id)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <span className="mr-1.5">{filter.icon}</span>
                {filter.name}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs ${
                  isActive ? 'bg-orange-500' : 'bg-slate-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <AlertCircle size={18} className="text-red-400" />
          <span className="text-sm text-red-200">{error}</span>
        </div>
      )}

      {/* 技能网格 */}
      {filteredSkills.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/30">
          <Zap className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-400 mb-2">未找到技能</h3>
          <p className="text-sm text-slate-500">
            {searchQuery ? '尝试使用不同的搜索词' : '该分类下暂无技能'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSkills.map(skill => {
            const config = skillConfigs[skill.id];
            const enabled = !disabledSkills.includes(skill.id);
            const isToggling = togglingSkill === skill.id;

            if (!config) return null;

            return (
              <div
                key={skill.id}
                className={`group relative p-5 rounded-2xl border-2 transition-all ${
                  enabled
                    ? selectedCategory === 'daily-office'
                      ? 'bg-slate-800/50 border-orange-500/50 hover:border-orange-500/70 shadow-lg'
                      : 'bg-slate-800/50 border-slate-600 hover:border-slate-500'
                    : 'bg-slate-900/50 border-slate-700 hover:border-slate-600 opacity-60'
                }`}
              >
                {/* 头部 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {config.emoji && (
                      <div className="text-4xl">{config.emoji}</div>
                    )}
                    <div className="flex-1">
                      <h4 className={`text-lg font-semibold mb-1 ${enabled ? 'text-white' : 'text-slate-400'}`}>
                        {config.title || config.name}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-yellow-500">{config.difficulty}</span>
                        {enabled && (
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                            <Check size={10} />
                            已启用
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 开关按钮 */}
                  <button
                    onClick={() => handleToggle(skill.id)}
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

                {/* 描述 */}
                <p className={`text-sm mb-4 line-clamp-2 ${enabled ? 'text-slate-300' : 'text-slate-500'}`}>
                  {config.description}
                </p>

                {/* 场景标签 */}
                {config.scenarios && config.scenarios.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {config.scenarios.slice(0, 3).map((scenario, idx) => (
                      <span
                        key={idx}
                        className={`text-xs px-2.5 py-1 rounded-lg ${
                          enabled
                            ? 'bg-slate-700 text-slate-300'
                            : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {scenario}
                      </span>
                    ))}
                    {config.scenarios.length > 3 && (
                      <span className="text-xs text-slate-500">
                        +{config.scenarios.length - 3} 更多
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 统计信息 */}
      <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-700">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-slate-400">
              已启用: <span className="text-white font-semibold">{skills.length - disabledSkills.length}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-600"></div>
            <span className="text-slate-400">
              已禁用: <span className="text-white font-semibold">{disabledSkills.length}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-slate-400">
              总计: <span className="text-white font-semibold">{skills.length}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SkillsManager;
