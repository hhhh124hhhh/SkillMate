/**
 * 技能推荐气泡组件
 * 当检测到用户意图时，显示友好的技能推荐提示
 */

import React from 'react';
import { Check, X } from 'lucide-react';

export interface SkillSuggestionBubbleProps {
  skillName: string;
  reason: string;
  onApply: () => void;
  onDismiss: () => void;
}

export const SkillSuggestionBubble: React.FC<SkillSuggestionBubbleProps> = ({
  skillName,
  reason,
  onApply,
  onDismiss
}) => {
  return (
    <div className="flex items-center gap-3 px-4 py-3 mx-2 mb-2 bg-gradient-to-r from-orange-50 to-indigo-50 dark:from-orange-950 dark:to-indigo-950 rounded-lg border border-orange-200 dark:border-orange-800 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Emoji 提示 */}
      <div className="text-2xl shrink-0">💡</div>

      {/* 推荐内容 */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-orange-900 dark:text-orange-100">
          建议使用「{skillName}」技能
        </div>
        <div className="text-xs text-orange-700 dark:text-orange-300 mt-0.5">
          {reason}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onApply}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          <span>使用</span>
        </button>
        <button
          onClick={onDismiss}
          className="p-1.5 text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-200 transition-colors rounded-md hover:bg-orange-100 dark:hover:bg-orange-900"
          aria-label="忽略建议"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SkillSuggestionBubble;
