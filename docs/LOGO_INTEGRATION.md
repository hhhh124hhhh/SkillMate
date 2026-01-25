# SkillMate Logo 技术集成文档

**项目**: SkillMate Logo Integration
**更新日期**: 2026-01-24
**版本**: 1.0.0

---

## 📋 目录

1. [React 组件封装](#react-组件封装)
2. [使用示例](#使用示例)
3. [CSS 类名](#css-类名)
4. [Electron 集成](#electron-集成)
5. [构建配置](#构建配置)

---

## React 组件封装

### 组件结构

```
src/components/Logo/
├── Logo.tsx           # 通用 Logo 组件
├── HexagonLogo.tsx    # 六边形 Logo 组件
├── RobotLogo.tsx      # 机器人 Logo 组件
└── index.ts          # 导出文件
```

### Logo.tsx - 通用组件

**Props 接口**:
```tsx
interface LogoProps {
  variant?: 'hexagon' | 'robot';           // Logo 类型
  expression?: 'happy' | 'thinking' | 'success' | 'error' | 'welcome';  // 表情（仅 robot）
  size?: number;                             // 尺寸（像素）
  animated?: boolean;                        // 是否启用动画
  theme?: 'light' | 'dark' | 'auto';         // 颜色模式
  className?: string;                        // 自定义类名
  onClick?: () => void;                      // 点击事件
}
```

**使用示例**:
```tsx
// 默认使用（六边形，64px）
<Logo />

// 指定尺寸和变体
<Logo variant="hexagon" size={128} />

// 吉祥物 + 动画
<Logo variant="robot" expression="thinking" size={96} animated />

// 深色模式
<Logo variant="hexagon" theme="dark" size={64} />

// 点击事件
<Logo variant="robot" onClick={handleClick} size={128} />
```

### HexagonLogo.tsx - 六边形组件

**专用于主 Logo 场景**，简化配置：

```tsx
interface HexagonLogoProps {
  size?: number;
  animated?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  onClick?: () => void;
}
```

**使用示例**:
```tsx
// 应用标题栏
<HexagonLogo size={32} />

// 设置界面
<HexagonLogo size={128} />

// 带动画
<HexagonLogo size={64} animated />
```

### RobotLogo.tsx - 机器人组件

**专用于吉祥物场景**，支持表情切换：

```tsx
interface RobotLogoProps {
  expression?: 'happy' | 'thinking' | 'success' | 'error' | 'welcome';
  size?: number;
  animated?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  onClick?: () => void;
}
```

**使用示例**:
```tsx
// 开心表情（默认）
<RobotLogo size={64} />

// 思考状态（加载）
<RobotLogo expression="thinking" size={64} animated />

// 成功提示
<RobotLogo expression="success" size={96} />

// 错误提示
<RobotLogo expression="error" size={96} />
```

---

## 使用示例

### 场景 1: 应用标题栏

```tsx
import { HexagonLogo } from '@/components/Logo';

function AppTitle() {
  return (
    <div className="flex items-center gap-3">
      <HexagonLogo size={32} />
      <span className="text-lg font-semibold">SkillMate</span>
    </div>
  );
}
```

### 场景 2: 设置界面

```tsx
import { HexagonLogo } from '@/components/Logo';

function SettingsPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-8">
        <HexagonLogo size={64} />
        <div>
          <h1 className="text-2xl font-bold">设置</h1>
          <p className="text-sm text-gray-600">配置你的 SkillMate</p>
        </div>
      </div>
      {/* 设置选项 */}
    </div>
  );
}
```

### 场景 3: 加载状态

```tsx
import { RobotLogo } from '@/components/Logo';

function LoadingState() {
  return (
    <div className="flex flex-col items-center gap-4">
      <RobotLogo expression="thinking" size={96} animated />
      <p className="text-gray-600">正在处理你的请求...</p>
    </div>
  );
}
```

### 场景 4: 成功/错误提示

```tsx
import { RobotLogo } from '@/components/Logo';

function StatusMessage({ type }: { type: 'success' | 'error' }) {
  return (
    <div className={`p-4 rounded-lg ${type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
      <div className="flex items-center gap-3">
        <RobotLogo expression={type} size={48} />
        <div>
          <h3 className={`font-semibold ${type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
            {type === 'success' ? '操作成功！' : '操作失败'}
          </h3>
          <p className={`text-sm ${type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
            {type === 'success' ? '你的更改已保存' : '请重试或联系支持'}
          </p>
        </div>
      </div>
    </div>
  );
}
```

### 场景 5: 欢迎页面

```tsx
import { HexagonLogo, RobotLogo } from '@/components/Logo';

function WelcomePage() {
  return (
    <div className="flex flex-col items-center gap-8 p-12">
      <HexagonLogo size={128} />
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">欢迎使用 SkillMate</h1>
        <p className="text-gray-600">你的AI技能伙伴</p>
      </div>
      <RobotLogo expression="welcome" size={96} animated />
      <button className="px-6 py-2 bg-orange-500 text-white rounded-lg">
        开始使用
      </button>
    </div>
  );
}
```

### 场景 6: 深色模式适配

```tsx
import { Logo } from '@/components/Logo';

function ThemedLogo() {
  const [isDark, setIsDark] = useState(false);

  return (
    <div className={isDark ? 'dark' : ''}>
      <button onClick={() => setIsDark(!isDark)}>
        切换主题
      </button>

      <Logo
        variant="hexagon"
        size={128}
        theme="auto"  // 自动适配深色模式
      />
    </div>
  );
}
```

---

## CSS 类名

### 基础类名

```css
.logo           /* Logo 基础类 */
.logo-hexagon   /* 六边形 Logo */
.logo-robot     /* 机器人 Logo */
.logo-dark      /* 深色模式 */
```

### 动画类名

```css
/* 基础动画 */
.logo-animated           /* 通用动画（脉冲） */
.logo-loading            /* 旋转加载动画 */
.logo-loading-fast       /* 快速旋转 */

/* 悬停效果 */
.logo:hover              /* 浮动动画（悬停时） */
.logo:active             /* 缩放动画（点击时） */

/* 六边形特定动画 */
.logo-hexagon.logo-loading    /* 六边形旋转 */
.logo-hexagon:hover          /* 六边形发光 */

/* 机器人特定动画 */
.logo-robot-thinking.logo-animated  /* 点头（思考） */
.logo-robot-success.logo-animated   /* 跳跃（成功） */
.logo-robot-error.logo-animated     /* 摇晃（错误） */
.logo-robot-welcome.logo-animated   /* 挥手（欢迎） */
```

### 工具类

```css
/* 动画控制 */
.logo-paused              /* 暂停动画 */
.logo-no-transition       /* 禁用过渡 */
.logo-no-animation        /* 禁用动画 */

/* 动画速度 */
.logo-spin-slow           /* 缓慢旋转 */
.logo-spin-fast           /* 快速旋转 */
.logo-pulse-slow          /* 缓慢脉冲 */
.logo-pulse-fast          /* 快速脉冲 */
```

### 使用示例

```tsx
// 基础使用
<img src="logo.svg" className="logo" />

// 带动画
<img src="logo.svg" className="logo logo-animated" />

// 悬停效果
<img src="logo.svg" className="logo logo-hexagon" />

// 暂停动画
<img src="logo.svg" className="logo logo-animated logo-paused" />

// 加载动画
<RobotLogo expression="thinking" className="logo-loading" size={64} />
```

---

## Electron 集成

### package.json 配置

确保 `package.json` 中正确配置图标路径：

```json
{
  "name": "skill-mate",
  "main": "dist-electron/main.js",
  "build": {
    "appId": "com.skillmate.app",
    "productName": "SkillMate",
    "directories": {
      "buildResources": "build",
      "output": "release"
    },
    "files": [
      "dist-electron/**/*",
      "public/**/*"
    ],
    "win": {
      "target": "nsis",
      "icon": "build/icon.ico"
    },
    "mac": {
      "target": "dmg",
      "icon": "build/icon.icns",
      "category": "public.app-category.productivity"
    },
    "linux": {
      "target": "AppImage",
      "icon": "build/icons",
      "category": "Utility"
    }
  }
}
```

### 主进程配置

**electron/main.ts**:

```typescript
import { app, BrowserWindow } from 'electron';
import path from 'path';

// 设置应用图标
if (process.platform === 'darwin') {
  // macOS
  app.dock.setIcon(path.join(__dirname, '../build/icon.icns'));
} else if (process.platform === 'win32') {
  // Windows (图标已在 package.json 中配置)
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, './preload.js')
    }
  });

  win.loadFile(path.join(__dirname, '../index.html'));
}
```

### 构建图标

**生成 Windows ICO**:

使用在线工具或本地工具：
- 在线: [ConvertICO](https://convertico.com/)
- 本地: `npm install -g png-to-ico`

```bash
# 安装工具
npm install -g png-to-ico

# 生成 ICO
png-to-ico public/icons/256x256/icon.png -o build/icon.ico
```

**生成 macOS ICNS**:

```bash
# 使用 iconutil (macOS)
mkdir build/icon.iconset
sips -z 16 16   public/icons/16x16/icon.png   --out build/icon.iconset/icon_16x16.png
sips -z 32 32   public/icons/32x32/icon.png   --out build/icon.iconset/icon_16x16@2x.png
sips -z 128 128 public/icons/128x128/icon.png --out build/icon.iconset/icon_128x128.png
sips -z 256 256 public/icons/256x256/icon.png --out build/icon.iconset/icon_128x128@2x.png
sips -z 512 512 public/icons/512x512/icon.png --out build/icon.iconset/icon_256x256@2x.png
sips -z 1024 1024 public/icons/1024x1024/icon.png --out build/icon.iconset/icon_512x512@2x.png
iconutil -c icns build/icon.iconset -o build/icon.icns
```

---

## 构建配置

### Vite 配置

**vite.config.ts**:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          // 确保 SVG 文件正确输出
          if (assetInfo.name?.endsWith('.svg')) {
            return 'assets/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  }
});
```

### TypeScript 配置

确保 TypeScript 识别 SVG 导入：

**tsconfig.json**:

```json
{
  "compilerOptions": {
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true
  }
}
```

**vite-env.d.ts**:

```typescript
/// <reference types="vite/client" />

declare module '*.svg' {
  const content: { default: string };
  export default content;
}
```

### 图标优化脚本

**scripts/optimize-svg.js**:

```javascript
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SVG_DIR = path.join(__dirname, '../public');
const OUTPUT_DIR = path.join(__dirname, '../public');

function optimizeSVG(inputPath, outputPath) {
  console.log(`优化: ${path.basename(inputPath)}`);

  // 使用 SVGO 优化
  execSync(
    `npx svgo "${inputPath}" -o "${outputPath}" --precision=1 --multipass`,
    { stdio: 'inherit' }
  );
}

async function main() {
  const svgFiles = fs.readdirSync(SVG_DIR)
    .filter(file => file.endsWith('.svg'))
    .filter(file => file.startsWith('logo-') || file.startsWith('robot-'));

  console.log('========================================');
  console.log('  SVG 优化工具');
  console.log('========================================\n');

  for (const file of svgFiles) {
    const inputPath = path.join(SVG_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, file);
    optimizeSVG(inputPath, outputPath);
  }

  console.log('\n✨ 所有 SVG 文件已优化！');
}

main().catch(console.error);
```

**运行优化**:
```bash
node scripts/optimize-svg.js
```

---

## 故障排除

### 问题 1: SVG 文件无法加载

**症状**: 组件显示为图片损坏图标

**解决方案**:
1. 检查文件路径是否正确
2. 确保 SVG 文件存在于 `src/assets/`
3. 检查 Vite 配置是否正确

```tsx
// 调试
console.log('Logo path:', './assets/logo-skillmate-hexagon.svg');
<img src="./assets/logo-skillmate-hexagon.svg" onError={(e) => console.error('Load error:', e)} />
```

### 问题 2: 动画不生效

**症状**: Logo 没有动画效果

**解决方案**:
1. 确保导入了 `logo-animations.css`
2. 检查 CSS 类名是否正确
3. 确认 `animated` prop 为 `true`

```tsx
// 确保导入
import './styles/logo-animations.css';

// 调试
<img src="logo.svg" className="logo logo-animated" />
```

### 问题 3: 深色模式不切换

**症状**: 深色模式下 Logo 没有变化

**解决方案**:
1. 检查 `theme` prop 设置
2. 确保使用了正确的深色模式 SVG 文件
3. 验证深色模式 CSS 类是否生效

```tsx
// 强制深色模式
<Logo variant="hexagon" theme="dark" size={64} />
```

### 问题 4: 图标模糊

**症状**: 小尺寸图标显示模糊

**解决方案**:
1. 使用 SVG 而非 PNG（矢量图形更清晰）
2. 确保使用高分辨率 PNG（2x）
3. 检查屏幕 DPI 设置

```tsx
// 使用 SVG（推荐）
<Logo variant="hexagon" size={32} />

// 使用 2x PNG
<img src="logo-64.png" style="width: 32px; height: 32px;" />
```

---

## 最佳实践

### 1. 性能优化

**使用 SVG 优先**:
- ✅ 应用内使用 SVG（文件小、可缩放）
- ✅ 桌面图标使用 PNG（兼容性）

**懒加载**:
```tsx
// 使用 React.lazy 懒加载 Logo 组件
const LazyLogo = lazy(() => import('@/components/Logo'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyLogo variant="hexagon" size={128} />
    </Suspense>
  );
}
```

### 2. 可访问性

**添加 alt 文本**:
```tsx
<img
  src="logo.svg"
  alt="SkillMate Logo - 六边形技能卡片"
  role="img"
/>
```

**支持键盘导航**:
```tsx
<button onClick={handleLogoClick} aria-label="SkillMate Logo">
  <Logo variant="hexagon" size={64} />
</button>
```

### 3. 响应式设计

**根据屏幕尺寸调整**:
```tsx
function ResponsiveLogo() {
  const [screenSize, setScreenSize] = useState('md');

  // 检测屏幕尺寸
  useEffect(() => {
    const checkSize = () => {
      if (window.innerWidth < 640) setScreenSize('sm');
      else if (window.innerWidth < 1024) setScreenSize('md');
      else setScreenSize('lg');
    };

    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  const size = screenSize === 'sm' ? 48 : screenSize === 'md' ? 64 : 128;

  return <Logo variant="hexagon" size={size} />;
}
```

### 4. 测试

**单元测试**:
```tsx
import { render } from '@testing-library/react';
import { Logo } from '@/components/Logo';

describe('Logo', () => {
  it('renders correctly', () => {
    const { container } = render(<Logo variant="hexagon" size={64} />);
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', './assets/logo-skillmate-hexagon.svg');
  });

  it('calls onClick handler', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <Logo variant="hexagon" size={64} onClick={handleClick} />
    );

    const img = container.querySelector('img');
    img?.click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

---

## 附录

### 相关文档

- [BRAND_GUIDELINES.md](./BRAND_GUIDELINES.md) - 品牌使用规范
- [logo-animations.css](../src/styles/logo-animations.css) - 动画库

### 外部资源

- [React 组件最佳实践](https://react.dev/learn)
- [SVG 无障碍指南](https://www.w3.org/TR/SVG-access/)
- [Electron 图标配置](https://www.electronjs.org/docs/tutorial/development/using-native-node-files)

---

**版本**: 1.0.0
**维护**: SkillMate 开发团队
