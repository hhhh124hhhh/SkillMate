import React from 'react';

type RobotExpression = 'happy' | 'thinking' | 'success' | 'error' | 'welcome';

interface RobotLogoProps {
  /**
   * 机器人表情
   */
  expression?: RobotExpression;

  size?: number;
  animated?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  onClick?: () => void;
}

/**
 * RobotLogo - 橙色机器人伙伴 Logo
 *
 * SkillMate 品牌吉祥物，用于营销、反馈提示、加载动画等场景。
 *
 * @example
 * // 基础使用（开心表情）
 * <RobotLogo size={128} />
 *
 * // 思考状态（用于加载）
 * <RobotLogo expression="thinking" size={64} animated />
 *
 * // 成功提示
 * <RobotLogo expression="success" size={96} />
 *
 * // 错误提示
 * <RobotLogo expression="error" size={96} />
 */
export const RobotLogo: React.FC<RobotLogoProps> = ({
  expression = 'happy',
  size = 64,
  animated = false,
  theme = 'auto',
  className = '',
  onClick
}) => {
  const isDark = theme === 'dark' || (theme === 'auto' && document.documentElement.classList.contains('dark'));

  // 根据表情选择 SVG 文件
  const getLogoSource = (): string => {
    switch (expression) {
      case 'thinking':
        return './assets/robot-thinking.svg';
      case 'success':
        return './assets/robot-success.svg';
      case 'error':
        return './assets/robot-error.svg';
      case 'welcome':
        return './assets/robot-welcome.svg';
      default:
        return './assets/logo-skillmate-robot.svg';
    }
  };

  const cssClasses = [
    'logo',
    'logo-robot',
    `logo-robot-${expression}`,
    animated && 'logo-animated',
    isDark && 'logo-dark',
    className
  ].filter(Boolean).join(' ');

  const style: React.CSSProperties = {
    width: size,
    height: size,
    cursor: onClick ? 'pointer' : 'default'
  };

  return (
    <img
      src={getLogoSource()}
      alt={`SkillMate Robot - ${expression}`}
      className={cssClasses}
      style={style}
      onClick={onClick}
    />
  );
};

export default RobotLogo;
