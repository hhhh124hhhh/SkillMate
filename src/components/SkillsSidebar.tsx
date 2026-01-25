import { useState, useEffect } from 'react';
import { Code, Image as ImageIcon, FileText, BarChart, Lightbulb, ChevronRight } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  emoji: string;
  category: string;
  usage: number;
}

export function SkillsSidebar() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  useEffect(() => {
    // 从技能管理器加载技能
    window.ipcRenderer.invoke('skills:list').then(list => {
      setSkills(list as Skill[]);
    });
  }, []);

  const categories = [
    { id: 'writing', name: '内容创作', icon: FileText, color: 'from-primaryCustom-400 to-primaryCustom-500' },
    { id: 'design', name: '设计工具', icon: ImageIcon, color: 'from-accentCustom-400 to-accentCustom-500' },
    { id: 'dev', name: '开发工具', icon: Code, color: 'from-warm-400 to-warm-500' },
    { id: 'data', name: '数据分析', icon: BarChart, color: 'from-dark-600 to-dark-700' },
  ];

  return (
    <div className="w-64 bg-gradient-to-b from-slate-900 to-dark-900 p-4 flex flex-col border-r border-slate-700">
      {/* 标题 */}
      <div className="mb-6">
        <h3 className="text-white font-display text-xl font-semibold mb-1">技能库</h3>
        <p className="text-slate-400 text-xs">{skills.length} 个技能可用</p>
      </div>

      {/* 技能列表 */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {categories.map(category => {
          const categorySkills = skills.filter(s => s.category === category.id);
          if (categorySkills.length === 0) return null;

          return (
            <div key={category.id} className="space-y-2">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-wider">
                <category.icon size={14} />
                {category.name}
              </div>

              {categorySkills.map(skill => (
                <button
                  key={skill.id}
                  onClick={() => setSelectedSkill(skill.id)}
                  className={`w-full p-3 rounded-xl text-left transition-all group ${
                    selectedSkill === skill.id
                      ? 'bg-gradient-to-r from-primaryCustom-600 to-primaryCustom-500 text-white shadow-lg'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{skill.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium truncate ${selectedSkill === skill.id ? 'text-white' : 'text-slate-200'}`}>
                        {skill.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-current rounded-full overflow-hidden opacity-30">
                          <div
                            className="h-full bg-current"
                            style={{ width: `${skill.usage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
