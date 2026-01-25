import React from 'react';

interface HexagonLogoProps {
  size?: number;
  animated?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  onClick?: () => void;
}

/**
 * HexagonLogo - 六边形技能卡片 Logo
 *
 * SkillMate 主 Logo，用于桌面图标、应用标题等主要场景。
 *
 * @example
 * // 基础使用
 * <HexagonLogo size={128} />
 *
 * // 带动画
 * <HexagonLogo size={64} animated />
 *
 * // 深色模式
 * <HexagonLogo size={256} theme="dark" />
 */
export const HexagonLogo: React.FC<HexagonLogoProps> = ({
  size = 64,
  animated = false,
  theme = 'auto',
  className = '',
  onClick
}) => {
  const isDark = theme === 'dark' || (theme === 'auto' && document.documentElement.classList.contains('dark'));

  const cssClasses = [
    'logo',
    'logo-hexagon',
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
      src={
        isDark
          ? './assets/logo-skillmate-hexagon-dark.svg'
          : './assets/logo-skillmate-hexagon.svg'
      }
      alt="SkillMate Logo - Hexagon"
      className={cssClasses}
      style={style}
      onClick={onClick}
    />
  );
};

export default HexagonLogo;
