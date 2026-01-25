import React from 'react';

interface LogoProps {
  /**
   * Logo 变体
   * - hexagon: 六边形技能卡片（主 Logo）
   * - robot: 机器人吉祥物
   */
  variant?: 'hexagon' | 'robot';

  /**
   * Logo 表情（仅 robot variant）
   * - happy: 开心（默认）
   * - thinking: 思考
   * - success: 成功
   * - error: 错误
   * - welcome: 欢迎
   */
  expression?: 'happy' | 'thinking' | 'success' | 'error' | 'welcome';

  /**
   * Logo 尺寸（像素）
   */
  size?: number;

  /**
   * 是否启用动画
   */
  animated?: boolean;

  /**
   * 颜色模式
   * - light: 浅色模式
   * - dark: 深色模式
   * - auto: 自动切换
   */
  theme?: 'light' | 'dark' | 'auto';

  /**
   * 自定义类名
   */
  className?: string;

  /**
   * 点击事件
   */
  onClick?: () => void;
}

/**
 * SkillMate Logo 组件
 *
 * @example
 * // 主 Logo（六边形）
 * <Logo variant="hexagon" size={128} />
 *
 * // 吉祥物（机器人）
 * <Logo variant="robot" size={64} animated />
 *
 * // 带表情的吉祥物
 * <Logo variant="robot" expression="success" size={128} />
 */
export const Logo: React.FC<LogoProps> = ({
  variant = 'hexagon',
  expression = 'happy',
  size = 64,
  animated = false,
  theme = 'auto',
  className = '',
  onClick
}) => {
  // 根据 variant 和 expression 选择 SVG 文件
  const getLogoSource = (): string => {
    if (variant === 'robot') {
      // 机器人吉祥物
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
    } else {
      // 六边形 Logo（主 Logo）
      return './assets/logo-skillmate-hexagon.svg';
    }
  };

  // 根据主题决定是否使用深色版本
  const isDark = theme === 'dark' || (theme === 'auto' && document.documentElement.classList.contains('dark'));

  // 生成 CSS 类名
  const cssClasses = [
    'logo',
    `logo-${variant}`,
    animated && 'logo-animated',
    isDark && 'logo-dark',
    className
  ].filter(Boolean).join(' ');

  // 内联样式
  const style: React.CSSProperties = {
    width: size,
    height: size,
    cursor: onClick ? 'pointer' : 'default'
  };

  return (
    <img
      src={getLogoSource()}
      alt={`SkillMate Logo - ${variant}${variant === 'robot' ? ` (${expression})` : ''}`}
      className={cssClasses}
      style={style}
      onClick={onClick}
    />
  );
};

export default Logo;
