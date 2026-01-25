/**
 * Logo Components
 *
 * SkillMate Logo 组件库
 * - Logo: 通用 Logo 组件（支持六边形和机器人）
 * - HexagonLogo: 六边形技能卡片 Logo（主 Logo）
 * - RobotLogo: 机器人吉祥物 Logo（品牌吉祥物）
 *
 * @example
 * // 主 Logo（六边形）
 * import { HexagonLogo } from '@/components/Logo';
 * <HexagonLogo size={128} />
 *
 * // 吉祥物（机器人）
 * import { RobotLogo } from '@/components/Logo';
 * <RobotLogo expression="success" size={96} animated />
 *
 * // 通用组件
 * import Logo from '@/components/Logo';
 * <Logo variant="hexagon" size={64} />
 * <Logo variant="robot" expression="thinking" size={64} animated />
 */

export { Logo } from './Logo';
export { HexagonLogo } from './HexagonLogo';
export { RobotLogo } from './RobotLogo';
